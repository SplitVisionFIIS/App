# GRUPO 2

## Integrantes

| Apellidos y Nombres | Código UNI |
| :--- | :--- |
| Albornoz Azurza Gonzalo Alessandro | 20232551K |
| Vargas Ponce Luis Angel | 20231314E |
| Zamudio Sanchez Farid Paolo | 20231215G |


# SplitVision

Divide gastos entre amigos a partir de fotos de comprobantes. Este repositorio contiene
el **backend** (API + worker de OCR + PostgreSQL) y el **frontend** (`frontend/`, React +
Vite)

## Stack

| Capa | Tecnología |
| --- | --- |
| API | NestJS 11 + TypeScript, REST/JSON |
| Persistencia | PostgreSQL 16 + TypeORM (SQL nativo en las rutas críticas) |
| Procesamiento | Worker propio con colas `receipt_jobs` (lease + reintentos) |
| OCR | Local (Tesseract.js, sin servicios externos), cliente simulado o proveedor externo HTTP, tras circuit breaker (opossum) |
| Pruebas | Jest + ts-jest, Testcontainers (PostgreSQL efímero), fast-check |
| Infra | Docker Compose, npm |

## Requisitos

- Node.js ≥ 22.22 (probado con 24) y npm. Es el mínimo que exige
  `testcontainers` 12 para correr los tests; el backend y el frontend funcionan con
  versiones anteriores.
- Docker (para PostgreSQL local o `docker compose` completo) **y en ejecución para correr
  los tests** (`npm test` usa Testcontainers, que levanta un PostgreSQL efímero).
- Las dependencias se instalan **dos veces**: en la raíz (backend) y en `frontend/`.

## Puesta en marcha (paso a paso)

Sigue el orden: **base de datos → API/worker → frontend**. Cada servicio largo ocupa su
propia terminal.

```bash
# 1. Dependencias (backend y frontend)
npm install
npm install --prefix frontend

# 2. Variables de entorno (a partir de la plantilla)
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# 3. Base de datos (solo PostgreSQL 16 en Docker)
docker compose up -d postgres

# 4. API y worker OCR (una terminal cada uno; compilan y arrancan)
npm run dev                    # API    -> http://localhost:3000
npm run dev:worker             # worker OCR

# 5. Frontend (otra terminal; requiere la API en :3000)
npm run dev:fe                 # frontend -> http://localhost:5173
```

Luego abre **http://localhost:5173**. Las migraciones (`migrations/*.sql`) se aplican
automáticamente al iniciar la API y el worker, protegidas por un advisory lock de
PostgreSQL (también puedes forzarlas con `npm run migrate`).

Todo el stack contenedorizado (PostgreSQL + API + worker) en un solo comando:

```bash
docker compose up --build
```

> **OCR local:** con `OCR_PROVIDER=local` (valor por defecto en `.env.example`), la primera
> ejecución descarga los *traineddata* de Tesseract desde el CDN de `tesseract.js` si no
> encuentra la carpeta `data/tessdata/`. Para funcionar sin internet, coloca ahí los
> archivos `spa.traineddata.gz` (y `eng.traineddata.gz` si usas `spa+eng`).

## Frontend (`frontend/`)

React 19 + Vite + TypeScript, TanStack Query (polling), React Router, Tailwind CSS 4 y
Vitest + Testing Library. En desarrollo el dev server proxya `/api` a la API en
`localhost:3000` (mismo origen para las cookies; ADR-26). El fondo de login
(`frontend/public/login-fondo.jpg`) es un collage generado con fotos CC0 de StockSnap.

```bash
npm run dev:fe      # frontend -> http://localhost:5173 (ver Paso 5; requiere API en :3000)
npm run test:fe     # tests Vitest del frontend
npm run build:fe    # typecheck + build de producción
```

Estado: están **entregados** la base (cliente API con CSRF y errores
`{code,message,correlationId}`, sesión por cookie, componentes base), login/registro, el
shell de navegación (sidebar en escritorio con efecto dock, barra inferior + FAB en
móvil), eventos con **imagen de grupo**, **invitaciones** que el invitado acepta o rechaza
(nadie se agrega directo), y los flujos de **comprobantes/OCR, reparto, pagos, balance y
bandeja de pagos/deudas**.

## Pruebas

```bash
npm test          # suite completa (corre en serie; requiere Docker en ejecución)
npm run typecheck # verificación de tipos sin generar salida
```

`npm test` levanta un PostgreSQL efímero con **Testcontainers**, por lo que **Docker debe
estar corriendo**.

- `test/properties.test.ts` — propiedades del reparto de dinero con **fast-check**
  (suma exacta, determinismo, distribución equitativa, rechazos `BY_ITEM`, dinero).
