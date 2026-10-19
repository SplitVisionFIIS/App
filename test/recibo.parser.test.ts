import { parseRecetaTexto, parseMonto, reconciliar } from '../src/modules/ocr/recibo.parser';
import { validateOcrPayload } from '../src/modules/ocr/ocr.client';

describe('parseMonto', () => {
  test('interpreta formatos comunes de montos', () => {
    expect(parseMonto('S/ 57.50')).toBe(57.5);
    expect(parseMonto('57,50')).toBe(57.5);
    expect(parseMonto('1,234.56')).toBe(1234.56);
    expect(parseMonto('1.234,56')).toBe(1234.56);
    expect(parseMonto('45.00')).toBe(45);
    expect(parseMonto('abc')).toBeNull();
  });
});

describe('parseRecetaTexto', () => {
  test('extrae total, igv, servicio e ítems que cuadran con el total', () => {
    const texto = [
      'LA CASONA GOURMET',
      'Cant. | Descripción | P.Unit. | Total',
      '(1) | Ceviche de Pescado S/ 45.00 45.00',
      '(2) | Copas de Vino Tinto Reserva S/ 18.00 36.00',
      '(1) | Café Espresso Doble S/ 11.00 11.00',
      'Sub Total: S/ 92.00',
      'Servicio (10%): S/ 9.20',
      'IGV (18%): S/ 16.56',
      'TOTAL: S/ 117.76',
    ].join('\n');

    const p = parseRecetaTexto(texto);
    expect(p.total).toBe(117.76);
    expect(p.tip).toBe(9.2);
    expect(p.tax).toBe(16.56);
    expect(p.items).toEqual([
      { description: 'Ceviche de Pescado', quantity: 1, unit_price: 45 },
      { description: 'Copas de Vino Tinto Reserva', quantity: 2, unit_price: 18 },
      { description: 'Café Espresso Doble', quantity: 1, unit_price: 11 },
    ]);
    const suma = p.items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
    expect(Math.round((suma + p.tax + p.tip - p.discount) * 100)).toBe(Math.round(p.total * 100));
  });

  test('extrae ítems de boletas estándar sin separador pipe (formato común peruano)', () => {
    const texto = [
      'POLLERIA EL SABORCITO S.A.C.',
      'RUC: 20601234567',
      '1 Pollo a la Brasa con Papas 65.00',
      '2x Gaseosa Inka Kola 1.5L 12.00 24.00',
      'Porcion Anticuchos 28.00',
      'CONSUMO: S/ 117.00',
      'TOTAL: S/ 117.00',
    ].join('\n');

    const p = parseRecetaTexto(texto);
    expect(p.total).toBe(117);
    expect(p.items).toEqual([
      { description: 'Pollo a la Brasa con Papas', quantity: 1, unit_price: 65 },
      { description: 'Gaseosa Inka Kola 1.5L', quantity: 2, unit_price: 12 },
      { description: 'Porcion Anticuchos', quantity: 1, unit_price: 28 },
    ]);
  });

  test('ignora metadatos de cabecera como RUC, Pedido, Mesa y extrae ítems correctamente', () => {
    const texto = [
      'POLLERIA CORRALITO',
      'RUC: 20601169761',
      'DOM FISCAL: AV SAN FELIPE 151',
      'LOCAL: Av. Perez Aranibar 1875',
      'Pedido : 0040200533',
      'Fecha Emisión 23/07/2026 19:06:30',
      'Mesa 4',
      '1/2 Pollo + Papas + En 1 47.50 47.50',
      'Gaseosa 1 Lt 1 11.00 11.00',
      'Sub Total: S/ 58.50',
      'Importe Total: S/ 58.50',
      'FORMA DE PAGO CONTADO',
    ].join('\n');

    const p = parseRecetaTexto(texto);
    expect(p.total).toBe(58.50);
    expect(p.items).toEqual([
      { description: '1/2 Pollo Papas En', quantity: 1, unit_price: 47.50 },
      { description: 'Gaseosa 1 Lt', quantity: 1, unit_price: 11.00 },
    ]);
    expect(p.bestEffort).toBeFalsy();
  });

  test('fusiona descripciones de ítems que ocupan 2 filas', () => {
    const texto = [
      'POLLERIA CORRALITO',
      'RUC: 20601169761',
      '1/2 Pollo + Papas + En 1 47.50 47.50',
      'salada',
      'Gaseosa 1 Lt 1 11.00 11.00',
      'TOTAL: S/ 58.50',
    ].join('\n');

    const p = parseRecetaTexto(texto);
    expect(p.total).toBe(58.50);
    expect(p.items).toEqual([
      { description: '1/2 Pollo Papas En salada', quantity: 1, unit_price: 47.50 },
      { description: 'Gaseosa 1 Lt', quantity: 1, unit_price: 11.00 },
    ]);
  });

  test('fusiona ítems cuando el precio aparece en la primera fila y la continuación en la segunda', () => {
    const texto = [
      'RESTAURANTE EL ENCUENTRO',
      '1 Pollo a la Brasa con Papas 65.00',
      'fritas crocantes con salsa tártara y ensalada fresca',
      '1 Ceviche Mixto Especial 45.00',
      'con Choclo desgranado y Camote glaseado',
      'TOTAL: S/ 110.00',
    ].join('\n');

    const p = parseRecetaTexto(texto);
    expect(p.total).toBe(110.00);
    expect(p.items).toEqual([
      {
        description: 'Pollo a la Brasa con Papas fritas crocantes con salsa tártara y ensalada fresca',
        quantity: 1,
        unit_price: 65.00,
      },
      {
        description: 'Ceviche Mixto Especial con Choclo desgranado y Camote glaseado',
        quantity: 1,
        unit_price: 45.00,
      },
    ]);
  });

  test('reconcilia un importe con el punto decimal perdido (1950 -> 19.50)', () => {
    const texto = [
      'LA CASONA GOURMET',
      '(1) | Ceviche de Pescado S/ 45.00 45.00',
      '(1) | Crema Volteada $.1950| 1950 5',
      'Sub Total: S/ 64.50',
      'TOTAL: S/ 64.50',
    ].join('\n');
    const p = parseRecetaTexto(texto);
    expect(p.items).toEqual([
      { description: 'Ceviche de Pescado', quantity: 1, unit_price: 45 },
      { description: 'Crema Volteada', quantity: 1, unit_price: 19.5 },
    ]);
    expect(p.bestEffort).toBeUndefined();
    expect(() => validateOcrPayload(p)).not.toThrow();
  });

  test('conserva los ítems como mejor esfuerzo si no se pueden reconciliar', () => {
    const texto = ['TIENDA X', '(1) | Producto S/ 10.00 10.00', 'TOTAL: S/ 99.99'].join('\n');
    const p = parseRecetaTexto(texto);
    expect(p.total).toBe(99.99);
    expect(p.items).toEqual([{ description: 'Producto', quantity: 1, unit_price: 10 }]);
    expect(p.bestEffort).toBe(true);
    expect(() => validateOcrPayload(p)).not.toThrow();
  });

  test('lanza si no hay total', () => {
    expect(() => parseRecetaTexto('TIENDA SIN MONTOS\nGRACIAS')).toThrow(/total/i);
  });

  test('lanza si el texto está vacío', () => {
    expect(() => parseRecetaTexto('   \n  ')).toThrow(/texto/i);
  });
});

