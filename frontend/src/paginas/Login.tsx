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

const IconoCheck = () => (
  <svg className="h-4 w-4 text-exito" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
    <main className="fondo-login relative flex min-h-screen w-full items-stretch overflow-hidden">
      <FondoLogin />

      <div className="relative z-10 grid w-full lg:grid-cols-12">
        {/* Columna Izquierda: Formulario de autenticación */}
        <section className="flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-10 lg:col-span-5 lg:min-h-screen lg:px-14 lg:py-12 xl:col-span-5 tarjeta-cristal sombra-suave">
          {/* Cabecera / Marca */}
          <div>
            <div className="flex items-center justify-between">
              <Logo tam={38} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-exito/30 bg-exito-suave/40 px-2.5 py-1 text-[11px] font-semibold text-exito">
                <span className="h-1.5 w-1.5 rounded-full bg-exito animate-pulse" />
                OCR Activo
              </span>
            </div>
          </div>

          {/* Tarjeta / Contenido Central */}
          <div className="my-auto w-full max-w-sm py-8 sm:max-w-md">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">
                Iniciar sesión
              </h1>
              <p className="mt-2 text-sm text-texto-suave">
                Accede con tu correo o usuario para sincronizar tus gastos y cuentas compartidas.
              </p>
            </div>

            <form className="mt-7 space-y-4" onSubmit={(e) => void enviarFormulario(e)}>
              {error ? <Alerta tono="error">{error}</Alerta> : null}

              <Campo
                etiqueta="Correo o usuario"
                name="identifier"
                autoComplete="username"
                required
                icono={<IconoUsuarioOEmail />}
                placeholder="ej. carlos@uni.edu.pe o carlos23"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
              />

              <Boton
                type="submit"
                disabled={enviando}
                cargando={enviando}
                className="w-full py-3 text-base shadow-md"
              >
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </Boton>
            </form>

            <div className="mt-6 rounded-xl border border-borde/60 bg-superficie-2/50 p-3.5 text-center text-xs text-texto-suave">
              <span>¿No tienes cuenta todavía? </span>
              <Link
                to="/registro"
                className="font-semibold text-primario transition hover:text-primario-fuerte underline-offset-2 hover:underline"
              >
                Regístrate gratis
              </Link>
            </div>
          </div>

          {/* Pie informativo */}
          <footer className="pt-4 text-xs text-texto-tenue flex items-center justify-between border-t border-borde-suave">
            <span>SplitVision • Grupo 2 FIIS</span>
            <span>Seguridad & Privacidad</span>
          </footer>
        </section>

        {/* Columna Derecha: Showcase visual y propuesta de valor (solo pantallas grandes) */}
        <section aria-hidden="true" className="relative hidden flex-col justify-between p-12 lg:col-span-7 lg:flex xl:col-span-7 xl:p-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <span className="text-acento">✨</span> División de gastos con Inteligencia Artificial
            </span>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white drop-shadow-md xl:text-4xl">
              Cuentas claras entre amigos, sin hojas de cálculo ni errores.
            </h2>
            <p className="mt-3 text-base text-white/80 leading-relaxed drop-shadow">
              Toma una foto a la boleta del restaurante o supermercado. Nuestro motor OCR extrae cada ítem al céntimo y calcula quién debe a quién al instante.
            </p>

            {/* Tarjeta flotante simulada de comprobante procesado */}
            <div className="mt-8 rounded-2xl border border-white/20 bg-black/40 p-5 text-white shadow-2xl backdrop-blur-xl anim-flotar">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento/20 text-acento font-bold text-sm">
                    🧾
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Cena de Integración FIIS</p>
                    <p className="text-xs text-white/60">Procesado con OCR local Tesseract</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-exito/20 px-2 py-0.5 text-xs font-semibold text-exito-suave">
                  <IconoCheck /> Verificado
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[11px] text-white/60 uppercase">Total cuenta</p>
                  <p className="text-sm font-bold text-white">S/ 135.00</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[11px] text-white/60 uppercase">Amigos</p>
                  <p className="text-sm font-bold text-white">3 personas</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-[11px] text-white/60 uppercase">Cuota exacta</p>
                  <p className="text-sm font-bold text-acento">S/ 45.00</p>
                </div>
              </div>
            </div>

            {/* Puntos clave */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primario-suave/20 text-white font-bold text-xs">
                  ⚡
                </span>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cero fricción</h3>
                  <p className="mt-0.5 text-xs text-white/70">Invita amigos y acepta gastos sin descargas pesadas.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-acento/20 text-white font-bold text-xs">
                  🔒
                </span>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Transparencia</h3>
                  <p className="mt-0.5 text-xs text-white/70">Comprobantes y pagos auditables con historial.</p>
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
