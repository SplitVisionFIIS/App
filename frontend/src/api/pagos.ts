import { apiFetch, enviar } from './client';
import type { OpcionesApi } from './client';
import type { Pago, PaymentMethod } from './tipos';

export function crearPago(
  debtId: string,
  body: { amount: string; method: PaymentMethod; reference?: string },
  idempotencyKey?: string,
  archivo?: File,
): Promise<Pago> {
  const opts: OpcionesApi = { method: 'POST' };
  if (idempotencyKey) opts.headers = { 'idempotency-key': idempotencyKey };

  if (archivo) {
    const form = new FormData();
    form.append('amount', body.amount);
    form.append('method', body.method);
    if (body.reference) form.append('reference', body.reference);
    form.append('evidence', archivo);
    opts.body = form;
  } else {
    opts.body = body;
  }

  return apiFetch<Pago>(`/api/debts/${debtId}/payments`, opts);
}

export function cancelarPago(paymentId: string): Promise<Pago> {
  return enviar<Pago>(`/api/payments/${paymentId}/cancel`, {});
}

export function confirmarPago(paymentId: string): Promise<Pago> {
  return enviar<Pago>(`/api/payments/${paymentId}/confirm`, {});
}

export function rechazarPago(paymentId: string, body: { reason: string }): Promise<Pago> {
  return enviar<Pago>(`/api/payments/${paymentId}/reject`, body);
}

export function urlEvidenciaPago(paymentId: string): string {
  return `/api/payments/${paymentId}/evidence`;
}