- `test/api.test.ts` — pruebas E2E sobre la API real: levanta un PostgreSQL efímero con
  **Testcontainers**, aplica las migraciones, arranca la app en un puerto aleatorio y
  usa el cliente OCR **fake** (modos `success | fail | slow | corrupt` para inyectar
  fallas). Cubre identidad/CSRF/rate limit, autorización, OCR, reparto, pagos,
  idempotencia, integridad de BD (EC-06/EC-07), resiliencia (EC-08..EC-12),
  seguridad (EC-15/17/18) y rendimiento (EC-19/EC-20).

## Variables de entorno

Ver `.env.example`. Las más relevantes:

| Variable | Defecto | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | — | URL de PostgreSQL (obligatoria) |
| `PORT` | `3000` | Puerto de la API |
| `IMAGE_DIR` | `./data/images` | Directorio de imágenes (fuera de la raíz pública) |
| `SESSION_SECRET` | — | Secreto para las cookies de sesión |
| `OCR_PROVIDER` | `local` | Proveedor de OCR: `local` (Tesseract.js), `fake` (simulador sin internet) o `http` (externo) |
| `OCR_URL` | — | Endpoint del OCR externo (solo con `OCR_PROVIDER=http`) |
| `OCR_FALLBACK` | `local` | Respaldo cuando `OCR_PROVIDER=http`: `local` o `none` |
| `OCR_LANG` | `spa` | Idiomas de Tesseract (p. ej. `spa` o `spa+eng`) |
| `OCR_TESSDATA` | `./data/tessdata` | Carpeta con los *traineddata*; si no existe, se usa el CDN de tesseract.js |
| `OCR_CACHE_DIR` | `./data/tessdata-cache` | Caché de descargas de Tesseract |
| `FAKE_OCR_MODE` | `success` | Fallas simuladas: `success \| fail \| slow \| timeout \| corrupt` |
| `OCR_TIMEOUT_MS` | `10000` | Timeout por intento (también fija el timeout del breaker) |
| `OCR_MAX_ATTEMPTS` | `4` | 1 intento + reintentos |
| `OCR_BACKOFF_MS` | `2000,4000,8000` | Espera entre reintentos (ms, CSV) |
| `OCR_BREAKER_THRESHOLD` / `OCR_BREAKER_RESET_MS` | `50` / `30000` | Umbral y reset del circuit breaker |
| `JOB_POLL_MS` | `400` | Intervalo de sondeo de la cola `receipt_jobs` |
| `JOB_LEASE_S` | `60` | Lease del job (segundos) para sobrevivir caídas |
| `SESSION_HOURS` | `8` | Duración de la sesión |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW_MIN` | `5` / `10` | Rate limit de login |
| `MAX_UPLOAD_MB` | `5` | Tamaño máximo de imagen |

`OCR_PROVIDER` admite `local` (Tesseract.js, sin servicios externos), `fake` (simulador
sin internet, ideal para pruebas) o `http` (proveedor externo en `OCR_URL`, con respaldo
`local` según `OCR_FALLBACK`).

No hay secretos versionados: `.env` está en `.gitignore`.

## API

Todas las rutas cuelgan de `/api`. Las mutaciones (POST/PATCH) requieren la cookie de
sesión `sid` **y** el header `x-csrf-token` (valor de la cookie `csrf`, legible por el
cliente).

### Identidad
| Método y ruta | Descripción |
| --- | --- |
| `POST /api/auth/register` | Registra usuario (username, email, password) y crea sesión |
| `POST /api/auth/login` | Inicia sesión (`{identifier, password}`) |
| `POST /api/auth/logout` | Cierra la sesión |
| `GET /api/auth/me` | Usuario de la sesión actual |

### Eventos
| Método y ruta | Descripción |
| --- | --- |
| `GET/POST /api/events` | Lista mis eventos / crea uno |
| `GET /api/events/:id` | Detalle (nombre, participantes, invitaciones, `hasImage`) |
| `GET /api/events/:id/participants` | Lista participantes aceptados |
| `POST /api/events/:id/image` | Sube/reemplaza la imagen del grupo (campo `image`, máx. 5 MB) |
| `GET /api/events/:id/image` | Sirve la imagen del grupo (solo participantes) |
| `POST /api/events/:id/invitations` | Invita por username o correo; nadie se agrega directo |
| `DELETE /api/events/:id/invitations/:invitationId` | Cancela una invitación pendiente |
| `GET /api/users/search?q=` | Usuarios que empiezan por `q` (autocompletado) |
| `GET /api/invitations` | Mis invitaciones pendientes por aceptar/rechazar |
| `POST /api/invitations/:id/accept` | Acepta una invitación (te vuelve participante) |
| `POST /api/invitations/:id/reject` | Rechaza una invitación |
| `GET /api/events/:id/balance` | Saldos por participante y totales |

### Comprobantes
| Método y ruta | Descripción |
| --- | --- |
| `POST /api/events/:id/receipts` | Sube imagen (campo `image`); responde `PROCESANDO` |
| `POST /api/events/:id/receipts/manual` | Crea/ completa manualmente un gasto |
| `GET /api/events/:id/receipts` | Lista los comprobantes del evento |
| `GET/PATCH /api/receipts/:id` | Consulta / edición |
| `POST /api/receipts/:id/retry` | Reintenta desde `FALLIDO` |
| `GET /api/receipts/:id/image` | Sirve la imagen almacenada |

### Reparto
| Método y ruta | Descripción |
| --- | --- |
| `POST /api/receipts/:id/split` | Guarda reparto (`EQUITATIVE` o `BY_ITEM`) |
| `POST /api/receipts/:id/confirm` | Confirma y genera las deudas |

### Pagos
| Método y ruta | Descripción |
| --- | --- |
| `POST /api/debts/:id/payments` | Registra pago (acepta header `Idempotency-Key` y campo `evidence`) |
| `POST /api/payments/:id/confirm` | Confirma (solo acreedor) |
| `POST /api/payments/:id/cancel` | Cancela (solo deudor) |
| `POST /api/payments/:id/reject` | Rechaza con motivo (solo acreedor) |

### Consultas
| Método y ruta | Descripción |
| --- | --- |
| `GET /api/debts?direction=owing\|owed` | Mis deudas / me deben (filtro opcional `eventId`) |
| `GET /api/debts/:id` | Historial de pagos de una deuda |
| `GET /api/payments/pending` | Pagos por confirmar (acreedor) |
| `GET /api/payments/:id/evidence` | Evidencia de un pago |
| `GET /api/pending` | Bandeja: por confirmar, rechazados y comprobantes por revisar |

### Errores

Toda respuesta de error tiene la forma:

```json
{ "code": "VALIDATION | UNAUTHORIZED | NOT_FOUND | CONFLICT | EXTERNAL | INTERNAL",
  "message": "mensaje en español",
  "correlationId": "..." }
