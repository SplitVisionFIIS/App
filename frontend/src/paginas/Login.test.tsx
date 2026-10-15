import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProveedorSesion } from '../auth/SesionContext';
import { ProveedorToast } from '../componentes/Toast';
import { Login } from './Login';

function ok(datos: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(datos) } as unknown as Response;
}

function fallo(status: number, datos: unknown): Response {
  return { ok: false, status, json: () => Promise.resolve(datos) } as unknown as Response;
}

function pintarLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <ProveedorSesion>
        <ProveedorToast>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<div>inicio-ok</div>} />
          </Routes>
        </ProveedorToast>
      </ProveedorSesion>
    </MemoryRouter>,
  );
}

describe('Login', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra el mensaje del servidor cuando las credenciales son inválidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/auth/me') return Promise.resolve(fallo(401, { code: 'UNAUTHORIZED' }));
        return Promise.resolve(
          fallo(401, { code: 'UNAUTHORIZED', message: 'credenciales inválidas' }),
        );
      }),
    );

    pintarLogin();
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Correo o usuario'), 'ana');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Passw0rd!23');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('credenciales inválidas');
    expect(screen.queryByText('inicio-ok')).not.toBeInTheDocument();
  });

  it('inicia sesión y navega al inicio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/auth/me') return Promise.resolve(fallo(401, { code: 'UNAUTHORIZED' }));
        if (url === '/api/auth/login') {
          return Promise.resolve(ok({ username: 'ana', csrf: 'csrf-nuevo' }));
        }
        return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
      }),
    );

    pintarLogin();

    await userEvent.type(screen.getByLabelText('Correo o usuario'), 'ana');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Passw0rd!23');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('inicio-ok')).toBeInTheDocument();
  });
});
