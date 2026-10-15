import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Tema = 'claro' | 'oscuro' | 'sistema';
export type Idioma = 'es-PE';

type Preferencias = {
  tema: Tema;
  idioma: Idioma;
  definirTema: (tema: Tema) => void;
  definirIdioma: (idioma: Idioma) => void;
};

const CLAVE_TEMA = 'splitvision:tema';
const CLAVE_IDIOMA = 'splitvision:idioma';

const ContextoPreferencias = createContext<Preferencias | null>(null);

function leerTema(): Tema {
  const valor = localStorage.getItem(CLAVE_TEMA);
  return valor === 'claro' || valor === 'oscuro' || valor === 'sistema' ? valor : 'sistema';
}

function leerIdioma(): Idioma {
  const valor = localStorage.getItem(CLAVE_IDIOMA);
  return valor === 'es-PE' ? valor : 'es-PE';
}

function prefiereOscuro(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function aplicarTema(tema: Tema): void {
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && prefiereOscuro());
  document.documentElement.classList.toggle('dark', oscuro);
}

export function ProveedorPreferencias({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => leerTema());
  const [idioma, setIdioma] = useState<Idioma>(() => leerIdioma());

  useEffect(() => {
    const aplicar = () => {
      aplicarTema(tema);
      document.documentElement.style.colorScheme =
        tema === 'oscuro' || (tema === 'sistema' && prefiereOscuro()) ? 'dark' : 'light';
    };
    aplicar();
    localStorage.setItem(CLAVE_TEMA, tema);
    if (tema !== 'sistema') return;
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const alCambiar = () => aplicar();
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, [tema]);

  useEffect(() => {
    localStorage.setItem(CLAVE_IDIOMA, idioma);
    document.documentElement.lang = idioma;
  }, [idioma]);

  return (
    <ContextoPreferencias.Provider
      value={{ tema, idioma, definirTema: setTema, definirIdioma: setIdioma }}
    >
      {children}
    </ContextoPreferencias.Provider>
  );
}

export function usePreferencias(): Preferencias {
  const ctx = useContext(ContextoPreferencias);
  if (!ctx) throw new Error('usePreferencias debe usarse dentro de ProveedorPreferencias');
  return ctx;
}
