import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { MODALIDADES, type ModalidadDivision } from '@splitvision/shared';
import { api, type ComprobanteDetalle } from '../api/client';
import { Boton, BotonSecundario, Campo, InsigniaEstado, MensajeError, Tarjeta } from '../components/ui';

interface ItemEditable {
  descripcion: string;
  monto: string;
  consumidores: string[];
}

interface Props {
  comprobanteId: string;
  participantes: { id: string; username: string }[];
  onCambio: () => void;
}

function soles(valor: number): string {
  return `S/ ${valor.toFixed(2)}`;
}

export function ComprobantePanel({ comprobanteId, participantes, onCambio }: Props) {
  const consultor = useQueryClient();
  const [montoTotal, setMontoTotal] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadDivision>('EQUITATIVO');
  const [items, setItems] = useState<ItemEditable[]>([]);
  const [impuestos, setImpuestos] = useState('0');
  const [propina, setPropina] = useState('0');
  const [descuentos, setDescuentos] = useState('0');
  const [inicializado, setInicializado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ['comprobante', comprobanteId],
    queryFn: () => api.get<{ comprobante: ComprobanteDetalle }>(`/comprobantes/${comprobanteId}`),
    refetchInterval: (query) =>
      query.state.data?.comprobante.estado === 'PROCESANDO' ? 2000 : false,
  });

  const comprobante = consulta.data?.comprobante;

  useEffect(() => {
    if (!comprobante || inicializado) return;
    const extraidos = comprobante.datosExtraidos;
    setMontoTotal(
      extraidos?.montoTotalCents != null
        ? (extraidos.montoTotalCents / 100).toFixed(2)
        : comprobante.montoTotal.toFixed(2),
    );
    setItems(
      (extraidos?.items ?? []).map((item) => ({
        descripcion: item.descripcion,
        monto: (item.montoCents / 100).toFixed(2),
        consumidores: [],
      })),
    );
    setInicializado(true);
  }, [comprobante, inicializado]);

  const dividir = useMutation({
    mutationFn: () =>
      api.post(`/comprobantes/${comprobanteId}/dividir`, {
        montoTotal: Number(montoTotal),
        modalidad,
        items:
          modalidad === 'POR_ITEMS'
            ? items.map((item) => ({
                descripcion: item.descripcion,
                monto: Number(item.monto),
                consumidores: item.consumidores,
              }))
            : [],
        ajustes:
          modalidad === 'POR_ITEMS'
            ? {
                impuestos: Number(impuestos),
                propina: Number(propina),
                descuentos: Number(descuentos),
              }
            : undefined,
      }),
    onSuccess: () => {
      setError(null);
      consultor.invalidateQueries({ queryKey: ['comprobante', comprobanteId] });
      consultor.invalidateQueries({ queryKey: ['comprobantes'] });
      onCambio();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo dividir el gasto'),
  });

  function alternarConsumidor(indiceItem: number, usuarioId: string) {
    setItems((actuales) =>
      actuales.map((item, indice) => {
        if (indice !== indiceItem) return item;
        const yaEsta = item.consumidores.includes(usuarioId);
        return {
          ...item,
          consumidores: yaEsta
            ? item.consumidores.filter((id) => id !== usuarioId)
            : [...item.consumidores, usuarioId],
        };
      }),
    );
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    dividir.mutate();
  }

  if (consulta.isLoading) return <p className="text-sm text-slate-500">Cargando comprobante...</p>;
  if (!comprobante) return <MensajeError mensaje="No se pudo cargar el comprobante" />;

  return (
    <Tarjeta className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-800">Comprobante</h3>
        <InsigniaEstado estado={comprobante.estado} />
      </div>

      <img
        src={comprobante.imagenUrl}
        alt="Comprobante"
        className="max-h-64 rounded-md border border-slate-200 object-contain"
      />

      {comprobante.estado === 'PROCESANDO' && (
        <p className="text-sm text-amber-700">
          Extraccion en segundo plano... el sistema sigue disponible mientras el OCR responde.
        </p>
      )}

      {comprobante.estado === 'FALLIDO' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">La extraccion fallo tras agotar los reintentos.</p>
          <p className="mt-1">{String(comprobante.datosExtraidos?.error ?? '')}</p>
          <p className="mt-1">Puedes subir otra foto del comprobante para reintentar.</p>
        </div>
      )}

      {comprobante.estado === 'CONFIRMADO' && (
        <div className="space-y-2 text-sm">
          <p className="text-slate-600">
            Gasto confirmado ({comprobante.modalidad}) por {soles(comprobante.montoTotal)}.
          </p>
          {comprobante.deudas.map((deuda) => (
            <div key={deuda.id} className="flex justify-between rounded-md bg-slate-50 px-3 py-2">
              <span>{deuda.deudor.username}</span>
              <span>
                {soles(deuda.montoTotal)} · saldo {soles(deuda.saldo)}
              </span>
            </div>
          ))}
        </div>
      )}

      {comprobante.estado === 'PROCESADO' && (
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-slate-600">
            Verifica los datos extraidos (son un dato no confiable) y elige como repartir el gasto.
          </p>

          <Campo
            etiqueta="Monto total verificado (S/)"
            type="number"
            step="0.01"
            min="0.01"
            value={montoTotal}
            onChange={(e) => setMontoTotal(e.target.value)}
            required
          />

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Modalidad de reparto</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as ModalidadDivision)}
            >
              {MODALIDADES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion === 'EQUITATIVO' ? 'Reparto equitativo' : 'Reparto por items'}
                </option>
              ))}
            </select>
          </label>

          {modalidad === 'POR_ITEMS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-700">Items del comprobante</h4>
                <BotonSecundario
                  type="button"
                  onClick={() =>
                    setItems((actuales) => [
                      ...actuales,
                      { descripcion: '', monto: '', consumidores: [] },
                    ])
                  }
                >
                  Agregar item
                </BotonSecundario>
              </div>

              {items.map((item, indice) => (
                <div key={indice} className="space-y-2 rounded-md border border-slate-200 p-3">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Descripcion"
                      value={item.descripcion}
                      onChange={(e) =>
                        setItems((actuales) =>
                          actuales.map((it, i) =>
                            i === indice ? { ...it, descripcion: e.target.value } : it,
                          ),
                        )
                      }
                      required
                    />
                    <input
                      className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Monto"
                      value={item.monto}
                      onChange={(e) =>
                        setItems((actuales) =>
                          actuales.map((it, i) =>
                            i === indice ? { ...it, monto: e.target.value } : it,
                          ),
                        )
                      }
                      required
                    />
                    <BotonSecundario type="button" onClick={() => setItems((a) => a.filter((_, i) => i !== indice))}>
                      X
                    </BotonSecundario>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {participantes.map((participante) => (
                      <label key={participante.id} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={item.consumidores.includes(participante.id)}
                          onChange={() => alternarConsumidor(indice, participante.id)}
                        />
                        {participante.username}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-3 gap-2">
                <Campo etiqueta="Impuestos" type="number" step="0.01" min="0" value={impuestos} onChange={(e) => setImpuestos(e.target.value)} />
                <Campo etiqueta="Propina" type="number" step="0.01" min="0" value={propina} onChange={(e) => setPropina(e.target.value)} />
                <Campo etiqueta="Descuentos" type="number" step="0.01" min="0" value={descuentos} onChange={(e) => setDescuentos(e.target.value)} />
              </div>
            </div>
          )}

          <MensajeError mensaje={error} />

          <Boton type="submit" disabled={dividir.isPending}>
            {dividir.isPending ? 'Confirmando...' : 'Confirmar datos y generar deudas'}
          </Boton>
        </form>
      )}
    </Tarjeta>
  );
}
