import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { EVENTO_SESION_CADUCADA, enviar, obtener } from '../api/client';
import type { SesionActual } from '../api/tipos';

type Estado = 'cargando' | 'listo';

export type Sesion = {
  estado: Estado;
  usuario: string | null;
  hasImage: boolean;
  fotoUrl: string | null;
  phone: string | null;
  preferredWallet: string | null;
  bankName: string | null;
  accountNumber: string | null;
  cci: string | null;
  hasQr: boolean;
  qrUrl: string | null;
  iniciar: (usuario: string) => void;
  refrescar: () => Promise<void>;
  cerrar: () => Promise<void>;
};

const ContextoSesion = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [preferredWallet, setPreferredWallet] = useState<string | null>('YAPE');
  const [bankName, setBankName] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [cci, setCci] = useState<string | null>(null);
  const [hasQr, setHasQr] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');

  const aplicarPerfil = (r: SesionActual) => {
    setUsuario(r.username);
    setHasImage(Boolean(r.hasImage));
    setFotoUrl(r.imageUrl ?? null);
    setPhone(r.phone ?? null);
    setPreferredWallet(r.preferredWallet ?? 'YAPE');
    setBankName(r.bankName ?? null);
    setAccountNumber(r.accountNumber ?? null);
    setCci(r.cci ?? null);
    setHasQr(Boolean(r.hasQr));
    setQrUrl(r.qrUrl ?? null);
  };

  const limpiar = () => {
    setUsuario(null);
    setHasImage(false);
    setFotoUrl(null);
    setPhone(null);
    setPreferredWallet('YAPE');
    setBankName(null);
    setAccountNumber(null);
    setCci(null);
    setHasQr(false);
    setQrUrl(null);
  };

  const refrescar = async () => {
    try {
      const r = await obtener<SesionActual>('/api/auth/me');
      aplicarPerfil(r);
    } catch {
      limpiar();
    }
  };

  useEffect(() => {
    let vivo = true;
    obtener<SesionActual>('/api/auth/me')
      .then((r) => {
        if (!vivo) return;
        aplicarPerfil(r);
      })
      .catch(() => {
        if (!vivo) return;
        limpiar();
      })
      .finally(() => {
        if (vivo) setEstado('listo');
      });

    const alCaducar = () => {
      limpiar();
    };
    window.addEventListener(EVENTO_SESION_CADUCADA, alCaducar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_SESION_CADUCADA, alCaducar);
    };
  }, []);

  const iniciar = (nombre: string) => setUsuario(nombre);

  const cerrar = async () => {
    try {
      await enviar('/api/auth/logout', {});
    } catch {
      // sin sesión que limpiar del lado del servidor
    }
    limpiar();
  };

  return (
    <ContextoSesion.Provider
      value={{
        estado,
        usuario,
        hasImage,
        fotoUrl,
        phone,
        preferredWallet,
        bankName,
        accountNumber,
        cci,
        hasQr,
        qrUrl,
        iniciar,
        refrescar,
        cerrar,
      }}
    >
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion(): Sesion {
  const ctx = useContext(ContextoSesion);
  if (!ctx) {
    return {
      estado: 'listo',
      usuario: null,
      hasImage: false,
      fotoUrl: null,
      phone: null,
      preferredWallet: 'YAPE',
      bankName: null,
      accountNumber: null,
      cci: null,
      hasQr: false,
      qrUrl: null,
      iniciar: () => {},
      refrescar: async () => {},
      cerrar: async () => {},
    };
  }
  return ctx;
}
