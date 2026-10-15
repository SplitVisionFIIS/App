## 2.5. Requisitos Funcionales (v1.0)

**Convenciones de error:** *validación* (datos inválidos), *no autorizado* (sin sesión), *no encontrado* (recurso inexistente o usuario que no pertenece al evento; no se revela su existencia) y *conflicto* (el estado actual no permite la operación).

**Estados del comprobante:** `CARGADO → PROCESANDO → EXTRAÍDO → CONFIRMADO`, o `FALLIDO` (desde `PROCESANDO`).
**Estados del pago:** `PENDIENTE → CONFIRMADO | RECHAZADO | CANCELADO`.

**Saldos de una deuda:** *saldo pendiente* = monto − pagos confirmados. *Saldo disponible* = monto − pagos confirmados − pagos pendientes de confirmar.

### A. Identidad

**RF-01 Registrar usuario** · Actor: visitante
- Registra una cuenta con username (3–20 caracteres alfanuméricos o `_`), correo válido y contraseña (mínimo 8 caracteres).
- Username y correo son únicos sin distinguir mayúsculas.
- Errores: validación (formato), conflicto (username o correo ya existen).
- *Criterio:* dado que `ana` existe, cuando alguien se registra como `ANA`, entonces se rechaza con conflicto y no se crea la cuenta.

**RF-02 Iniciar sesión** · Actor: usuario registrado
- Accede con username o correo y contraseña. La sesión expira a las 8 h de inactividad (propuesto).
- Ante credenciales inválidas responde con un mensaje genérico, sin revelar cuál dato falló.
- *Criterio:* dada una contraseña incorrecta, cuando intenta ingresar, entonces recibe "credenciales inválidas" y no se crea sesión.

**RF-03 Cerrar sesión** · Actor: usuario autenticado
- Invalida la sesión actual; las solicitudes posteriores con esa sesión son no autorizadas.

### B. Eventos

**RF-04 Crear evento** · Actor: usuario autenticado
- Crea un evento con nombre (1–60 caracteres). El creador queda como primer participante.
- *Criterio:* cuando Mateo crea "Salida", entonces el evento existe y Mateo figura como participante.

**RF-05 Buscar usuarios** · Actor: participante del evento
- Busca por username o correo exacto. Devuelve solo el username (nunca el correo ni otros datos). Sin coincidencia, devuelve vacío.
- *Criterio:* dado un correo no registrado, cuando se busca, entonces el resultado es vacío.

**RF-06 Vincular participante** · Actor: participante del evento
- Cualquier participante puede agregar a un usuario registrado. Un usuario no puede estar dos veces en el mismo evento.
- Errores: no encontrado (usuario inexistente), conflicto (ya es participante).
- *Criterio:* dado que Lucía ya es participante, cuando Mateo intenta agregarla de nuevo, entonces se rechaza con conflicto y la lista no cambia.

**RF-07 Listar mis eventos** · Actor: usuario autenticado
- Muestra solo los eventos donde participa, con nombre, número de participantes y saldo neto personal.

**RF-08 Ver detalle del evento** · Actor: participante
- Muestra nombre, participantes y comprobantes (RF-13). Un no participante recibe "no encontrado".

### C. Comprobantes

**RF-09 Subir comprobante** · Actor: participante (queda como pagador)
- Sube una imagen (JPG, PNG o WEBP, máx. 5 MB) de un gasto que él pagó. El sistema responde de inmediato con estado `PROCESANDO`, sin hacer esperar al usuario por la extracción.
- Subir la misma imagen dos veces en el mismo evento no crea un segundo comprobante: devuelve el existente.
- Errores: validación (formato, tamaño o archivo que no es una imagen real), no encontrado (no participante).
- *Criterio:* dado un comprobante ya subido, cuando el mismo usuario sube la misma imagen, entonces no se crea uno nuevo y se informa el existente.

**RF-10 Consultar estado del comprobante** · Actor: participante
- Muestra el estado y, si es `FALLIDO`, el motivo en lenguaje claro. Puede consultarse repetidamente.
- *Criterio:* dado un comprobante en proceso, cuando termina la extracción, entonces la siguiente consulta muestra `EXTRAÍDO`.

**RF-11 Reintentar procesamiento** · Actor: pagador del comprobante
- Solo desde `FALLIDO`. Vuelve a `PROCESANDO`. Un reintento no genera un segundo procesamiento ni datos duplicados.
- Error: conflicto si el estado no es `FALLIDO`.

**RF-12 Ingresar comprobante manualmente** · Actor: participante (pagador)
- Registra un gasto sin imagen, o completa uno `FALLIDO`: descripción, monto total (> 0, hasta 2 decimales, soles PEN) y, opcionalmente, ítems con descripción, cantidad (entero ≥ 1) y precio unitario (> 0, 2 decimales). Pasa a `EXTRAÍDO`, listo para revisión.

**RF-13 Listar comprobantes del evento** · Actor: participante
- Muestra pagador, monto, estado y fecha de cada comprobante, del más reciente al más antiguo.

### D. Reparto y generación de deudas

**RF-14 Revisar y corregir datos extraídos** · Actor: pagador
- Ve y edita monto total, descripción e ítems (descripción, cantidad y precio unitario) mientras el comprobante esté `EXTRAÍDO`. El subtotal de cada ítem es cantidad × precio unitario.
- Impuestos, propina y descuentos se ingresan como montos del comprobante.
- Los datos del OCR nunca generan deudas sin esta revisión.
- Error: conflicto si el comprobante ya está `CONFIRMADO`.

