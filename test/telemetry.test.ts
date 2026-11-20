import { TelemetryService } from '../src/common/telemetry.service';
import { runWithMdc, getMdc } from '../src/common/correlation';

describe('Semana 10 · Observabilidad: MDC y Modelo RED', () => {
  test('MDC: AsyncLocalStorage propaga trace_id, user_id e IP sin tocar parámetros', () => {
    runWithMdc(
      {
        traceId: 'trace-test-uuid',
        userId: 'usr-4412',
        ipAddress: '192.168.1.100',
        operation: 'POST /api/receipts/1/confirm',
      },
      () => {
        const context = getMdc();
        expect(context.traceId).toBe('trace-test-uuid');
        expect(context.userId).toBe('usr-4412');
        expect(context.ipAddress).toBe('192.168.1.100');
        expect(context.operation).toBe('POST /api/receipts/1/confirm');
      },
    );
  });

  test('Modelo RED: TelemetryService calcula Rate, Errors y percentiles de duración', () => {
    const telemetry = new TelemetryService();

    // Simular 100 peticiones con diferentes latencias
    for (let i = 1; i <= 100; i++) {
      const status = i === 50 ? 500 : 200; // 1 error 5xx
      const durationMs = i * 0.1; // 0.1ms a 10ms
      telemetry.recordHttpRequest('POST', '/api/debts/1/payments', status, durationMs);
    }

    const summary = telemetry.getRedSummary();
    expect(summary.rate.totalRequests).toBe(100);
    expect(summary.errors.status5xx).toBe(1);
    expect(summary.errors.errorRatePercent).toBe(1.0); // 1% error
    expect(summary.duration.p50Ms).toBeCloseTo(5.0, 0);
    expect(summary.duration.p95Ms).toBeCloseTo(9.5, 0);
  });

  test('Formato Prometheus (/api/admin/metrics) genera métricas estandarizadas', () => {
    const telemetry = new TelemetryService();
    telemetry.recordHttpRequest('GET', '/api/events', 200, 3.5);

    const prometheusText = telemetry.getPrometheusFormat();
    expect(prometheusText).toContain('# HELP http_requests_total');
    expect(prometheusText).toContain('http_requests_total 1');
    expect(prometheusText).toContain('http_request_duration_ms{quantile="0.5"}');
    expect(prometheusText).toContain('process_resident_memory_bytes');
  });
});
