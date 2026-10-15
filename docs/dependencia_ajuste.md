# Ajuste de dependencias y eliminación de vulnerabilidades

Documento que deja constancia **ordenada** de: (1) cuántas dependencias existen
(directas y transitivas), y (2) **paso a paso** lo que se hizo para llevar el proyecto
(y su copia `prototipo/`) de **39 vulnerabilidades** a **0**.

Fecha del ajuste: **14/10/2026**.
Entorno: Windows, **Node.js 24.11.0**, **npm 11.6.1**, Docker 29.4.3.

---

## 1. Resumen

| Métrica | Antes | Después |
|---|---|---|
| `npm audit` (backend) | **39** (8 moderate + 31 high) | **0** |
| `npm audit` (frontend) | 0 | 0 |
| `npm audit` (`prototipo/`) | 39 | **0** |
| Vulnerabilidades en **producción** (`--omit=dev`) | 0 | 0 |
| `npm test` (backend) | 58/58 | **58/58** |
| `npm run build` / `typecheck` | OK | OK |

**Conclusión:** las 39 vulnerabilidades estaban **únicamente en dependencias de
desarrollo**. No afectaban al código en producción. Se eliminaron actualizando dos
dependencias de desarrollo y añadiendo un `override` puntual.

---

## 2. Inventario de dependencias

> Fuente: `package.json` (directas) y `package-lock.json` / `npm audit` (árbol resuelto).
> "Transitivas" = paquetes que entran como dependencia de otra dependencia, no declarados
> directamente. El árbol resuelto no incluye la raíz del proyecto.

### 2.1 Backend (raíz, `package.json` → `splitvision@1.0.0`)

| Categoría | Cantidad |
|---|---|
| Dependencias **directas** de producción | **13** |
| Dependencias **directas** de desarrollo | **11** |
| **Total directas** | **24** |
| Nodos totales del árbol resuelto (lockfile v3) | **623** |
| — de producción | 222 |
| — de desarrollo | 401 |
| Transitivas de producción (222 − 13 directas) | **209** |
| Transitivas de desarrollo (401 − 11 directas) | **390** |
| **Total transitivas** (623 − 24 directas) | **599** |

Dependencias **directas de producción** (13): `@nestjs/common`, `@nestjs/config`,
`@nestjs/core`, `@nestjs/platform-express`, `@nestjs/typeorm`, `@node-rs/argon2`,
`class-transformer`, `class-validator`, `opossum`, `pg`, `reflect-metadata`,
`tesseract.js`, `typeorm`.

Dependencias **directas de desarrollo** (11): `@types/express`, `@types/jest`,
`@types/multer`, `@types/node`, `@types/opossum`, `@types/pg`, `fast-check`, `jest`,
`testcontainers`, `ts-jest`, `typescript`.

### 2.2 Frontend (`frontend/package.json` → `splitvision-frontend@0.1.0`)

| Categoría | Cantidad |
|---|---|
| Dependencias **directas** de producción | **4** |
| Dependencias **directas** de desarrollo | **12** |
| **Total directas** | **16** |
| Nodos totales del árbol resuelto | **169** |
| — de producción | 9 |
| — de desarrollo | 160 |
| Transitivas de producción (9 − 4 directas) | **5** |
| Transitivas de desarrollo (160 − 12 directas) | **148** |
| **Total transitivas** (169 − 16 directas) | **153** |

Dependencias **directas de producción** (4): `@tanstack/react-query`, `react`,
`react-dom`, `react-router-dom`.

