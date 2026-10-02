export class ContractViolation extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ContractViolation';
  }
}

export function asegurar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new ContractViolation(mensaje);
  }
}
