import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { editarComprobante, obtenerComprobante, urlImagenComprobante } from '../../api/comprobantes';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Cargando } from '../../componentes/Cargando';
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
  const [err, setErr] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [total, setTotal] = useState('');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);

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
      <>
        {volver}
        <h1 className="mt-2 text-xl font-semibold text-texto ">Comprobante confirmado</h1>
        <Tarjeta className="mt-4">
          <p className="text-sm text-texto-suave ">
            {data.description || 'Sin descripción'} · Total {formatCentavos(data.totalCents)}
          </p>
          {data.debts.length > 0 ? (
            <ul className="mt-3 divide-y divide-borde-suave ">
              {data.debts.map((d) => (
                <li key={d.id} className="flex justify-between py-2 text-sm">
                  <span className="text-texto ">{d.debtor}</span>
                  <span className="font-medium text-texto ">
                    {formatCentavos(d.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Tarjeta>
      </>
    );
  }

  if (data.status === 'FALLIDO') {
    return (
      <>
        {volver}
        <h1 className="mt-2 text-xl font-semibold text-texto ">Comprobante fallido</h1>
        <Tarjeta className="mt-4">
          <Alerta>{data.failReason || 'La lectura automática no pudo completarse.'}</Alerta>
          <p className="mt-3 text-sm text-texto-suave ">
            Puedes reintentar la lectura automática o registrar los datos manualmente.
          </p>
          <div className="mt-3 flex gap-2">
            {data.mine ? (
              <Boton onClick={() => navigate(`/eventos/${data.eventId}/comprobantes/nuevo?fallido=${data.id}`)}>
                Completar manualmente
              </Boton>
            ) : null}
          </div>
        </Tarjeta>
      </>
    );
  }

  const editable = data.mine && data.status === 'EXTRAÍDO';

  return (
    <>
      {volver}
      <h1 className="mt-2 text-xl font-semibold text-texto ">Revisar comprobante</h1>

      <Tarjeta className="mt-4">
        {data.hasImage ? (
          <img
            src={urlImagenComprobante(id)}
            alt="Comprobante"
            className="mb-4 max-h-64 w-full rounded-lg object-contain"
          />
        ) : null}

        {editable ? (
          <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Campo etiqueta="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
            <Campo
              etiqueta="Total (S/)"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              inputMode="decimal"
              required
            />
            <Campo etiqueta="Impuestos (S/)" value={tax} onChange={(e) => setTax(e.target.value)} inputMode="decimal" />
            <Campo etiqueta="Propina (S/)" value={tip} onChange={(e) => setTip(e.target.value)} inputMode="decimal" />
            <Campo
              etiqueta="Descuento (S/)"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              inputMode="decimal"
            />

            <div className="sm:col-span-2">
              <h2 className="mb-2 text-sm font-semibold text-texto ">Ítems</h2>
              <div className="flex flex-col gap-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-6">
                      <Campo
                        etiqueta="Descripción"
                        value={it.description}
                        onChange={(e) => editarItem(i, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Campo
                        etiqueta="Cant."
                        type="number"
                        min="1"
                        step="1"
                        value={it.quantity}
                        onChange={(e) => editarItem(i, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3">
                      <Campo
                        etiqueta="P. unit (S/)"
                        value={it.unitPrice}
                        onChange={(e) => editarItem(i, { unitPrice: e.target.value })}
                        inputMode="decimal"
                      />
                    </div>
                    <div className="col-span-1 pb-2 text-right">
                      <button
                        type="button"
                        onClick={() => quitarItem(i)}
                        aria-label={`Eliminar ítem ${i + 1}`}
                        className="text-texto-tenue hover:text-peligro"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Boton variante="secundario" type="button" className="mt-2" onClick={agregarItem}>
                Agregar ítem
              </Boton>
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Boton type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar y pasar a reparto'}
              </Boton>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-sm text-texto-suave ">
              {data.description || 'Sin descripción'}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-texto-suave ">Total</dt>
              <dd className="text-right font-medium text-texto ">
                {formatCentavos(data.totalCents)}
              </dd>
              <dt className="text-texto-suave ">Impuestos</dt>
              <dd className="text-right text-texto ">{formatCentavos(data.taxCents)}</dd>
              <dt className="text-texto-suave ">Propina</dt>
              <dd className="text-right text-texto ">{formatCentavos(data.tipCents)}</dd>
              <dt className="text-texto-suave ">Descuento</dt>
              <dd className="text-right text-texto ">{formatCentavos(data.discountCents)}</dd>
            </dl>
            {data.items.length > 0 ? (
              <ul className="mt-3 divide-y divide-borde-suave ">
                {data.items.map((it) => (
                  <li key={it.id} className="flex justify-between py-2 text-sm">
                    <span className="text-texto ">
                      {it.quantity}× {it.description}
                    </span>
                    <span className="text-texto ">{formatCentavos(it.subtotalCents)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!data.mine ? (
              <p className="mt-3 text-xs text-texto-tenue ">
                Solo {data.payer?.username ?? 'el pagador'} puede editar este comprobante.
              </p>
            ) : null}
          </div>
        )}

        {err ? (
          <div className="mt-3">
            <Alerta>{err}</Alerta>
          </div>
        ) : null}
      </Tarjeta>
    </>
  );
}
