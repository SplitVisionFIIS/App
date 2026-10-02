import { Router } from 'express';
import { loginSchema, registroSchema } from '@splitvision/shared';
import { asyncHandler, validar } from '../http';
import { requireAuth } from './middleware';
import * as servicio from './service';

export const rutasAuth = Router();

rutasAuth.post(
  '/registro',
  asyncHandler(async (req, res) => {
    const datos = validar(registroSchema, req.body);
    const resultado = await servicio.registrarUsuario(datos);
    res.status(201).json(resultado);
  }),
);

rutasAuth.post(
  '/login',
  asyncHandler(async (req, res) => {
    const datos = validar(loginSchema, req.body);
    res.json(await servicio.iniciarSesion(datos));
  }),
);

rutasAuth.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const usuario = await servicio.obtenerUsuario(req.usuario!.id);
    res.json({ usuario });
  }),
);
