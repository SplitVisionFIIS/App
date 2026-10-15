import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { AppException } from './errors';
import { correlationId, logger } from './correlation';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    let status = 500;
    let code = 'INTERNAL';
    let message = 'error interno';

    if (exception instanceof AppException) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      const body = typeof resp === 'string' ? { message: resp } : (resp as Record<string, unknown>);
      const msg = Array.isArray(body.message) ? body.message.join('; ') : String(body.message ?? exception.message);
      message = msg;
      code = status === 401 ? 'UNAUTHORIZED' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION';
    } else if (exception && typeof exception === 'object') {
      const e = exception as { code?: string; name?: string; message?: string };
      if (e.name === 'MulterError' || e.name === 'BodyTooLargeError') {
        status = 400;
        code = 'VALIDATION';
        message =
          e.code === 'LIMIT_FILE_SIZE'
            ? 'la imagen supera el tamaño máximo de 5 MB'
            : 'archivo inválido: solo se permite una imagen';
      } else if (e.code === '22P02') {
        // id mal formado (p. ej. no es un UUID): el parámetro nunca pudo existir
        status = 400;
        code = 'VALIDATION';
        message = 'parámetro inválido: identificador con formato incorrecto';
      } else if (e.code === '23505') {
        status = 409;
        code = 'CONFLICT';
        message = 'el recurso ya existe';
      } else {
        message = e.message ?? 'error interno';
      }
    }

    if (status >= 500) {
      logger.error('error no controlado', {
        path: req?.url,
        exception: exception instanceof Error ? `${exception.name}: ${exception.message}\n${exception.stack}` : String(exception),
      });
    } else {
      logger.warn('error controlado', { path: req?.url, code, status, message });
    }

    res.status(status).json({ code, message, correlationId: correlationId() });
  }
}
