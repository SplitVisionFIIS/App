import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { deudas } from '../api/consultas';
import { misInvitaciones } from '../api/eventos';
import { useSesion } from '../auth/SesionContext';
import { formatCentavos } from '../i18n/formato';
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

const IconoDocumento = () => (
  <Icono>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </Icono>
);

function rutaContexto(camino: string): { migas: string[]; titulo: string; seccion: string } {
  if (camino === '/') {
    return {
      migas: ['SplitVision', 'Inicio'],
      titulo: 'Mis Grupos y Eventos',
      seccion: 'Cuentas compartidas',
    };
  }
  if (camino === '/eventos/nuevo') {
    return {
      migas: ['Eventos', 'Nuevo'],
      titulo: 'Crear Nuevo Evento',
      seccion: 'Configura un grupo de gasto',
    };
  }
  if (camino.startsWith('/eventos/') && camino.includes('/comprobantes/nuevo')) {
    return {
      migas: ['Evento', 'Comprobantes', 'Subir'],
      titulo: 'Escanear Comprobante',
      seccion: 'Lectura OCR inteligente',
    };
  }
  if (camino.startsWith('/eventos/') && camino.includes('/comprobantes')) {
    return {
      migas: ['Evento', 'Comprobantes'],
      titulo: 'Comprobantes del Grupo',
      seccion: 'Historial de gastos registrados',
    };
  }
  if (camino.startsWith('/eventos/') && camino.includes('/balance')) {
    return {
      migas: ['Evento', 'Balance'],
      titulo: 'Balance y Liquidación',
      seccion: 'Quién le paga a quién',
    };
  }
  if (camino.startsWith('/eventos/')) {
    return {
      migas: ['Eventos', 'Detalle'],
      titulo: 'Panel del Evento',
      seccion: 'Gastos, participantes y saldos',
    };
  }
  if (camino.startsWith('/comprobantes/') && camino.includes('/reparto')) {
    return {
      migas: ['Comprobante', 'Reparto'],
      titulo: 'Asignación de Consumos',
      seccion: 'División equitativa o por ítems',
    };
  }
  if (camino.startsWith('/comprobantes/')) {
    return {
      migas: ['Comprobante', 'Revisión'],
      titulo: 'Revisión de Comprobante',
      seccion: 'Detalle de ítems y montos',
    };
  }
  if (camino.startsWith('/deudas')) {
    return {
      migas: ['Finanzas', 'Saldos'],
      titulo: 'Mis Deudas y Cobros',
      seccion: 'Liquidaciones pendientes con amigos',
    };
  }
  if (camino.startsWith('/bandeja')) {
    return {
      migas: ['Actividad', 'Bandeja'],
      titulo: 'Bandeja de Notificaciones',
      seccion: 'Invitaciones y comprobantes por confirmar',
    };
  }
  if (camino.startsWith('/configuracion')) {
    return {
      migas: ['Cuenta', 'Ajustes'],
      titulo: 'Configuración de Perfil',
      seccion: 'Datos personales y preferencias',
    };
  }
  return {
    migas: ['SplitVision'],
    titulo: 'SplitVision',
    seccion: 'Cuentas claras',
  };
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
        `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
          isActive
            ? 'bg-primario-suave/80 text-primario font-bold shadow-2xs ring-1 ring-primario/25'
            : 'text-texto-suave hover:bg-superficie-2 hover:text-texto'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? 'bg-primario text-sobre-primario shadow-2xs'
                : 'text-texto-suave group-hover:bg-superficie-3 group-hover:text-texto'
            }`}
          >
            {children}
          </span>
          <span className="truncate">{etiqueta}</span>
          {insignia && insignia > 0 ? (
            <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-acento px-1 text-[10px] font-bold leading-none text-sobre-acento shadow-2xs">
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
  const deudasPendientes = useQuery({
    queryKey: ['debts', 'owing'],
    queryFn: () => deudas({ direction: 'owing' }),
  });
  const deudasPorCobrar = useQuery({
    queryKey: ['debts', 'owed'],
    queryFn: () => deudas({ direction: 'owed' }),
  });
  const deboBruto = (deudasPendientes.data ?? []).reduce(
    (acc, d) => acc + (d.pendingCents || 0),
    0,
  );
  const meDebenBruto = (deudasPorCobrar.data ?? []).reduce(
    (acc, d) => acc + (d.pendingCents || 0),
    0,
  );
  // El saldo neto que el usuario debe transferir en total
  const totalDebo = Math.max(0, deboBruto - meDebenBruto);

  const inicial = (usuario ?? 'U').charAt(0).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-borde/80 bg-superficie text-texto shadow-xs md:flex transition-colors">
      {/* Zona Superior */}
      <div className="flex flex-col gap-5 p-4">
        {/* Identidad / Marca */}
        <div className="flex items-center justify-between pt-1 px-1">
          <Link to="/" className="transition-transform hover:scale-[1.02]" aria-label="SplitVision — inicio">
            <Logo tam={28} texto={true} sobre="claro" />
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-primario/20 bg-primario-suave/40 px-2 py-0.5 text-[10px] font-mono font-bold text-primario">
            <span className="h-1.5 w-1.5 rounded-full bg-primario animate-pulse" />
            v1.0
          </span>
        </div>

        {/* Botón rápido Crear evento */}
        <Link
          to="/eventos/nuevo"
          className="group flex items-center justify-center gap-2 rounded-xl bg-primario px-3.5 py-2.5 text-xs font-bold text-sobre-primario shadow-2xs transition-[background-color,transform] hover:bg-primario-fuerte active:scale-[0.98]"
        >
          <IconoMas className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
          <span>Crear nuevo evento</span>
        </Link>

        {/* Menú de Navegación */}
        <nav className="flex flex-col gap-5">
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-texto-tenue">
              Espacio Social
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
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-texto-tenue">
              Ajustes de Cuenta
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
      <div className="border-t border-borde-suave p-3">
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-borde bg-superficie-2/50 p-2">
          <Link
            to="/configuracion"
            className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            {hasImage && fotoUrl ? (
              <img
                src={fotoUrl}
                alt="Avatar"
                className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-borde"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primario/20 bg-primario-suave font-mono text-xs font-bold text-primario">
                {inicial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-texto">{usuario || 'Usuario'}</p>
              {totalDebo > 0 ? (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-aviso">
                  <span className="h-1.5 w-1.5 rounded-full bg-aviso animate-pulse" />
                  Debes {formatCentavos(totalDebo)}
                </p>
              ) : (
                <p className="flex items-center gap-1 text-[10px] font-medium text-exito">
                  <span className="h-1.5 w-1.5 rounded-full bg-exito" />
                  Cuentas al día
                </p>
              )}
            </div>
          </Link>

          <button
            type="button"
            onClick={() => void cerrar()}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-texto-tenue transition-[background-color,color,transform] hover:bg-peligro-suave/40 hover:text-peligro active:scale-90 focus:outline-none"
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
  const { migas, titulo, seccion } = rutaContexto(ubicacion.pathname);

  const inicial = (usuario ?? 'U').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-borde/80 bg-superficie/90 px-4 backdrop-blur-md sm:px-8 transition-colors">
      {/* Título contextual / Migas */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-texto-suave">
              {migas.map((m, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  <span className={idx === migas.length - 1 ? 'font-bold text-texto' : 'hover:text-texto'}>
                    {m}
                  </span>
                  {idx < migas.length - 1 ? <span className="text-texto-tenue">/</span> : null}
                </span>
              ))}
            </div>
            <span className="sm:hidden max-w-[200px] truncate text-sm font-bold tracking-tight text-texto">{titulo}</span>
          </div>
          <span className="hidden sm:block text-[11px] font-semibold text-texto-suave">
            {titulo} · <span className="font-normal text-texto-tenue">{seccion}</span>
          </span>
        </div>
      </div>

      {/* Utilidades derechas */}
      <div className="flex items-center gap-2.5">
        {/* Notificaciones */}
        <Link
          to="/bandeja"
          title="Bandeja de notificaciones"
          className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-borde bg-superficie text-texto-suave shadow-2xs transition-[background-color,transform] hover:bg-superficie-2 hover:text-texto active:scale-95"
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
          className="flex items-center gap-2 rounded-xl border border-borde bg-superficie p-1 shadow-2xs transition-[background-color,transform] hover:bg-superficie-2 active:scale-95"
        >
          {hasImage && fotoUrl ? (
            <img src={fotoUrl} alt="" className="h-6 w-6 rounded-lg object-cover" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-primario/20 bg-primario-suave font-mono text-[11px] font-bold text-primario">
              {inicial}
            </span>
          )}
          <span className="hidden text-xs font-semibold text-texto sm:inline sm:pr-1.5">
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
        `relative flex flex-1 flex-col items-center justify-center py-1.5 text-[10px] transition-all duration-100 active:scale-95 select-none ${
          isActive ? 'text-primario font-bold' : 'text-texto-suave hover:text-texto font-medium'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute top-0 h-0.5 w-6 rounded-full bg-primario" />
          ) : null}
          <span className="relative flex h-5 w-5 items-center justify-center">
            {children}
            {insignia && insignia > 0 ? (
              <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-acento px-1 text-[9px] font-bold text-sobre-acento shadow-2xs">
                {insignia}
              </span>
            ) : null}
          </span>
          <span className="mt-1 truncate tracking-tight">{etiqueta}</span>
        </>
      )}
    </NavLink>
  );
}

function BarraInferior() {
  const pendientes = useQuery({ queryKey: ['invitaciones'], queryFn: misInvitaciones });
  const insignia = pendientes.data?.length ?? 0;

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] items-center justify-around border-t border-borde/80 bg-superficie/95 px-2 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl md:hidden transition-colors shadow-sm"
    >
      <EnlaceMovil to="/" end etiqueta="Eventos">
        <IconoCasa />
      </EnlaceMovil>
      <EnlaceMovil to="/deudas" etiqueta="Deudas">
        <IconoDocumento />
      </EnlaceMovil>
      <NavLink
        to="/eventos/nuevo"
        className={({ isActive }) =>
          `relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-100 active:scale-95 select-none ${
            isActive ? 'text-primario font-bold' : 'text-texto-suave font-medium'
          }`
        }
      >
        <span className="flex h-7 w-10 items-center justify-center rounded-full bg-primario text-sobre-primario shadow-2xs">
          <IconoMas className="h-4 w-4" />
        </span>
        <span className="mt-0.5 text-[10px] tracking-tight">Nuevo</span>
      </NavLink>
      <EnlaceMovil to="/bandeja" etiqueta="Bandeja" insignia={insignia}>
        <IconoBandeja />
      </EnlaceMovil>
      <EnlaceMovil to="/configuracion" etiqueta="Perfil">
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
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <BarraInferior />
    </div>
  );
}