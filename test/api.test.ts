import { mkdtempSync, rmSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import type { INestApplication } from '@nestjs/common';

jest.setTimeout(600_000);

const PASS = 'Passw0rd!23';
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

interface ApiRes {
  status: number;
  ms: number;
  data: any;
  text: string;
  buf: Buffer | null;
}

class Client {
  cookies = new Map<string, string>();
  csrf: string | null = null;
  username = '';

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async req(
    method: string,
    path: string,
    opts: { json?: unknown; form?: FormData; headers?: Record<string, string>; raw?: boolean } = {},
  ): Promise<ApiRes> {
    const headers: Record<string, string> = { ...opts.headers };
    const cookie = this.cookieHeader();
    if (cookie) headers.cookie = cookie;
    if (this.csrf && !headers['x-csrf-token']) headers['x-csrf-token'] = this.csrf;
    let body: string | FormData | undefined;
    if (opts.form) {
      body = opts.form;
    } else if (opts.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(opts.json);
    }
    const t0 = Date.now();
    const res = await fetch(baseUrl + path, { method, headers, body });
    const ms = Date.now() - t0;
    for (const sc of res.headers.getSetCookie()) {
      const pair = sc.split(';')[0];
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    if (opts.raw) {
      const buf = Buffer.from(await res.arrayBuffer());
      return { status: res.status, ms, data: null, text: '', buf };
    }
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { status: res.status, ms, data, text, buf: null };
  }
}

let container: StartedTestContainer | undefined;
let app: INestApplication | undefined;
let baseUrl = '';
let ds: import('typeorm').DataSource;
let processor: { drain(maxTicks?: number): Promise<void> };
let imageDir = '';
let seq = 0;

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  imageDir = mkdtempSync(join(tmpdir(), 'sv-test-'));
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({ POSTGRES_USER: 'sv', POSTGRES_PASSWORD: 'sv', POSTGRES_DB: 'sv' })
    .withExposedPorts(5432)
    .start();
  process.env.DATABASE_URL = `postgres://sv:sv@${container.getHost()}:${container.getMappedPort(5432)}/sv`;
  process.env.NODE_ENV = 'test';
  process.env.IMAGE_DIR = imageDir;
  process.env.OCR_PROVIDER = 'fake';
  process.env.FAKE_OCR_MODE = 'success';
  process.env.OCR_MAX_ATTEMPTS = '1';
  process.env.OCR_BACKOFF_MS = '0';
  process.env.OCR_TIMEOUT_MS = '1000';
  process.env.OCR_BREAKER_RESET_MS = '200';
  process.env.LOGIN_MAX_ATTEMPTS = '5';
  process.env.SESSION_HOURS = '8';

  const { runMigrations } = await import('../src/db/migrate');
  await runMigrations();
  const { AppModule } = await import('../src/app.module');
  const { NestFactory } = await import('@nestjs/core');
  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();

  const { JobsProcessor } = await import('../src/modules/ocr/ocr.worker');
  processor = app.get(JobsProcessor, { strict: false });
  const { DataSource } = await import('typeorm');
  ds = app.get(DataSource, { strict: false });
});

afterAll(async () => {
  await app?.close();
  await container?.stop();
  if (imageDir) rmSync(imageDir, { recursive: true, force: true });
});

// ---------- helpers ----------

async function newUser(prefix: string): Promise<Client> {
  const c = new Client();
  const username = `${prefix}${String(++seq).padStart(4, '0')}`;
  c.username = username;
  const r = await c.req('POST', '/api/auth/register', {
    json: { username, email: `${username}@split.test`, password: PASS },
  });
  expect(r.status).toBe(201);
  expect(c.cookies.has('sid')).toBe(true);
  c.csrf = r.data.csrf;
  return c;
}

async function newEvent(owner: Client, name: string): Promise<string> {
  const r = await owner.req('POST', '/api/events', { json: { name } });
  expect(r.status).toBe(201);
  return r.data.id;
}

async function participantsOf(eventId: string, viewer: Client): Promise<{ id: string; username: string }[]> {
  const r = await viewer.req('GET', `/api/events/${eventId}/participants`);
  expect(r.status).toBe(200);
  return r.data;
}

async function addMembers(eventId: string, owner: Client, members: Client[]): Promise<void> {
  for (const m of members) {
    const inv = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: m.username },
    });
    expect(inv.status).toBe(201);
    const pend = await m.req('GET', '/api/invitations');
    expect(pend.status).toBe(200);
    const row = pend.data.find((x: any) => x.eventId === eventId);
    expect(row).toBeTruthy();
    const acc = await m.req('POST', `/api/invitations/${row.invitationId}/accept`);
    expect(acc.status).toBe(201);
  }
}

async function manualReceipt(
  eventId: string,
  payer: Client,
  body: {
    description?: string;
    total: string;
    tax?: string;
    tip?: string;
    discount?: string;
    items?: { description: string; quantity: number; unitPrice: string }[];
  },
): Promise<string> {
  const r = await payer.req('POST', `/api/events/${eventId}/receipts/manual`, { json: body });
  expect(r.status).toBe(201);
  return r.data.id;
}

async function splitEquitable(receiptId: string, actor: Client, participantIds: string[]): Promise<void> {
  const r = await actor.req('POST', `/api/receipts/${receiptId}/split`, {
    json: { mode: 'EQUITATIVE', participants: participantIds },
  });
  expect(r.status).toBe(201);
}

async function confirmReceipt(
  receiptId: string,
  actor: Client,
): Promise<{ parts: { userId: string; cents: number }[]; debts: { debtor: string; amountCents: number }[] }> {
  const r = await actor.req('POST', `/api/receipts/${receiptId}/confirm`);
  expect(r.status).toBe(201);
  return r.data;
}

