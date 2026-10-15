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

export function Login() {
  const { usuario, iniciar } = useSesion();
  const navegar = useNavigate();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const enviarFormulario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const r = await enviar<ResultadoAuth>('/api/auth/login', {
        identifier: identificador,
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
        <h1 className="text-xl font-semibold text-texto">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-texto-suave">Accede con tu correo o usuario</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void enviarFormulario(e)}>
          {error ? <Alerta>{error}</Alerta> : null}
          <Campo
            etiqueta="Correo o usuario"
            name="identifier"
            autoComplete="username"
            required
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
          />
          <Campo
            etiqueta="Contraseña"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Boton type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </Boton>
        </form>
        <p className="mt-4 text-center text-sm text-texto-suave">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-primario hover:text-primario-fuerte">
            Regístrate
          </Link>
        </p>
      </Tarjeta>
    </main>
  );
}
