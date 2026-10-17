import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listarComprobantes } from '../../api/comprobantes';
import {
  invitarAEvento,
  buscarUsuarios,
  cancelarInvitacion,
  obtenerEvento,
  subirImagenEvento,
  urlImagenEvento,
} from '../../api/eventos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { Campo } from '../../componentes/Campo';
import { ESTILO_ESTADO, ETIQUETA_ESTADO } from '../../componentes/estadoComprobante';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';

function Inicial({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primario-suave font-bold uppercase text-primario shadow-2xs">
      {nombre.slice(0, 1)}
    </span>
  );
}

export function DetalleEvento() {
  const { id = '' } = useParams();
  const consulta = useQueryClient();
  const [query, setQuery] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['evento', id],
    queryFn: () => obtenerEvento(id),
    enabled: Boolean(id),
  });

  const comprobantes = useQuery({
    queryKey: ['receipts', id],
    queryFn: () => listarComprobantes(id),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.some((r) => r.status === 'PROCESANDO') ? 3000 : false),
  });

  const busqueda = query.trim();
  const { data: sugerencias } = useQuery({
    queryKey: ['usuarios', busqueda],
    queryFn: () => buscarUsuarios(busqueda),
    enabled: busqueda.length >= 2,
  });

  const yaEnEvento = new Set([
    ...(data?.participants ?? []).map((p) => p.username),
    ...(data?.invitations ?? []).filter((i) => i.status === 'PENDIENTE').map((i) => i.username),
  ]);
  const opciones = (sugerencias ?? []).filter((u) => !yaEnEvento.has(u.username));

  const invitar = async (usuario: string) => {
    const nombre = usuario.trim();
    if (!nombre || enviando) return;
    setEnviando(true);
    setErrorForm(null);
    try {
      await invitarAEvento(id, nombre);
      setQuery('');
      void consulta.invalidateQueries({ queryKey: ['evento', id] });
      void consulta.invalidateQueries({ queryKey: ['eventos'] });
      void consulta.invalidateQueries({ queryKey: ['invitaciones'] });
    } catch (err) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const agregar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void invitar(query);
  };

  const cancelar = async (invitationId: string) => {
    if (cancelandoId) return;
    setCancelandoId(invitationId);
    setErrorForm(null);
    try {
      await cancelarInvitacion(id, invitationId);
      void consulta.invalidateQueries({ queryKey: ['evento', id] });
      void consulta.invalidateQueries({ queryKey: ['invitaciones'] });
      void consulta.invalidateQueries({ queryKey: ['eventos'] });
    } catch (err) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setCancelandoId(null);
    }
  };

  const cambiarImagen = async (archivo: File | undefined) => {
    if (!archivo || subiendoImagen) return;
    setSubiendoImagen(true);
    setErrorImagen(null);
    try {
      await subirImagenEvento(id, archivo);
      void consulta.invalidateQueries({ queryKey: ['evento', id] });
      void consulta.invalidateQueries({ queryKey: ['eventos'] });
    } catch (err) {
      setErrorImagen(mensajeDeError(err));
    } finally {
      setSubiendoImagen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primario hover:text-primario-fuerte transition-colors"
        >
          ← Mis eventos
        </Link>
      </div>

      {isLoading ? (
        <Cargando texto="Cargando evento…" />
      ) : isError ? (
        <Tarjeta className="mt-4">
          <div className="flex flex-col items-start gap-3">
            <Alerta tono="error">{mensajeDeError(error)}</Alerta>
            <Boton variante="secundario" onClick={() => void refetch()}>
              Reintentar
            </Boton>
          </div>
        </Tarjeta>
      ) : data ? (
        <>
          {/* Tarjeta Hero del Evento */}
          <section className="rounded-2xl border border-borde bg-superficie p-6 shadow-xs sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {data.hasImage ? (
                  <img
                    src={urlImagenEvento(data.id)}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-2xl object-cover border border-borde-suave shadow-sm"
                  />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primario-suave to-primario-100 text-3xl font-bold uppercase text-primario shadow-inner">
                    {data.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-texto sm:text-3xl">{data.name}</h1>
                  {data.created_by_name ? (
                    <p className="mt-1 text-xs text-texto-suave">
                      Creado por {data.created_by_name}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    <Link
                      to={`/eventos/${data.id}/balance`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primario/30 bg-primario-suave/40 px-3 py-1 text-xs font-bold text-primario transition-colors hover:bg-primario-suave hover:text-primario-fuerte"
                    >
                      Ver balance del evento
                    </Link>
                  </div>
                </div>
              </div>

              {/* Botón rápido para subir comprobante */}
              <div className="flex items-center gap-2">
                <Link
                  to={`/eventos/${id}/comprobantes/nuevo`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primario px-4 py-2.5 text-sm font-semibold text-sobre-primario shadow-sm shadow-primario/25 transition hover:bg-primario-fuerte"
                >
                  <span>Subir comprobante</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Grid de 2 Columnas para Distribución de Espacio */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Columna Principal: Comprobantes */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-8">
              <section>
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-texto-suave">
                    Comprobantes
                  </h2>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/eventos/${id}/comprobantes`}
                      className="text-xs font-semibold text-texto-suave hover:text-primario transition-colors"
                    >
                      Ver todos
                    </Link>
                    <Link
                      to={`/eventos/${id}/comprobantes/nuevo`}
                      className="text-xs font-bold text-primario hover:text-primario-fuerte transition-colors"
                    >
                      Subir
                    </Link>
                  </div>
                </div>

                <Tarjeta className="shadow-xs">
                  {comprobantes.isLoading ? <Cargando texto="Cargando comprobantes…" /> : null}
                  {comprobantes.isError ? <Alerta tono="error">{mensajeDeError(comprobantes.error)}</Alerta> : null}
                  {comprobantes.data && comprobantes.data.length === 0 ? (
                    <EstadoVacio
                      titulo="Aún no hay comprobantes"
                      mensaje="Sube una foto del gasto o regístralo manualmente."
                      accion={
                        <Link
                          to={`/eventos/${id}/comprobantes/nuevo`}
                          className="mt-3 inline-flex rounded-xl bg-primario px-4 py-2 text-sm font-semibold text-sobre-primario shadow-sm hover:bg-primario-fuerte transition"
                        >
                          Subir comprobante
                        </Link>
                      }
                    />
                  ) : null}
                  {comprobantes.data && comprobantes.data.length > 0 ? (
                    <ul className="divide-y divide-borde-suave">
                      {comprobantes.data.slice(0, 5).map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1">
                          <Link to={`/comprobantes/${r.id}`} className="min-w-0 flex-1 group">
                            <p className="truncate text-sm font-semibold text-texto group-hover:text-primario transition-colors">
                              {r.description || `Comprobante ${r.id.slice(0, 8)}`}
                            </p>
                            <p className="mt-0.5 text-xs text-texto-suave">
                              {formatCentavos(r.totalCents)} · {r.payer}
                            </p>
                          </Link>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTILO_ESTADO[r.status]}`}>
                            {ETIQUETA_ESTADO[r.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Tarjeta>
              </section>

              {/* Imagen del grupo */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-texto-suave pb-2">
                  Imagen del grupo
                </h2>
                <Tarjeta className="shadow-xs">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!subiendoImagen) setArrastrando(true);
                    }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setArrastrando(false);
                      void cambiarImagen(e.dataTransfer.files?.[0]);
                    }}
                    className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition ${
                      arrastrando
                        ? 'border-primario bg-primario-suave/30'
                        : 'border-borde bg-superficie-2/50'
                    }`}
                  >
                    {data.hasImage ? (
                      <img
                        src={urlImagenEvento(data.id)}
                        alt={`Imagen del grupo ${data.name}`}
                        className="h-20 w-20 shrink-0 rounded-2xl object-contain shadow-xs"
                      />
                    ) : (
                      <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primario-suave text-2xl font-bold uppercase text-primario shadow-inner">
                        {data.name.slice(0, 1)}
                      </span>
                    )}
                    <p className="text-sm text-texto-suave">
                      {arrastrando
                        ? 'Suelta la imagen aquí'
                        : data.hasImage
                          ? 'Arrastra otra imagen para cambiarla o usa el botón.'
                          : 'Arrastra una imagen aquí para identificar a este grupo.'}
                      {subiendoImagen ? (
                        <span className="block text-sm font-semibold text-primario mt-1">Subiendo imagen…</span>
                      ) : null}
                    </p>
                    <label
                      htmlFor="imagen-grupo"
                      className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primario px-4 py-2 text-xs font-semibold text-sobre-primario shadow-sm transition hover:bg-primario-fuerte active:scale-95"
                    >
                      {data.hasImage ? 'Cambiar imagen' : 'Subir imagen'}
                    </label>
                    <input
                      id="imagen-grupo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={subiendoImagen}
                      onChange={(e) => {
                        void cambiarImagen(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <p className="text-xs text-texto-tenue">
                      Arrastra y suelta en esta zona o pulsa para elegir · JPG, PNG o WEBP hasta 5 MB
                    </p>
                  </div>
                  {errorImagen ? <Alerta tono="error" className="mt-3">{errorImagen}</Alerta> : null}
                </Tarjeta>
              </section>
            </div>

            {/* Columna Lateral: Participantes e Invitaciones */}
            <div className="space-y-6 lg:col-span-5 xl:col-span-4">
              <section>
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-texto-suave">
                    Participantes
                  </h2>
                  <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs font-semibold text-texto-suave border border-borde">
                    {data.participants.length}
                  </span>
                </div>

                <Tarjeta className="shadow-xs">
                  <ul className="divide-y divide-borde-suave">
                    {data.participants.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                        <Inicial nombre={p.username} />
                        <span className="text-sm font-bold text-texto">{p.username}</span>
                      </li>
                    ))}
                  </ul>

                  {data.invitations.filter((i) => i.status === 'PENDIENTE').length > 0 ? (
                    <ul className="mt-3 divide-y divide-borde-suave border-t border-borde-suave pt-3">
                      {data.invitations
                        .filter((i) => i.status === 'PENDIENTE')
                        .map((i) => (
                          <li key={i.id} className="flex items-center gap-3 py-3">
                            <Inicial nombre={i.username} />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-texto">{i.username}</span>
                              <span className="inline-block rounded-full bg-aviso-suave/50 px-2 py-0.5 text-[10px] font-bold text-aviso">
                                Invitado · pendiente
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void cancelar(i.id)}
                              disabled={cancelandoId === i.id}
                              className="text-xs font-semibold text-texto-tenue transition hover:text-peligro disabled:opacity-50"
                            >
                              {cancelandoId === i.id ? 'Cancelando…' : 'Cancelar'}
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : null}

                  {/* Formulario de Invitación */}
                  <div className="mt-4 border-t border-borde-suave pt-4">
                    <form className="flex flex-col gap-3" onSubmit={agregar}>
                      <Campo
                        etiqueta="Invitar persona"
                        name="query"
                        placeholder="Username o correo"
                        autoComplete="off"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setErrorForm(null);
                        }}
                      />
                      <Boton type="submit" disabled={!query.trim() || enviando} cargando={enviando} className="w-full">
                        {enviando ? 'Enviando…' : 'Invitar'}
                      </Boton>
                    </form>

                    {busqueda.length >= 2 && opciones.length > 0 ? (
                      <ul className="mt-2 overflow-hidden rounded-xl border border-borde shadow-xs">
                        {opciones.map((u) => (
                          <li key={u.username} className="border-b border-borde-suave last:border-b-0">
                            <button
                              type="button"
                              disabled={enviando}
                              onClick={() => void invitar(u.username)}
                              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-primario-suave/40 disabled:opacity-60"
                            >
                              <Inicial nombre={u.username} />
                              <span className="text-sm font-semibold text-texto">{u.username}</span>
                              <span className="ml-auto text-xs font-bold text-primario">
                                Invitar
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : busqueda.length >= 2 && sugerencias ? (
                      <p className="mt-2 text-xs text-texto-tenue">Sin coincidencias para esa búsqueda.</p>
                    ) : null}

                    {errorForm ? <Alerta tono="error" className="mt-3">{errorForm}</Alerta> : null}
                  </div>
                </Tarjeta>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
