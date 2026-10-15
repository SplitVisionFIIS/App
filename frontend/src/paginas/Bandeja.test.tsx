import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bandeja } from './Bandeja';

function ok(datos: unknown, status = 200): Response {
  return { ok: true, status, json: () => Promise.resolve(datos) } as unknown as Response;
}

function fallo(status: number, datos: unknown): Response {
  return { ok: false, status, json: () => Promise.resolve(datos) } as unknown as Response;
}

function consultaNueva() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function pintar() {
  return render(
    <QueryClientProvider client={consultaNueva()}>
      <MemoryRouter initialEntries={['/bandeja']}>
        <Routes>
          <Route path="/bandeja" element={<Bandeja />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PENDIENTES = [
  {
    invitationId: 'i1',
    eventId: 'abc',
    eventName: 'Salida a la playa',
    inviter: 'demo_fe',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
];

describe('Bandeja', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra las invitaciones pendientes con quien te invitó', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(ok(PENDIENTES))),
    );

    pintar();

    expect(await screen.findByText('Salida a la playa')).toBeInTheDocument();
    expect(screen.getByText('Te invitó demo_fe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  it('acepta una invitación y desaparece de la bandeja', async () => {
    let llamadas = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, _opts?: RequestInit) => {
        if (url === '/api/invitations') {
          llamadas += 1;
          return Promise.resolve(ok(llamadas > 1 ? [] : PENDIENTES));
        }
        if (url === '/api/invitations/i1/accept') return Promise.resolve(ok({ id: 'i1', status: 'ACEPTADA' }, 201));
        return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
      }),
    );
    const usuario = userEvent.setup();
    pintar();

    await screen.findByText('Salida a la playa');

    await usuario.click(screen.getByRole('button', { name: 'Aceptar' }));

    expect(await screen.findByText('No tienes invitaciones pendientes')).toBeInTheDocument();
  });

  it('rechaza una invitación y desaparece de la bandeja', async () => {
    let llamadas = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, _opts?: RequestInit) => {
        if (url === '/api/invitations') {
          llamadas += 1;
          return Promise.resolve(ok(llamadas > 1 ? [] : PENDIENTES));
        }
        if (url === '/api/invitations/i1/reject') return Promise.resolve(ok({ id: 'i1', status: 'RECHAZADA' }, 201));
        return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
      }),
    );
    const usuario = userEvent.setup();
    pintar();

    await screen.findByText('Salida a la playa');

    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(await screen.findByText('No tienes invitaciones pendientes')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay invitaciones', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(ok([]))),
    );

    pintar();

    expect(await screen.findByText('No tienes invitaciones pendientes')).toBeInTheDocument();
  });
});