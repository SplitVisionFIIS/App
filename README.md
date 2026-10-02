# GRUPO 2 — SplitVision (App)

## Integrantes

| Apellidos y Nombres | Código UNI |
| :--- | :--- |
| Albornoz Azurza Gonzalo Alessandro | 20232551K |
| Vargas Ponce Luis Angel | 20231314E |
| Zamudio Sanchez Farid Paolo | 20231215G |

Prototipo funcional v1.0 de **SplitVision** (Construcción de Software II — SW707).
La documentación oficial vive en [`../Docs/`](../Docs/).

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Docker (para levantar PostgreSQL 16 con `docker compose`)

## Puesta en marcha

```bash
npm install                # instala dependencias y genera el cliente Prisma (postinstall)
cp .env.example server/.env   # Windows: copy .env.example server\.env
npm run db:up              # levanta PostgreSQL 16 en el puerto 5433
npm run setup              # prisma generate + db push + seed
npm run dev                # API (:3000) + worker OCR + web (:5173)
```

La interfaz queda en `http://localhost:5173` y la API en `http://localhost:3000/api/v1`.

Usuarios del seed: `mateo`, `lucia`, `andres` (contraseña: `Password123`).

## Pruebas

```bash
npm test        # motor de division (unitarias) + flujo completo con concurrencia (integracion)
npm run typecheck
```

Las pruebas de integración usan la `DATABASE_URL` configurada y crean/borran datos propios:
apúntalas a una **base de datos de pruebas**, no a la de desarrollo.

## Estructura

```
shared/    schemas Zod compartidos, constantes y dinero en centavos
server/    API Express + worker (pg-boss) + motor de division
  src/division/engine.ts     reparto equitativo y por items (puro, con contratos)
  src/deudas/service.ts      pagos transaccionales con SELECT ... FOR UPDATE (RF5)
  src/comprobantes/          carga, extraccion OCR y verificacion
  src/providers/ocr/         adaptador OCR: mock | tesseract (gratuito)
  test/                      unitarias + integracion (incluye prueba de concurrencia)
web/       SPA React + Vite + Tailwind (login, eventos, deudas, comprobantes)
```

## Decisiones tecnicas clave

- **Dinero exacto**: todos los montos se manejan como centavos enteros (sin punto flotante)
  y la BD los almacena como `INTEGER`. La suma de las partes siempre cuadra con el total.
- **Concurrencia (RF5)**: cada pago se procesa en una transacción que bloquea la fila de la
  deuda (`SELECT ... FOR UPDATE`) **antes** de validar las precondiciones, evitando el
  _Lost Update_ descrito en la sección 1.2.A del documento técnico.
- **OCR en segundo plano (RF3)**: cola **pg-boss** sobre PostgreSQL (sin Redis) + worker
  separado, con _timeout_, reintentos con _backoff_ e idempotencia (un solo procesamiento
  por comprobante). El proveedor OCR es un adaptador: `mock` para demo/tests y `tesseract`
  (gratuito, sin API key) para extracción real.
- **Design by Contract (RF4)**: el motor de división verifica que la suma de las partes
  equivalga al monto total **antes** de persistir; una violación genera error controlado y
  no se escribe ninguna deuda. Además, la BD impone `CHECK` sobre saldos y montos.
- **Programación defensiva**: validación Zod en todos los endpoints, autorización por evento
  en cada operación y el resultado del OCR se trata como dato no confiable que el usuario
  debe verificar y puede corregir.

## Flujo principal

1. Un usuario crea un evento e invita participantes (por username o correo).
2. El pagador sube la foto del comprobante → responde `202` con estado `PROCESANDO`.
3. El worker extrae los datos con OCR (estado `PROCESADO` o `FALLIDO`).
4. El pagador verifica/corrige los datos y elige reparto equitativo o por ítems.
5. El sistema genera las deudas a favor del pagador (solo para los demás participantes).
6. Los deudores registran pagos (parciales o totales) de forma concurrente y segura.
7. El balance del evento confirma cuando las cuentas quedan saldadas.
