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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-exito/30 bg-exito-suave/40 px-3 py-1 font-mono text-xs font-bold tabular-nums text-exito shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-exito animate-pulse" />
        Te deben {formatSoles(netCents / 100)}
      </span>
    );
  }
  if (netCents < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primario/30 bg-primario-suave/40 px-3 py-1 font-mono text-xs font-bold tabular-nums text-primario shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-primario" />
        Debes {formatSoles(-netCents / 100)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie-2 px-3 py-1 text-xs font-medium text-texto-tenue shadow-2xs">
      <span className="h-1.5 w-1.5 rounded-full bg-texto-tenue/60" />
      Al día
    </span>
  );
}

function TarjetaEvento({ evento, indice = 0 }: { evento: Evento; indice?: number }) {
  return (
    <Link
      to={`/eventos/${evento.id}`}
      style={{ animationDelay: `${indice * 45}ms` }}
      className="anim-stagger-1 group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-borde/90 bg-superficie p-6 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:border-primario/60 hover:shadow-md active:scale-[0.985]"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {evento.hasImage ? (
              <img
                src={urlImagenEvento(evento.id)}
                alt=""
                className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-borde-suave bg-superficie-2 p-0.5 shadow-2xs transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-borde bg-superficie-2 font-mono text-xl font-bold uppercase text-primario shadow-2xs transition-transform duration-200 group-hover:scale-105">
                {evento.name.slice(0, 1)}
              </span>
            )}

            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold tracking-tight text-texto transition-colors group-hover:text-primario">
                {evento.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-texto-suave">
                <svg className="h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>
                  {evento.participants === 1
                    ? '1 participante'
                    : `${evento.participants} participantes`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-borde/60 bg-superficie-2 text-texto-tenue transition-[transform,color,background-color] group-hover:bg-primario-suave group-hover:text-primario">
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-borde-suave/80 pt-4">
        <Saldo netCents={evento.netCents} />
        <span className="text-xs font-semibold text-texto-suave transition-colors group-hover:text-primario">
          Ver grupo →
        </span>
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
    <div className="space-y-8">
      {/* Encabezado Editorial de Saludo */}
      <header className="anim-stagger-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primario/30 bg-primario-suave/50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primario uppercase tracking-wide">
              Centro de Mando
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-texto sm:text-4xl">
            Mis eventos
          </h1>
          <p className="mt-1 text-sm text-texto-suave max-w-xl">
            Cuentas claras, amistades largas. Monitorea tus salidas grupales, boletas escaneadas y balances consolidados.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/deudas"
            className="inline-flex items-center gap-1.5 rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-xs font-semibold text-texto shadow-2xs transition-[background-color,transform] hover:bg-superficie-2 active:scale-95"
          >
            <svg className="h-3.5 w-3.5 text-texto-suave" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Deudas & Saldos</span>
          </Link>
        </div>
      </header>

      {/* Bento Grid Financial Command Center */}
      {data && data.length > 0 ? (
        <section aria-label="Resumen de balance" className="anim-stagger-2 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Bento Card 1: Balance Consolidado & Cuentas Claras (8 cols) */}
          <div className="relative overflow-hidden rounded-3xl border border-borde bg-superficie p-6 lg:col-span-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primario-suave text-primario">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-texto-suave">
                    SplitVision · Cuentas Claras
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie-2 px-2.5 py-0.5 text-[11px] font-medium text-texto-suave">
                  <span className="h-1.5 w-1.5 rounded-full bg-exito animate-pulse" />
                  Matriz de compensación activa
                </span>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold text-texto-suave">Posición neta consolidada</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <span className={`font-mono text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl ${
                    porCobrar > porPagar ? 'text-exito' : porPagar > porCobrar ? 'text-primario' : 'text-texto'
                  }`}>
                    {porCobrar > porPagar
                      ? `+${formatSoles((porCobrar - porPagar) / 100)}`
                      : porPagar > porCobrar
                        ? `-${formatSoles((porPagar - porCobrar) / 100)}`
                        : 'S/ 0.00'}
                  </span>
                  <span className="text-xs font-medium text-texto-suave">
                    {porCobrar > porPagar
                      ? 'Saldo neto a favor entre todas tus salidas'
                      : porPagar > porCobrar
                        ? 'Saldo total pendiente de liquidar'
                        : 'Todas tus cuentas están saldadas'}
                  </span>
                </div>
              </div>
            </div>

            {/* Métricas en escalones de tono */}
            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-borde-suave pt-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-borde/70 bg-superficie-2/50 p-3.5 transition-[border-color] hover:border-borde">
                <p className="text-xs font-semibold text-texto-suave">Eventos activos</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-texto">{totalEventos}</p>
              </div>
              <div className="rounded-2xl border border-exito/25 bg-exito-suave/20 p-3.5 transition-[border-color] hover:border-exito/40">
                <p className="text-xs font-semibold text-exito">Total por cobrar</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-exito">{formatSoles(porCobrar / 100)}</p>
              </div>
              <div className="rounded-2xl border border-primario/25 bg-primario-suave/20 p-3.5 transition-[border-color] hover:border-primario/40">
                <p className="text-xs font-semibold text-primario">Total por pagar</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-primario">{formatSoles(porPagar / 100)}</p>
              </div>
            </div>
          </div>

          {/* Bento Card 2: SplitVision Scanner Live Hub (4 cols) */}
          <div className="relative overflow-hidden rounded-3xl border border-borde bg-superficie p-6 lg:col-span-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primario/30 bg-primario-suave text-primario">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="rounded-full bg-primario-suave px-2 py-0.5 font-mono text-[10px] font-bold text-primario">
                  OCR VISION
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold text-texto">
                Escáner OCR Inteligente
              </h3>
              <p className="mt-1.5 text-xs text-texto-suave leading-relaxed">
                Fotografía cualquier boleta física o ticket de restaurante. SplitVision desglosa ítems, IGV y montos sin cálculos manuales.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-borde-suave">
              <Link
                to="/deudas"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-borde bg-superficie-2 px-3 py-2.5 text-xs font-semibold text-texto transition-[background-color,transform] hover:bg-superficie-3 active:scale-95"
              >
                <span>Ver deudas & matriz cruzada</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Lista de Grupos y Salidas */}
      <section className="space-y-4">
        {data && data.length > 0 ? (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-texto">
              Tus salidas y grupos activos
            </h2>
            <span className="font-mono text-xs tabular-nums text-texto-suave">
              {totalEventos} {totalEventos === 1 ? 'grupo' : 'grupos'}
            </span>
          </div>
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
          <Tarjeta className="mt-4 border-dashed p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-borde bg-superficie-2 text-primario mb-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <EstadoVacio
              titulo="Aún no hay eventos"
              mensaje="Crea tu primer evento desde el botón + para empezar a dividir gastos con tu grupo."
            />
          </Tarjeta>
        ) : data ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.map((e, index) => (
              <li key={e.id}>
                <TarjetaEvento evento={e} indice={index} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}