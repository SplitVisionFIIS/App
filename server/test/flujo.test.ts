import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';
import { procesarComprobante } from '../src/comprobantes/procesador';
import { prisma } from '../src/db';
import { MockOcrProvider } from '../src/providers/ocr/MockOcrProvider';
import { crearBossDePruebas, limpiarUsuarios, nombreUnico, prepararBase } from './helpers';

const IMAGEN_FALSA = Buffer.from('imagen-de-comprobante-de-prueba');

describe('Flujo completo de SplitVision (seccion 2.4 del doc tecnico)', () => {
  let servidor: Server;
  const sufijo = nombreUnico('flujo');
  const nombres = {
    mateo: `mateo_${sufijo}`,
    lucia: `lucia_${sufijo}`,
    andres: `andres_${sufijo}`,
    carlos: `carlos_${sufijo}`,
  };
  const tokens: Record<string, string> = {};

  let eventoId = '';
  let comprobanteId = '';
  let comprobanteFallidoId = '';
  let deudaLuciaId = '';
  let deudaAndresId = '';

  beforeAll(async () => {
    await prepararBase();
    servidor = crearApp(crearBossDePruebas()).listen(0);
  });

  afterAll(async () => {
    await limpiarUsuarios(Object.values(nombres));
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
    await prisma.$disconnect();
  });

  const auth = (usuario: string) => ({ Authorization: `Bearer ${tokens[usuario]}` });

  async function registrar(username: string) {
    return request(servidor).post('/api/v1/auth/registro').send({
      username,
      email: `${username}@splitvision.test`,
      password: 'Password123',
    });
  }

  it('RF1: el registro crea usuarios con username y email unicos', async () => {
    for (const username of Object.values(nombres)) {
      const respuesta = await registrar(username);
      expect(respuesta.status).toBe(201);
      expect(respuesta.body.usuario.username).toBe(username);
      expect(respuesta.body.usuario.passwordHash).toBeUndefined();
      tokens[username] = respuesta.body.token;
    }

    const repetido = await registrar(nombres.mateo);
    expect(repetido.status).toBe(409);

    const emailRepetido = await request(servidor).post('/api/v1/auth/registro').send({
      username: `otro_${sufijo}`,
      email: `${nombres.lucia}@splitvision.test`,
      password: 'Password123',
    });
    expect(emailRepetido.status).toBe(409);
  });

  it('RF1: login con username o email y trazabilidad via /me', async () => {
    const conUsername = await request(servidor)
      .post('/api/v1/auth/login')
      .send({ identificador: nombres.mateo, password: 'Password123' });
    expect(conUsername.status).toBe(200);

    const conEmail = await request(servidor)
      .post('/api/v1/auth/login')
      .send({ identificador: `${nombres.lucia}@splitvision.test`, password: 'Password123' });
    expect(conEmail.status).toBe(200);

    const invalida = await request(servidor)
      .post('/api/v1/auth/login')
      .send({ identificador: nombres.mateo, password: 'otra-clave' });
    expect(invalida.status).toBe(401);

    const me = await request(servidor).get('/api/v1/auth/me').set(auth(nombres.mateo));
    expect(me.status).toBe(200);
    expect(me.body.usuario.username).toBe(nombres.mateo);

    const sinToken = await request(servidor).get('/api/v1/auth/me');
    expect(sinToken.status).toBe(401);
  });

  it('RF2: el evento vincula participantes y aislamiento por evento', async () => {
    const creado = await request(servidor)
      .post('/api/v1/eventos')
      .set(auth(nombres.mateo))
      .send({ nombre: 'Salida de prueba' });
    expect(creado.status).toBe(201);
    eventoId = creado.body.evento.id;

    const porUsername = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/participantes`)
      .set(auth(nombres.mateo))
      .send({ usuario: nombres.lucia });
    expect(porUsername.status).toBe(201);

    const porEmail = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/participantes`)
      .set(auth(nombres.mateo))
      .send({ usuario: `${nombres.andres}@splitvision.test` });
    expect(porEmail.status).toBe(201);

    const duplicado = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/participantes`)
      .set(auth(nombres.mateo))
      .send({ usuario: nombres.lucia });
    expect(duplicado.status).toBe(409);

    const inexistente = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/participantes`)
      .set(auth(nombres.mateo))
      .send({ usuario: `nadie_${sufijo}` });
    expect(inexistente.status).toBe(404);

    const detalle = await request(servidor)
      .get(`/api/v1/eventos/${eventoId}`)
      .set(auth(nombres.lucia));
    expect(detalle.status).toBe(200);
    expect(detalle.body.evento.participantes).toHaveLength(3);

    const ajeno = await request(servidor)
      .get(`/api/v1/eventos/${eventoId}`)
      .set(auth(nombres.carlos));
    expect(ajeno.status).toBe(403);

    const ajenoEscribe = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/participantes`)
      .set(auth(nombres.carlos))
      .send({ usuario: nombres.mateo });
    expect(ajenoEscribe.status).toBe(403);
  });

  it('RF3: la carga responde 202 y el worker procesa el comprobante sin bloquear la app', async () => {
    const subida = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/comprobantes`)
      .set(auth(nombres.mateo))
      .attach('imagen', IMAGEN_FALSA, { filename: 'ticket.png', contentType: 'image/png' });
    expect(subida.status).toBe(202);
    expect(subida.body.comprobante.estado).toBe('PROCESANDO');
    comprobanteId = subida.body.comprobante.id;

    const sinImagen = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/comprobantes`)
      .set(auth(nombres.mateo));
    expect(sinImagen.status).toBe(400);

    const ajeno = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/comprobantes`)
      .set(auth(nombres.carlos))
      .attach('imagen', IMAGEN_FALSA, { filename: 'ticket.png', contentType: 'image/png' });
    expect(ajeno.status).toBe(403);

    // Worker de segundo plano (simulado en el test): extrae y valida el OCR.
    await procesarComprobante({ comprobanteId }, new MockOcrProvider({ delayMs: 0, errorRate: 0 }), 0, 2);

    const consulta = await request(servidor)
      .get(`/api/v1/comprobantes/${comprobanteId}`)
      .set(auth(nombres.lucia));
    expect(consulta.status).toBe(200);
    expect(consulta.body.comprobante.estado).toBe('PROCESADO');
    expect(consulta.body.comprobante.datosExtraidos.montoTotalCents).toBe(4500);
    expect(consulta.body.comprobante.datosExtraidos.items).toHaveLength(3);
  });

  it('RF3: si el OCR falla y se agotan los reintentos, el comprobante queda FALLIDO', async () => {
    const subida = await request(servidor)
      .post(`/api/v1/eventos/${eventoId}/comprobantes`)
      .set(auth(nombres.mateo))
      .attach('imagen', IMAGEN_FALSA, { filename: 'roto.png', contentType: 'image/png' });
    expect(subida.status).toBe(202);
    comprobanteFallidoId = subida.body.comprobante.id;

    const proveedorRoto = new MockOcrProvider({ delayMs: 0, errorRate: 1 });
    await procesarComprobante({ comprobanteId: comprobanteFallidoId }, proveedorRoto, 2, 2);

    const consulta = await request(servidor)
      .get(`/api/v1/comprobantes/${comprobanteFallidoId}`)
      .set(auth(nombres.mateo));
    expect(consulta.body.comprobante.estado).toBe('FALLIDO');
    expect(consulta.body.comprobante.datosExtraidos.error).toContain('OCR');
  });

  it('RF4: la division equitativa genera deudas solo para los no pagadores y cuadra el total', async () => {
    const dividir = await request(servidor)
      .post(`/api/v1/comprobantes/${comprobanteId}/dividir`)
      .set(auth(nombres.mateo))
      .send({ montoTotal: 45, modalidad: 'EQUITATIVO' });
    expect(dividir.status).toBe(201);

    const { partes, deudas } = dividir.body;
    expect(partes).toHaveLength(3);
    const suma = partes.reduce((total: number, p: { monto: number }) => total + p.monto, 0);
    expect(suma).toBe(45);

    expect(deudas).toHaveLength(2);
    for (const deuda of deudas) {
      expect(deuda.montoTotal).toBe(15);
      expect(deuda.saldo).toBe(15);
    }

    const mapaDeudas = await request(servidor)
      .get(`/api/v1/eventos/${eventoId}/deudas`)
      .set(auth(nombres.mateo));
    expect(mapaDeudas.body.deudas).toHaveLength(2);
    for (const deuda of mapaDeudas.body.deudas) {
      if (deuda.deudor.username === nombres.lucia) deudaLuciaId = deuda.id;
      if (deuda.deudor.username === nombres.andres) deudaAndresId = deuda.id;
    }
    expect(deudaLuciaId).toBeTruthy();
    expect(deudaAndresId).toBeTruthy();

    const repetido = await request(servidor)
      .post(`/api/v1/comprobantes/${comprobanteId}/dividir`)
      .set(auth(nombres.mateo))
      .send({ montoTotal: 45, modalidad: 'EQUITATIVO' });
    expect(repetido.status).toBe(409);

    const ajeno = await request(servidor)
      .post(`/api/v1/comprobantes/${comprobanteId}/dividir`)
      .set(auth(nombres.carlos))
      .send({ montoTotal: 45, modalidad: 'EQUITATIVO' });
    expect(ajeno.status).toBe(403);
  });

  it('RF5: dos pagos simultaneos sobre la misma deuda se serializan (sin Lost Update)', async () => {
    const respuestaA = request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.lucia))
      .send({ monto: 9, metodo: 'YAPE', referencia: 'pago-A' });
    const respuestaB = request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.lucia))
      .send({ monto: 10, metodo: 'PLIN', referencia: 'pago-B' });

    const [a, b] = await Promise.all([respuestaA, respuestaB]);
    const estados = [a.status, b.status].sort();
    expect(estados).toEqual([201, 409]);

    const exitosa = a.status === 201 ? a : b;
    const rechazada = a.status === 201 ? b : a;
    expect(rechazada.body.error.codigo).toBe('PAGO_SUPERA_SALDO');

    const deudas = await request(servidor)
      .get(`/api/v1/eventos/${eventoId}/deudas`)
      .set(auth(nombres.lucia));
    const deuda = deudas.body.deudas.find((d: { id: string }) => d.id === deudaLuciaId);
    expect(deuda.pagos).toHaveLength(1);
    expect(deuda.saldo).toBe(15 - exitosa.body.pago.monto);
  });

  it('RF5: 10 pagos concurrentes se procesan uno por uno y nunca dejan saldo negativo', async () => {
    const pagos = Array.from({ length: 10 }, () =>
      request(servidor)
        .post(`/api/v1/deudas/${deudaAndresId}/pagos`)
        .set(auth(nombres.andres))
        .send({ monto: 5, metodo: 'EFECTIVO' }),
    );
    // Un pago sobre OTRA deuda viaja en paralelo: no debe bloquearse con la anterior.
    const pagoOtraDeuda = request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.lucia))
      .send({ monto: 1, metodo: 'EFECTIVO' });

    const respuestas = await Promise.all([...pagos, pagoOtraDeuda]);
    const deAndres = respuestas.slice(0, 10);
    const deLucia = respuestas[10];

    const aceptados = deAndres.filter((respuesta) => respuesta.status === 201);
    const rechazados = deAndres.filter((respuesta) => respuesta.status === 409);
    expect(aceptados).toHaveLength(3);
    expect(rechazados).toHaveLength(7);

    // Pago sobre una deuda distinta: no se ve afectado por el bloqueo de la otra fila.
    expect(deLucia.status).toBe(201);

    const deudas = await request(servidor)
      .get(`/api/v1/eventos/${eventoId}/deudas`)
      .set(auth(nombres.mateo));
    for (const deuda of deudas.body.deudas) {
      const pagado = deuda.pagos.reduce((total: number, p: { monto: number }) => total + p.monto, 0);
      expect(deuda.saldo).toBeGreaterThanOrEqual(0);
      expect(deuda.saldo).toBe(deuda.montoTotal - pagado);
    }

    const andres = deudas.body.deudas.find((d: { id: string }) => d.id === deudaAndresId);
    expect(andres.saldo).toBe(0);
  });

  it('RF5: las precondiciones y la validacion defensiva rechazan pagos invalidos', async () => {
    const cero = await request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.lucia))
      .send({ monto: 0, metodo: 'EFECTIVO' });
    expect(cero.status).toBe(422);

    const noEsDeudor = await request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.mateo))
      .send({ monto: 1, metodo: 'EFECTIVO' });
    expect(noEsDeudor.status).toBe(403);

    const metodoInvalido = await request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.lucia))
      .send({ monto: 1, metodo: 'BITCOIN' });
    expect(metodoInvalido.status).toBe(400);

    const referenciaHostil = await request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.lucia))
      .send({ monto: 1, metodo: 'EFECTIVO', referencia: '<script>alert(1)</script>' });
    expect(referenciaHostil.status).toBe(400);
  });

  it('RF6: el balance refleja la matriz de deudas y el evento queda saldado', async () => {
    const deudas = await request(servidor)
      .get(`/api/v1/eventos/${eventoId}/deudas`)
      .set(auth(nombres.lucia));
    const pendiente = deudas.body.deudas.find((d: { id: string }) => d.id === deudaLuciaId).saldo;
    expect(pendiente).toBeGreaterThan(0);

    const ultimo = await request(servidor)
      .post(`/api/v1/deudas/${deudaLuciaId}/pagos`)
      .set(auth(nombres.lucia))
      .send({ monto: pendiente, metodo: 'TRANSFERENCIA', referencia: 'cancelacion' });
    expect(ultimo.status).toBe(201);
    expect(ultimo.body.saldo).toBe(0);

    const balance = await request(servidor)
      .get(`/api/v1/eventos/${eventoId}/balance`)
      .set(auth(nombres.mateo));
    expect(balance.status).toBe(200);
    expect(balance.body.balance.saldado).toBe(true);
    expect(balance.body.balance.pendienteTotal).toBe(0);
    for (const participante of balance.body.balance.participantes) {
      expect(participante.debe).toBe(0);
    }
  });

  it('Invariantes del dominio verificadas directamente en la base de datos', async () => {
    const fueraDeRango = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM deudas
      WHERE evento_id = ${eventoId}::uuid
        AND (saldo_cents < 0 OR saldo_cents > monto_total_cents)
    `;
    expect(fueraDeRango[0].total).toBe(0);

    const descuadres = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM deudas d
      WHERE d.evento_id = ${eventoId}::uuid
        AND d.saldo_cents <> d.monto_total_cents - COALESCE(
          (SELECT SUM(p.monto_cents) FROM pagos p WHERE p.deuda_id = d.id), 0)
    `;
    expect(descuadres[0].total).toBe(0);
  });
});
