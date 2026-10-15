import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listarEventos, urlImagenEvento } from '../../api/eventos';
import type { Evento } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Cargando } from '../../componentes/Cargando';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatSoles } from '../../i18n/formato';

function Saldo({ netCents }: { netCents: number }) {
  if (netCents > 0) {
    return (
      <span className="text-sm font-semibold text-exito">
        Te deben {formatSoles(netCents / 100)}
      </span>
    );
  }
  if (netCents < 0) {
    return (
      <span className="text-sm font-semibold text-primario">
        Debes {formatSoles(-netCents / 100)}
      </span>
    );
  }
  return <span className="text-sm text-texto-tenue">Al día</span>;
}

function TarjetaEvento({ evento }: { evento: Evento }) {
  return (
    <Link
      to={`/eventos/${evento.id}`}
      className="block rounded-xl border border-borde bg-superficie p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primario/40 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {evento.hasImage ? (
          <img
            src={urlImagenEvento(evento.id)}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg object-contain"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primario-suave text-lg font-bold uppercase text-primario">
            {evento.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-texto">{evento.name}</h3>
          <p className="mt-0.5 text-sm text-texto-suave">
            {evento.participants === 1
              ? '1 participante'
              : `${evento.participants} participantes`}
          </p>
          <div className="mt-3">
            <Saldo netCents={evento.netCents} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MisEventos() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['eventos'],
    queryFn: listarEventos,
  });

  return (
    <>
      <h1 className="text-xl font-semibold text-texto">Mis eventos</h1>

      {isLoading ? (
        <Cargando texto="Cargando tus eventos…" />
      ) : isError ? (
        <Tarjeta className="mt-4">
          <div className="flex flex-col items-start gap-3">
            <Alerta>{mensajeDeError(error)}</Alerta>
            <Boton variante="secundario" onClick={() => void refetch()}>
              Reintentar
            </Boton>
          </div>
        </Tarjeta>
      ) : data && data.length === 0 ? (
        <Tarjeta className="mt-4">
          <EstadoVacio
            titulo="Aún no hay eventos"
            mensaje="Crea tu primer evento desde el botón + para empezar a dividir gastos con tu grupo."
          />
        </Tarjeta>
      ) : data ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.map((e) => (
            <li key={e.id}>
              <TarjetaEvento evento={e} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}