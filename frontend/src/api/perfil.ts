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
