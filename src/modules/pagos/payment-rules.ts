import { PaymentMethod } from '../../db/entities';
import { validation } from '../../common/errors';

/**
 * Construcción Dirigida por Tablas (Table-Driven Design)
 * Reemplaza la lógica imperativa de control (if/else en cascada) con búsquedas de datos directas en O(1).
 * (Semana 9 - Diapositiva 6)
 */
export interface PaymentMethodRule {
  method: PaymentMethod;
  name: string;
  requiresEvidence: boolean;
  maxAmountCents: number;
  referencePattern: RegExp | null;
  referenceRequired: boolean;
  instructions: string;
  defaultEnabled: boolean;
}

export const PAYMENT_RULES_TABLE: Record<PaymentMethod, PaymentMethodRule> = {
  EFECTIVO: {
    method: 'EFECTIVO',
    name: 'Efectivo',
    requiresEvidence: false,
    maxAmountCents: 100000_00, // S/ 100,000.00
    referencePattern: null,
    referenceRequired: false,
    instructions: 'Entrega física directa al acreedor.',
    defaultEnabled: true,
  },
  YAPE: {
    method: 'YAPE',
    name: 'Yape',
    requiresEvidence: true,
    maxAmountCents: 2000_00, // S/ 2,000.00 por transferencia estándar
    referencePattern: /^[A-Za-z0-9]{1,50}$/,
    referenceRequired: false,
    instructions: 'Transfiere al número Yape del acreedor y adjunta captura del comprobante.',
    defaultEnabled: true,
  },
  PLIN: {
    method: 'PLIN',
    name: 'Plin',
    requiresEvidence: true,
    maxAmountCents: 1500_00, // S/ 1,500.00 por transferencia estándar
    referencePattern: /^[A-Za-z0-9]{1,50}$/,
    referenceRequired: false,
    instructions: 'Transfiere al número Plin del acreedor y adjunta captura del comprobante.',
    defaultEnabled: true,
  },
  TRANSFERENCIA: {
    method: 'TRANSFERENCIA',
    name: 'Transferencia Bancaria',
    requiresEvidence: true,
    maxAmountCents: 1000000_00, // S/ 1,000,000.00
    referencePattern: /^[A-Za-z0-9]{1,50}$/,
    referenceRequired: false,
    instructions: 'Transfiere a la cuenta/CCI del acreedor y adjunta voucher.',
    defaultEnabled: true,
  },
  OTRO: {
    method: 'OTRO',
    name: 'Otro Medio',
    requiresEvidence: true,
    maxAmountCents: 50000_00, // S/ 50,000.00
    referencePattern: /^[A-Za-z0-9]{1,50}$/,
    referenceRequired: false,
    instructions: 'Adjunta comprobante del acuerdo.',
    defaultEnabled: true,
  },
};

/**
 * Validador dirigido por tablas en O(1)
 */
export function validatePaymentByRules(
  methodRaw: string,
  amountCents: number,
  reference?: string | null,
  hasEvidence = false,
  isMethodActive = true,
): PaymentMethodRule {
  const method = String(methodRaw ?? '').trim().toUpperCase() as PaymentMethod;
  const rule = PAYMENT_RULES_TABLE[method];

  if (!rule) {
    const validMethods = Object.keys(PAYMENT_RULES_TABLE).join(', ');
    throw validation(`método: no válido. Debe ser uno de [${validMethods}]`);
  }

  if (!isMethodActive) {
    throw validation(`método [${rule.name}] temporalmente deshabilitado por política operativa.`);
  }

  if (amountCents <= 0) {
    throw validation('monto: debe ser mayor a 0');
  }

  if (amountCents > rule.maxAmountCents) {
    throw validation(
      `monto: excede el límite máximo permitido para ${rule.name} (S/ ${(rule.maxAmountCents / 100).toFixed(2)})`,
    );
  }

  if (rule.requiresEvidence && !hasEvidence) {
    throw validation(`evidencia: es obligatoria para el método ${rule.name}`);
  }

  if (reference) {
    const trimmed = reference.trim();
    if (rule.referencePattern && !rule.referencePattern.test(trimmed)) {
      throw validation('referencia: hasta 50 caracteres alfanuméricos');
    }
  } else if (rule.referenceRequired) {
    throw validation(`referencia: es obligatoria para ${rule.name}`);
  }

  return rule;
}
