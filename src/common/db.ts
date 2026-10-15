import { DataSource, EntityManager } from 'typeorm';
import { correlationId } from './correlation';

/**
 * En TypeORM, `query()` con `UPDATE ... RETURNING` devuelve `[rows, rowCount]`
 * (ver PostgresQueryRunner.query), no `rows`. Este normalizador devuelve solo
 * las filas para leerlas o validar `length` con sentido.
 */
export function updateRows(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res) && res.length === 2 && Array.isArray(res[0]) && typeof res[1] === 'number') {
    return res[0] as Record<string, unknown>[];
  }
  return Array.isArray(res) ? (res as Record<string, unknown>[]) : [];
}


export async function withTx<T>(
  dataSource: DataSource,
  fn: (em: EntityManager) => Promise<T>,
): Promise<T> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  try {
    await qr.startTransaction('READ COMMITTED');
    try {
      const result = await fn(qr.manager);
      await qr.commitTransaction();
      return result;
    } catch (e) {
      await qr.rollbackTransaction().catch(() => undefined);
      throw e;
    }
  } finally {
    await qr.release();
  }
}

export async function audit(
  em: EntityManager,
  params: {
    userId?: string | null;
    operation: string;
    resource?: string | null;
    result: string;
  },
): Promise<void> {
  await em.query(
    `INSERT INTO audit_logs (user_id, operation, resource, result, correlation_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.userId ?? null, params.operation, params.resource ?? null, params.result, correlationId()],
  );
}
