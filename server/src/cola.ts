import PgBoss from 'pg-boss';
import { NOMBRE_COLA_OCR } from '@splitvision/shared';
import { config } from './config';
import { logger } from './logger';

export { NOMBRE_COLA_OCR };

export async function crearCola(): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: config.DATABASE_URL });
  boss.on('error', (error) => logger.error({ error }, 'Error en la cola de procesamiento'));
  await boss.start();
  logger.info('Cola de procesamiento (pg-boss) iniciada');
  return boss;
}
