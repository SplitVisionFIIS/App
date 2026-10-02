import { Router } from 'express';
import { agregarParticipanteSchema, crearEventoSchema } from '@splitvision/shared';
import { asyncHandler, validar } from '../http';
import { requireAuth } from '../auth/middleware';
import { requireMiembroEvento } from './middleware';
import * as servicio from './service';

export const rutasEventos = Router();

rutasEventos.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const datos = validar(crearEventoSchema, req.body);
    const evento = await servicio.crearEvento(req.usuario!.id, datos);
    res.status(201).json({ evento });
  }),
);

rutasEventos.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ eventos: await servicio.listarEventos(req.usuario!.id) });
  }),
);

rutasEventos.get(
  '/:eventoId',
  requireAuth,
  requireMiembroEvento,
  asyncHandler(async (req, res) => {
    res.json({ evento: await servicio.obtenerEvento(req.params.eventoId) });
  }),
);

rutasEventos.post(
  '/:eventoId/participantes',
  requireAuth,
  requireMiembroEvento,
  asyncHandler(async (req, res) => {
    const datos = validar(agregarParticipanteSchema, req.body);
    const participante = await servicio.agregarParticipante(req.params.eventoId, datos);
    res.status(201).json({ participante });
  }),
);
