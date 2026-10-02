import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, guardarToken, obtenerToken, type Usuario } from '../api/client';

interface EstadoAuth {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (identificador: string, password: string) => Promise<void>;
  registrarse: (username: string, email: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
}

const ContextoAuth = createContext<EstadoAuth | null>(null);

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) {
      setCargando(false);
      return;
    }
    api
      .get<{ usuario: Usuario }>('/auth/me')
      .then((datos) => setUsuario(datos.usuario))
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, []);

  const valor = useMemo<EstadoAuth>(
    () => ({
      usuario,
      cargando,
      iniciarSesion: async (identificador, password) => {
        const datos = await api.post<{ usuario: Usuario; token: string }>('/auth/login', {
          identificador,
          password,
        });
        guardarToken(datos.token);
        setUsuario(datos.usuario);
      },
      registrarse: async (username, email, password) => {
        const datos = await api.post<{ usuario: Usuario; token: string }>('/auth/registro', {
          username,
          email,
          password,
        });
        guardarToken(datos.token);
        setUsuario(datos.usuario);
      },
      cerrarSesion: () => {
        guardarToken(null);
        setUsuario(null);
      },
    }),
    [usuario, cargando],
  );

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}

export function useAuth(): EstadoAuth {
  const contexto = useContext(ContextoAuth);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de ProveedorAuth');
  }
  return contexto;
}
