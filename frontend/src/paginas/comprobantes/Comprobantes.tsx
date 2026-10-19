import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listarComprobantes, reintentarComprobante } from '../../api/comprobantes';
import type { ComprobanteResumen } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { ESTILO_ESTADO, ETIQUETA_ESTADO } from '../../componentes/estadoComprobante';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

export function Comprobantes() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const consulta = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | 'EXTRAÍDO' | 'CONFIRMADO' | 'FALLIDO'>('TODOS');

  const { data, isLoading, isError, error: errorCarga } = useQuery({
    queryKey: ['receipts', id],
    queryFn: () => listarComprobantes(id),
    enabled: Boolean(id),
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.status === 'PROCESANDO') ? 1000 : false,
  });

  const reintentar = useMutation({
    mutationFn: (receiptId: string) => reintentarComprobante(receiptId),
    onSuccess: () => {
      setError(null);
      void consulta.invalidateQueries({ queryKey: ['receipts', id] });
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  const comprobantesFiltrados = (data ?? []).filter((r) => {
    if (filtro === 'TODOS') return true;
    return r.status === filtro;
  });

  const totalCents = (data ?? [])
    .filter((r) => r.status === 'CONFIRMADO' || r.status === 'EXTRAÍDO')
    .reduce((acc, r) => acc + (r.totalCents || 0), 0);

  const confirmadosCount = (data ?? []).filter((r) => r.status === 'CONFIRMADO').length;
  const pendientesCount = (data ?? []).filter((r) => r.status === 'EXTRAÍDO' || r.status === 'PROCESANDO').length;

  return (
    <div className="space-y-6">
      {/* Barra superior de navegación */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={`/eventos/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-texto-suave transition-[color,transform] hover:text-texto active:scale-95"
          >
            ← Volver al evento
          </Link>
        </div>

        <Link
          to={`/eventos/${id}/comprobantes/nuevo`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primario px-4 py-2 text-xs font-bold text-sobre-primario shadow-2xs transition-[background-color,transform] hover:bg-primario-fuerte active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Subir comprobante</span>
        </Link>
      </div>

      {/* Encabezado Principal */}
      <div className="flex flex-col gap-1 border-b border-borde-suave pb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">
            Comprobantes y Gastos
          </h1>
          {data ? (
            <span className="rounded-full bg-superficie-2 border border-borde px-2.5 py-0.5 font-mono text-xs font-semibold text-texto-suave tabular-nums">
              {data.length} {data.length === 1 ? 'boleta' : 'boletas'}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-texto-suave">
          Historial de boletas y facturas cargadas en el grupo para reparto equitativo o por consumos individuales.
        </p>
      </div>

      {/* Mini-Bento informativo de métricas (Aprovecha ancho de pantalla) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-borde-suave bg-superficie p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-texto-suave">Total Consumido</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-tight text-texto tabular-nums">
            {formatCentavos(totalCents)}
          </p>
          <p className="mt-0.5 text-[10px] text-texto-tenue">En comprobantes activos</p>
        </div>
        <div className="rounded-2xl border border-borde-suave bg-superficie p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-texto-suave">Repartos Confirmados</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-tight text-exito tabular-nums">
            {confirmadosCount}
          </p>
          <p className="mt-0.5 text-[10px] text-texto-tenue">Generaron deudas asignadas</p>
        </div>
        <div className="rounded-2xl border border-borde-suave bg-superficie p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-texto-suave">Por Revisar / En Curso</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-tight text-aviso tabular-nums">
            {pendientesCount}
          </p>
          <p className="mt-0.5 text-[10px] text-texto-tenue">Listos para asignar o leyendo</p>
        </div>
      </div>

      {/* Filtros rápidos estilo pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-borde-suave pb-2">
        {(['TODOS', 'EXTRAÍDO', 'CONFIRMADO', 'FALLIDO'] as const).map((modo) => (
          <button
            key={modo}
            type="button"
            onClick={() => setFiltro(modo)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-[background-color,color,transform] active:scale-95 ${
              filtro === modo
                ? 'bg-primario text-sobre-primario shadow-2xs'
                : 'bg-superficie-2 border border-borde-suave text-texto-suave hover:bg-superficie hover:text-texto'
            }`}
          >
            {modo === 'TODOS'
              ? 'Todos'
              : modo === 'EXTRAÍDO'
              ? 'Por revisar'
              : modo === 'CONFIRMADO'
              ? 'Confirmados'
              : 'Lectura fallida'}
          </button>
        ))}
      </div>

      <Tarjeta className="shadow-2xs">
        {isLoading ? <Cargando texto="Cargando comprobantes…" /> : null}
        {isError ? <Alerta tono="error">{mensajeDeError(errorCarga)}</Alerta> : null}
        {error ? <Alerta tono="error">{error}</Alerta> : null}

        {data && comprobantesFiltrados.length === 0 ? (
          <EstadoVacio
            titulo="Sin comprobantes en esta vista"
            mensaje={
              filtro === 'TODOS'
                ? 'Aún no se ha registrado ningún gasto en este evento.'
                : 'No hay comprobantes con el filtro seleccionado.'
            }
            accion={
              filtro === 'TODOS' ? (
                <Link
                  to={`/eventos/${id}/comprobantes/nuevo`}
                  className="mt-3 inline-flex rounded-xl bg-primario px-4 py-2 text-xs font-bold text-sobre-primario shadow-2xs transition hover:bg-primario-fuerte active:scale-95"
                >
                  Subir primer comprobante
                </Link>
              ) : undefined
            }
          />
        ) : null}

        {data && comprobantesFiltrados.length > 0 ? (
          <ul className="divide-y divide-borde-suave">
            {comprobantesFiltrados.map((r) => (
              <FilaComprobante
                key={r.id}
                comprobante={r}
                onReintentar={() => reintentar.mutate(r.id)}
                reintentando={reintentar.isPending && reintentar.variables === r.id}
                onRevisar={() => navigate(`/comprobantes/${r.id}`)}
              />
            ))}
          </ul>
        ) : null}
      </Tarjeta>
    </div>
  );
}

