import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deudas } from '../../api/consultas';
import { compensarSaldosEvento } from '../../api/eventos';
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
  const [verSaldadas, setVerSaldadas] = useState(false);
  const consulta = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['deudas', tab, verSaldadas],
    queryFn: () => deudas({ direction: tab, all: verSaldadas }),
    refetchInterval: 5000,
  });

  const otroSentido = tab === 'owing' ? 'owed' : 'owing';
  const queryCruzada = useQuery({
    queryKey: ['deudas', otroSentido, false],
    queryFn: () => deudas({ direction: otroSentido }),
    refetchInterval: 5000,
  });

  const deudasDebo = tab === 'owing' ? (data ?? []) : (queryCruzada.data ?? []);
  const deudasMeDeben = tab === 'owing' ? (queryCruzada.data ?? []) : (data ?? []);

  // Detectar y auto-compensar en segundo plano si existieran saldos cruzados
  useEffect(() => {
    const eventosCruzados = new Set<string>();
    for (const d of deudasDebo) {
      if (d.pendingCents > 0 && d.creditor) {
        const tieneEnContra = deudasMeDeben.some(
          (m) => m.eventId === d.eventId && m.debtor?.toLowerCase() === d.creditor?.toLowerCase() && m.pendingCents > 0,
        );
        if (tieneEnContra) {
          eventosCruzados.add(d.eventId);
        }
      }
    }
    if (eventosCruzados.size > 0) {
      for (const evId of eventosCruzados) {
        compensarSaldosEvento(evId)
          .then((res) => {
            if (res.compensatedCents > 0) {
              void consulta.invalidateQueries({ queryKey: ['deudas'] });
              void consulta.invalidateQueries({ queryKey: ['debts'] });
              void consulta.invalidateQueries({ queryKey: ['balance', evId] });
            }
          })
          .catch(() => undefined);
      }
    }
  }, [deudasDebo, deudasMeDeben, consulta]);

  const deudasFiltradas = verSaldadas
    ? (data ?? [])
    : (data ?? []).filter((d) => d.pendingCents > 0);

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
        {!isLoading && !isError && deudasFiltradas.length === 0 && (
          <EstadoVacio
            titulo="Sin deudas pendientes"
            mensaje={tab === 'owing' ? 'No tienes deudas pendientes.' : 'Nadie te debe por ahora.'}
          />
        )}
        {!isLoading && !isError && deudasFiltradas.length > 0 && (
          <ul className="divide-y divide-borde-suave">
            {deudasFiltradas.map((d) => (
              <ItemDeuda key={d.debtId} deuda={d} direction={tab} />
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-borde-suave pt-3 text-xs text-texto-suave">
          <p>
            {verSaldadas
              ? 'Mostrando deudas liquidadas mediante pagos reales (transferencias, Yape o efectivo).'
              : 'Solo se muestra el saldo pendiente neto tras cruzar cuentas mutuas.'}
          </p>
          <button
            type="button"
            onClick={() => setVerSaldadas((v) => !v)}
            className="font-semibold text-primario hover:underline"
          >
            {verSaldadas ? 'Ocultar historial de pagos' : 'Ver deudas que pagué'}
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}

function ItemDeuda({ deuda, direction }: { deuda: Deuda; direction: 'owing' | 'owed' }) {
  const esDebo = direction === 'owing';
  const yaSaldada = deuda.pendingCents === 0;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${
            yaSaldada
              ? 'border border-borde bg-superficie-2 text-texto-tenue'
              : esDebo
                ? 'border border-primario/30 bg-primario-suave/40 text-primario'
                : 'border border-exito/30 bg-exito-suave/40 text-exito'
          }`}
        >
          {yaSaldada ? '✓' : esDebo ? '↗' : '↙'}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-bold text-texto">{deuda.eventName}</p>
            {yaSaldada ? (
              <span className="rounded-md bg-exito-suave/70 px-1.5 py-0.5 text-[10px] font-bold text-exito">
                Abonada con pago real
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 text-xs text-texto-suave">
            {esDebo ? `A ${deuda.creditor}` : `De ${deuda.debtor}`} ·{' '}
            <span
              className={`font-semibold ${
                yaSaldada ? 'text-texto-tenue line-through' : esDebo ? 'text-primario font-bold' : 'text-exito font-bold'
              }`}
            >
              {formatCentavos(deuda.pendingCents > 0 ? deuda.pendingCents : deuda.amountCents)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/deudas/${deuda.debtId}`}
          className="inline-flex items-center justify-center rounded-xl border border-borde bg-superficie px-3 py-1.5 text-xs font-medium text-texto-suave shadow-2xs hover:text-texto hover:bg-superficie-2 hover:border-borde/90 transition-all active:scale-95"
          title="Ver detalle del cálculo y compensaciones"
        >
          {yaSaldada ? 'Ver comprobante' : 'Ver desglose'}
        </Link>
        {esDebo && !yaSaldada && deuda.availableCents !== undefined && deuda.availableCents > 0 && (
          <Link
            to={`/deudas/${deuda.debtId}/pago`}
            className="inline-flex items-center justify-center rounded-xl bg-primario px-4 py-1.5 text-xs font-semibold text-sobre-primario shadow-sm shadow-primario/25 hover:bg-primario-fuerte transition-all active:scale-95"
          >
            Pagar {formatCentavos(deuda.availableCents)}
          </Link>
        )}
      </div>
    </li>
  );
}
