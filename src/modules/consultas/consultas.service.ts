import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { notFound } from '../../common/errors';
import { EventosService } from '../eventos/eventos.service';

@Injectable()
export class ConsultasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventos: EventosService,
  ) {}

  async myDebts(
    userId: string,
    direction: 'owing' | 'owed',
    eventId?: string,
    includeSettled = false,
  ) {
    // 1. Auto-compensar saldos cruzados pendientes en eventos del usuario
    try {
      const userEvents = await this.dataSource.query(
        `SELECT DISTINCT event_id FROM debts WHERE (debtor_id = $1 OR creditor_id = $1) ${eventId ? 'AND event_id = $2' : ''}`,
        eventId ? [userId, eventId] : [userId],
      );
      for (const ev of userEvents) {
        await this.eventos.compensateCrossDebts(ev.event_id, userId).catch(() => undefined);
      }
    } catch {
      // Ignorar errores de compensación para no bloquear la consulta
    }

    const settledFilter = includeSettled
      ? `AND (
           (d.amount_cents - d.confirmed_cents) > 0
           OR EXISTS (
             SELECT 1 FROM payments p
             WHERE p.debt_id = d.id
               AND p.status = 'CONFIRMADO'
               AND p.reference != 'COMPENSACION'
           )
         )`
      : 'AND (d.amount_cents - d.confirmed_cents) > 0';

    if (direction === 'owing') {
      const rows = await this.dataSource.query(
        `SELECT d.id, d.amount_cents, d.confirmed_cents, d.reserved_cents,
                d.event_id, e.name AS event_name, r.id AS receipt_id, r.description AS receipt_description,
                u.username AS creditor, d.creditor_id
         FROM debts d
         JOIN events e ON e.id = d.event_id
         JOIN receipts r ON r.id = d.receipt_id
         JOIN users u ON u.id = d.creditor_id
         WHERE d.debtor_id = $1 ${eventId ? 'AND d.event_id = $2' : ''}
           ${settledFilter}
         ORDER BY d.created_at DESC`,
        eventId ? [userId, eventId] : [userId],
      );
      return rows.map((r: Record<string, unknown>) => ({
        debtId: r.id,
        eventId: r.event_id,
        eventName: r.event_name,
        receiptId: r.receipt_id,
        receiptDescription: r.receipt_description,
        creditor: r.creditor,
        amountCents: Number(r.amount_cents),
        pendingCents: Number(r.amount_cents) - Number(r.confirmed_cents),
        availableCents:
          Number(r.amount_cents) - Number(r.confirmed_cents) - Number(r.reserved_cents),
      }));
    }

    const rows = await this.dataSource.query(
      `SELECT d.id, d.amount_cents, d.confirmed_cents, d.reserved_cents,
              d.event_id, e.name AS event_name, r.id AS receipt_id, r.description AS receipt_description,
              u.username AS debtor, d.debtor_id
       FROM debts d
       JOIN events e ON e.id = d.event_id
       JOIN receipts r ON r.id = d.receipt_id
       JOIN users u ON u.id = d.debtor_id
       WHERE d.creditor_id = $1 ${eventId ? 'AND d.event_id = $2' : ''}
         ${settledFilter}
       ORDER BY d.created_at DESC`,
      eventId ? [userId, eventId] : [userId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      debtId: r.id,
      eventId: r.event_id,
      eventName: r.event_name,
      receiptId: r.receipt_id,
      receiptDescription: r.receipt_description,
      debtor: r.debtor,
      amountCents: Number(r.amount_cents),
      pendingCents: Number(r.amount_cents) - Number(r.confirmed_cents),
      reservedCents: Number(r.reserved_cents),
    }));
  }

  async pendingTray(userId: string) {
    const toConfirm = await this.dataSource.query(
      `SELECT p.id, p.amount_cents, p.method, p.created_at, d.id AS debt_id,
              u.username AS debtor, e.id AS event_id, e.name AS event_name
       FROM payments p
       JOIN debts d ON d.id = p.debt_id
       JOIN users u ON u.id = d.debtor_id
       JOIN events e ON e.id = d.event_id
       WHERE d.creditor_id = $1 AND p.status = 'PENDIENTE'
       ORDER BY p.created_at ASC`,
      [userId],
    );

    const rejected = await this.dataSource.query(
      `SELECT p.id, p.amount_cents, p.reject_reason, p.created_at, d.id AS debt_id,
              u.username AS creditor, e.id AS event_id, e.name AS event_name
       FROM payments p
       JOIN debts d ON d.id = p.debt_id
       JOIN users u ON u.id = d.creditor_id
       JOIN events e ON e.id = d.event_id
       WHERE p.payer_id = $1 AND p.status = 'RECHAZADO'
         AND (d.amount_cents - d.confirmed_cents - d.reserved_cents) > 0
         AND NOT EXISTS (
           SELECT 1 FROM payments p2 WHERE p2.debt_id = d.id AND p2.status = 'PENDIENTE'
         )
       ORDER BY p.created_at ASC`,
      [userId],
    );

    const receipts = await this.dataSource.query(
      `SELECT r.id, r.status, r.fail_reason, r.created_at, e.id AS event_id, e.name AS event_name
       FROM receipts r
       JOIN events e ON e.id = r.event_id
       WHERE r.payer_id = $1 AND r.status IN ('FALLIDO', 'EXTRAÍDO')
       ORDER BY r.created_at DESC`,
      [userId],
    );

    const items = [
      ...toConfirm.map((r: Record<string, unknown>) => ({
        type: 'PAYMENT_TO_CONFIRM' as const,
        paymentId: r.id,
        debtId: r.debt_id,
        eventId: r.event_id,
        eventName: r.event_name,
        counterparty: r.debtor,
        amountCents: Number(r.amount_cents),
        method: r.method,
        createdAt: r.created_at,
      })),
      ...rejected.map((r: Record<string, unknown>) => ({
        type: 'PAYMENT_REJECTED' as const,
        paymentId: r.id,
        debtId: r.debt_id,
        eventId: r.event_id,
        eventName: r.event_name,
        counterparty: r.creditor,
        amountCents: Number(r.amount_cents),
        reason: r.reject_reason,
        createdAt: r.created_at,
      })),
      ...receipts.map((r: Record<string, unknown>) => ({
        type: 'RECEIPT_TO_REVIEW' as const,
        receiptId: r.id,
        status: r.status,
        eventId: r.event_id,
        eventName: r.event_name,
        failReason: r.fail_reason,
        createdAt: r.created_at,
      })),
    ];

    return { count: items.length, items };
  }

  async assertDebtParticipant(debtId: string, userId: string): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT debtor_id, creditor_id FROM debts WHERE id = $1`,
      [debtId],
    );
    if (rows.length === 0 || (rows[0].debtor_id !== userId && rows[0].creditor_id !== userId)) {
      throw notFound('deuda no encontrada');
    }
  }
}
