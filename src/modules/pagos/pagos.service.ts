import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../../db/entities';
import { validation, conflict, notFound, forbidden } from '../../common/errors';
import { toCents, formatCents } from '../../common/money';
import { withTx, audit } from '../../common/db';
import { StorageService } from '../comprobantes/storage.service';
import { sha256 } from '../../common/util';

const METHODS: PaymentMethod[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'OTRO'];
const REFERENCE_RE = /^[A-Za-z0-9]{1,50}$/;

@Injectable()
export class PagosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async createPayment(
    debtId: string,
    userId: string,
    body: {
      amount: string | number;
      method: string;
      reference?: string;
    },
    idempotencyKeyHeader?: string,
    evidenceBuffer?: Buffer,
  ) {
    const amountCents = toCents(body?.amount, 'monto');
    if (amountCents <= 0) throw validation('monto: debe ser mayor a 0');

    const method = String(body?.method ?? '')
      .trim()
      .toUpperCase() as PaymentMethod;
    if (!METHODS.includes(method)) {
      throw validation(`método: debe ser uno de ${METHODS.join(', ')}`);
    }

    let reference: string | null = null;
    if (body?.reference !== undefined && body.reference !== null && String(body.reference).trim() !== '') {
      reference = String(body.reference).trim();
      if (!REFERENCE_RE.test(reference)) {
        throw validation('referencia: hasta 50 caracteres alfanuméricos');
      }
    }

    const hasEvidence = Boolean(evidenceBuffer && evidenceBuffer.length > 0);
    if (method !== 'EFECTIVO' && !hasEvidence) {
      throw validation(`evidencia: es obligatoria para el método ${method}`);
    }

    let savedImage: { path: string; hash: string } | null = null;
    if (hasEvidence) {
      savedImage = this.storage.saveImage(evidenceBuffer!, 'evidencia');
    }

    const idempotencyKey =
      (idempotencyKeyHeader && idempotencyKeyHeader.trim().slice(0, 120)) ||
      sha256(
        `${debtId}|${userId}|${amountCents}|${method}|${reference ?? ''}|${savedImage?.hash ?? ''}`,
      ).slice(0, 120);

    try {
      return await withTx(this.dataSource, async (em) => {
        const debts = await em.query(`SELECT * FROM debts WHERE id = $1 FOR UPDATE`, [debtId]);
        if (debts.length === 0) throw notFound('deuda no encontrada');
        const debt = debts[0];
        if (debt.debtor_id !== userId) throw notFound('deuda no encontrada');

        const existing = await em.query(
          `SELECT * FROM payments WHERE debt_id = $1 AND idempotency_key = $2`,
          [debtId, idempotencyKey],
        );
        if (existing.length > 0) {
          if (savedImage) this.storage.delete(savedImage.path);
          return this.mapPayment(existing[0], true);
        }

        const confirmed = Number(debt.confirmed_cents);
        const reserved = Number(debt.reserved_cents);
        const total = Number(debt.amount_cents);
        const available = total - confirmed - reserved;
        if (available <= 0) throw conflict('la deuda ya está saldada');
        if (amountCents > available) {
          throw conflict(`el monto excede el saldo disponible de S/ ${formatCents(available)}`);
        }

        const inserted = await em.query(
          `INSERT INTO payments (debt_id, payer_id, amount_cents, method, reference, evidence_path,
                                 status, idempotency_key, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE', $7, now())
           RETURNING *`,
          [debtId, userId, amountCents, method, reference, savedImage?.path ?? null, idempotencyKey],
        );
        await em.query(`UPDATE debts SET reserved_cents = reserved_cents + $2 WHERE id = $1`, [
          debtId,
          amountCents,
        ]);
        await audit(em, {
          userId,
          operation: 'payment.create',
          resource: `payment:${inserted[0].id}`,
          result: 'ok',
        });

        const newAvailable = available - amountCents;
        return {
          ...this.mapPayment(inserted[0], false),
          availableCents: newAvailable,
        };
      });
    } catch (e) {
      if (savedImage) this.storage.delete(savedImage.path);
      if (e && typeof e === 'object' && (e as { code?: string }).code === '23505') {
        const rows = await this.dataSource.query(
          `SELECT * FROM payments WHERE debt_id = $1 AND idempotency_key = $2`,
          [debtId, idempotencyKey],
        );
        if (rows.length > 0) return this.mapPayment(rows[0], true);
      }
      throw e;
    }
  }

  async cancel(paymentId: string, userId: string) {
    return this.resolvePayment(paymentId, userId, 'CANCELADO', null, 'deudor');
  }

  async confirm(paymentId: string, userId: string) {
    return this.resolvePayment(paymentId, userId, 'CONFIRMADO', null, 'acreedor');
  }

  async reject(paymentId: string, userId: string, reasonRaw: string) {
    const reason = String(reasonRaw ?? '').trim();
    if (!reason) throw validation('motivo: es obligatorio indicar el motivo del rechazo');
    if (reason.length > 200) throw validation('motivo: máximo 200 caracteres');
    return this.resolvePayment(paymentId, userId, 'RECHAZADO', reason, 'acreedor');
  }

  private async resolvePayment(
    paymentId: string,
    userId: string,
    target: Extract<PaymentStatus, 'CANCELADO' | 'CONFIRMADO' | 'RECHAZADO'>,
    reason: string | null,
    role: 'deudor' | 'acreedor',
  ) {
    return withTx(this.dataSource, async (em) => {
      // Orden de bloqueo fijo: primero la deuda, después el pago (ADR-07)
      const ref = await em.query(`SELECT debt_id FROM payments WHERE id = $1`, [paymentId]);
      if (ref.length === 0) throw notFound('pago no encontrado');
      const debts = await em.query(`SELECT * FROM debts WHERE id = $1 FOR UPDATE`, [ref[0].debt_id]);
      if (debts.length === 0) throw notFound('pago no encontrado');
      const debt = debts[0];
      const expected = role === 'deudor' ? debt.debtor_id : debt.creditor_id;
      if (expected !== userId) throw notFound('pago no encontrado');

      const payments = await em.query(`SELECT * FROM payments WHERE id = $1 FOR UPDATE`, [paymentId]);
      if (payments.length === 0) throw notFound('pago no encontrado');
      const payment = payments[0];
      if (payment.status !== 'PENDIENTE') {
        throw conflict(`el pago ya fue resuelto con estado ${payment.status}; ya no admite cambios`);
      }

      const amount = Number(payment.amount_cents);
      if (target === 'CONFIRMADO') {
        if (Number(debt.reserved_cents) < amount) {
          throw conflict('el pago no puede confirmarse porque su reserva ya no existe');
        }
        await em.query(
          `UPDATE payments SET status = 'CONFIRMADO', resolved_at = now() WHERE id = $1`,
          [paymentId],
        );
        await em.query(
          `UPDATE debts SET reserved_cents = reserved_cents - $2, confirmed_cents = confirmed_cents + $2
           WHERE id = $1`,
          [debt.id, amount],
        );
      } else {
        if (Number(debt.reserved_cents) < amount) {
          throw conflict(`el pago ya no está pendiente; su estado actual es ${payment.status}`);
        }
        await em.query(
          `UPDATE payments SET status = $2, reject_reason = $3, resolved_at = now() WHERE id = $1`,
          [paymentId, target, reason],
        );
        await em.query(`UPDATE debts SET reserved_cents = reserved_cents - $2 WHERE id = $1`, [
          debt.id,
          amount,
        ]);
      }

      await audit(em, {
        userId,
        operation: `payment.${target.toLowerCase()}`,
        resource: `payment:${paymentId}`,
        result: 'ok',
      });

      const after = await em.query(`SELECT * FROM payments WHERE id = $1`, [paymentId]);
      const debtAfter = await em.query(
        `SELECT amount_cents, confirmed_cents, reserved_cents FROM debts WHERE id = $1`,
        [debt.id],
      );
      return {
        ...this.mapPayment(after[0], false),
        debt: {
          amountCents: Number(debtAfter[0].amount_cents),
          confirmedCents: Number(debtAfter[0].confirmed_cents),
          reservedCents: Number(debtAfter[0].reserved_cents),
          availableCents:
            Number(debtAfter[0].amount_cents) -
            Number(debtAfter[0].confirmed_cents) -
            Number(debtAfter[0].reserved_cents),
        },
      };
    });
  }

  async listPendingFor(creditorId: string) {
    const rows = await this.dataSource.query(
      `SELECT p.id, p.amount_cents, p.method, p.reference, p.created_at, p.reject_reason,
              d.id AS debt_id, d.amount_cents AS debt_amount, d.confirmed_cents, d.reserved_cents,
              u.username AS debtor, e.id AS event_id, e.name AS event_name, r.id AS receipt_id, r.description AS receipt_description
       FROM payments p
       JOIN debts d ON d.id = p.debt_id
       JOIN users u ON u.id = d.debtor_id
       JOIN events e ON e.id = d.event_id
       JOIN receipts r ON r.id = d.receipt_id
       WHERE d.creditor_id = $1 AND p.status = 'PENDIENTE'
       ORDER BY p.created_at ASC`,
      [creditorId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      debtId: r.debt_id,
      debtor: r.debtor,
      amountCents: Number(r.amount_cents),
      method: r.method,
      reference: r.reference,
      createdAt: r.created_at,
      eventId: r.event_id,
      eventName: r.event_name,
      receiptId: r.receipt_id,
      receiptDescription: r.receipt_description,
    }));
  }

  async readEvidence(paymentId: string, userId: string): Promise<Buffer> {
    const rows = await this.dataSource.query(
      `SELECT p.evidence_path, p.payer_id, d.creditor_id FROM payments p
       JOIN debts d ON d.id = p.debt_id WHERE p.id = $1`,
      [paymentId],
    );
    if (rows.length === 0) throw notFound('pago no encontrado');
    if (rows[0].payer_id !== userId && rows[0].creditor_id !== userId) {
      throw notFound('pago no encontrado');
    }
    if (!rows[0].evidence_path) throw notFound('este pago no tiene evidencia adjunta');
    return this.storage.read(rows[0].evidence_path);
  }

  async debtHistory(debtId: string, userId: string) {
    const rows = await this.dataSource.query(
      `SELECT d.*, e.name AS event_name, r.description AS receipt_description, r.total_cents AS receipt_total,
              cu.username AS creditor, du.username AS debtor
       FROM debts d
       JOIN events e ON e.id = d.event_id
       JOIN receipts r ON r.id = d.receipt_id
       JOIN users cu ON cu.id = d.creditor_id
       JOIN users du ON du.id = d.debtor_id
       WHERE d.id = $1`,
      [debtId],
    );
    if (rows.length === 0) throw notFound('deuda no encontrada');
    const d = rows[0];
    if (d.debtor_id !== userId && d.creditor_id !== userId) throw notFound('deuda no encontrada');

    const payments = await this.dataSource.query(
      `SELECT p.id, p.amount_cents, p.method, p.reference, p.status, p.reject_reason, p.created_at,
              p.resolved_at, p.evidence_path, u.username AS payer
       FROM payments p JOIN users u ON u.id = p.payer_id
       WHERE p.debt_id = $1 ORDER BY p.created_at ASC`,
      [debtId],
    );

    const amount = Number(d.amount_cents);
    const confirmed = Number(d.confirmed_cents);
    const reserved = Number(d.reserved_cents);
    return {
      debtId,
      eventId: d.event_id,
      eventName: d.event_name,
      receiptId: d.receipt_id,
      receiptDescription: d.receipt_description,
      creditor: d.creditor,
      debtor: d.debtor,
      amountCents: amount,
      confirmedCents: confirmed,
      reservedCents: reserved,
      pendingCents: amount - confirmed,
      availableCents: amount - confirmed - reserved,
      settled: amount - confirmed === 0,
      payments: payments.map((p: Record<string, unknown>) => ({
        id: p.id,
        amountCents: Number(p.amount_cents),
        method: p.method,
        reference: p.reference,
        status: p.status,
        rejectReason: p.reject_reason,
        payer: p.payer,
        createdAt: p.created_at,
        resolvedAt: p.resolved_at,
        hasEvidence: Boolean(p.evidence_path),
      })),
    };
  }

  private mapPayment(row: Record<string, unknown>, existing: boolean) {
    return {
      id: row.id,
      debtId: row.debt_id,
      amountCents: Number(row.amount_cents),
      method: row.method,
      reference: row.reference,
      status: row.status,
      rejectReason: row.reject_reason,
      createdAt: row.created_at,
      existing,
    };
  }
}
