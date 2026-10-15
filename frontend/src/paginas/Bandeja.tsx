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
    <>
      <h1 className="text-xl font-semibold text-texto ">Bandeja</h1>

      {error ? (
        <div className="mt-3">
          <Alerta>{error}</Alerta>
        </div>
      ) : null}

      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave ">
          Invitaciones ({listaInvitaciones.length})
        </h2>
        <Tarjeta className="mt-2">
          {cargandoInv ? <Cargando texto="Cargando invitaciones…" /> : null}
          {!cargandoInv && listaInvitaciones.length === 0 ? (
            <EstadoVacio
              titulo="Sin invitaciones"
              mensaje="No tienes invitaciones pendientes"
            />
          ) : null}
          {listaInvitaciones.length > 0 ? (
            <ul className="divide-y divide-borde-suave ">
              {listaInvitaciones.map((i: InvitacionPendiente) => (
                <li
                  key={i.invitationId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-texto ">
                      {i.eventName}
                    </p>
                    <p className="text-xs text-texto-suave ">
                      Te invitó {i.inviter}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Boton
                      type="button"
                      onClick={() => void responder(i.invitationId, 'aceptar')}
                      disabled={procesando === i.invitationId}
                    >
                      Aceptar
                    </Boton>
                    <Boton
                      type="button"
                      variante="secundario"
                      onClick={() => void responder(i.invitationId, 'rechazar')}
                      disabled={procesando === i.invitationId}
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

      <section className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave ">
          Pendientes ({conteoPendientes})
        </h2>
        <Tarjeta className="mt-2">
          {cargandoPend ? <Cargando texto="Cargando pendientes…" /> : null}
          {!cargandoPend && itemsPendientes.length === 0 ? (
            <EstadoVacio titulo="Todo al día" mensaje="No tienes acciones pendientes." />
          ) : null}
          {itemsPendientes.length > 0 ? (
            <ul className="divide-y divide-borde-suave ">
              {itemsPendientes.map((p) => {
                if (p.type === 'PAYMENT_TO_CONFIRM') {
                  return (
                    <li key={`p-${p.paymentId}`} className="flex justify-between py-2">
                      <div>
                        <p className="text-sm text-texto ">
                          Confirma pago de {p.counterparty} por {formatCentavos(p.amountCents)}
                        </p>
                        <p className="text-xs text-texto-suave ">
                          {p.eventName} · {p.method}
                        </p>
                      </div>
                      <Link
                        to="/bandeja/pagos"
                        className="inline-flex items-center justify-center rounded-lg border border-borde bg-superficie px-3 py-1.5 text-sm text-texto hover:bg-superficie-2   "
                      >
                        Revisar
                      </Link>
                    </li>
                  );
                }
                if (p.type === 'PAYMENT_REJECTED') {
                  return (
                    <li key={`r-${p.paymentId}`} className="flex justify-between py-2">
                      <div>
                        <p className="text-sm text-texto ">
                          Pago rechazado · {formatCentavos(p.amountCents)}
                        </p>
                        <p className="text-xs text-texto-suave ">
                          Motivo: {p.reason || '—'}
                        </p>
                      </div>
                      <Link
                        to={`/deudas/${p.debtId}`}
                        className="inline-flex items-center justify-center rounded-lg border border-borde bg-superficie px-3 py-1.5 text-sm text-texto hover:bg-superficie-2   "
                      >
                        Ver deuda
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={`c-${p.receiptId}`} className="flex justify-between py-2">
                    <div>
                      <p className="text-sm text-texto ">
                        Comprobante {p.status === 'FALLIDO' ? 'fallido' : 'por revisar'} en{' '}
                        {p.eventName}
                      </p>
                      {p.failReason ? (
                        <p className="text-xs text-texto-suave ">{p.failReason}</p>
                      ) : null}
                    </div>
                    <Link
                      to={`/comprobantes/${p.receiptId}`}
                      className="inline-flex items-center justify-center rounded-lg border border-borde bg-superficie px-3 py-1.5 text-sm text-texto hover:bg-superficie-2   "
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
    </>
  );
}
