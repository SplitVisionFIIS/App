const CLAVE_TOKEN = 'splitvision.token';

export function obtenerToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string | null): void {
  if (token) {
    localStorage.setItem(CLAVE_TOKEN, token);
  } else {
    localStorage.removeItem(CLAVE_TOKEN);
  }
}

export class ApiError extends Error {
  constructor(
    public readonly codigo: string,
    mensaje: string,
    public readonly estado: number,
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }
}

export interface Usuario {
  id: string;
  username: string;
  email: string;
}

export interface EventoResumen {
  id: string;
  nombre: string;
  createdAt: string;
  totalParticipantes: number;
  totalComprobantes: number;
}

export interface EventoDetalle {
  id: string;
  nombre: string;
  createdAt: string;
  creadorId: string;
  participantes: Usuario[];
}

export interface Pago {
  id: string;
  monto: number;
  metodo: string;
  referencia: string | null;
  fecha: string;
  usuarioId: string;
}

export interface Deuda {
  id: string;
  comprobanteId: string;
  acreedor: { id: string; username: string };
  deudor: { id: string; username: string };
  montoTotal: number;
  saldo: number;
  pagos: Pago[];
}

export interface ComprobanteResumen {
  id: string;
  estado: string;
  pagador: { id: string; username: string };
  imagenUrl: string;
  montoTotal: number;
  modalidad: string | null;
  totalDeudas: number;
  saldoPendiente: number;
  createdAt: string;
}

export interface ItemConfirmado {
  id: string;
  descripcion: string;
  monto: number;
  consumidores: string[];
}

export interface ComprobanteDetalle extends ComprobanteResumen {
  eventoId: string;
  datosExtraidos: {
    montoTotalCents?: number;
    items?: { descripcion: string; montoCents: number }[];
    error?: string;
    [clave: string]: unknown;
  } | null;
  items: ItemConfirmado[];
  deudas: {
    id: string;
    deudor: { id: string; username: string };
    montoTotal: number;
    saldo: number;
    pagado: number;
  }[];
  updatedAt: string;
}

export interface Balance {
  saldado: boolean;
  pendienteTotal: number;
  totalDeudas: number;
  participantes: {
    usuarioId: string;
    username: string;
    debe: number;
    haPagado: number;
    leDeben: number;
  }[];
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}, formData?: FormData): Promise<T> {
  const token = obtenerToken();
  const encabezados: Record<string, string> = formData
    ? {}
    : { 'Content-Type': 'application/json' };
  if (token) {
    encabezados['Authorization'] = `Bearer ${token}`;
  }

  const respuesta = await fetch(`/api/v1${ruta}`, {
    ...opciones,
    headers: { ...encabezados, ...(opciones.headers as Record<string, string>) },
    body: formData ?? (opciones.body as BodyInit | undefined),
  });

  const texto = await respuesta.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    const error = (datos as { error?: { codigo?: string; mensaje?: string } } | null)?.error;
    throw new ApiError(
      error?.codigo ?? 'ERROR',
      error?.mensaje ?? 'Error inesperado del servidor',
      respuesta.status,
    );
  }
  return datos as T;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    pedir<T>(ruta, {
      method: 'POST',
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    }),
  postForm: <T>(ruta: string, formData: FormData) => pedir<T>(ruta, { method: 'POST' }, formData),
};
