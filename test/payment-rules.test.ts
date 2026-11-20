import { validatePaymentByRules, PAYMENT_RULES_TABLE } from '../src/modules/pagos/payment-rules';

describe('Semana 9 · Construcción Dirigida por Tablas (Table-Driven Design)', () => {
  test('Búsqueda directa en O(1) en PAYMENT_RULES_TABLE para todos los métodos soportados', () => {
    expect(PAYMENT_RULES_TABLE['EFECTIVO'].requiresEvidence).toBe(false);
    expect(PAYMENT_RULES_TABLE['YAPE'].requiresEvidence).toBe(true);
    expect(PAYMENT_RULES_TABLE['PLIN'].requiresEvidence).toBe(true);
    expect(PAYMENT_RULES_TABLE['TRANSFERENCIA'].requiresEvidence).toBe(true);
  });

  test('Efectivo no exige evidencia, pero Yape sí', () => {
    // Efectivo sin evidencia pasa
    const ruleEfectivo = validatePaymentByRules('EFECTIVO', 5000, null, false, true);
    expect(ruleEfectivo.method).toBe('EFECTIVO');

    // Yape sin evidencia arroja error de validación
    expect(() => {
      validatePaymentByRules('YAPE', 5000, null, false, true);
    }).toThrow(/evidencia: es obligatoria/);

    // Yape con evidencia pasa
    const ruleYape = validatePaymentByRules('YAPE', 5000, 'ABC1234', true, true);
    expect(ruleYape.method).toBe('YAPE');
  });

  test('Valida límites máximos definidos en la matriz de reglas', () => {
    // PLIN límite 1,500 soles (150,000 centavos)
    expect(() => {
      validatePaymentByRules('PLIN', 200000, 'REF1', true, true);
    }).toThrow(/excede el límite máximo/);
  });

  test('Kill switch desactiva un método en caliente sin recompilar', () => {
    // Si isMethodActive es false (kill switch disparado)
    expect(() => {
      validatePaymentByRules('PLIN', 5000, 'REF1', true, false);
    }).toThrow(/temporalmente deshabilitado/);
  });
});
