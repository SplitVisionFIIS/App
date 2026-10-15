export type ReceiptStatus = 'PROCESANDO' | 'EXTRAÍDO' | 'CONFIRMADO' | 'FALLIDO';
export type PaymentStatus = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO';
export type PaymentMethod = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'OTRO';
export type SplitMode = 'EQUITATIVE' | 'BY_ITEM';

// ---------- Sesión / identidad ----------

export type SesionActual = {
  username: string;
  hasImage?: boolean;
  imageUrl?: string;
};
export type ResultadoAuth = { username: string; csrf?: string };

// ---------- Eventos ----------

export type Evento = {
  id: string;
  name: string;
  createdAt: string;
  participants: number;
  netCents: number;
  hasImage?: boolean;
};

export type Participante = { id: string; username: string };

export type Invitacion = { id: string; username: string; status: string; createdAt: string };

export type InvitacionPendiente = {
  invitationId: string;
  eventId: string;
  eventName: string;
  inviter: string;
  createdAt: string;
};

export type DetalleEvento = {
  id: string;
  name: string;
  created_at: string;
  has_image: boolean;
  created_by_name: string;
  participants: Participante[];
  invitations: Invitacion[];
  createdAt: string;
  hasImage: boolean;
};

// ---------- Comprobantes ----------

export type ReceiptItem = {
  id: string;
  position: number;
  description: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
};

/** Entrada de ítem para crear/editar: `unitPrice` en soles. */
export type ItemEntrada = {
  description: string;
  quantity: number;
  unitPrice: string | number;
};

export type Assignment = { itemId: string; unitIndex: number; userId: string };

export type ReciboDeuda = {
  id: string;
  debtor: string;
  amountCents: number;
  confirmedCents: number;
  reservedCents: number;
};

export type Receipt = {
  id: string;
  eventId: string;
  status: ReceiptStatus;
  description: string | null;
  totalCents: number;
  taxCents: number;
  tipCents: number;
  discountCents: number;
  failReason: string | null;
  splitMode: SplitMode | null;
  hasImage: boolean;
  payer: { id: string; username: string } | null;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
  items: ReceiptItem[];
  split: { participants: string[]; assignments: Assignment[] };
  debts: ReciboDeuda[];
};

/** Fila del listado de comprobantes de un evento. */
export type ComprobanteResumen = {
  id: string;
  status: ReceiptStatus;
  totalCents: number;
  description: string | null;
  createdAt: string;
  failReason: string | null;
  payer: string;
  mine: boolean;
};

export type ComprobanteManual = {
  description?: string;
  total: string | number;
  tax?: string | number;
  tip?: string | number;
  discount?: string | number;
  items?: ItemEntrada[];
  receiptId?: string;
};

export type EdicionComprobante = {
  description?: string;
  total?: string | number;
  tax?: string | number;
  tip?: string | number;
  discount?: string | number;
  items?: ItemEntrada[];
};

// ---------- Reparto ----------

export type ResultadoGuardarReparto =
  | { receiptId: string; splitMode: 'EQUITATIVE'; participants: string[] }
  | { receiptId: string; splitMode: 'BY_ITEM'; assignments: Assignment[] };

export type ParteReparto = { userId: string; cents: number };
export type ResumenDeuda = { debtor: string; amountCents: number };

export type ResultadoConfirmarReparto = {
  receiptId: string;
  status: 'CONFIRMADO';
  totalCents: number;
  parts: ParteReparto[];
  debts: ResumenDeuda[];
  generated: number;
};

// ---------- Pagos ----------

export type SaldoDeuda = {
  amountCents: number;
  confirmedCents: number;
  reservedCents: number;
  availableCents: number;
};

export type Pago = {
  id: string;
  debtId: string;
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  rejectReason: string | null;
  createdAt: string;
  /** true si el backend lo devolvió por idempotencia (no se creó uno nuevo). */
  existing?: boolean;
  availableCents?: number;
  debt?: SaldoDeuda;
};

export type PagoPendiente = {
  id: string;
  debtId: string;
  debtor: string;
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
  eventId: string;
  eventName: string;
  receiptId: string;
  receiptDescription: string | null;
};

export type PagoHistorial = {
  id: string;
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  rejectReason: string | null;
  payer: string;
  createdAt: string;
  resolvedAt: string | null;
  hasEvidence: boolean;
};

// ---------- Deudas ----------

/** Fila de "debo" o "me deben". Los campos opcionales varían según `direction`. */
export type Deuda = {
  debtId: string;
  eventId: string;
  eventName: string;
  receiptId?: string;
  receiptDescription: string | null;
  creditor?: string;
  debtor?: string;
  amountCents: number;
  pendingCents: number;
  availableCents?: number;
  reservedCents?: number;
};

export type HistorialDeuda = {
  debtId: string;
  eventId: string;
  eventName: string;
  receiptId: string;
  receiptDescription: string | null;
  creditor: string;
  debtor: string;
  amountCents: number;
  confirmedCents: number;
  reservedCents: number;
  pendingCents: number;
  availableCents: number;
  settled: boolean;
  payments: PagoHistorial[];
};

// ---------- Bandeja de pendientes ----------

export type PendienteConfirmarPago = {
  type: 'PAYMENT_TO_CONFIRM';
  paymentId: string;
  debtId: string;
  eventId: string;
  eventName: string;
  counterparty: string;
  amountCents: number;
  method: PaymentMethod;
  createdAt: string;
};

export type PendientePagoRechazado = {
  type: 'PAYMENT_REJECTED';
  paymentId: string;
  debtId: string;
  eventId: string;
  eventName: string;
  counterparty: string;
  amountCents: number;
  reason: string | null;
  createdAt: string;
};

export type PendienteComprobante = {
  type: 'RECEIPT_TO_REVIEW';
  receiptId: string;
  status: ReceiptStatus;
  eventId: string;
  eventName: string;
  failReason: string | null;
  createdAt: string;
};

export type Pendiente = PendienteConfirmarPago | PendientePagoRechazado | PendienteComprobante;

export type BandejaPendientes = { count: number; items: Pendiente[] };

// ---------- Balance ----------

export type BalanceParticipante = {
  userId: string;
  username: string;
  paidCents: number;
  debtCents: number;
  receivedCents: number;
  netCents: number;
  underReviewCents: number;
};

export type BalanceTotales = {
  spentCents: number;
  settledCents: number;
  underReviewCents: number;
  outstandingCents: number;
};

export type BalanceEvento = {
  participants: BalanceParticipante[];
  totals: BalanceTotales;
};
