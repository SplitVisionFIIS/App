import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { bandejaPendientes } from '../api/consultas';
import { misInvitaciones, responderInvitacion } from '../api/eventos';
import type { InvitacionPendiente } from '../api/tipos';
import { Alerta } from '../componentes/Alerta';
import { Boton } from '../componentes/Boton';
import { Cargando } from '../componentes/Cargando';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { Tarjeta } from '../componentes/Tarjeta';
import { formatCentavos } from '../i18n/formato';
import { mensajeDeError } from '../i18n/es-PE';

export function Bandeja() {
  const cliente = useQueryClient();
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: invitaciones, isLoading: cargandoInv } = useQuery({
    queryKey: ['invitaciones'],
    queryFn: misInvitaciones,
  });
  const { data: pendientes, isLoading: cargandoPend } = useQuery({
    queryKey: ['pending'],
    queryFn: bandejaPendientes,
    refetchInterval: 5000,
  });

  const listaInvitaciones = invitaciones ?? [];
  const itemsPendientes = pendientes?.items ?? [];
  const conteoPendientes = pendientes?.count ?? itemsPendientes.length;

  const responder = async (id: string, decision: 'aceptar' | 'rechazar') => {
    setError('');
    setProcesando(id);
    try {
      await responderInvitacion(id, decision);
      await cliente.invalidateQueries({ queryKey: ['invitaciones'] });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">Bandeja</h1>
        <p className="text-sm text-texto-suave">
          Notificaciones, invitaciones pendientes a eventos y validaciones de pago.
        </p>
      </header>

      {error ? (
        <Alerta tono="error">{error}</Alerta>
      ) : null}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-texto-suave">
            Invitaciones ({listaInvitaciones.length})
          </h2>
        </div>

        <Tarjeta className="mt-2.5 shadow-xs">
          {cargandoInv ? <Cargando texto="Cargando invitaciones…" /> : null}
          {!cargandoInv && listaInvitaciones.length === 0 ? (
            <EstadoVacio
              titulo="Sin invitaciones"
              mensaje="No tienes invitaciones pendientes"
            />
          ) : null}
          {listaInvitaciones.length > 0 ? (
            <ul className="divide-y divide-borde-suave">
              {listaInvitaciones.map((i: InvitacionPendiente) => (
                <li
                  key={i.invitationId}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primario/30 bg-primario-suave/40 text-primario font-bold text-sm">
                      ✉️
                    </span>
                    <div>
                      <p className="text-sm font-bold text-texto">
                        {i.eventName}
                      </p>
                      <p className="mt-0.5 text-xs text-texto-suave">
                        Te invitó {i.inviter}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Boton
                      type="button"
                      onClick={() => void responder(i.invitationId, 'aceptar')}
                      disabled={procesando === i.invitationId}
                      className="text-xs px-3.5 py-1.5 shadow-xs"
                    >
                      Aceptar
                    </Boton>
                    <Boton
                      type="button"
                      variante="secundario"
                      onClick={() => void responder(i.invitationId, 'rechazar')}
                      disabled={procesando === i.invitationId}
                      className="text-xs px-3.5 py-1.5"
                    >
                      Rechazar
                    </Boton>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Tarjeta>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-texto-suave">
            Pendientes ({conteoPendientes})
          </h2>
        </div>

        <Tarjeta className="mt-2.5 shadow-xs">
          {cargandoPend ? <Cargando texto="Cargando pendientes…" /> : null}
          {!cargandoPend && itemsPendientes.length === 0 ? (
            <EstadoVacio titulo="Todo al día" mensaje="No tienes acciones pendientes." />
          ) : null}
          {itemsPendientes.length > 0 ? (
            <ul className="divide-y divide-borde-suave">
              {itemsPendientes.map((p) => {
                if (p.type === 'PAYMENT_TO_CONFIRM') {
                  return (
                    <li key={`p-${p.paymentId}`} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-acento/30 bg-acento-suave/40 text-acento font-bold text-sm">
                          💵
                        </span>
                        <div>
                          <p className="text-sm font-medium text-texto">
                            Confirma pago de <span className="font-bold">{p.counterparty}</span> por{' '}
                            <span className="font-bold text-primario">{formatCentavos(p.amountCents)}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-texto-suave">
                            {p.eventName} · {p.method}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/bandeja/pagos"
                        className="inline-flex items-center justify-center rounded-xl border border-borde bg-superficie px-3.5 py-1.5 text-xs font-semibold text-texto shadow-2xs hover:bg-superficie-2 hover:border-borde/90 transition-all active:scale-95"
                      >
                        Revisar
                      </Link>
                    </li>
                  );
                }
                if (p.type === 'PAYMENT_REJECTED') {
                  return (
                    <li key={`r-${p.paymentId}`} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-peligro/30 bg-peligro-suave/40 text-peligro font-bold text-sm">
                          ✕
                        </span>
                        <div>
                          <p className="text-sm font-medium text-texto">
                            Pago rechazado · <span className="font-bold text-peligro">{formatCentavos(p.amountCents)}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-texto-suave">
                            Motivo: {p.reason || '—'}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/deudas/${p.debtId}`}
                        className="inline-flex items-center justify-center rounded-xl border border-borde bg-superficie px-3.5 py-1.5 text-xs font-semibold text-texto shadow-2xs hover:bg-superficie-2 hover:border-borde/90 transition-all active:scale-95"
                      >
                        Ver deuda
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={`c-${p.receiptId}`} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-info/30 bg-info-suave/40 text-info font-bold text-sm">
                        📄
                      </span>
                      <div>
                        <p className="text-sm font-medium text-texto">
                          Comprobante {p.status === 'FALLIDO' ? 'fallido' : 'por revisar'} en{' '}
                          <span className="font-bold">{p.eventName}</span>
                        </p>
                        {p.failReason ? (
                          <p className="mt-0.5 text-xs text-texto-suave">{p.failReason}</p>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      to={`/comprobantes/${p.receiptId}`}
                      className="inline-flex items-center justify-center rounded-xl border border-borde bg-superficie px-3.5 py-1.5 text-xs font-semibold text-texto shadow-2xs hover:bg-superficie-2 hover:border-borde/90 transition-all active:scale-95"
                    >
                      Revisar
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Tarjeta>
      </section>
    </div>
  );
}
