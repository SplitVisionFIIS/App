import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro';

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-primario text-sobre-primario hover:bg-primario-fuerte focus-visible:outline-primario',
  secundario:
    'border border-borde bg-superficie text-texto hover:bg-superficie-2 focus-visible:outline-primario',
  peligro: 'bg-peligro text-sobre-primario hover:bg-peligro/90 focus-visible:outline-peligro',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  children: ReactNode;
};

export function Boton({ variante = 'primario', className = '', children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
