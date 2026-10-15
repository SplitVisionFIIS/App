import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { logger } from '../common/correlation';

export async function runMigrations(url = process.env.DATABASE_URL): Promise<void> {
  if (!url) throw new Error('DATABASE_URL no definida');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // Lock a nivel de sesión: evita que api y worker apliquen la misma migración a la vez
    await client.query('SELECT pg_advisory_lock(772001)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const dir = join(__dirname, '..', '..', 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (done.rowCount) continue;
      const sql = readFileSync(join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info('migración aplicada', { file });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('migraciones al día');
      process.exit(0);
    })
    .catch((e) => {
      logger.error('falló la migración', { error: String(e) });
      process.exit(1);
    });
}
