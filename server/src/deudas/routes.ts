import { Router } from 'express';
import { z } from 'zod';
import { pagoSchema } from '@splitvision/shared';
import { asyncHandler, validar } from '../http';
import { requireAuth } from '../auth/middleware';
import { requireMiembroEvento } from '../eventos/middleware';
import * as servicio from './service';

export const rutasDeudas = Router();

const uuid = z.string().uuid('Identificador invalido');

rutasDeudas.get(
  '/eventos/:eventoId/deudas',
  requireAuth,
  requireMiembroEvento,
  asyncHandler(async (req, res) => {
    res.json({ deudas: await servicio.listarDeudasPorEvento(req.params.eventoId) });
  }),
);

rutasDeudas.get(
  '/eventos/:eventoId/balance',
  requireAuth,
  requireMiembroEvento,
  asyncHandler(async (req, res) => {
    res.json({ balance: await servicio.balanceDelEvento(req.params.eventoId) });
  }),
);

rutasDeudas.post(
  '/deudas/:deudaId/pagos',
  requireAuth,
  asyncHandler(async (req, res) => {
    const deudaId = uuid.parse(req.params.deudaId);
    const datos = validar(pagoSchema, req.body);
    const resultado = await servicio.registrarPago(
      deudaId,
      req.usuario!.id,
      datos.monto,
      datos.metodo,
      datos.referencia,
    );
    res.status(201).json(resultado);
  }),
);
