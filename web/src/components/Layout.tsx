import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BotonSecundario } from './ui';

export function Layout() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/eventos" className="text-lg font-semibold text-indigo-700">
            SplitVision
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{usuario?.username}</span>
            <BotonSecundario onClick={cerrarSesion}>Cerrar sesion</BotonSecundario>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
