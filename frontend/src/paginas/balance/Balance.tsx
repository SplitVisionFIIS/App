import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { obtenerBalance } from '../../api/consultas';
import { Alerta } from '../../componentes/Alerta';
import { Cargando } from '../../componentes/Cargando';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

export function Balance() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['balance', id],
    queryFn: () => obtenerBalance(id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });

  return (
    <>
      <Link to={`/eventos/${id}`} className="text-sm font-medium text-primario hover:text-primario-fuerte ">
        ← Volver al evento
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-texto ">Balance</h1>

      <Tarjeta className="mt-4">
        {isLoading && <Cargando texto="Cargando balance…" />}
        {isError && <Alerta>{mensajeDeError(error)}</Alerta>}
        {data && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-texto-suave ">
                  <th className="pb-2">Participante</th>
                  <th className="pb-2 text-right">Pagó</th>
                  <th className="pb-2 text-right">Debe</th>
                  <th className="pb-2 text-right">Le deben</th>
                  <th className="pb-2 text-right">Neto</th>
                  <th className="pb-2 text-right">En revisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde-suave ">
                {data.participants.map((p) => (
                  <tr key={p.userId}>
                    <td className="py-2 text-texto ">{p.username}</td>
                    <td className="py-2 text-right text-texto-suave ">{formatCentavos(p.paidCents)}</td>
                    <td className="py-2 text-right text-texto-suave ">{formatCentavos(p.debtCents)}</td>
                    <td className="py-2 text-right text-texto-suave ">{formatCentavos(p.receivedCents)}</td>
                    <td className={`py-2 text-right font-medium ${p.netCents >= 0 ? 'text-exito' : 'text-peligro'}`}>
                      {formatCentavos(p.netCents)}
                    </td>
                    <td className="py-2 text-right text-texto-suave ">{formatCentavos(p.underReviewCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-texto-suave">Gastado</p>
                <p className="text-texto ">{formatCentavos(data.totals.spentCents)}</p>
              </div>
              <div>
                <p className="text-texto-suave">Saldado</p>
                <p className="text-texto ">{formatCentavos(data.totals.settledCents)}</p>
              </div>
              <div>
                <p className="text-texto-suave">En revisión</p>
                <p className="text-texto ">{formatCentavos(data.totals.underReviewCents)}</p>
              </div>
              <div>
                <p className="text-texto-suave">Pendiente</p>
                <p className="text-texto ">{formatCentavos(data.totals.outstandingCents)}</p>
              </div>
            </div>
          </>
        )}
      </Tarjeta>
    </>
  );
}
