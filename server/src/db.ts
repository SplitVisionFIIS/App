import { PrismaClient } from '@prisma/client';
import { aplicarRestriccionesDeIntegridad } from './integridad';
import { logger } from './logger';

export const prisma = new PrismaClient();

export async function inicializarBaseDeDatos(): Promise<void> {
  await aplicarRestriccionesDeIntegridad(prisma);
}