function centsStr(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function pngForm(field: 'image' | 'evidence', filename: string, salt = ''): FormData {
  const f = new FormData();
  const content = salt ? Buffer.concat([PNG_1X1, Buffer.from(salt)]) : PNG_1X1;
  f.append(field, new Blob([content], { type: 'image/png' }), filename);
  return f;
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

async function debtRow(debtId: string): Promise<{ amount: number; confirmed: number; reserved: number }> {
  const rows: any[] = await ds.query(
    'SELECT amount_cents, confirmed_cents, reserved_cents FROM debts WHERE id = $1',
    [debtId],
  );
  expect(rows).toHaveLength(1);
  return {
    amount: Number(rows[0].amount_cents),
    confirmed: Number(rows[0].confirmed_cents),
    reserved: Number(rows[0].reserved_cents),
  };
}

/** Crea evento + comprobante manual + reparto equitativo; devuelve la deuda del deudor al acreedor. */
async function makeDebt(
  creditor: Client,
  debtor: Client,
  amountCents: number,
): Promise<{ eventId: string; receiptId: string; debtId: string }> {
  const eventId = await newEvent(creditor, `ev-${++seq}`);
  await addMembers(eventId, creditor, [debtor]);
  const parts = await participantsOf(eventId, creditor);
  const payerId = parts.find((p) => p.username === creditor.username)!.id;
  const debtorId = parts.find((p) => p.username === debtor.username)!.id;
  const receiptId = await manualReceipt(eventId, creditor, { total: centsStr(amountCents * 2) });
  await splitEquitable(receiptId, creditor, [payerId, debtorId]);
  const info = await confirmReceipt(receiptId, creditor);
  expect(info.debts).toHaveLength(1);
  expect(info.debts[0].amountCents).toBe(amountCents);
  const rows: any[] = await ds.query('SELECT id FROM debts WHERE receipt_id = $1 AND debtor_id = $2', [
    receiptId,
    debtorId,
  ]);
  expect(rows).toHaveLength(1);
  return { eventId, receiptId, debtId: rows[0].id };
}

async function pay(
  debtor: Client,
  debtId: string,
  amount: string,
  opts: { method?: string; key?: string; form?: FormData } = {},
): Promise<ApiRes> {
  if (opts.form) return debtor.req('POST', `/api/debts/${debtId}/payments`, { form: opts.form });
  return debtor.req('POST', `/api/debts/${debtId}/payments`, {
    json: { amount, method: opts.method ?? 'EFECTIVO' },
    headers: opts.key ? { 'idempotency-key': opts.key } : undefined,
  });
}

// ---------- pruebas ----------

describe('identidad: sesión, CSRF y rate limit', () => {
  test('sin sesión → 401; registro crea cookies y CSRF funciona', async () => {
    const anon = new Client();
    expect((await anon.req('GET', '/api/events')).status).toBe(401);

    const c = await newUser('ses');
    expect((await c.req('GET', '/api/auth/me')).status).toBe(200);

    const sinCsrf = new Client();
    sinCsrf.cookies.set('sid', c.cookies.get('sid')!);
    const rejected = await sinCsrf.req('POST', '/api/events', { json: { name: 'sin-csrf' } });
    expect(rejected.status).toBe(401);
    expect(rejected.data.code).toBe('UNAUTHORIZED');

    const ok = await c.req('POST', '/api/events', { json: { name: 'con-csrf' } });
    expect(ok.status).toBe(201);
  });

  test('login: credenciales inválidas → 401; logout invalida la sesión', async () => {
    const c = await newUser('log');
    const mala = await c.req('POST', '/api/auth/login', {
      json: { identifier: c.username, password: 'clave-incorrecta-9' },
    });
    expect(mala.status).toBe(401);

    const buena = await c.req('POST', '/api/auth/login', {
      json: { identifier: c.username, password: PASS },
    });
    expect(buena.status).toBe(201);
    c.csrf = buena.data.csrf;

    await c.req('POST', '/api/auth/logout');
    expect((await c.req('GET', '/api/auth/me')).status).toBe(401);
  });

  test('rate limit: tras 5 intentos fallidos el login queda bloqueado (RF-07)', async () => {
    const victim = await newUser('rl');
    for (let i = 0; i < 5; i++) {
      const r = await new Client().req('POST', '/api/auth/login', {
        json: { identifier: victim.username, password: 'clave-mala-123' },
      });
      expect(r.status).toBe(401);
    }
    const bloqueado = await new Client().req('POST', '/api/auth/login', {
      json: { identifier: victim.username, password: PASS },
    });
    expect(bloqueado.status).toBe(409);
    expect(bloqueado.data.code).toBe('CONFLICT');
  });
});

describe('autorización: un no participante siempre ve 404 (RF-17)', () => {
  test('GET/POST sobre evento, comprobante y deuda de otros → 404', async () => {
    const owner = await newUser('own');
    const debtor = await newUser('deb');
    const outsider = await newUser('out');
    const { eventId, receiptId, debtId } = await makeDebt(owner, debtor, 1000);

    const checks: { method: string; path: string; json?: unknown }[] = [
      { method: 'GET', path: `/api/events/${eventId}` },
      { method: 'GET', path: `/api/events/${eventId}/participants` },
      { method: 'GET', path: `/api/events/${eventId}/receipts` },
      { method: 'GET', path: `/api/events/${eventId}/balance` },
      { method: 'GET', path: `/api/receipts/${receiptId}` },
      { method: 'GET', path: `/api/debts/${debtId}` },
      { method: 'POST', path: `/api/events/${eventId}/invitations`, json: { query: outsider.username } },
      { method: 'POST', path: `/api/invitations/${'00000000-0000-4000-8000-000000000000'}/accept` },
      { method: 'POST', path: `/api/events/${eventId}/receipts/manual`, json: { total: '5.00' } },
      { method: 'POST', path: `/api/receipts/${receiptId}/split`, json: { mode: 'EQUITATIVE' } },
      { method: 'POST', path: `/api/receipts/${receiptId}/confirm` },
      { method: 'POST', path: `/api/debts/${debtId}/payments`, json: { amount: '1.00', method: 'EFECTIVO' } },
      { method: 'POST', path: `/api/payments/00000000-0000-4000-8000-000000000000/confirm` },
    ];
    for (const { method, path, json } of checks) {
      const r = await outsider.req(method, path, json !== undefined ? { json } : {});
      expect([method, path, r.status]).toEqual([method, path, 404]);
      expect(r.data.code).toBe('NOT_FOUND');
    }

    // id con formato inválido → 400 VALIDATION (nunca 500)
    const malformado = await outsider.req('POST', '/api/payments/no-existe/confirm');
    expect(malformado.status).toBe(400);
    expect(malformado.data.code).toBe('VALIDATION');
  });
});

describe('invitaciones: el invitado acepta o rechaza (RF-nuevo)', () => {
  test('fluir invitar → pendiente → aceptar; nadie entra directo', async () => {
    const owner = await newUser('inv');
    const guest = await newUser('gst');
    const eventId = await newEvent(owner, 'cena-inv');

    // el invitado no es participante aún
    expect((await owner.req('GET', `/api/events/${eventId}`)).status).toBe(200);
    expect((await guest.req('GET', `/api/events/${eventId}`)).status).toBe(404);
    expect(await participantsOf(eventId, owner)).toHaveLength(1);

    // se envía la invitación
    const inv = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: guest.username },
    });
    expect(inv.status).toBe(201);
    expect(inv.data.status).toBe('PENDIENTE');

    // aún no es participante: se muestra como invitado pendiente en el detalle
    const det = await owner.req('GET', `/api/events/${eventId}`);
    expect(det.data.participants).toHaveLength(1);
    expect(det.data.invitations).toHaveLength(1);
    expect(det.data.invitations[0].username).toBe(guest.username);
    expect(det.data.invitations[0].status).toBe('PENDIENTE');

    // el invitado lo ve en su bandeja
    const bandeja = await guest.req('GET', '/api/invitations');
    expect(bandeja.status).toBe(200);
    expect(bandeja.data).toHaveLength(1);
    expect(bandeja.data[0].eventId).toBe(eventId);
    expect(bandeja.data[0].inviter).toBe(owner.username);

    // duplicado → conflicto
    const dup = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: guest.username },
    });
    expect(dup.status).toBe(409);
    expect(dup.data.code).toBe('CONFLICT');

    // acepta
    const acepta = await guest.req('POST', `/api/invitations/${bandeja.data[0].invitationId}/accept`);
    expect(acepta.status).toBe(201);
    expect(acepta.data.status).toBe('ACEPTADA');

    // ya es participante y el evento aparece en su lista
    const parts = await participantsOf(eventId, guest);
    expect(parts).toHaveLength(2);
    expect((await guest.req('GET', `/api/events/${eventId}`)).status).toBe(200);
    const lista = await guest.req('GET', '/api/events');
    expect(lista.data.map((e: any) => e.id)).toContain(eventId);
    expect((await guest.req('GET', '/api/invitations')).data).toHaveLength(0);

    // invitado directo sobre alguien ya participante → conflicto
    const otra = await newUser('inv2');
    await owner.req('POST', `/api/events/${eventId}/invitations`, { json: { query: otra.username } });
    const otraInv = (await otra.req('GET', '/api/invitations')).data[0];
    await otra.req('POST', `/api/invitations/${otraInv.invitationId}/accept`);
    const ya = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: otra.username },
    });
    expect(ya.status).toBe(409);
    expect(ya.data.message).toMatch(/ya es participante/);
  });

  test('rechazar deja al invitado fuera y permite reenviar', async () => {
    const owner = await newUser('rej');
    const guest = await newUser('rej2');
    const eventId = await newEvent(owner, 'evento-rechazo');

    const inv = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: `${guest.username}@split.test` },
    });
    expect(inv.status).toBe(201);
    const pend = (await guest.req('GET', '/api/invitations')).data;
    expect(pend).toHaveLength(1);

    const rej = await guest.req('POST', `/api/invitations/${pend[0].invitationId}/reject`);
    expect(rej.status).toBe(201);
    expect(rej.data.status).toBe('RECHAZADA');

    // sigue fuera del evento y sin invitaciones pendientes
    expect(await participantsOf(eventId, owner)).toHaveLength(1);
    expect((await guest.req('GET', `/api/events/${eventId}`)).status).toBe(404);
    expect((await guest.req('GET', '/api/invitations')).data).toHaveLength(0);

    // responder otra vez → 404
    const otra = await guest.req('POST', `/api/invitations/${pend[0].invitationId}/accept`);
    expect(otra.status).toBe(404);

    // el dueño puede reenviar y esta vez la acepta
    const reenvio = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: guest.username },
    });
    expect(reenvio.status).toBe(201);
    const pend2 = (await guest.req('GET', '/api/invitations')).data;
    expect(pend2).toHaveLength(1);
    const acepta2 = await guest.req('POST', `/api/invitations/${pend2[0].invitationId}/accept`);
    expect(acepta2.status).toBe(201);
    expect(await participantsOf(eventId, guest)).toHaveLength(2);
  });

  test('el dueño puede cancelar una invitación pendiente y reenviarla', async () => {
    const owner = await newUser('can');
    const guest = await newUser('can2');
    const eventId = await newEvent(owner, 'evento-cancelar');

    const inv = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: guest.username },
    });
    expect(inv.status).toBe(201);
    const invitationId = inv.data.id as string;
    const det = await owner.req('GET', `/api/events/${eventId}`);
    expect(det.data.invitations).toHaveLength(1);

    // sin ser participante del evento → 404
    const otro = await newUser('can3');
    const ajeno = await otro.req('DELETE', `/api/events/${eventId}/invitations/${invitationId}`);
    expect(ajeno.status).toBe(404);

    // el dueño cancela: desaparece de pendientes y del invitado
    const cancel = await owner.req('DELETE', `/api/events/${eventId}/invitations/${invitationId}`);
    expect(cancel.status).toBe(200);
    expect(cancel.data.status).toBe('CANCELADA');
    expect((await owner.req('GET', `/api/events/${eventId}`)).data.invitations).toHaveLength(0);
    expect((await guest.req('GET', '/api/invitations')).data).toHaveLength(0);

    // cancelar de nuevo → 404
    const repeat = await owner.req('DELETE', `/api/events/${eventId}/invitations/${invitationId}`);
    expect(repeat.status).toBe(404);

    // se puede volver a invitar
    const reenvio = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: guest.username },
    });
    expect(reenvio.status).toBe(201);
  });

  test('invitar usuario inexistente → 404; sin sesión o ajeno → 404', async () => {
    const owner = await newUser('inv9');
    const outsider = await newUser('out9');
    const eventId = await newEvent(owner, 'evento-inv9');

    const noExiste = await owner.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: 'no_existe_xyz' },
    });
    expect(noExiste.status).toBe(404);
    expect(noExiste.data.code).toBe('NOT_FOUND');

    const sinSesion = await new Client().req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: outsider.username },
    });
    expect(sinSesion.status).toBe(401);

    const ajeno = await outsider.req('POST', `/api/events/${eventId}/invitations`, {
      json: { query: outsider.username },
    });
    expect(ajeno.status).toBe(404);
    expect(ajeno.data.code).toBe('NOT_FOUND');
  });
});

