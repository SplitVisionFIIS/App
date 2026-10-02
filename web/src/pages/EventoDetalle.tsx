import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { METODOS_PAGO, type MetodoPago } from '@splitvision/shared';
import {
  api,
  type Balance,
  type ComprobanteResumen,
  type Deuda,
  type EventoDetalle as DetalleEvento,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Boton,
  BotonSecundario,
  Campo,
  InsigniaEstado,
  MensajeError,
  Tarjeta,
} from '../components/ui';
import { ComprobantePanel } from './ComprobantePanel';

function soles(valor: number): string {
  return `S/ ${valor.toFixed(2)}`;
}

function FormPago({ deuda, onListo }: { deuda: Deuda; onListo: () => void }) {
  const [monto, setMonto] = useState((deuda.saldo / 2).toFixed(2));
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pagar = useMutation({
    mutationFn: () =>
      api.post(`/deudas/${deuda.id}/pagos`, {
        monto: Number(monto),
        metodo,
        referencia: referencia.trim() === '' ? undefined : referencia.trim(),
      }),
    onSuccess: () => {
      setError(null);
      onListo();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo registrar el pago'),
  });

  return (
    <form
      onSubmit={(evento: FormEvent) => {
        evento.preventDefault();
        pagar.mutate();
      }}
      className="mt-3 flex flex-wrap items-end gap-2"
    >
      <div className="w-28">
        <Campo etiqueta="Monto (S/)" type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Metodo</span>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as MetodoPago)}
        >
          {METODOS_PAGO.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </label>
      <div className="w-40">
        <Campo etiqueta="Referencia (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      </div>
      <Boton type="submit" disabled={pagar.isPending}>
        {pagar.isPending ? 'Registrando...' : 'Registrar pago'}
      </Boton>
      <div className="w-full">
        <MensajeError mensaje={error} />
      </div>
    </form>
  );
}

