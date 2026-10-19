import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { validation, conflict, forbidden } from '../../common/errors';
import { withTx, audit, updateRows } from '../../common/db';
import { EventosService } from '../eventos/eventos.service';
import { ComprobantesService } from '../comprobantes/comprobantes.service';
import { computeSplit, CalcAssignment, CalcItem, SplitMode } from './split-calculator';

@Injectable()
export class RepartoService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventos: EventosService,
    private readonly comprobantes: ComprobantesService,
  ) {}

  async saveSplit(
    receiptId: string,
    userId: string,
    body: { mode: SplitMode; participants?: string[]; assignments?: CalcAssignment[] },
  ) {
    const receipt = await this.comprobantes.loadReceipt(receiptId, userId);
    if (receipt.payerId !== userId) throw forbidden('solo el pagador puede configurar el reparto');
    if (receipt.status === 'CONFIRMADO') throw conflict('el comprobante ya está CONFIRMADO');
    if (receipt.status !== 'EXTRAÍDO') throw conflict('el comprobante debe estar EXTRAÍDO para configurar el reparto');

    const mode = body?.mode;
    if (mode !== 'EQUITATIVE' && mode !== 'BY_ITEM') {
      throw validation('modalidad: debe ser EQUITATIVE o BY_ITEM');
    }

    const eventParticipants = await this.eventos.listParticipants(receipt.eventId);
    const participantIds = new Set(eventParticipants.map((p) => p.id));

    if (mode === 'EQUITATIVE') {
      const selected =
        body.participants && body.participants.length > 0
          ? [...new Set(body.participants)]
          : eventParticipants.map((p) => p.id);
      for (const id of selected) {
        if (!participantIds.has(id)) throw validation('solo se pueden seleccionar participantes del evento');
      }
      if (selected.length === 0) throw validation('selecciona al menos un participante');
      await withTx(this.dataSource, async (em) => {
        await this.clearSplit(em, receiptId);
        await em.query(`UPDATE receipts SET split_mode = 'EQUITATIVE', updated_at = now() WHERE id = $1`, [receiptId]);
        for (const id of selected) {
          await em.query(`INSERT INTO split_participants (receipt_id, user_id) VALUES ($1, $2)`, [receiptId, id]);
        }
      });
      return { receiptId, splitMode: 'EQUITATIVE', participants: selected };
    }

    // BY_ITEM
    const items = await this.dataSource.query(`SELECT id, quantity FROM receipt_items WHERE receipt_id = $1`, [receiptId]);
    if (items.length === 0) throw validation('el comprobante no tiene ítems; usa el reparto equitativo o agrega ítems');
    const itemMap = new Map<string, number>(
      items.map((i: { id: string; quantity: number }): [string, number] => [i.id, i.quantity]),
    );

    const assignments = Array.isArray(body.assignments) ? body.assignments : [];
    for (const a of assignments) {
      if (!itemMap.has(a.itemId)) throw validation('la asignación hace referencia a un ítem inexistente');
      if (!Number.isInteger(a.unitIndex) || a.unitIndex < 1 || a.unitIndex > itemMap.get(a.itemId)!) {
        throw validation('unidad de ítem inválida');
      }
      if (!participantIds.has(a.userId)) throw validation('la asignación debe ser a un participante del evento');
    }

    await withTx(this.dataSource, async (em) => {
      await this.clearSplit(em, receiptId);
      await em.query(`UPDATE receipts SET split_mode = 'BY_ITEM', updated_at = now() WHERE id = $1`, [receiptId]);
      for (const a of assignments) {
        await em.query(
          `INSERT INTO item_assignments (receipt_id, item_id, unit_index, user_id) VALUES ($1, $2, $3, $4)`,
          [receiptId, a.itemId, a.unitIndex, a.userId],
        );
      }
    });
    return { receiptId, splitMode: 'BY_ITEM', assignments };
  }

  async confirm(receiptId: string, userId: string) {
    const receipt = await this.comprobantes.loadReceipt(receiptId, userId);
    if (receipt.payerId !== userId) throw forbidden('solo el pagador puede confirmar el comprobante');

    const result = await withTx(this.dataSource, async (em) => {
      const locked = await em.query(`SELECT * FROM receipts WHERE id = $1 FOR UPDATE`, [receiptId]);
      const r = locked[0];
      if (!r) throw conflict('comprobante inexistente');
      if (r.status === 'CONFIRMADO') throw conflict('el comprobante ya está CONFIRMADO');
      if (r.status !== 'EXTRAÍDO') throw conflict('el comprobante debe estar EXTRAÍDO para confirmar');

      const mode = r.split_mode as SplitMode | null;
      if (!mode) throw validation('configura el reparto antes de confirmar');

      const itemRows = await em.query(
        `SELECT id, description, quantity, unit_price_cents FROM receipt_items WHERE receipt_id = $1 ORDER BY position`,
        [receiptId],
      );
      const items: CalcItem[] = itemRows.map((i: Record<string, unknown>) => ({
        id: i.id as string,
        description: i.description as string,
        quantity: Number(i.quantity),
        unitPriceCents: Number(i.unit_price_cents),
      }));

      const participantRows = await em.query(
        `SELECT user_id FROM event_participants WHERE event_id = $1 ORDER BY user_id`,
        [r.event_id],
      );
      const tieBreakOrder: string[] = participantRows.map((p: { user_id: string }) => p.user_id);

      let participantIds: string[] = [];
      let assignments: CalcAssignment[] = [];
      if (mode === 'EQUITATIVE') {
        const rows = await em.query(`SELECT user_id FROM split_participants WHERE receipt_id = $1`, [receiptId]);
        participantIds = rows.map((x: { user_id: string }) => x.user_id);
        if (participantIds.length === 0) {
          // por defecto, todos los participantes
          participantIds = tieBreakOrder;
        }
      } else {
        const rows = await em.query(
          `SELECT item_id, unit_index, user_id FROM item_assignments WHERE receipt_id = $1`,
          [receiptId],
        );
        assignments = rows.map((x: Record<string, unknown>) => ({
          itemId: x.item_id as string,
          unitIndex: Number(x.unit_index),
          userId: x.user_id as string,
        }));
      }

      const parts = computeSplit({
        mode,
        totalCents: Number(r.total_cents),
        taxCents: Number(r.tax_cents),
        tipCents: Number(r.tip_cents),
        discountCents: Number(r.discount_cents),
        items,
        participantIds,
        assignments,
        tieBreakOrder,
      });

      const debtorParts = parts.filter((p) => p.userId !== r.payer_id && p.cents > 0);

      const updated = updateRows(
        await em.query(
          `UPDATE receipts SET status = 'CONFIRMADO', updated_at = now()
           WHERE id = $1 AND status = 'EXTRAÍDO' RETURNING id`,
          [receiptId],
        ),
      );
      if (updated.length === 0) throw conflict('el comprobante ya está CONFIRMADO');

      const debtSummary: { debtorId: string; amountCents: number }[] = [];
      for (const part of debtorParts) {
        await em.query(
          `INSERT INTO debts (receipt_id, event_id, debtor_id, creditor_id, amount_cents, confirmed_cents, reserved_cents)
           VALUES ($1, $2, $3, $4, $5, 0, 0)`,
          [receiptId, r.event_id, part.userId, r.payer_id, part.cents],
        );
        debtSummary.push({ debtorId: part.userId, amountCents: part.cents });
      }

      await audit(em, {
        userId,
        operation: 'receipt.confirm',
        resource: `receipt:${receiptId}`,
        result: 'ok',
      });

      const names = await em.query(
        `SELECT d.amount_cents, u.username FROM debts d JOIN users u ON u.id = d.debtor_id
         WHERE d.receipt_id = $1 ORDER BY u.username`,
        [receiptId],
      );
      return {
        receiptId,
        status: 'CONFIRMADO' as const,
        totalCents: Number(r.total_cents),
        parts: parts.map((p) => ({ userId: p.userId, cents: p.cents })),
        debts: names.map((n: Record<string, unknown>) => ({
          debtor: n.username,
          amountCents: Number(n.amount_cents),
        })),
        generated: debtSummary.length,
      };
    });

    await this.eventos.compensateCrossDebts(receipt.eventId, userId);
    return result;
  }

  private async clearSplit(em: import('typeorm').EntityManager, receiptId: string): Promise<void> {
    await em.query(`DELETE FROM split_participants WHERE receipt_id = $1`, [receiptId]);
    await em.query(`DELETE FROM item_assignments WHERE receipt_id = $1`, [receiptId]);
  }
}
