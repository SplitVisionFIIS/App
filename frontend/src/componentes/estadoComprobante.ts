import type { ReceiptStatus } from '../api/tipos';

export const ETIQUETA_ESTADO: Record<ReceiptStatus, string> = {
  PROCESANDO: 'Procesando',
  EXTRAÍDO: 'Por revisar',
  CONFIRMADO: 'Confirmado',
  FALLIDO: 'Fallido',
};

export const ESTILO_ESTADO: Record<ReceiptStatus, string> = {
  PROCESANDO: 'bg-aviso-suave text-aviso',
  EXTRAÍDO: 'bg-info-suave text-info',
  CONFIRMADO: 'bg-exito-suave text-exito',
  FALLIDO: 'bg-peligro-suave text-peligro',
};
