import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { misInvitaciones } from '../api/eventos';
import { useSesion } from '../auth/SesionContext';
import { Logo } from './Logo';

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
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
const IconoMas = () => (
  <Icono>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);
const IconoBandeja = () => (
  <Icono>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
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

const CLASE_ICONO =
  'group relative flex h-11 w-11 items-center justify-center rounded-xl text-sobre-barra/60 transition-all duration-150 hover:scale-125 hover:bg-sobre-barra/10 hover:text-sobre-barra';

const INSIGNIA =
  'absolute right-0.5 top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-acento px-1 text-[10px] font-bold leading-none text-sobre-acento';

function EtiquetaFlotante({ texto }: { texto: string }) {
  return (
    <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md bg-barra px-2 py-1 text-xs font-medium text-sobre-barra opacity-0 shadow ring-1 ring-borde group-hover:opacity-100 lg:block">
      {texto}
    </span>
  );
}

function EnlaceNavegacion({
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
  const badge = insignia && insignia > 0 ? insignia : undefined;
  return (
    <NavLink to={to} end={end} title={etiqueta} aria-label={etiqueta} className={CLASE_ICONO}>
      {({ isActive }) => (
        <>
          <span
            className={`flex h-11 w-11 items-center justify-center ${isActive ? 'rounded-xl bg-acento text-sobre-acento' : ''}`}
          >
            {children}
          </span>
          {badge ? <span className={INSIGNIA}>{badge}</span> : null}
          <EtiquetaFlotante texto={etiqueta} />
        </>
      )}
    </NavLink>
  );
}

function BarraLateral() {
  const { cerrar } = useSesion();
  const pendientes = useQuery({ queryKey: ['invitaciones'], queryFn: misInvitaciones });
  const { hasImage, fotoUrl } = useSesion();
  const insignia = pendientes.data?.length ?? 0;
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center gap-2 bg-barra py-6 md:flex">
      <Link to="/" className="mb-4" aria-label="SplitVision — inicio">
        <Logo tam={40} texto={false} sobre="oscuro" />
      </Link>
      <EnlaceNavegacion to="/" end etiqueta="Mis eventos">
        <IconoCasa />
      </EnlaceNavegacion>
      <EnlaceNavegacion to="/deudas" etiqueta="Deudas">
        <IconoDocumento />
      </EnlaceNavegacion>
      <EnlaceNavegacion to="/bandeja" etiqueta="Bandeja" insignia={insignia}>
        <IconoBandeja />
      </EnlaceNavegacion>
      <EnlaceNavegacion to="/eventos/nuevo" etiqueta="Crear evento">
        <IconoMas />
      </EnlaceNavegacion>
      <div className="flex-1" />
      <EnlaceNavegacion to="/configuracion" etiqueta="Configuración">
        {hasImage && fotoUrl ? (
          <img src={fotoUrl} alt="Avatar" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <IconoEngranaje />
        )}
      </EnlaceNavegacion>
      <button type="button" onClick={() => void cerrar()} title="Cerrar sesión" aria-label="Cerrar sesión" className={CLASE_ICONO}>
        <IconoSalir />
        <EtiquetaFlotante texto="Cerrar sesión" />
      </button>
    </aside>
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
  const badge = insignia && insignia > 0 ? insignia : undefined;
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex w-16 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium ${
          isActive ? 'text-acento' : 'text-sobre-barra/60 hover:text-sobre-barra'
        }`
      }
    >
      <span className="relative">
        {children}
        {badge ? <span className={INSIGNIA}>{badge}</span> : null}
      </span>
      {etiqueta}
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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-around bg-barra pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 md:hidden">
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
          className={`-mt-9 flex h-14 w-14 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-lg shadow-acento/40 transition-transform duration-150 ${
            abierto ? 'rotate-45' : ''
          }`}
        >
          <span className="h-7 w-7 text-sobre-acento">
            <IconoMas />
          </span>
        </button>
        {abierto ? (
          <div className="absolute bottom-[4.5rem] z-40 w-52 rounded-xl border border-borde bg-superficie p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => irAccion('/eventos/nuevo')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-texto hover:bg-superficie-2"
            >
              <span className="text-primario">
                <IconoMas />
              </span>
              Crear evento
            </button>
            <button
              type="button"
              onClick={() => irAccion('/deudas')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-texto hover:bg-superficie-2"
            >
              <IconoBillete />
              Realizar pago
            </button>
            <button
              type="button"
              onClick={() => void cerrar()}
              className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-borde-suave px-3 py-2.5 text-left text-sm font-medium text-texto hover:bg-superficie-2"
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
    <div className="min-h-screen">
      <BarraLateral />
      <div className="pb-28 md:pb-0 md:pl-24">
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
      <BarraInferior />
    </div>
  );
}