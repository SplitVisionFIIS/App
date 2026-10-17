import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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

export function MisDeudas() {
  const [tab, setTab] = useState<'owing' | 'owed'>('owing');
  const key = ['deudas', tab];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: key,
    queryFn: () => deudas({ direction: tab }),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">Mis deudas</h1>
        <p className="text-sm text-texto-suave">
          Lleva el control de los saldos que debes abonar y los reembolsos que tienes pendientes de cobro.
        </p>
      </header>

      {/* Selector de pestañas */}
      <div className="inline-flex rounded-xl border border-borde bg-superficie-2/70 p-1 shadow-xs">
        <Boton
          variante={tab === 'owing' ? 'primario' : 'fantasma'}
          className={tab === 'owing' ? 'shadow-xs' : ''}
          onClick={() => setTab('owing')}
        >
          Debo
        </Boton>
        <Boton
          variante={tab === 'owed' ? 'primario' : 'fantasma'}
          className={tab === 'owed' ? 'shadow-xs' : ''}
          onClick={() => setTab('owed')}
        >
          Me deben
        </Boton>
      </div>

      <Tarjeta className="shadow-xs">
        {isLoading && <Cargando texto="Cargando deudas…" />}
        {isError && <Alerta tono="error">{mensajeDeError(error)}</Alerta>}
        {data && data.length === 0 && (
          <EstadoVacio
            titulo="Sin deudas"
            mensaje={tab === 'owing' ? 'No tienes deudas pendientes.' : 'Nadie te debe por ahora.'}
          />
        )}
        {data && data.length > 0 && (
          <ul className="divide-y divide-borde-suave">
            {data.map((d) => (
              <ItemDeuda key={d.debtId} deuda={d} direction={tab} />
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

function ItemDeuda({ deuda, direction }: { deuda: Deuda; direction: 'owing' | 'owed' }) {
  const esDebo = direction === 'owing';

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
      <div className="flex items-center gap-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${
            esDebo
              ? 'border border-primario/30 bg-primario-suave/40 text-primario'
              : 'border border-exito/30 bg-exito-suave/40 text-exito'
          }`}
        >
          {esDebo ? '↗' : '↙'}
        </span>

        <div>
          <p className="text-sm font-bold text-texto">{deuda.eventName}</p>
          <p className="mt-0.5 text-xs text-texto-suave">
            {esDebo ? `A ${deuda.creditor}` : `De ${deuda.debtor}`} ·{' '}
            <span className={`font-semibold ${esDebo ? 'text-primario' : 'text-exito'}`}>
              {formatCentavos(deuda.amountCents)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/deudas/${deuda.debtId}`}
          className="inline-flex items-center justify-center rounded-xl border border-borde bg-superficie px-3.5 py-1.5 text-xs font-semibold text-texto shadow-2xs hover:bg-superficie-2 hover:border-borde/90 transition-all active:scale-95"
        >
          Historial
        </Link>
        {esDebo && deuda.availableCents !== undefined && deuda.availableCents > 0 && (
          <Link
            to={`/deudas/${deuda.debtId}/pago`}
            className="inline-flex items-center justify-center rounded-xl bg-primario px-4 py-1.5 text-xs font-semibold text-sobre-primario shadow-sm shadow-primario/25 hover:bg-primario-fuerte transition-all active:scale-95"
          >
            Pagar
          </Link>
        )}
      </div>
    </li>
  );
}
