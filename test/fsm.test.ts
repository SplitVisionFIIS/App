import { RECEIPT_FSM, PAYMENT_FSM, INVITATION_FSM, StateMachine } from '../src/common/fsm';

describe('Semana 9 · Máquinas de Estado Finito (FSM) como Mecanismo de Control', () => {
  describe('FSM del Comprobante (RECEIPT_FSM)', () => {
    test('Permite transiciones legales según la topología matemática', () => {
      expect(RECEIPT_FSM.canTransition('CARGADO', 'PROCESANDO')).toBe(true);
      expect(RECEIPT_FSM.canTransition('PROCESANDO', 'EXTRAÍDO')).toBe(true);
      expect(RECEIPT_FSM.canTransition('PROCESANDO', 'FALLIDO')).toBe(true);
      expect(RECEIPT_FSM.canTransition('EXTRAÍDO', 'CONFIRMADO')).toBe(true);
      expect(RECEIPT_FSM.canTransition('FALLIDO', 'PROCESANDO')).toBe(true); // Reintento
      expect(RECEIPT_FSM.canTransition('FALLIDO', 'EXTRAÍDO')).toBe(true); // Carga manual
    });

    test('Rechaza con error 409 Conflict saltos ilegales (ej. CARGADO directo a CONFIRMADO)', () => {
      // Intentar confirmar sin que el OCR haya extraído los datos
      expect(RECEIPT_FSM.canTransition('CARGADO', 'CONFIRMADO')).toBe(false);
      expect(() => {
        RECEIPT_FSM.assertTransition('CARGADO', 'CONFIRMADO', 'recibo-123');
      }).toThrow(/Transición de estado ilegal/);
    });

    test('El estado CONFIRMADO es terminal e inmutable', () => {
      expect(RECEIPT_FSM.allowedTransitions('CONFIRMADO')).toEqual([]);
      expect(RECEIPT_FSM.canTransition('CONFIRMADO', 'EXTRAÍDO')).toBe(false);
      expect(RECEIPT_FSM.canTransition('CONFIRMADO', 'PROCESANDO')).toBe(false);
    });
  });

  describe('FSM del Pago (PAYMENT_FSM)', () => {
    test('Permite transicionar de PENDIENTE a CONFIRMADO, RECHAZADO o CANCELADO', () => {
      expect(PAYMENT_FSM.canTransition('PENDIENTE', 'CONFIRMADO')).toBe(true);
      expect(PAYMENT_FSM.canTransition('PENDIENTE', 'RECHAZADO')).toBe(true);
      expect(PAYMENT_FSM.canTransition('PENDIENTE', 'CANCELADO')).toBe(true);
    });

    test('Un pago CONFIRMADO no admite cambios posteriores', () => {
      expect(PAYMENT_FSM.canTransition('CONFIRMADO', 'RECHAZADO')).toBe(false);
      expect(PAYMENT_FSM.canTransition('CONFIRMADO', 'PENDIENTE')).toBe(false);
      expect(() => {
        PAYMENT_FSM.assertTransition('CONFIRMADO', 'RECHAZADO', 'pago-456');
      }).toThrow(/Transición de estado ilegal/);
    });
  });
});
