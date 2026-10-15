import { enviar } from './client';
import type {
  Assignment,
  ResultadoConfirmarReparto,
  ResultadoGuardarReparto,
  SplitMode,
} from './tipos';

export function guardarReparto(
  receiptId: string,
  body: { mode: SplitMode; participants?: string[]; assignments?: Assignment[] },
): Promise<ResultadoGuardarReparto> {
  return enviar<ResultadoGuardarReparto>(`/api/receipts/${receiptId}/split`, body);
}

export function confirmarReparto(receiptId: string): Promise<ResultadoConfirmarReparto> {
  return enviar<ResultadoConfirmarReparto>(`/api/receipts/${receiptId}/confirm`, {});
}
