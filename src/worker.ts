import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { runMigrations } from './db/migrate';
import { JobsProcessor } from './modules/ocr/ocr.worker';
import { logger } from './common/correlation';

async function bootstrap(): Promise<void> {
  await runMigrations();
  const app = await NestFactory.createApplicationContext(AppModule);
  const processor = app.get(JobsProcessor);
  processor.start();

  const shutdown = async () => {
    logger.info('deteniendo worker');
    processor.stop();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  logger.info('worker OCR arrancado', { provider: process.env.OCR_PROVIDER ?? 'fake' });
}

bootstrap().catch((e) => {
  logger.error('no se pudo iniciar el worker', { error: String(e?.stack ?? e) });
  process.exit(1);
});
