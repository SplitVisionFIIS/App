import { asegurar } from './contratos';

export interface PartePorUsuario {
  usuarioId: string;
  montoCents: number;
}

export interface ItemDivision {
  descripcion: string;
  montoCents: number;
  consumidores: string[];
}

export interface AjustesDivision {
  impuestosCents: number;
  propinaCents: number;
  descuentosCents: number;
}

const AJUSTES_VACIOS: AjustesDivision = {
  impuestosCents: 0,
  propinaCents: 0,
  descuentosCents: 0,
};

/**
 * Reparte `montoCents` (entero, >= 0) segun `pesos` (enteros, >= 0) usando el
 * metodo de resto mayor: cada quien recibe la parte entera y los centavos
 * sobrantes se asignan a los mayores residuos fraccionarios (empate: orden).
 * Garantiza: suma(asignado) === montoCents.
 */
function repartirProporcional(montoCents: number, pesos: number[]): number[] {
  asegurar(Number.isInteger(montoCents) && montoCents >= 0, 'Monto a repartir invalido');
  asegurar(pesos.every((p) => Number.isInteger(p) && p >= 0), 'Los pesos deben ser enteros >= 0');
  const totalPesos = pesos.reduce((acumulado, p) => acumulado + p, 0);
  asegurar(totalPesos > 0, 'No hay base (pesos) para distribuir el monto');
  asegurar(
    Number.isSafeInteger(montoCents * totalPesos),
    'Los montos exceden la precision entera segura',
  );

  const exactos = pesos.map((p) => (montoCents * p) / totalPesos);
  const asignado = exactos.map((e) => Math.floor(e));
  let sobrante = montoCents - asignado.reduce((acumulado, v) => acumulado + v, 0);

  const orden = exactos
    .map((e, indice) => ({ indice, residuo: e - Math.floor(e) }))
    .sort((a, b) => b.residuo - a.residuo || a.indice - b.indice);

  for (let k = 0; k < orden.length && sobrante > 0; k += 1) {
    asignado[orden[k].indice] += 1;
    sobrante -= 1;
  }
  asegurar(sobrante === 0, 'No se pudieron distribuir todos los centavos del residuo');
  return asignado;
}

function validarParticipantes(participantes: string[]): void {
  asegurar(participantes.length > 0, 'Debe haber al menos un participante');
  asegurar(
    new Set(participantes).size === participantes.length,
    'La lista de participantes tiene duplicados',
  );
}

function validarTotal(totalCents: number): void {
  asegurar(
    Number.isInteger(totalCents) && totalCents > 0,
    'El total del comprobante debe ser un entero positivo (centavos)',
  );
}

/**
 * Reparto equitativo: el total se divide entre todos los participantes
 * (incluido el pagador) aplicando el metodo de resto mayor.
 */
export function repartoEquitativo(
  totalCents: number,
  participantes: string[],
): PartePorUsuario[] {
  validarTotal(totalCents);
  validarParticipantes(participantes);

  const partes = repartirProporcional(
    totalCents,
    participantes.map(() => 1),
  );

  const resultado = participantes.map((usuarioId, i) => ({
    usuarioId,
    montoCents: partes[i],
  }));
  verificarInvariante(totalCents, resultado);
  return resultado;
}

/**
 * Reparto por items: cada participante asume la suma de los items que consumio
 * (un item compartido se divide en partes iguales entre sus consumidores) y los
 * ajustes (impuestos + propina, descuentos) se distribuyen proporcionalmente a
 * esa base, tambien con metodo de resto mayor.
 */
