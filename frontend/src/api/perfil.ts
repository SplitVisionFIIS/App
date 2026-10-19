import { enviar, obtener, subir } from './client';
import type { SesionActual } from './tipos';

export type Perfil = SesionActual;

export function obtenerPerfil(): Promise<Perfil> {
  return obtener<Perfil>('/api/auth/me');
}

export function urlAvatar(): string {
  return '/api/auth/me/image';
}

export function subirAvatar(archivo: File): Promise<{ hasImage: boolean }> {
  const form = new FormData();
  form.append('image', archivo);
  return subir<{ hasImage: boolean }>(urlAvatar(), form);
}

export function cambiarContrasena(
  contrasenaActual: string,
  contrasenaNueva: string,
): Promise<{ ok: boolean }> {
  return enviar<{ ok: boolean }>('/api/auth/password', {
    currentPassword: contrasenaActual,
    newPassword: contrasenaNueva,
  });
}

export function actualizarDatosCobro(datos: {
  phone?: string | null;
  preferredWallet?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  cci?: string | null;
}): Promise<{ ok: boolean }> {
  return enviar<{ ok: boolean }>('/api/auth/profile', datos, 'PATCH');
}

export function urlQrCobro(): string {
  return '/api/auth/me/qr';
}

export function subirQrCobro(archivo: File): Promise<{ hasQr: boolean }> {
  const form = new FormData();
  form.append('image', archivo);
  return subir<{ hasQr: boolean }>(urlQrCobro(), form);
}

export function eliminarQrCobro(): Promise<{ ok: boolean }> {
  return enviar<{ ok: boolean }>(urlQrCobro(), {}, 'DELETE');
}
