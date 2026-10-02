import { NOMBRE_COLA_OCR } from '@splitvision/shared';
import { crearCola } from './cola';
import { config } from './config';
import { inicializarBaseDeDatos, prisma } from './db';
import { logger } from './logger';
import { procesarComprobante, type TrabajoOcr } from './comprobantes/procesador';
import { crearProveedorOcr } from './providers/ocr';

async function main() {
  await inicializarBaseDeDatos();
  const proveedor = crearProveedorOcr();
  const boss = await crearCola();

  await boss.work(NOMBRE_COLA_OCR, async (trabajos) => {
    for (const trabajo of trabajos) {
      const datos = trabajo.data as TrabajoOcr;
      const metadatos = trabajo as { retryCount?: number; retryLimit?: number };
      await procesarComprobante(
        datos,
        proveedor,
        metadatos.retryCount ?? 0,
        metadatos.retryLimit ?? 0,
      );
    }
  });

  logger.info({ proveedor: proveedor.nombre }, 'Worker de extraccion OCR listo');

  const apagar = async () => {
    logger.info('Apagando el worker...');
    await boss.stop();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

main().catch((error) => {
  logger.error({ error }, 'No se pudo iniciar el worker');
  process.exit(1);
});
