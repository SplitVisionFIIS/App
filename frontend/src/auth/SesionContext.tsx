import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { EVENTO_SESION_CADUCADA, enviar, obtener } from '../api/client';
import type { SesionActual } from '../api/tipos';

type Estado = 'cargando' | 'listo';

export type Sesion = {
  estado: Estado;
  usuario: string | null;
  hasImage: boolean;
  fotoUrl: string | null;
  iniciar: (usuario: string) => void;
  refrescar: () => Promise<void>;
  cerrar: () => Promise<void>;
};

const ContextoSesion = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');

  const refrescar = async () => {
    try {
      const r = await obtener<SesionActual>('/api/auth/me');
      setUsuario(r.username);
      setHasImage(Boolean(r.hasImage));
      setFotoUrl(r.imageUrl ?? null);
    } catch {
      setUsuario(null);
      setHasImage(false);
      setFotoUrl(null);
    }
  };

  useEffect(() => {
    let vivo = true;
    obtener<SesionActual>('/api/auth/me')
      .then((r) => {
        if (!vivo) return;
        setUsuario(r.username);
        setHasImage(Boolean(r.hasImage));
        setFotoUrl(r.imageUrl ?? null);
      })
      .catch(() => {
        if (!vivo) return;
        setUsuario(null);
        setHasImage(false);
        setFotoUrl(null);
      })
      .finally(() => {
        if (vivo) setEstado('listo');
      });

    const alCaducar = () => {
      setUsuario(null);
      setHasImage(false);
      setFotoUrl(null);
    };
    window.addEventListener(EVENTO_SESION_CADUCADA, alCaducar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_SESION_CADUCADA, alCaducar);
    };
  }, []);

  const iniciar = (nombre: string) => setUsuario(nombre);

  const cerrar = async () => {
    try {
      await enviar('/api/auth/logout', {});
    } catch {
      // sin sesión que limpiar del lado del servidor
    }
    setUsuario(null);
    setHasImage(false);
    setFotoUrl(null);
  };

  return (
    <ContextoSesion.Provider
      value={{ estado, usuario, hasImage, fotoUrl, iniciar, refrescar, cerrar }}
    >
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion(): Sesion {
  const ctx = useContext(ContextoSesion);
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return ctx;
}
