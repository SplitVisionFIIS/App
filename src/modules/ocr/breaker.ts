import CircuitBreaker from 'opossum';
import { logger } from '../../common/correlation';
import { OcrClient } from './ocr.client';

export interface OcrBreakerOptions {
  timeoutMs: number;
  threshold: number;
  resetMs: number;
  /** Si es true, ante fallo/timeout/circuito abierto se recurre al OCR local. */
  fallbackLocal: boolean;
}

/**
 * Envuelve el OCR externo en un circuit breaker (opossum). Cuando el proveedor
 * externo falla o el circuito está abierto, `fallback` ejecuta el OCR local;
 * opossum reintenta el externo (half-open) tras `resetMs` (recuperación).
 */
export function crearOcrBreaker(
  externo: OcrClient,
  local: OcrClient,
  opts: OcrBreakerOptions,
): CircuitBreaker {
  const breaker = new CircuitBreaker((imagePath: string) => externo.extract(imagePath), {
    timeout: opts.timeoutMs,
    errorThresholdPercentage: opts.threshold,
    resetTimeout: opts.resetMs,
    volumeThreshold: 2,
    name: 'ocr',
  });

  if (opts.fallbackLocal) {
    breaker.fallback((imagePath: string) => local.extract(imagePath));
    breaker.on('fallback', () => logger.warn('OCR externo no disponible; usando fallback local'));
  }
  breaker.on('open', () => logger.warn('circuit breaker del OCR abierto'));
  breaker.on('halfOpen', () => logger.info('circuit breaker del OCR semiabierto'));
  breaker.on('close', () => logger.info('circuit breaker del OCR cerrado'));
  return breaker;
}
