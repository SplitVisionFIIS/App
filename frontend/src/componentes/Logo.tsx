type PropsLogo = {
  /** Tamaño del símbolo en px */
  tam?: number;
  /** Mostrar u ocultar el wordmark */
  texto?: boolean;
  /** Tono de fondo sobre el que se muestra (claro u oscuro) */
  sobre?: 'claro' | 'oscuro';
  className?: string;
};

const ACENTO = 'var(--sv-acento)';

const RUTA_SUPERIOR = 'M55.56 58.64L23.89 38.55Q20.09 36.14 22.67 32.45A52 52 0 0 1 105.33 32.45Q107.91 36.14 104.11 38.55L72.44 58.64Q64 64 55.56 58.64Z';
const RUTA_DERECHA = 'M72.86 59.37L106.09 41.99Q110.08 39.91 111.99 43.98A52 52 0 0 1 70.66 115.57Q66.18 115.95 65.99 111.46L64.42 73.99Q64 64 72.86 59.37Z';
const RUTA_IZQUIERDA = 'M63.58 73.99L62.01 111.46Q61.82 115.95 57.34 115.57A52 52 0 0 1 16.01 43.98Q17.92 39.91 21.91 41.99L55.14 59.37Q64 64 63.58 73.99Z';

export function Logo({ tam = 32, texto = true, sobre = 'claro', className = '' }: PropsLogo) {
  const base = sobre === 'oscuro' ? 'var(--sv-sobre-barra)' : 'var(--sv-texto)';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={tam}
        height={tam}
        viewBox="0 0 128 128"
        role={texto ? undefined : 'img'}
        aria-hidden={texto ? true : undefined}
        aria-label={texto ? undefined : 'SplitVision'}
        focusable="false"
      >
        <path d={RUTA_SUPERIOR} style={{ fill: ACENTO }} />
        <path d={RUTA_DERECHA} style={{ fill: base }} />
        <path d={RUTA_IZQUIERDA} style={{ fill: base }} />
      </svg>
      {texto ? (
        <span className="logotipo" style={{ fontSize: Math.round(tam * 0.72), color: base }}>
          Split<span className="acento">Vision</span>
        </span>
      ) : null}
    </span>
  );
}
