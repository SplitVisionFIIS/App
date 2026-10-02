import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProveedorAuth, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Eventos } from './pages/Eventos';
import { EventoDetalle } from './pages/EventoDetalle';
import { Login } from './pages/Login';
import { Registro } from './pages/Registro';
import './index.css';

const consultor = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000 },
  },
});

function Privado({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  if (cargando) {
    return <p className="mt-16 text-center text-sm text-slate-500">Cargando sesion...</p>;
  }
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function Publico({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  if (cargando) {
    return <p className="mt-16 text-center text-sm text-slate-500">Cargando sesion...</p>;
  }
  if (usuario) {
    return <Navigate to="/eventos" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={consultor}>
      <ProveedorAuth>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <Publico>
                  <Login />
                </Publico>
              }
            />
            <Route
              path="/registro"
              element={
                <Publico>
                  <Registro />
                </Publico>
              }
            />
            <Route
              element={
                <Privado>
                  <Layout />
                </Privado>
              }
            >
              <Route path="/eventos" element={<Eventos />} />
              <Route path="/eventos/:eventoId" element={<EventoDetalle />} />
            </Route>
            <Route path="*" element={<Navigate to="/eventos" replace />} />
          </Routes>
        </BrowserRouter>
      </ProveedorAuth>
    </QueryClientProvider>
  );
}
