import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import CircuitBreaker from 'opossum';
import { OCR_BREAKER, validateOcrPayload } from './ocr.client';
import { correlationId as _unusedCorrelationId, logger, runWithCorrelation } from '../../common/correlation';
import { withTx, updateRows } from '../../common/db';

const POLL_MS = () => Number(process.env.JOB_POLL_MS ?? 400);
const LEASE_S = () => Number(process.env.JOB_LEASE_S ?? 60);
const MAX_ATTEMPTS = () => Number(process.env.OCR_MAX_ATTEMPTS ?? 4);
const BACKOFF = () =>
  String(process.env.OCR_BACKOFF_MS ?? '2000,4000,8000')
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v >= 0);

interface ClaimedJob {
  id: string;
  receipt_id: string;
  attempts: number;
  correlation_id: string;
}

@Injectable()
export class JobsProcessor {
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(OCR_BREAKER) private readonly breaker: CircuitBreaker,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
    logger.info('worker iniciado', { pollMs: POLL_MS(), maxAttempts: MAX_ATTEMPTS() });
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      let worked = false;
      try {
        worked = await this.tick();
      } catch (e) {
        logger.error('error en el ciclo del worker', { error: String(e) });
      }
      if (!worked) await sleep(POLL_MS());
    }
  }

  /** Ejecuta un solo ciclo; devuelve true si tomó una tarea. Útil en pruebas. */
  async tick(): Promise<boolean> {
    const job = await this.claim();
    if (!job) return false;
    await this.process(job);
    return true;
  }

  /** Procesa tareas hasta que no quede ninguna pendiente (útil en pruebas). */
  async drain(maxTicks = 500): Promise<void> {
    for (let i = 0; i < maxTicks; i++) {
      const worked = await this.tick();
      if (!worked) return;
      await sleep(10);
    }
  }

  private async claim(): Promise<ClaimedJob | null> {
    const res: unknown = await this.dataSource.query(
      `UPDATE receipt_jobs
       SET status = 'RUNNING',
           lease_owner = $1,
            lease_expires_at = now() + make_interval(secs => $2),
            attempts = attempts + 1,
            updated_at = now()
       WHERE id = (
         SELECT id FROM receipt_jobs
         WHERE (status = 'PENDING' AND next_attempt_at <= now())
            OR (status = 'RUNNING' AND lease_expires_at < now())
         ORDER BY next_attempt_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id, receipt_id, attempts, correlation_id`,
      [`worker-${process.pid}`, LEASE_S()],
    );
    const rows = updateRows(res);
    return rows.length > 0 ? (rows[0] as unknown as ClaimedJob) : null;
  }

  private async process(job: ClaimedJob): Promise<void> {
    const receipts = await this.dataSource.query(
      `SELECT id, status, image_path FROM receipts WHERE id = $1`,
      [job.receipt_id],
    );
    const receipt = receipts[0];
    if (!receipt || receipt.status !== 'PROCESANDO' || !receipt.image_path) {
      await this.finishJob(job.id, 'DONE', 'la tarea ya no corresponde a un comprobante en proceso');
      return;
    }

    await runWithCorrelation(job.correlation_id, async () => {
      logger.info('procesando comprobante', {
        receiptId: job.receipt_id,
        attempt: job.attempts,
        correlationId: job.correlation_id,
      });
      let error: unknown = null;
      let payload: ReturnType<typeof validateOcrPayload> | null = null;
      try {
        const raw = await this.breaker.fire(receipt.image_path);
        payload = validateOcrPayload(raw);
      } catch (e) {
        error = e;
      }

      if (payload) {
        try {
          await this.complete(job, payload);
          return;
        } catch (e) {
          error = e;
        }
      }

      const message = describeError(error);
      if (job.attempts >= MAX_ATTEMPTS()) {
        await this.fail(job, message);
      } else {
        const backoff = BACKOFF();
        const delayMs = backoff[Math.min(job.attempts, backoff.length - 1)] ?? 2000;
        await this.dataSource.query(
          `UPDATE receipt_jobs
           SET status = 'PENDING', lease_owner = NULL, lease_expires_at = NULL,
                next_attempt_at = now() + make_interval(secs => $2), last_error = $3, updated_at = now()
           WHERE id = $1`,
          [job.id, delayMs / 1000, message],
        );
        logger.warn('reintento de OCR programado', {
          receiptId: job.receipt_id,
          attempt: job.attempts,
          delayMs,
          error: message,
        });
      }
    });
  }

  private async complete(
    job: ClaimedJob,
    payload: ReturnType<typeof validateOcrPayload>,
  ): Promise<void> {
    await withTx(this.dataSource, async (em) => {
      const updated = updateRows(
        await em.query(
          `UPDATE receipts
           SET status = 'EXTRAÍDO', total_cents = $2, tax_cents = $3, tip_cents = $4,
               discount_cents = $5, description = COALESCE($6, description),
               fail_reason = NULL, updated_at = now()
           WHERE id = $1 AND status = 'PROCESANDO'
           RETURNING id`,
          [
            job.receipt_id,
            payload.totalCents,
            payload.taxCents,
            payload.tipCents,
            payload.discountCents,
            payload.description,
          ],
        ),
      );
      if (updated.length > 0) {
        await em.query(`DELETE FROM receipt_items WHERE receipt_id = $1`, [job.receipt_id]);
        for (let i = 0; i < payload.items.length; i++) {
          const it = payload.items[i];
          await em.query(
            `INSERT INTO receipt_items (receipt_id, position, description, quantity, unit_price_cents)
             VALUES ($1, $2, $3, $4, $5)`,
            [job.receipt_id, i + 1, it.description, it.quantity, it.unitPriceCents],
          );
        }
        logger.info('extracción completada', { receiptId: job.receipt_id, items: payload.items.length });
      }
      await em.query(
        `UPDATE receipt_jobs SET status = 'DONE', lease_owner = NULL, lease_expires_at = NULL,
         last_error = NULL, updated_at = now() WHERE id = $1`,
        [job.id],
      );
    });
  }

  private async fail(job: ClaimedJob, message: string): Promise<void> {
    const reason = `No se pudieron extraer los datos tras ${MAX_ATTEMPTS()} intentos: ${message}`.slice(0, 300);
    await withTx(this.dataSource, async (em) => {
      await em.query(
        `UPDATE receipts SET status = 'FALLIDO', fail_reason = $2, updated_at = now()
         WHERE id = $1 AND status = 'PROCESANDO'`,
        [job.receipt_id, reason],
      );
      await em.query(
        `UPDATE receipt_jobs SET status = 'FAILED', lease_owner = NULL, lease_expires_at = NULL,
         last_error = $2, updated_at = now() WHERE id = $1`,
        [job.id, message],
      );
    });
    logger.warn('extracción fallida', { receiptId: job.receipt_id, reason });
  }

  private async finishJob(jobId: string, status: 'DONE', note: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE receipt_jobs SET status = $2, lease_owner = NULL, lease_expires_at = NULL,
       last_error = $3, updated_at = now() WHERE id = $1`,
      [jobId, status, note],
    );
  }
}

function describeError(error: unknown): string {
  if (!error) return 'error desconocido del servicio OCR';
  const e = error as { name?: string; message?: string; code?: string };
  if (
    e.name === 'TimeoutError' ||
    e.name === 'AbortError' ||
    e.code === 'ETIMEDOUT' ||
    /\btimed? ?out\b/i.test(String(e.message ?? '')) ||
    /\btimeout\b/i.test(String(e.message ?? ''))
  ) {
    return 'el servicio OCR no respondió a tiempo (timeout)';
  }
  if (e.name === 'BreakerOpenError' || e.code === 'EOPENBREAKER') {
    return 'el servicio OCR está temporalmente no disponible (circuito abierto)';
  }
  return String(e.message ?? error).slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
