import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Cargando } from '../componentes/Cargando';
import { useSesion } from './SesionContext';

export function RutaProtegida({ children }: { children: ReactNode }) {
  const { estado, usuario } = useSesion();
  if (estado === 'cargando') return <Cargando texto="Verificando sesión…" />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RutaPublica({ children }: { children: ReactNode }) {
  const { estado, usuario } = useSesion();
  if (estado === 'cargando') return <Cargando texto="Verificando sesión…" />;
  if (usuario) return <Navigate to="/" replace />;
  return <>{children}</>;
}
