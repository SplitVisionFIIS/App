import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { enviar } from '../api/client';
import type { ResultadoAuth } from '../api/tipos';
import { useSesion } from '../auth/SesionContext';
import { Alerta } from '../componentes/Alerta';
import { Boton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { FondoLogin } from '../componentes/FondoLogin';
import { Logo } from '../componentes/Logo';
import { Tarjeta } from '../componentes/Tarjeta';
import { mensajeDeError } from '../i18n/es-PE';

export function Registro() {
  const { usuario, iniciar } = useSesion();
  const navegar = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const enviarFormulario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const r = await enviar<ResultadoAuth>('/api/auth/register', {
        username,
        email,
        password,
      });
      iniciar(r.username);
      navegar('/', { replace: true });
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="fondo-login flex min-h-screen items-center justify-center px-4 lg:justify-start lg:pl-[8vw]">
      <FondoLogin />
      <Tarjeta className="relative z-10 w-full max-w-md">
        <Logo tam={40} className="mb-5" />
        <h1 className="text-xl font-semibold text-texto">Crear cuenta</h1>
        <p className="mt-1 text-sm text-texto-suave">Tres datos y listo</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void enviarFormulario(e)}>
          {error ? <Alerta>{error}</Alerta> : null}
          <Campo
            etiqueta="Usuario"
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            title="3 a 20 caracteres: letras, números o guion bajo"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Campo
            etiqueta="Correo"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Campo
            etiqueta="Contraseña"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            title="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-texto-suave">Mínimo 8 caracteres.</p>
          <Boton type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </Boton>
        </form>
        <p className="mt-4 text-center text-sm text-texto-suave">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primario hover:text-primario-fuerte">
            Inicia sesión
          </Link>
        </p>
      </Tarjeta>
    </main>
  );
}
