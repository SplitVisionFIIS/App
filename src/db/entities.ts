import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReceiptStatus = 'CARGADO' | 'PROCESANDO' | 'EXTRAÍDO' | 'CONFIRMADO' | 'FALLIDO';
export type PaymentStatus = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO';
export type PaymentMethod = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'OTRO';
export type SplitMode = 'EQUITATIVE' | 'BY_ITEM';
export type JobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 20 }) username: string;
  @Column({ type: 'varchar', length: 255 }) email: string;
  @Column({ name: 'password_hash', type: 'text' }) passwordHash: string;
  @Column({ name: 'image_path', type: 'text', nullable: true }) imagePath: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ type: 'text' }) csrf: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'last_seen_at', type: 'timestamptz' }) lastSeenAt: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
}

@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryGeneratedColumn('increment') id: number;
  @Column({ type: 'text' }) identifier: string;
  @Column({ name: 'attempted_at', type: 'timestamptz' }) attemptedAt: Date;
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 60 }) name: string;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy: string;
  @Column({ name: 'image_path', type: 'text', nullable: true }) imagePath: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('event_participants')
export class EventParticipant {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' }) eventId: string;
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ name: 'joined_at', type: 'timestamptz' }) joinedAt: Date;
}

export type InvitationStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

@Entity('event_invitations')
export class EventInvitation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'event_id', type: 'uuid' }) eventId: string;
  @Column({ name: 'invitee_id', type: 'uuid' }) inviteeId: string;
  @Column({ name: 'inviter_id', type: 'uuid' }) inviterId: string;
  @Column({ type: 'varchar', length: 10 }) status: InvitationStatus;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true }) respondedAt: Date | null;
}

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'event_id', type: 'uuid' }) eventId: string;
  @Column({ name: 'payer_id', type: 'uuid' }) payerId: string;
  @Column({ type: 'varchar', length: 20 }) status: ReceiptStatus;
  @Column({ type: 'varchar', length: 200, nullable: true }) description: string | null;
  @Column({ name: 'total_cents', type: 'integer', default: 0 }) totalCents: number;
  @Column({ name: 'tax_cents', type: 'integer', default: 0 }) taxCents: number;
  @Column({ name: 'tip_cents', type: 'integer', default: 0 }) tipCents: number;
  @Column({ name: 'discount_cents', type: 'integer', default: 0 }) discountCents: number;
  @Column({ name: 'image_path', type: 'text', nullable: true }) imagePath: string | null;
  @Column({ name: 'image_hash', type: 'text', nullable: true }) imageHash: string | null;
  @Column({ name: 'fail_reason', type: 'varchar', length: 300, nullable: true }) failReason: string | null;
  @Column({ name: 'split_mode', type: 'varchar', length: 20, nullable: true }) splitMode: SplitMode | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('receipt_items')
export class ReceiptItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'receipt_id', type: 'uuid' }) receiptId: string;
  @Column({ type: 'integer' }) position: number;
  @Column({ type: 'varchar', length: 200 }) description: string;
  @Column({ type: 'integer' }) quantity: number;
  @Column({ name: 'unit_price_cents', type: 'integer' }) unitPriceCents: number;
}

@Entity('receipt_jobs')
export class ReceiptJob {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'receipt_id', type: 'uuid' }) receiptId: string;
  @Column({ type: 'varchar', length: 12 }) status: JobStatus;
  @Column({ type: 'integer', default: 0 }) attempts: number;
  @Column({ name: 'next_attempt_at', type: 'timestamptz' }) nextAttemptAt: Date;
  @Column({ name: 'lease_owner', type: 'text', nullable: true }) leaseOwner: string | null;
  @Column({ name: 'lease_expires_at', type: 'timestamptz', nullable: true }) leaseExpiresAt: Date | null;
  @Column({ name: 'correlation_id', type: 'text' }) correlationId: string;
  @Column({ name: 'last_error', type: 'text', nullable: true }) lastError: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('split_participants')
export class SplitParticipant {
  @PrimaryColumn({ name: 'receipt_id', type: 'uuid' }) receiptId: string;
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId: string;
}

@Entity('item_assignments')
export class ItemAssignment {
  @PrimaryColumn({ name: 'receipt_id', type: 'uuid' }) receiptId: string;
  @PrimaryColumn({ name: 'item_id', type: 'uuid' }) itemId: string;
  @PrimaryColumn({ name: 'unit_index', type: 'integer' }) unitIndex: number;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
}

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'receipt_id', type: 'uuid' }) receiptId: string;
  @Column({ name: 'event_id', type: 'uuid' }) eventId: string;
  @Column({ name: 'debtor_id', type: 'uuid' }) debtorId: string;
  @Column({ name: 'creditor_id', type: 'uuid' }) creditorId: string;
  @Column({ name: 'amount_cents', type: 'integer' }) amountCents: number;
  @Column({ name: 'confirmed_cents', type: 'integer', default: 0 }) confirmedCents: number;
  @Column({ name: 'reserved_cents', type: 'integer', default: 0 }) reservedCents: number;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'debt_id', type: 'uuid' }) debtId: string;
  @Column({ name: 'payer_id', type: 'uuid' }) payerId: string;
  @Column({ name: 'amount_cents', type: 'integer' }) amountCents: number;
  @Column({ type: 'varchar', length: 20 }) method: PaymentMethod;
  @Column({ type: 'varchar', length: 50, nullable: true }) reference: string | null;
  @Column({ name: 'evidence_path', type: 'text', nullable: true }) evidencePath: string | null;
  @Column({ type: 'varchar', length: 12 }) status: PaymentStatus;
  @Column({ name: 'reject_reason', type: 'varchar', length: 200, nullable: true }) rejectReason: string | null;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 120 }) idempotencyKey: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
}