export function repartoPorItems(
  totalCents: number,
  participantes: string[],
  items: ItemDivision[],
  ajustes: AjustesDivision = AJUSTES_VACIOS,
): PartePorUsuario[] {
  validarTotal(totalCents);
  validarParticipantes(participantes);
  asegurar(items.length > 0, 'El reparto por items requiere al menos un item');
  asegurar(
    Number.isInteger(ajustes.impuestosCents) && ajustes.impuestosCents >= 0,
    'Los impuestos deben ser un entero >= 0',
  );
  asegurar(
    Number.isInteger(ajustes.propinaCents) && ajustes.propinaCents >= 0,
    'La propina debe ser un entero >= 0',
  );
  asegurar(
    Number.isInteger(ajustes.descuentosCents) && ajustes.descuentosCents >= 0,
    'Los descuentos deben ser un entero >= 0',
  );

  const conjunto = new Set(participantes);
  for (const item of items) {
    asegurar(
      Number.isInteger(item.montoCents) && item.montoCents > 0,
      `El item "${item.descripcion}" tiene un monto invalido`,
    );
    asegurar(item.consumidores.length > 0, `El item "${item.descripcion}" no tiene consumidores`);
    asegurar(
      new Set(item.consumidores).size === item.consumidores.length,
      `El item "${item.descripcion}" tiene consumidores duplicados`,
    );
    for (const consumidor of item.consumidores) {
      asegurar(
        conjunto.has(consumidor),
        `El consumidor ${consumidor} del item "${item.descripcion}" no es participante del evento`,
      );
    }
  }

  const sumaItems = items.reduce((acumulado, item) => acumulado + item.montoCents, 0);
  const netoAjustes =
    ajustes.impuestosCents + ajustes.propinaCents - ajustes.descuentosCents;
  asegurar(
    sumaItems + netoAjustes === totalCents,
    `Los items (${sumaItems}) mas los ajustes (${netoAjustes}) no cuadran con el total (${totalCents})`,
  );

  const base = new Map<string, number>(participantes.map((u) => [u, 0]));
  for (const item of items) {
    const porConsumidor = repartirProporcional(
      item.montoCents,
      item.consumidores.map(() => 1),
    );
    item.consumidores.forEach((consumidor, i) => {
      base.set(consumidor, (base.get(consumidor) ?? 0) + porConsumidor[i]);
    });
  }

  const pesos = participantes.map((u) => base.get(u) ?? 0);
  const distImpuestos =
    ajustes.impuestosCents > 0 ? repartirProporcional(ajustes.impuestosCents, pesos) : pesos.map(() => 0);
  const distPropina =
    ajustes.propinaCents > 0 ? repartirProporcional(ajustes.propinaCents, pesos) : pesos.map(() => 0);
  const distDescuentos =
    ajustes.descuentosCents > 0 ? repartirProporcional(ajustes.descuentosCents, pesos) : pesos.map(() => 0);

  const resultado = participantes.map((usuarioId, i) => ({
    usuarioId,
    montoCents: pesos[i] + distImpuestos[i] + distPropina[i] - distDescuentos[i],
  }));
  verificarInvariante(totalCents, resultado);
  return resultado;
}

/**
 * Postcondicion (Design by Contract): la suma de las partes asignadas a todos
 * los participantes (incluido el pagador) debe ser exactamente el monto total
 * del comprobante, y ninguna parte puede ser negativa ni exceder el total.
 */
export function verificarInvariante(totalCents: number, partes: PartePorUsuario[]): void {
  const suma = partes.reduce((acumulado, p) => acumulado + p.montoCents, 0);
  asegurar(
    suma === totalCents,
    `Invariante violada: la suma de las partes (${suma}) no equivale al total (${totalCents})`,
  );
  asegurar(partes.length > 0, 'Invariante violada: no hay participantes con parte asignada');
  for (const parte of partes) {
    asegurar(
      Number.isInteger(parte.montoCents) && parte.montoCents >= 0,
      `Parte invalida para ${parte.usuarioId}`,
    );
    asegurar(
      parte.montoCents <= totalCents,
      `Parte de ${parte.usuarioId} excede el total del comprobante`,
    );
  }
}

/**
 * Deudas a generar: una por cada participante distinto del pagador cuya parte
 * sea mayor a cero (la parte del pagador no genera deuda).
 */
export function deudasDesdePartes(
  partes: PartePorUsuario[],
  pagadorId: string,
): PartePorUsuario[] {
  return partes.filter((p) => p.usuarioId !== pagadorId && p.montoCents > 0);
}
