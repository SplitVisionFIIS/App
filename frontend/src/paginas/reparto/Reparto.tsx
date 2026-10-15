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
      navigate(`/eventos/${recibo.eventId}`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setConfirmando(false);
    }
  };

  if (cargandoRecibo || cargandoEvento) return <Cargando texto="Cargando reparto…" />;
  if (!recibo || !evento) return <Alerta>No se pudo cargar el reparto.</Alerta>;

  if (recibo.status !== 'EXTRAÍDO') {
    return (
      <>
        <Link to={`/comprobantes/${id}`} className="text-sm font-medium text-primario hover:text-primario-fuerte ">
          ← Revisar comprobante
        </Link>
        <Tarjeta className="mt-4">
          <p className="text-sm text-texto-suave ">El comprobante no está listo para repartir.</p>
        </Tarjeta>
      </>
    );
  }

  return (
    <>
      <Link to={`/comprobantes/${id}`} className="text-sm font-medium text-primario hover:text-primario-fuerte ">
        ← Revisar comprobante
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-texto ">Reparto</h1>

      <Tarjeta className="mt-4">
        <div className="flex gap-2">
          <Boton variante={modo === 'EQUITATIVE' ? 'primario' : 'secundario'} onClick={() => setModo('EQUITATIVE')}>
            Equitativo
          </Boton>
          <Boton variante={modo === 'BY_ITEM' ? 'primario' : 'secundario'} onClick={() => setModo('BY_ITEM')}>
            Por ítems
          </Boton>
        </div>

        {modo === 'EQUITATIVE' ? (
          <>
            <p className="mt-3 text-sm text-texto-suave ">
              El total se divide entre los participantes seleccionados. Si no marcas ninguno, se usa todo el grupo.
            </p>
            <ul className="mt-3 divide-y divide-borde-suave ">
              {participantes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <input
                    id={`eq-${p.id}`}
                    type="checkbox"
                    checked={seleccionados.includes(p.id)}
                    onChange={(e) => {
                      setSeleccionados((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                      );
                    }}
                    className="h-4 w-4 rounded border-borde text-primario focus:ring-primario/50"
                  />
                  <label htmlFor={`eq-${p.id}`} className="text-sm text-texto ">
                    {p.username}
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-texto-tenue ">
              Seleccionados: {seleccionados.length || participantes.length}
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-texto-suave ">
              Asigna cada unidad de cada ítem a un participante (unidad {1}-based). Cada unidad debe tener asignación.
            </p>
            <div className="mt-3 flex flex-col gap-4">
              {recibo.items.map((it) => (
                <div key={it.id} className="rounded-lg border border-borde p-3 ">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-texto ">{it.description}</p>
                      <p className="text-xs text-texto-suave ">
                        {it.quantity} × {formatCentavos(it.unitPriceCents)} = {formatCentavos(it.subtotalCents)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: it.quantity }, (_, k) => k + 1).map((u) => {
                      const k = claveAsignacion(it.id, u);
                      const val = asignaciones[k] ?? '';
                      return (
                        <div key={k} className="flex items-center gap-2">
                          <label className="w-16 text-xs text-texto-suave ">Unidad {u}</label>
                          <select
                            value={val}
                            onChange={(e) =>
                              setAsignaciones((prev) => ({ ...prev, [k]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-borde px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primario/50   "
                          >
                            <option value="">— elegir participante —</option>
                            {participantes.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.username}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!validarUnidades.ok && (
              <p className="mt-2 text-xs font-medium text-peligro ">
                Faltan {validarUnidades.faltantes} unidad{validarUnidades.faltantes === 1 ? '' : 'es'} por asignar.
              </p>
            )}
          </>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Boton onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar reparto'}
          </Boton>
          <Boton onClick={confirmar} disabled={confirmando || (modo === 'BY_ITEM' && !validarUnidades.ok)}>
            {confirmando ? 'Confirmando…' : 'Confirmar y generar deudas'}
          </Boton>
        </div>

        {error && (
          <div className="mt-3">
            <Alerta>{error}</Alerta>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