**RF-15 Elegir modalidad y asignar unidades** · Actor: pagador
- Elige reparto **equitativo** (entre los participantes que seleccione; por defecto, todos) o **por ítems**.
- En por ítems, asigna cada unidad de cada ítem a exactamente un participante. Un ítem de cantidad 2 tiene 2 unidades, que pueden ir a personas distintas o a la misma.
- No se puede confirmar con unidades sin asignar.
- *Criterio:* dado "Chaufa × 2" con una sola unidad asignada, cuando intenta confirmar, entonces se rechaza indicando que falta asignar 1 unidad de ese ítem.

**RF-16 Calcular el reparto** · Actor: sistema
- En por ítems, la parte base de cada participante es la suma del precio de las unidades que tiene asignadas.
- Impuestos, propina y descuentos se distribuyen proporcionalmente a esa parte base.
- La suma de partes es igual al total del comprobante, en centavos exactos. Los centavos sobrantes se asignan con una regla fija y repetible: el mismo comprobante siempre da el mismo resultado.
- Si ítems + impuestos + propina − descuentos no coincide con el total, se rechaza la confirmación indicando la diferencia.
- *Criterios:*
  - Dado S/ 100.00 entre 3, las partes son 33.34, 33.33 y 33.33, y suman 100.00.
  - Dado Chaufa × 2 a S/ 15.00 y Gaseosa × 1 a S/ 6.00 (total S/ 36.00), con un chaufa para Mateo, el otro chaufa y la gaseosa para Lucía, las partes son Mateo 15.00 y Lucía 21.00.

**RF-17 Confirmar y generar deudas** · Actor: pagador
- Al confirmar, el comprobante pasa a `CONFIRMADO` (ya no editable) y se genera una deuda por cada participante distinto del pagador, con monto igual a su parte. La parte del pagador no genera deuda.
- Se generan todas las deudas o ninguna. Confirmar dos veces no duplica deudas.
- Errores: validación (reparto incompleto), conflicto (ya confirmado o aún no `EXTRAÍDO`).
- *Criterio:* dado un comprobante de S/ 300 entre Mateo (pagador), Lucía y Andrés, cuando Mateo confirma, entonces existen 2 deudas de S/ 100 con saldo S/ 100 cada una.

### E. Pagos

**RF-18 Registrar pago con evidencia** · Actor: deudor de esa deuda
- Registra un pago con monto (> 0, 2 decimales), método (efectivo, Yape, Plin, transferencia bancaria u otro), referencia opcional (máx. 50 caracteres alfanuméricos) y evidencia en imagen (misma regla de formato y tamaño que RF-09).
- La evidencia es obligatoria para Yape, Plin, transferencia bancaria y otro; es opcional para efectivo.
- El pago queda `PENDIENTE` y reserva ese monto del saldo disponible.
- El monto no puede superar el saldo disponible. Solo el deudor puede registrarlo y la deuda no puede estar saldada.
- Un reenvío idéntico (doble clic o reintento de red) no genera un segundo pago.
- Con solicitudes simultáneas sobre la misma deuda, la suma de pagos aceptados nunca supera el monto de la deuda.
- Errores: validación (monto, método, referencia o evidencia faltante), no encontrado (no es el deudor), conflicto (monto supera el saldo disponible o deuda saldada).
- *Criterios:*
  - Dado un saldo disponible de S/ 100, cuando se envían a la vez pagos de S/ 60 y S/ 70, entonces se acepta exactamente uno y el otro se rechaza por conflicto.
  - Dado un envío duplicado del mismo pago, entonces existe un solo pago.
  - Dado un pago por Yape sin imagen, cuando el deudor lo envía, entonces se rechaza y el saldo disponible no cambia.

**RF-19 Cancelar pago pendiente** · Actor: deudor que lo registró
- Solo en estado `PENDIENTE`. Libera el monto reservado. Si el acreedor lo confirmó o rechazó antes, la cancelación se rechaza por conflicto.

**RF-20 Ver pagos por confirmar** · Actor: acreedor
- Lista los pagos `PENDIENTE` dirigidos a él: deudor, deuda, monto, método, referencia y fecha, del más antiguo al más reciente.

**RF-21 Confirmar pago recibido** · Actor: acreedor de esa deuda
- Un pago `PENDIENTE` pasa a `CONFIRMADO` y reduce el saldo pendiente. Solo lo puede confirmar el acreedor de esa deuda.
- Un pago ya confirmado, rechazado o cancelado no puede confirmarse (conflicto).

**RF-22 Rechazar pago** · Actor: acreedor de esa deuda
- Un pago `PENDIENTE` pasa a `RECHAZADO`, con motivo obligatorio (máx. 200 caracteres). Libera el monto reservado y el deudor puede registrar otro pago.
- *Criterio:* dado un pago pendiente de S/ 60 sobre una deuda de S/ 100, cuando el acreedor lo rechaza, entonces el saldo disponible vuelve a S/ 100.

**RF-23 Ver evidencia de pago** · Actor: deudor o acreedor de esa deuda
- Solo ellos pueden ver la imagen. Otro participante del evento recibe "no encontrado".

### F. Consultas y balance

