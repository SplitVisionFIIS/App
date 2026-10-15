import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pago } from './Pago';

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
      <MemoryRouter initialEntries={['/deudas/d1/pago']}>
        <Routes>
          <Route path="/deudas/:id/pago" element={<Pago />} />
          <Route path="/bandeja" element={<div>bandeja-ok</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Pago', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('valida monto antes de enviar', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const usuario = userEvent.setup();
    pintar();

    const boton = screen.getByRole('button', { name: 'Enviar pago' });
    expect(boton).toBeDisabled();

    await usuario.type(screen.getByLabelText('Monto (S/)'), '50');
    expect(boton).toBeEnabled();
  });

  it('reclama evidencia para método distinto a efectivo', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const usuario = userEvent.setup();
    pintar();

    await usuario.type(screen.getByLabelText('Monto (S/)'), '50');
    const select = screen.getByRole('combobox');
    await usuario.selectOptions(select, 'YAPE');

    expect(screen.getByText(/La evidencia es obligatoria/)).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: 'Enviar pago' });
    expect(boton).toBeDisabled();
  });

  it('envía pago con evidencia y navega a bandeja', async () => {
    const cryptoMock = vi.spyOn(globalThis.crypto, 'randomUUID');
    cryptoMock.mockReturnValue('idemp-123' as any);

    const fetchMock = vi.fn((url: string, opts?: RequestInit) => {
      if (url === '/api/debts/d1/payments') {
        expect(opts?.headers).toMatchObject({ 'idempotency-key': 'idemp-123' });
        expect(opts?.body).toBeInstanceOf(FormData);
        return Promise.resolve(ok({ id: 'p1' }));
      }
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar();

    await usuario.type(screen.getByLabelText('Monto (S/)'), '50');
    await usuario.selectOptions(screen.getByRole('combobox'), 'YAPE');
    const file = new File(['evidencia'], 'comprobante.jpg', { type: 'image/jpeg' });
    await usuario.upload(screen.getByLabelText('Comprobante / evidencia'), file);

    await usuario.click(screen.getByRole('button', { name: 'Enviar pago' }));
    expect(await screen.findByText('bandeja-ok')).toBeInTheDocument();
  });
});
