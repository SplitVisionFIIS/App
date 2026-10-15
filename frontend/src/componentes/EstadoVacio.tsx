import type { ReactNode } from 'react';

export function EstadoVacio({
  titulo,
  mensaje,
  accion,
}: {
  titulo: string;
  mensaje: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <h3 className="text-sm font-semibold text-texto">{titulo}</h3>
      <p className="max-w-sm text-sm text-texto-suave">{mensaje}</p>
      {accion}
    </div>
  );
}
