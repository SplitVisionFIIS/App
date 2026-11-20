import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getMdc, logger, runWithMdc } from './correlation';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, unknown>;
  status: 'OK' | 'ERROR';
  error?: string;
}

export interface RedMetricsSummary {
  timestamp: string;
  uptimeSeconds: number;
  rate: {
    totalRequests: number;
    requestsPerSecond: number;
    requestsByMethod: Record<string, number>;
    requestsByRoute: Record<string, number>;
  };
  errors: {
    totalErrors: number;
    errorRatePercent: number;
    status4xx: number;
    status5xx: number;
    recentErrors: Array<{ timestamp: string; route: string; error: string; traceId: string }>;
  };
  duration: {
    avgMs: number;
    minMs: number;
    maxMs: number;
    p50Ms: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  useSystem: {
    memoryHeapUsedMb: number;
    memoryHeapTotalMb: number;
    memoryRssMb: number;
    activeHandles: number;
    activeRequests: number;
  };
  activeSpans: number;
}

@Injectable()
export class TelemetryService {
  private readonly startTime = Date.now();
  private totalRequests = 0;
  private status4xx = 0;
  private status5xx = 0;
  private readonly latencies: number[] = [];
  private readonly maxLatenciesStored = 1000;
  private readonly requestsByMethod: Record<string, number> = {};
  private readonly requestsByRoute: Record<string, number> = {};
  private readonly recentErrors: Array<{ timestamp: string; route: string; error: string; traceId: string }> = [];
  private readonly recentSpans: Span[] = [];
  private readonly maxSpansStored = 100;

  /**
   * Instrumentación de Spans manuales al estilo OpenTelemetry
   * (Semana 10 - Diapositiva 8)
   */
  async traceSpan<T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: (span: Span) => Promise<T> | T,
  ): Promise<T> {
    const parentMdc = getMdc();
    const span: Span = {
      traceId: parentMdc.traceId ?? randomUUID(),
      spanId: randomUUID().slice(0, 16),
      parentSpanId: parentMdc.spanId,
      name,
      startTime: Date.now(),
      attributes: { ...attributes },
      status: 'OK',
    };

    return runWithMdc({ traceId: span.traceId, spanId: span.spanId, operation: name }, async () => {
      try {
        const result = await fn(span);
        span.endTime = Date.now();
        span.durationMs = span.endTime - span.startTime;
        this.recordSpan(span);
        return result;
      } catch (err: unknown) {
        span.endTime = Date.now();
        span.durationMs = span.endTime - span.startTime;
        span.status = 'ERROR';
        span.error = err instanceof Error ? err.message : String(err);
        this.recordSpan(span);
        logger.error(`Span ${name} falló`, {
          spanId: span.spanId,
          durationMs: span.durationMs,
          error: span.error,
        });
        throw err;
      }
    });
  }

  private recordSpan(span: Span): void {
    this.recentSpans.unshift(span);
    if (this.recentSpans.length > this.maxSpansStored) {
      this.recentSpans.pop();
    }
  }

  getRecentSpans(): Span[] {
    return this.recentSpans;
  }

  /**
   * Registra una petición HTTP para alimentar el modelo RED
   */
  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.totalRequests++;

    const m = method.toUpperCase();
    this.requestsByMethod[m] = (this.requestsByMethod[m] ?? 0) + 1;

    // Normalizar ruta para evitar explosión de cardinalidad (reemplazar UUIDs)
    const normalizedRoute = route.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
    this.requestsByRoute[normalizedRoute] = (this.requestsByRoute[normalizedRoute] ?? 0) + 1;

    if (statusCode >= 400 && statusCode < 500) {
      this.status4xx++;
    } else if (statusCode >= 500) {
      this.status5xx++;
      const mdc = getMdc();
      this.recentErrors.unshift({
        timestamp: new Date().toISOString(),
        route: `${m} ${normalizedRoute}`,
        error: `HTTP ${statusCode}`,
        traceId: mdc.traceId,
      });
      if (this.recentErrors.length > 20) this.recentErrors.pop();
    }