**RF-24 Ver lo que debo** · Actor: participante
- Lista sus deudas como deudor: acreedor, comprobante, monto, saldo pendiente y saldo disponible.

**RF-25 Ver lo que me deben** · Actor: participante
- Lista las deudas donde es acreedor, con deudor, monto y saldo pendiente.

**RF-26 Ver historial de pagos de una deuda** · Actor: deudor o acreedor de esa deuda
- Muestra todos los pagos (cualquier estado) con quién, cuándo, monto y estado. Para cada deuda: pagos confirmados + saldo pendiente = monto total.
- Otro participante del evento recibe "no encontrado".

**RF-27 Ver balance del evento** · Actor: participante
- Muestra, por cada participante, el total que pagó como pagador, el total que debe, el total que le deben y su saldo neto (lo que le deben menos lo que debe).
- Muestra también los totales del evento: gasto total, total confirmado y total pendiente.
- Solo cuentan los pagos `CONFIRMADO` para el saldo; los pagos pendientes se muestran aparte como "en revisión".
- Los valores son coherentes aunque se estén registrando pagos al mismo tiempo.
- No muestra el detalle de cada deuda ni los pagos, solo los totales por persona. No simplifica deudas cruzadas.
- Un no participante recibe "no encontrado".
- *Criterio:* dado que Lucía le debe S/ 100 a Mateo, cuando Andrés consulta el balance, entonces ve que Lucía debe S/ 100 en total y que Mateo tiene S/ 100 por cobrar, pero no puede abrir el historial ni la evidencia de esa deuda.

**RF-28 Ver pendientes por atender** · Actor: usuario autenticado
- Muestra un contador y la lista de: pagos por confirmar (como acreedor), pagos rechazados (como deudor) y comprobantes `FALLIDO` o `EXTRAÍDO` por revisar (como pagador). Se actualiza al consultarla, sin notificaciones push.

### Fuera de alcance (v1.0)

Quitar participantes o salir de un evento, anular un comprobante `CONFIRMADO`, corregir un pago ya `CONFIRMADO`, simplificar deudas cruzadas, recuperar contraseña, múltiples monedas, repartir una misma unidad entre varias personas.

---

## 2.6. Requisitos no funcionales (v1.0)

Los valores numéricos son **propuestos** y deben validarse con el docente y con las mediciones del prototipo. Cada RNF indica cómo se verifica.

### 2.6.1. Atributos de calidad principales

Los cuatro primeros son los que el proyecto debe demostrar de forma explícita en el parcial, porque son los retos de construcción de la sección 1.2. Los demás son de soporte.

| Prioridad | Atributo de calidad | Por qué importa en SplitVision | Reto / rúbrica asociada |
|---|---|---|---|
| Alta | **Integridad y consistencia de datos** | Una deuda o un saldo incorrecto destruye la confianza del grupo; es el valor central del producto | Concurrencia, precisión de montos, contratos |
| Alta | **Resiliencia y disponibilidad** | El OCR es un servicio externo inestable; su falla no debe frenar a los usuarios ni duplicar datos | Tolerancia a fallas, idempotencia |
| Alta | **Seguridad y privacidad** | Se manejan cuentas, capturas de pagos y datos de terceros; hay aislamiento por evento y por deuda | Programación defensiva |
| Alta | **Verificabilidad** | Los escenarios críticos deben poder reproducirse y demostrarse en la defensa | Pruebas y evidencias |
| Media | **Trazabilidad y observabilidad** | Se debe poder saber quién hizo qué y diagnosticar fallas | Errores y logging |
| Media | **Rendimiento y capacidad** | La interacción debe ser ágil, y el cálculo y las consultas deben sostenerse con volumen razonable | Etapa final (profiling) |
| Media | **Usabilidad y compatibilidad** | Debe usarse en móvil y PC con la misma interfaz | Alcance: web responsive |
| Media | **Mantenibilidad y modificabilidad** | El proyecto evoluciona del parcial al final; hay que poder cambiar sin romper | Evolución obligatoria |
| Baja | **Portabilidad y despliegue** | Cualquier integrante o el docente debe poder ejecutarlo | README y repositorio |

### 2.6.2. Requisitos no funcionales

#### Integridad y consistencia

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-01 | **Invariantes bajo concurrencia.** Con cualquier cantidad de solicitudes simultáneas sobre una misma deuda, se cumple siempre: 0 ≤ saldo pendiente ≤ monto; saldo pendiente = monto − pagos confirmados; pagos confirmados + pendientes ≤ monto | Prueba automatizada repetible con 50 solicitudes simultáneas: 0 violaciones en 100 ejecuciones | RF-18, 19, 21, 22 |
| RNF-02 | **Exactitud monetaria.** Los montos se representan y calculan sin error de redondeo (enteros en centavos o decimal exacto, nunca punto flotante). La suma de las partes es igual al total | Pruebas por propiedades con ≥ 1000 casos aleatorios: suma de partes = total en el 100 % | RF-12, 14, 16 |
| RNF-03 | **Atomicidad.** Las operaciones de varios pasos (confirmar y generar deudas; confirmar un pago y actualizar el saldo) se completan por entero o no dejan efecto | Prueba con falla inyectada a mitad de la operación: 0 datos parciales | RF-17, 21 |
| RNF-04 | **Idempotencia.** Repetir una operación (reenvío de pago, nueva subida de la misma imagen, reintento de tarea, doble confirmación) no duplica efectos | Prueba de repetición ×10: 1 solo resultado persistido | RF-09, 11, 17, 18 |
| RNF-05 | **Defensa en la base de datos.** Las invariantes críticas y la unicidad (username, correo, participación, hash de imagen por evento, clave de idempotencia) se refuerzan también con restricciones del motor de datos | Insertar datos inválidos directamente en la base es rechazado | RF-01, 06, 09, 18 |

