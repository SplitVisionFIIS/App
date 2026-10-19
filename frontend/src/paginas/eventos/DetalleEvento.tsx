import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eliminarComprobante, listarComprobantes } from '../../api/comprobantes';
import { obtenerBalance } from '../../api/consultas';
import {
  invitarAEvento,
  buscarUsuarios,
  cancelarInvitacion,
  obtenerEvento,
  subirImagenEvento,
  urlImagenEvento,
  compensarSaldosEvento,
} from '../../api/eventos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { Campo } from '../../componentes/Campo';
import { ESTILO_ESTADO, ETIQUETA_ESTADO } from '../../componentes/estadoComprobante';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

export type LiquidacionSugerida = {
  deudor: string;
  acreedor: string;
  montoCents: number;
};

export function calcularLiquidacion(
  participantes: { username: string; netCents: number }[],
): LiquidacionSugerida[] {
  const deudores = participantes
    .filter((p) => p.netCents < 0)
    .map((p) => ({ username: p.username, debe: -p.netCents }))
    .sort((a, b) => b.debe - a.debe);

  const acreedores = participantes
    .filter((p) => p.netCents > 0)
    .map((p) => ({ username: p.username, recibe: p.netCents }))
    .sort((a, b) => b.recibe - a.recibe);

  const liquidaciones: LiquidacionSugerida[] = [];
  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const d = deudores[i];
    const a = acreedores[j];
    const pago = Math.min(d.debe, a.recibe);

    if (pago > 0) {
      liquidaciones.push({
        deudor: d.username,
        acreedor: a.username,
        montoCents: pago,
      });
    }

    d.debe -= pago;
    a.recibe -= pago;

    if (d.debe <= 0) i++;
    if (a.recibe <= 0) j++;
  }

  return liquidaciones;
}

function Inicial({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-borde bg-superficie-2 font-mono text-xs font-semibold uppercase text-texto shadow-2xs select-none">
      {nombre.slice(0, 1)}
    </span>
  );
}

