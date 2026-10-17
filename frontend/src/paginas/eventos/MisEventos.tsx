import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listarEventos, urlImagenEvento } from '../../api/eventos';
import type { Evento } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatSoles } from '../../i18n/formato';

function Saldo({ netCents }: { netCents: number }) {
  if (netCents > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-exito/30 bg-exito-suave/40 px-3 py-1 text-xs font-bold text-exito">
        <span className="h-1.5 w-1.5 rounded-full bg-exito" />
        Te deben {formatSoles(netCents / 100)}
      </span>
    );
  }
  if (netCents < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primario/30 bg-primario-suave/40 px-3 py-1 text-xs font-bold text-primario">
        <span className="h-1.5 w-1.5 rounded-full bg-primario" />
        Debes {formatSoles(-netCents / 100)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie-2 px-3 py-1 text-xs font-medium text-texto-tenue">
      <span className="h-1.5 w-1.5 rounded-full bg-texto-tenue/60" />
      Al día
    </span>
  );
}

function TarjetaEvento({ evento }: { evento: Evento }) {
  return (
    <Link
      to={`/eventos/${evento.id}`}
      className="group block rounded-2xl border border-borde bg-superficie p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primario/50 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start gap-4">
        {evento.hasImage ? (
          <img
            src={urlImagenEvento(evento.id)}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-contain border border-borde-suave bg-superficie-2 p-1"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primario-suave to-primario-100 text-xl font-bold uppercase text-primario shadow-inner">
            {evento.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-bold text-texto group-hover:text-primario transition-colors">
              {evento.name}
            </h3>
            <svg
              className="h-4 w-4 shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5 group-hover:text-primario"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <p className="mt-1 flex items-center gap-1 text-xs text-texto-suave">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {evento.participants === 1
              ? '1 participante'
              : `${evento.participants} participantes`}
          </p>

          <div className="mt-4">
            <Saldo netCents={evento.netCents} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MisEventos() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['eventos'],
    queryFn: listarEventos,
  });

  const totalEventos = data?.length ?? 0;
  const porCobrar = (data ?? []).reduce((acc, e) => (e.netCents > 0 ? acc + e.netCents : acc), 0);
  const porPagar = (data ?? []).reduce((acc, e) => (e.netCents < 0 ? acc + Math.abs(e.netCents) : acc), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">Mis eventos</h1>
        <p className="text-sm text-texto-suave">
          Supervisa tus grupos de gastos, comprobantes OCR y balances compartidos.
        </p>
      </header>

      {/* Resumen rápido de balances */}
      {data && data.length > 0 ? (
        <section aria-label="Resumen de balance" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-borde bg-superficie p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-texto-suave">Eventos activos</p>
            <p className="mt-1 text-2xl font-bold text-texto">{totalEventos}</p>
          </div>
          <div className="rounded-2xl border border-exito/25 bg-exito-suave/25 p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-exito">Total por cobrar</p>
            <p className="mt-1 text-2xl font-bold text-exito">{formatSoles(porCobrar / 100)}</p>
          </div>
          <div className="rounded-2xl border border-primario/25 bg-primario-suave/25 p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-primario">Total por pagar</p>
            <p className="mt-1 text-2xl font-bold text-primario">{formatSoles(porPagar / 100)}</p>
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <Cargando texto="Cargando tus eventos…" />
      ) : isError ? (
        <Tarjeta className="mt-4">
          <div className="flex flex-col items-start gap-3">
            <Alerta tono="error">{mensajeDeError(error)}</Alerta>
            <Boton variante="secundario" onClick={() => void refetch()}>
              Reintentar
            </Boton>
          </div>
        </Tarjeta>
      ) : data && data.length === 0 ? (
        <Tarjeta className="mt-4">
          <EstadoVacio
            titulo="Aún no hay eventos"
            mensaje="Crea tu primer evento desde el botón + para empezar a dividir gastos con tu grupo."
          />
        </Tarjeta>
      ) : data ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((e) => (
            <li key={e.id}>
              <TarjetaEvento evento={e} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}