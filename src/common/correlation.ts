import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

type Ctx = { correlationId: string };

const als = new AsyncLocalStorage<Ctx>();

export function runWithCorrelation<T>(correlationId: string, fn: () => T): T {
  return als.run({ correlationId }, fn);
}

export function correlationId(): string {
  return als.getStore()?.correlationId ?? 'no-correlation';
}

type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, msg: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    correlationId: correlationId(),
    ...data,
  });
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
