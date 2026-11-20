import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { runMigrations } from './db/migrate';
import { logger, newCorrelationId, runWithMdc } from './common/correlation';
import { TelemetryService } from './common/telemetry.service';

async function bootstrap(): Promise<void> {
  await runMigrations();
  const app = await NestFactory.create(AppModule);

  const telemetry = app.get(TelemetryService);

  app.use((req: any, res: any, next: () => void) => {
    const start = Date.now();
    const incoming = req.headers['x-correlation-id'] || req.headers['traceparent'];
    const traceId = typeof incoming === 'string' && incoming ? incoming : newCorrelationId();
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const path = req.baseUrl || req.path || req.url || '/';

    res.on('finish', () => {
      const duration = Date.now() - start;
      telemetry.recordHttpRequest(req.method, path, res.statusCode, duration);
    });

    runWithMdc(
      {
        traceId,
        ipAddress,
        operation: `${req.method} ${path}`,
      },
      () => next(),
    );
  });

  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.info('API escuchando con observabilidad activa (MDC + Telemetría RED)', { port });
}

bootstrap().catch((e) => {
  logger.error('no se pudo iniciar la API', { error: String(e?.stack ?? e) });
  process.exit(1);
});
