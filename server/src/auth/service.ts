import bcrypt from 'bcryptjs';
import type { LoginInput, RegistroInput } from '@splitvision/shared';
import { prisma } from '../db';
import { AppError, noEncontrado } from '../errors';
import { firmarToken } from './middleware';

export interface UsuarioPublico {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

function aPublico(usuario: {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}): UsuarioPublico {
  return {
    id: usuario.id,
    username: usuario.username,
    email: usuario.email,
    createdAt: usuario.createdAt,
  };
}

export async function registrarUsuario(datos: RegistroInput) {
  const existente = await prisma.usuario.findFirst({
    where: { OR: [{ username: datos.username }, { email: datos.email }] },
    select: { username: true, email: true },
  });
  if (existente) {
    throw new AppError(
      'DATO_DUPLICADO',
      409,
      existente.username === datos.username
        ? 'Ese username ya esta en uso'
        : 'Ese correo ya esta registrado',
    );
  }

  const passwordHash = await bcrypt.hash(datos.password, 10);
  const usuario = await prisma.usuario.create({
    data: { username: datos.username, email: datos.email, passwordHash },
  });

  return {
    usuario: aPublico(usuario),
    token: firmarToken({ id: usuario.id, username: usuario.username }),
  };
}

export async function iniciarSesion(datos: LoginInput) {
  const usuario = await prisma.usuario.findFirst({
    where: { OR: [{ username: datos.identificador }, { email: datos.identificador }] },
  });
  if (!usuario) {
    throw new AppError('CREDENCIALES_INVALIDAS', 401, 'Credenciales invalidas');
  }
  const coincide = await bcrypt.compare(datos.password, usuario.passwordHash);
  if (!coincide) {
    throw new AppError('CREDENCIALES_INVALIDAS', 401, 'Credenciales invalidas');
  }

  return {
    usuario: aPublico(usuario),
    token: firmarToken({ id: usuario.id, username: usuario.username }),
  };
}

export async function obtenerUsuario(id: string): Promise<UsuarioPublico> {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw noEncontrado('Usuario no encontrado');
  }
  return aPublico(usuario);
}