export function EventoDetalle() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const consultor = useQueryClient();
  const { usuario } = useAuth();

  const [invitado, setInvitado] = useState('');
  const [errorInvitado, setErrorInvitado] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [comprobanteAbierto, setComprobanteAbierto] = useState<string | null>(null);

  const consultaEvento = useQuery({
    queryKey: ['evento', eventoId],
    queryFn: () => api.get<{ evento: DetalleEvento }>(`/eventos/${eventoId}`),
  });

  const consultaDeudas = useQuery({
    queryKey: ['deudas', eventoId],
    queryFn: () => api.get<{ deudas: Deuda[] }>(`/eventos/${eventoId}/deudas`),
  });

  const consultaBalance = useQuery({
    queryKey: ['balance', eventoId],
    queryFn: () => api.get<{ balance: Balance }>(`/eventos/${eventoId}/balance`),
  });

  const consultaComprobantes = useQuery({
    queryKey: ['comprobantes', eventoId],
    queryFn: () => api.get<{ comprobantes: ComprobanteResumen[] }>(`/eventos/${eventoId}/comprobantes`),
    refetchInterval: (query) =>
      query.state.data?.comprobantes.some((c) => c.estado === 'PROCESANDO') ? 2000 : false,
  });

  function refrescarDeudas() {
    consultor.invalidateQueries({ queryKey: ['deudas', eventoId] });
    consultor.invalidateQueries({ queryKey: ['balance', eventoId] });
    consultor.invalidateQueries({ queryKey: ['comprobantes', eventoId] });
  }

  const invitar = useMutation({
    mutationFn: () => api.post(`/eventos/${eventoId}/participantes`, { usuario: invitado }),
    onSuccess: () => {
      setInvitado('');
      setErrorInvitado(null);
      consultor.invalidateQueries({ queryKey: ['evento', eventoId] });
    },
    onError: (err) =>
      setErrorInvitado(err instanceof Error ? err.message : 'No se pudo invitar al usuario'),
  });

  const subir = useMutation({
    mutationFn: () => {
      const formulario = new FormData();
      if (archivo) formulario.append('imagen', archivo);
      return api.postForm<{ comprobante: { id: string } }>(
        `/eventos/${eventoId}/comprobantes`,
        formulario,
      );
    },
    onSuccess: (datos) => {
      setArchivo(null);
      setErrorSubida(null);
      setComprobanteAbierto(datos.comprobante.id);
      consultor.invalidateQueries({ queryKey: ['comprobantes', eventoId] });
    },
    onError: (err) =>
      setErrorSubida(err instanceof Error ? err.message : 'No se pudo subir el comprobante'),
  });

  const evento = consultaEvento.data?.evento;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{evento?.nombre ?? 'Evento'}</h1>
        <p className="text-sm text-slate-500">
          {evento?.participantes.length ?? 0} participantes vinculados
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta className="space-y-3">
          <h2 className="font-medium text-slate-800">Participantes</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {evento?.participantes.map((participante) => (
              <li key={participante.id} className="flex justify-between rounded-md bg-slate-50 px-3 py-1.5">
                <span>{participante.username}</span>
                <span className="text-slate-400">{participante.email}</span>
              </li>
            ))}
          </ul>
          <form
            className="flex items-end gap-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              invitar.mutate();
            }}
          >
            <div className="flex-1">
              <Campo
                etiqueta="Invitar por username o correo"
                value={invitado}
                onChange={(e) => setInvitado(e.target.value)}
                required
              />
            </div>
            <Boton type="submit" disabled={invitar.isPending}>
              Invitar
            </Boton>
          </form>
          <MensajeError mensaje={errorInvitado} />
        </Tarjeta>

        <Tarjeta className="space-y-3">
          <h2 className="font-medium text-slate-800">Balance del evento</h2>
          {consultaBalance.data?.balance.saldado && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Cuentas saldadas: el saldo total pendiente es S/ 0.00
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1.5">Participante</th>
                <th className="py-1.5">Debe</th>
                <th className="py-1.5">Ha pagado</th>
                <th className="py-1.5">Le deben</th>
              </tr>
            </thead>
            <tbody>
              {consultaBalance.data?.balance.participantes.map((participante) => (
                <tr key={participante.usuarioId} className="border-b border-slate-100">
                  <td className="py-1.5">{participante.username}</td>
                  <td className="py-1.5">{soles(participante.debe)}</td>
                  <td className="py-1.5">{soles(participante.haPagado)}</td>
                  <td className="py-1.5">{soles(participante.leDeben)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500">
            Pendiente total: {soles(consultaBalance.data?.balance.pendienteTotal ?? 0)}
          </p>
        </Tarjeta>
      </div>

      <Tarjeta className="space-y-3">
        <h2 className="font-medium text-slate-800">Comprobantes</h2>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            subir.mutate();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Foto del comprobante</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="text-sm"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          <Boton type="submit" disabled={subir.isPending || !archivo}>
            {subir.isPending ? 'Subiendo...' : 'Subir comprobante'}
          </Boton>
        </form>
        <MensajeError mensaje={errorSubida} />

        <div className="space-y-2">
          {consultaComprobantes.data?.comprobantes.map((comprobante) => (
            <div
              key={comprobante.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <InsigniaEstado estado={comprobante.estado} />
                <span className="text-slate-600">
                  {soles(comprobante.montoTotal)} · {comprobante.pagador.username}
                </span>
              </div>
              <BotonSecundario onClick={() => setComprobanteAbierto(comprobante.id)}>
                {comprobanteAbierto === comprobante.id ? 'Ocultar' : 'Ver / dividir'}
              </BotonSecundario>
            </div>
          ))}
          {consultaComprobantes.data?.comprobantes.length === 0 && (
            <p className="text-sm text-slate-500">
              Sin comprobantes aun. Sube la foto de un gasto para comenzar.
            </p>
          )}
        </div>

        {comprobanteAbierto && (
          <ComprobantePanel
            comprobanteId={comprobanteAbierto}
            participantes={evento?.participantes ?? []}
            onCambio={refrescarDeudas}
          />
        )}
      </Tarjeta>

      <Tarjeta className="space-y-3">
        <h2 className="font-medium text-slate-800">Matriz de deudas</h2>
        <div className="space-y-3">
          {consultaDeudas.data?.deudas.map((deuda) => (
            <div key={deuda.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{deuda.deudor.username}</strong> le debe a{' '}
                  <strong>{deuda.acreedor.username}</strong>
                </span>
                <span className="text-slate-600">
                  Total {soles(deuda.montoTotal)} · saldo {soles(deuda.saldo)}
                </span>
              </div>

              {deuda.pagos.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  {deuda.pagos.map((pago) => (
                    <li key={pago.id}>
                      {soles(pago.monto)} · {pago.metodo}
                      {pago.referencia ? ` · ${pago.referencia}` : ''} ·{' '}
                      {new Date(pago.fecha).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}

              {deuda.saldo > 0 && deuda.deudor.id === usuario?.id && (
                <FormPago deuda={deuda} onListo={refrescarDeudas} />
              )}
            </div>
          ))}
          {consultaDeudas.data?.deudas.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay deudas generadas aun. Confirma un comprobante para generarlas.
            </p>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}