Dependencias **directas de desarrollo** (12): `@tailwindcss/vite`,
`@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`,
`@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `jsdom`, `tailwindcss`,
`typescript`, `vite`, `vitest`.

### 2.3 Totales del proyecto (backend + frontend)

| Categoría | Backend | Frontend | **Total** |
|---|---|---|---|
| Directas producción | 13 | 4 | **17** |
| Directas desarrollo | 11 | 12 | **23** |
| **Directas** | 24 | 16 | **40** |
| Árbol resuelto (sin raíces) | 623 | 169 | **792** |
| **Transitivas** | 599 | 153 | **752** |

> Nota: `npm audit` reporta "audited **624** packages" para el backend porque cuenta los
> 623 del árbol **más** el paquete raíz.

---

## 3. Estado inicial (`npm audit`)

```
39 vulnerabilities (8 moderate, 31 high)
```

Todas en dependencias de **desarrollo**, agrupadas en dos cadenas:

1. **`jest@29.7.0`** (con `@types/jest@29.5.14`) → arrastraba ~33 avisos:
   `@jest/*`, `braces`, `micromatch`, `sprintf-js`, `js-yaml`, `argparse`.
2. **`testcontainers@10.28.0`** → `undici@5.29.0`, `@fastify/busboy@2.1.1`,
   `dockerode@4.0.12` → `uuid@10.0.0` (≈5 avisos).

Comprobaciones previas (solo lectura):

- `npm audit --omit=dev` → **0** (producción sin problemas).
- `npm audit` en `frontend/` → **0** (no requería cambios).

### Compatibilidad verificada antes de cambiar

- `ts-jest@29.4.14` declara soporte para `jest ^29 || ^30`.
- `jest@30` soporta Node `^18.14 || ^20 || ^22 || >=24`.
- `testcontainers@12` exige **Node ≥ 22.22** (el entorno ya usa 24; el `Dockerfile`
  usa `node:24-alpine`).
- `testcontainers@12` es **CommonJS-compatible** (`main: build/index.js`, sin
  `"type": "module"`), por lo que funciona con la transformación actual de `ts-jest`.

---

## 4. Cambios aplicados (paso a paso)

### Fase 1 — Actualizar dependencias mayores de desarrollo (`package.json`)

Se editaron 4 entradas de `devDependencies` (actualización controlada, **sin** usar
`npm audit fix --force`):

```diff
   "devDependencies": {
     ...
-    "@types/jest": "^29.5.14",
+    "@types/jest": "^30.0.0",
     ...
-    "jest": "^29.7.0",
-    "testcontainers": "^10.16.0",
-    "ts-jest": "^29.2.5",
+    "jest": "^30.5.2",
+    "testcontainers": "^12.2.1",
+    "ts-jest": "^29.4.14",
     ...
```

| Dependencia | Antes | Después | Motivo |
|---|---|---|---|
| `jest` | `^29.7.0` | `^30.5.2` | Elimina la cadena de vulnerabilidades de jest 29 |
| `@types/jest` | `^29.5.14` | `^30.0.0` | Tipos alineados con jest 30 |
| `testcontainers` | `^10.16.0` | `^12.2.1` | Sustituye `undici@5`, `@fastify/busboy@2`, `dockerode@4` |
| `ts-jest` | `^29.2.5` | `^29.4.14` | Soporte explícito de jest 30 |

### Fase 2 — Reinstalar (primer `npm install`)

```powershell
npm install
```

Resultado:

```
added 69 packages, removed 33 packages, changed 64 packages, and audited 623 packages
20 moderate severity vulnerabilities
```

- **Las 31 "high" desaparecieron.** Quedaron **20 moderate**.
- Se comprobó que las 20 restantes eran **una sola causa real**, propagada por la
  cadena de `jest` (cobertura):

```
ts-jest@29.4.14
└─ @jest/transform@30.5.2
   └─ babel-plugin-istanbul@8.0.0
      └─ @istanbuljs/load-nyc-config@1.1.0
         └─ js-yaml@3.15.2
            └─ argparse@1.0.10
               └─ sprintf-js@1.0.3   ← único aviso real
```

- Aviso real: **`sprintf-js` ≤ 1.1.3** (`GHSA-hp3w-g68c-fv3c`, denegación de servicio
  por especificadores de precisión). **No existe versión parcheada** de `sprintf-js`,
  así que la única solución era **romper la cadena que lo introduce**.

### Fase 3 — Verificación previa al `override`

Antes de tocar nada se confirmó que el cambio era seguro:

- `js-yaml@3` usa `argparse` **solo en su CLI** (`bin/js-yaml.js`); su API programática
  (`index.js`, `lib/*.js`) **no** requiere `argparse`.
- `@istanbuljs/load-nyc-config` llama `require('js-yaml').load(...)`, API que **también
  existe en `js-yaml@4`**.

→ Forzar `js-yaml@4` elimina `argparse@1` y `sprintf-js` sin afectar al uso real
(solo herramientas de cobertura en desarrollo).

### Fase 4 — Añadir `override` de `js-yaml` (`package.json`)

```diff
   "devDependencies": {
     ...
+  },
+  "overrides": {
+    "js-yaml": "^4.1.0"
   }
 }
```

### Fase 5 — Reinstalar (segundo `npm install`)

```powershell
npm install
```

Resultado:

```
added 3 packages, removed 2 packages, changed 3 packages, and audited 624 packages
found 0 vulnerabilities
```

Nueva cadena (sin `sprintf-js`):

```
ts-jest@29.4.14 → @jest/transform@30.5.2 → babel-plugin-istanbul@8.0.0
  → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@4.3.2 → argparse@2.0.1
```

---

## 5. Verificación final

```powershell
npm audit                         # found 0 vulnerabilities
npm ls js-yaml argparse sprintf-js  # árbol limpio (js-yaml@4.3.2, argparse@2.0.1)
npm run typecheck                 # OK (tsc --noEmit)
npm run build                     # OK (tsc -p tsconfig.build.json)
npm test                          # 4 suites, 58/58 tests OK (requiere Docker)
```

- `npm audit` → **0**.
- `npm audit --omit=dev` → **0** (producción).
- Frontend (`frontend/`) → **0** (sin cambios).

---

## 6. Documentación actualizada

- **`README.md`** → sección *Requisitos*: se elevó el mínimo a **Node.js ≥ 22.22**
  (probado con 24) porque `testcontainers@12` lo exige para correr los tests. El backend
  y el frontend siguen funcionando con versiones anteriores de Node.

---

## 7. Sincronización a `prototipo/`

La carpeta `prototipo/` es la copia limpia (sin `node_modules`, sin `.env`, sin
secretos) lista para publicar. Para que refleje el ajuste:

```powershell
Copy-Item package.json, package-lock.json, README.md -Destination prototipo\ -Force
npm audit --package-lock-only --prefix prototipo
```

Resultado:

```
found 0 vulnerabilities
```

Archivos sincronizados: `prototipo/package.json`, `prototipo/package-lock.json`,
`prototipo/README.md` (y este mismo documento en `prototipo/docs/`).

---

## 8. Riesgos y notas

- El `override` de `js-yaml` es un salto de versión mayor, pero **solo afecta a
  herramientas de desarrollo** (cobertura de `jest`); la API usada (`yaml.load`) es
  compatible y no interviene en producción.
- El cambio de `testcontainers@12` eleva el mínimo de Node para tests a **22.22**.
- `npm test` requiere **Docker en ejecución** (Testcontainers levanta un PostgreSQL
  efímero).
- **Rollback**: revertir los cambios de `package.json` (devDependencies + `overrides`)
  y ejecutar `npm install` para regenerar el `package-lock.json` anterior.