```

Códigos HTTP: `400` validación, `401` sin sesión/CSRF inválido, `404` no encontrado
(también cuando el recurso existe pero no te pertenece: no se revela su existencia),
`409` conflicto, `502` servicio externo (OCR), `500` error interno. El header
`x-correlation-id` (entrada) o el `correlationId` del body permiten correlacionar logs.

## Modelo de dominio (resumen)

- Todo el dinero se guarda en **centavos** (`integer`), con checks en la base de datos.
- Eventos: los miembros se integran por **invitación** (`event_invitations`,
  `PENDIENTE → ACEPTADA | RECHAZADA`; se puede reenviar tras un rechazo). Nadie agrega
  a otro de forma directa, y los invitados pendientes aún no participan del balance.
- Comprobante: `PROCESANDO → EXTRAÍDO → CONFIRMADO` o `FALLIDO`; el worker extrae datos
  con reintentos acotados y un lease para sobrevivir caídas.
- Pago: `PENDIENTE → CONFIRMADO | RECHAZADO | CANCELADO`; los pagos pendientes
  **reservan** saldo disponible y aparecen en el balance como "en revisión".
- Reparto: equitativo (con redondeo cuyo residuo se asigna de forma determinista) o por
  ítem/unidad (`BY_ITEM`); la confirmación exige el reparto completo.
- Seguridad: contraseñas con Argon2id + sal, sesiones en cookie `HttpOnly`, CSRF doble
  cookie/header, imágenes validadas por magic bytes y guardadas con nombre generado,
  rate limit de login, auditoría en `audit_logs` (quién hizo qué, con correlación).

## Estructura

```
src/
  common/        errores, filtros, tx/auditoría, dinero, sesión, correlación
  db/            entidades TypeORM y ejecutor de migraciones
  modules/
    identidad/   registro, login, sesiones
    eventos/     eventos, participantes, balance
    comprobantes/ subida, consulta, edición, almacenamiento
    reparto/     cálculo de reparto y confirmación
    pagos/       creación/resolución de pagos, evidencias
    consultas/   deudas, bandeja pendientes
    ocr/         cliente (local/fake/http), breaker y worker
migrations/      SQL versionado (schema_migrations + advisory lock)
test/            suites E2E (Testcontainers) y propiedades (fast-check)
docs/            RF.md, CU.md, ADR.md
```
