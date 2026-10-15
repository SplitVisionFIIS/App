import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  crearComprobanteManual,
  obtenerComprobante,
  reintentarComprobante,
  subirComprobante,
} from '../../api/comprobantes';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Cargando } from '../../componentes/Cargando';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';

const MENSAJES_ESTADO: Record<string, string> = {
  PROCESANDO: 'OCR en curso…',
  EXTRAÍDO: 'Datos extraídos listos para revisar',
  CONFIRMADO: 'Ya está confirmado',
  FALLIDO: 'La extracción falló',
};

type ItemForm = { description: string; quantity: string; unitPrice: string };

export function SubirComprobante() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const consulta = useQueryClient();
  const [params] = useSearchParams();
  const fallidoId = params.get('fallido');

  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [modoManual, setModoManual] = useState(Boolean(fallidoId));
  const [descripcion, setDescripcion] = useState('');
  const [total, setTotal] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);

  const { data: recibo, error: errorRecibo } = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => obtenerComprobante(receiptId!),
    enabled: Boolean(receiptId),
    refetchInterval: (q) => (q.state.data?.status === 'PROCESANDO' ? 3000 : false),
  });

  const seleccionar = (f: File | null) => {
    if (!f) return;
    setArchivo(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setAviso(null);
  };

  const subirImagen = async () => {
    if (!archivo || subiendo) return;
    setSubiendo(true);
    setError(null);
    try {
      const res = await subirComprobante(id, archivo);
      if (res.existing) {
        setAviso('Esta imagen ya estaba registrada en el evento.');
      }
      setReceiptId(res.id);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  };

  const crearManual = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (subiendo) return;
    setSubiendo(true);
    setError(null);
    try {
      const res = await crearComprobanteManual(id, {
        total,
        description: descripcion || undefined,
        receiptId: fallidoId ?? undefined,
        items: items.length
          ? items.map((it) => ({
              description: it.description,
              quantity: Number.parseInt(it.quantity, 10) || 1,
              unitPrice: it.unitPrice,
            }))
          : undefined,
      });
      setReceiptId(res.id);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  };

  const reintentar = async () => {
    if (!recibo) return;
    setError(null);
    try {
      await reintentarComprobante(recibo.id);
      await consulta.invalidateQueries({ queryKey: ['receipt', recibo.id] });
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  const editarItem = (i: number, cambio: Partial<ItemForm>) =>
    setItems((actuales) => actuales.map((it, idx) => (idx === i ? { ...it, ...cambio } : it)));

  return (
    <>
      <Link
        to={`/eventos/${id}`}
        className="text-sm font-medium text-primario hover:text-primario-fuerte "
      >
        ← Volver al evento
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-texto ">Subir comprobante</h1>

      {aviso ? (
        <div className="mt-3">
          <Alerta tono="exito">{aviso}</Alerta>
        </div>
      ) : null}

      {!receiptId && !modoManual ? (
        <Tarjeta className="mt-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              seleccionar(e.dataTransfer.files?.[0] || null);
            }}
            className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-borde bg-superficie-2 p-6 text-center  "
          >
            {preview ? (
              <img src={preview} alt="Preview comprobante" className="max-h-60 w-full max-w-md object-contain" />
            ) : (
              <>
                <p className="text-sm text-texto-suave ">
                  Arrastra una imagen o pulsa para elegir (JPG/PNG/WEBP, máx 5 MB)
                </p>
                <label className="inline-flex cursor-pointer rounded-lg bg-primario px-4 py-2 text-sm font-medium text-sobre-primario hover:bg-primario-fuerte">
                  Seleccionar imagen
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => seleccionar(e.target.files?.[0] || null)}
                  />
                </label>
                <Boton variante="secundario" onClick={() => setModoManual(true)} type="button">
                  Ingresar manualmente
                </Boton>
              </>
            )}
          </div>
          {preview ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton onClick={subirImagen} disabled={subiendo}>
                {subiendo ? 'Subiendo…' : 'Subir comprobante'}
              </Boton>
              <Boton variante="secundario" onClick={() => { setArchivo(null); setPreview(null); }} type="button">
                Cancelar
              </Boton>
              <Boton variante="secundario" onClick={() => setModoManual(true)} type="button">
                Ir a manual
              </Boton>
            </div>
          ) : null}
          {error ? <div className="mt-3"><Alerta>{error}</Alerta></div> : null}
        </Tarjeta>
      ) : null}

      {!receiptId && modoManual ? (
        <Tarjeta className="mt-4">
          <form onSubmit={crearManual} className="grid gap-3 sm:grid-cols-2">
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

            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-texto ">Ítems (opcional)</h2>
                <Boton
                  variante="secundario"
                  type="button"
                  onClick={() => setItems((a) => [...a, { description: '', quantity: '1', unitPrice: '' }])}
                >
                  Agregar ítem
                </Boton>
              </div>
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
                        aria-label={`Eliminar ítem ${i + 1}`}
                        onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}
                        className="text-texto-tenue hover:text-peligro"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Boton type="submit" disabled={subiendo || !total}>
                {subiendo ? 'Guardando…' : fallidoId ? 'Completar comprobante' : 'Crear comprobante'}
              </Boton>
              {!fallidoId ? (
                <Boton variante="secundario" type="button" onClick={() => setModoManual(false)}>
                  Volver a imagen
                </Boton>
              ) : null}
            </div>
          </form>
          {error ? <div className="mt-3"><Alerta>{error}</Alerta></div> : null}
        </Tarjeta>
      ) : null}

      {receiptId && !recibo ? <Cargando texto="Cargando comprobante…" /> : null}

      {recibo ? (
        <Tarjeta className="mt-4">
          <p className="text-sm text-texto-suave ">{MENSAJES_ESTADO[recibo.status]}</p>
          {errorRecibo ? <div className="mt-2"><Alerta>{mensajeDeError(errorRecibo)}</Alerta></div> : null}
          {recibo.status === 'FALLIDO' && recibo.failReason ? (
            <div className="mt-2"><Alerta>{recibo.failReason}</Alerta></div>
          ) : null}

          {recibo.status === 'EXTRAÍDO' ? (
            <div className="mt-3">
              <Boton onClick={() => navigate(`/comprobantes/${recibo.id}`)}>Revisar y repartir</Boton>
            </div>
          ) : recibo.status === 'PROCESANDO' ? (
            <p className="mt-2 text-sm text-texto-tenue ">Actualizando automáticamente…</p>
          ) : recibo.status === 'FALLIDO' ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton onClick={() => void reintentar()}>Reintentar lectura</Boton>
              <Boton
                variante="secundario"
                onClick={() => navigate(`/eventos/${recibo.eventId ?? id}/comprobantes/nuevo?fallido=${recibo.id}`)}
              >
                Completar manualmente
              </Boton>
            </div>
          ) : recibo.status === 'CONFIRMADO' ? (
            <div className="mt-3">
              <Boton onClick={() => navigate(`/eventos/${recibo.eventId ?? id}`)}>Volver al evento</Boton>
            </div>
          ) : null}

          {error ? <div className="mt-3"><Alerta>{error}</Alerta></div> : null}
        </Tarjeta>
      ) : null}
    </>
  );
}
