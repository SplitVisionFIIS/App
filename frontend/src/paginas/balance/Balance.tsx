import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { obtenerBalance } from '../../api/consultas';
import { Alerta } from '../../componentes/Alerta';
import { Cargando } from '../../componentes/Cargando';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

function Inicial({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-borde bg-superficie-2 font-mono text-xs font-bold uppercase text-primario shadow-2xs select-none shrink-0">
      {nombre.slice(0, 1)}
    </span>
  );
}

export function Balance() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['balance', id],
    queryFn: () => obtenerBalance(id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/eventos/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-texto-suave transition-colors hover:text-texto active:scale-95"
        >
          ← Volver al evento
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-texto">
            Balance Consolidado
          </h1>
          <p className="mt-0.5 text-xs text-texto-suave">
            Matriz financiera de aportes, gastos y saldos netos por participante.
          </p>
        </div>
      </div>

      {isLoading && <Cargando texto="Calculando balance del evento…" />}
      {isError && <Alerta tono="error">{mensajeDeError(error)}</Alerta>}

      {data && (
        <div className="space-y-6 anim-stagger-1">
          {/* Tarjetas KPI de Totales */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tarjeta className="p-4 shadow-2xs border-borde text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave block">
                Total Gastado
              </span>
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-texto mt-1 block">
                {formatCentavos(data.totals.spentCents)}
              </span>
            </Tarjeta>

            <Tarjeta className="p-4 shadow-2xs border-borde text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave block">
                Ya Saldado
              </span>
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-exito mt-1 block">
                {formatCentavos(data.totals.settledCents)}
              </span>
            </Tarjeta>

            <Tarjeta className="p-4 shadow-2xs border-borde text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave block">
                Pendiente de Cobro
              </span>
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-aviso mt-1 block">
                {formatCentavos(data.totals.outstandingCents)}
              </span>
            </Tarjeta>

            <Tarjeta className="p-4 shadow-2xs border-borde text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave block">
                En Revisión
              </span>
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-texto-suave mt-1 block">
                {formatCentavos(data.totals.underReviewCents)}
              </span>
            </Tarjeta>
          </div>

          {/* Matriz de Participantes */}
          <Tarjeta className="overflow-hidden p-0 shadow-2xs border-borde">
            <div className="border-b border-borde-suave p-4 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-texto">
                    Estado de Cuenta por Participante
                  </h2>
                  <p className="text-xs text-texto-suave">
                    Resumen consolidado: lo que cada integrante pagó en comprobantes, lo que consumió en el reparto, y su saldo final.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-md bg-exito-suave/60 px-2 py-0.5 font-bold text-exito">
                    + A favor (por cobrar)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-aviso-suave/60 px-2 py-0.5 font-bold text-aviso">
                    - Debe transferir
                  </span>
                </div>
              </div>
            </div>

            {/* Vista en Tabla para pantallas medianas y grandes */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-borde-suave bg-superficie-2/50 text-left text-texto-suave font-semibold">
                    <th className="py-3 px-4 sm:px-6">Participante</th>
                    <th className="py-3 px-3 text-right">Puso en boletas</th>
                    <th className="py-3 px-3 text-right">Consumo asignado</th>
                    <th className="py-3 px-3 text-right">Reembolsos recibidos</th>
                    <th className="py-3 px-3 text-right">Saldo neto final</th>
                    <th className="py-3 px-4 sm:px-6 text-right">En revisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde-suave">
                  {data.participants.map((p) => {
                    const esAFavor = p.netCents > 0;
                    const esDeudor = p.netCents < 0;

                    return (
                      <tr key={p.userId} className="hover:bg-superficie-2/30 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 text-texto">
                          <div className="flex items-center gap-2.5">
                            <Inicial nombre={p.username} />
                            <span className="font-semibold">{p.username}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-texto-suave">
                          {formatCentavos(p.paidCents)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-texto-suave">
                          {formatCentavos(p.debtCents)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-texto-suave">
                          {formatCentavos(p.receivedCents)}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums px-2.5 py-1 rounded-lg text-xs ${
                              esAFavor
                                ? 'bg-exito-suave/70 text-exito border border-exito/20'
                                : esDeudor
                                  ? 'bg-aviso-suave/70 text-aviso border border-aviso/20'
                                  : 'bg-superficie-2 text-texto-tenue'
                            }`}
                          >
                            {esAFavor ? `+ ${formatCentavos(p.netCents)} (a favor)` : esDeudor ? `- ${formatCentavos(Math.abs(p.netCents))} (debe)` : 'Al día ✨'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right font-mono tabular-nums text-texto-tenue">
                          {formatCentavos(p.underReviewCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista en Tarjetas para móviles */}
            <div className="sm:hidden divide-y divide-borde-suave">
              {data.participants.map((p) => {
                const esAFavor = p.netCents > 0;
                const esDeudor = p.netCents < 0;

                return (
                  <div key={p.userId} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Inicial nombre={p.username} />
                        <span className="font-bold text-sm text-texto truncate">{p.username}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-lg shrink-0 ${
                          esAFavor
                            ? 'bg-exito-suave/70 text-exito border border-exito/20'
                            : esDeudor
                              ? 'bg-aviso-suave/70 text-aviso border border-aviso/20'
                              : 'bg-superficie-2 text-texto-tenue'
                        }`}
                      >
                        {esAFavor ? `+ ${formatCentavos(p.netCents)}` : esDeudor ? `- ${formatCentavos(Math.abs(p.netCents))}` : 'Al día ✨'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-superficie-2/40 p-2.5 border border-borde-suave">
                      <div>
                        <span className="text-[10px] text-texto-suave block">Puso en boletas</span>
                        <strong className="font-mono text-texto">{formatCentavos(p.paidCents)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-texto-suave block">Consumo total</span>
                        <strong className="font-mono text-texto">{formatCentavos(p.debtCents)}</strong>
                      </div>
                      {p.receivedCents > 0 && (
                        <div>
                          <span className="text-[10px] text-texto-suave block">Reembolsos recibidos</span>
                          <strong className="font-mono text-exito">{formatCentavos(p.receivedCents)}</strong>
                        </div>
                      )}
                      {p.underReviewCents > 0 && (
                        <div>
                          <span className="text-[10px] text-texto-suave block">En revisión</span>
                          <strong className="font-mono text-texto-tenue">{formatCentavos(p.underReviewCents)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
