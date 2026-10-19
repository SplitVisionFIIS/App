import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { obtenerComprobante } from '../../api/comprobantes';
import { confirmarReparto, guardarReparto } from '../../api/reparto';
import { obtenerEvento } from '../../api/eventos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

type AsignacionMap = Record<string, string>;

function claveAsignacion(itemId: string, unitIndex: number): string {
  return `${itemId}:${unitIndex}`;
}

function Inicial({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-borde bg-superficie-2 font-mono text-xs font-bold uppercase text-primario shadow-2xs select-none shrink-0">
      {nombre.slice(0, 1)}
    </span>
  );
}

export function Reparto() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const consulta = useQueryClient();

  const { data: recibo, isLoading: cargandoRecibo } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => obtenerComprobante(id),
    enabled: Boolean(id),
  });

  const { data: evento, isLoading: cargandoEvento } = useQuery({
    queryKey: ['evento', recibo?.eventId],
    queryFn: () => obtenerEvento(recibo!.eventId),
    enabled: Boolean(recibo?.eventId),
  });

  const [modo, setModo] = useState<'EQUITATIVE' | 'BY_ITEM'>('EQUITATIVE');
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionMap>({});
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participantes = evento?.participants ?? [];

  useEffect(() => {
    if (!recibo) return;
    setModo(recibo.splitMode === 'BY_ITEM' ? 'BY_ITEM' : 'EQUITATIVE');
    if (recibo.split.participants?.length) {
      setSeleccionados(recibo.split.participants);
    }
    const mapa: AsignacionMap = {};
    for (const a of recibo.split.assignments) {
      mapa[claveAsignacion(a.itemId, a.unitIndex)] = a.userId;
    }
    setAsignaciones(mapa);
  }, [recibo]);

  const validarUnidades = useMemo(() => {
    if (modo !== 'BY_ITEM' || !recibo) return { ok: true as const, faltantes: 0 };
    let faltantes = 0;
    for (const it of recibo.items) {
      for (let u = 1; u <= it.quantity; u++) {
        const k = claveAsignacion(it.id, u);
        if (!asignaciones[k]) faltantes += 1;
      }
    }
    return { ok: faltantes === 0, faltantes };
  }, [modo, recibo, asignaciones]);

  // Cálculos en tiempo real para Reparto Equitativo
  const seleccionadosEfectivos = useMemo(() => {
    return seleccionados.length > 0 ? seleccionados : participantes.map((p) => p.id);
  }, [seleccionados, participantes]);

  const cuotaEquitativaCents = useMemo(() => {
    if (!recibo) return 0;
    return Math.round(recibo.totalCents / (seleccionadosEfectivos.length || 1));
  }, [recibo, seleccionadosEfectivos]);

  // Cálculos en tiempo real para Reparto Por Ítems
  const totalPorParticipante = useMemo(() => {
    const mapa: Record<string, { count: number; totalCents: number }> = {};
    for (const p of participantes) {
      mapa[p.id] = { count: 0, totalCents: 0 };
    }
    if (!recibo) return mapa;
    for (const it of recibo.items) {
      for (let u = 1; u <= it.quantity; u++) {
        const userId = asignaciones[claveAsignacion(it.id, u)];
        if (userId && mapa[userId]) {
          mapa[userId].count += 1;
          mapa[userId].totalCents += it.unitPriceCents;
        }
      }
    }
    return mapa;
  }, [recibo, asignaciones, participantes]);

  const totalUnidades = useMemo(() => {
    return recibo?.items.reduce((acc, it) => acc + it.quantity, 0) ?? 0;
  }, [recibo]);

  const unidadesAsignadas = useMemo(() => {
    return Object.values(asignaciones).filter(Boolean).length;
  }, [asignaciones]);

  const totalAsignadoCents = useMemo(() => {
    return Object.values(totalPorParticipante).reduce((acc, p) => acc + p.totalCents, 0);
  }, [totalPorParticipante]);

  const asignarItemCompleto = (itemId: string, quantity: number, userId: string) => {
    setAsignaciones((prev) => {
      const nuevo = { ...prev };
      for (let u = 1; u <= quantity; u++) {
        nuevo[claveAsignacion(itemId, u)] = userId;
      }
      return nuevo;
    });
  };

  const guardar = async () => {
    if (!recibo) return;
    setGuardando(true);
    setError(null);
    try {
      if (modo === 'EQUITATIVE') {
        const participantesSel = seleccionados.length ? seleccionados : participantes.map((p) => p.id);
        await guardarReparto(id, { mode: 'EQUITATIVE', participants: participantesSel });
      } else {
        const assignments = Object.entries(asignaciones)
          .filter(([, userId]) => Boolean(userId))
          .map(([k, userId]) => {
            const [itemId, unidadStr] = k.split(':');
            return { itemId, unitIndex: Number(unidadStr), userId };
          });
        await guardarReparto(id, { mode: 'BY_ITEM', assignments });
      }
      await consulta.invalidateQueries({ queryKey: ['receipt', id] });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const confirmar = async () => {
    if (!recibo) return;
    if (modo === 'BY_ITEM' && !validarUnidades.ok) return;
    setConfirmando(true);
    setError(null);
    try {
      await confirmarReparto(id);
      await consulta.invalidateQueries({ queryKey: ['receipt', id] });
      await consulta.invalidateQueries({ queryKey: ['evento', recibo.eventId] });
      await consulta.invalidateQueries({ queryKey: ['receipts', recibo.eventId] });
      await consulta.invalidateQueries({ queryKey: ['deudas'] });
      await consulta.invalidateQueries({ queryKey: ['balance', recibo.eventId] });
      navigate(`/eventos/${recibo.eventId}`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setConfirmando(false);
    }
  };

  if (cargandoRecibo || cargandoEvento) return <Cargando texto="Cargando división de gastos…" />;
  if (!recibo || !evento) return <Alerta tono="error">No se pudo cargar el reparto.</Alerta>;

  if (recibo.status !== 'EXTRAÍDO') {
    return (
      <div className="space-y-4">
        <Link
          to={`/comprobantes/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-texto-suave transition-colors hover:text-texto active:scale-95"
        >
          ← Revisar comprobante
        </Link>
        <Tarjeta className="p-6 text-center">
          <p className="text-sm font-medium text-texto-suave">
            El comprobante no está listo para repartir (Estado: {recibo.status}).
          </p>
        </Tarjeta>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera y Navegación */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={`/comprobantes/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-texto-suave transition-colors hover:text-texto active:scale-95"
          >
            ← Volver al comprobante
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-texto">
              Repartir Cuenta
            </h1>
            <span className="rounded-full bg-primario-suave/50 px-2.5 py-0.5 font-mono text-xs font-bold text-primario">
              {formatCentavos(recibo.totalCents)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-texto-suave">
            {recibo.description || 'Gasto grupal'} · {evento.name}
          </p>
        </div>

        {/* Acciones principales en cabecera */}
        <div className="flex items-center gap-2">
          <Boton
            variante="secundario"
            onClick={guardar}
            disabled={guardando}
            className="text-xs"
          >
            {guardando ? 'Guardando…' : 'Guardar borrador'}
          </Boton>
          <Boton
            variante="primario"
            onClick={confirmar}
            disabled={confirmando || (modo === 'BY_ITEM' && !validarUnidades.ok)}
            className="text-xs"
          >
            {confirmando ? 'Confirmando…' : 'Confirmar y generar deudas →'}
          </Boton>
        </div>
      </div>

      {error ? <Alerta tono="error" className="alerta-entrada">{error}</Alerta> : null}

      {/* Selector de Modo Táctil (Segmented Control) */}
      <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-superficie-2/80 border border-borde shadow-2xs">
        <button
          type="button"
          onClick={() => setModo('EQUITATIVE')}
          className={`flex items-center justify-center gap-3 rounded-xl py-3 px-4 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
            modo === 'EQUITATIVE'
              ? 'bg-superficie text-texto shadow-xs border border-borde ring-1 ring-black/5 dark:ring-white/5'
              : 'text-texto-suave hover:text-texto'
          }`}
        >
          <span className="text-lg">⚖️</span>
          <div className="text-left">
            <span className="block font-bold">Reparto Equitativo</span>
            <span className="text-[11px] font-normal text-texto-suave hidden sm:block">Partes iguales</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setModo('BY_ITEM')}
          className={`flex items-center justify-center gap-3 rounded-xl py-3 px-4 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
            modo === 'BY_ITEM'
              ? 'bg-superficie text-texto shadow-xs border border-borde ring-1 ring-black/5 dark:ring-white/5'
              : 'text-texto-suave hover:text-texto'
          }`}
        >
          <span className="text-lg">🎯</span>
          <div className="text-left">
            <span className="block font-bold">Por Ítems / Consumo</span>
            <span className="text-[11px] font-normal text-texto-suave hidden sm:block">Cada quien lo suyo</span>
          </div>
        </button>
      </div>

      {/* CONTENIDO MODO 1: REPARTO EQUITATIVO */}
      {modo === 'EQUITATIVE' ? (
        <div className="space-y-5 anim-stagger-1">
          {/* Banner Resumen Cuota */}
          <div className="flex flex-col gap-4 rounded-2xl border border-primario/20 bg-primario-suave/20 p-5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primario/10 text-2xl text-primario">
                💸
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primario">
                  Cuota calculada en tiempo real
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold tracking-tight text-texto">
                    {formatCentavos(cuotaEquitativaCents)}
                  </span>
                  <span className="text-xs text-texto-suave">por persona</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSeleccionados(participantes.map((p) => p.id))}
                className="rounded-lg border border-borde bg-superficie px-3 py-1.5 font-semibold text-texto-suave transition-colors hover:text-texto hover:bg-superficie-2 active:scale-95"
              >
                Todos ({participantes.length})
              </button>
              <button
                type="button"
                onClick={() => setSeleccionados([])}
                className="rounded-lg border border-borde bg-superficie px-3 py-1.5 font-semibold text-texto-suave transition-colors hover:text-texto hover:bg-superficie-2 active:scale-95"
              >
                Limpiar selección
              </button>
            </div>
          </div>

          {/* Grilla Interactiva de Participantes */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
              Selecciona quiénes consumieron de este comprobante
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {participantes.map((p) => {
                const incluido = seleccionados.length === 0 || seleccionados.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (seleccionados.length === 0) {
                        // Si estaba en modo "todos", desmarcar este significa seleccionar a los demás
                        setSeleccionados(participantes.filter((x) => x.id !== p.id).map((x) => x.id));
                      } else if (seleccionados.includes(p.id)) {
                        setSeleccionados(seleccionados.filter((id) => id !== p.id));
                      } else {
                        setSeleccionados([...seleccionados, p.id]);
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] ${
                      incluido
                        ? 'border-primario/60 bg-primario-suave/25 ring-1 ring-primario/20 shadow-2xs'
                        : 'border-borde bg-superficie opacity-65 hover:opacity-100 hover:border-borde-fuerte'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Inicial nombre={p.username} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-texto">
                          {p.username}
                        </p>
                        <p className="text-[11px] text-texto-suave">
                          {incluido ? 'Incluido en la cuenta' : 'No participa'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {incluido ? (
                        <div>
                          <span className="font-mono text-sm font-bold text-primario">
                            {formatCentavos(cuotaEquitativaCents)}
                          </span>
                          <span className="block text-[10px] text-exito font-semibold">✓ Asignado</span>
                        </div>
                      ) : (
                        <span className="text-xs text-texto-tenue font-mono">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* CONTENIDO MODO 2: REPARTO POR ÍTEMS */}
      {modo === 'BY_ITEM' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 anim-stagger-1">
          {/* Columna Izquierda: Lista de Ítems */}
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
                Ítems detectados en la boleta ({recibo.items.length})
              </h2>
              <span className="text-xs text-texto-suave">
                Asigna cada unidad a un participante
              </span>
            </div>

            <div className="space-y-4">
              {recibo.items.map((it) => (
                <Tarjeta key={it.id} className="p-4 sm:p-5 shadow-2xs border-borde">
                  {/* Encabezado del Ítem */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-borde-suave pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-texto">
                        {it.description}
                      </h3>
                      <p className="mt-0.5 text-xs text-texto-suave font-mono">
                        {it.quantity} unidad{it.quantity > 1 ? 'es' : ''} × {formatCentavos(it.unitPriceCents)} ={' '}
                        <span className="font-bold text-texto">{formatCentavos(it.subtotalCents)}</span>
                      </p>
                    </div>

                    {/* Atajo: Asignar todas las unidades de un tirón */}
                    {participantes.length > 0 && it.quantity > 1 ? (
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] text-texto-tenue">Asignar todo a:</span>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              asignarItemCompleto(it.id, it.quantity, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="rounded-lg border border-borde bg-superficie-2 px-2 py-1 text-xs font-semibold text-texto focus:border-primario focus:ring-1 focus:ring-primario"
                        >
                          <option value="">Elegir…</option>
                          {participantes.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.username}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>

                  {/* Asignación de cada unidad */}
                  <div className="mt-3.5 space-y-2.5">
                    {Array.from({ length: it.quantity }, (_, k) => k + 1).map((u) => {
                      const k = claveAsignacion(it.id, u);
                      const asignadoId = asignaciones[k] ?? '';
                      const usuarioAsignado = participantes.find((p) => p.id === asignadoId);

                      return (
                        <div
                          key={k}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl p-2.5 transition-colors ${
                            asignadoId
                              ? 'bg-superficie-2/50 border border-borde-suave'
                              : 'bg-aviso-suave/10 border border-dashed border-aviso/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-superficie border border-borde text-[10px] font-mono font-bold text-texto-suave">
                              #{u}
                            </span>
                            <span className="text-xs font-semibold text-texto">
                              Unidad {u}
                            </span>
                            <span className="font-mono text-xs text-texto-suave">
                              ({formatCentavos(it.unitPriceCents)})
                            </span>
                            {usuarioAsignado ? (
                              <span className="hidden sm:inline-block rounded-full bg-primario-suave/60 px-2 py-0.5 text-[10px] font-bold text-primario">
                                {usuarioAsignado.username}
                              </span>
                            ) : null}
                          </div>

                          {/* Chips rápidos de participantes */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {participantes.map((p) => {
                              const seleccionado = asignadoId === p.id;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() =>
                                    setAsignaciones((prev) => ({
                                      ...prev,
                                      [k]: seleccionado ? '' : p.id,
                                    }))
                                  }
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
                                    seleccionado
                                      ? 'bg-primario text-sobre-primario shadow-2xs ring-1 ring-primario'
                                      : 'bg-superficie border border-borde text-texto-suave hover:border-borde-fuerte hover:text-texto'
                                  }`}
                                >
                                  <Inicial nombre={p.username} />
                                  <span>{p.username}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Tarjeta>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Panel de Liquidación en Vivo */}
          <div className="space-y-4 lg:col-span-5 xl:col-span-4">
            <div className="sticky top-20 space-y-4">
              <Tarjeta className="p-5 shadow-sm border-borde">
                <h3 className="text-sm font-bold text-texto">
                  Resumen de Asignación
                </h3>

                {/* Barra de Progreso */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-texto-suave">Progreso</span>
                    <span className="font-mono">
                      {unidadesAsignadas} de {totalUnidades} unidades ({Math.round((unidadesAsignadas / (totalUnidades || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-superficie-2 border border-borde-suave">
                    <div
                      className={`h-full transition-all duration-300 ${
                        validarUnidades.ok ? 'bg-exito' : 'bg-primario'
                      }`}
                      style={{
                        width: `${Math.round((unidadesAsignadas / (totalUnidades || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  {!validarUnidades.ok ? (
                    <p className="text-[11px] font-semibold text-aviso">
                      ⚠️ Faltan {validarUnidades.faltantes} unidad{validarUnidades.faltantes === 1 ? '' : 'es'} por asignar
                    </p>
                  ) : (
                    <p className="text-[11px] font-semibold text-exito">
                      ✓ ¡Todas las unidades han sido asignadas!
                    </p>
                  )}
                </div>

                {/* Totales Asignados vs Boleta */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-superficie-2/60 p-3 border border-borde-suave text-center">
                  <div>
                    <span className="block text-[11px] text-texto-suave">Total Boleta</span>
                    <span className="font-mono text-sm font-bold text-texto">
                      {formatCentavos(recibo.totalCents)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-texto-suave">Asignado</span>
                    <span className={`font-mono text-sm font-bold ${validarUnidades.ok ? 'text-exito' : 'text-primario'}`}>
                      {formatCentavos(totalAsignadoCents)}
                    </span>
                  </div>
                </div>

                {/* Desglose en Vivo por Participante */}
                <div className="mt-4 border-t border-borde-suave pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-texto-tenue pb-2">
                    Deuda calculada por persona
                  </p>
                  <ul className="divide-y divide-borde-suave">
                    {participantes.map((p) => {
                      const data = totalPorParticipante[p.id];
                      return (
                        <li key={p.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <Inicial nombre={p.username} />
                            <div>
                              <span className="text-xs font-semibold text-texto block">
                                {p.username}
                              </span>
                              <span className="text-[10px] text-texto-suave">
                                {data?.count ?? 0} unidad{(data?.count ?? 0) === 1 ? '' : 'es'}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-texto">
                            {formatCentavos(data?.totalCents ?? 0)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Botón de Confirmación dentro del panel */}
                <div className="mt-5 pt-3 border-t border-borde-suave">
                  <Boton
                    variante="primario"
                    onClick={confirmar}
                    disabled={confirmando || !validarUnidades.ok}
                    className="w-full justify-center text-xs py-2.5"
                  >
                    {confirmando ? 'Confirmando…' : 'Confirmar y generar deudas'}
                  </Boton>
                </div>
              </Tarjeta>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
