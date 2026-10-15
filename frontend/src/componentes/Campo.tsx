import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  error?: string;
};

export function Campo({ etiqueta, error, id, ...props }: Props) {
  const identificador = id ?? props.name ?? etiqueta.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={identificador} className="block text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <input
        id={identificador}
        aria-invalid={error ? true : undefined}
        className={`mt-1 w-full rounded-lg border bg-superficie px-3 py-2 text-sm text-texto shadow-sm focus:outline-none focus:ring-2 ${
          error ? 'border-peligro focus:ring-peligro/40' : 'border-borde focus:ring-primario/50'
        }`}
        {...props}
      />
      {error ? (
        <p role="alert" className="mt-1 text-sm text-peligro">
          {error}
        </p>
      ) : null}
    </div>
  );
}
