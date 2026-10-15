const FORMATO_SOLES = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeZone: 'America/Lima',
});

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
});

export function formatSoles(monto: number): string {
  return FORMATO_SOLES.format(monto);
}

/** Formatea un monto expresado en centavos (como lo entrega el backend). */
export function formatCentavos(centavos: number): string {
  return FORMATO_SOLES.format(centavos / 100);
}

export function formatFecha(fecha: string | Date): string {
  return FORMATO_FECHA.format(typeof fecha === 'string' ? new Date(fecha) : fecha);
}

export function formatFechaHora(fecha: string | Date): string {
  return FORMATO_FECHA_HORA.format(typeof fecha === 'string' ? new Date(fecha) : fecha);
}
