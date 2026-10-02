import type { AgregarParticipanteInput, CrearEventoInput } from '@splitvision/shared';
import { prisma } from '../db';
import { AppError, noEncontrado } from '../errors';

export async function crearEvento(creadorId: string, datos: CrearEventoInput) {
  return prisma.$transaction(async (tx) => {
    const evento = await tx.evento.create({
      data: { nombre: datos.nombre, creadorId },
    });
    await tx.participacion.create({
      data: { eventoId: evento.id, usuarioId: creadorId },
    });
    return evento;
  });
}

export async function listarEventos(usuarioId: string) {
  const participaciones = await prisma.participacion.findMany({
    where: { usuarioId },
    include: {
      evento: {
        include: { _count: { select: { participaciones: true, comprobantes: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return participaciones.map((p) => ({
    id: p.evento.id,
    nombre: p.evento.nombre,
    createdAt: p.evento.createdAt,
    totalParticipantes: p.evento._count.participaciones,
    totalComprobantes: p.evento._count.comprobantes,
  }));
}

export async function obtenerEvento(eventoId: string) {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: {
      participaciones: {
        include: { usuario: { select: { id: true, username: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!evento) {
    throw noEncontrado('Evento no encontrado');
  }

  return {
    id: evento.id,
    nombre: evento.nombre,
    createdAt: evento.createdAt,
    creadorId: evento.creadorId,
    participantes: evento.participaciones.map((p) => p.usuario),
  };
}

export async function agregarParticipante(eventoId: string, datos: AgregarParticipanteInput) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { id: true } });
  if (!evento) {
    throw noEncontrado('Evento no encontrado');
  }

  const usuario = await prisma.usuario.findFirst({
    where: { OR: [{ username: datos.usuario }, { email: datos.usuario }] },
    select: { id: true, username: true, email: true },
  });
  if (!usuario) {
    throw new AppError(
      'USUARIO_NO_ENCONTRADO',
      404,
      'No existe un usuario registrado con ese username o correo',
    );
  }

  const existente = await prisma.participacion.findUnique({
    where: { eventoId_usuarioId: { eventoId, usuarioId: usuario.id } },
  });
  if (existente) {
    throw new AppError('YA_VINCULADO', 409, 'Ese usuario ya pertenece al evento');
  }

  await prisma.participacion.create({
    data: { eventoId, usuarioId: usuario.id },
  });
  return usuario;
}
