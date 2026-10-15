import type { ReactNode } from 'react';

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-borde bg-superficie p-4 shadow-sm sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
