import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MisDeudas } from './MisDeudas';

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
      <MemoryRouter initialEntries={['/deudas']}>
        <Routes>
          <Route path="/deudas" element={<MisDeudas />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const DEUDAS_DEBO = [
  {
    debtId: 'd1',
    eventId: 'e1',
    eventName: 'Cumpleaños',
    receiptId: 'r1',
    receiptDescription: 'Pizza',
    creditor: 'carla',
    amountCents: 5000,
    pendingCents: 5000,
    availableCents: 5000,
  },
];

const DEUDAS_ME_DEBEN = [
  {
    debtId: 'd2',
    eventId: 'e1',
    eventName: 'Cumpleaños',
    receiptDescription: 'Pizza',
    debtor: 'juan',
    amountCents: 2500,
    pendingCents: 2500,
  },
];

describe('MisDeudas', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('cambia entre Debo y Me deben', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/debts?direction=owing') return Promise.resolve(ok(DEUDAS_DEBO));
      if (url === '/api/debts?direction=owed') return Promise.resolve(ok(DEUDAS_ME_DEBEN));
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar();

    expect(await screen.findByText('Debo')).toBeInTheDocument();
    expect(await screen.findByText(/A carla/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pagar/ })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Me deben' }));
    expect(await screen.findByText(/De juan/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pagar/ })).not.toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay deudas', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(ok([]))));
    pintar();
    expect(await screen.findByText('No tienes deudas pendientes.')).toBeInTheDocument();
  });

  it('muestra mensaje de error si falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(fallo(500, { code: 'INTERNAL', message: 'error' }))),
    );
    pintar();
    expect(await screen.findByRole('alert')).toHaveTextContent('error');
  });
});
