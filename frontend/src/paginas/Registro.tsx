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
import { mensajeDeError } from '../i18n/es-PE';

const IconoUsuario = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconoCorreo = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconoCandado = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const IconoEscudo = () => (
  <svg className="h-4 w-4 text-exito" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

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
    <main className="fondo-login relative flex min-h-screen w-full items-stretch overflow-hidden">
      <FondoLogin />

      <div className="relative z-10 grid w-full lg:grid-cols-12">
        {/* Columna Izquierda: Formulario de Registro */}
        <section className="flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-10 lg:col-span-5 lg:min-h-screen lg:px-14 lg:py-12 xl:col-span-5 tarjeta-cristal sombra-suave">
          {/* Cabecera / Marca */}
          <div>
            <div className="flex items-center justify-between">
              <Logo tam={38} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primario/30 bg-primario-suave/40 px-2.5 py-1 text-[11px] font-semibold text-primario">
                Nuevo usuario
              </span>
            </div>
          </div>

          {/* Tarjeta / Contenido Central */}
          <div className="my-auto w-full max-w-sm py-6 sm:max-w-md">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">
                Crear cuenta
              </h1>
              <p className="mt-2 text-sm text-texto-suave">
                Solo tres datos para unirte a SplitVision y compartir gastos sin desajustes.
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={(e) => void enviarFormulario(e)}>
              {error ? <Alerta tono="error">{error}</Alerta> : null}

              <Campo
                etiqueta="Usuario"
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                title="3 a 20 caracteres: letras, números o guion bajo"
                icono={<IconoUsuario />}
                placeholder="ej. valentin24"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <Campo
                etiqueta="Correo"
                type="email"
                name="email"
                autoComplete="email"
                required
                icono={<IconoCorreo />}
                placeholder="ej. valentin@uni.pe"
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
                icono={<IconoCandado />}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="flex items-center gap-2 text-xs text-texto-suave">
                <span className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? 'bg-exito' : 'bg-texto-tenue'}`} />
                <span>Mínimo 8 caracteres con seguridad reforzada.</span>
              </div>

              <Boton
                type="submit"
                disabled={enviando}
                cargando={enviando}
                className="w-full py-3 text-base shadow-md"
              >
                {enviando ? 'Creando…' : 'Crear cuenta'}
              </Boton>
            </form>

            <div className="mt-6 rounded-xl border border-borde/60 bg-superficie-2/50 p-3.5 text-center text-xs text-texto-suave">
              <span>¿Ya tienes cuenta? </span>
              <Link
                to="/login"
                className="font-semibold text-primario transition hover:text-primario-fuerte underline-offset-2 hover:underline"
              >
                Inicia sesión
              </Link>
            </div>
          </div>

          {/* Pie informativo */}
          <footer className="pt-4 text-xs text-texto-tenue flex items-center justify-between border-t border-borde-suave">
            <span>SplitVision • Grupo 2 FIIS</span>
            <span>Seguridad & Privacidad</span>
          </footer>
        </section>

        {/* Columna Derecha: Showcase visual */}
        <section aria-hidden="true" className="relative hidden flex-col justify-between p-12 lg:col-span-7 lg:flex xl:col-span-7 xl:p-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <IconoEscudo /> Registro rápido e intuitivo
            </span>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white drop-shadow-md xl:text-4xl">
              Únete a tus grupos de estudio, viajes y salidas.
            </h2>
            <p className="mt-3 text-base text-white/80 leading-relaxed drop-shadow">
              Registra tu usuario en segundos y recibe invitaciones a eventos compartidos. Todo respaldado por una base de datos segura y algoritmos de división deterministas.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3.5 rounded-xl border border-white/15 bg-black/30 p-4 text-white backdrop-blur-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primario-500/30 text-white font-bold text-sm">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Crea o únete a un evento</h3>
                  <p className="text-xs text-white/70">Invita a tus compañeros de equipo o amigos con su nombre de usuario.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-xl border border-white/15 bg-black/30 p-4 text-white backdrop-blur-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-acento/30 text-white font-bold text-sm">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Sube fotos de tus cuentas</h3>
                  <p className="text-xs text-white/70">El OCR lee los ítems del comprobante y prepara el reparto automático.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-xl border border-white/15 bg-black/30 p-4 text-white backdrop-blur-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-exito/30 text-white font-bold text-sm">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Liquida deudas transparentemente</h3>
                  <p className="text-xs text-white/70">Registra y confirma tus pagos con comprobante de transferencia.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-white/50">
            SplitVision • Proyecto de Arquitectura de Software 2026
          </div>
        </section>
      </div>
    </main>
  );
}
