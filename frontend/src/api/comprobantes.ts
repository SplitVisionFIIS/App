import { apiFetch, enviar, obtener, subir } from './client';
import type {
  ComprobanteManual,
  ComprobanteResumen,
  EdicionComprobante,
  Receipt,
  ReceiptStatus,
} from './tipos';

export function subirComprobante(eventoId: string, archivo: File): Promise<{ id: string; status: ReceiptStatus; existing?: boolean }> {
  const form = new FormData();
  form.append('image', archivo);
  return subir<{ id: string; status: ReceiptStatus; existing?: boolean }>(`/api/events/${eventoId}/receipts`, form);
}

export type { ComprobanteManual } from './tipos';

export function crearComprobanteManual(eventoId: string, body: ComprobanteManual): Promise<Receipt> {
  return enviar<Receipt>(`/api/events/${eventoId}/receipts/manual`, body);
}

export function listarComprobantes(eventoId: string): Promise<ComprobanteResumen[]> {
  return obtener<ComprobanteResumen[]>(`/api/events/${eventoId}/receipts`);
}

export function obtenerComprobante(id: string): Promise<Receipt> {
  return obtener<Receipt>(`/api/receipts/${id}`);
}

/** El backend espera montos en soles (`total`, `tax`, `tip`, `discount`) e `items[].unitPrice`. */
export function editarComprobante(id: string, patch: EdicionComprobante): Promise<Receipt> {
  return apiFetch<Receipt>(`/api/receipts/${id}`, { method: 'PATCH', body: patch });
}

export function reintentarComprobante(id: string): Promise<{ id: string; status: ReceiptStatus }> {
  return enviar<{ id: string; status: ReceiptStatus }>(`/api/receipts/${id}/retry`, {});
}

export function eliminarComprobante(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/receipts/${id}`, { method: 'DELETE' });
}

export function urlImagenComprobante(id: string): string {
  return `/api/receipts/${id}/image`;
}