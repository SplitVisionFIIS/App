import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

/**
 * Mapped Diagnostic Context (MDC)
 * Funciona como un pasaporte de datos que viaja adherido al hilo de ejecución asíncrono.
 * Inyecta metadatos automáticamente en cada log estructurado sin contaminar las firmas de los métodos.
 * (Semana 10 - Diapositiva 3)
 */
export interface MdcContext {
  traceId: string;
  spanId?: string;
  userId?: string;
  userRole?: string;
  tenantId?: string;
  ipAddress?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

const als = new AsyncLocalStorage<MdcContext>();

export function runWithMdc<T>(context: Partial<MdcContext>, fn: () => T): T {
  const current = als.getStore() ?? { traceId: randomUUID() };
  const merged: MdcContext = {
    ...current,
    ...context,
    traceId: context.traceId ?? current.traceId ?? randomUUID(),
    metadata: {
      ...(current.metadata ?? {}),
      ...(context.metadata ?? {}),
    },
  };
  return als.run(merged, fn);
}

export function setMdcAttribute(key: string, value: unknown): void {
  const store = als.getStore();
  if (!store) return;
  if (!store.metadata) store.metadata = {};
  store.metadata[key] = value;
}

export function setMdcUser(userId: string): void {
  const store = als.getStore();
  if (store) {
    store.userId = userId;
  }
}

export function getMdc(): MdcContext {
  return als.getStore() ?? { traceId: 'no-trace' };
}

// Compatibilidad hacia atrás
export function runWithCorrelation<T>(correlationId: string, fn: () => T): T {
  return runWithMdc({ traceId: correlationId }, fn);
}

export function correlationId(): string {
  return als.getStore()?.traceId ?? 'no-correlation';
}

type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, msg: string, data?: Record<string, unknown>): void {
  const mdc = getMdc();
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    event: msg,
    trace_id: mdc.traceId,
  };

  if (mdc.spanId) payload.span_id = mdc.spanId;
  if (mdc.userId) payload.user_id = mdc.userId;
  if (mdc.tenantId) payload.tenant = mdc.tenantId;
  if (mdc.ipAddress) payload.ip_address = mdc.ipAddress;
  if (mdc.operation) payload.operation = mdc.operation;
  if (mdc.metadata && Object.keys(mdc.metadata).length > 0) {
    payload.context = mdc.metadata;
  }

  // Compatibilidad hacia atrás con correlationId
  payload.correlationId = mdc.traceId;

  if (data) {
    Object.assign(payload, data);
  }

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
};

export function newCorrelationId(): string {
  return randomUUID();
}
