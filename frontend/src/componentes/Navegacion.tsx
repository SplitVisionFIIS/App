import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { misInvitaciones } from '../api/eventos';
import { useSesion } from '../auth/SesionContext';
import { Logo } from './Logo';

function Icono({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconoCasa = () => (
  <Icono>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
  </Icono>
);

const IconoMas = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);

const IconoBandeja = () => (
  <Icono>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Icono>
);

const IconoCampana = () => (
  <Icono>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icono>
);

const IconoEngranaje = () => (
  <Icono>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icono>
);

const IconoSalir = () => (
  <Icono>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Icono>
);

const IconoBillete = () => (
  <Icono>
    <circle cx="12" cy="12" r="3" />
    <path d="M3 7v10M21 7v10M7 3h10M7 21h10" />
  </Icono>
);

const IconoDocumento = () => (
  <Icono>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </Icono>
);

function tituloDeRuta(camino: string): { titulo: string; seccion: string } {
  if (camino === '/') return { titulo: 'Mis eventos', seccion: 'Panel principal' };
  if (camino === '/eventos/nuevo') return { titulo: 'Crear nuevo evento', seccion: 'Eventos' };
  if (camino.startsWith('/eventos/') && camino.includes('/balance')) return { titulo: 'Balance del evento', seccion: 'Eventos' };
  if (camino.startsWith('/eventos/') && camino.includes('/comprobantes')) return { titulo: 'Comprobantes del evento', seccion: 'Eventos' };
  if (camino.startsWith('/eventos/')) return { titulo: 'Detalle del evento', seccion: 'Eventos' };
  if (camino.startsWith('/deudas')) return { titulo: 'Mis deudas & saldos', seccion: 'Finanzas' };
  if (camino.startsWith('/bandeja')) return { titulo: 'Bandeja de notificaciones', seccion: 'Mensajes' };
  if (camino.startsWith('/configuracion')) return { titulo: 'Configuración y perfil', seccion: 'Ajustes' };
  return { titulo: 'SplitVision', seccion: 'App' };
}

function ItemSidebar({
  to,
  etiqueta,
  end,
  insignia,
  children,
}: {
  to: string;
  etiqueta: string;
  end?: boolean;
  insignia?: number;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
          isActive
            ? 'bg-white/12 text-white shadow-xs font-bold'
            : 'text-sobre-barra/70 hover:bg-white/8 hover:text-sobre-barra'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? 'bg-acento text-sobre-acento'
                : 'text-sobre-barra/70 group-hover:text-sobre-barra group-hover:bg-white/5'
            }`}
          >
            {children}
          </span>
          <span className="truncate">{etiqueta}</span>
          {insignia && insignia > 0 ? (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-acento px-1.5 text-[11px] font-bold leading-none text-sobre-acento shadow-xs">
              {insignia}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function BarraLateral() {
  const { usuario, hasImage, fotoUrl, cerrar } = useSesion();
  const pendientes = useQuery({ queryKey: ['invitaciones'], queryFn: misInvitaciones });
  const insignia = pendientes.data?.length ?? 0;

  const inicial = (usuario ?? 'U').charAt(0).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-white/10 bg-barra text-sobre-barra shadow-2xl md:flex">
      {/* Zona Superior */}
      <div className="flex flex-col gap-6 p-5">
        {/* Identidad / Marca */}
        <div className="flex items-center justify-between pt-1">
          <Link to="/" className="transition-transform hover:scale-[1.02]" aria-label="SplitVision — inicio">
            <Logo tam={34} texto={true} sobre="oscuro" />
          </Link>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-acento">
            v1.0
          </span>
        </div>

        {/* Botón rápido Crear evento */}
        <Link
          to="/eventos/nuevo"
          className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primario-500 to-primario-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-primario-900/40 transition-all hover:from-primario-600 hover:to-primario-700 hover:shadow-md active:scale-[0.98]"
        >
          <IconoMas className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
          <span>Crear nuevo evento</span>
        </Link>

        {/* Menú de Navegación */}
        <nav className="flex flex-col gap-5">
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-sobre-barra/40">
              Principal
            </p>
            <div className="flex flex-col gap-1">
              <ItemSidebar to="/" end etiqueta="Mis eventos">
                <IconoCasa />
              </ItemSidebar>
              <ItemSidebar to="/deudas" etiqueta="Deudas & Saldos">
                <IconoDocumento />
              </ItemSidebar>
              <ItemSidebar to="/bandeja" etiqueta="Bandeja de entrada" insignia={insignia}>
                <IconoBandeja />
              </ItemSidebar>
            </div>
          </div>

          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-sobre-barra/40">
              Preferencias
            </p>
            <div className="flex flex-col gap-1">
              <ItemSidebar to="/configuracion" etiqueta="Configuración">
                <IconoEngranaje />
              </ItemSidebar>
            </div>
          </div>
        </nav>
      </div>

      {/* Zona Inferior: Perfil de usuario y Logout */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-2.5">
          <Link
            to="/configuracion"
            className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            {hasImage && fotoUrl ? (
              <img
                src={fotoUrl}
                alt="Avatar"
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/15"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primario-suave text-sm font-bold text-primario shadow-inner">
                {inicial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{usuario || 'Usuario'}</p>
              <p className="flex items-center gap-1.5 text-[10px] text-exito font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-exito animate-pulse" />
                En línea
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => void cerrar()}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sobre-barra/60 transition-colors hover:bg-peligro/20 hover:text-peligro focus:outline-none"
          >
            <IconoSalir />
          </button>
        </div>
      </div>
    </aside>
  );
}

function BarraSuperior() {
  const ubicacion = useLocation();
  const { usuario, hasImage, fotoUrl } = useSesion();
  const pendientes = useQuery({ queryKey: ['invitaciones'], queryFn: misInvitaciones });
  const insignia = pendientes.data?.length ?? 0;
  const { titulo, seccion } = tituloDeRuta(ubicacion.pathname);

  const inicial = (usuario ?? 'U').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-borde/70 bg-superficie/85 px-4 backdrop-blur-md sm:px-8">
      {/* Título contextual / Migas */}
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-tenue">
          {seccion}
        </span>
        <span className="text-base font-bold text-texto sm:text-lg">{titulo}</span>
      </div>

      {/* Utilidades derechas */}
      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <Link
          to="/bandeja"
          title="Bandeja de notificaciones"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-borde bg-superficie text-texto-suave shadow-2xs transition-colors hover:border-borde/90 hover:bg-superficie-2 hover:text-texto active:scale-95"
        >
          <IconoCampana />
          {insignia > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-acento px-1 text-[10px] font-bold text-sobre-acento shadow-xs">
              {insignia}
            </span>
          ) : null}
        </Link>

        {/* Perfil directo */}
        <Link
          to="/configuracion"
          className="flex items-center gap-2 rounded-xl border border-borde bg-superficie p-1.5 shadow-2xs transition-colors hover:border-borde/90 hover:bg-superficie-2 active:scale-95"
        >
          {hasImage && fotoUrl ? (
            <img src={fotoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primario-suave text-xs font-bold text-primario">
              {inicial}
            </span>
          )}
          <span className="hidden text-xs font-semibold text-texto sm:inline sm:pr-2">
            {usuario}
          </span>
        </Link>
      </div>
    </header>
  );
}

function EnlaceMovil({
  to,
  etiqueta,
  end,
  insignia,
  children,
}: {
  to: string;
  etiqueta: string;
  end?: boolean;
  insignia?: number;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-colors ${
          isActive ? 'text-acento font-extrabold' : 'text-sobre-barra/70 hover:text-sobre-barra'
        }`
      }
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        {children}
        {insignia && insignia > 0 ? (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-acento px-1 text-[9px] font-bold text-sobre-acento">
            {insignia}
          </span>
        ) : null}
      </span>
      <span>{etiqueta}</span>
    </NavLink>
  );
}

