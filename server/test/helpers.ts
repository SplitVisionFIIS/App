import type PgBoss from 'pg-boss';
import { prisma } from '../src/db';
import { aplicarRestriccionesDeIntegridad } from '../src/integridad';

export function crearBossDePruebas(): PgBoss {
  return {
    send: async () => 'trabajo-de-prueba',
    work: async () => undefined,
    stop: async () => undefined,
    on: () => undefined,
  } as unknown as PgBoss;
}

export async function prepararBase(): Promise<void> {
  await aplicarRestriccionesDeIntegridad(prisma);
}

export function nombreUnico(base: string): string {
  return `${base}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function limpiarUsuarios(usernames: string[]): Promise<void> {
  const usuarios = await prisma.usuario.findMany({
    where: { username: { in: usernames } },
    select: { id: true },
  });
  const ids = usuarios.map((usuario) => usuario.id);
  if (ids.length === 0) return;

  await prisma.evento.deleteMany({ where: { creadorId: { in: ids } } });
  await prisma.participacion.deleteMany({ where: { usuarioId: { in: ids } } });
  await prisma.itemConsumo.deleteMany({ where: { usuarioId: { in: ids } } });
  await prisma.pago.deleteMany({ where: { usuarioId: { in: ids } } });
  await prisma.deuda.deleteMany({
    where: { OR: [{ deudorId: { in: ids } }, { acreedorId: { in: ids } }] },
  });
  await prisma.comprobante.deleteMany({ where: { pagadorId: { in: ids } } });
  await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
}