#### Resiliencia y disponibilidad

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-06 | **Independencia del OCR.** Subir un comprobante responde sin esperar al OCR, aun si este está lento o caído | Respuesta ≤ 2 s (p95) con OCR simulado a 30 s de latencia y con OCR caído | RF-09, 10 |
| RNF-07 | **Tolerancia a fallas del OCR.** Tiempo de espera máximo de 10 s por llamada; hasta 3 reintentos con espera creciente (2, 4 y 8 s); corte temporal de llamadas tras fallas consecutivas; tras agotar los reintentos, el comprobante pasa a `FALLIDO` | Pruebas con fallas inyectadas (timeout, 5xx, límite de uso, desconexión): 100 % termina en `EXTRAÍDO` o `FALLIDO`, ninguno queda en `PROCESANDO` indefinidamente | RF-09, 11 |
| RNF-08 | **Aislamiento de fallas.** Una falla del OCR no afecta las demás operaciones (pagos, consultas, login) | Con OCR caído, el resto de la API mantiene 100 % de éxito en las pruebas | RF-18 a 28 |
| RNF-09 | **Recuperación de procesos.** Si el proceso en segundo plano se detiene a mitad de una tarea, esta se retoma sin duplicar resultados | Prueba que mata el proceso a mitad de tarea: la tarea se completa una sola vez | RF-09 |
| RNF-10 | **Datos externos no confiables.** Toda respuesta del OCR se valida (estructura, monto positivo, ítems coherentes) antes de usarse; ningún dato sin validar llega al reparto | Pruebas con respuestas corruptas, incompletas y con tipos erróneos: 0 datos inválidos persistidos | RF-09, 14 |

#### Seguridad y privacidad

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-11 | **Protección de credenciales.** Las contraseñas se guardan como hash con sal mediante un algoritmo adaptativo (Argon2 o bcrypt), nunca en texto plano ni en logs | Revisión de la base de datos y de los logs: 0 contraseñas legibles | RF-01, 02 |
| RNF-12 | **Sesiones seguras.** Cookie de sesión no accesible desde scripts, transmitida solo por HTTPS en producción, con expiración por inactividad de 8 h e invalidación al cerrar sesión | Prueba de la cookie y de uso de una sesión cerrada: 100 % rechazada | RF-02, 03 |
| RNF-13 | **Protección contra fuerza bruta.** Tras 5 intentos fallidos de login en 10 minutos, se bloquean temporalmente nuevos intentos (propuesto) | Prueba automatizada de 6 intentos: el sexto se rechaza | RF-02 |
| RNF-14 | **Autorización por evento y por deuda.** Toda operación valida que el usuario pertenezca al evento y que tenga el rol exigido (pagador, deudor, acreedor). Los no autorizados reciben "no encontrado" para no revelar la existencia del recurso | Matriz de pruebas rol × operación: 100 % de accesos indebidos rechazados | RF-02 a 28 |
| RNF-15 | **Privacidad de evidencias.** Las imágenes de pago solo son accesibles para deudor y acreedor; no se sirven por URL pública ni adivinable | Prueba de acceso con un tercero y con URL directa: 0 accesos | RF-23 |
| RNF-16 | **Seguridad de archivos.** Se valida el tipo real del archivo (no solo la extensión), el tamaño máximo (5 MB) y se almacena con un nombre generado por el sistema, fuera de la raíz pública | Subida de un ejecutable renombrado como `.jpg`, de un archivo de 6 MB y de un nombre con `../`: todos rechazados | RF-09, 18 |
| RNF-17 | **Validación de toda entrada.** Todo dato de usuario o externo se valida en el servidor (longitudes, rangos, formatos, listas cerradas) y se evita la inyección y el script malicioso | Pruebas con entradas límite e inyección (SQL, HTML/script): 0 efectos | Todos |
| RNF-18 | **Mínima exposición de datos.** La búsqueda de usuarios solo devuelve username; los mensajes de error no revelan detalles internos ni trazas | Revisión de respuestas de error: 0 trazas ni datos internos | RF-05 |

#### Rendimiento y capacidad

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-19 | **Tiempo de respuesta de operaciones.** Registrar pago, confirmar, rechazar y consultas simples responden en ≤ 1 s (p95) con carga normal | Prueba de carga con 20 usuarios concurrentes | RF-18 a 28 |
| RNF-20 | **Bajo contención.** Con 50 solicitudes simultáneas sobre la misma deuda, las respuestas llegan en ≤ 3 s (p95) y las de otras deudas no se ven afectadas | Prueba de concurrencia con medición de tiempos | RF-18 |
| RNF-21 | **Consulta de balance.** El balance de un evento con 20 participantes y 200 comprobantes se calcula en ≤ 1 s (p95) | Prueba con datos generados | RF-27 |
| RNF-22 | **Capacidad objetivo v1.0.** Soporta 50 usuarios concurrentes, eventos de hasta 20 participantes y 200 comprobantes por evento | Generador de datos de prueba y pruebas de carga | Todos |

