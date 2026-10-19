import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { enviar } from '../api/client';
import type { ResultadoAuth } from '../api/tipos';
import { useSesion } from '../auth/SesionContext';
import { Alerta } from '../componentes/Alerta';
import { Boton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { Logo } from '../componentes/Logo';
import { ReciboInteractivo } from '../componentes/ReciboInteractivo';
import { mensajeDeError } from '../i18n/es-PE';

const IconoUsuarioOEmail = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconoCandado = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

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
    <main className="min-h-dvh w-full bg-fondo text-texto lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <div className="grid min-h-dvh w-full lg:h-full lg:max-h-screen lg:grid-cols-12 lg:overflow-hidden">
        {/* Columna Izquierda: Formulario de Autenticación */}
        <section className="flex min-h-dvh flex-col justify-between border-b border-borde/80 bg-superficie px-6 py-6 sm:px-10 lg:col-span-5 lg:min-h-0 lg:h-full lg:border-b-0 lg:border-r lg:px-12 xl:px-14 lg:overflow-hidden">
          {/* Cabecera / Marca */}
          <div className="anim-stagger-1 shrink-0 flex items-center justify-between">
            <Link to="/" aria-label="SplitVision — inicio" className="transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Logo tam={34} />
            </Link>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-texto-tenue">
              Cuentas Claras
            </span>
          </div>

          {/* Bloque central: Formulario */}
          <div className="my-auto w-full max-w-sm py-4 sm:max-w-md mx-auto lg:mx-0">
            <div className="anim-stagger-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-texto">
                Iniciar sesión
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-texto-suave">
                Cuentas claras sin enredos. Sincroniza tus boletas compartidas, saldos cruzados y pagos grupales.
              </p>
            </div>

            <form className="anim-stagger-3 mt-6 space-y-3.5" onSubmit={(e) => void enviarFormulario(e)}>
              {error ? <Alerta tono="error">{error}</Alerta> : null}

              <Campo
                etiqueta="Correo o usuario"
                name="identifier"
                autoComplete="username"
                required
                icono={<IconoUsuarioOEmail />}
                placeholder="ej. angel o luis.vargas.p@uni.pe"
                value={identificador}
                onChange={(e) => {
                  setIdentificador(e.target.value);
                  if (error) setError(null);
                }}
              />

              <Campo
                etiqueta="Contraseña"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                icono={<IconoCandado />}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
              />

              <Boton
                type="submit"
                disabled={enviando}
                cargando={enviando}
                className="w-full min-h-[44px] py-2.5 text-sm font-bold shadow-none"
              >
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </Boton>
            </form>

            <div className="anim-stagger-4 mt-5 rounded-xl border border-borde/70 bg-superficie-2 p-3 text-center text-xs text-texto-suave">
              <span>¿No tienes cuenta todavía? </span>
              <Link
                to="/registro"
                className="font-bold text-primario transition-colors hover:text-primario-fuerte underline-offset-2 hover:underline"
              >
                Regístrate gratis
              </Link>
            </div>
          </div>

          {/* Pie informativo */}
          <footer className="anim-stagger-5 shrink-0 flex items-center justify-between border-t border-borde/60 pt-3 pb-1 text-[10px] text-texto-tenue font-mono">
            <span>SplitVision · FIIS UNI</span>
            <span>Matriz de Deudas Neta</span>
          </footer>
        </section>

        {/* Columna Derecha: Showcase Interactivo Cuentas Claras */}
        <section
          aria-label="Simulador multi-boleta Cuentas Claras"
          className="relative hidden h-full max-h-screen flex-col justify-between bg-barra p-6 text-sobre-barra lg:col-span-7 lg:flex xl:p-8 xl:col-span-7 overflow-hidden"
        >
          {/* Fondo sutil con retícula milimetrada */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* Encabezado del Showcase */}
          <div className="relative z-10 shrink-0 max-w-lg">
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white">
              Cuentas claras entre amigos.
            </h2>
            <p className="mt-1 text-xs xl:text-sm leading-relaxed text-sobre-barra/75">
              En una salida o viaje grupal, varios pagan boletas distintas. SplitVision lee los comprobantes con OCR, cruza los saldos y calcula la liquidación óptima en el menor número de pagos.
            </p>
          </div>

          {/* El componente vivo: Multi-Ticket y Matriz de Compensación Neta */}
          <div className="relative z-10 my-auto py-1 flex items-center justify-center">
            <ReciboInteractivo />
          </div>

          {/* Pie con los 2 principios técnicos del sistema */}
          <div className="relative z-10 shrink-0 grid grid-cols-2 gap-6 border-t border-white/10 pt-3">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-acento">
                Compensación Cruzada
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-sobre-barra/70">
                Simplifica múltiples deudas cruzadas al mínimo de pagos necesarios sin transferir de más.
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Conservación de Céntimos
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-sobre-barra/70">
                Reparto exacto con contratos que aseguran que el total liquidado sea idéntico a las boletas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
