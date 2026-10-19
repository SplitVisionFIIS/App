import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  editarComprobante,
  eliminarComprobante,
  obtenerComprobante,
  reintentarComprobante,
  urlImagenComprobante,
} from '../../api/comprobantes';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Cargando } from '../../componentes/Cargando';
import { DiagnosticoLecturaFallida } from '../../componentes/DiagnosticoLecturaFallida';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

type ItemForm = { description: string; quantity: string; unitPrice: string };

export function Comprobante() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const consulta = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => obtenerComprobante(id),
    enabled: Boolean(id),
  });

  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [total, setTotal] = useState('');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);

  const borrar = async () => {
    if (!data) return;
    if (!window.confirm('¿Seguro que deseas eliminar este comprobante?')) return;
    setEliminando(true);
    setErr(null);
    try {
      await eliminarComprobante(id);
      await consulta.invalidateQueries({ queryKey: ['receipts', data.eventId] });
      navigate(`/eventos/${data.eventId}`);
    } catch (e) {
      setErr(mensajeDeError(e));
      setEliminando(false);
    }
  };

  const reintentarLectura = async () => {
    if (!data) return;
    setReintentando(true);
    setErr(null);
    try {
      await reintentarComprobante(id);
      await consulta.invalidateQueries({ queryKey: ['receipt', id] });
    } catch (e) {
      setErr(mensajeDeError(e));
    } finally {
      setReintentando(false);
    }
  };

  useEffect(() => {
    if (!data) return;
    setDescripcion(data.description ?? '');
    setTotal((data.totalCents / 100).toFixed(2));
    setTax((data.taxCents / 100).toFixed(2));
    setTip((data.tipCents / 100).toFixed(2));
    setDiscount((data.discountCents / 100).toFixed(2));
    setItems(
      data.items.map((i) => ({
        description: i.description,
        quantity: String(i.quantity),
        unitPrice: (i.unitPriceCents / 100).toFixed(2),
      })),
    );
  }, [data]);

  const editarItem = (indice: number, cambio: Partial<ItemForm>) =>
    setItems((actuales) => actuales.map((it, i) => (i === indice ? { ...it, ...cambio } : it)));

  const quitarItem = (indice: number) => setItems((actuales) => actuales.filter((_, i) => i !== indice));

  const agregarItem = () => setItems((actuales) => [...actuales, { description: '', quantity: '1', unitPrice: '' }]);

  const guardar = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (guardando || !data) return;
    setGuardando(true);
    setErr(null);
    try {
      await editarComprobante(id, {
        description: descripcion,
        total,
        tax,
        tip,
        discount,
        items: items.map((it) => ({
          description: it.description,
          quantity: Number.parseInt(it.quantity, 10) || 1,
          unitPrice: it.unitPrice,
        })),
      });
      await consulta.invalidateQueries({ queryKey: ['receipt', id] });
      await consulta.invalidateQueries({ queryKey: ['receipts', data.eventId] });
      navigate(`/comprobantes/${id}/reparto`);
    } catch (e) {
      setErr(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading) return <Cargando texto="Cargando comprobante…" />;
  if (isError) return <Alerta>{mensajeDeError(error)}</Alerta>;
  if (!data) return null;

  const volver = (
    <Link
      to={`/eventos/${data.eventId}`}
      className="text-sm font-medium text-primario hover:text-primario-fuerte "
    >
      ← Volver al evento
    </Link>
  );

  if (data.status === 'CONFIRMADO') {
    return (
      <div className="space-y-6">
        <div>{volver}</div>

        <section className="rounded-2xl border border-borde bg-superficie p-6 shadow-sm anim-stagger-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-borde-suave pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-exito-suave/60 px-2.5 py-0.5 text-xs font-bold text-exito">
                  <span className="h-1.5 w-1.5 rounded-full bg-exito" />
                  Reparto Confirmado
                </span>
                <span className="text-xs text-texto-suave">
                  {data.splitMode === 'BY_ITEM' ? 'Por ítems individuales' : 'Reparto equitativo'}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-texto">
                {data.description || 'Comprobante confirmado'}
              </h1>
              <p className="mt-0.5 text-xs text-texto-suave">
                Pagado por <span className="font-semibold text-texto">{data.payer?.username ?? 'un participante'}</span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-texto-suave block">Importe Total</span>
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-texto">
                {formatCentavos(data.totalCents)}
              </span>
            </div>
          </div>

          {/* Deudas individuales generadas */}
          <div className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
              Deudas generadas a los participantes ({data.debts.length})
            </h2>

            {data.debts.length > 0 ? (
              <ul className="mt-3 divide-y divide-borde-suave rounded-xl border border-borde bg-superficie-2/40 overflow-hidden">
                {data.debts.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-3.5 hover:bg-superficie-2/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-borde bg-superficie font-mono text-xs font-bold uppercase text-primario shadow-2xs">
                        {d.debtor.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-texto">
                          {d.debtor}
                        </p>
                        <p className="text-[11px] text-texto-suave">
                          Le debe a {data.payer?.username ?? 'pagador'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-primario block">
                        {formatCentavos(d.amountCents)}
                      </span>
                      <Link
                        to={`/deudas/${d.id}`}
                        className="text-[11px] font-semibold text-primario hover:underline"
                      >
                        Ver historial →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-texto-suave">
                No se registraron deudas adicionales para este comprobante.
              </p>
            )}
          </div>

          {/* Desglose de ítems */}
          {data.items.length > 0 ? (
            <div className="mt-6 border-t border-borde-suave pt-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
                Ítems del consumo ({data.items.length})
              </h2>
              <ul className="mt-3 divide-y divide-borde-suave">
                {data.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-texto-suave font-semibold">
                        {it.quantity}×
                      </span>
                      <span className="font-medium text-texto">
                        {it.description}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-texto tabular-nums">
                      {formatCentavos(it.subtotalCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Botones de acción */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-borde-suave pt-5">
            <Link
              to={`/eventos/${data.eventId}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-superficie-2 border border-borde px-4 py-2 text-xs font-semibold text-texto transition-colors hover:bg-superficie hover:border-borde-fuerte active:scale-95"
            >
              ← Volver al evento
            </Link>

            <Link
              to={`/eventos/${data.eventId}/balance`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primario px-4 py-2 text-xs font-semibold text-sobre-primario shadow-xs transition-colors hover:bg-primario-fuerte active:scale-95"
            >
              Ver balance consolidado →
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (data.status === 'FALLIDO') {
    return (
      <div className="space-y-6">
        <div>{volver}</div>
        <DiagnosticoLecturaFallida
          fotoUrl={data.hasImage ? urlImagenComprobante(id) : null}
          failReason={data.failReason}
          onReintentar={() => void reintentarLectura()}
          onCompletarManual={() => navigate(`/eventos/${data.eventId}/comprobantes/nuevo?fallido=${data.id}`)}
          onSubirOtra={() => navigate(`/eventos/${data.eventId}/comprobantes/nuevo`)}
          onEliminar={() => void borrar()}
          reintentando={reintentando}
          eliminando={eliminando}
          esPropietario={data.mine}
        />
      </div>
    );
  }

  const editable = data.mine && data.status === 'EXTRAÍDO';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>{volver}</div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primario-suave px-2.5 py-0.5 text-xs font-semibold text-primario">
            {data.status === 'EXTRAÍDO' ? 'Listo para revisión' : data.status}
          </span>
          <span className="text-xs text-texto-suave">
            Pagador: <strong className="text-texto">{data.payer?.username ?? 'Tú'}</strong>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-b border-borde-suave pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-texto">
          {descripcion || data.description || 'Revisar comprobante de gasto'}
        </h1>
        <p className="text-xs text-texto-suave">
          Verifica que los montos e ítems coincidan con el ticket antes de continuar al reparto de consumos.
        </p>
      </div>

      {err ? <Alerta tono="error" className="alerta-entrada">{err}</Alerta> : null}

      {/* Grid de 2 Columnas para aprovechar el ancho de pantalla */}
      <div className={`grid grid-cols-1 gap-6 ${data.hasImage ? 'lg:grid-cols-12' : ''}`}>
        {data.hasImage ? (
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-2xl border border-borde bg-superficie p-3 shadow-2xs">
              <div className="mb-2 flex items-center justify-between border-b border-borde-suave pb-2">
                <span className="text-xs font-bold text-texto">Foto del comprobante</span>
                <span className="font-mono text-[10px] text-texto-suave">Original</span>
              </div>
              <div className="flex items-center justify-center overflow-hidden rounded-xl bg-superficie-2/50 p-2">
                <img
                  src={urlImagenComprobante(id)}
                  alt="Comprobante original"
                  className="max-h-[580px] w-full rounded-lg object-contain shadow-xs transition-transform hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className={data.hasImage ? 'lg:col-span-7' : 'max-w-3xl mx-auto'}>
          <Tarjeta className="shadow-2xs">
            {editable ? (
              <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Campo
                    etiqueta="Descripción del gasto"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej. Almuerzo Criollo, Parrillada"
                  />
                </div>
                <Campo
                  etiqueta="Total general (S/)"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  inputMode="decimal"
                  required
                />
                <Campo etiqueta="Impuestos / IGV (S/)" value={tax} onChange={(e) => setTax(e.target.value)} inputMode="decimal" />
                <Campo etiqueta="Propina / Servicio (S/)" value={tip} onChange={(e) => setTip(e.target.value)} inputMode="decimal" />
                <Campo
                  etiqueta="Descuento (S/)"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  inputMode="decimal"
                />

                <div className="sm:col-span-2">
                  <div className="mb-2.5 flex items-center justify-between border-t border-borde-suave pt-3">
                    <div>
                      <h2 className="text-sm font-semibold text-texto">Ítems desglosados</h2>
                      <p className="text-xs text-texto-suave">Productos o platos reconocidos en el comprobante</p>
                    </div>
                    <Boton variante="secundario" type="button" onClick={agregarItem}>
                      + Agregar ítem
                    </Boton>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {items.map((it, i) => (
                      <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-borde-suave bg-superficie-2/30 p-2.5">
                        <div className="col-span-12 sm:col-span-6">
                          <Campo
                            etiqueta="Descripción"
                            value={it.description}
                            onChange={(e) => editarItem(i, { description: e.target.value })}
                          />
                        </div>
                        <div className="col-span-5 sm:col-span-2">
                          <Campo
                            etiqueta="Cant."
                            type="number"
                            min="1"
                            step="1"
                            value={it.quantity}
                            onChange={(e) => editarItem(i, { quantity: e.target.value })}
                          />
                        </div>
                        <div className="col-span-5 sm:col-span-3">
                          <Campo
                            etiqueta="P. unit (S/)"
                            value={it.unitPrice}
                            onChange={(e) => editarItem(i, { unitPrice: e.target.value })}
                            inputMode="decimal"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 pb-2 text-right">
                          <button
                            type="button"
                            onClick={() => quitarItem(i)}
                            aria-label={`Eliminar ítem ${i + 1}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-texto-tenue transition-[color,background-color,transform] hover:bg-peligro-suave/30 hover:text-peligro active:scale-90"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-borde-suave">
                  <div className="flex flex-wrap gap-2">
                    <Boton type="submit" disabled={guardando} cargando={guardando}>
                      {guardando ? 'Guardando…' : 'Guardar y pasar a reparto →'}
                    </Boton>
                  </div>
                  {data.mine ? (
                    <Boton
                      variante="fantasma"
                      className="text-peligro hover:bg-peligro-suave/30"
                      type="button"
                      onClick={() => void borrar()}
                      disabled={guardando || eliminando}
                    >
                      {eliminando ? 'Eliminando…' : 'Eliminar comprobante'}
                    </Boton>
                  ) : null}
                </div>
              </form>
            ) : (
              <div>
                <p className="text-sm text-texto-suave">
                  {data.description || 'Sin descripción'}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-texto-suave">Total</dt>
                  <dd className="text-right font-medium text-texto">
                    {formatCentavos(data.totalCents)}
                  </dd>
                  <dt className="text-texto-suave">Impuestos</dt>
                  <dd className="text-right text-texto">{formatCentavos(data.taxCents)}</dd>
                  <dt className="text-texto-suave">Propina</dt>
                  <dd className="text-right text-texto">{formatCentavos(data.tipCents)}</dd>
                  <dt className="text-texto-suave">Descuento</dt>
                  <dd className="text-right text-texto">{formatCentavos(data.discountCents)}</dd>
                </dl>
                {data.items.length > 0 ? (
                  <ul className="mt-3 divide-y divide-borde-suave">
                    {data.items.map((it) => (
                      <li key={it.id} className="flex justify-between py-2 text-sm">
                        <span className="text-texto">
                          {it.quantity}× {it.description}
                        </span>
                        <span className="text-texto">{formatCentavos(it.subtotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {data.mine ? (
                  <div className="mt-4 pt-3 border-t border-borde-suave flex justify-end">
                    <Boton
                      variante="fantasma"
                      className="text-peligro hover:bg-peligro-suave/30 text-xs"
                      type="button"
                      onClick={() => void borrar()}
                      disabled={eliminando}
                    >
                      {eliminando ? 'Eliminando…' : 'Eliminar comprobante'}
                    </Boton>
                  </div>
                ) : !data.mine ? (
                  <p className="mt-3 text-xs text-texto-tenue">
                    Solo {data.payer?.username ?? 'el pagador'} puede editar este comprobante.
                  </p>
                ) : null}
              </div>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