describe('búsqueda de usuarios por iniciales', () => {
  test('devuelve todos los usuarios que coinciden con el prefijo y excluye al que busca', async () => {
    const a = await newUser('zq');
    const b = await newUser('zq');
    const otro = await newUser('otro');

    const r = await otro.req('GET', '/api/users/search?q=zq');
    expect(r.status).toBe(200);
    const nombres = (r.data as { username: string }[]).map((x) => x.username);
    expect(nombres).toContain(a.username);
    expect(nombres).toContain(b.username);
    expect(nombres).not.toContain(otro.username);

    // el propio usuario no aparece en sus resultados
    const self = await a.req('GET', `/api/users/search?q=${a.username.slice(0, 5)}`);
    expect((self.data as { username: string }[]).map((x) => x.username)).not.toContain(a.username);
  });
});

describe('imagen de grupo (imagen opcional del evento)', () => {
  test('subir, ver y proteger la imagen del evento', async () => {
    const owner = await newUser('img');
    const otros = await newUser('img2');
    const eventId = await newEvent(owner, 'grupo-con-foto');

    // sin imagen aún
    const vacio = await owner.req('GET', `/api/events/${eventId}`);
    expect(vacio.data.hasImage).toBe(false);

    // subir imagen válida
    const up = await owner.req('POST', `/api/events/${eventId}/image`, { form: pngForm('image', 'grupo.png') });
    expect(up.status).toBe(201);
    expect(up.data.hasImage).toBe(true);

    const det = await owner.req('GET', `/api/events/${eventId}`);
    expect(det.data.hasImage).toBe(true);
    const lista = await owner.req('GET', '/api/events');
    expect(lista.data.find((e: any) => e.id === eventId).hasImage).toBe(true);

    // se sirve con los bytes exactos
    const img = await owner.req('GET', `/api/events/${eventId}/image`, { raw: true });
    expect(img.status).toBe(200);
    expect(img.buf?.length).toBe(PNG_1X1.length);
    expect(img.buf?.subarray(0, 8)).toEqual(PNG_1X1.subarray(0, 8));

    // sin ser participante → 404
    const ajeno = await otros.req('GET', `/api/events/${eventId}/image`);
    expect(ajeno.status).toBe(404);
    const subirAjeno = await otros.req('POST', `/api/events/${eventId}/image`, { form: pngForm('image', 'x.png') });
    expect(subirAjeno.status).toBe(404);

    // archivo que no es imagen → 400 VALIDATION
    const malo = new FormData();
    malo.append('image', new Blob([Buffer.from('hola mundo')], { type: 'text/plain' }), 'x.txt');
    const noImagen = await owner.req('POST', `/api/events/${eventId}/image`, { form: malo });
    expect(noImagen.status).toBe(400);
    expect(noImagen.data.code).toBe('VALIDATION');

    // sin archivo → 400
    const sinArchivo = new FormData();
    const r = await owner.req('POST', `/api/events/${eventId}/image`, { form: sinArchivo });
    expect(r.status).toBe(400);
  });
});