#### Usabilidad y compatibilidad

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-23 | **Diseño responsive.** La misma interfaz funciona desde 360 px de ancho hasta escritorio, sin desplazamiento horizontal | Revisión en 360, 768 y 1280 px | Todos |
| RNF-24 | **Captura desde el móvil.** En el móvil, la subida de comprobante y de evidencia permite abrir la cámara; en escritorio, elegir un archivo | Prueba manual en un teléfono y en PC | RF-09, 18 |
| RNF-25 | **Compatibilidad de navegadores.** Funciona en las dos últimas versiones de Chrome, Firefox, Safari y Edge | Prueba manual del flujo completo | Todos |
| RNF-26 | **Mensajes de error comprensibles.** Los errores se muestran en español claro y accionable, e indican el campo o la causa | Revisión de cada error de validación | Todos |
| RNF-27 | **Localización.** Interfaz en español, moneda en soles (S/) con 2 decimales, fechas y horas en zona horaria de Lima; los textos están separados del código | Revisión de pantallas y formatos | Todos |

#### Trazabilidad y observabilidad

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-28 | **Auditoría de operaciones.** Toda operación relevante (registro, login, creación de evento, subida, confirmación, pago, confirmación o rechazo de pago) queda registrada con usuario, operación, recurso, resultado y marca de tiempo | Revisión de los logs tras ejecutar el flujo completo: 100 % de operaciones con registro | Todos |
| RNF-29 | **Logs estructurados con correlación.** Los logs usan formato estructurado y un identificador de correlación que enlaza la solicitud web con la tarea en segundo plano | Seguir una subida de comprobante de punta a punta con un solo identificador | RF-09 |
| RNF-30 | **Política de errores.** Los errores se clasifican (validación, no autorizado, no encontrado, conflicto, falla externa, error interno), se devuelven con un formato uniforme y se registran con el nivel adecuado; los datos sensibles no se registran | Revisión de la política y de pruebas por tipo de error | Todos |
| RNF-31 | **Métricas básicas (se amplía en v2.0).** Se miden cantidad de reintentos del OCR, latencia del OCR, pagos rechazados por conflicto y tareas fallidas | Las métricas son consultables tras una prueba de carga | RF-09, 18 |

#### Verificabilidad

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-32 | **Escenarios críticos automatizados.** Concurrencia (S/ 60 vs S/ 70), doble envío, confirmación vs cancelación, falla y recuperación del OCR, y atomicidad de las deudas están cubiertos por pruebas automatizadas reproducibles | Todas pasan en una ejecución limpia; los resultados se guardan como evidencia | RF-09, 17, 18, 19, 21 |
| RNF-33 | **Cobertura de las reglas de negocio.** El cálculo del reparto y las reglas de pagos tienen pruebas unitarias y por propiedades | Cobertura de líneas ≥ 80 % en esos componentes (propuesto) | RF-16, 18 |
| RNF-34 | **Contratos explícitos.** Al menos 3 rutinas (reparto, registro de pago, validación de la respuesta del OCR) declaran y verifican precondiciones, postcondiciones e invariantes | Pruebas que violan cada contrato y confirman el rechazo | RF-16, 18, 09 |
| RNF-35 | **Integración continua.** Las pruebas se ejecutan automáticamente en cada cambio y un fallo bloquea la integración | Pipeline con resultado visible | Todos |
| RNF-36 | **Pruebas sin dependencias reales.** El servicio OCR se puede reemplazar por una versión simulada que permite inyectar fallas | Las pruebas corren sin acceso a internet | RF-09 |

#### Mantenibilidad y portabilidad

| ID | Requisito | Medida / verificación | RF |
|---|---|---|---|
| RNF-37 | **Modularidad.** El sistema se organiza en módulos con responsabilidades separadas; el dominio no depende del framework ni de la base de datos | Prueba arquitectónica automatizada: 0 violaciones de dependencia | Todos |
| RNF-38 | **Modificabilidad.** Cambiar el proveedor de OCR, la regla de reparto de centavos o la lista de métodos de pago no requiere modificar otros módulos | Cada cambio afecta a un solo módulo (comprobable por revisión de diff) | RF-09, 16, 18 |
| RNF-39 | **Configuración externa.** Valores como timeouts, reintentos, tamaños, duración de sesión y credenciales se leen de configuración; no hay secretos en el repositorio | Búsqueda de secretos en el historial: 0 hallazgos; existe `.env.example` | Todos |
| RNF-40 | **Gestión de dependencias.** Las dependencias están versionadas y bloqueadas; se documenta el árbol transitivo, las licencias y los riesgos | Informe de dependencias sin vulnerabilidades críticas conocidas | Todos |
| RNF-41 | **Despliegue reproducible.** El sistema completo (API, proceso en segundo plano y base de datos) arranca con un único comando y el README permite instalar, configurar, ejecutar y probar | Un integrante ajeno al desarrollo lo levanta en ≤ 15 min siguiendo el README | Todos |
| RNF-42 | **Migraciones de esquema.** Los cambios en la base de datos son versionados y repetibles | Base nueva y base existente llegan al mismo esquema | Todos |

---

## 2.6.3. Escenarios de calidad

