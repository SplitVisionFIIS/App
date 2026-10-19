import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  actualizarDatosCobro,
  cambiarContrasena,
  eliminarQrCobro,
  subirAvatar,
  subirQrCobro,
  urlAvatar,
  urlQrCobro,
} from '../api/perfil';
import { useSesion } from '../auth';
import { Alerta } from '../componentes/Alerta';
import { Boton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { Tarjeta } from '../componentes/Tarjeta';
import { mensajeDeError } from '../i18n/es-PE';
import { usePreferencias } from '../preferencias/PreferenciasContext';
import type { Tema } from '../preferencias/PreferenciasContext';

const OPCIONES_TEMA: { valor: Tema; etiqueta: string; icono: string }[] = [
  { valor: 'claro', etiqueta: 'Claro', icono: '☀️' },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: '🌙' },
  { valor: 'sistema', etiqueta: 'Sistema', icono: '💻' },
];

const BILLETERAS_POPULARES = [
  { valor: 'YAPE', etiqueta: 'Yape', desc: 'BCP o con DNI', icono: '🟣', estilo: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  { valor: 'PLIN', etiqueta: 'Plin', desc: 'Interbank, BBVA, Scotiabank', icono: '🔵', estilo: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  { valor: 'BIM', etiqueta: 'Bim / Sip', desc: 'Billetera Bim o Sip / Agora', icono: '🟠', estilo: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
];

const BANCOS_POPULARES = [
  'BCP (Banco de Crédito)',
  'Interbank',
  'BBVA',
  'Scotiabank',
  'Banco de la Nación',
  'BanBif',
  'Pichincha',
  'Caja Arequipa / Piura / Huancayo',
  'Otro banco / financiera',
];

export function Configuracion() {
  const {
    usuario,
    hasImage,
    phone: sessionPhone,
    preferredWallet: sessionWallet,
    bankName: sessionBank,
    accountNumber: sessionAccount,
    cci: sessionCci,
    hasQr: sessionHasQr,
    refrescar,
  } = useSesion();
  const { tema, idioma, definirTema, definirIdioma } = usePreferencias();

  // Estados Avatar
  const [versionAvatar, setVersionAvatar] = useState(0);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [errorAvatar, setErrorAvatar] = useState('');
  const [okAvatar, setOkAvatar] = useState('');
  const entradaArchivo = useRef<HTMLInputElement>(null);

  // Estados Métodos de Cobro
  const [telefono, setTelefono] = useState(sessionPhone ?? '');
  const [billetera, setBilletera] = useState(sessionWallet ?? 'YAPE');
  const [banco, setBanco] = useState(sessionBank ?? 'BCP (Banco de Crédito)');
  const [cuenta, setCuenta] = useState(sessionAccount ?? '');
  const [cci, setCci] = useState(sessionCci ?? '');
  const [guardandoCobro, setGuardandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState('');
  const [okCobro, setOkCobro] = useState('');

  // Estados QR Cobro
  const [versionQr, setVersionQr] = useState(0);
  const [subiendoQr, setSubiendoQr] = useState(false);
  const [errorQr, setErrorQr] = useState('');
  const [okQr, setOkQr] = useState('');
  const entradaQr = useRef<HTMLInputElement>(null);

  // Estados Contraseña
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorPass, setErrorPass] = useState('');
  const [okPass, setOkPass] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);

  // Sincronizar datos de cobro cuando cargue la sesión
  useEffect(() => {
    if (sessionPhone !== undefined && sessionPhone !== null) setTelefono(sessionPhone);
    if (sessionWallet !== undefined && sessionWallet !== null) setBilletera(sessionWallet);
    if (sessionBank !== undefined && sessionBank !== null) setBanco(sessionBank);
    if (sessionAccount !== undefined && sessionAccount !== null) setCuenta(sessionAccount);
    if (sessionCci !== undefined && sessionCci !== null) setCci(sessionCci);
  }, [sessionPhone, sessionWallet, sessionBank, sessionAccount, sessionCci]);

  const cambiarFoto = async (archivo?: File) => {
    if (!archivo) return;
    setErrorAvatar('');
    setOkAvatar('');
    setSubiendoAvatar(true);
    try {
      await subirAvatar(archivo);
      await refrescar();
      setVersionAvatar((v) => v + 1);
      setOkAvatar('Foto de perfil actualizada correctamente.');
    } catch (e) {
      setErrorAvatar(mensajeDeError(e));
    } finally {
      setSubiendoAvatar(false);
      if (entradaArchivo.current) entradaArchivo.current.value = '';
    }
  };

  const guardarCobro = async (e: FormEvent) => {
    e.preventDefault();
    setErrorCobro('');
    setOkCobro('');
    setGuardandoCobro(true);
    try {
      await actualizarDatosCobro({
        phone: telefono.trim() || null,
        preferredWallet: billetera,
        bankName: banco.trim() || null,
        accountNumber: cuenta.trim() || null,
        cci: cci.trim() || null,
      });
      await refrescar();
      setOkCobro('Datos de cobro actualizados. Quienes te deban verán tu billetera preferida al pagarte.');
    } catch (e) {
      setErrorCobro(mensajeDeError(e));
    } finally {
      setGuardandoCobro(false);
    }
  };

  const cambiarQr = async (archivo?: File) => {
    if (!archivo) return;
    setErrorQr('');
    setOkQr('');
    setSubiendoQr(true);
    try {
      await subirQrCobro(archivo);
      await refrescar();
      setVersionQr((v) => v + 1);
      setOkQr('Código QR de cobro guardado con éxito.');
    } catch (e) {
      setErrorQr(mensajeDeError(e));
    } finally {
      setSubiendoQr(false);
      if (entradaQr.current) entradaQr.current.value = '';
    }
  };

  const borrarQr = async () => {
    setErrorQr('');
    setOkQr('');
    setSubiendoQr(true);
    try {
      await eliminarQrCobro();
      await refrescar();
      setVersionQr((v) => v + 1);
      setOkQr('Código QR eliminado.');
    } catch (e) {
      setErrorQr(mensajeDeError(e));
    } finally {
      setSubiendoQr(false);
    }
  };

  const enviarContrasena = async (e: FormEvent) => {
    e.preventDefault();
    setErrorPass('');
    setOkPass('');
    if (nueva.length < 8) {
      setErrorPass('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setErrorPass('Las contraseñas no coinciden.');
      return;
    }
    setGuardandoPass(true);
    try {
      await cambiarContrasena(actual, nueva);
      setOkPass('Contraseña actualizada.');
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (e) {
      setErrorPass(mensajeDeError(e));
    } finally {
      setGuardandoPass(false);
    }
  };

  const inicial = (usuario ?? '?').charAt(0).toUpperCase();
  const srcAvatar = hasImage ? `${urlAvatar()}?v=${versionAvatar}` : null;
  const srcQr = sessionHasQr ? `${urlQrCobro()}?v=${versionQr}` : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">Configuración</h1>
        <p className="mt-1 text-sm text-texto-suave">
          Personaliza tu billetera de cobro preferida (Yape, Plin o Bim/Sip), tus cuentas bancarias y perfil.
        </p>
      </div>

      {/* SECCIÓN 1: Métodos de Cobro (Yape, Plin, Banco, CCI y QR) */}
      <Tarjeta className="border-primario/30 bg-gradient-to-br from-primario-suave/20 via-superficie to-superficie p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-borde-suave pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h2 className="text-base font-bold text-texto">
                Métodos de Cobro y Billetera Preferida
              </h2>
            </div>
            <p className="mt-1 text-xs text-texto-suave">
              Indica por qué billetera prefieres recibir tus pagos cuando tus amigos te deban dinero.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-primario-suave px-2.5 py-1 text-[11px] font-bold text-primario">
            Facilita tus cobros
          </span>
        </div>

        {errorCobro && <Alerta tono="error">{errorCobro}</Alerta>}
        {okCobro && <Alerta tono="exito">{okCobro}</Alerta>}

        <form onSubmit={guardarCobro} className="space-y-5">
          {/* 1. Selector de Billetera Preferida */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-texto">
              ¿Por cuál billetera prefieres que te paguen?
            </label>
            <p className="text-[11px] text-texto-suave mb-2">
              Esta billetera aparecerá destacada en primer lugar para tus amigos cuando vayan a transferirte.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BILLETERAS_POPULARES.map((b) => {
                const activa = billetera === b.valor;
                return (
                  <button
                    key={b.valor}
                    type="button"
                    onClick={() => setBilletera(b.valor)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-95 ${
                      activa
                        ? `${b.estilo} ring-2 ring-primario shadow-xs font-bold`
                        : 'border-borde bg-superficie hover:bg-superficie-2 text-texto'
                    }`}
                  >
                    <span className="text-2xl">{b.icono}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-texto">{b.etiqueta}</p>
                        {activa && <span className="text-xs text-primario">✓</span>}
                      </div>
                      <p className="text-[11px] text-texto-suave truncate">{b.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Celular para Transferencias */}
          <div>
            <label htmlFor="celular-cobro" className="block text-xs font-bold uppercase tracking-wider text-texto">
              Número de Celular (Yape / Plin / Bim / Sip)
            </label>
            <div className="mt-1.5 flex rounded-xl border border-borde bg-superficie shadow-2xs focus-within:border-primario focus-within:ring-2 focus-within:ring-primario/20 max-w-md">
              <span className="inline-flex items-center px-3 text-xs font-semibold text-texto-suave border-r border-borde bg-superficie-2 rounded-l-xl">
                🇵🇪 +51
              </span>
              <input
                id="celular-cobro"
                type="tel"
                placeholder="987 654 321"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-sm text-texto placeholder:text-texto-tenue focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-texto-suave">
              Tus amigos podrán copiarlo con 1 clic al momento de liquidar la deuda.
            </p>
          </div>

          {/* 3. Datos Bancarios Estructurados (Opcionales) */}
          <div className="rounded-xl border border-borde-suave bg-superficie/60 p-4 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-texto">
                Cuenta Bancaria y CCI (Opcional)
              </h3>
              <p className="text-[11px] text-texto-suave">
                Para transferencias interbancarias directas si tus amigos no tienen billetera móvil.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Banco */}
              <div>
                <label htmlFor="banco-cobro" className="block text-[11px] font-bold text-texto">
                  Banco
                </label>
                <select
                  id="banco-cobro"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-borde bg-superficie px-3 py-2 text-xs text-texto shadow-2xs focus:border-primario focus:outline-none"
                >
                  {BANCOS_POPULARES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de cuenta */}
              <div>
                <label htmlFor="cuenta-cobro" className="block text-[11px] font-bold text-texto">
                  Número de cuenta
                </label>
                <input
                  id="cuenta-cobro"
                  type="text"
                  placeholder="Ej. 191-12345678-0-90"
                  value={cuenta}
                  onChange={(e) => setCuenta(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-borde bg-superficie px-3 py-2 text-xs text-texto placeholder:text-texto-tenue shadow-2xs focus:border-primario focus:outline-none"
                />
              </div>

              {/* CCI */}
              <div>
                <label htmlFor="cci-cobro" className="block text-[11px] font-bold text-texto">
                  Código Interbancario (CCI)
                </label>
                <input
                  id="cci-cobro"
                  type="text"
                  placeholder="20 dígitos (ej. 002-191-...)"
                  value={cci}
                  onChange={(e) => setCci(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-borde bg-superficie px-3 py-2 text-xs text-texto placeholder:text-texto-tenue shadow-2xs focus:border-primario focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Boton type="submit" disabled={guardandoCobro}>
              {guardandoCobro ? 'Guardando datos…' : 'Guardar métodos de cobro'}
            </Boton>
          </div>
        </form>

        {/* 4. Código QR Personal (Yape / Plin) */}
        <div className="border-t border-borde-suave pt-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <h3 className="text-sm font-bold text-texto flex items-center gap-2">
              <span>📷</span>
              <span>Código QR de Cobro (Yape o Plin)</span>
            </h3>
            <span className="text-[11px] text-texto-suave">
              Captura de pantalla descargada de tu app bancaria
            </span>
          </div>

          {errorQr && <Alerta tono="error">{errorQr}</Alerta>}
          {okQr && <Alerta tono="exito">{okQr}</Alerta>}

          <input
            ref={entradaQr}
            id="qr-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void cambiarQr(e.target.files?.[0])}
          />

          {srcQr ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-borde bg-superficie p-4">
              <div className="relative group shrink-0">
                <img
                  src={srcQr}
                  alt="Tu código QR de cobro"
                  className="h-32 w-32 rounded-xl border border-borde object-cover shadow-2xs bg-white p-1"
                />
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <p className="text-xs font-semibold text-texto">
                  ✓ Tienes un código QR activo
                </p>
                <p className="text-xs text-texto-suave">
                  Tus amigos verán este código en pantalla para escanearlo o guardarlo al momento de pagarte.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <label
                    htmlFor="qr-file"
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-borde bg-superficie px-3.5 py-1.5 text-xs font-bold text-texto hover:bg-superficie-2 transition-all active:scale-95 shadow-2xs"
                  >
                    {subiendoQr ? 'Cargando…' : 'Reemplazar QR'}
                  </label>
                  <button
                    type="button"
                    onClick={() => void borrarQr()}
                    disabled={subiendoQr}
                    className="inline-flex items-center justify-center rounded-xl border border-peligro/30 bg-peligro-suave/30 px-3.5 py-1.5 text-xs font-bold text-peligro hover:bg-peligro-suave/60 transition-all active:scale-95"
                  >
                    Eliminar QR
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-borde p-6 text-center space-y-3 bg-superficie/50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primario-suave text-xl text-primario">
                📲
              </div>
              <div>
                <p className="text-sm font-bold text-texto">Aún no has subido tu QR</p>
                <p className="text-xs text-texto-suave max-w-md mx-auto mt-0.5">
                  Descarga o toma captura de tu QR en Yape o Plin y súbelo aquí. Quienes te deban podrán escanearlo sin tener que pedirte tu número.
                </p>
              </div>
              <div>
                <label
                  htmlFor="qr-file"
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primario px-4 py-2 text-xs font-bold text-sobre-primario shadow-sm shadow-primario/25 hover:bg-primario-fuerte transition-all active:scale-95"
                >
                  {subiendoQr ? 'Subiendo código…' : 'Subir captura de QR'}
                </label>
              </div>
            </div>
          )}
        </div>
      </Tarjeta>

      {/* SECCIÓN 2: Perfil & Foto */}
      <Tarjeta className="shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
          Perfil de usuario
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {srcAvatar ? (
            <img
              src={srcAvatar}
              alt="Foto de perfil"
              className="h-16 w-16 rounded-full object-cover border border-borde shadow-2xs"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primario-suave text-2xl font-bold uppercase text-primario shadow-2xs">
              {inicial}
            </span>
          )}
          <div className="space-y-1">
            <p className="text-base font-bold text-texto">{usuario}</p>
            <p className="text-xs text-texto-suave">Cuenta activa en SplitVision</p>
            <div className="pt-1">
              <input
                ref={entradaArchivo}
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void cambiarFoto(e.target.files?.[0])}
              />
              <label
                htmlFor="avatar"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-borde bg-superficie px-3.5 py-1.5 text-xs font-bold text-texto shadow-2xs transition hover:bg-superficie-2 active:scale-95"
              >
                {subiendoAvatar ? 'Subiendo…' : 'Cambiar foto'}
              </label>
            </div>
          </div>
        </div>
        {errorAvatar && <Alerta tono="error">{errorAvatar}</Alerta>}
        {okAvatar && <Alerta tono="exito">{okAvatar}</Alerta>}
      </Tarjeta>

      {/* SECCIÓN 3: Apariencia & Moneda */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Tarjeta className="shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
            Apariencia
          </h2>
          <p className="text-xs text-texto-suave">Selecciona el tema de la aplicación</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {OPCIONES_TEMA.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => definirTema(opcion.valor)}
                aria-pressed={tema === opcion.valor}
                aria-label={opcion.etiqueta}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-bold transition-all active:scale-95 ${
                  tema === opcion.valor
                    ? 'border-primario bg-primario text-sobre-primario shadow-sm shadow-primario/20'
                    : 'border-borde bg-superficie text-texto hover:bg-superficie-2'
                }`}
              >
                <span aria-hidden="true" className="text-base">{opcion.icono}</span>
                <span>{opcion.etiqueta}</span>
              </button>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
            Idioma y moneda
          </h2>
          <div>
            <label htmlFor="idioma" className="block text-xs font-semibold text-texto">
              Idioma
            </label>
            <select
              id="idioma"
              value={idioma}
              onChange={(e) => definirIdioma(e.target.value as typeof idioma)}
              className="mt-1 w-full rounded-xl border border-borde bg-superficie px-3 py-2 text-xs text-texto shadow-2xs focus:border-primario focus:outline-none"
            >
              <option value="es-PE">Español (Perú)</option>
            </select>
          </div>
          <div>
            <label htmlFor="moneda" className="block text-xs font-semibold text-texto">
              Moneda
            </label>
            <input
              id="moneda"
              type="text"
              value="S/ Sol peruano (PEN)"
              readOnly
              disabled
              className="mt-1 w-full rounded-xl border border-borde bg-superficie-3 px-3 py-2 text-xs text-texto-suave shadow-2xs"
            />
            <p className="mt-1 text-[11px] text-texto-suave">
              Por ahora SplitVision trabaja exclusivamente en soles peruanos (PEN).
            </p>
          </div>
        </Tarjeta>
      </div>

      {/* SECCIÓN 4: Seguridad */}
      <Tarjeta className="shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-texto-tenue">
          Seguridad y contraseña
        </h2>
        <form onSubmit={enviarContrasena} className="space-y-3 max-w-lg">
          <Campo
            etiqueta="Contraseña actual"
            name="actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
          <Campo
            etiqueta="Nueva contraseña"
            name="nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <Campo
            etiqueta="Confirmar nueva contraseña"
            name="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
          {errorPass && <Alerta tono="error">{errorPass}</Alerta>}
          {okPass && <Alerta tono="exito">{okPass}</Alerta>}
          <div className="pt-1">
            <Boton type="submit" disabled={guardandoPass}>
              {guardandoPass ? 'Guardando…' : 'Cambiar contraseña'}
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  );
}
