import { validation } from './errors';

/**
 * Representa montos como enteros en centavos (ADR-15). Nunca se usan
 * punto flotante para cálculos monetarios.
 */
export function toCents(value: unknown, field = 'monto'): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw validation(`${field}: debe ser un número con hasta 2 decimales`);
  }
  const raw = String(value).trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(raw)) {
    throw validation(`${field}: debe ser un número positivo con hasta 2 decimales`);
  }
  const [intPart, decPart = ''] = raw.split('.');
  const cents = Number(intPart) * 100 + Number((decPart + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents)) {
    throw validation(`${field}: valor fuera de rango`);
  }
  return cents;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function parseOptionalCents(value: unknown, field: string): number {
  if (value === undefined || value === null || value === '') return 0;
  return toCents(value, field);
}
