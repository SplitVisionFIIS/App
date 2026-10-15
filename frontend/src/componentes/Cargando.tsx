export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-12 text-texto-suave"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-borde border-t-primario" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}
