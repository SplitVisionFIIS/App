import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { randomBytes } from 'crypto';
import { User, Session, LoginAttempt } from '../../db/entities';
import { validation, conflict, unauthorized, notFound } from '../../common/errors';
import { withTx, audit } from '../../common/db';
import { StorageService } from '../comprobantes/storage.service';

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface LoginResult {
  sessionId: string;
  csrf: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async register(input: {
    username: string;
    email: string;
    password: string;
  }): Promise<LoginResult> {
    const username = String(input.username ?? '').trim();
    const email = String(input.email ?? '').trim().toLowerCase();
    const password = String(input.password ?? '');

    if (!USERNAME_RE.test(username)) {
      throw validation('username: debe tener 3 a 20 caracteres alfanuméricos o guion bajo');
    }
    if (!EMAIL_RE.test(email) || email.length > 255) {
      throw validation('correo: formato de correo inválido');
    }
    if (password.length < 8) {
      throw validation('contraseña: debe tener al menos 8 caracteres');
    }

    const passwordHash = await argonHash(password);
    let user: User;
    try {
      user = await withTx(this.dataSource, async (em) => {
        const existing = await em.query(
          `SELECT id FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($2)`,
          [username, email],
        );
        if (existing.length > 0) {
          throw conflict('el username o el correo ya están registrados');
        }
        const saved = await em.getRepository(User).save(
          em.getRepository(User).create({ username, email, passwordHash }),
        );
        await audit(em, { userId: saved.id, operation: 'register', resource: `user:${saved.id}`, result: 'ok' });
        return saved;
      });
    } catch (e) {
      if (e && typeof e === 'object' && (e as { code?: string }).code === '23505') {
        throw conflict('el username o el correo ya están registrados');
      }
      throw e;
    }

    return this.startSession(user);
  }

  async login(identifierRaw: string, password: string): Promise<LoginResult> {
    const identifier = String(identifierRaw ?? '').trim().toLowerCase();
    if (!identifier || !password) throw validation('credenciales: completa todos los campos');

    const maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
    const windowMin = Number(process.env.LOGIN_WINDOW_MIN ?? 10);
    const since = new Date(Date.now() - windowMin * 60_000);
    const attempts = await this.dataSource
      .getRepository(LoginAttempt)
      .createQueryBuilder('a')
      .where('a.identifier = :identifier', { identifier })
      .andWhere('a.attemptedAt > :since', { since })
      .getCount();
    if (attempts >= maxAttempts) {
      throw conflict(`demasiados intentos fallidos; espera ${windowMin} minutos antes de reintentar`);
    }

    const user = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .where('lower(u.username) = :id OR lower(u.email) = :id', { id: identifier })
      .getOne();

    let ok = false;
    if (user) {
      try {
        ok = await argonVerify(user.passwordHash, password);
      } catch {
        ok = false;
      }
    }

    if (!ok) {
      await this.dataSource.getRepository(LoginAttempt).insert({ identifier });
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      try {
        await audit(qr.manager, {
          userId: user?.id ?? null,
          operation: 'login',
          resource: `identifier:${identifier}`,
          result: 'fallido',
        });
      } finally {
        await qr.release();
      }
      throw unauthorized('credenciales inválidas');
    }

    await this.dataSource.getRepository(LoginAttempt).delete({ identifier });
    if (!user) throw unauthorized('credenciales inválidas');
    return this.startSession(user);
  }

  async logout(sessionId: string): Promise<void> {
    await this.dataSource.getRepository(Session).delete({ id: sessionId });
  }

  private async startSession(user: User): Promise<LoginResult> {
    const hours = Number(process.env.SESSION_HOURS ?? 8);
    const csrf = randomBytes(24).toString('hex');
    const session = await this.dataSource.getRepository(Session).save({
      userId: user.id,
      csrf,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + hours * 3600_000),
    });
    return { sessionId: session.id, csrf, username: user.username };
  }

  async getProfile(user: { id: string; username: string }): Promise<{ username: string; hasImage: boolean }> {
    const rows = await this.dataSource.query(`SELECT image_path FROM users WHERE id = $1`, [user.id]);
    const hasImage = rows.length > 0 && Boolean(rows[0].image_path);
    return { username: user.username, hasImage };
  }

  async setImage(userId: string, buffer: Buffer): Promise<{ hasImage: true }> {
    const saved = this.storage.saveImage(buffer, `usuario-${userId}`);
    const rows = await this.dataSource.query(`SELECT image_path FROM users WHERE id = $1`, [userId]);
    if (rows.length === 0) {
      this.storage.delete(saved.path);
      throw notFound('usuario no encontrado');
    }
    await this.dataSource.query(`UPDATE users SET image_path = $1 WHERE id = $2`, [saved.path, userId]);
    await audit(this.dataSource.manager, {
      userId,
      operation: 'user.image',
      resource: `user:${userId}`,
      result: 'ok',
    });
    if (rows[0].image_path) this.storage.delete(rows[0].image_path);
    return { hasImage: true };
  }

  async readImage(userId: string): Promise<Buffer> {
    const rows = await this.dataSource.query(`SELECT image_path FROM users WHERE id = $1`, [userId]);
    if (rows.length === 0 || !rows[0].image_path) throw notFound('el usuario no tiene imagen');
    return this.storage.read(rows[0].image_path);
  }

  async changePassword(
    userId: string,
    currentRaw: string,
    newRaw: string,
  ): Promise<{ ok: true }> {
    const current = String(currentRaw ?? '');
    const next = String(newRaw ?? '');
    if (next.length < 8) {
      throw validation('nueva contraseña: debe tener al menos 8 caracteres');
    }
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) throw notFound('usuario no encontrado');
    let ok = false;
    try {
      ok = await argonVerify(user.passwordHash, current);
    } catch {
      ok = false;
    }
    if (!ok) throw unauthorized('la contraseña actual no es correcta');
    const passwordHash = await argonHash(next);
    await this.dataSource.getRepository(User).update({ id: userId }, { passwordHash });
    await audit(this.dataSource.manager, {
      userId,
      operation: 'user.password',
      resource: `user:${userId}`,
      result: 'ok',
    });
    return { ok: true };
  }
}
