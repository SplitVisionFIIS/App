import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { confirmarPago, rechazarPago, urlEvidenciaPago } from '../../api/pagos';
import { pagosPendientes } from '../../api/consultas';
import type { PagoPendiente } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Cargando } from '../../componentes/Cargando';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

export function BandejaPagos() {
  const consulta = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: errCarga } = useQuery({
    queryKey: ['pagos-pendientes'],
    queryFn: pagosPendientes,
    refetchInterval: 5000,
  });

  const confirmar = useMutation({
    mutationFn: (paymentId: string) => confirmarPago(paymentId),
    onSuccess: () => {
      void consulta.invalidateQueries({ queryKey: ['pagos-pendientes'] });
      void consulta.invalidateQueries({ queryKey: ['pending'] });
      void consulta.invalidateQueries({ queryKey: ['deudas'] });
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  const rechazar = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      rechazarPago(paymentId, { reason }),
    onSuccess: () => {
      setRechazandoId(null);
      setMotivo('');
      void consulta.invalidateQueries({ queryKey: ['pagos-pendientes'] });
      void consulta.invalidateQueries({ queryKey: ['pending'] });
      void consulta.invalidateQueries({ queryKey: ['deudas'] });
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <>
      <Link to="/bandeja" className="text-sm font-medium text-primario hover:text-primario-fuerte ">
        ← Bandeja
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-texto ">Pagos por confirmar</h1>

      <Tarjeta className="mt-4">
        {isLoading && <Cargando texto="Cargando pagos…" />}
        {isError && <Alerta>{mensajeDeError(errCarga)}</Alerta>}
        {error && <Alerta>{error}</Alerta>}

        {data && data.length === 0 && (
          <EstadoVacio titulo="Sin pagos pendientes" mensaje="No hay pagos por confirmar en este momento." />
        )}

        {data && data.length > 0 && (
          <ul className="divide-y divide-borde-suave ">
            {data.map((p) => (
              <ItemPago
                key={p.id}
                pago={p}
                confirmando={confirmar.isPending && confirmar.variables === p.id}
                rechazando={rechazar.isPending && rechazar.variables?.paymentId === p.id}
                onConfirmar={() => confirmar.mutate(p.id)}
                onRechazar={(reason) => rechazar.mutate({ paymentId: p.id, reason })}
                mostrandoRechazo={rechazandoId === p.id}
                onMostrarRechazo={() => { setRechazandoId(p.id); setMotivo(''); }}
                onCancelarRechazo={() => setRechazandoId(null)}
                motivo={motivo}
                onMotivoChange={setMotivo}
              />
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}

function ItemPago({
  pago,
  confirmando,
  rechazando,
  onConfirmar,
  onRechazar,
  mostrandoRechazo,
  onMostrarRechazo,
  onCancelarRechazo,
  motivo,
  onMotivoChange,
}: {
  pago: PagoPendiente;
  confirmando: boolean;
  rechazando: boolean;
  onConfirmar: () => void;
  onRechazar: (reason: string) => void;
  mostrandoRechazo: boolean;
  onMostrarRechazo: () => void;
  onCancelarRechazo: () => void;
  motivo: string;
  onMotivoChange: (v: string) => void;
}) {
  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-texto ">
            {pago.debtor} paga {formatCentavos(pago.amountCents)}
          </p>
          <p className="text-xs text-texto-suave ">
            {pago.method} · {pago.eventName}
          </p>
          {pago.reference && (
            <p className="text-xs text-texto-suave ">Ref.: {pago.reference}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton onClick={onConfirmar} disabled={confirmando || mostrandoRechazo}>
            {confirmando ? 'Confirmando…' : 'Confirmar'}
          </Boton>
          {!mostrandoRechazo && (
            <Boton variante="secundario" onClick={onMostrarRechazo} disabled={rechazando}>
              Rechazar
            </Boton>
          )}
        </div>
      </div>

      {pago.receiptId && (
        <img
          src={urlEvidenciaPago(pago.id)}
          alt="Evidencia de pago"
          className="max-h-40 w-auto rounded-lg border border-borde "
        />
      )}

      {mostrandoRechazo && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Campo
              etiqueta="Motivo del rechazo"
              value={motivo}
              onChange={(e) => onMotivoChange(e.target.value)}
              placeholder="Explica por qué rechazas este pago"
            />
          </div>
          <div className="flex gap-2">
            <Boton
              variante="peligro"
              onClick={() => onRechazar(motivo)}
              disabled={rechazando || motivo.trim().length === 0}
            >
              {rechazando ? 'Rechazando…' : 'Confirmar rechazo'}
            </Boton>
            <Boton variante="secundario" onClick={onCancelarRechazo} disabled={rechazando}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}
    </li>
  );
}