Formato: **Fuente** del estímulo · **Estímulo** · **Artefacto** afectado · **Entorno** · **Respuesta** esperada · **Medida** de la respuesta.

### Integridad y consistencia

**EC-01 · Pagos simultáneos que exceden el saldo** (RNF-01)
- Fuente: dos solicitudes del mismo deudor (doble envío desde dos dispositivos).
- Estímulo: pagos de S/ 60 y S/ 70 simultáneos sobre una deuda con saldo disponible de S/ 100.
- Artefacto: registro de pagos.
- Entorno: operación normal, base de datos con otras operaciones en curso.
- Respuesta: se acepta exactamente un pago; el otro se rechaza con conflicto sin alterar saldos.
- Medida: en 100 ejecuciones, 100 con un solo pago aceptado, saldo disponible final de S/ 40 o S/ 30 según el orden, nunca negativo.

**EC-02 · Estrés sobre una misma deuda** (RNF-01, RNF-20)
- Fuente: 50 clientes simultáneos.
- Estímulo: 50 pagos de S/ 10 sobre una deuda de S/ 100.
- Artefacto: registro de pagos.
- Entorno: carga alta puntual.
- Respuesta: se aceptan como máximo 10 pagos; el resto se rechaza por conflicto.
- Medida: suma de pagos aceptados ≤ S/ 100, 0 violaciones de invariantes, p95 ≤ 3 s.

**EC-03 · Doble envío del mismo pago** (RNF-04)
- Fuente: deudor con conexión inestable que reenvía.
- Estímulo: la misma solicitud de pago llega 2 veces.
- Artefacto: registro de pagos.
- Entorno: operación normal.
- Respuesta: se crea un solo pago y la segunda respuesta informa el pago existente.
- Medida: 1 pago persistido en el 100 % de las pruebas, 0 reservas duplicadas.

**EC-04 · Confirmación contra cancelación** (RNF-01, RNF-03)
- Fuente: el acreedor confirma y el deudor cancela a la vez.
- Estímulo: ambas solicitudes sobre el mismo pago `PENDIENTE`.
- Artefacto: ciclo de vida del pago.
- Entorno: operación normal.
- Respuesta: solo una prevalece; la otra recibe conflicto; el saldo queda coherente con el estado final.
- Medida: en 100 ejecuciones, estado final único y saldo = monto − pagos confirmados.

**EC-05 · División con residuos** (RNF-02)
- Fuente: pagador.
- Estímulo: confirmar un comprobante de S/ 100.00 entre 3 participantes, y casos aleatorios con impuestos y propina.
- Artefacto: cálculo del reparto.
- Entorno: operación normal.
- Respuesta: se calculan partes exactas con regla de residuo determinista.
- Medida: 33.34 / 33.33 / 33.33; en 1000 casos aleatorios, suma de partes = total en el 100 %; mismo resultado en ejecuciones repetidas.

**EC-06 · Falla al generar deudas** (RNF-03)
- Fuente: error de infraestructura (caída de la conexión a la base de datos).
- Estímulo: falla después de crear la primera deuda de tres.
- Artefacto: confirmación del comprobante.
- Entorno: operación normal con falla inyectada.
- Respuesta: se revierte todo; el comprobante sigue `EXTRAÍDO` y sin deudas.
- Medida: 0 deudas parciales; la confirmación posterior se completa correctamente.

**EC-07 · Datos inválidos directos a la base** (RNF-05)
- Fuente: error de programación o script de mantenimiento.
- Estímulo: intento de guardar un saldo negativo o una participación duplicada.
- Artefacto: base de datos.
- Entorno: pruebas de integración.
- Respuesta: el motor rechaza la operación.
- Medida: 100 % de inserciones inválidas rechazadas.

### Resiliencia y disponibilidad

**EC-08 · OCR lento** (RNF-06, RNF-07)
- Fuente: servicio OCR con latencia de 30 s.
- Estímulo: el pagador sube un comprobante.
- Artefacto: subida y procesamiento.
- Entorno: operación normal, OCR degradado.
- Respuesta: la subida responde de inmediato en `PROCESANDO`; la llamada al OCR se corta a los 10 s y se reintenta.
- Medida: respuesta de subida ≤ 2 s (p95); cada llamada ≤ 10 s; máximo 3 reintentos.

**EC-09 · OCR caído** (RNF-07, RNF-08)
- Fuente: servicio OCR indisponible (errores 5xx o conexión rechazada).
- Estímulo: llegan 20 comprobantes en 5 minutos.
- Artefacto: procesamiento en segundo plano.
- Entorno: falla prolongada del servicio externo.
- Respuesta: tras reintentos agotados los comprobantes pasan a `FALLIDO` con motivo; las llamadas se suspenden temporalmente; los pagos y consultas siguen funcionando.
- Medida: 0 comprobantes en `PROCESANDO` indefinido; operaciones no relacionadas con el OCR con 100 % de éxito.

**EC-10 · Respuesta corrupta del OCR** (RNF-10)
- Fuente: servicio OCR.
- Estímulo: respuesta con JSON incompleto, monto negativo, tipos erróneos o ítems que no suman.
- Artefacto: validación de la respuesta.
- Entorno: operación normal.
- Respuesta: se rechaza la respuesta, se trata como fallo y se registra el motivo; no se guardan datos.
- Medida: 0 datos inválidos persistidos en el 100 % de los casos de prueba.

