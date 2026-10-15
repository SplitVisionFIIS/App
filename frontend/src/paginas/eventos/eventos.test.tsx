import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetalleEvento } from './DetalleEvento';
import { MisEventos } from './MisEventos';
import { NuevoEvento } from './NuevoEvento';

function ok(datos: unknown, status = 200): Response {
  return { ok: true, status, json: () => Promise.resolve(datos) } as unknown as Response;
}

function fallo(status: number, datos: unknown): Response {
  return { ok: false, status, json: () => Promise.resolve(datos) } as unknown as Response;
}

function consultaNueva() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function pintar(camino: string) {
  return render(
    <QueryClientProvider client={consultaNueva()}>
      <MemoryRouter initialEntries={[camino]}>
        <Routes>
          <Route path="/" element={<MisEventos />} />
          <Route path="/eventos/nuevo" element={<NuevoEvento />} />
          <Route path="/eventos/:id" element={<DetalleEvento />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const DETALLE_BASE = {
  id: 'abc',
  name: 'Salida a la playa',
  createdAt: '2026-10-01T00:00:00.000Z',
  created_by_name: 'demo_fe',
  participants: [
    { id: 'p1', username: 'ana' },
    { id: 'p2', username: 'bob' },
  ],
  invitations: [] as { id: string; username: string; status: string; createdAt: string }[],
};

describe('MisEventos', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra los eventos con participantes y saldo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          ok([
            { id: '1', name: 'Salida', createdAt: 'x', participants: 2, netCents: 5000 },
            { id: '2', name: 'Cumple', createdAt: 'x', participants: 1, netCents: -2500 },
          ]),
        ),
      ),
    );

    pintar('/');

    expect(await screen.findByText('Salida')).toBeInTheDocument();
    expect(screen.getByText('Cumple')).toBeInTheDocument();
    expect(screen.getByText('2 participantes')).toBeInTheDocument();
    expect(screen.getByText('1 participante')).toBeInTheDocument();
    expect(screen.getByText('Te deben S/ 50.00')).toBeInTheDocument();
    expect(screen.getByText('Debes S/ 25.00')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nuevo evento' })).not.toBeInTheDocument();
  });

  it('muestra la miniatura del grupo cuando el evento tiene imagen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          ok([
            { id: '1', name: 'Salida', createdAt: 'x', participants: 2, netCents: 0, hasImage: true },
            { id: '2', name: 'Cumple', createdAt: 'x', participants: 1, netCents: 0 },
          ]),
        ),
      ),
    );

    pintar('/');

    expect(await screen.findByText('Salida')).toBeInTheDocument();
    expect(screen.getByAltText('')).toHaveAttribute('src', '/api/events/1/image');
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay eventos', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(ok([]))));

    pintar('/');

    expect(await screen.findByText('Aún no hay eventos')).toBeInTheDocument();
    expect(screen.getByText(/botón \+/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear primer evento' })).not.toBeInTheDocument();
  });

  it('muestra el mensaje del servidor cuando la lista falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(fallo(500, { code: 'INTERNAL', message: 'no se pudo cargar' }))),
    );

    pintar('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('no se pudo cargar');
  });
});

describe('NuevoEvento', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('valida el nombre antes de permitir crear', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const usuario = userEvent.setup();
    pintar('/eventos/nuevo');

    const boton = screen.getByRole('button', { name: 'Crear evento' });
    expect(boton).toBeDisabled();

    await usuario.type(screen.getByLabelText('Nombre del evento'), 'Salida');
    expect(boton).toBeEnabled();
  });

  it('crea el evento y navega al detalle', async () => {
    const fetchMock = vi.fn((url: string, _opts?: RequestInit) => {
      if (url === '/api/events') return Promise.resolve(ok({ id: 'abc', name: 'Salida a la playa', createdAt: 'x' }, 201));
      if (url === '/api/events/abc') return Promise.resolve(ok(DETALLE_BASE));
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar('/eventos/nuevo');

    await usuario.type(screen.getByLabelText('Nombre del evento'), 'Salida a la playa');
    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByText('Salida a la playa')).toBeInTheDocument();
    expect(screen.getByText('Creado por demo_fe')).toBeInTheDocument();
  });

  it('muestra el mensaje del servidor si el evento no se crea', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          fallo(400, { code: 'VALIDATION', message: 'el nombre debe tener entre 1 y 60 caracteres' }),
        ),
      ),
    );

    const usuario = userEvent.setup();
    pintar('/eventos/nuevo');

    await usuario.type(screen.getByLabelText('Nombre del evento'), 'Salida');
    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'el nombre debe tener entre 1 y 60 caracteres',
    );
  });
});

