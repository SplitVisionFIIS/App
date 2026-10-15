import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { cambiarContrasena, subirAvatar, urlAvatar } from '../api/perfil';
import { useSesion } from '../auth';
import { Alerta } from '../componentes/Alerta';
import { Boton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { Tarjeta } from '../componentes/Tarjeta';
import { mensajeDeError } from '../i18n/es-PE';
import { usePreferencias } from '../preferencias/PreferenciasContext';
import type { Tema } from '../preferencias/PreferenciasContext';

const OPCIONES_TEMA: { valor: Tema; etiqueta: string }[] = [
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
  { valor: 'sistema', etiqueta: 'Sistema' },
];

export function Configuracion() {
  const { usuario, hasImage, refrescar } = useSesion();
  const { tema, idioma, definirTema, definirIdioma } = usePreferencias();

  const [versionAvatar, setVersionAvatar] = useState(0);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [errorAvatar, setErrorAvatar] = useState('');
  const [okAvatar, setOkAvatar] = useState('');
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorPass, setErrorPass] = useState('');
  const [okPass, setOkPass] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);

  const cambiarFoto = async (archivo?: File) => {
    if (!archivo) return;
    setErrorAvatar('');
    setOkAvatar('');
    setSubiendoAvatar(true);
    try {
      await subirAvatar(archivo);
      await refrescar();
      setVersionAvatar((v) => v + 1);
      setOkAvatar('Foto de perfil actualizada.');
    } catch (e) {
      setErrorAvatar(mensajeDeError(e));
    } finally {
      setSubiendoAvatar(false);
      if (entradaArchivo.current) entradaArchivo.current.value = '';
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

  return (
    <>
      <h1 className="text-xl font-semibold text-texto ">Configuración</h1>

      <Tarjeta className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave ">
          Perfil
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {srcAvatar ? (
            <img
              src={srcAvatar}
              alt="Foto de perfil"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primario-suave text-2xl font-bold uppercase text-primario  ">
              {inicial}
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-texto ">{usuario}</p>
            <div className="mt-2">
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
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-borde bg-superficie px-4 py-2 text-sm font-medium text-texto transition hover:bg-superficie-2    "
              >
                {subiendoAvatar ? 'Subiendo…' : 'Cambiar foto'}
              </label>
            </div>
          </div>
        </div>
        {errorAvatar ? (
          <div className="mt-3">
            <Alerta>{errorAvatar}</Alerta>
          </div>
        ) : null}
        {okAvatar ? (
          <div className="mt-3">
            <Alerta tono="exito">{okAvatar}</Alerta>
          </div>
        ) : null}
      </Tarjeta>

      <Tarjeta className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave ">
          Apariencia
        </h2>
        <p className="mt-2 text-sm text-texto-suave ">Tema de la aplicación</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OPCIONES_TEMA.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => definirTema(opcion.valor)}
              aria-pressed={tema === opcion.valor}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                tema === opcion.valor
                  ? 'border-primario bg-primario text-sobre-primario'
                  : 'border-borde bg-superficie text-texto hover:bg-superficie-2    '
              }`}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave ">
          Idioma y moneda
        </h2>
        <div className="mt-3">
          <label
            htmlFor="idioma"
            className="block text-sm font-medium text-texto "
          >
            Idioma
          </label>
          <select
            id="idioma"
            value={idioma}
            onChange={(e) => definirIdioma(e.target.value as typeof idioma)}
            className="mt-1 w-full rounded-lg border border-borde px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primario/50    sm:w-64"
          >
            <option value="es-PE">Español (Perú)</option>
          </select>
        </div>
        <div className="mt-3">
          <label
            htmlFor="moneda"
            className="block text-sm font-medium text-texto "
          >
            Moneda
          </label>
          <input
            id="moneda"
            type="text"
            value="S/ Sol peruano (PEN)"
            readOnly
            disabled
            className="mt-1 w-full rounded-lg border border-borde bg-superficie-3 px-3 py-2 text-sm text-texto-suave shadow-sm    sm:w-64"
          />
          <p className="mt-1 text-xs text-texto-suave ">
            Por ahora SplitVision solo trabaja en soles (PEN).
          </p>
        </div>
      </Tarjeta>

      <Tarjeta className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave ">
          Seguridad
        </h2>
        <form onSubmit={enviarContrasena} className="mt-3 space-y-3">
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
          {errorPass ? <Alerta>{errorPass}</Alerta> : null}
          {okPass ? <Alerta tono="exito">{okPass}</Alerta> : null}
          <Boton type="submit" disabled={guardandoPass}>
            {guardandoPass ? 'Guardando…' : 'Cambiar contraseña'}
          </Boton>
        </form>
      </Tarjeta>
    </>
  );
}
