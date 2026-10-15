import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deudas } from '../../api/consultas';
import type { Deuda } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';
import { useState } from 'react';

export function MisDeudas() {
  const [tab, setTab] = useState<'owing' | 'owed'>('owing');
  const key = ['deudas', tab];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: key,
    queryFn: () => deudas({ direction: tab }),
    refetchInterval: 5000,
  });

  return (
    <>
      <h1 className="text-xl font-semibold text-texto ">Mis deudas</h1>
      <div className="mt-3 flex gap-2">
        <Boton variante={tab === 'owing' ? 'primario' : 'secundario'} onClick={() => setTab('owing')}>
          Debo
        </Boton>
        <Boton variante={tab === 'owed' ? 'primario' : 'secundario'} onClick={() => setTab('owed')}>
          Me deben
        </Boton>
      </div>

      <Tarjeta className="mt-4">
        {isLoading && <Cargando texto="Cargando deudas…" />}
        {isError && <Alerta>{mensajeDeError(error)}</Alerta>}
        {data && data.length === 0 && (
          <EstadoVacio
            titulo="Sin deudas"
            mensaje={tab === 'owing' ? 'No tienes deudas pendientes.' : 'Nadie te debe por ahora.'}
          />
        )}
        {data && data.length > 0 && (
          <ul className="divide-y divide-borde-suave ">
            {data.map((d) => (
              <ItemDeuda key={d.debtId} deuda={d} direction={tab} />
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}

function ItemDeuda({ deuda, direction }: { deuda: Deuda; direction: 'owing' | 'owed' }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-texto ">{deuda.eventName}</p>
        <p className="text-xs text-texto-suave ">
          {direction === 'owing' ? `A ${deuda.creditor}` : `De ${deuda.debtor}`} · {formatCentavos(deuda.amountCents)}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          to={`/deudas/${deuda.debtId}`}
          className="inline-flex items-center justify-center rounded-lg border border-borde bg-superficie px-3 py-1.5 text-sm font-medium text-texto hover:bg-superficie-2   "
        >
          Historial
        </Link>
        {direction === 'owing' && deuda.availableCents !== undefined && deuda.availableCents > 0 && (
          <Link
            to={`/deudas/${deuda.debtId}/pago`}
            className="inline-flex items-center justify-center rounded-lg bg-primario px-3 py-1.5 text-sm font-medium text-sobre-primario hover:bg-primario-fuerte"
          >
            Pagar
          </Link>
        )}
      </div>
    </li>
  );
}