**EC-11 · Tarea reprocesada** (RNF-04, RNF-09)
- Fuente: reentrega de una tarea o reintento manual del pagador.
- Estímulo: la misma tarea se ejecuta dos veces.
- Artefacto: procesamiento en segundo plano.
- Entorno: operación normal.
- Respuesta: el segundo procesamiento se ignora o no cambia el resultado.
- Medida: 1 conjunto de datos extraídos por comprobante, 0 deudas duplicadas.

**EC-12 · Caída del proceso en segundo plano** (RNF-09)
- Fuente: reinicio o falla del Worker.
- Estímulo: el Worker se detiene mientras procesa un comprobante.
- Artefacto: procesamiento en segundo plano.
- Entorno: falla de infraestructura.
- Respuesta: al reiniciar, la tarea se retoma y se completa una sola vez.
- Medida: 100 % de tareas interrumpidas terminan en `EXTRAÍDO` o `FALLIDO`; 0 duplicados.

### Seguridad y privacidad

**EC-13 · Acceso de un no participante** (RNF-14)
- Fuente: usuario autenticado ajeno al evento.
- Estímulo: consulta o modifica comprobantes, balance o deudas de un evento ajeno.
- Artefacto: toda la API.
- Entorno: operación normal.
- Respuesta: "no encontrado", sin revelar que el recurso existe.
- Medida: 100 % de accesos indebidos rechazados con la misma respuesta que un recurso inexistente.

**EC-14 · Acceso de un tercero a una evidencia** (RNF-15)
- Fuente: participante del evento que no es deudor ni acreedor de esa deuda.
- Estímulo: pide la imagen del pago o intenta una URL directa.
- Artefacto: evidencias de pago.
- Entorno: operación normal.
- Respuesta: se niega el acceso; las imágenes no están en una ruta pública.
- Medida: 0 accesos exitosos; las URL directas no devuelven la imagen.

**EC-15 · Archivo malicioso** (RNF-16, RNF-17)
- Fuente: usuario malintencionado.
- Estímulo: sube un ejecutable renombrado como `.jpg`, un archivo de 6 MB y un nombre con `../`.
- Artefacto: subida de comprobantes y evidencias.
- Entorno: operación normal.
- Respuesta: se rechazan por validación; no se escribe nada fuera del almacenamiento previsto.
- Medida: 3 de 3 rechazados; 0 archivos en rutas no previstas.

**EC-16 · Fuerza bruta de credenciales** (RNF-13)
- Fuente: atacante automatizado.
- Estímulo: 6 intentos de login fallidos consecutivos sobre una misma cuenta.
- Artefacto: inicio de sesión.
- Entorno: operación normal.
- Respuesta: los nuevos intentos se bloquean temporalmente y se registra el evento.
- Medida: el sexto intento se rechaza; el bloqueo se levanta a los 10 minutos.

**EC-17 · Exposición de la base de datos** (RNF-11, RNF-18)
- Fuente: persona con acceso a una copia de la base de datos o de los logs.
- Estímulo: revisión de los datos almacenados.
- Artefacto: base de datos y logs.
- Entorno: incidente de seguridad.
- Respuesta: las contraseñas solo existen como hash con sal; los logs no contienen datos sensibles.
- Medida: 0 contraseñas recuperables en texto plano.

**EC-18 · Entrada con código inyectado** (RNF-17)
- Fuente: usuario malintencionado.
- Estímulo: username, nombre de evento o referencia con fragmentos de SQL o de HTML/script.
- Artefacto: validación de entradas.
- Entorno: operación normal.
- Respuesta: se rechaza o se neutraliza; nunca se ejecuta.
- Medida: 0 ejecuciones en la batería de pruebas de inyección.

### Rendimiento y capacidad

**EC-19 · Balance con volumen** (RNF-21, RNF-22)
- Fuente: participante.
- Estímulo: consulta el balance de un evento con 20 participantes y 200 comprobantes.
- Artefacto: consulta de balance.
- Entorno: carga normal.
- Respuesta: calcula y devuelve los totales.
- Medida: ≤ 1 s (p95).

**EC-20 · Carga normal de usuarios** (RNF-19, RNF-22)
- Fuente: 20 usuarios simultáneos usando el flujo completo.
- Estímulo: registran pagos, confirman y consultan.
- Artefacto: API.
- Entorno: carga esperada de un grupo de eventos activos.
- Respuesta: responde con normalidad.
- Medida: ≤ 1 s (p95), 0 errores no controlados.

### Usabilidad y compatibilidad

**EC-21 · Uso desde el móvil** (RNF-23, RNF-24)
- Fuente: deudor con un teléfono de 360 px.
- Estímulo: registra un pago por Yape con su captura.
- Artefacto: interfaz web.
- Entorno: móvil con conexión estable.
- Respuesta: puede completar el flujo sin desplazamiento horizontal y con acceso a cámara o galería.
- Medida: flujo completado en ≤ 5 pasos y ≤ 60 s en una prueba con 3 personas.

**EC-22 · Error de validación comprensible** (RNF-26)
- Fuente: usuario.
- Estímulo: intenta confirmar un reparto con una unidad sin asignar.
- Artefacto: interfaz y API.
- Entorno: operación normal.
- Respuesta: el mensaje indica qué ítem y cuántas unidades faltan.
- Medida: mensaje en español que identifica el ítem; el usuario corrige sin ayuda.

