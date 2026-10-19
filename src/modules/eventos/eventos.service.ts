import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Event, EventParticipant } from '../../db/entities';
import { validation, conflict, notFound } from '../../common/errors';
import { withTx, audit } from '../../common/db';
import { StorageService } from '../comprobantes/storage.service';

@Injectable()
export class EventosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async assertParticipant(eventId: string, userId: string): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId],
    );
    if (rows.length === 0) throw notFound('evento no encontrado');
  }

  async create(userId: string, nameRaw: string) {
    const name = String(nameRaw ?? '').trim();
    if (name.length < 1 || name.length > 60) {
      throw validation('nombre: debe tener entre 1 y 60 caracteres');
    }
    return withTx(this.dataSource, async (em) => {
      const event = await em.getRepository(Event).save(
        em.getRepository(Event).create({ name, createdBy: userId }),
      );
      await em.getRepository(EventParticipant).insert({
        eventId: event.id,
        userId,
        joinedAt: new Date(),
      });
      await audit(em, { userId, operation: 'event.create', resource: `event:${event.id}`, result: 'ok' });
      return event;
    });
  }

  async listMine(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT e.id, e.name, e.created_at, (e.image_path IS NOT NULL) AS has_image,
              count(ep.user_id)::int AS participants,
              COALESCE(cr.received, 0) - COALESCE(cb.paid, 0) AS net_cents
       FROM events e
       JOIN event_participants me ON me.event_id = e.id AND me.user_id = $1
       JOIN event_participants ep ON ep.event_id = e.id
       LEFT JOIN (
         SELECT event_id, sum(amount_cents - confirmed_cents) AS received
         FROM debts WHERE creditor_id = $1 GROUP BY event_id
       ) cr ON cr.event_id = e.id
       LEFT JOIN (
         SELECT event_id, sum(amount_cents - confirmed_cents) AS paid
         FROM debts WHERE debtor_id = $1 GROUP BY event_id
       ) cb ON cb.event_id = e.id
       GROUP BY e.id, cr.received, cb.paid
       ORDER BY e.created_at DESC`,
      [userId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      hasImage: Boolean(r.has_image),
      participants: r.participants,
      netCents: Number(r.net_cents),
    }));
  }

  async getEvent(eventId: string, userId: string) {
    await this.assertParticipant(eventId, userId);
    const rows = await this.dataSource.query(
      `SELECT e.id, e.name, e.created_at, (e.image_path IS NOT NULL) AS has_image,
              u.username AS created_by_name
       FROM events e JOIN users u ON u.id = e.created_by WHERE e.id = $1`,
      [eventId],
    );
    if (rows.length === 0) throw notFound('evento no encontrado');
    const participants = await this.listParticipants(eventId);
    const invitations = await this.listInvitations(eventId);
    return { ...rows[0], participants, invitations, createdAt: rows[0].created_at, hasImage: Boolean(rows[0].has_image) };
  }

  async listParticipants(eventId: string): Promise<{ id: string; username: string }[]> {
    const rows = await this.dataSource.query(
      `SELECT u.id, u.username FROM event_participants ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.event_id = $1 ORDER BY ep.joined_at, u.username`,
      [eventId],
    );
    return rows.map((r: Record<string, unknown>) => ({ id: r.id, username: r.username }));
  }

  async listInvitations(
    eventId: string,
  ): Promise<{ id: string; username: string; status: string; createdAt: string }[]> {
    const rows = await this.dataSource.query(
      `SELECT i.id, u.username, i.status, i.created_at
       FROM event_invitations i JOIN users u ON u.id = i.invitee_id
       WHERE i.event_id = $1 ORDER BY i.created_at DESC`,
      [eventId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      username: r.username,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  async invite(eventId: string, actorId: string, queryRaw: string) {
    await this.assertParticipant(eventId, actorId);
    const q = String(queryRaw ?? '').trim();
    if (!q) throw validation('usuario: ingresa un username o correo exacto');

    const found = await this.dataSource.query(
      `SELECT id, username FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1) LIMIT 1`,
      [q],
    );
    if (found.length === 0) throw notFound('usuario no encontrado');
    const inviteeId = found[0].id;

    return withTx(this.dataSource, async (em) => {
      let invitationId: string;
      const existing = await em.query(
        `SELECT i.id, i.status FROM event_invitations i WHERE i.event_id = $1 AND i.invitee_id = $2`,
        [eventId, inviteeId],
      );
      if (existing.length > 0 && existing[0].status === 'PENDIENTE') {
        throw conflict('ya se envió una invitación a este usuario');
      }
      const already = await em.query(
        `SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2`,
        [eventId, inviteeId],
      );
      if (already.length > 0) throw conflict('el usuario ya es participante del evento');

      if (existing.length > 0) {
        await em.query(
          `UPDATE event_invitations SET status = 'PENDIENTE', responded_at = NULL, created_at = now()
           WHERE id = $1`,
          [existing[0].id],
        );
        invitationId = existing[0].id;
      } else {
        const ins = await em.query(
          `INSERT INTO event_invitations (event_id, invitee_id, inviter_id, status)
           VALUES ($1, $2, $3, 'PENDIENTE') RETURNING id`,
          [eventId, inviteeId, actorId],
        );
        invitationId = ins[0].id;
      }
      await audit(em, {
        userId: actorId,
        operation: 'event.invite',
        resource: `event:${eventId}`,
        result: 'ok',
      });
      return { id: invitationId, username: found[0].username, status: 'PENDIENTE' };
    });
  }

  async myPendingInvitations(
    userId: string,
  ): Promise<{ invitationId: string; eventId: string; eventName: string; inviter: string; createdAt: string }[]> {
    const rows = await this.dataSource.query(
      `SELECT i.id, i.event_id, e.name AS event_name, u.username AS inviter, i.created_at
       FROM event_invitations i
       JOIN events e ON e.id = i.event_id
       JOIN users u ON u.id = i.inviter_id
       WHERE i.invitee_id = $1 AND i.status = 'PENDIENTE'
       ORDER BY i.created_at ASC`,
      [userId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      invitationId: r.id,
      eventId: r.event_id,
      eventName: r.event_name,
      inviter: r.inviter,
      createdAt: r.created_at,
    }));
  }

  async respond(invitationId: string, inviteeId: string, decision: 'aceptar' | 'rechazar') {
    return withTx(this.dataSource, async (em) => {
      const rows = await em.query(
        `SELECT id, event_id, invitee_id, status FROM event_invitations WHERE id = $1`,
        [invitationId],
      );
      if (rows.length === 0 || rows[0].invitee_id !== inviteeId || rows[0].status !== 'PENDIENTE') {
        throw notFound('invitación no encontrada');
      }
      const eventId = rows[0].event_id;
      if (decision === 'aceptar') {
        await em.query(
          `INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [eventId, inviteeId],
        );
        await em.query(
          `UPDATE event_invitations SET status = 'ACEPTADA', responded_at = now() WHERE id = $1`,
          [invitationId],
        );
      } else {
        await em.query(
          `UPDATE event_invitations SET status = 'RECHAZADA', responded_at = now() WHERE id = $1`,
          [invitationId],
        );
      }
      await audit(em, {
        userId: inviteeId,
        operation: decision === 'aceptar' ? 'invitation.accept' : 'invitation.reject',
        resource: `event:${eventId}`,
        result: 'ok',
      });
      return { id: invitationId, eventId, status: decision === 'aceptar' ? 'ACEPTADA' : 'RECHAZADA' };
    });
  }

  async cancelInvitation(eventId: string, actorId: string, invitationId: string) {
    await this.assertParticipant(eventId, actorId);
    return withTx(this.dataSource, async (em) => {
      const rows = await em.query(
        `SELECT id, status FROM event_invitations WHERE id = $1 AND event_id = $2`,
        [invitationId, eventId],
      );
      if (rows.length === 0) throw notFound('invitación no encontrada');
      if (rows[0].status !== 'PENDIENTE') {
        throw conflict('solo puedes cancelar invitaciones pendientes');
      }
      await em.query(`DELETE FROM event_invitations WHERE id = $1`, [invitationId]);
      await audit(em, {
        userId: actorId,
        operation: 'event.invite.cancel',
        resource: `event:${eventId}`,
        result: 'ok',
      });
      return { id: invitationId, status: 'CANCELADA' };
    });
  }

  async setImage(eventId: string, actorId: string, buffer: Buffer) {
    await this.assertParticipant(eventId, actorId);
    const saved = this.storage.saveImage(buffer, `evento-${eventId}`);
    const rows = await this.dataSource.query(
      `SELECT image_path FROM events WHERE id = $1`,
      [eventId],
    );
    if (rows.length === 0) {
      this.storage.delete(saved.path);
      throw notFound('evento no encontrado');
    }
    await this.dataSource.query(`UPDATE events SET image_path = $1 WHERE id = $2`, [saved.path, eventId]);
    await audit(this.dataSource.manager, {
      userId: actorId,
      operation: 'event.image',
      resource: `event:${eventId}`,
      result: 'ok',
    });
    if (rows[0].image_path) this.storage.delete(rows[0].image_path);
    return { hasImage: true };
  }

  async readImage(eventId: string, userId: string): Promise<Buffer> {
    await this.assertParticipant(eventId, userId);
    const rows = await this.dataSource.query(
      `SELECT image_path FROM events WHERE id = $1`,
      [eventId],
    );
    if (rows.length === 0 || !rows[0].image_path) throw notFound('el evento no tiene imagen');
    return this.storage.read(rows[0].image_path);
  }

  async searchUsers(queryRaw: string, excludeUserId: string) {
    const q = String(queryRaw ?? '').trim();
    if (!q || q.length > 255) return [];
    const rows = await this.dataSource.query(
      `SELECT username FROM users
       WHERE id <> $2
         AND (starts_with(lower(username), lower($1)) OR starts_with(lower(email), lower($1)))
       ORDER BY username
       LIMIT 10`,
      [q, excludeUserId],
    );
    return rows.map((r: Record<string, unknown>) => ({ username: r.username }));
  }

  async balance(eventId: string, userId: string) {
    await this.assertParticipant(eventId, userId);

    const participants = await this.dataSource.query(
      `SELECT u.id, u.username,
              COALESCE(pr.paid, 0)::int AS paid_cents,
              COALESCE(d1.debt, 0)::int AS debt_cents,
              COALESCE(d2.received, 0)::int AS received_cents,
              COALESCE(p1.pending, 0)::int AS pending_payment_cents
       FROM event_participants ep
       JOIN users u ON u.id = ep.user_id
       LEFT JOIN (
         SELECT payer_id, sum(total_cents) AS paid FROM receipts
         WHERE event_id = $1 AND status = 'CONFIRMADO' GROUP BY payer_id
       ) pr ON pr.payer_id = u.id
       LEFT JOIN (
         SELECT debtor_id, sum(amount_cents - confirmed_cents) AS debt FROM debts
         WHERE event_id = $1 GROUP BY debtor_id
       ) d1 ON d1.debtor_id = u.id
       LEFT JOIN (
         SELECT creditor_id, sum(amount_cents - confirmed_cents) AS received FROM debts
         WHERE event_id = $1 GROUP BY creditor_id
       ) d2 ON d2.creditor_id = u.id
       LEFT JOIN (
         SELECT p.payer_id, sum(p.amount_cents) AS pending
         FROM payments p JOIN debts d ON d.id = p.debt_id
         WHERE d.event_id = $1 AND p.status = 'PENDIENTE' GROUP BY p.payer_id
       ) p1 ON p1.payer_id = u.id
       WHERE ep.event_id = $1
       ORDER BY u.username`,
      [eventId],
    );

    const totals = await this.dataSource.query(
      `SELECT
         COALESCE((SELECT sum(total_cents) FROM receipts WHERE event_id = $1 AND status = 'CONFIRMADO'), 0)::int AS spent_cents,
         COALESCE((SELECT sum(p.amount_cents) FROM payments p JOIN debts d ON d.id = p.debt_id
                   WHERE d.event_id = $1 AND p.status = 'CONFIRMADO'), 0)::int AS settled_cents,
         COALESCE((SELECT sum(p.amount_cents) FROM payments p JOIN debts d ON d.id = p.debt_id
                   WHERE d.event_id = $1 AND p.status = 'PENDIENTE'), 0)::int AS under_review_cents,
         COALESCE((SELECT sum(amount_cents - confirmed_cents) FROM debts WHERE event_id = $1), 0)::int AS outstanding_cents`,
      [eventId],
    );

    const mappedParticipants = participants.map((r: Record<string, unknown>) => ({
      userId: r.id,
      username: r.username,
      paidCents: Number(r.paid_cents),
      debtCents: Number(r.debt_cents),
      receivedCents: Number(r.received_cents),
      netCents: Number(r.received_cents) - Number(r.debt_cents),
      underReviewCents: Number(r.pending_payment_cents),
    }));

    // El monto neto pendiente para saldar el evento es la suma de los saldos netos positivos
    // (el dinero real que debe transferirse entre participantes para que todos queden en cero).
    const netOutstandingCents = mappedParticipants.reduce((acc: number, p: { netCents: number }) => {
      return p.netCents > 0 ? acc + p.netCents : acc;
    }, 0);

    return {
      participants: mappedParticipants,
      totals: {
        spentCents: Number(totals[0].spent_cents),
        settledCents: Number(totals[0].settled_cents),
        underReviewCents: Number(totals[0].under_review_cents),
        outstandingCents: netOutstandingCents,
        grossOutstandingCents: Number(totals[0].outstanding_cents),
      },
    };
  }

  async compensateCrossDebts(eventId: string, actorId: string) {
    await this.assertParticipant(eventId, actorId);

    return withTx(this.dataSource, async (em) => {
      const rawDebts = await em.query(
        `SELECT id, debtor_id, creditor_id, amount_cents, confirmed_cents, reserved_cents
         FROM debts
         WHERE event_id = $1 AND (amount_cents - confirmed_cents - reserved_cents) > 0
         ORDER BY created_at ASC
         FOR UPDATE`,
        [eventId],
      );

      type DebtRow = {
        id: string;
        debtor_id: string;
        creditor_id: string;
        amount_cents: number;
        confirmed_cents: number;
        reserved_cents: number;
        available: number;
      };

      const debtList: DebtRow[] = rawDebts.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        debtor_id: r.debtor_id as string,
        creditor_id: r.creditor_id as string,
        amount_cents: Number(r.amount_cents),
        confirmed_cents: Number(r.confirmed_cents),
        reserved_cents: Number(r.reserved_cents),
        available: Number(r.amount_cents) - Number(r.confirmed_cents) - Number(r.reserved_cents),
      }));

      const userIds = [...new Set(debtList.flatMap((d) => [d.debtor_id, d.creditor_id]))];
      let totalCompensated = 0;
      let compensationsCount = 0;

      for (let i = 0; i < userIds.length; i++) {
        for (let j = i + 1; j < userIds.length; j++) {
          const uA = userIds[i];
          const uB = userIds[j];

          const debtsAtoB = debtList.filter((d) => d.debtor_id === uA && d.creditor_id === uB && d.available > 0);
          const debtsBtoA = debtList.filter((d) => d.debtor_id === uB && d.creditor_id === uA && d.available > 0);

          const sumAtoB = debtsAtoB.reduce((acc, d) => acc + d.available, 0);
          const sumBtoA = debtsBtoA.reduce((acc, d) => acc + d.available, 0);

          const maxComp = Math.min(sumAtoB, sumBtoA);
          if (maxComp <= 0) continue;

          let remA = maxComp;
          for (const d of debtsAtoB) {
            if (remA <= 0) break;
            const take = Math.min(d.available, remA);
            d.available -= take;
            d.confirmed_cents += take;
            remA -= take;

            await em.query(
              `UPDATE debts SET confirmed_cents = confirmed_cents + $2 WHERE id = $1`,
              [d.id, take],
            );
            await em.query(
              `INSERT INTO payments (debt_id, payer_id, amount_cents, method, reference, status, idempotency_key, created_at, resolved_at)
               VALUES ($1, $2, $3, 'OTRO', 'COMPENSACION', 'CONFIRMADO', $4, now(), now())`,
              [d.id, d.debtor_id, take, `comp-${d.id.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`],
            );
          }

          let remB = maxComp;
          for (const d of debtsBtoA) {
            if (remB <= 0) break;
            const take = Math.min(d.available, remB);
            d.available -= take;
            d.confirmed_cents += take;
            remB -= take;

            await em.query(
              `UPDATE debts SET confirmed_cents = confirmed_cents + $2 WHERE id = $1`,
              [d.id, take],
            );
            await em.query(
              `INSERT INTO payments (debt_id, payer_id, amount_cents, method, reference, status, idempotency_key, created_at, resolved_at)
               VALUES ($1, $2, $3, 'OTRO', 'COMPENSACION', 'CONFIRMADO', $4, now(), now())`,
              [d.id, d.debtor_id, take, `comp-${d.id.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`],
            );
          }

          totalCompensated += maxComp;
          compensationsCount++;
        }
      }

      if (totalCompensated > 0) {
        await audit(em, {
          userId: actorId,
          operation: 'event.debts.compensate',
          resource: `event:${eventId}`,
          result: 'ok',
        });
      }

      return {
        eventId,
        compensatedCents: totalCompensated,
        pairsCompensated: compensationsCount,
      };
    });
  }
}
