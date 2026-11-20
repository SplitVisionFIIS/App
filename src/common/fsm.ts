import { conflict } from './errors';
import { logger } from './correlation';

/**
 * Representa una transición en una Máquina de Estados Finitos (FSM)
 * basada en tablas (Table-Driven State Machine).
 * Garantiza de forma matemática que estados y flujos ilegales sean imposibles.
 */
export interface TransitionRule<TState extends string> {
  from: TState;
  to: TState[];
  description?: string;
}

export class StateMachine<TState extends string> {
  private readonly transitionTable: Map<TState, Set<TState>>;

  constructor(
    public readonly name: string,
    rules: TransitionRule<TState>[],
  ) {
    this.transitionTable = new Map();
    for (const rule of rules) {
      this.transitionTable.set(rule.from, new Set(rule.to));
    }
  }

  /**
   * Valida en O(1) si la transición de currentState a nextState es válida.
   */
  canTransition(current: TState, next: TState): boolean {
    const allowed = this.transitionTable.get(current);
    return allowed ? allowed.has(next) : false;
  }

  /**
   * Obtiene la lista de estados válidos hacia los cuales se puede transicionar.
   */
  allowedTransitions(current: TState): TState[] {
    const allowed = this.transitionTable.get(current);
    return allowed ? Array.from(allowed) : [];
  }

  /**
   * Ejecuta la validación y lanza un error formal de Conflicto si la transición es ilegal.
   */
  assertTransition(current: TState, next: TState, contextId?: string): void {
    if (current === next) return; // Transición nula es idempotente

    if (!this.canTransition(current, next)) {
      const allowed = this.allowedTransitions(current);
      const allowedText = allowed.length > 0 ? allowed.join(', ') : 'ninguno (estado terminal)';
      const msg = `Transición de estado ilegal en ${this.name}${
        contextId ? ` [${contextId}]` : ''
      }: no se permite pasar de [${current}] a [${next}]. Estados válidos desde [${current}]: [${allowedText}].`;

      logger.warn('FSM transición rechazada', {
        fsm: this.name,
        contextId,
        fromState: current,
        toState: next,
        allowed,
      });

      throw conflict(msg);
    }

    logger.debug('FSM transición exitosa', {
      fsm: this.name,
      contextId,
      fromState: current,
      toState: next,
    });
  }
}

// -------------------------------------------------------------
// FSM 1: Ciclo de Vida del Comprobante (Receipt FSM)
// Estados: CARGADO -> PROCESANDO -> EXTRAÍDO -> CONFIRMADO | FALLIDO
// -------------------------------------------------------------
export type ReceiptFsmState = 'CARGADO' | 'PROCESANDO' | 'EXTRAÍDO' | 'CONFIRMADO' | 'FALLIDO';

export const RECEIPT_FSM = new StateMachine<ReceiptFsmState>('Comprobante', [
  { from: 'CARGADO', to: ['PROCESANDO'] },
  { from: 'PROCESANDO', to: ['EXTRAÍDO', 'FALLIDO'] },
  { from: 'EXTRAÍDO', to: ['CONFIRMADO', 'FALLIDO'] },
  { from: 'FALLIDO', to: ['PROCESANDO', 'EXTRAÍDO'] }, // Reintento OCR o Carga manual
  { from: 'CONFIRMADO', to: [] }, // Estado terminal inmutable
]);

// -------------------------------------------------------------
// FSM 2: Ciclo de Vida del Pago (Payment FSM)
// Estados: PENDIENTE -> CONFIRMADO | RECHAZADO | CANCELADO
// -------------------------------------------------------------
export type PaymentFsmState = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO';

export const PAYMENT_FSM = new StateMachine<PaymentFsmState>('Pago', [
  { from: 'PENDIENTE', to: ['CONFIRMADO', 'RECHAZADO', 'CANCELADO'] },
  { from: 'CONFIRMADO', to: [] }, // Terminal: deuda amortizada
  { from: 'RECHAZADO', to: [] },  // Terminal: saldo liberado
  { from: 'CANCELADO', to: [] },  // Terminal: cancelado por el deudor
]);

// -------------------------------------------------------------
// FSM 3: Invitación a Evento (Invitation FSM)
// -------------------------------------------------------------
export type InvitationFsmState = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export const INVITATION_FSM = new StateMachine<InvitationFsmState>('Invitacion', [
  { from: 'PENDIENTE', to: ['ACEPTADA', 'RECHAZADA'] },
  { from: 'ACEPTADA', to: [] },
  { from: 'RECHAZADA', to: ['PENDIENTE'] }, // Reenvío de invitación
]);