    this.latencies.push(durationMs);
    if (this.latencies.length > this.maxLatenciesStored) {
      this.latencies.shift();
    }
  }

  /**
   * Calcula el resumen del Modelo RED + Modelo USE
   * (Semana 10 - Diapositiva 4)
   */
  getRedSummary(): RedMetricsSummary {
    const uptimeSeconds = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
    const requestsPerSecond = Number((this.totalRequests / uptimeSeconds).toFixed(2));
    const totalErrors = this.status4xx + this.status5xx;
    const errorRatePercent =
      this.totalRequests > 0 ? Number(((totalErrors / this.totalRequests) * 100).toFixed(2)) : 0;

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;
    const avgMs = count > 0 ? Number((sorted.reduce((a, b) => a + b, 0) / count).toFixed(2)) : 0;
    const minMs = count > 0 ? sorted[0] : 0;
    const maxMs = count > 0 ? sorted[count - 1] : 0;
    const p50Ms = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
    const p90Ms = count > 0 ? sorted[Math.floor(count * 0.9)] : 0;
    const p95Ms = count > 0 ? sorted[Math.floor(count * 0.95)] : 0;
    const p99Ms = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;

    const mem = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      rate: {
        totalRequests: this.totalRequests,
        requestsPerSecond,
        requestsByMethod: { ...this.requestsByMethod },
        requestsByRoute: { ...this.requestsByRoute },
      },
      errors: {
        totalErrors,
        errorRatePercent,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        recentErrors: [...this.recentErrors],
      },
      duration: {
        avgMs,
        minMs,
        maxMs,
        p50Ms,
        p90Ms,
        p95Ms,
        p99Ms,
      },
      useSystem: {
        memoryHeapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
        memoryHeapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
        memoryRssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
        activeHandles: (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles?.()?.length ?? 0,
        activeRequests: (process as unknown as { _getActiveRequests?: () => unknown[] })._getActiveRequests?.()?.length ?? 0,
      },
      activeSpans: this.recentSpans.length,
    };
  }

  /**
   * Genera formato de exposición estándar Prometheus
   */
  getPrometheusFormat(): string {
    const summary = this.getRedSummary();
    const lines: string[] = [
      '# HELP http_requests_total Total de peticiones HTTP procesadas (RED: Rate)',
      '# TYPE http_requests_total counter',
      `http_requests_total ${summary.rate.totalRequests}`,
      '',
      '# HELP http_errors_total Total de errores HTTP 4xx y 5xx (RED: Errors)',
      '# TYPE http_errors_total counter',
      `http_errors_total{code="4xx"} ${summary.errors.status4xx}`,
      `http_errors_total{code="5xx"} ${summary.errors.status5xx}`,
      '',
      '# HELP http_request_duration_ms Duracion de peticiones HTTP en ms (RED: Duration)',
      '# TYPE http_request_duration_ms summary',
      `http_request_duration_ms{quantile="0.5"} ${summary.duration.p50Ms}`,
      `http_request_duration_ms{quantile="0.9"} ${summary.duration.p90Ms}`,
      `http_request_duration_ms{quantile="0.95"} ${summary.duration.p95Ms}`,
      `http_request_duration_ms{quantile="0.99"} ${summary.duration.p99Ms}`,
      `http_request_duration_ms_sum ${summary.duration.avgMs * summary.rate.totalRequests}`,
      `http_request_duration_ms_count ${summary.rate.totalRequests}`,
      '',
      '# HELP process_resident_memory_bytes Memoria residente (USE: Utilization)',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${summary.useSystem.memoryRssMb * 1024 * 1024}`,
      '',
      '# HELP process_heap_used_bytes Memoria Heap usada (USE: Utilization)',
      '# TYPE process_heap_used_bytes gauge',
      `process_heap_used_bytes ${summary.useSystem.memoryHeapUsedMb * 1024 * 1024}`,
      '',
      '# HELP process_uptime_seconds Tiempo de actividad del servicio',
      '# TYPE process_uptime_seconds counter',
      `process_uptime_seconds ${summary.uptimeSeconds}`,
    ];

    return lines.join('\n');
  }
}
