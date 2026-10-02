export const MONEDA = 'PEN';

const MONTO_REGEX = /^-?\d+(\.\d{1,2})?$/;

export function esMontoValido(monto: number | string): boolean {
  const texto = typeof monto === 'number' ? monto.toFixed(2) : monto.trim().replace(',', '.');
  return MONTO_REGEX.test(texto);
}

export function aCentavos(monto: number | string): number {
  const texto = typeof monto === 'number' ? monto.toFixed(2) : monto.trim().replace(',', '.');
  if (!MONTO_REGEX.test(texto)) {
    throw new Error(`Monto invalido: ${monto}`);
  }
  const negativo = texto.startsWith('-');
  const [entero = '0', decimal = ''] = texto.replace('-', '').split('.');
  const centavos = Number(entero) * 100 + Number((decimal + '00').slice(0, 2));
  return negativo ? -centavos : centavos;
}

export function desdeCentavos(centavos: number): number {
  return centavos / 100;
}

export function formatearSoles(centavos: number): string {
  return `S/ ${(centavos / 100).toFixed(2)}`;
}
