import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY } from './public.decorator';
import { parseCookies } from './util';
import { Session, User } from '../db/entities';
import { unauthorized, forbidden } from './errors';
import { logger } from './correlation';

const HOUR_MS = 3600_000;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string; username: string } }>();

    if (isPublic) return true;

    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies['sid'];
    if (!sid) throw unauthorized();

    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { id: sid } });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw unauthorized('la sesión expiró; vuelve a iniciar sesión');
    }

    const hours = Number(process.env.SESSION_HOURS ?? 8);
    const now = new Date();
    if (now.getTime() - session.lastSeenAt.getTime() > 60_000) {
      session.lastSeenAt = now;
      session.expiresAt = new Date(now.getTime() + hours * HOUR_MS);
      await sessionRepo.update({ id: session.id }, { lastSeenAt: now, expiresAt: session.expiresAt });
    }

    if (MUTATING.has(req.method)) {
      const header = req.headers['x-csrf-token'];
      const token = Array.isArray(header) ? header[0] : header;
      if (!token || token !== session.csrf) {
        throw forbidden('token CSRF inválido');
      }
    }

    const user = await this.dataSource.getRepository(User).findOne({ where: { id: session.userId } });
    if (!user) throw unauthorized();
    req.user = { id: user.id, username: user.username };
    logger.debug('sesión validada', { userId: req.user.id });
    return true;
  }
}
