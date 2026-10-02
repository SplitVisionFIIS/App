import { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../errors';
import { asyncHandler } from '../http';

const eventoIdSchema = z.string().uuid('El identificador del evento no es valido');

export const requireMiembroEvento = asyncHandler(async (req, _res, next) => {
  const usuario = req.usuario;
  if (!usuario) {
    throw new AppError('NO_AUTENTICADO', 401, 'Falta el token de autenticacion');
  }
  const eventoId = eventoIdSchema.parse(req.params.eventoId ?? '');
  const participacion = await prisma.participacion.findUnique({
    where: { eventoId_usuarioId: { eventoId, usuarioId: usuario.id } },
  });
  if (!participacion) {
    throw new AppError('ACCESO_DENEGADO', 403, 'No perteneces a este evento');
  }
  next();
});
