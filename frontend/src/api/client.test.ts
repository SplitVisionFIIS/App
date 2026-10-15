import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, EVENTO_SESION_CADUCADA, apiFetch, leerCookie } from './client';

function ok(datos: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(datos) } as unknown as Response;
}

function fallo(status: number, datos: unknown): Response {
  return { ok: false, status, json: () => Promise.resolve(datos) } as unknown as Response;
}

describe('cliente API', () => {
  beforeEach(() => {
    document.cookie = 'csrf=token-de-prueba';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.cookie = 'csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('lee cookies por nombre', () => {
    expect(leerCookie('csrf')).toBe('token-de-prueba');
    expect(leerCookie('no-existe')).toBeNull();
  });

  it('envía x-csrf-token solo en peticiones mutantes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/auth/logout', { method: 'POST', body: {} });
    const initPost = fetchMock.mock.calls[0][1] as RequestInit;
    expect((initPost.headers as Record<string, string>)['x-csrf-token']).toBe('token-de-prueba');
    expect(initPost.credentials).toBe('same-origin');

    await apiFetch('/api/auth/me');
    const initGet = fetchMock.mock.calls[1][1] as RequestInit;
    expect((initGet.headers as Record<string, string>)['x-csrf-token']).toBeUndefined();
  });

  it('lanza ApiError con code, message y correlationId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fallo(400, { code: 'VALIDATION', message: 'nombre requerido', correlationId: 'corr-1' }),
      ),
    );

    const err = await apiFetch('/api/eventos', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const api = err as ApiError;
    expect(api.status).toBe(400);
    expect(api.code).toBe('VALIDATION');
    expect(api.message).toBe('nombre requerido');
    expect(api.correlationId).toBe('corr-1');
  });

  it('mapea el status a un code por defecto cuando el cuerpo no lo trae', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fallo(500, null)));
    const err = await apiFetch('/api/eventos').catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('INTERNAL');
  });

  it('dispara el evento de sesión caducada ante 401 fuera de autenticación', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fallo(401, { code: 'UNAUTHORIZED', message: 'no autorizado' })),
    );
    const alCaducar = vi.fn();
    window.addEventListener(EVENTO_SESION_CADUCADA, alCaducar);

    await apiFetch('/api/eventos').catch(() => undefined);
    expect(alCaducar).toHaveBeenCalledTimes(1);

    window.removeEventListener(EVENTO_SESION_CADUCADA, alCaducar);
  });

  it('no dispara el evento cuando falla el login (401 esperado)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fallo(401, { code: 'UNAUTHORIZED', message: 'credenciales inválidas' }),
      ),
    );
    const alCaducar = vi.fn();
    window.addEventListener(EVENTO_SESION_CADUCADA, alCaducar);

    await apiFetch('/api/auth/login', { method: 'POST', body: {} }).catch(() => undefined);
    expect(alCaducar).not.toHaveBeenCalled();

    window.removeEventListener(EVENTO_SESION_CADUCADA, alCaducar);
  });

  it('convierte un fallo de red en error NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await apiFetch('/api/eventos').catch((e: unknown) => e);
    const api = err as ApiError;
    expect(api.code).toBe('NETWORK');
    expect(api.status).toBe(0);
  });
});
