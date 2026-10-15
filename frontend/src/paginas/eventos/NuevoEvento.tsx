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
    <>
      <Link to="/" className="text-sm font-medium text-primario hover:text-primario-fuerte">
        ← Mis eventos
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-texto">Nuevo evento</h1>
      <Tarjeta className="mt-4 max-w-md">
        <form className="space-y-4" onSubmit={(e) => void guardar(e)}>
          <Campo
            etiqueta="Nombre del evento"
            name="name"
            placeholder="Ej.: Salida a la playa"
            autoComplete="off"
            maxLength={60}
            required
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError(null);
            }}
          />
          <p className={`text-xs ${nombre.trim().length > 60 ? 'text-peligro' : 'text-texto-tenue'}`}>
            {nombre.length}/60
          </p>
          {error ? <Alerta>{error}</Alerta> : null}
          <Boton type="submit" disabled={!valido || enviando} className="w-full">
            {enviando ? 'Creando…' : 'Crear evento'}
          </Boton>
        </form>
      </Tarjeta>
    </>
  );
}