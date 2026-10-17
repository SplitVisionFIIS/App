import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  error?: string;
  icono?: ReactNode;
  accionDerecha?: ReactNode;
  ayuda?: string;
};

export function Campo({
  etiqueta,
  error,
  id,
  type = 'text',
  icono,
  accionDerecha,
  ayuda,
  className = '',
  ...props
}: Props) {
  const identificador = id ?? props.name ?? etiqueta.toLowerCase().replace(/\s+/g, '-');
  const esPassword = type === 'password';
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const tipoReal = esPassword ? (mostrarPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label htmlFor={identificador} className="block text-xs font-semibold uppercase tracking-wider text-texto">
          {etiqueta}
        </label>
        {ayuda ? <span className="text-xs text-texto-suave">{ayuda}</span> : null}
      </div>

      <div className="relative flex items-center">
        {icono ? (
          <span className="pointer-events-none absolute left-3 flex items-center text-texto-suave/80">
            {icono}
          </span>
        ) : null}

        <input
          id={identificador}
          type={tipoReal}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-xl border bg-superficie py-2.5 text-sm text-texto shadow-xs transition-all placeholder:text-texto-tenue/60 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            icono ? 'pl-10' : 'pl-3.5'
          } ${esPassword || accionDerecha ? 'pr-11' : 'pr-3.5'} ${
            error
              ? 'border-peligro/70 bg-peligro-suave/20 focus:border-peligro focus:ring-peligro/30'
              : 'border-borde hover:border-borde/90 focus:border-primario focus:ring-primario/25'
          } ${className}`}
          {...props}
        />

        {esPassword ? (
          <button
            type="button"
            onClick={() => setMostrarPassword((prev) => !prev)}
            aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            tabIndex={-1}
            className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-texto-suave transition-colors hover:bg-superficie-2 hover:text-texto focus:outline-none"
          >
            {mostrarPassword ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        ) : accionDerecha ? (
          <div className="absolute right-2.5 flex items-center">{accionDerecha}</div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-peligro">
          <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
