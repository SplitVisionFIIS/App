import { crearApp } from './app';
import { crearCola } from './cola';
import { config } from './config';
import { inicializarBaseDeDatos, prisma } from './db';
import { logger } from './logger';

async function main() {
  await inicializarBaseDeDatos();
  const boss = await crearCola();
  const app = crearApp(boss);

  app.listen(config.PORT, () => {
    logger.info(`API de SplitVision escuchando en http://localhost:${config.PORT}`);
  });

  const apagar = async () => {
    logger.info('Apagando la API...');
    await boss.stop();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

main().catch((error) => {
  logger.error({ error }, 'No se pudo iniciar la API');
  process.exit(1);
});
