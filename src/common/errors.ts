export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EXTERNAL'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EXTERNAL: 502,
  INTERNAL: 500,
};

export class AppException extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppException';
  }

  get status(): number {
    return STATUS[this.code];
  }
}

export const validation = (message: string, details?: Record<string, unknown>) =>
  new AppException('VALIDATION', message, details);
export const unauthorized = (message = 'no autorizado') =>
  new AppException('UNAUTHORIZED', message);
export const forbidden = (message = 'no autorizado') =>
  new AppException('UNAUTHORIZED', message);
export const notFound = (message = 'no encontrado') => new AppException('NOT_FOUND', message);
export const conflict = (message: string) => new AppException('CONFLICT', message);
export const external = (message: string) => new AppException('EXTERNAL', message);

export class OcrExternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrExternalError';
  }
}
