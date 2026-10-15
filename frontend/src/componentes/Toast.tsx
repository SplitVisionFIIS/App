import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Tonos = 'error' | 'exito';
type Mostrar = (mensaje: string, tono?: Tonos) => void;
type Aviso = { id: number; mensaje: string; tono: Tonos };

const ContextoToast = createContext<Mostrar>(() => {});

export function ProveedorToast({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(0);

  const mostrar = useCallback<Mostrar>((mensaje, tono = 'error') => {
    const id = ++siguienteId.current;
    setAvisos((actuales) => [...actuales, { id, mensaje, tono }]);
    setTimeout(() => {
      setAvisos((actuales) => actuales.filter((a) => a.id !== id));
    }, 5000);
  }, []);

  return (
    <ContextoToast.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4">
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tono === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto w-full rounded-lg border px-4 py-2 text-sm shadow-lg sm:w-auto ${
              a.tono === 'error'
                ? 'border-peligro/30 bg-peligro-suave text-peligro'
                : 'border-exito/30 bg-exito-suave text-exito'
            }`}
          >
            {a.mensaje}
          </div>
        ))}
      </div>
    </ContextoToast.Provider>
  );
}

export function useToast(): Mostrar {
  return useContext(ContextoToast);
}
