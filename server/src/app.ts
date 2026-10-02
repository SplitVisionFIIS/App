import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type PgBoss from 'pg-boss';
import { rutasAuth } from './auth/routes';
import { crearRutasComprobantes } from './comprobantes/routes';
import { config } from './config';
import { rutasDeudas } from './deudas/routes';
import { rutasEventos } from './eventos/routes';
import { manejadorDeErrores } from './errors';
import './tipos';

export function crearApp(boss: PgBoss): express.Express {
  const app = express();

  app.use(cors({ origin: config.WEB_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(path.resolve(config.UPLOAD_DIR)));

  const api = express.Router();
  api.use(rutasAuth);
  api.use(rutasEventos);
  api.use(rutasDeudas);
  api.use(crearRutasComprobantes(boss));
  app.use('/api/v1', api);

  app.use((_req, res) => {
    res.status(404).json({
      error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta solicitada no existe' },
    });
  });

  app.use(manejadorDeErrores);
  return app;
}
