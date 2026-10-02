export const METODOS_PAGO = ['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'TARJETA', 'OTRO'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const MODALIDADES = ['EQUITATIVO', 'POR_ITEMS'] as const;
export type ModalidadDivision = (typeof MODALIDADES)[number];

export const ESTADOS_COMPROBANTE = ['PROCESANDO', 'PROCESADO', 'FALLIDO', 'CONFIRMADO'] as const;
export type EstadoComprobante = (typeof ESTADOS_COMPROBANTE)[number];

export const NOMBRE_COLA_OCR = 'ocr-extraccion';