### Trazabilidad y observabilidad

**EC-23 · Auditoría de un pago** (RNF-28)
- Fuente: integrante del equipo o docente.
- Estímulo: pregunta quién registró y quién confirmó un pago determinado.
- Artefacto: registros del sistema.
- Entorno: revisión posterior.
- Respuesta: se reconstruye la secuencia con usuario, hora y resultado de cada paso.
- Medida: 100 % de los pasos recuperables en ≤ 2 minutos.

**EC-24 · Diagnóstico de una extracción fallida** (RNF-29, RNF-30)
- Fuente: desarrollador.
- Estímulo: un usuario reporta que su comprobante quedó `FALLIDO`.
- Artefacto: logs y métricas.
- Entorno: operación normal.
- Respuesta: con un solo identificador se sigue la solicitud, los reintentos y el motivo final.
- Medida: causa identificada en ≤ 5 minutos, sin datos sensibles en el log.

### Verificabilidad

**EC-25 · Reproducir la carrera en la defensa** (RNF-32)
- Fuente: docente.
- Estímulo: pide demostrar el escenario concurrente.
- Artefacto: pruebas automatizadas.
- Entorno: máquina limpia.
- Respuesta: se ejecuta la prueba con un solo comando y muestra el resultado.
- Medida: ejecución ≤ 2 minutos, resultado idéntico en 3 corridas.

**EC-26 · Simular fallas sin servicio real** (RNF-36)
- Fuente: desarrollador.
- Estímulo: necesita probar timeout, error 5xx y respuesta corrupta.
- Artefacto: integración con el OCR.
- Entorno: sin internet.
- Respuesta: usa la versión simulada del servicio que inyecta cada falla.
- Medida: las pruebas de resiliencia corren sin internet y cubren los 4 tipos de falla.

### Mantenibilidad y portabilidad

**EC-27 · Cambio de proveedor de OCR** (RNF-38)
- Fuente: equipo, por costo o calidad.
- Estímulo: se decide reemplazar el proveedor.
- Artefacto: módulo de integración con el OCR.
- Entorno: desarrollo.
- Respuesta: se implementa un nuevo adaptador sin tocar reparto, pagos ni comprobantes.
- Medida: cambios confinados a un módulo; todas las pruebas existentes siguen en verde.

**EC-28 · Agregar un método de pago** (RNF-38)
- Fuente: equipo.
- Estímulo: se incorpora un nuevo método a la lista cerrada.
- Artefacto: pagos.
- Entorno: desarrollo.
- Respuesta: se agrega en un punto único y se define si exige evidencia.
- Medida: ≤ 1 archivo de dominio modificado más pruebas; sin impacto en otros flujos.

**EC-29 · Violación de dependencia entre capas** (RNF-37)
- Fuente: desarrollador.
- Estímulo: hace que el dominio dependa del framework o de la base de datos.
- Artefacto: código fuente.
- Entorno: integración continua.
- Respuesta: la prueba arquitectónica falla y bloquea el cambio.
- Medida: 100 % de las violaciones detectadas en el pipeline.

**EC-30 · Dependencia vulnerable** (RNF-40)
- Fuente: informe de vulnerabilidades.
- Estímulo: una dependencia transitiva aparece con una vulnerabilidad crítica.
- Artefacto: dependencias del proyecto.
- Entorno: mantenimiento.
- Respuesta: el análisis la detecta, se evalúa el riesgo y se actualiza o se mitiga.
- Medida: detección en el siguiente análisis; 0 vulnerabilidades críticas sin tratar en la entrega.

**EC-31 · Levantar el sistema en una máquina nueva** (RNF-41, RNF-42)
- Fuente: docente o nuevo integrante.
- Estímulo: clona el repositorio y sigue el README.
- Artefacto: sistema completo.
- Entorno: máquina sin configuración previa.
- Respuesta: con un comando arranca API, Worker y base de datos con el esquema aplicado.
- Medida: sistema funcionando y pruebas pasando en ≤ 15 minutos, sin pasos no documentados.

### Trazabilidad escenario → RNF

| Escenario | RNF | Escenario | RNF |
|---|---|---|---|
| EC-01 | RNF-01 | EC-17 | RNF-11, 18 |
| EC-02 | RNF-01, 20 | EC-18 | RNF-17 |
| EC-03 | RNF-04 | EC-19 | RNF-21, 22 |
| EC-04 | RNF-01, 03 | EC-20 | RNF-19, 22 |
| EC-05 | RNF-02 | EC-21 | RNF-23, 24 |
| EC-06 | RNF-03 | EC-22 | RNF-26 |
| EC-07 | RNF-05 | EC-23 | RNF-28 |
| EC-08 | RNF-06, 07 | EC-24 | RNF-29, 30 |
| EC-09 | RNF-07, 08 | EC-25 | RNF-32 |
| EC-10 | RNF-10 | EC-26 | RNF-36 |
| EC-11 | RNF-04, 09 | EC-27 | RNF-38 |
| EC-12 | RNF-09 | EC-28 | RNF-38 |
| EC-13 | RNF-14 | EC-29 | RNF-37 |
| EC-14 | RNF-15 | EC-30 | RNF-40 |
| EC-15 | RNF-16, 17 | EC-31 | RNF-41, 42 |
| EC-16 | RNF-13 | | |