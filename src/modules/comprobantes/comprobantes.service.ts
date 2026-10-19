import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Receipt, ReceiptItem, ReceiptJob, User, EventParticipant } from '../../db/entities';
import { validation, conflict, notFound, forbidden } from '../../common/errors';
import { toCents, parseOptionalCents } from '../../common/money';
import { withTx, audit, updateRows } from '../../common/db';
import { EventosService } from '../eventos/eventos.service';
import { StorageService } from './storage.service';
import { correlationId } from '../../common/correlation';

export interface NormalizedItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

@Injectable()
export class ComprobantesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventos: EventosService,
    private readonly storage: StorageService,
  ) {}

  async upload(eventId: string, userId: string, buffer: Buffer) {
    await this.eventos.assertParticipant(eventId, userId);
    const { path, hash } = this.storage.saveImage(buffer, 'comprobante');

    try {
      return await withTx(this.dataSource, async (em) => {
        const existing = await em.query(
          `SELECT id, status FROM receipts WHERE event_id = $1 AND image_hash = $2`,
          [eventId, hash],
        );
        if (existing.length > 0) {
          if (existing[0].status === 'FALLIDO') {
            await em.query(
              `UPDATE receipts SET status = 'PROCESANDO', fail_reason = NULL, updated_at = now() WHERE id = $1`,
              [existing[0].id],
            );
            await em.query(`DELETE FROM receipt_jobs WHERE receipt_id = $1`, [existing[0].id]);
            await em.getRepository(ReceiptJob).insert({
              receiptId: existing[0].id,
              status: 'PENDING',
              attempts: 0,
              nextAttemptAt: new Date(),
              leaseOwner: null,
              leaseExpiresAt: null,
              correlationId: correlationId(),
              lastError: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            return { id: existing[0].id, status: 'PROCESANDO' as const, existing: false };
          }
          return { id: existing[0].id, status: existing[0].status, existing: true };
        }
        const saved = await em.getRepository(Receipt).save(
          em.getRepository(Receipt).create({
            eventId,
            payerId: userId,
            status: 'PROCESANDO',
            totalCents: 0,
            taxCents: 0,
            tipCents: 0,
            discountCents: 0,
            imagePath: path,
            imageHash: hash,
            description: null,
            failReason: null,
            splitMode: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );
        await em.getRepository(ReceiptJob).insert({
          receiptId: saved.id,
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          leaseOwner: null,
          leaseExpiresAt: null,
          correlationId: correlationId(),
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await audit(em, {
          userId,
          operation: 'receipt.upload',
          resource: `receipt:${saved.id}`,
          result: 'ok',
        });
        return { id: saved.id, status: saved.status, existing: false };
      });
    } catch (e) {
      this.storage.delete(path);
      if (e && typeof e === 'object' && (e as { code?: string }).code === '23505') {
        const rows = await this.dataSource.query(
          `SELECT id, status FROM receipts WHERE event_id = $1 AND image_hash = $2`,
          [eventId, hash],
        );
        if (rows.length > 0) return { id: rows[0].id, status: rows[0].status, existing: true };
      }
      throw e;
    }
  }

  async createManual(
    eventId: string,
    userId: string,
    body: {
      description?: string;
      total: string | number;
      tax?: string | number;
      tip?: string | number;
      discount?: string | number;
      items?: { description: string; quantity: number; unitPrice: string | number }[];
      receiptId?: string;
    },
  ) {
    await this.eventos.assertParticipant(eventId, userId);
    const data = this.validateExpense(body);

    if (body?.receiptId) {
      const rows = await this.dataSource.query(
        `SELECT id, event_id, payer_id, status FROM receipts WHERE id = $1`,
        [body.receiptId],
      );
      if (rows.length === 0 || rows[0].event_id !== eventId) throw notFound('comprobante no encontrado');
      if (rows[0].payer_id !== userId) throw forbidden('solo el pagador puede editar el comprobante');
      if (rows[0].status !== 'FALLIDO') {
        throw conflict('solo se pueden completar manualmente los comprobantes FALLIDO');
      }
      await this.replaceItemsAndData(body.receiptId, data, 'FALLIDO');
      return this.getDetail(body.receiptId, userId);
    }

    const created = await withTx(this.dataSource, async (em) => {
      const receipt = await em.getRepository(Receipt).save(
        em.getRepository(Receipt).create({
          eventId,
          payerId: userId,
          status: 'EXTRAÍDO',
          description: data.description,
          totalCents: data.totalCents,
          taxCents: data.taxCents,
          tipCents: data.tipCents,
          discountCents: data.discountCents,
          imagePath: null,
          imageHash: null,
          failReason: null,
          splitMode: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      await this.insertItems(em, receipt.id, data.items);
      await audit(em, {
        userId,
        operation: 'receipt.manual',
        resource: `receipt:${receipt.id}`,
        result: 'ok',
      });
      return receipt;
    });
    return this.getDetail(created.id, userId);
  }

  async list(eventId: string, userId: string) {
    await this.eventos.assertParticipant(eventId, userId);
    const rows = await this.dataSource.query(
      `SELECT r.id, r.status, r.total_cents, r.description, r.created_at, r.fail_reason,
              u.username AS payer, r.payer_id = $2 AS mine
       FROM receipts r JOIN users u ON u.id = r.payer_id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [eventId, userId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      status: r.status,
      totalCents: Number(r.total_cents),
      description: r.description,
      createdAt: r.created_at,
      failReason: r.fail_reason,
      payer: r.payer,
      mine: Boolean(r.mine),
    }));
  }

  async getDetail(receiptId: string, userId: string) {
    const receipt = await this.loadReceipt(receiptId, userId);
    const items = await this.dataSource.getRepository(ReceiptItem).find({
      where: { receiptId },
      order: { position: 'ASC' },
    });
    const splitParticipants = await this.dataSource.query(
      `SELECT user_id FROM split_participants WHERE receipt_id = $1`,
      [receiptId],
    );
    const assignments = await this.dataSource.query(
      `SELECT item_id, unit_index, user_id FROM item_assignments WHERE receipt_id = $1 ORDER BY item_id, unit_index`,
      [receiptId],
    );
    const debts = await this.dataSource.query(
      `SELECT d.id, d.amount_cents, d.confirmed_cents, d.reserved_cents, u.username AS debtor
       FROM debts d JOIN users u ON u.id = d.debtor_id WHERE d.receipt_id = $1 ORDER BY u.username`,
      [receiptId],
    );
    const payer = await this.dataSource.getRepository(User).findOne({ where: { id: receipt.payerId } });

    return {
      id: receipt.id,
      eventId: receipt.eventId,
      status: receipt.status,
      description: receipt.description,
      totalCents: receipt.totalCents,
      taxCents: receipt.taxCents,
      tipCents: receipt.tipCents,
      discountCents: receipt.discountCents,
      failReason: receipt.failReason,
      splitMode: receipt.splitMode,
      hasImage: Boolean(receipt.imagePath),
      payer: payer ? { id: payer.id, username: payer.username } : null,
      mine: receipt.payerId === userId,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      items: items.map((i) => ({
        id: i.id,
        position: i.position,
        description: i.description,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        subtotalCents: i.quantity * i.unitPriceCents,
      })),
      split: {
        participants: splitParticipants.map((r: Record<string, unknown>) => r.user_id),
        assignments: assignments.map((r: Record<string, unknown>) => ({
          itemId: r.item_id,
          unitIndex: Number(r.unit_index),
          userId: r.user_id,
        })),
      },
      debts: debts.map((d: Record<string, unknown>) => ({
        id: d.id,
        debtor: d.debtor,
        amountCents: Number(d.amount_cents),
        confirmedCents: Number(d.confirmed_cents),
        reservedCents: Number(d.reserved_cents),
      })),
    };
  }

  async patch(
    receiptId: string,
    userId: string,
    body: {
      description?: string;
      total?: string | number;
      tax?: string | number;
      tip?: string | number;
      discount?: string | number;
      items?: { description: string; quantity: number; unitPrice: string | number }[];
    },
  ) {
    const receipt = await this.loadReceipt(receiptId, userId);
    if (receipt.payerId !== userId) throw forbidden('solo el pagador puede editar el comprobante');
    if (receipt.status === 'CONFIRMADO') throw conflict('el comprobante ya está CONFIRMADO y no es editable');
    if (receipt.status !== 'EXTRAÍDO') throw conflict('el comprobante debe estar EXTRAÍDO para editar');

    const current = {
      description: body.description !== undefined ? body.description : receipt.description ?? undefined,
      total: body.total !== undefined ? body.total : receipt.totalCents,
      tax: body.tax !== undefined ? body.tax : receipt.taxCents,
      tip: body.tip !== undefined ? body.tip : receipt.tipCents,
      discount: body.discount !== undefined ? body.discount : receipt.discountCents,
      items: body.items,
    };
    const data = this.validateExpense(current);
    await this.replaceItemsAndData(receiptId, data, 'EXTRAÍDO');
    return this.getDetail(receiptId, userId);
  }

  async retry(receiptId: string, userId: string) {
    const receipt = await this.loadReceipt(receiptId, userId);
    if (receipt.payerId !== userId) throw forbidden('solo el pagador puede reintentar el procesamiento');

    return withTx(this.dataSource, async (em) => {
      const updated = updateRows(
        await em.query(
          `UPDATE receipts SET status = 'PROCESANDO', fail_reason = NULL, updated_at = now()
           WHERE id = $1 AND status = 'FALLIDO' RETURNING id`,
          [receiptId],
        ),
      );
      if (updated.length === 0) throw conflict('solo se puede reintentar un comprobante FALLIDO');
      try {
        await em.getRepository(ReceiptJob).insert({
          receiptId,
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          leaseOwner: null,
          leaseExpiresAt: null,
          correlationId: correlationId(),
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (e) {
        if (e && typeof e === 'object' && (e as { code?: string }).code === '23505') {
          throw conflict('ya existe una tarea de procesamiento activa para este comprobante');
        }
        throw e;
      }
      await audit(em, { userId, operation: 'receipt.retry', resource: `receipt:${receiptId}`, result: 'ok' });
      return { id: receiptId, status: 'PROCESANDO' };
    });
  }

  async readImage(receiptId: string, userId: string): Promise<Buffer> {
    const receipt = await this.loadReceipt(receiptId, userId);
    if (!receipt.imagePath) throw notFound('imagen no encontrada');
    return this.storage.read(receipt.imagePath);
  }

  // ---------- helpers ----------

  async loadReceipt(receiptId: string, userId: string): Promise<Receipt> {
    const rows = await this.dataSource.query(`SELECT * FROM receipts WHERE id = $1`, [receiptId]);
    if (rows.length === 0) throw notFound('comprobante no encontrado');
    const r = rows[0];
    await this.eventos.assertParticipant(r.event_id, userId);
    return {
      id: r.id,
      eventId: r.event_id,
      payerId: r.payer_id,
      status: r.status,
      description: r.description,
      totalCents: r.total_cents,
      taxCents: r.tax_cents,
      tipCents: r.tip_cents,
      discountCents: r.discount_cents,
      imagePath: r.image_path,
      imageHash: r.image_hash,
      failReason: r.fail_reason,
      splitMode: r.split_mode,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private validateExpense(body: {
    description?: string;
    total: string | number;
    tax?: string | number;
    tip?: string | number;
    discount?: string | number;
    items?: { description: string; quantity: number; unitPrice: string | number }[];
  }): {
    description: string | null;
    totalCents: number;
    taxCents: number;
    tipCents: number;
    discountCents: number;
    items: NormalizedItem[];
  } {
    const totalCents = toCents(body?.total, 'monto total');
    if (totalCents <= 0) throw validation('monto total: debe ser mayor a 0');
    const taxCents = parseOptionalCents(body?.tax, 'impuestos');
    const tipCents = parseOptionalCents(body?.tip, 'propina');
    const discountCents = parseOptionalCents(body?.discount, 'descuentos');

    let description: string | null = null;
    if (body?.description !== undefined && body.description !== null) {
      const d = String(body.description).trim();
      if (d.length > 200) throw validation('descripción: máximo 200 caracteres');
      description = d || null;
    }

    const items: NormalizedItem[] = [];
    if (body?.items !== undefined && body.items !== null) {
      if (!Array.isArray(body.items)) throw validation('ítems: formato inválido');
      if (body.items.length > 200) throw validation('ítems: máximo 200 ítems');
      for (const [i, raw] of body.items.entries()) {
        const desc = String(raw?.description ?? '').trim();
        if (!desc || desc.length > 200) {
          throw validation(`ítem ${i + 1}: descripción requerida (máx. 200 caracteres)`);
        }
        const qty = Number(raw?.quantity);
        if (!Number.isInteger(qty) || qty < 1) {
          throw validation(`ítem "${desc}": la cantidad debe ser un entero mayor o igual a 1`);
        }
        const unitPriceCents = toCents(raw?.unitPrice, `ítem "${desc}": precio unitario`);
        if (unitPriceCents <= 0) {
          throw validation(`ítem "${desc}": el precio unitario debe ser mayor a 0`);
        }
        items.push({ description: desc, quantity: qty, unitPriceCents });
      }
    }

    return { description, totalCents, taxCents, tipCents, discountCents, items };
  }

  private async insertItems(
    em: import('typeorm').EntityManager,
    receiptId: string,
    items: NormalizedItem[],
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await em.getRepository(ReceiptItem).insert({
        receiptId,
        position: i + 1,
        description: it.description,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
      });
    }
  }

  private async replaceItemsAndData(
    receiptId: string,
    data: {
      description: string | null;
      totalCents: number;
      taxCents: number;
      tipCents: number;
      discountCents: number;
      items: NormalizedItem[];
    },
    requiredStatus: 'EXTRAÍDO' | 'FALLIDO',
  ): Promise<void> {
    await withTx(this.dataSource, async (em) => {
      const updated = updateRows(
        await em.query(
          `UPDATE receipts
           SET total_cents = $2, tax_cents = $3, tip_cents = $4, discount_cents = $5,
               description = $6, status = 'EXTRAÍDO', fail_reason = NULL, updated_at = now()
           WHERE id = $1 AND status = $7
           RETURNING id`,
          [
            receiptId,
            data.totalCents,
            data.taxCents,
            data.tipCents,
            data.discountCents,
            data.description,
            requiredStatus,
          ],
        ),
      );
      if (updated.length === 0) throw conflict('el comprobante ya está CONFIRMADO y no es editable');
      await em.query(`DELETE FROM item_assignments WHERE receipt_id = $1`, [receiptId]);
      await em.query(`DELETE FROM receipt_items WHERE receipt_id = $1`, [receiptId]);
      await this.insertItems(em, receiptId, data.items);
    });
  }

  async deleteReceipt(receiptId: string, userId: string): Promise<{ ok: boolean }> {
    const rows = await this.dataSource.query(
      `SELECT r.id, r.event_id, r.payer_id, r.status, r.image_path
       FROM receipts r
       WHERE r.id = $1`,
      [receiptId],
    );
    if (rows.length === 0) throw notFound('comprobante no encontrado');
    const receipt = rows[0];

    // Verificar que el usuario pertenezca al evento
    await this.eventos.assertParticipant(receipt.event_id, userId);

    // Seguridad: solo quien subió el comprobante puede eliminarlo
    if (receipt.payer_id !== userId) {
      throw forbidden('solo la persona que subió el comprobante puede eliminarlo');
    }

    // Si ya tiene pagos registrados a través de sus deudas, no se puede borrar
    const payments = await this.dataSource.query(
      `SELECT p.id FROM payments p
       INNER JOIN debts d ON d.id = p.debt_id
       WHERE d.receipt_id = $1 LIMIT 1`,
      [receiptId],
    );
    if (payments.length > 0) {
      throw conflict('no se puede eliminar un comprobante que ya tiene pagos registrados');
    }

    await withTx(this.dataSource, async (em) => {
      // Borrar deudas asociadas si existieran
      await em.query(`DELETE FROM debts WHERE receipt_id = $1`, [receiptId]);
      // Borrar receipt (ON DELETE CASCADE elimina items, jobs, assignments, participants)
      await em.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
      await audit(em, {
        userId,
        operation: 'receipt.delete',
        resource: `receipt:${receiptId}`,
        result: 'ok',
      });
    });

    if (receipt.image_path) {
      this.storage.delete(receipt.image_path);
    }

    return { ok: true };
  }
}
