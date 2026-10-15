import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProveedorSesion } from '../auth/SesionContext';
import { ProveedorToast } from '../componentes/Toast';
import { ProveedorPreferencias } from '../preferencias/PreferenciasContext';
import { Configuracion } from './Configuracion';

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
      <MemoryRouter initialEntries={['/configuracion']}>
        <ProveedorPreferencias>
          <ProveedorSesion>
            <ProveedorToast>
              <Routes>
                <Route path="/configuracion" element={<Configuracion />} />
              </Routes>
            </ProveedorToast>
          </ProveedorSesion>
        </ProveedorPreferencias>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Configuracion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('muestra nombre de usuario y moneda fija', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/auth/me') return Promise.resolve(ok({ username: 'ana' }));
        return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
      }),
    );
    pintar();
    expect(await screen.findByText('ana')).toBeInTheDocument();
    const moneda = screen.getByLabelText('Moneda');
    expect(moneda).toHaveValue('S/ Sol peruano (PEN)');
    expect(moneda).toBeDisabled();
  });

  it('cambia tema a oscuro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/auth/me') return Promise.resolve(ok({ username: 'ana' }));
        return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
      }),
    );
    const usuario = userEvent.setup();
    pintar();

    await usuario.click(screen.getByRole('button', { name: 'Oscuro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('splitvision:tema')).toBe('oscuro');
  });

  it('cambia contraseña con éxito', async () => {
    let llamada = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, opts?: RequestInit) => {
        if (url === '/api/auth/me') return Promise.resolve(ok({ username: 'ana' }));
        if (url === '/api/auth/password') {
          llamada = true;
          expect(opts?.method).toBe('POST');
          return Promise.resolve(ok({ ok: true }));
        }
        return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
      }),
    );
    const usuario = userEvent.setup();
    pintar();

    await screen.findByText('ana');
    await usuario.type(screen.getByLabelText('Contraseña actual'), 'vieja123');
    await usuario.type(screen.getByLabelText('Nueva contraseña'), 'nueva123');
    await usuario.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva123');
    await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(llamada).toBe(true);
    expect(await screen.findByText('Contraseña actualizada.')).toBeInTheDocument();
  });
});
