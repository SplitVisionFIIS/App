import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, type EventoResumen } from '../api/client';
import { Boton, Campo, MensajeError, Tarjeta } from '../components/ui';

export function Eventos() {
  const consultor = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ['eventos'],
    queryFn: () => api.get<{ eventos: EventoResumen[] }>('/eventos'),
  });

  const crear = useMutation({
    mutationFn: () => api.post('/eventos', { nombre }),
    onSuccess: () => {
      setNombre('');
      setError(null);
      consultor.invalidateQueries({ queryKey: ['eventos'] });
    },
    onError: (err) => setError(err instanceof globalThis.Error ? err.message : 'Error al crear'),
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    crear.mutate();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Mis eventos</h1>

      <Tarjeta>
        <form onSubmit={enviar} className="flex items-end gap-3">
          <div className="flex-1">
            <Campo
              etiqueta="Nombre del nuevo evento"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Viaje a Cusco"
              required
              minLength={3}
            />
          </div>
          <Boton type="submit" disabled={crear.isPending}>
            Crear evento
          </Boton>
        </form>
        <div className="mt-2">
          <MensajeError mensaje={error} />
        </div>
      </Tarjeta>

      {consulta.isLoading && <p className="text-sm text-slate-500">Cargando eventos...</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {consulta.data?.eventos.map((evento) => (
          <Link key={evento.id} to={`/eventos/${evento.id}`}>
            <Tarjeta className="transition hover:border-indigo-300 hover:shadow">
              <h2 className="font-medium text-slate-800">{evento.nombre}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {evento.totalParticipantes} participantes · {evento.totalComprobantes} comprobantes
              </p>
            </Tarjeta>
          </Link>
        ))}
      </div>

      {consulta.data?.eventos.length === 0 && (
        <p className="text-sm text-slate-500">
          Aun no tienes eventos. Crea el primero con el formulario de arriba.
        </p>
      )}
    </div>
  );
}