export function DetalleEvento() {
  const { id = '' } = useParams();
  const consulta = useQueryClient();
  const [query, setQuery] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [compensando, setCompensando] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['evento', id],
    queryFn: () => obtenerEvento(id),
    enabled: Boolean(id),
  });

  const comprobantes = useQuery({
    queryKey: ['receipts', id],
    queryFn: () => listarComprobantes(id),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.some((r) => r.status === 'PROCESANDO') ? 1000 : false),
  });

  const balanceQuery = useQuery({
    queryKey: ['balance', id],
    queryFn: () => obtenerBalance(id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });

  const liquidaciones = balanceQuery.data?.participants
    ? calcularLiquidacion(balanceQuery.data.participants)
    : [];

  const busqueda = query.trim();
  const { data: sugerencias } = useQuery({
    queryKey: ['usuarios', busqueda],
    queryFn: () => buscarUsuarios(busqueda),
    enabled: busqueda.length >= 2,
  });

  const yaEnEvento = new Set([
    ...(data?.participants ?? []).map((p) => p.username),
    ...(data?.invitations ?? []).filter((i) => i.status === 'PENDIENTE').map((i) => i.username),
  ]);
  const opciones = (sugerencias ?? []).filter((u) => !yaEnEvento.has(u.username));

  const invitar = async (usuario: string) => {
    const nombre = usuario.trim();
    if (!nombre || enviando) return;
    setEnviando(true);
    setErrorForm(null);
    try {
      await invitarAEvento(id, nombre);
      setQuery('');
      void consulta.invalidateQueries({ queryKey: ['evento', id] });
      void consulta.invalidateQueries({ queryKey: ['eventos'] });
      void consulta.invalidateQueries({ queryKey: ['invitaciones'] });
    } catch (err) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const agregar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void invitar(query);
  };

  const cancelar = async (invitationId: string) => {
    if (cancelandoId) return;
    setCancelandoId(invitationId);
    setErrorForm(null);
    try {
      await cancelarInvitacion(id, invitationId);
      void consulta.invalidateQueries({ queryKey: ['evento', id] });
      void consulta.invalidateQueries({ queryKey: ['invitaciones'] });
      void consulta.invalidateQueries({ queryKey: ['eventos'] });
    } catch (err) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setCancelandoId(null);
    }
  };

  const cambiarImagen = async (archivo: File | undefined) => {
    if (!archivo || subiendoImagen) return;
    setSubiendoImagen(true);
    setErrorImagen(null);
    try {
      await subirImagenEvento(id, archivo);
      void consulta.invalidateQueries({ queryKey: ['evento', id] });
      void consulta.invalidateQueries({ queryKey: ['eventos'] });
    } catch (err) {
      setErrorImagen(mensajeDeError(err));
    } finally {
      setSubiendoImagen(false);
    }
  };

  const borrarComprobante = async (receiptId: string, desc: string) => {
    if (eliminandoId) return;
    const seguro = window.confirm(`¿Deseas eliminar "${desc}"? Esta acción cancelará las lecturas y no se puede deshacer.`);
    if (!seguro) return;

    setEliminandoId(receiptId);
    try {
      await eliminarComprobante(receiptId);
      setNotificacion(`Comprobante eliminado con éxito`);
      setTimeout(() => setNotificacion(null), 3000);
      await Promise.all([
        consulta.invalidateQueries({ queryKey: ['receipts', id] }),
        consulta.invalidateQueries({ queryKey: ['balance', id] }),
        consulta.invalidateQueries({ queryKey: ['eventos'] }),
        consulta.invalidateQueries({ queryKey: ['debts'] }),
        consulta.invalidateQueries({ queryKey: ['pending'] }),
      ]);
      await comprobantes.refetch();
      await balanceQuery.refetch();
    } catch (err) {
      alert(mensajeDeError(err));
    } finally {
      setEliminandoId(null);
    }
  };

  const ejecutarCompensacion = async () => {
    if (compensando || !id) return;
    setCompensando(true);
    try {
      const res = await compensarSaldosEvento(id);
      await Promise.all([
        consulta.invalidateQueries({ queryKey: ['balance', id] }),
        consulta.invalidateQueries({ queryKey: ['evento', id] }),
        consulta.invalidateQueries({ queryKey: ['deudas'] }),
        consulta.invalidateQueries({ queryKey: ['debts'] }),
      ]);
      setNotificacion(
        res.compensatedCents > 0
          ? `¡Compensación exitosa! Se cruzaron ${formatCentavos(res.compensatedCents)} de consumos mutuos.`
          : 'No se encontraron saldos mutuos pendientes de compensar.',
      );
    } catch (err) {
      alert(mensajeDeError(err));
    } finally {
      setCompensando(false);
    }
  };

  const copiarParaWhatsApp = () => {
    const total = balanceQuery.data?.totals.spentCents ?? 0;
    let texto = `*SplitVision | Cuentas Claras* 🏖️\n`;
    texto += `*Evento:* ${data?.name || 'Grupo'}\n`;
    texto += `*Total consumido:* ${formatCentavos(total)}\n\n`;

    if (liquidaciones.length === 0) {
      texto += `✨ *¡Todo saldado!* Nadie tiene deudas pendientes en este momento.\n`;
    } else {
      texto += `💸 *Liquidación (quién le paga a quién):*\n`;
      liquidaciones.forEach((liq) => {
        texto += `• *${liq.deudor}* ➔ *${liq.acreedor}*: ${formatCentavos(liq.montoCents)} (Yape/Plin)\n`;
      });
    }

    texto += `\n_Cuentas claras, amistades largas_ 🤝`;

    void navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-texto-suave transition-[color,transform] hover:text-texto active:scale-95"
        >
          ← Mis eventos
        </Link>
      </div>

      {notificacion ? (
        <div className="rounded-xl border border-exito/30 bg-exito-suave/40 px-4 py-2.5 text-xs font-semibold text-exito shadow-2xs alerta-entrada">
          {notificacion}
        </div>
      ) : null}

      {isLoading ? (
        <Cargando texto="Cargando evento…" />
      ) : isError ? (
        <Tarjeta className="mt-4">
          <div className="flex flex-col items-start gap-3">
            <Alerta tono="error">{mensajeDeError(error)}</Alerta>
            <Boton variante="secundario" onClick={() => void refetch()}>
              Reintentar
            </Boton>
          </div>
        </Tarjeta>
      ) : data ? (
        <>
          {/* Tarjeta Hero del Evento */}
          <section className="rounded-2xl border border-borde bg-superficie p-6 shadow-xs sm:p-7 anim-stagger-1">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {data.hasImage ? (
                  <img
                    src={urlImagenEvento(data.id)}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-2xl object-cover border border-borde-suave shadow-2xs"
                  />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-borde bg-superficie-2 font-mono text-3xl font-bold uppercase text-primario shadow-2xs">
                    {data.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">{data.name}</h1>
                  {data.created_by_name ? (
                    <p className="mt-1 text-xs text-texto-suave">
                      Creado por {data.created_by_name}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/eventos/${data.id}/balance`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primario/30 bg-primario-suave/40 px-3 py-1.5 text-xs font-semibold text-primario transition-[background-color,transform] hover:bg-primario-suave hover:text-primario-fuerte active:scale-[0.97]"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Ver balance del evento
                    </Link>
                  </div>
                </div>
              </div>

              {/* Botón rápido para subir comprobante */}
              <div className="flex items-center gap-2">
                <Link
                  to={`/eventos/${id}/comprobantes/nuevo`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primario px-4 py-2.5 text-sm font-semibold text-sobre-primario shadow-xs transition-[background-color,transform,box-shadow] hover:bg-primario-fuerte active:scale-[0.97]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Subir comprobante</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Grid de 2 Columnas para Distribución de Espacio */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 anim-stagger-2">
            {/* Columna Principal: Comprobantes & Liquidación */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-8">
              {/* Sección Comprobantes */}
              <section>
                <div className="flex items-center justify-between pb-2.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-texto">
                      Comprobantes
                    </h2>
                    {comprobantes.data ? (
                      <span className="font-mono text-xs text-texto-suave tabular-nums">
                        ({comprobantes.data.length})
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/eventos/${id}/comprobantes`}
                      className="text-xs font-semibold text-texto-suave transition-colors hover:text-texto"
                    >
                      Ver todos
                    </Link>
                    <Link
                      to={`/eventos/${id}/comprobantes/nuevo`}
                      className="text-xs font-bold text-primario transition-colors hover:text-primario-fuerte"
                    >
                      + Subir
                    </Link>
                  </div>
                </div>

                <Tarjeta className="shadow-2xs">
                  {comprobantes.isLoading ? <Cargando texto="Cargando comprobantes…" /> : null}
                  {comprobantes.isError ? <Alerta tono="error">{mensajeDeError(comprobantes.error)}</Alerta> : null}
                  {comprobantes.data && comprobantes.data.length === 0 ? (
                    <EstadoVacio
                      titulo="Aún no hay comprobantes"
                      mensaje="Sube una foto del gasto o regístralo manualmente."
                      accion={
                        <Link
                          to={`/eventos/${id}/comprobantes/nuevo`}
                          className="mt-3 inline-flex rounded-xl bg-primario px-4 py-2 text-sm font-semibold text-sobre-primario shadow-sm hover:bg-primario-fuerte transition"
                        >
                          Subir comprobante
                        </Link>
                      }
                    />
                  ) : null}
                  {comprobantes.data && comprobantes.data.length > 0 ? (
                    <ul className="divide-y divide-borde-suave">
                      {comprobantes.data.slice(0, 5).map((r) => (
                        <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/comprobantes/${r.id}`}
                              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl p-2 transition-[background-color,transform] hover:bg-superficie-2 active:scale-[0.99] group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-texto group-hover:text-primario transition-colors">
                                    {r.description || `Comprobante ${r.id.slice(0, 8)}`}
                                  </p>
                                  {r.status === 'FALLIDO' ? (
                                    <span className="shrink-0 rounded bg-peligro-suave px-1.5 py-0.5 text-[10px] font-bold text-peligro">
                                      Lectura fallida
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-xs text-texto-suave">
                                  <span className="font-mono tabular-nums font-semibold text-texto">{formatCentavos(r.totalCents)}</span> · {r.payer}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO_ESTADO[r.status]}`}>
                                {ETIQUETA_ESTADO[r.status]}
                              </span>
                            </Link>

                            {r.mine ? (
                              <button
                                type="button"
                                onClick={() => void borrarComprobante(r.id, r.description || `Comprobante ${r.id.slice(0, 8)}`)}
                                disabled={eliminandoId === r.id}
                                title="Eliminar comprobante"
                                aria-label={`Eliminar comprobante ${r.id}`}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-texto-tenue transition-[color,background-color,transform] hover:border-peligro/20 hover:bg-peligro/10 hover:text-peligro active:scale-90 disabled:opacity-50"
                              >
                                {eliminandoId === r.id ? (
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-peligro border-t-transparent" />
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Tarjeta>
              </section>

              {/* Sección Cuentas Claras & Liquidación Inteligente */}
              <section className="space-y-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-texto">
                      Cuentas Claras en Vivo
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primario-suave/50 px-2 py-0.5 text-[10px] font-bold text-primario">
                      <span className="h-1.5 w-1.5 rounded-full bg-primario animate-pulse" />
                      Quién le debe a quién
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copiarParaWhatsApp}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-exito/30 bg-exito-suave/30 px-3 py-1 text-xs font-semibold text-exito transition-[background-color,transform] hover:bg-exito-suave/60 active:scale-95"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      {copiado ? '¡Copiado para WhatsApp! ✨' : 'Copiar para WhatsApp'}
                    </button>
                    <Link
                      to={`/eventos/${data.id}/balance`}
                      className="text-xs font-semibold text-texto-suave transition-colors hover:text-texto"
                    >
                      Ver matriz →
                    </Link>
                  </div>
                </div>

                <Tarjeta className="shadow-2xs">
                  {balanceQuery.isLoading ? (
                    <Cargando texto="Calculando cuentas claras…" />
                  ) : balanceQuery.isError ? (
                    <Alerta tono="error">{mensajeDeError(balanceQuery.error)}</Alerta>
                  ) : balanceQuery.data ? (
                    <div className="space-y-4">
                      {/* Métricas Resumidas */}
                      <div className="grid grid-cols-3 gap-3 rounded-xl bg-superficie-2/50 p-3 text-center border border-borde-suave">
                        <div>
                          <p className="text-[11px] font-medium text-texto-suave">Total Gastado</p>
                          <p className="font-mono text-sm font-bold text-texto">
                            {formatCentavos(balanceQuery.data.totals.spentCents)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-texto-suave">Ya Saldado</p>
                          <p className="font-mono text-sm font-bold text-exito">
                            {formatCentavos(balanceQuery.data.totals.settledCents)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-texto-suave">Pendiente (Neto)</p>
                          <p className="font-mono text-sm font-bold text-aviso">
                            {formatCentavos(balanceQuery.data.totals.outstandingCents)}
                          </p>
                          {balanceQuery.data.totals.grossOutstandingCents &&
                          balanceQuery.data.totals.grossOutstandingCents > balanceQuery.data.totals.outstandingCents ? (
                            <p className="text-[10px] text-texto-tenue font-mono" title="Monto acumulado antes de compensar consumos cruzados">
                              Bruto: {formatCentavos(balanceQuery.data.totals.grossOutstandingCents)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Liquidación Simplificada: Quién le paga a quién */}
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
                            Liquidación óptima (mínimas transferencias)
                          </p>
                          {balanceQuery.data.totals.grossOutstandingCents &&
                          balanceQuery.data.totals.grossOutstandingCents > balanceQuery.data.totals.outstandingCents ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primario/30 bg-primario-suave/40 px-2 py-0.5 text-[10px] font-bold text-primario">
                              ⚡ Deudas cruzadas detectadas
                            </span>
                          ) : null}
                        </div>

                        {liquidaciones.length === 0 ? (
                          <div className="mt-2.5 rounded-xl border border-dashed border-borde p-4 text-center">
                            <p className="text-xs font-medium text-texto-suave">
                              ✨ Cuentas al día. No hay pagos pendientes entre participantes.
                            </p>
                          </div>
                        ) : (
                          <ul className="mt-2 divide-y divide-borde-suave rounded-xl border border-borde-suave bg-superficie">
                            {liquidaciones.map((liq, idx) => (
                              <li key={idx} className="flex items-center justify-between p-3 transition-colors hover:bg-superficie-2/40">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Inicial nombre={liq.deudor} />
                                  <span className="text-sm font-semibold text-texto truncate">{liq.deudor}</span>
                                  <span className="text-texto-tenue text-xs shrink-0">➔</span>
                                  <Inicial nombre={liq.acreedor} />
                                  <span className="text-sm font-semibold text-texto truncate">{liq.acreedor}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono text-sm font-bold text-primario">
                                    {formatCentavos(liq.montoCents)}
                                  </span>
                                  <span className="block text-[10px] text-texto-tenue">Yape / Plin</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {balanceQuery.data.totals.grossOutstandingCents &&
                        balanceQuery.data.totals.grossOutstandingCents > balanceQuery.data.totals.outstandingCents ? (
                          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primario/25 bg-primario-suave/30 p-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-texto">Compensación de deudas cruzadas</p>
                              <p className="text-[11px] text-texto-suave">
                                Existen consumos mutuos entre participantes ({formatCentavos(balanceQuery.data.totals.grossOutstandingCents)} brutos vs {formatCentavos(balanceQuery.data.totals.outstandingCents)} neto). Compénsalos para saldar las partes mutuas y transferir solo el neto real.
                              </p>
                            </div>
                            <Boton
                              variante="primario"
                              cargando={compensando}
                              onClick={ejecutarCompensacion}
                              className="shrink-0 px-3 py-1.5 text-xs"
                            >
                              Compensar saldos
                            </Boton>
                          </div>
                        ) : null}
                        {/* Desglose de Estado de Cuenta por Participante en el Evento */}
                        {balanceQuery.data.participants.length > 0 && (
                          <div className="mt-4 border-t border-borde-suave pt-3">
                            <div className="flex items-center justify-between pb-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
                                Estado de cuenta por participante
                              </p>
                              <Link
                                to={`/eventos/${data.id}/balance`}
                                className="text-xs font-semibold text-primario hover:underline"
                              >
                                Ver matriz completa →
                              </Link>
                            </div>
                            <ul className="divide-y divide-borde-suave rounded-xl border border-borde-suave bg-superficie-2/30">
                              {balanceQuery.data.participants.map((p) => {
                                const esAFavor = p.netCents > 0;
                                const esDeudor = p.netCents < 0;

                                return (
                                  <li key={p.userId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Inicial nombre={p.username} />
                                      <div>
                                        <p className="text-xs font-bold text-texto">{p.username}</p>
                                        <p className="text-[10px] text-texto-suave">
                                          Puso: <strong className="text-texto">{formatCentavos(p.paidCents)}</strong> · Consumió: <strong className="text-texto">{formatCentavos(p.debtCents)}</strong>
                                        </p>
                                      </div>
                                    </div>
                                    <span
                                      className={`inline-flex self-start sm:self-auto items-center font-mono font-bold text-[11px] px-2 py-0.5 rounded-md ${
                                        esAFavor
                                          ? 'bg-exito-suave/70 text-exito border border-exito/20'
                                          : esDeudor
                                            ? 'bg-aviso-suave/70 text-aviso border border-aviso/20'
                                            : 'bg-superficie-2 text-texto-tenue'
                                      }`}
                                    >
                                      {esAFavor ? `+ ${formatCentavos(p.netCents)} (le deben)` : esDeudor ? `- ${formatCentavos(Math.abs(p.netCents))} (debe)` : 'Al día ✨'}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </Tarjeta>
              </section>
            </div>

            {/* Columna Lateral: Participantes, Invitaciones e Imagen de Grupo Compacta */}
            <div className="space-y-6 lg:col-span-5 xl:col-span-4">
              {/* Sección Participantes */}
              <section>
                <div className="flex items-center justify-between pb-2.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-texto">
                      Participantes
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-texto-suave">
                      ({data.participants.length})
                    </span>
                  </div>
                  {data.invitations.filter((i) => i.status === 'PENDIENTE').length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-aviso">
                      <span className="h-1.5 w-1.5 rounded-full bg-aviso animate-pulse" />
                      {data.invitations.filter((i) => i.status === 'PENDIENTE').length} pendiente(s)
                    </span>
                  ) : null}
                </div>

                <Tarjeta className="shadow-2xs">
                  <ul className="divide-y divide-borde-suave">
                    {data.participants.map((p) => {
                      const balanceP = balanceQuery.data?.participants.find((bp) => bp.userId === p.id);
                      const esAFavor = balanceP && balanceP.netCents > 0;
                      const esDeudor = balanceP && balanceP.netCents < 0;

                      return (
                        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Inicial nombre={p.username} />
                            <span className="text-sm font-semibold text-texto truncate">{p.username}</span>
                          </div>
                          {balanceP ? (
                            <span
                              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                esAFavor
                                  ? 'bg-exito-suave/60 text-exito'
                                  : esDeudor
                                    ? 'bg-aviso-suave/60 text-aviso'
                                    : 'text-texto-tenue'
                              }`}
                            >
                              {esAFavor
                                ? `+ ${formatCentavos(balanceP.netCents)}`
                                : esDeudor
                                  ? `- ${formatCentavos(Math.abs(balanceP.netCents))}`
                                  : 'Al día ✨'}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  {data.invitations.filter((i) => i.status === 'PENDIENTE').length > 0 ? (
                    <ul className="mt-3 divide-y divide-borde-suave border-t border-borde-suave pt-3">
                      {data.invitations
                        .filter((i) => i.status === 'PENDIENTE')
                        .map((i) => (
                          <li key={i.id} className="flex items-center gap-3 py-2.5">
                            <Inicial nombre={i.username} />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-texto">{i.username}</span>
                              <span className="inline-block rounded-full bg-aviso-suave/50 px-2 py-0.5 text-[10px] font-bold text-aviso">
                                Invitado · pendiente
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void cancelar(i.id)}
                              disabled={cancelandoId === i.id}
                              className="text-xs font-semibold text-texto-tenue transition-[color,transform] hover:text-peligro active:scale-90 disabled:opacity-50"
                            >
                              {cancelandoId === i.id ? 'Cancelando…' : 'Cancelar'}
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : null}

                  {/* Formulario de Invitación */}
                  <div className="mt-4 border-t border-borde-suave pt-4">
                    <form className="flex flex-col gap-3" onSubmit={agregar}>
                      <Campo
                        etiqueta="Invitar persona"
                        name="query"
                        placeholder="Username o correo"
                        autoComplete="off"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setErrorForm(null);
                        }}
                      />
                      <Boton type="submit" disabled={!query.trim() || enviando} cargando={enviando} className="w-full">
                        {enviando ? 'Enviando…' : 'Invitar'}
                      </Boton>
                    </form>

                    {busqueda.length >= 2 && opciones.length > 0 ? (
                      <ul className="mt-2 overflow-hidden rounded-xl border border-borde bg-superficie shadow-xs alerta-entrada">
                        {opciones.map((u) => (
                          <li key={u.username} className="border-b border-borde-suave last:border-b-0">
                            <button
                              type="button"
                              disabled={enviando}
                              onClick={() => void invitar(u.username)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-[background-color,transform] hover:bg-superficie-2 active:scale-[0.98] disabled:opacity-60"
                            >
                              <Inicial nombre={u.username} />
                              <span className="text-sm font-semibold text-texto">{u.username}</span>
                              <span className="ml-auto text-xs font-bold text-primario">
                                Invitar
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : busqueda.length >= 2 && sugerencias ? (
                      <p className="mt-2 text-xs text-texto-tenue">Sin coincidencias para esa búsqueda.</p>
                    ) : null}

                    {errorForm ? <Alerta tono="error" className="mt-3 alerta-entrada">{errorForm}</Alerta> : null}
                  </div>
                </Tarjeta>
              </section>

              {/* Imagen del grupo (Compacta y funcional) */}
              <section>
                <div className="flex items-center justify-between pb-2.5">
                  <h2 className="text-sm font-semibold text-texto">
                    Imagen del grupo
                  </h2>
                </div>
                <Tarjeta className="shadow-2xs">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!subiendoImagen) setArrastrando(true);
                    }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setArrastrando(false);
                      void cambiarImagen(e.dataTransfer.files?.[0]);
                    }}
                    className={`flex items-center gap-3.5 rounded-xl border-2 border-dashed p-3.5 transition-all ${
                      arrastrando
                        ? 'border-primario bg-primario-suave/30 scale-[1.01]'
                        : 'border-borde bg-superficie-2/40 hover:border-borde-fuerte'
                    }`}
                  >
                    {data.hasImage ? (
                      <img
                        src={urlImagenEvento(data.id)}
                        alt={`Imagen del grupo ${data.name}`}
                        className="h-12 w-12 shrink-0 rounded-xl object-contain border border-borde-suave shadow-2xs"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-borde bg-superficie-2 font-mono text-lg font-bold uppercase text-primario shadow-2xs">
                        {data.name.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-texto-suave">
                        {arrastrando
                          ? 'Suelta la imagen aquí'
                          : data.hasImage
                            ? 'Arrastra otra imagen aquí para cambiarla o usa el botón.'
                            : 'Arrastra una imagen aquí para identificar a este grupo.'}
                        {subiendoImagen ? (
                          <span className="block text-xs font-semibold text-primario mt-0.5 animate-pulse">Subiendo…</span>
                        ) : null}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <label
                          htmlFor="imagen-grupo"
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primario px-2.5 py-1 text-[11px] font-semibold text-sobre-primario shadow-2xs transition-[background-color,transform] hover:bg-primario-fuerte active:scale-[0.97]"
                        >
                          {data.hasImage ? 'Cambiar imagen' : 'Subir imagen'}
                        </label>
                        <input
                          id="imagen-grupo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={subiendoImagen}
                          onChange={(e) => {
                            void cambiarImagen(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {errorImagen ? <Alerta tono="error" className="mt-3 alerta-entrada">{errorImagen}</Alerta> : null}
                </Tarjeta>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