function BarraInferior() {
  const { cerrar } = useSesion();
  const navegar = useNavigate();
  const pendientes = useQuery({ queryKey: ['invitaciones'], queryFn: misInvitaciones });
  const insignia = pendientes.data?.length ?? 0;
  const [abierto, setAbierto] = useState(false);

  const irAccion = (ruta: string) => {
    setAbierto(false);
    navegar(ruta);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-around border-t border-white/10 bg-barra/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden shadow-2xl">
      <EnlaceMovil to="/" end etiqueta="Inicio">
        <IconoCasa />
      </EnlaceMovil>
      <EnlaceMovil to="/deudas" etiqueta="Deudas">
        <IconoDocumento />
      </EnlaceMovil>
      <EnlaceMovil to="/bandeja" etiqueta="Bandeja" insignia={insignia}>
        <IconoBandeja />
      </EnlaceMovil>

      <div className="relative flex flex-col items-center">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-label="Acciones rápidas"
          aria-expanded={abierto}
          className={`-mt-9 flex h-14 w-14 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-lg shadow-acento/40 transition-transform duration-150 active:scale-95 ${
            abierto ? 'rotate-45' : ''
          }`}
        >
          <span className="h-7 w-7 text-sobre-acento">
            <IconoMas />
          </span>
        </button>
        {abierto ? (
          <div className="absolute bottom-[4.5rem] z-40 w-52 rounded-2xl border border-borde bg-superficie/98 p-2 shadow-2xl backdrop-blur-lg">
            <button
              type="button"
              onClick={() => irAccion('/eventos/nuevo')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-texto hover:bg-superficie-2 transition-colors"
            >
              <span className="text-primario">
                <IconoMas />
              </span>
              Crear evento
            </button>
            <button
              type="button"
              onClick={() => irAccion('/deudas')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-texto hover:bg-superficie-2 transition-colors"
            >
              <IconoBillete />
              Realizar pago
            </button>
            <button
              type="button"
              onClick={() => void cerrar()}
              className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-borde-suave px-3 py-2.5 text-left text-sm font-semibold text-peligro hover:bg-peligro-suave/30 transition-colors"
            >
              <IconoSalir />
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>

      <EnlaceMovil to="/configuracion" etiqueta="Ajustes">
        <IconoEngranaje />
      </EnlaceMovil>
    </nav>
  );
}

export function Navegacion({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-fondo text-texto">
      <BarraLateral />
      <div className="pb-24 md:pb-8 md:pl-64">
        <BarraSuperior />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <BarraInferior />
    </div>
  );
}