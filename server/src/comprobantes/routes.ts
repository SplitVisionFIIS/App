import { Router } from 'express';
import type PgBoss from 'pg-boss';
import { z } from 'zod';
import { dividirSchema } from '@splitvision/shared';
import { AppError } from '../errors';
import { asyncHandler, validar } from '../http';
import { requireAuth } from '../auth/middleware';
import { requireMiembroEvento } from '../eventos/middleware';
import * as servicio from './service';
import { subirImagen } from './uploads';

const uuid = z.string().uuid('Identificador invalido');

export function crearRutasComprobantes(boss: PgBoss): Router {
  const rutas = Router();

  rutas.post(
    '/eventos/:eventoId/comprobantes',
    requireAuth,
    requireMiembroEvento,
    subirImagen.single('imagen'),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        throw new AppError('IMAGEN_REQUERIDA', 400, 'Debes adjuntar la foto del comprobante');
      }
      const comprobante = await servicio.crearComprobante(
        req.params.eventoId,
        req.usuario!.id,
        req.file.filename,
        boss,
      );
      res.status(202).json({
        comprobante: {
          id: comprobante.id,
          estado: comprobante.estado,
          imagenUrl: `/uploads/${comprobante.imagenPath}`,
          createdAt: comprobante.createdAt,
        },
      });
    }),
  );

  rutas.get(
    '/eventos/:eventoId/comprobantes',
    requireAuth,
    requireMiembroEvento,
    asyncHandler(async (req, res) => {
      res.json({ comprobantes: await servicio.listarComprobantes(req.params.eventoId) });
    }),
  );

  rutas.get(
    '/comprobantes/:comprobanteId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const comprobanteId = uuid.parse(req.params.comprobanteId);
      res.json({
        comprobante: await servicio.obtenerComprobante(comprobanteId, req.usuario!.id),
      });
    }),
  );

  rutas.post(
    '/comprobantes/:comprobanteId/dividir',
    requireAuth,
    asyncHandler(async (req, res) => {
      const comprobanteId = uuid.parse(req.params.comprobanteId);
      const datos = validar(dividirSchema, req.body);
      const resultado = await servicio.dividirComprobante(comprobanteId, req.usuario!.id, datos);
      res.status(201).json(resultado);
    }),
  );

  return rutas;
}
