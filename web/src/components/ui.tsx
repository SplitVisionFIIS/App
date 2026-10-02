import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Boton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function BotonSecundario({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Campo({
  etiqueta,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{etiqueta}</span>
      <input
        className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

const COLORES_ESTADO: Record<string, string> = {
  PROCESANDO: 'bg-amber-100 text-amber-800',
  PROCESADO: 'bg-blue-100 text-blue-800',
  FALLIDO: 'bg-red-100 text-red-800',
  CONFIRMADO: 'bg-green-100 text-green-800',
};

export function InsigniaEstado({ estado }: { estado: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES_ESTADO[estado] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {estado}
    </span>
  );
}

export function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {mensaje}
    </p>
  );
}
