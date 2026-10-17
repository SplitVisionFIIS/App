import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { crearEvento } from '../../api/eventos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';

const IconoEvento = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

export function NuevoEvento() {
  const navegar = useNavigate();
  const consulta = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const valido = nombre.trim().length > 0 && nombre.trim().length <= 60;

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const creado = await crearEvento(nombre.trim());
      void consulta.invalidateQueries({ queryKey: ['eventos'] });
      navegar(`/eventos/${creado.id}`);
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primario hover:text-primario-fuerte transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Mis eventos
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">Nuevo evento</h1>
        <p className="text-sm text-texto-suave">
          Crea un grupo para compartir gastos de un viaje, comida, fiesta o proyecto.
        </p>
      </div>

      <Tarjeta className="mt-4 shadow-sm">
        <form className="space-y-4" onSubmit={(e) => void guardar(e)}>
          <Campo
            etiqueta="Nombre del evento"
            name="name"
            placeholder="Ej.: Salida a la playa, Almuerzo FIIS"
            autoComplete="off"
            maxLength={60}
            required
            icono={<IconoEvento />}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError(null);
            }}
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-texto-suave">Usa un nombre reconocible para tus amigos.</span>
            <span className={`font-medium ${nombre.trim().length > 60 ? 'text-peligro' : 'text-texto-tenue'}`}>
              {nombre.length}/60
            </span>
          </div>

          {error ? <Alerta tono="error">{error}</Alerta> : null}

          <Boton
            type="submit"
            disabled={!valido || enviando}
            cargando={enviando}
            className="w-full py-2.5 text-base shadow-sm"
          >
            {enviando ? 'Creando…' : 'Crear evento'}
          </Boton>
        </form>
      </Tarjeta>
    </div>
  );
}