describe('OCR: extracción, idempotencia y fallo (RF-01, EC-09)', () => {
  test('la subida responde de inmediato y el worker extrae los datos', async () => {
    const payer = await newUser('ocr');
    const eventId = await newEvent(payer, 'cena-ocr');
    const t0 = Date.now();
    const up = await payer.req('POST', `/api/events/${eventId}/receipts`, { form: pngForm('image', 'r.png') });
    const elapsed = Date.now() - t0;
    expect(up.status).toBe(201);
    expect(up.data.status).toBe('PROCESANDO');
    expect(elapsed).toBeLessThan(2000); // RNF-07: responde sin esperar al OCR

    await processor.drain();
    const detail = await payer.req('GET', `/api/receipts/${up.data.id}`);
    expect(detail.data.status).toBe('EXTRAÍDO');
    expect(detail.data.totalCents).toBe(5750);
    expect(detail.data.items).toHaveLength(2);
    expect(detail.data.description).toBe('Restaurante El Sabor');
    expect(detail.data.failReason).toBeNull();

    const img = await payer.req('GET', `/api/receipts/${up.data.id}/image`, { raw: true });
    expect(img.status).toBe(200);
    expect(img.buf!.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  test('subir la misma imagen otra vez devuelve el comprobante existente', async () => {
    const payer = await newUser('dup');
    const eventId = await newEvent(payer, 'dup-img');
    const first = await payer.req('POST', `/api/events/${eventId}/receipts`, { form: pngForm('image', 'a.png') });
    const second = await payer.req('POST', `/api/events/${eventId}/receipts`, { form: pngForm('image', 'a.png') });
    expect(second.status).toBe(201);
    expect(second.data.existing).toBe(true);
    expect(second.data.id).toBe(first.data.id);
  });

  test('OCR caído → FALLIDO con motivo; reintento lo recupera; el resto de la API sigue viva', async () => {
    process.env.FAKE_OCR_MODE = 'fail';
    try {
      const payer = await newUser('fal');
      const eventId = await newEvent(payer, 'ocr-fallido');
      const up = await payer.req('POST', `/api/events/${eventId}/receipts`, { form: pngForm('image', 'f.png') });
      await processor.drain();
      const detail = await payer.req('GET', `/api/receipts/${up.data.id}`);
      expect(detail.data.status).toBe('FALLIDO');
      expect(String(detail.data.failReason)).toContain('intentos');

      expect((await payer.req('GET', '/api/events')).status).toBe(200);
      expect((await payer.req('GET', '/api/pending')).status).toBe(200);
    } finally {
      process.env.FAKE_OCR_MODE = 'success';
    }

    const payer = await newUser('rec');
    process.env.FAKE_OCR_MODE = 'fail';
    const eventId = await newEvent(payer, 'ocr-reintento');
    const up = await payer.req('POST', `/api/events/${eventId}/receipts`, { form: pngForm('image', 'g.png') });
    await processor.drain();
    const fallido = await payer.req('GET', `/api/receipts/${up.data.id}`);
    expect(fallido.data.status).toBe('FALLIDO');
    process.env.FAKE_OCR_MODE = 'success';
    await new Promise((r) => setTimeout(r, 300)); // deja pasar el reset del breaker
    const retry = await payer.req('POST', `/api/receipts/${up.data.id}/retry`);
    expect(retry.status).toBe(201);
    await processor.drain();
    const after = await payer.req('GET', `/api/receipts/${up.data.id}`);
    expect(after.data.status).toBe('EXTRAÍDO');
  });
});

describe('reparto (RF-16, RF-17, EC-05)', () => {
  test('S/ 100 entre 3 → 33.34 / 33.33 / 33.33 y reconfirmar no duplica deudas', async () => {
    const payer = await newUser('tri');
    const b = await newUser('tri');
    const c = await newUser('tri');
    const eventId = await newEvent(payer, 'cien');
    await addMembers(eventId, payer, [b, c]);
    const parts = await participantsOf(eventId, payer);
    const ids = parts.map((p) => p.id);
    const receiptId = await manualReceipt(eventId, payer, { total: '100.00' });
    await splitEquitable(receiptId, payer, ids);
    const info = await confirmReceipt(receiptId, payer);

    expect(info.parts.map((p) => p.cents).sort((x, y) => x - y)).toEqual([3333, 3333, 3334]);
    expect(info.parts.reduce((acc, p) => acc + p.cents, 0)).toBe(10000);
    expect(info.debts).toHaveLength(2);

    const again = await payer.req('POST', `/api/receipts/${receiptId}/confirm`);
    expect(again.status).toBe(409);
    const rows: any[] = await ds.query('SELECT count(*)::int AS n FROM debts WHERE receipt_id = $1', [receiptId]);
    expect(rows[0].n).toBe(2);
  });

  test('BY_ITEM: Chaufa ×2 a S/ 15 + Gaseosa ×1 a S/ 6 → Mateo 15.00, Lucía 21.00', async () => {
    const payer = await newUser('cha');
    const mateo = await newUser('mat');
    const lucia = await newUser('luc');
    const eventId = await newEvent(payer, 'almuerzo');
    await addMembers(eventId, payer, [mateo, lucia]);
    const members = await participantsOf(eventId, payer);
    const mateoId = members.find((p) => p.username === mateo.username)!.id;
    const luciaId = members.find((p) => p.username === lucia.username)!.id;

    const receiptId = await manualReceipt(eventId, payer, {
      total: '36.00',
      items: [
        { description: 'Chaufa', quantity: 2, unitPrice: '15.00' },
        { description: 'Gaseosa', quantity: 1, unitPrice: '6.00' },
      ],
    });

    const detalle = await payer.req('GET', `/api/receipts/${receiptId}`);
    const items = detalle.data.items as { id: string; description: string }[];
    const chaufa = items.find((i) => i.description === 'Chaufa')!;
    const gaseosa = items.find((i) => i.description === 'Gaseosa')!;

    const incompleto = await payer.req('POST', `/api/receipts/${receiptId}/split`, {
      json: { mode: 'BY_ITEM', assignments: [{ itemId: chaufa.id, unitIndex: 1, userId: mateoId }] },
    });
    expect(incompleto.status).toBe(201);
    const confIr = await payer.req('POST', `/api/receipts/${receiptId}/confirm`);
    expect(confIr.status).toBe(400);
    expect(confIr.data.code).toBe('VALIDATION');
    expect(String(confIr.data.message)).toContain('Falta asignar');

    const split = await payer.req('POST', `/api/receipts/${receiptId}/split`, {
      json: {
        mode: 'BY_ITEM',
        assignments: [
          { itemId: chaufa.id, unitIndex: 1, userId: mateoId },
          { itemId: chaufa.id, unitIndex: 2, userId: luciaId },
          { itemId: gaseosa.id, unitIndex: 1, userId: luciaId },
        ],
      },
    });
    expect(split.status).toBe(201);

    const info = await confirmReceipt(receiptId, payer);
    expect(info.debts).toHaveLength(2);
    expect(info.debts.find((d) => d.debtor === 'mat' || d.debtor === mateo.username)!.amountCents).toBe(1500);
    expect(info.debts.find((d) => d.debtor === lucia.username)!.amountCents).toBe(2100);
  });
});

describe('concurrencia e idempotencia de pagos (EC-01, EC-02, EC-03, EC-04, RNF-01)', () => {
  test('EC-01: pagos de S/ 60 y S/ 70 simultáneos sobre S/ 100 → exactamente uno gana (100 rondas)', async () => {
    for (let round = 0; round < 100; round++) {
      const creditor = await newUser('e1');
      const debtor = await newUser('e1');
      const { debtId } = await makeDebt(creditor, debtor, 1000);

      const [a, b] = await Promise.all([
        pay(debtor, debtId, '6.00'),
        pay(debtor, debtId, '7.00'),
      ]);
      expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);

      const row = await debtRow(debtId);
      expect(row.amount).toBe(1000);
      expect([600, 700]).toContain(row.reserved);
      expect(row.confirmed + row.reserved).toBeLessThanOrEqual(row.amount); // RNF-01
    }
  });

  test('EC-02: 50 pagos simultáneos de S/ 10 sobre S/ 100 → ≤10 aceptados, p95 ≤ 3 s, 0 violaciones (10 rondas)', async () => {
    const creditor = await newUser('e2');
    const debtor = await newUser('e2');
    const latencies: number[] = [];
    let totalAceptados = 0;

    for (let round = 0; round < 10; round++) {
      const { debtId } = await makeDebt(creditor, debtor, 1000);
      const results = await Promise.all(
        Array.from({ length: 50 }, async (_, i) => {
          // cada cliente genera su propia Idempotency-Key: son 50 intentos distintos
          const r = await pay(debtor, debtId, '10.00', { key: `e2-${round}-${i}` });
          latencies.push(r.ms);
          return r;
        }),
      );
      const aceptados = results.filter((r) => r.status === 201);
      const conflictos = results.filter((r) => r.status === 409);
      expect(results.filter((r) => r.status !== 201 && r.status !== 409)).toEqual([]);
      expect(aceptados.length).toBeLessThanOrEqual(10);
      expect(aceptados.length + conflictos.length).toBe(50);

      const row = await debtRow(debtId);
      expect(row.confirmed + row.reserved).toBeLessThanOrEqual(row.amount); // RNF-01
      expect(row.reserved).toBe(aceptados.length * 1000);
      totalAceptados += aceptados.length;
    }

    latencies.sort((x, y) => x - y);
    const p95 = latencies[Math.ceil(0.95 * latencies.length) - 1];
    expect(p95).toBeLessThanOrEqual(3000);
    expect(totalAceptados).toBeGreaterThan(0);
  });

  test('EC-03: doble envío con la misma Idempotency-Key persiste un solo pago', async () => {
    const creditor = await newUser('e3');
    const debtor = await newUser('e3');
    const { debtId } = await makeDebt(creditor, debtor, 1000);
    const body = { amount: '5.00', method: 'EFECTIVO' };

    const a = await debtor.req('POST', `/api/debts/${debtId}/payments`, {
      json: body,
      headers: { 'idempotency-key': 'ec03-clave' },
    });
    const b = await debtor.req('POST', `/api/debts/${debtId}/payments`, {
      json: body,
      headers: { 'idempotency-key': 'ec03-clave' },
    });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(b.data.existing).toBe(true);
    expect(b.data.id).toBe(a.data.id);

    let rows: any[] = await ds.query('SELECT count(*)::int AS n FROM payments WHERE debt_id = $1', [debtId]);
    expect(rows[0].n).toBe(1);
    expect((await debtRow(debtId)).reserved).toBe(500);

    // sin header: la clave derivada del cuerpo deduplica igual
    const c = await pay(debtor, debtId, '3.00');
    const d = await pay(debtor, debtId, '3.00');
    expect(c.status).toBe(201);
    expect(d.data.id).toBe(c.data.id);
    rows = await ds.query('SELECT count(*)::int AS n FROM payments WHERE debt_id = $1', [debtId]);
    expect(rows[0].n).toBe(2);
    expect((await debtRow(debtId)).reserved).toBe(800);
  });

  test('EC-04: confirmar y cancelar a la vez → solo una acción prevalece (100 rondas)', async () => {
    const creditor = await newUser('e4');
    const debtor = await newUser('e4');

    for (let round = 0; round < 100; round++) {
      const { debtId } = await makeDebt(creditor, debtor, 1000);
      const p = await pay(debtor, debtId, '10.00');
      expect(p.status).toBe(201);
      const paymentId = p.data.id;

      const [conf, canc] = await Promise.all([
        creditor.req('POST', `/api/payments/${paymentId}/confirm`),
        debtor.req('POST', `/api/payments/${paymentId}/cancel`),
      ]);
      expect([conf.status, canc.status].sort((x, y) => x - y)).toEqual([201, 409]);

      const payRows: any[] = await ds.query('SELECT status FROM payments WHERE id = $1', [paymentId]);
      const row = await debtRow(debtId);
      if (payRows[0].status === 'CONFIRMADO') {
        expect(row.confirmed).toBe(1000);
        expect(row.reserved).toBe(0);
      } else {
        expect(payRows[0].status).toBe('CANCELADO');
        expect(row.confirmed).toBe(0);
        expect(row.reserved).toBe(0);
      }
      expect(row.confirmed + row.reserved).toBeLessThanOrEqual(row.amount);
    }
  });
});

describe('flujo de pagos: rechazo, evidencia e historial (RF-18, RF-22, RF-23)', () => {
  test('RF-22: rechazar libera la reserva y la deuda vuelve a estar disponible', async () => {
    const creditor = await newUser('rej');
    const debtor = await newUser('rej');
    const { debtId } = await makeDebt(creditor, debtor, 1000);

    const p = await pay(debtor, debtId, '6.00');
    expect(p.status).toBe(201);
    expect((await debtRow(debtId)).reserved).toBe(600);

    const sinMotivo = await creditor.req('POST', `/api/payments/${p.data.id}/reject`, { json: {} });
    expect(sinMotivo.status).toBe(400);
    expect(sinMotivo.data.code).toBe('VALIDATION');

    const rechazo = await creditor.req('POST', `/api/payments/${p.data.id}/reject`, {
      json: { reason: 'no reconozco este cargo' },
    });
    expect(rechazo.status).toBe(201);
    const row = await debtRow(debtId);
    expect(row.reserved).toBe(0);
    expect(row.confirmed).toBe(0);

    const otro = await pay(debtor, debtId, '10.00');
    expect(otro.status).toBe(201);
    expect((await debtRow(debtId)).reserved).toBe(1000);
  });

  test('RF-23: la evidencia la ven solo acreedor y deudor; YAPE exige imagen', async () => {
    const creditor = await newUser('ev');
    const debtor = await newUser('ev');
    const outsider = await newUser('ev');
    const eventId = await newEvent(creditor, 'evento-evidencia');
    await addMembers(eventId, creditor, [debtor, outsider]);
    const parts = await participantsOf(eventId, creditor);
    const payerId = parts.find((p) => p.username === creditor.username)!.id;
    const debtorId = parts.find((p) => p.username === debtor.username)!.id;
    const receiptId = await manualReceipt(eventId, creditor, { total: '20.00' });
    await splitEquitable(receiptId, creditor, [payerId, debtorId]);
    await confirmReceipt(receiptId, creditor);
    const rows: any[] = await ds.query('SELECT id FROM debts WHERE receipt_id = $1', [receiptId]);
    const debtId = rows[0].id as string;

    const sinImagen = await debtor.req('POST', `/api/debts/${debtId}/payments`, {
      json: { amount: '10.00', method: 'YAPE' },
    });
    expect(sinImagen.status).toBe(400);
    expect(sinImagen.data.code).toBe('VALIDATION');
    const sinCambios = await debtRow(debtId);
    expect(sinCambios.reserved).toBe(0);
    expect(sinCambios.confirmed).toBe(0);

    const form = pngForm('evidence', 'yape.png');
    form.append('amount', '10.00');
    form.append('method', 'YAPE');
    form.append('reference', 'YAPE12345');
    const conImagen = await debtor.req('POST', `/api/debts/${debtId}/payments`, { form });
    expect(conImagen.status).toBe(201);

    const url = `/api/payments/${conImagen.data.id}/evidence`;
    expect((await creditor.req('GET', url)).status).toBe(200);
    expect((await debtor.req('GET', url)).status).toBe(200);
    const ajeno = await outsider.req('GET', url);
    expect(ajeno.status).toBe(404);
    expect(ajeno.data.code).toBe('NOT_FOUND');

    const historial = await creditor.req('GET', `/api/debts/${debtId}`);
    expect(historial.status).toBe(200);
    expect(historial.data.payments).toHaveLength(1);
    expect(historial.data.payments[0].hasEvidence).toBe(true);
    expect(historial.data.availableCents).toBe(0);
  });
});

describe('ciclo de vida del pago y consultas (RF-19, RF-20, RF-21, RF-24..RF-26, EC-23)', () => {
  test('cancelar, listar pendientes, confirmar y consultar deudas', async () => {
    const creditor = await newUser('cic');
    const debtor = await newUser('cic');
    const { debtId } = await makeDebt(creditor, debtor, 1000);

    const p1 = await pay(debtor, debtId, '4.00');
    expect(p1.status).toBe(201);

    // RF-20: el acreedor ve el pago pendiente; el deudor no
    const pendientes = await creditor.req('GET', '/api/payments/pending');
    expect(pendientes.status).toBe(200);
    expect(
      (pendientes.data as any[]).some((p) => p.id === p1.data.id && p.debtor === debtor.username),
    ).toBe(true);
    const delDeudor = await debtor.req('GET', '/api/payments/pending');
    expect((delDeudor.data as any[]).some((p) => p.id === p1.data.id)).toBe(false);

    // RF-28: la bandeja del acreedor muestra el pago por confirmar; la del deudor está vacía
    const bandeja = await creditor.req('GET', '/api/pending');
    expect(bandeja.data.count).toBeGreaterThanOrEqual(1);
    expect(
      (bandeja.data.items as any[]).some(
        (i) => i.type === 'PAYMENT_TO_CONFIRM' && i.paymentId === p1.data.id,
      ),
    ).toBe(true);
    const bandejaDeudor = await debtor.req('GET', '/api/pending');
    expect(bandejaDeudor.data.count).toBe(0);

    // RF-19: el deudor cancela; cancelar otra vez es conflicto
    const cancel = await debtor.req('POST', `/api/payments/${p1.data.id}/cancel`);
    expect(cancel.status).toBe(201);
    const cancel2 = await debtor.req('POST', `/api/payments/${p1.data.id}/cancel`);
    expect(cancel2.status).toBe(409);
    expect((await debtRow(debtId)).reserved).toBe(0);

    // RF-21: solo el acreedor confirma; doble confirmación es conflicto
    const p2 = await pay(debtor, debtId, '3.00');
    expect(p2.status).toBe(201);
    const porDeudor = await debtor.req('POST', `/api/payments/${p2.data.id}/confirm`);
    expect(porDeudor.status).toBe(404);
    const conf = await creditor.req('POST', `/api/payments/${p2.data.id}/confirm`);
    expect(conf.status).toBe(201);
    const conf2 = await creditor.req('POST', `/api/payments/${p2.data.id}/confirm`);
    expect(conf2.status).toBe(409);
    const trasConfirmar = await debtRow(debtId);
    expect(trasConfirmar.confirmed).toBe(300);
    expect(trasConfirmar.reserved).toBe(0);

    // RF-24: el deudor ve lo que debe
    const debo = await debtor.req('GET', '/api/debts?direction=owing');
    const miDeuda = (debo.data as any[]).find((d) => d.debtId === debtId);
    expect(miDeuda).toBeDefined();
    expect(miDeuda.creditor).toBe(creditor.username);
    expect(miDeuda.amountCents).toBe(1000);
    expect(miDeuda.pendingCents).toBe(700);
    expect(miDeuda.availableCents).toBe(700);

    // RF-25: el acreedor ve lo que le deben
    const meDeben = await creditor.req('GET', '/api/debts?direction=owed');
    const suDeuda = (meDeben.data as any[]).find((d) => d.debtId === debtId);
    expect(suDeuda).toBeDefined();
    expect(suDeuda.debtor).toBe(debtor.username);
    expect(suDeuda.pendingCents).toBe(700);

    // RF-26: pagos confirmados + saldo pendiente = monto total
    const hist = await creditor.req('GET', `/api/debts/${debtId}`);
    expect(hist.data.confirmedCents + hist.data.pendingCents).toBe(hist.data.amountCents);

    // EC-23: la auditoría reconstruye quién registró y quién confirmó
    const credRows: any[] = await ds.query('SELECT id FROM users WHERE username = $1', [creditor.username]);
    const debRows: any[] = await ds.query('SELECT id FROM users WHERE username = $1', [debtor.username]);
    const aud: any[] = await ds.query(
      'SELECT operation, user_id, result FROM audit_logs WHERE resource = $1 ORDER BY created_at',
      [`payment:${p2.data.id}`],
    );
    expect(aud.map((a) => a.operation)).toEqual(
      expect.arrayContaining(['payment.create', 'payment.confirmado']),
    );
    expect(aud.find((a) => a.operation === 'payment.create').user_id).toBe(debRows[0].id);
    expect(aud.find((a) => a.operation === 'payment.confirmado').user_id).toBe(credRows[0].id);
    expect(aud.every((a) => a.result === 'ok')).toBe(true);
  });

  test('RF-27: balance del evento — Lucía debe S/ 100 a Mateo y Andrés solo ve los totales', async () => {
    const mateo = await newUser('mat');
    const lucia = await newUser('luc');
    const andres = await newUser('and');
    const eventId = await newEvent(mateo, 'balance');
    await addMembers(eventId, mateo, [lucia, andres]);
    const members = await participantsOf(eventId, mateo);
    const mateoId = members.find((p) => p.username === mateo.username)!.id;
    const luciaId = members.find((p) => p.username === lucia.username)!.id;

    const receiptId = await manualReceipt(eventId, mateo, { total: '200.00' });
    await splitEquitable(receiptId, mateo, [mateoId, luciaId]);
    const info = await confirmReceipt(receiptId, mateo);
    expect(info.debts).toHaveLength(1);
    expect(info.debts[0].amountCents).toBe(10000);

    const rows: any[] = await ds.query('SELECT id FROM debts WHERE receipt_id = $1', [receiptId]);
    const debtId = rows[0].id as string;

    // Lucía registra un pago pendiente (queda "en revisión")
    const pago = await pay(lucia, debtId, '10.00');
    expect(pago.status).toBe(201);

    const bal = await andres.req('GET', `/api/events/${eventId}/balance`);
    expect(bal.status).toBe(200);
    const lista = bal.data.participants as any[];
    const l = lista.find((p) => p.username === lucia.username);
    const m = lista.find((p) => p.username === mateo.username);
    const a = lista.find((p) => p.username === andres.username);
    expect(l.debtCents).toBe(10000);
    expect(l.receivedCents).toBe(0);
    expect(l.netCents).toBe(-10000);
    expect(l.underReviewCents).toBe(1000);
    expect(m.receivedCents).toBe(10000);
    expect(m.netCents).toBe(10000);
    expect(m.paidCents).toBe(20000);
    expect(a.debtCents).toBe(0);
    expect(a.receivedCents).toBe(0);
    expect(bal.data.totals).toEqual({
      spentCents: 20000,
      settledCents: 0,
      underReviewCents: 1000,
      outstandingCents: 10000,
    });

    // Andrés no puede abrir el historial ni la evidencia de esa deuda
    expect((await andres.req('GET', `/api/debts/${debtId}`)).status).toBe(404);
    expect((await andres.req('GET', `/api/payments/${pago.data.id}/evidence`)).status).toBe(404);
  });
});

describe('integridad de la base de datos (EC-06, EC-07)', () => {
  test('EC-06: si falla la creación de la segunda deuda, toda la confirmación se revierte', async () => {
    const creditor = await newUser('e60');
    const b1 = await newUser('e60');
    const b2 = await newUser('e60');
    const eventId = await newEvent(creditor, 'ec06');
    await addMembers(eventId, creditor, [b1, b2]);
    const members = await participantsOf(eventId, creditor);
    const payerId = members.find((p) => p.username === creditor.username)!.id;
    const b1Id = members.find((p) => p.username === b1.username)!.id;
    const b2Id = members.find((p) => p.username === b2.username)!.id;
    const receiptId = await manualReceipt(eventId, creditor, { total: '30.00' });
    await splitEquitable(receiptId, creditor, [payerId, b1Id, b2Id]);

    // inyección de falla: la segunda inserción de deuda siempre explota
    await ds.query(
      `CREATE OR REPLACE FUNCTION sv_fail_second_debt() RETURNS trigger AS $fn$
      BEGIN
        IF (SELECT count(*) FROM debts WHERE receipt_id = NEW.receipt_id) >= 1 THEN
          RAISE EXCEPTION 'fallo inyectado de prueba';
        END IF;
        RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql`,
    );
    await ds.query(
      `CREATE TRIGGER sv_fail_second BEFORE INSERT ON debts FOR EACH ROW EXECUTE FUNCTION sv_fail_second_debt()`,
    );
    try {
      const r = await creditor.req('POST', `/api/receipts/${receiptId}/confirm`);
      expect(r.status).toBe(500);
    } finally {
      await ds.query(`DROP TRIGGER sv_fail_second ON debts`);
      await ds.query(`DROP FUNCTION sv_fail_second_debt()`);
    }

    // 0 deudas parciales; el comprobante sigue EXTRAÍDO
    const cnt: any[] = await ds.query('SELECT count(*)::int AS n FROM debts WHERE receipt_id = $1', [receiptId]);
    expect(cnt[0].n).toBe(0);
    const det = await creditor.req('GET', `/api/receipts/${receiptId}`);
    expect(det.data.status).toBe('EXTRAÍDO');

    // la confirmación posterior se completa correctamente
    const ok = await creditor.req('POST', `/api/receipts/${receiptId}/confirm`);
    expect(ok.status).toBe(201);
    expect(ok.data.generated).toBe(2);
  });

  test('EC-07: la base de datos rechaza el 100 % de las inserciones inválidas', async () => {
    const a = await newUser('e70');
    const b = await newUser('e70');
    const eventId = await newEvent(a, 'ec07');
    await addMembers(eventId, a, [b]);
    const members = await participantsOf(eventId, a);
    const aId = members.find((p) => p.username === a.username)!.id;
    const bId = members.find((p) => p.username === b.username)!.id;
    const receiptId = await manualReceipt(eventId, a, { total: '10.00' });

    // participación duplicada → violación de clave primaria
    await expect(
      ds.query('INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)', [eventId, bId]),
    ).rejects.toMatchObject({ code: '23505' });

    // deuda con monto negativo → check violation
    await expect(
      ds.query(
        'INSERT INTO debts (receipt_id, event_id, debtor_id, creditor_id, amount_cents) VALUES ($1, $2, $3, $4, -5)',
        [receiptId, eventId, bId, aId],
      ),
    ).rejects.toMatchObject({ code: '23514' });

    // total de comprobante negativo → check violation
    await expect(
      ds.query('UPDATE receipts SET total_cents = -1 WHERE id = $1', [receiptId]),
    ).rejects.toMatchObject({ code: '23514' });

    // deuda válida primero, luego confirmado que excede el monto → check violation
    await ds.query(
      'INSERT INTO debts (receipt_id, event_id, debtor_id, creditor_id, amount_cents) VALUES ($1, $2, $3, $4, 1000)',
      [receiptId, eventId, bId, aId],
    );
    await expect(
      ds.query('UPDATE debts SET confirmed_cents = 1001 WHERE receipt_id = $1', [receiptId]),
    ).rejects.toMatchObject({ code: '23514' });

    // pago con monto negativo → check violation
    await expect(
      ds.query(
        `INSERT INTO payments (debt_id, payer_id, amount_cents, method, status, idempotency_key)
         SELECT id, $2, -99, 'EFECTIVO', 'PENDIENTE', 'ec07-key' FROM debts WHERE receipt_id = $1`,
        [receiptId, bId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('resiliencia del OCR (EC-08..EC-12)', () => {
  test('EC-08: OCR lento — subida ≤ 2 s y reintentos acotados (1 + 3)', async () => {
    process.env.FAKE_OCR_MODE = 'slow';
    process.env.FAKE_OCR_DELAY_MS = '5000';
    process.env.OCR_MAX_ATTEMPTS = '4';
    process.env.OCR_BACKOFF_MS = '0,0,0';
    try {
      const payer = await newUser('e80');
      const eventId = await newEvent(payer, 'ocr-lento');
      const t0 = Date.now();
      const up = await payer.req('POST', `/api/events/${eventId}/receipts`, {
        form: pngForm('image', 'lento.png', 'ec08'),
      });
      expect(up.status).toBe(201);
      expect(up.data.status).toBe('PROCESANDO');
      expect(Date.now() - t0).toBeLessThan(2000);

      await processor.drain(60);
      const det = await payer.req('GET', `/api/receipts/${up.data.id}`);
      expect(det.data.status).toBe('FALLIDO');
      expect(String(det.data.failReason)).toContain('intentos');

      const jobs: any[] = await ds.query('SELECT attempts, last_error FROM receipt_jobs WHERE receipt_id = $1', [
        up.data.id,
      ]);
      expect(jobs).toHaveLength(1);
      expect(Number(jobs[0].attempts)).toBe(4); // 1 intento + 3 reintentos como máximo
      expect(String(jobs[0].last_error)).toMatch(/timeout|circuito/i);
    } finally {
      process.env.FAKE_OCR_MODE = 'success';
      process.env.FAKE_OCR_DELAY_MS = '60000';
      process.env.OCR_MAX_ATTEMPTS = '1';
      process.env.OCR_BACKOFF_MS = '0';
    }
  });

  test('EC-09: 20 comprobantes con el OCR caído → todos FALLIDO y las demás operaciones al 100 %', async () => {
    process.env.FAKE_OCR_MODE = 'fail';
    process.env.OCR_MAX_ATTEMPTS = '1';
    try {
      const payer = await newUser('e90');
      const eventId = await newEvent(payer, 'ocr-caido');
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const up = await payer.req('POST', `/api/events/${eventId}/receipts`, {
          form: pngForm('image', `c${i}.png`, `ec09-${i}`),
        });
        expect(up.status).toBe(201);
        ids.push(up.data.id);
      }
      await processor.drain(100);

      for (const id of ids) {
        const d = await payer.req('GET', `/api/receipts/${id}`);
        expect(d.data.status).toBe('FALLIDO');
        expect(d.data.failReason).toBeTruthy();
      }
      const stuck: any[] = await ds.query(`SELECT count(*)::int AS n FROM receipts WHERE status = 'PROCESANDO'`);
      expect(stuck[0].n).toBe(0);
      const jobs: any[] = await ds.query(
        `SELECT count(*)::int AS n FROM receipt_jobs
         WHERE status = 'FAILED' AND last_error IS NOT NULL AND correlation_id IS NOT NULL`,
      );
      expect(Number(jobs[0].n)).toBeGreaterThanOrEqual(20);

      // operaciones no relacionadas con el OCR siguen respondiendo con éxito
      const ops = await Promise.all([
        payer.req('GET', '/api/events'),
        payer.req('GET', '/api/debts?direction=owing'),
        payer.req('GET', '/api/pending'),
        payer.req('POST', '/api/auth/login', { json: { identifier: payer.username, password: PASS } }),
      ]);
      for (const r of ops) expect(r.status).toBeLessThan(300);
    } finally {
      process.env.FAKE_OCR_MODE = 'success';
      process.env.OCR_MAX_ATTEMPTS = '1';
    }
  });

  test('EC-10: respuesta corrupta del OCR se rechaza sin persistir datos', async () => {
    process.env.FAKE_OCR_MODE = 'corrupt';
    try {
      const payer = await newUser('e10');
      const eventId = await newEvent(payer, 'ocr-corrupto');
      const up = await payer.req('POST', `/api/events/${eventId}/receipts`, {
        form: pngForm('image', 'corrupto.png', 'ec10'),
      });
      await processor.drain();
      const det = await payer.req('GET', `/api/receipts/${up.data.id}`);
      expect(det.data.status).toBe('FALLIDO');
      expect(String(det.data.failReason)).toContain('monto total positivo');
      expect(det.data.totalCents).toBe(0);
      expect(det.data.items).toHaveLength(0);
      expect(det.data.description).toBeNull();
    } finally {
      process.env.FAKE_OCR_MODE = 'success';
    }
  });

  test('EC-11/EC-12: reanudar una tarea interrupida y reprocesar no duplican datos', async () => {
    const payer = await newUser('e12');
    const eventId = await newEvent(payer, 'reanuda');
    const up = await payer.req('POST', `/api/events/${eventId}/receipts`, {
      form: pngForm('image', 'reanuda.png', 'ec12'),
    });

    // EC-12: el worker murió dejando la tarea RUNNING con lease vencido
    await ds.query(
      `UPDATE receipt_jobs SET status = 'RUNNING', lease_owner = 'worker-caido',
       lease_expires_at = now() - interval '5 seconds' WHERE receipt_id = $1`,
      [up.data.id],
    );
    await processor.drain();

    const det = await payer.req('GET', `/api/receipts/${up.data.id}`);
    expect(det.data.status).toBe('EXTRAÍDO');
    expect(det.data.items).toHaveLength(2);

    const jobs: any[] = await ds.query('SELECT status FROM receipt_jobs WHERE receipt_id = $1', [up.data.id]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe('DONE');

    // EC-11: procesar de nuevo no cambia el resultado
    await processor.drain();
    const otraVez = await payer.req('GET', `/api/receipts/${up.data.id}`);
    expect(otraVez.data.status).toBe('EXTRAÍDO');
    expect(otraVez.data.items).toHaveLength(2);
    const items: any[] = await ds.query('SELECT count(*)::int AS n FROM receipt_items WHERE receipt_id = $1', [
      up.data.id,
    ]);
    expect(Number(items[0].n)).toBe(2);
  });
});

describe('seguridad y privacidad (EC-15, EC-17, EC-18)', () => {
  test('EC-15: archivos maliciosos rechazados y nada fuera del almacenamiento previsto', async () => {
    const payer = await newUser('e15');
    const eventId = await newEvent(payer, 'archivos');

    // (1) ejecutable renombrado como .jpg → se valida por contenido
    const exe = new FormData();
    exe.append(
      'image',
      new Blob([Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00fake')], { type: 'image/jpeg' }),
      'inocente.jpg',
    );
    const r1 = await payer.req('POST', `/api/events/${eventId}/receipts`, { form: exe });
    expect(r1.status).toBe(400);
    expect(String(r1.data.message)).toContain('no es una imagen');

    // (2) archivo de 6 MB
    const grande = Buffer.concat([PNG_1X1, Buffer.alloc(6 * 1024 * 1024, 0x41)]);
    const f2 = new FormData();
    f2.append('image', new Blob([grande], { type: 'image/png' }), 'grande.png');
    const r2 = await payer.req('POST', `/api/events/${eventId}/receipts`, { form: f2 });
    expect(r2.status).toBe(400);
    expect(String(r2.data.message)).toContain('tamaño máximo');

    // (3) nombre con ../ — el nombre de archivo lo elige el sistema
    const r3 = await payer.req('POST', `/api/events/${eventId}/receipts`, {
      form: pngForm('image', '../../../../home/user/.ssh/clave.png', 'ec15'),
    });
    expect(r3.status).toBe(201);
    await processor.drain();

    // ninguna ruta escrita contiene ..
    const files = walkFiles(imageDir);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.split(/[\\/]/)).not.toContain('..');
    }
  });

  test('EC-17: las contraseñas solo existen como hash Argon2 con sal', async () => {
    const u = await newUser('e17');
    const rows: any[] = await ds.query('SELECT password_hash FROM users WHERE username = $1', [u.username]);
    expect(String(rows[0].password_hash)).toMatch(/^\$argon2/);
    expect(String(rows[0].password_hash)).not.toContain(PASS);
    expect(String(rows[0].password_hash)).not.toContain(u.username);
  });

  test('EC-18: entradas con SQL o HTML nunca se ejecutan', async () => {
    const u = await newUser('e18');

    // username con SQL → la validación lo rechaza
    const mala = await new Client().req('POST', '/api/auth/register', {
      json: { username: "'; DROP TABLE users;--", email: 'inyeccion@split.test', password: PASS },
    });
    expect(mala.status).toBe(400);

    // nombre de evento con SQL/HTML: se almacena como texto literal
    const nombre = `'; DROP TABLE events;--<script>alert(1)</script>`;
    const ev = await u.req('POST', '/api/events', { json: { name: nombre } });
    expect(ev.status).toBe(201);
    const ver = await u.req('GET', `/api/events/${ev.data.id}`);
    expect(ver.data.name).toBe(nombre);
    expect((await u.req('GET', '/api/events')).status).toBe(200);
    const usuarios: any[] = await ds.query('SELECT count(*)::int AS n FROM users');
    expect(Number(usuarios[0].n)).toBeGreaterThan(0);

    // referencia de pago con SQL → validación de formato
    const creditor = await newUser('e18');
    const debtor = await newUser('e18');
    const { debtId } = await makeDebt(creditor, debtor, 1000);
    const ref = await debtor.req('POST', `/api/debts/${debtId}/payments`, {
      json: { amount: '1.00', method: 'EFECTIVO', reference: "REF'; DROP TABLE payments;--" },
    });
    expect(ref.status).toBe(400);
    expect(ref.data.code).toBe('VALIDATION');
  });
});

describe('rendimiento (EC-19, EC-20)', () => {
  test('EC-19: balance de 20 participantes y 200 comprobantes ≤ 1 s (p95)', async () => {
    const owner = await newUser('e19');
    const eventId = await newEvent(owner, 'evento-grande');
    const miembros: Client[] = [];
    for (let i = 0; i < 19; i++) {
      miembros.push(await newUser('e19'));
    }
    await addMembers(eventId, owner, miembros);
    expect(await participantsOf(eventId, owner)).toHaveLength(20);

    for (let i = 0; i < 200; i++) {
      const payer = i === 0 ? owner : miembros[i % 19];
      const receiptId = await manualReceipt(eventId, payer, { total: `${(i % 50) + 1}.00` });
      const s = await payer.req('POST', `/api/receipts/${receiptId}/split`, { json: { mode: 'EQUITATIVE' } });
      expect(s.status).toBe(201);
      const c = await payer.req('POST', `/api/receipts/${receiptId}/confirm`);
      expect(c.status).toBe(201);
    }

    const lat: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t0 = Date.now();
      const r = await owner.req('GET', `/api/events/${eventId}/balance`);
      lat.push(Date.now() - t0);
      expect(r.status).toBe(200);
    }
    lat.sort((x, y) => x - y);
    const p95 = lat[Math.ceil(0.95 * lat.length) - 1];
    expect(p95).toBeLessThanOrEqual(1000);
  });

  test('EC-20: 20 usuarios simultáneos con el flujo completo → p95 ≤ 1 s y 0 errores no controlados', async () => {
    const creditor = await newUser('e20');
    const debtors: Client[] = [];
    const debtIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const d = await newUser('e20');
      debtors.push(d);
      const { debtId } = await makeDebt(creditor, d, 1000);
      debtIds.push(debtId);
    }

    const lat: number[] = [];
    let noControlados = 0;
    await Promise.all(
      debtors.map(async (d, i) => {
        const r1 = await d.req('POST', `/api/debts/${debtIds[i]}/payments`, {
          json: { amount: '10.00', method: 'EFECTIVO' },
          headers: { 'idempotency-key': `ec20-${i}` },
        });
        lat.push(r1.ms);
        const r2 = await creditor.req('POST', `/api/payments/${r1.data.id}/confirm`);
        lat.push(r2.ms);
        const r3 = await d.req('GET', `/api/debts/${debtIds[i]}`);
        lat.push(r3.ms);
        const r4 = await d.req('GET', '/api/debts?direction=owing');
        lat.push(r4.ms);
        const r5 = await d.req('GET', '/api/events');
        lat.push(r5.ms);
        for (const r of [r1, r2, r3, r4, r5]) {
          if (r.status >= 500) noControlados++;
          expect(r.status).toBeLessThan(400);
        }
      }),
    );
    expect(noControlados).toBe(0);
    lat.sort((x, y) => x - y);
    const p95 = lat[Math.ceil(0.95 * lat.length) - 1];
    expect(p95).toBeLessThanOrEqual(1000);
  });
});
