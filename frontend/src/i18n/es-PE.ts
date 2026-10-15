import type { ApiError } from '../api/client';

export const APP = {
  nombre: 'SplitVision',
};

const POR_CODIGO: Record<string, string> = {
  VALIDATION: 'Revisa los datos ingresados.',
  UNAUTHORIZED: 'Tu sesión expiró o no tienes permiso para esta acción.',
  NOT_FOUND: 'No encontramos lo que buscas.',
  CONFLICT: 'La operación entra en conflicto con el estado actual.',
  EXTERNAL: 'Un servicio externo no está disponible. Inténtalo de nuevo.',
  INTERNAL: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
  NETWORK: 'No se pudo conectar con el servidor. Revisa tu conexión.',
};

export function mensajeDeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { status?: number; code?: string; message?: string };
    if (typeof e.status === 'number' && e.status > 0 && e.message) return e.message;
    if (e.code && POR_CODIGO[e.code]) return POR_CODIGO[e.code];
    if (e.message) return e.message;
  }
  return 'Ocurrió un error inesperado.';
}

export function esErrorApi(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError';
}