describe('DetalleEvento', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lista a los participantes, muestra invitados pendientes e invita', async () => {
    let llamadasGet = 0;
    const fetchMock = vi.fn((url: string, _opts?: RequestInit) => {
      if (url === '/api/events/abc') {
        llamadasGet += 1;
        const invitaciones =
          llamadasGet > 1
            ? [...DETALLE_BASE.invitations, { id: 'i3', username: 'melissa', status: 'PENDIENTE', createdAt: 'x' }]
            : DETALLE_BASE.invitations;
        return Promise.resolve(ok({ ...DETALLE_BASE, invitations: invitaciones }));
      }
      if (url === '/api/events/abc/invitations') {
        return Promise.resolve(ok({ id: 'i3', username: 'melissa', status: 'PENDIENTE' }, 201));
      }
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar('/eventos/abc');

    expect(await screen.findByText('Salida a la playa')).toBeInTheDocument();
    expect(screen.getByText('ana')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Invitar persona'), 'melissa');
    await usuario.click(screen.getByRole('button', { name: 'Invitar' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/events/abc/invitations',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await screen.findByText('melissa')).toBeInTheDocument();
    expect(screen.getByText('Invitado · pendiente')).toBeInTheDocument();
    expect(screen.getByLabelText('Invitar persona')).toHaveValue('');
  });

  it('muestra el mensaje si la invitación ya fue enviada', async () => {
    const fetchMock = vi.fn((url: string, _opts?: RequestInit) => {
      if (url === '/api/events/abc') return Promise.resolve(ok(DETALLE_BASE));
      if (url === '/api/events/abc/invitations') {
        return Promise.resolve(fallo(409, { code: 'CONFLICT', message: 'ya se envió una invitación a este usuario' }));
      }
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar('/eventos/abc');

    await screen.findByText('Salida a la playa');

    await usuario.type(screen.getByLabelText('Invitar persona'), 'ana');
    await usuario.click(screen.getByRole('button', { name: 'Invitar' }));

    expect(
      await screen.findByText('ya se envió una invitación a este usuario'),
    ).toBeInTheDocument();
  });

  it('sugiere usuarios que coinciden con las iniciales y permite invitar', async () => {
    const fetchMock = vi.fn((url: string, _opts?: RequestInit) => {
      if (url === '/api/events/abc') return Promise.resolve(ok(DETALLE_BASE));
      if (url.startsWith('/api/users/search')) {
        return Promise.resolve(ok([{ username: 'melissa' }, { username: 'bob' }, { username: 'mel' }]));
      }
      if (url === '/api/events/abc/invitations') {
        return Promise.resolve(ok({ id: 'i9', username: 'melissa', status: 'PENDIENTE' }, 201));
      }
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar('/eventos/abc');

    await screen.findByText('Salida a la playa');
    await usuario.type(screen.getByLabelText('Invitar persona'), 'mel');

    // 'bob' ya es participante → no debe sugerirse
    expect(await screen.findByRole('button', { name: /melissa/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bob/ })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /melissa/ }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/events/abc/invitations',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('permite cancelar una invitación pendiente', async () => {
    let llamadasGet = 0;
    const conInvitacion = {
      ...DETALLE_BASE,
      invitations: [{ id: 'i1', username: 'melissa', status: 'PENDIENTE', createdAt: 'x' }],
    };
    const fetchMock = vi.fn((url: string, _opts?: RequestInit) => {
      if (url === '/api/events/abc') {
        llamadasGet += 1;
        return Promise.resolve(ok(llamadasGet > 1 ? DETALLE_BASE : conInvitacion));
      }
      if (url === '/api/events/abc/invitations/i1') {
        return Promise.resolve(ok({ id: 'i1', status: 'CANCELADA' }));
      }
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar('/eventos/abc');

    await screen.findByText('Salida a la playa');
    expect(await screen.findByText('melissa')).toBeInTheDocument();
    expect(screen.getByText('Invitado · pendiente')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/events/abc/invitations/i1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    await waitFor(() => expect(screen.queryByText('melissa')).not.toBeInTheDocument());
  });

  it('sube una imagen para identificar al grupo', async () => {
    let llamadasGet = 0;
    const fetchMock = vi.fn((url: string, opts?: RequestInit) => {
      if (url === '/api/events/abc') {
        llamadasGet += 1;
        return Promise.resolve(
          ok({ ...DETALLE_BASE, hasImage: llamadasGet > 1 ? true : false }),
        );
      }
      if (url === '/api/events/abc/image') {
        if (opts?.method === 'POST') {
          expect(opts.body).toBeInstanceOf(FormData);
          return Promise.resolve(ok({ hasImage: true }, 201));
        }
        return Promise.resolve(ok(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 200));
      }
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const usuario = userEvent.setup();
    pintar('/eventos/abc');

    await screen.findByText('Salida a la playa');
    expect(screen.getByLabelText('Subir imagen')).toBeInTheDocument();

    const archivo = new File(['x'], 'grupo.png', { type: 'image/png' });
    await usuario.upload(screen.getByLabelText('Subir imagen'), archivo);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/events/abc/image',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await screen.findByLabelText('Cambiar imagen')).toBeInTheDocument();
    expect(screen.getByAltText('')).toHaveAttribute('src', '/api/events/abc/image');
  });

  it('permite subir la imagen arrastrándola sobre la zona (PC)', async () => {
    let llamadasGet = 0;
    const fetchMock = vi.fn((url: string, opts?: RequestInit) => {
      if (url === '/api/events/abc') {
        llamadasGet += 1;
        return Promise.resolve(ok({ ...DETALLE_BASE, hasImage: llamadasGet > 1 }));
      }
      if (url === '/api/events/abc/image') {
        if (opts?.method === 'POST') return Promise.resolve(ok({ hasImage: true }, 201));
        return Promise.resolve(ok(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 200));
      }
      return Promise.resolve(fallo(404, { code: 'NOT_FOUND' }));
    });
    vi.stubGlobal('fetch', fetchMock);

    pintar('/eventos/abc');

    const zona = await screen.findByText(/Arrastra una imagen aquí/);
    const archivo = new File(['x'], 'grupo.png', { type: 'image/png' });
    fireEvent.drop(zona, { dataTransfer: { files: [archivo] } });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/events/abc/image',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await screen.findByLabelText('Cambiar imagen')).toBeInTheDocument();
  });

  it('muestra el mensaje del servidor si el evento no existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(fallo(404, { code: 'NOT_FOUND', message: 'No encontramos el evento' }))),
    );

    pintar('/eventos/abc');

    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos el evento');
  });
});