import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../errors';
import { asyncHandler } from '../http';

export interface UsuarioToken {
  id: string;
  username: string;
}

export function firmarToken(usuario: UsuarioToken): string {
  return jwt.sign({ sub: usuario.id, username: usuario.username }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRA as SignOptions['expiresIn'],
  });
}

export function verificarToken(token: string): UsuarioToken {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') {
      throw new Error('payload invalido');
    }
    return { id: payload.sub, username: payload.username };
  } catch {
    throw new AppError('TOKEN_INVALIDO', 401, 'Sesion invalida o expirada');
  }
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const encabezado = req.header('authorization') ?? '';
  const [tipo, token] = encabezado.split(' ');
  if (tipo !== 'Bearer' || !token) {
    throw new AppError('NO_AUTENTICADO', 401, 'Falta el token de autenticacion');
  }
  req.usuario = verificarToken(token);
  next();
});
