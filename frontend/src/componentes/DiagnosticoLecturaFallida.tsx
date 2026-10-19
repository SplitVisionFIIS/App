import { Boton } from './Boton';
import { Tarjeta } from './Tarjeta';

interface Props {
  fotoUrl?: string | null;
  failReason?: string | null;
  onReintentar?: () => void;
  onCompletarManual?: () => void;
  onSubirOtra?: () => void;
  onEliminar?: () => void;
  reintentando?: boolean;
  eliminando?: boolean;
  esPropietario?: boolean;
}

export function DiagnosticoLecturaFallida({
  fotoUrl,
  failReason: _failReason,
  onReintentar,
  onCompletarManual,
  onSubirOtra,
  onEliminar,
  reintentando = false,
  eliminando = false,
  esPropietario = true,
}: Props) {
  return (
    <div className="space-y-4 anim-stagger-2">
      {/* Cabecera del diagnóstico */}
      <div className="rounded-2xl border border-aviso/25 bg-aviso-suave/30 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-aviso/30 bg-aviso/15 text-aviso shadow-2xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-texto">
                  Lectura automática no concluyente
                </h2>
                <span className="rounded-full bg-aviso/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-aviso">
                  Requiere atención
                </span>
              </div>
              <p className="mt-1 text-xs text-texto-suave leading-relaxed">
                El motor OCR analizó tu foto, pero la tinta térmica, sombras o el encuadre impidieron extraer con certeza los platos y el total. Puedes completar los montos manualmente o volver a intentarlo con otra toma.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 2 Columnas para aprovechar el espacio de pantalla */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna Izquierda: Vista previa de la foto & Consejos */}
        <div className="space-y-4 lg:col-span-5">
          {fotoUrl ? (
            <Tarjeta className="overflow-hidden p-0 shadow-2xs">
              <div className="border-b border-borde-suave bg-superficie-2 px-3 py-2 text-xs font-semibold text-texto-suave flex items-center justify-between">
                <span>Captura analizada</span>
                <span className="text-[10px] text-texto-tenue">Comprobante</span>
              </div>
              <div className="flex items-center justify-center bg-superficie p-3">
                <img
                  src={fotoUrl}
                  alt="Comprobante con lectura fallida"
                  className="max-h-80 w-full rounded-lg object-contain shadow-xs ring-1 ring-borde-suave"
                />
              </div>
            </Tarjeta>
          ) : null}

          {/* Guía rápida para fotos nítidas */}
          <div className="rounded-2xl border border-borde-suave bg-superficie p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-texto-suave mb-3 flex items-center gap-1.5">
              <span>💡</span> Recomendaciones para boletas
            </h3>
            <ul className="space-y-2 text-xs text-texto-suave">
              <li className="flex items-start gap-2">
                <span className="text-exito font-bold">✓</span>
                <span><strong>Enfoca el total:</strong> La última línea con el monto y la fecha deben estar visibles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-exito font-bold">✓</span>
                <span><strong>Sin sombras directas:</strong> La sombra de la mano o el celular sobre papel térmico borra los números.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-exito font-bold">✓</span>
                <span><strong>Papel extendido:</strong> Alisa el comprobante si está arrugado antes de disparar la foto.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Columna Derecha: Opciones y Soluciones Rápidas */}
        <div className="space-y-3 lg:col-span-7">
          <h3 className="text-xs font-bold uppercase tracking-wider text-texto-suave px-1">
            ¿Cómo deseas continuar?
          </h3>

          {/* Opción 1: Completar a mano (Recomendado) */}
          {esPropietario && onCompletarManual ? (
            <div className="group rounded-2xl border border-primario/30 bg-superficie p-4 shadow-2xs transition-[border-color,box-shadow,transform] hover:border-primario hover:shadow-xs active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primario-suave text-primario font-bold">
                    ✍️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-texto">
                        Ingresar datos manualmente
                      </h4>
                      <span className="rounded-full bg-primario/10 px-2 py-0.5 text-[10px] font-bold text-primario">
                        Más rápido
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-texto-suave">
                      Ingresa el total y los nombres de los platos tú mismo. Estará listo en 30 segundos sin depender de la cámara.
                    </p>
                  </div>
                </div>
                <Boton onClick={onCompletarManual} className="shrink-0">
                  Completar a mano →
                </Boton>
              </div>
            </div>
          ) : null}

          {/* Opción 2: Subir otra foto */}
          {esPropietario && onSubirOtra ? (
            <div className="group rounded-2xl border border-borde bg-superficie p-4 shadow-2xs transition-[border-color,box-shadow,transform] hover:border-primario/50 active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-superficie-2 text-texto font-bold">
                    📸
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-texto">
                      Subir o tomar otra fotografía
                    </h4>
                    <p className="mt-1 text-xs text-texto-suave">
                      Si tienes mejor luz o puedes encuadrarlo de nuevo, intenta con una toma más nítida.
                    </p>
                  </div>
                </div>
                <Boton
                  variante="secundario"
                  onClick={onSubirOtra}
                  disabled={eliminando}
                  className="shrink-0"
                >
                  {eliminando ? 'Preparando…' : 'Elegir otra foto'}
                </Boton>
              </div>
            </div>
          ) : null}

          {/* Opción 3: Reintentar lectura automática */}
          {esPropietario && onReintentar ? (
            <div className="rounded-2xl border border-borde bg-superficie p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-superficie-2 text-texto font-bold">
                    🔁
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-texto">
                      Reintentar lectura OCR
                    </h4>
                    <p className="mt-1 text-xs text-texto-suave">
                      Vuelve a procesar la misma imagen con el motor inteligente.
                    </p>
                  </div>
                </div>
                <Boton
                  variante="secundario"
                  onClick={onReintentar}
                  disabled={reintentando}
                  cargando={reintentando}
                  className="shrink-0"
                >
                  {reintentando ? 'Reintentando…' : 'Reintentar lectura'}
                </Boton>
              </div>
            </div>
          ) : null}

          {/* Opción 4: Descartar / Eliminar */}
          {esPropietario && onEliminar ? (
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={onEliminar}
                disabled={eliminando}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-peligro transition-colors hover:text-peligro-fuerte hover:underline"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {eliminando ? 'Eliminando…' : 'Descartar este comprobante'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