describe('reconciliar', () => {
  const items = [
    { description: 'Ceviche', quantity: 1, unit_price: 45 },
    { description: 'Crema', quantity: 1, unit_price: 1950 },
  ];

  test('corrige el punto decimal perdido y devuelve el cuadre exacto', () => {
    expect(reconciliar(items, 6450)).toEqual([
      { description: 'Ceviche', quantity: 1, unit_price: 45 },
      { description: 'Crema', quantity: 1, unit_price: 19.5 },
    ]);
  });

  test('elimina un ítem espurio que descuadra la suma', () => {
    const conEspurio = [
      { description: 'Ceviche', quantity: 1, unit_price: 45 },
      { description: 'Ruido OCR', quantity: 1, unit_price: 10 },
    ];
    expect(reconciliar(conEspurio, 4500)).toEqual([
      { description: 'Ceviche', quantity: 1, unit_price: 45 },
    ]);
  });

  test('devuelve null cuando no hay una corrección única', () => {
    expect(reconciliar(items, 12345)).toBeNull();
  });
});

describe('validateOcrPayload', () => {
  test('rechaza ítems descuadrados cuando no son mejor esfuerzo', () => {
    const raw = {
      total: 99.99,
      items: [{ description: 'Producto', quantity: 1, unit_price: 10 }],
    };
    expect(() => validateOcrPayload(raw)).toThrow(/cuadran/i);
  });

  test('acepta ítems descuadrados marcados como mejor esfuerzo', () => {
    const raw = {
      total: 99.99,
      bestEffort: true,
      items: [{ description: 'Producto', quantity: 1, unit_price: 10 }],
    };
    const valid = validateOcrPayload(raw);
    expect(valid.totalCents).toBe(9999);
    expect(valid.items).toEqual([{ description: 'Producto', quantity: 1, unitPriceCents: 1000 }]);
  });
});
