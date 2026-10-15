import type { ReactNode } from 'react';

export function Alerta({
  children,
  tono = 'error',
}: {
  children: ReactNode;
  tono?: 'error' | 'exito';
}) {
  const estilo =
    tono === 'error'
      ? 'border-peligro/30 bg-peligro-suave text-peligro'
      : 'border-exito/30 bg-exito-suave text-exito';
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${estilo}`}>
      {children}
    </div>
  );
}
