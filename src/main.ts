import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { runMigrations } from './db/migrate';
import { logger, newCorrelationId, runWithCorrelation } from './common/correlation';

async function bootstrap(): Promise<void> {
  await runMigrations();
  const app = await NestFactory.create(AppModule);
  app.use((req: { headers: Record<string, unknown> }, _res: unknown, next: () => void) => {
    const incoming = req.headers['x-correlation-id'];
    const id = typeof incoming === 'string' && incoming ? incoming : newCorrelationId();
    runWithCorrelation(id, () => next());
  });
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.info('API escuchando', { port });
}

bootstrap().catch((e) => {
  logger.error('no se pudo iniciar la API', { error: String(e?.stack ?? e) });
  process.exit(1);
});
