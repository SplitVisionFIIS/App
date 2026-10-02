import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public readonly codigo: string,
    public readonly estado: number,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = 'AppError';
  }
}

export function noEncontrado(mensaje: string): AppError {
  return new AppError('NO_ENCONTRADO', 404, mensaje);
}

export function manejadorDeErrores(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.estado).json({
      error: { codigo: error.codigo, mensaje: error.mensaje, detalles: error.detalles },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        codigo: 'VALIDACION',
        mensaje: 'Datos de entrada invalidos',
        detalles: error.flatten().fieldErrors,
      },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const estado = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(estado).json({
      error: {
        codigo: 'ARCHIVO_INVALIDO',
        mensaje:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen supera el tamano maximo de 5 MB'
            : `Error al recibir el archivo: ${error.message}`,
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({
        error: { codigo: 'DATO_DUPLICADO', mensaje: 'Ya existe un registro con esos datos unicos' },
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Registro no encontrado' } });
      return;
    }
  }

  logger.error({ error }, 'Error no controlado');
  res.status(500).json({
    error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' },
  });
}
