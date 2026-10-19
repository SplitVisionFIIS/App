import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'acento';

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-primario text-sobre-primario hover:bg-primario-fuerte focus-visible:outline-primario active:scale-[0.97]',
  secundario:
    'border border-borde bg-superficie text-texto hover:border-borde/90 hover:bg-superficie-2 focus-visible:outline-primario active:scale-[0.97]',
  peligro:
    'bg-peligro text-sobre-primario hover:bg-peligro/90 focus-visible:outline-peligro active:scale-[0.97]',
  fantasma:
    'text-texto-suave hover:bg-superficie-2 hover:text-texto focus-visible:outline-primario active:scale-[0.97]',
  acento:
    'bg-acento text-sobre-acento hover:bg-acento-fuerte focus-visible:outline-acento active:scale-[0.97]',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  cargando?: boolean;
  icono?: ReactNode;
  children: ReactNode;
};

export function Boton({
  variante = 'primario',
  cargando = false,
  icono,
  className = '',
  children,
  disabled,
  ...props
}: Props) {
  const estaDeshabilitado = disabled || cargando;

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[transform,background-color,border-color,opacity] duration-160 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANTES[variante]} ${className}`}
      disabled={estaDeshabilitado}
      {...props}
    >
      {cargando ? (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icono ? (
        <span className="shrink-0">{icono}</span>
      ) : null}
      <span className={cargando ? 'opacity-90' : ''}>{children}</span>
    </button>
  );
}
