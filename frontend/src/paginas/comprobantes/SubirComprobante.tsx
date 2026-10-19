import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  crearComprobanteManual,
  eliminarComprobante,
  obtenerComprobante,
  reintentarComprobante,
  subirComprobante,
} from '../../api/comprobantes';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Cargando } from '../../componentes/Cargando';
import { DiagnosticoLecturaFallida } from '../../componentes/DiagnosticoLecturaFallida';
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
  const [arrastrando, setArrastrando] = useState(false);
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
    refetchInterval: (q) => (q.state.data?.status === 'PROCESANDO' ? 1000 : false),
  });

  useEffect(() => {
    if (recibo?.status === 'EXTRAÍDO') {
      const timer = setTimeout(() => {
        navigate(`/comprobantes/${recibo.id}`);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [recibo?.status, recibo?.id, navigate]);

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

  const [eliminando, setEliminando] = useState(false);

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

  const subirOtraImagen = async () => {
    if (!recibo) return;
    setEliminando(true);
    try {
      await eliminarComprobante(recibo.id);
      await consulta.invalidateQueries({ queryKey: ['receipts', id] });
      setReceiptId(null);
      setArchivo(null);
      setPreview(null);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEliminando(false);
    }
  };

  const borrarYSalir = async () => {
    if (!recibo) return;
    setEliminando(true);
    try {
      await eliminarComprobante(recibo.id);
      await consulta.invalidateQueries({ queryKey: ['receipts', id] });
      navigate(`/eventos/${recibo.eventId ?? id}`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEliminando(false);
    }
  };

  const editarItem = (i: number, cambio: Partial<ItemForm>) =>
    setItems((actuales) => actuales.map((it, idx) => (idx === i ? { ...it, ...cambio } : it)));

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/eventos/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-texto-suave transition-[color,transform] hover:text-texto active:scale-95"
        >
          ← Volver al evento
        </Link>
      </div>

      <div className="anim-stagger-1">
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">Subir comprobante</h1>
        <p className="mt-1 text-xs text-texto-suave">
          Digitaliza tus boletas mediante escaneo OCR automático o ingresa los montos a mano.
        </p>
      </div>

      {/* Selector de modo estilo switch editorial */}
      {!receiptId ? (
        <div className="inline-flex rounded-xl border border-borde bg-superficie-2 p-1 anim-stagger-2">
          <button
            type="button"
            onClick={() => setModoManual(false)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-[background-color,color,transform] active:scale-95 ${
              !modoManual
                ? 'bg-superficie text-texto shadow-2xs'
                : 'text-texto-suave hover:text-texto'
            }`}
          >
            Escanear imagen (OCR)
          </button>
          <button
            type="button"
            onClick={() => setModoManual(true)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-[background-color,color,transform] active:scale-95 ${
              modoManual
                ? 'bg-superficie text-texto shadow-2xs'
                : 'text-texto-suave hover:text-texto'
            }`}
          >
            Ingreso manual
          </button>
        </div>
      ) : null}

      {aviso ? (
        <div className="alerta-entrada">
          <Alerta tono="exito">{aviso}</Alerta>
        </div>
      ) : null}

      {!receiptId && !modoManual ? (
        <Tarjeta className="shadow-2xs anim-stagger-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              seleccionar(e.dataTransfer.files?.[0] || null);
            }}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-[border-color,background-color,transform] duration-200 ${
              arrastrando
                ? 'border-primario bg-primario-suave/30 scale-[1.01]'
                : 'border-borde bg-superficie-2/40 hover:border-borde-fuerte'
            }`}
          >
            {preview ? (
              <div className="relative overflow-hidden rounded-xl border border-borde bg-superficie p-2 shadow-xs">
                <img src={preview} alt="Preview comprobante" className="max-h-72 w-full max-w-md object-contain rounded-lg" />
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-borde bg-superficie text-primario shadow-2xs">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-texto">
                    Arrastra una imagen o pulsa para elegir
                  </p>
                  <p className="mt-0.5 text-xs text-texto-suave">
                    Formatos JPG, PNG o WEBP · Máximo 5 MB
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primario px-4 py-2 text-xs font-semibold text-sobre-primario shadow-2xs transition-[background-color,transform] hover:bg-primario-fuerte active:scale-[0.97]">
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
                </div>
              </>
            )}
          </div>
          {preview ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Boton onClick={subirImagen} disabled={subiendo} cargando={subiendo}>
                {subiendo ? 'Subiendo…' : 'Subir y procesar comprobante'}
              </Boton>
              <Boton variante="secundario" onClick={() => { setArchivo(null); setPreview(null); }} type="button">
                Cancelar
              </Boton>
              <Boton variante="secundario" onClick={() => setModoManual(true)} type="button">
                Ir a manual
              </Boton>
            </div>
          ) : null}
          {error ? <div className="mt-3 alerta-entrada"><Alerta tono="error">{error}</Alerta></div> : null}
        </Tarjeta>
      ) : null}

      {!receiptId && modoManual ? (
        <Tarjeta className="shadow-2xs anim-stagger-3">
          <form onSubmit={crearManual} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Campo
                etiqueta="Descripción del gasto"
                placeholder="Ej. Almuerzo Criollo, Combustible, Mercado"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <Campo
              etiqueta="Total (S/)"
              placeholder="0.00"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              inputMode="decimal"
              required
            />

            <div className="sm:col-span-2">
              <div className="mb-2.5 flex items-center justify-between border-t border-borde-suave pt-3">
                <div>
                  <h2 className="text-sm font-semibold text-texto">Ítems detallados</h2>
                  <p className="text-xs text-texto-suave">Opcional: desglosa los platos o productos individuales</p>
                </div>
                <Boton
                  variante="secundario"
                  type="button"
                  onClick={() => setItems((a) => [...a, { description: '', quantity: '1', unitPrice: '' }])}
                >
                  + Agregar ítem
                </Boton>
              </div>
              <div className="flex flex-col gap-2.5">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-borde-suave bg-superficie-2/30 p-2.5">
                    <div className="col-span-12 sm:col-span-6">
                      <Campo
                        etiqueta="Descripción"
                        placeholder="Nombre del ítem"
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
                        placeholder="0.00"
                        value={it.unitPrice}
                        onChange={(e) => editarItem(i, { unitPrice: e.target.value })}
                        inputMode="decimal"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 pb-2 text-right">
                      <button
                        type="button"
                        aria-label={`Eliminar ítem ${i + 1}`}
                        onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-texto-tenue transition-[color,background-color,transform] hover:bg-peligro-suave/30 hover:text-peligro active:scale-90"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2 border-t border-borde-suave">
              <Boton type="submit" disabled={subiendo || !total} cargando={subiendo}>
                {subiendo ? 'Guardando…' : fallidoId ? 'Completar comprobante' : 'Crear comprobante'}
              </Boton>
              {!fallidoId ? (
                <Boton variante="secundario" type="button" onClick={() => setModoManual(false)}>
                  Volver a imagen
                </Boton>
              ) : null}
            </div>
          </form>
          {error ? <div className="mt-3 alerta-entrada"><Alerta tono="error">{error}</Alerta></div> : null}
        </Tarjeta>
      ) : null}

      {receiptId && !recibo ? <Cargando texto="Cargando comprobante…" /> : null}

      {recibo ? (
        <div className="space-y-4 anim-stagger-2">
          {errorRecibo ? <Alerta tono="error" className="alerta-entrada">{mensajeDeError(errorRecibo)}</Alerta> : null}

          {recibo.status === 'PROCESANDO' ? (
            <Tarjeta className="shadow-2xs">
              <div className="relative overflow-hidden rounded-xl border border-borde bg-superficie-2 p-6 flex flex-col items-center text-center">
                <div className="anim-escaner" />
                {preview ? (
                  <img
                    src={preview}
                    alt="Escaneando comprobante"
                    className="max-h-72 w-full max-w-sm rounded-lg object-contain shadow-xs opacity-90"
                  />
                ) : (
                  <div className="h-44 w-full max-w-sm rounded-lg border border-borde-suave bg-superficie flex flex-col items-center justify-center gap-2 font-mono text-xs text-texto-suave">
                    <svg className="h-8 w-8 text-primario animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Leyendo comprobante con SplitVision OCR...
                  </div>
                )}
                <div className="mt-5 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primario opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primario"></span>
                  </span>
                  <span className="text-sm font-semibold text-texto">
                    {MENSAJES_ESTADO[recibo.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-texto-suave">
                  El worker está procesando la imagen y reconociendo productos y totales. Esta vista se actualiza automáticamente.
                </p>
              </div>
            </Tarjeta>
          ) : recibo.status === 'EXTRAÍDO' ? (
            <Tarjeta className="shadow-2xs">
              <div className="flex flex-col items-center text-center p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-exito/30 bg-exito-suave/40 text-exito shadow-2xs">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-3 text-lg font-bold text-texto">¡Comprobante extraído con éxito!</h2>
                <p className="mt-1 text-xs text-texto-suave max-w-md">
                  El OCR analizó con éxito tu comprobante. Revisa los conceptos identificados y asígnalos a los participantes del evento.
                </p>
                <div className="mt-5">
                  <Boton onClick={() => navigate(`/comprobantes/${recibo.id}`)}>
                    Revisar y repartir gastos →
                  </Boton>
                </div>
              </div>
            </Tarjeta>
          ) : recibo.status === 'FALLIDO' ? (
            <DiagnosticoLecturaFallida
              fotoUrl={preview}
              failReason={recibo.failReason}
              onReintentar={() => void reintentar()}
              onCompletarManual={() => navigate(`/eventos/${recibo.eventId ?? id}/comprobantes/nuevo?fallido=${recibo.id}`)}
              onSubirOtra={() => void subirOtraImagen()}
              onEliminar={() => void borrarYSalir()}
              eliminando={eliminando}
              esPropietario={recibo.mine ?? true}
            />
          ) : recibo.status === 'CONFIRMADO' ? (
            <Tarjeta className="shadow-2xs">
              <div className="flex flex-col items-center text-center p-4">
                <p className="text-sm font-semibold text-texto">{MENSAJES_ESTADO[recibo.status]}</p>
                <div className="mt-4">
                  <Boton onClick={() => navigate(`/eventos/${recibo.eventId ?? id}`)}>Volver al evento</Boton>
                </div>
              </div>
            </Tarjeta>
          ) : null}

          {error ? <div className="mt-3 alerta-entrada"><Alerta tono="error">{error}</Alerta></div> : null}
        </div>
      ) : null}
    </div>
  );
}
