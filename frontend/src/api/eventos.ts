import { apiFetch, enviar, obtener, subir } from './client';
import type { DetalleEvento, Evento, Invitacion, InvitacionPendiente } from './tipos';

export type EventoNuevo = { id: string; name: string; createdAt: string };

export function listarEventos(): Promise<Evento[]> {
  return obtener<Evento[]>('/api/events');
}

export function obtenerEvento(id: string): Promise<DetalleEvento> {
  return obtener<DetalleEvento>(`/api/events/${id}`);
}

export function crearEvento(nombre: string): Promise<EventoNuevo> {
  return enviar<EventoNuevo>('/api/events', { name: nombre });
}

export function invitarAEvento(eventoId: string, query: string): Promise<Invitacion> {
  return enviar<Invitacion>(`/api/events/${eventoId}/invitations`, { query });
}

export function cancelarInvitacion(
  eventoId: string,
  invitationId: string,
): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(
    `/api/events/${eventoId}/invitations/${invitationId}`,
    { method: 'DELETE' },
  );
}

export function misInvitaciones(): Promise<InvitacionPendiente[]> {
  return obtener<InvitacionPendiente[]>('/api/invitations');
}

export function buscarUsuarios(q: string): Promise<{ username: string }[]> {
  return obtener<{ username: string }[]>(`/api/users/search?q=${encodeURIComponent(q)}`);
}

export function responderInvitacion(
  invitationId: string,
  decision: 'aceptar' | 'rechazar',
): Promise<{ id: string; status: string }> {
  const path = decision === 'aceptar' ? 'accept' : 'reject';
  return apiFetch<{ id: string; status: string }>(`/api/invitations/${invitationId}/${path}`, {
    method: 'POST',
  });
}

export function urlImagenEvento(eventoId: string): string {
  return `/api/events/${eventoId}/image`;
}

export function subirImagenEvento(eventoId: string, archivo: File): Promise<{ hasImage: boolean }> {
  const form = new FormData();
  form.append('image', archivo);
  return subir<{ hasImage: boolean }>(urlImagenEvento(eventoId), form);
}

export function compensarSaldosEvento(
  eventoId: string,
): Promise<{ eventId: string; compensatedCents: number; pairsCompensated: number }> {
  return enviar<{ eventId: string; compensatedCents: number; pairsCompensated: number }>(
    `/api/events/${eventoId}/compensate`,
    {},
  );
}