function FilaComprobante({
  comprobante,
  onRevisar,
  onReintentar,
  reintentando,
}: {
  comprobante: ComprobanteResumen;
  onRevisar: () => void;
  onReintentar: () => void;
  reintentando: boolean;
}) {
  const r = comprobante;
  const inicial = (r.payer || 'U').charAt(0).toUpperCase();

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-borde bg-superficie-2 font-mono text-xs font-bold text-texto shadow-2xs">
          {inicial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-texto group-hover:text-primario transition-colors">
              {r.description || `Comprobante ${r.id.slice(0, 8)}`}
            </p>
            {r.mine ? (
              <span className="shrink-0 rounded bg-primario-suave/80 px-1.5 py-0.5 text-[10px] font-bold text-primario">
                Mío
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-texto-suave">
            Pagado por <span className="font-semibold text-texto">{r.payer}</span> ·{' '}
            <span className="font-mono text-[11px] text-texto-tenue">
              {new Date(r.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-texto tabular-nums">
            {formatCentavos(r.totalCents)}
          </p>
          <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTILO_ESTADO[r.status]}`}>
            {ETIQUETA_ESTADO[r.status]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {r.status === 'EXTRAÍDO' ? (
            <Boton onClick={onRevisar}>Revisar gastos</Boton>
          ) : null}
          {r.status === 'CONFIRMADO' ? (
            <Boton variante="secundario" onClick={onRevisar}>
              Ver detalle
            </Boton>
          ) : null}
          {r.status === 'FALLIDO' && r.mine ? (
            <Boton variante="secundario" onClick={onReintentar} disabled={reintentando}>
              {reintentando ? 'Reintentando…' : 'Reintentar'}
            </Boton>
          ) : null}
        </div>
      </div>
    </li>
  );
}
