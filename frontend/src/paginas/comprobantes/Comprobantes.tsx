import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listarComprobantes, reintentarComprobante } from '../../api/comprobantes';
import type { ComprobanteResumen } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { ESTILO_ESTADO, ETIQUETA_ESTADO } from '../../componentes/estadoComprobante';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

export function Comprobantes() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const consulta = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: errorCarga } = useQuery({
    queryKey: ['receipts', id],
    queryFn: () => listarComprobantes(id),
    enabled: Boolean(id),
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.status === 'PROCESANDO') ? 3000 : false,
  });

  const reintentar = useMutation({
    mutationFn: (receiptId: string) => reintentarComprobante(receiptId),
    onSuccess: () => {
      setError(null);
      void consulta.invalidateQueries({ queryKey: ['receipts', id] });
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <>
      <Link
        to={`/eventos/${id}`}
        className="text-sm font-medium text-primario hover:text-primario-fuerte "
      >
        ← Volver al evento
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-texto ">Comprobantes</h1>

      <Tarjeta className="mt-4">
        {isLoading ? <Cargando texto="Cargando comprobantes…" /> : null}
        {isError ? <Alerta>{mensajeDeError(errorCarga)}</Alerta> : null}
        {error ? <Alerta>{error}</Alerta> : null}

        {data && data.length === 0 ? (
          <EstadoVacio titulo="Sin comprobantes" mensaje="Aún no se ha registrado ningún gasto en este evento." />
        ) : null}

        {data && data.length > 0 ? (
          <ul className="divide-y divide-borde-suave ">
            {data.map((r) => (
              <FilaComprobante
                key={r.id}
                comprobante={r}
                onReintentar={() => reintentar.mutate(r.id)}
                reintentando={reintentar.isPending && reintentar.variables === r.id}
                onRevisar={() => navigate(`/comprobantes/${r.id}`)}
              />
            ))}
          </ul>
        ) : null}

        <div className="mt-3">
          <Boton onClick={() => navigate(`/eventos/${id}/comprobantes/nuevo`)}>Subir comprobante</Boton>
        </div>
      </Tarjeta>
    </>
  );
}

function FilaComprobante({
  comprobante,
  onRevisar,
  onReintentar,
  reintentando,
}: {
  comprobante: ComprobanteResumen;
  onRevisar: () => void;
  onReintentar: () => void;
  reintentando: boolean;
}) {
  const r = comprobante;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-texto ">
          {r.description || `Comprobante ${r.id.slice(0, 8)}`}
        </p>
        <p className="text-xs text-texto-suave ">
          {formatCentavos(r.totalCents)} · {r.payer}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO_ESTADO[r.status]}`}>
          {ETIQUETA_ESTADO[r.status]}
        </span>
        {r.status === 'EXTRAÍDO' ? <Boton onClick={onRevisar}>Revisar</Boton> : null}
        {r.status === 'CONFIRMADO' ? (
          <Boton variante="secundario" onClick={onRevisar}>
            Ver detalle
          </Boton>
        ) : null}
        {r.status === 'FALLIDO' && r.mine ? (
          <Boton variante="secundario" onClick={onReintentar} disabled={reintentando}>
            {reintentando ? 'Reintentando…' : 'Reintentar'}
          </Boton>
        ) : null}
      </div>
    </li>
  );
}
