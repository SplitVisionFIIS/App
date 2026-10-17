import type { ReactNode } from 'react';

export function Tarjeta({
  children,
  className = '',
  destacada = false,
}: {
  children: ReactNode;
  className?: string;
  destacada?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-superficie p-5 shadow-xs transition-all duration-200 sm:p-6 ${
        destacada
          ? 'border-primario/30 shadow-md shadow-primario/5'
          : 'border-borde hover:border-borde/90'
      } ${className}`}
    >
      {children}
    </div>
  );
}
