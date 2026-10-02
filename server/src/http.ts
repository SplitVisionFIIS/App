import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function asyncHandler(
  funcion: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(funcion(req, res, next)).catch(next);
  };
}

export function validar<T>(esquema: { parse: (datos: unknown) => T }, datos: unknown): T {
  return esquema.parse(datos);
}
