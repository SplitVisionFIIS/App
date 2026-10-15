export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const MUTANDO = new Set<Metodo>(['POST', 'PUT', 'PATCH', 'DELETE']);

export const EVENTO_SESION_CADUCADA = 'sesion:caducada';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function leerCookie(nombre: string): string | null {
  const prefijo = `${nombre}=`;
  const par = document.cookie.split('; ').find((c) => c.startsWith(prefijo));
  if (!par) return null;
  return decodeURIComponent(par.slice(prefijo.length));
}

export type OpcionesApi = {
  method?: Metodo;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

function codigoPorDefecto(status: number): string {
  if (status === 400) return 'VALIDATION';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 502) return 'EXTERNAL';
  return 'INTERNAL';
}

export async function apiFetch<T>(ruta: string, opciones: OpcionesApi = {}): Promise<T> {
  const metodo: Metodo = opciones.method ?? 'GET';
  const cabeceras: Record<string, string> = { ...(opciones.headers ?? {}) };
  if (opciones.body !== undefined && !(opciones.body instanceof FormData)) {
    cabeceras['Content-Type'] = 'application/json';
  }
  if (MUTANDO.has(metodo)) {
    const token = leerCookie('csrf');
    if (token) cabeceras['x-csrf-token'] = token;
  }

  let res: Response;
  try {
    res = await fetch(ruta, {
      method: metodo,
      headers: cabeceras,
      body:
        opciones.body !== undefined
          ? opciones.body instanceof FormData
            ? opciones.body
            : JSON.stringify(opciones.body)
          : undefined,
      credentials: 'same-origin',
      signal: opciones.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'sin conexión con el servidor');
  }

  const datos = (await res.json().catch(() => null)) as {
    code?: string;
    message?: string;
    correlationId?: string;
  } | null;

  if (!res.ok) {
    const error = new ApiError(
      res.status,
      datos?.code ?? codigoPorDefecto(res.status),
      datos?.message ?? `error ${res.status}`,
      datos?.correlationId,
    );
    const esLogin =
      ruta.startsWith('/api/auth/login') || ruta.startsWith('/api/auth/register');
    if (res.status === 401 && !esLogin) {
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_CADUCADA));
    }
    throw error;
  }

  return datos as T;
}

export const obtener = <T>(ruta: string, signal?: AbortSignal): Promise<T> =>
  apiFetch<T>(ruta, { signal });

export const enviar = <T>(ruta: string, body: unknown, method: Metodo = 'POST'): Promise<T> =>
  apiFetch<T>(ruta, { method, body });

export const cambiar = <T>(ruta: string, body: unknown): Promise<T> =>
  apiFetch<T>(ruta, { method: 'PATCH', body });

export const eliminar = <T>(ruta: string, body?: unknown): Promise<T> =>
  apiFetch<T>(ruta, { method: 'DELETE', body });

export const subir = <T>(ruta: string, form: FormData): Promise<T> =>
  apiFetch<T>(ruta, { method: 'POST', body: form });
