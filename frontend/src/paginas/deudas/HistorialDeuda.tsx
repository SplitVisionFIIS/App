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
import { useSesion } from '../../auth';

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
  const { usuario } = useSesion();

  const { data, isLoading, isError, error: errCarga } = useQuery({
    queryKey: ['historial-deuda', id],
    queryFn: () => historialDeuda(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <Cargando texto="Cargando historial…" />;
  if (isError) return <Alerta>{mensajeDeError(errCarga)}</Alerta>;
  if (!data) return null;

  const soyDeudor = Boolean(usuario && data.debtor && usuario.toLowerCase() === data.debtor.toLowerCase());
  const soyAcreedor = Boolean(usuario && data.creditor && usuario.toLowerCase() === data.creditor.toLowerCase());
  const pagosReales = data.payments.filter((p) => p.reference !== 'COMPENSACION');

  return (
    <div className="space-y-5">
      <div>
        <Link to="/deudas" className="text-xs font-semibold text-primario hover:underline">
          ← Volver a Mis deudas
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-texto">
          {soyDeudor
            ? `Debes a ${data.creditor}`
            : soyAcreedor
              ? `${data.debtor} te debe`
              : 'Detalle de la deuda'}
        </h1>
        <p className="text-sm text-texto-suave">
          {data.eventName} ·{' '}
          {soyDeudor
            ? `Saldo neto a transferir a ${data.creditor}`
            : soyAcreedor
              ? `Saldo neto que ${data.debtor} te debe transferir`
              : `${data.debtor} le debe a ${data.creditor}`}
        </p>
      </div>

      {error && <Alerta tono="error">{error}</Alerta>}

      {/* Desglose de Cuentas Claras Humano y Transparente */}
      {data.eventBreakdown ? (
        <Tarjeta className="border-primario/25 bg-gradient-to-br from-primario-suave/20 to-superficie shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-sm font-bold text-texto flex items-center gap-2">
              <span>🧾</span>
              <span>
                {soyDeudor
                  ? `¿Cómo se calculó lo que debes a ${data.creditor}?`
                  : soyAcreedor
                    ? `¿Cómo se calculó lo que ${data.debtor} te debe?`
                    : `¿Cómo se calculó este saldo entre ${data.debtor} y ${data.creditor}?`}
              </span>
            </h2>
            <span className="self-start sm:self-auto rounded-full bg-primario-suave/70 px-2.5 py-0.5 text-[10px] font-bold text-primario">
              Cruce automático de consumos
            </span>
          </div>

          <p className="text-xs text-texto-suave">
            {soyDeudor
              ? `En lugar de transferir boleta por boleta, se cruzaron tus consumos con los de ${data.creditor} en este evento. Solo debes transferir la diferencia neta.`
              : soyAcreedor
                ? `En lugar de transferencias separadas por cada boleta, se cruzaron los consumos de ${data.debtor} con los tuyos en este evento. ${data.debtor} solo te transferirá la diferencia neta.`
                : 'En lugar de hacer pagos separados de ida y vuelta para cada boleta, se suman todos los consumos mutuos en este evento y se transfiere solo la diferencia neta.'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Consumos del deudor */}
            <div className="rounded-xl border border-borde bg-superficie p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-texto border-b border-borde-suave pb-2">
                <span>
                  {soyDeudor
                    ? `1. Lo que tú consumiste de ${data.creditor}`
                    : soyAcreedor
                      ? `1. Lo que ${data.debtor} consumió de tus boletas`
                      : `1. Lo que ${data.debtor} consumió de ${data.creditor}`}
                </span>
                <span className={`font-mono font-bold ${soyAcreedor ? 'text-exito' : 'text-primario'}`}>
                  +{formatCentavos(data.eventBreakdown.totalDebtorConsumedCents)}
                </span>
              </div>
              <ul className="divide-y divide-borde-suave text-xs text-texto-suave">
                {data.eventBreakdown.debtorConsumptions.map((c, i) => (
                  <li key={i} className="flex justify-between py-1.5 first:pt-1 last:pb-0">
                    <span className="truncate pr-2 font-medium">{c.description || 'Consumo en boleta'}</span>
                    <span className="font-mono tabular-nums text-texto font-semibold shrink-0">
                      {formatCentavos(c.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Consumos del acreedor a favor del deudor */}
            <div className="rounded-xl border border-borde bg-superficie p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-texto border-b border-borde-suave pb-2">
                <span>
                  {soyDeudor
                    ? `2. Lo que ${data.creditor} consumió de ti (se descuenta)`
                    : soyAcreedor
                      ? `2. Lo que tú consumiste de sus boletas (se te descuenta)`
                      : `2. Lo que ${data.creditor} consumió de ${data.debtor}`}
                </span>
                <span className="font-mono text-exito font-bold">
                  -{formatCentavos(data.eventBreakdown.totalCreditorConsumedCents)}
                </span>
              </div>
              {data.eventBreakdown.creditorConsumptions.length > 0 ? (
                <ul className="divide-y divide-borde-suave text-xs text-texto-suave">
                  {data.eventBreakdown.creditorConsumptions.map((c, i) => (
                    <li key={i} className="flex justify-between py-1.5 first:pt-1 last:pb-0">
                      <span className="truncate pr-2 font-medium">{c.description || 'Consumo en boleta'}</span>
                      <span className="font-mono tabular-nums text-texto font-semibold shrink-0">
                        {formatCentavos(c.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-texto-tenue italic py-2">
                  {soyDeudor
                    ? `${data.creditor} no tuvo consumos en boletas pagadas por ti.`
                    : soyAcreedor
                      ? `No tuviste consumos en boletas pagadas por ${data.debtor}.`
                      : `${data.creditor} no tuvo consumos en boletas de ${data.debtor}.`}
                </p>
              )}
            </div>
          </div>

          {/* Resultado Neto y Acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primario/30 bg-superficie p-3.5">
            <div>
              <p className="text-xs font-bold text-texto">
                {soyDeudor
                  ? '3. Saldo final que debes transferir:'
                  : soyAcreedor
                    ? `3. Saldo final que ${data.debtor} te debe transferir:`
                    : '3. Saldo final neto:'}
              </p>
              <p className="text-[11px] text-texto-suave">
                {formatCentavos(data.eventBreakdown.totalDebtorConsumedCents)}{' '}
                {soyDeudor ? '(tus consumos)' : soyAcreedor ? `(consumos de ${data.debtor})` : `(${data.debtor})`}
                {' − '}
                {formatCentavos(data.eventBreakdown.totalCreditorConsumedCents)}{' '}
                {soyDeudor ? `(consumos de ${data.creditor})` : soyAcreedor ? '(tus consumos)' : `(${data.creditor})`}
                {' = '}
                <strong className={`text-base font-mono font-bold ml-1 ${soyAcreedor ? 'text-exito' : 'text-primario'}`}>
                  {formatCentavos(data.pendingCents)}
                </strong>
              </p>
            </div>

            {/* Acción para el deudor */}
            {soyDeudor && data.availableCents > 0 && (
              <Link
                to={`/deudas/${id}/pago`}
                className="inline-flex items-center justify-center rounded-xl bg-primario px-4 py-2 text-xs font-bold text-sobre-primario shadow-sm shadow-primario/25 hover:bg-primario-fuerte transition-all active:scale-95 shrink-0"
              >
                Pagar saldo de {formatCentavos(data.availableCents)}
              </Link>
            )}

            {soyDeudor && data.availableCents === 0 && data.pendingCents > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-aviso-suave/60 px-3 py-1.5 text-xs font-semibold text-aviso-fuerte shrink-0">
                ⏳ Pago enviado, esperando confirmación
              </span>
            )}

            {/* Estado para el acreedor */}
            {soyAcreedor && data.pendingCents > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-exito-suave/50 px-3 py-1.5 text-xs font-semibold text-exito shrink-0">
                <span>⏳</span>
                <span>Pendiente de cobro · Esperando transferencia de {data.debtor}</span>
              </div>
            )}

            {data.pendingCents === 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-exito-suave/60 px-3 py-1.5 text-xs font-semibold text-exito shrink-0">
                ✓ Saldado completamente
              </span>
            )}
          </div>
        </Tarjeta>
      ) : (
        /* Tarjeta Fallback si no hay desglose múltiple */
        <Tarjeta className="shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-texto-suave">
                {soyDeudor
                  ? 'Saldo que debes pagar:'
                  : soyAcreedor
                    ? `Saldo que ${data.debtor} te debe transferir:`
                    : 'Saldo pendiente:'}
              </p>
              <p className={`text-xl font-bold font-mono ${soyAcreedor ? 'text-exito' : 'text-primario'}`}>
                {formatCentavos(data.pendingCents)}
              </p>
            </div>
            {soyDeudor && data.availableCents > 0 && (
              <Link
                to={`/deudas/${id}/pago`}
                className="inline-flex items-center justify-center rounded-xl bg-primario px-4 py-2 text-xs font-bold text-sobre-primario shadow-sm hover:bg-primario-fuerte shrink-0"
              >
                Pagar {formatCentavos(data.availableCents)}
              </Link>
            )}
            {soyAcreedor && data.pendingCents > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-exito-suave/50 px-3 py-1.5 text-xs font-semibold text-exito shrink-0">
                <span>⏳</span>
                <span>Pendiente de cobro (esperando a {data.debtor})</span>
              </div>
            )}
          </div>
        </Tarjeta>
      )}

      {/* Historial de pagos reales */}
      <Tarjeta className="shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
          Comprobantes y transferencias reales registradas
        </h2>

        {pagosReales.length === 0 ? (
          <p className="mt-3 text-sm text-texto-suave">
            No se han registrado pagos bancarios (Yape, Plin, transferencia o efectivo) para esta cuenta.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-borde-suave">
            {pagosReales.map((p) => (
              <PagoItem
                key={p.id}
                pago={p}
                soyDeudor={soyDeudor}
                soyAcreedor={soyAcreedor}
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
        )}
      </Tarjeta>
    </div>
  );
}

function PagoItem({
  pago,
  soyDeudor,
  soyAcreedor,
  onError,
  onOk,
}: {
  pago: PagoHistorial;
  soyDeudor: boolean;
  soyAcreedor: boolean;
  onError: (m: string | null) => void;
  onOk: () => void;
}) {
  const cancelar = useMutation({
    mutationFn: () => cancelarPago(pago.id),
    onSuccess: onOk,
    onError: (e) => onError(mensajeDeError(e)),
  });

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-1 last:pb-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-texto">
            {formatCentavos(pago.amountCents)} · <span className="uppercase text-primario">{pago.method}</span>
            {pago.reference ? <span className="ml-2 font-mono text-xs font-normal text-texto-suave">Ref: {pago.reference}</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-texto-suave">
            {formatFechaHora(pago.createdAt)} ·{' '}
            <span
              className={`font-semibold ${
                pago.status === 'CONFIRMADO'
                  ? 'text-exito'
                  : pago.status === 'RECHAZADO'
                    ? 'text-peligro'
                    : 'text-aviso'
              }`}
            >
              {ESTADO[pago.status]}
            </span>
          </p>
          {pago.rejectReason && <p className="mt-1 text-xs text-peligro font-medium">Motivo: {pago.rejectReason}</p>}
        </div>

        {pago.status === 'PENDIENTE' && soyDeudor && (
          <Boton
            variante="secundario"
            onClick={() => cancelar.mutate()}
            disabled={cancelar.isPending}
          >
            {cancelar.isPending ? 'Cancelando…' : 'Cancelar pago'}
          </Boton>
        )}

        {pago.status === 'PENDIENTE' && soyAcreedor && (
          <Link
            to="/bandeja-pagos"
            className="inline-flex items-center justify-center rounded-xl bg-primario px-3 py-1.5 text-xs font-bold text-sobre-primario shadow-2xs hover:bg-primario-fuerte transition-all active:scale-95"
          >
            Revisar en Bandeja de pagos →
          </Link>
        )}
      </div>

      {pago.hasEvidence && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-texto-suave mb-1">Comprobante adjunto:</p>
          <img
            src={urlEvidenciaPago(pago.id)}
            alt="Comprobante de pago"
            className="max-h-48 rounded-xl border border-borde object-cover shadow-2xs"
          />
        </div>
      )}
    </li>
  );
}
