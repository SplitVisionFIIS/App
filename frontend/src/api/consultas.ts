import { obtener } from './client';
import type {
  BalanceEvento,
  BandejaPendientes,
  Deuda,
  HistorialDeuda,
  PagoPendiente,
} from './tipos';

export function deudas(
  params: { direction?: 'owing' | 'owed'; eventId?: string; all?: boolean } = {},
): Promise<Deuda[]> {
  const query = new URLSearchParams();
  if (params.direction) query.set('direction', params.direction);
  if (params.eventId) query.set('eventId', params.eventId);
  if (params.all) query.set('all', 'true');
  const qs = query.toString();
  return obtener<Deuda[]>(`/api/debts${qs ? `?${qs}` : ''}`);
}

export function historialDeuda(debtId: string): Promise<HistorialDeuda> {
  return obtener<HistorialDeuda>(`/api/debts/${debtId}`);
}

export function pagosPendientes(): Promise<PagoPendiente[]> {
  return obtener<PagoPendiente[]>('/api/payments/pending');
}

export function bandejaPendientes(): Promise<BandejaPendientes> {
  return obtener<BandejaPendientes>('/api/pending');
}

export function obtenerBalance(eventoId: string): Promise<BalanceEvento> {
  return obtener<BalanceEvento>(`/api/events/${eventoId}/balance`);
}
