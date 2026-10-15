import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelarPago, urlEvidenciaPago } from '../../api/pagos';
import { historialDeuda } from '../../api/consultas';
import type { HistorialDeuda, PagoHistorial } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos, formatFechaHora } from '../../i18n/formato';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';

const ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
};

export function HistorialDeuda() {
  const { id = '' } = useParams();
  const consulta = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: errCarga } = useQuery({
    queryKey: ['historial-deuda', id],
    queryFn: () => historialDeuda(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <Cargando texto="Cargando historial…" />;
  if (isError) return <Alerta>{mensajeDeError(errCarga)}</Alerta>;
  if (!data) return null;

  return (
    <>
      <Link to="/deudas" className="text-sm font-medium text-primario hover:text-primario-fuerte ">
        ← Mis deudas
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-texto ">Historial de la deuda</h1>

      <Tarjeta className="mt-4">
        <div className="text-sm">
          <p className="font-medium text-texto ">{data.eventName}</p>
          <p className="text-texto-suave ">{data.receiptDescription || 'Comprobante'}</p>
          <p className="mt-2">
            {data.debtor} debe a {data.creditor} · {formatCentavos(data.amountCents)}
          </p>
          <p className="text-xs text-texto-tenue ">
            Pendiente: {formatCentavos(data.pendingCents)} · Disponible: {formatCentavos(data.availableCents)}
          </p>
        </div>
        {error && (
          <div className="mt-2">
            <Alerta>{error}</Alerta>
          </div>
        )}
        <ul className="mt-4 divide-y divide-borde-suave ">
          {data.payments.map((p) => (
            <PagoItem
              key={p.id}
              pago={p}
              onError={setError}
              onOk={() => {
                setError(null);
                void consulta.invalidateQueries({ queryKey: ['historial-deuda', id] });
                void consulta.invalidateQueries({ queryKey: ['deudas'] });
                void consulta.invalidateQueries({ queryKey: ['pending'] });
              }}
            />
          ))}
        </ul>
      </Tarjeta>
    </>
  );
}

function PagoItem({
  pago,
  onError,
  onOk,
}: {
  pago: PagoHistorial;
  onError: (m: string | null) => void;
  onOk: () => void;
}) {
  const cancelar = useMutation({
    mutationFn: () => cancelarPago(pago.id),
    onSuccess: onOk,
    onError: (e) => onError(mensajeDeError(e)),
  });

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-texto ">
            {formatCentavos(pago.amountCents)} · {pago.method}
          </p>
          <p className="text-xs text-texto-suave ">
            {formatFechaHora(pago.createdAt)} · {ESTADO[pago.status]}
          </p>
          {pago.rejectReason && <p className="text-xs text-peligro ">Motivo: {pago.rejectReason}</p>}
        </div>
        {pago.status === 'PENDIENTE' && (
          <Boton
            variante="secundario"
            onClick={() => cancelar.mutate()}
            disabled={cancelar.isPending}
          >
            {cancelar.isPending ? 'Cancelando…' : 'Cancelar'}
          </Boton>
        )}
      </div>
      {pago.hasEvidence && <img src={urlEvidenciaPago(pago.id)} alt="Evidencia" className="max-h-40 rounded-lg border" />}
    </li>
  );
}
