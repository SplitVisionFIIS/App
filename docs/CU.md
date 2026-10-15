## 2.7. Casos de uso

### Actores

| Actor | Descripción |
|---|---|
| Visitante | Persona sin sesión iniciada |
| Usuario | Persona autenticada |
| Participante | Usuario vinculado a un evento |
| Pagador | Participante que pagó un gasto y lo registra (rol por comprobante) |
| Deudor | Participante que debe una parte de un gasto (rol por deuda) |
| Acreedor | Pagador al que se le debe (rol por deuda) |
| Worker | Proceso en segundo plano del sistema |
| Servicio OCR | Sistema externo de extracción de datos |

### Índice

| CU | Nombre | Actor principal | RF |
|---|---|---|---|
| CU-01 | Registrar usuario | Visitante | RF-01 |
| CU-02 | Iniciar sesión | Visitante | RF-02 |
| CU-03 | Cerrar sesión | Usuario | RF-03 |
| CU-04 | Crear evento | Usuario | RF-04 |
| CU-05 | Vincular participante | Participante | RF-05, RF-06 |
| CU-06 | Consultar eventos | Usuario | RF-07, RF-08 |
| CU-07 | Subir comprobante | Pagador | RF-09 |
| CU-08 | Procesar comprobante con OCR | Worker | RF-09, RF-10, RF-11 |
| CU-09 | Consultar estado y reintentar procesamiento | Pagador | RF-10, RF-11 |
| CU-10 | Ingresar comprobante manualmente | Pagador | RF-12 |
| CU-11 | Listar comprobantes del evento | Participante | RF-13 |
| CU-12 | Revisar y corregir datos extraídos | Pagador | RF-14 |
| CU-13 | Configurar reparto | Pagador | RF-15 |
| CU-14 | Confirmar reparto y generar deudas | Pagador | RF-16, RF-17 |
| CU-15 | Registrar pago con evidencia | Deudor | RF-18 |
| CU-16 | Cancelar pago pendiente | Deudor | RF-19 |
| CU-17 | Revisar pagos por confirmar | Acreedor | RF-20, RF-23 |
| CU-18 | Confirmar pago recibido | Acreedor | RF-21 |
| CU-19 | Rechazar pago | Acreedor | RF-22 |
| CU-20 | Consultar mis deudas y cobros | Participante | RF-24, RF-25 |
| CU-21 | Consultar historial de una deuda | Deudor / Acreedor | RF-26, RF-23 |
| CU-22 | Consultar balance del evento | Participante | RF-27 |
| CU-23 | Consultar pendientes | Usuario | RF-28 |

**Nota:** salvo CU-01 y CU-02, todos los casos de uso requieren una sesión activa; si no existe, el sistema responde *no autorizado*. Esta excepción general no se repite en cada caso.

---

### CU-01 Registrar usuario

| Campo | Contenido |
|---|---|
| **Nombre** | CU-01 Registrar usuario |
| **Actor(es)** | Visitante |
| **Objetivo** | Obtener una cuenta propia para usar el sistema |
| **Precondiciones** | El visitante no tiene sesión iniciada |
| **Disparador** | El visitante selecciona "Crear cuenta" |

**Flujo principal**
1. El visitante ingresa username, correo y contraseña.
2. El sistema valida el formato de los tres datos.
3. El sistema verifica que username y correo no existan (sin distinguir mayúsculas).
4. El sistema crea la cuenta con la contraseña almacenada como hash con sal.
5. El sistema confirma el registro.

**Flujos alternativos**
- 5a. El sistema inicia sesión automáticamente tras el registro (si el equipo lo decide) y lleva al usuario a su lista de eventos.

**Postcondiciones**
- Existe una cuenta nueva con username y correo únicos.
- La contraseña no se almacena en texto plano.

**Excepciones**
- E1. Formato inválido (username fuera de 3–20 caracteres o con caracteres no permitidos, correo mal formado, contraseña de menos de 8 caracteres): error de validación indicando el campo; no se crea cuenta.
- E2. Username o correo ya registrados: conflicto; no se crea cuenta.

---

### CU-02 Iniciar sesión

| Campo | Contenido |
|---|---|
| **Nombre** | CU-02 Iniciar sesión |
| **Actor(es)** | Visitante (usuario registrado) |
| **Objetivo** | Acceder al sistema como usuario identificado |
| **Precondiciones** | Existe una cuenta registrada |
| **Disparador** | El visitante selecciona "Ingresar" |

**Flujo principal**
1. El visitante ingresa username o correo y contraseña.
2. El sistema valida las credenciales.
3. El sistema crea una sesión asociada al usuario.
4. El sistema lleva al usuario a su lista de eventos.

**Flujos alternativos**
- 1a. El visitante ingresa su correo en lugar del username; el flujo continúa igual.

**Postcondiciones**
- Existe una sesión activa que expira a las 8 horas de inactividad (propuesto).

**Excepciones**
- E1. Credenciales inválidas: mensaje genérico "credenciales inválidas", sin indicar qué dato falló; no se crea sesión.
- E2. Campos vacíos: error de validación.

---

### CU-03 Cerrar sesión

| Campo | Contenido |
|---|---|
| **Nombre** | CU-03 Cerrar sesión |
| **Actor(es)** | Usuario |
| **Objetivo** | Terminar su sesión de forma segura |
| **Precondiciones** | Sesión activa |
| **Disparador** | El usuario selecciona "Cerrar sesión" |

**Flujo principal**
1. El usuario solicita cerrar sesión.
2. El sistema invalida la sesión.
3. El sistema lleva al usuario a la pantalla de ingreso.

**Flujos alternativos**
- 1a. La sesión ya expiró por inactividad: el sistema lleva al usuario a la pantalla de ingreso sin error.

**Postcondiciones**
- La sesión queda invalidada; toda solicitud posterior con ella es no autorizada.

**Excepciones**
- E1. Sesión inexistente o inválida: *no autorizado*.

---

### CU-04 Crear evento

| Campo | Contenido |
|---|---|
| **Nombre** | CU-04 Crear evento |
| **Actor(es)** | Usuario |
| **Objetivo** | Crear un agrupador para compartir gastos con otras personas |
| **Precondiciones** | Sesión activa |
| **Disparador** | El usuario selecciona "Nuevo evento" |

**Flujo principal**
1. El usuario ingresa el nombre del evento.
2. El sistema valida el nombre (1–60 caracteres).
3. El sistema crea el evento.
4. El sistema registra al creador como primer participante.
5. El sistema muestra el detalle del evento.

**Flujos alternativos**
- 5a. El usuario continúa directamente con CU-05 para vincular participantes.

**Postcondiciones**
- Existe un evento con un participante (el creador).

**Excepciones**
- E1. Nombre vacío o de más de 60 caracteres: error de validación; no se crea el evento.

---

### CU-05 Vincular participante

| Campo | Contenido |
|---|---|
| **Nombre** | CU-05 Vincular participante |
| **Actor(es)** | Participante |
| **Objetivo** | Agregar a un usuario registrado a un evento |
| **Precondiciones** | Sesión activa; el actor es participante del evento |
| **Disparador** | El participante selecciona "Agregar participante" |

**Flujo principal**
1. El participante ingresa el username o correo exacto del usuario buscado.
2. El sistema busca el usuario y muestra únicamente su username.
3. El participante selecciona al usuario.
4. El sistema lo vincula al evento.
5. El sistema muestra la lista actualizada de participantes.

**Flujos alternativos**
- 2a. No hay coincidencia: el sistema muestra resultado vacío y el participante puede intentar con otro dato.

**Postcondiciones**
- El usuario queda vinculado una sola vez al evento.

**Excepciones**
- E1. El usuario ya es participante: conflicto; la lista no cambia.
- E2. El actor no pertenece al evento o el evento no existe: *no encontrado*.
- E3. Dato de búsqueda vacío o inválido: error de validación.

---

### CU-06 Consultar eventos

| Campo | Contenido |
|---|---|
| **Nombre** | CU-06 Consultar eventos |
| **Actor(es)** | Usuario |
| **Objetivo** | Ver sus eventos y el detalle de cada uno |
| **Precondiciones** | Sesión activa |
| **Disparador** | El usuario abre su pantalla principal o selecciona un evento |

**Flujo principal**
1. El usuario solicita su lista de eventos.
2. El sistema muestra solo los eventos donde participa, con nombre, número de participantes y su saldo neto personal.
3. El usuario selecciona un evento.
4. El sistema muestra nombre, participantes y comprobantes del evento.

**Flujos alternativos**
- 2a. El usuario no tiene eventos: el sistema muestra una lista vacía con la opción de crear uno (CU-04).

**Postcondiciones**
- Ninguna (consulta sin cambios de estado).

**Excepciones**
- E1. El usuario no pertenece al evento seleccionado o este no existe: *no encontrado*.

---

### CU-07 Subir comprobante

| Campo | Contenido |
|---|---|
| **Nombre** | CU-07 Subir comprobante |
| **Actor(es)** | Pagador (participante que pagó el gasto) |
| **Objetivo** | Registrar un gasto a partir de la foto de su comprobante, sin transcribirlo |
| **Precondiciones** | Sesión activa; el actor es participante del evento |
| **Disparador** | El pagador selecciona "Subir comprobante" |

**Flujo principal**
1. El pagador selecciona o fotografía la imagen (en móvil puede abrir la cámara).
2. El sistema valida que sea una imagen real, de formato JPG, PNG o WEBP y de máximo 5 MB.
3. El sistema verifica que la misma imagen no exista en el evento.
4. El sistema crea el comprobante en estado `PROCESANDO` con el usuario como pagador.
5. El sistema registra una tarea de extracción para el Worker.
6. El sistema responde de inmediato con el estado `PROCESANDO`.

**Flujos alternativos**
- 3a. La imagen ya fue subida en el evento: el sistema no crea un comprobante nuevo y muestra el existente.
- 6a. El pagador, sin esperar, continúa con otras acciones y consulta el estado después (CU-09).

**Postcondiciones**
- Existe un comprobante en `PROCESANDO` con una única tarea de extracción.

**Excepciones**
- E1. Formato no permitido, tamaño excedido o archivo que no es una imagen real: error de validación; no se crea comprobante.
- E2. El actor no pertenece al evento: *no encontrado*.
- E3. Falla al guardar la imagen: error controlado; no queda comprobante a medias.

---

### CU-08 Procesar comprobante con OCR

| Campo | Contenido |
|---|---|
| **Nombre** | CU-08 Procesar comprobante con OCR |
| **Actor(es)** | Worker (principal), Servicio OCR (secundario) |
| **Objetivo** | Extraer monto e ítems del comprobante sin bloquear al usuario y sin duplicar resultados |
| **Precondiciones** | Existe un comprobante en `PROCESANDO` con una tarea pendiente |
| **Disparador** | El Worker detecta una tarea pendiente |

**Flujo principal**
1. El Worker toma la tarea de forma exclusiva.
2. El Worker envía la imagen al Servicio OCR con un tiempo de espera máximo.
3. El Servicio OCR devuelve los datos extraídos.
4. El Worker valida la estructura y la consistencia de la respuesta (monto total presente y positivo, ítems coherentes).
5. El Worker guarda monto e ítems y cambia el comprobante a `EXTRAÍDO`.
6. El Worker marca la tarea como terminada.

**Flujos alternativos**
- 3a. El OCR no devuelve ítems pero sí el monto total: se guarda solo el monto y el comprobante pasa a `EXTRAÍDO`; el pagador podrá agregar ítems en CU-12.
- 3b. El OCR falla de forma transitoria (timeout, error de conexión, error 5xx, límite de uso): el Worker reintenta con espera creciente hasta el máximo de intentos (valor propuesto: 3).

**Postcondiciones**
- El comprobante queda en `EXTRAÍDO` o `FALLIDO`.
- Nunca existen datos extraídos duplicados para el mismo comprobante.

**Excepciones**
- E1. Reintentos agotados: el comprobante pasa a `FALLIDO` con un motivo en lenguaje claro.
- E2. Respuesta incompleta, con formato inesperado o inconsistente: se trata como fallo (reintento o `FALLIDO`); nunca se guardan datos no validados.
- E3. La tarea ya fue procesada (reentrega o ejecución repetida): se ignora sin alterar los datos.
- E4. El Worker se detiene a mitad de la tarea: la tarea vuelve a quedar disponible y se procesa luego sin duplicar.

---

### CU-09 Consultar estado y reintentar procesamiento

| Campo | Contenido |
|---|---|
| **Nombre** | CU-09 Consultar estado y reintentar procesamiento |
| **Actor(es)** | Participante (consulta), Pagador (reintento) |
| **Objetivo** | Saber si el comprobante está listo y recuperarse de una extracción fallida |
| **Precondiciones** | Sesión activa; el actor es participante del evento |
| **Disparador** | El actor abre un comprobante o la pantalla lo consulta periódicamente |

**Flujo principal**
1. El actor consulta el estado del comprobante.
2. El sistema muestra el estado actual (`PROCESANDO`, `EXTRAÍDO`, `FALLIDO` o `CONFIRMADO`).
3. Si es `FALLIDO`, el sistema muestra el motivo.
4. El pagador selecciona "Reintentar".
5. El sistema cambia el comprobante a `PROCESANDO` y registra una única tarea de extracción.

**Flujos alternativos**
- 2a. El estado es `PROCESANDO`: la pantalla vuelve a consultar cada pocos segundos hasta que cambie.
- 4a. En lugar de reintentar, el pagador elige ingresar los datos manualmente (CU-10).

**Postcondiciones**
- Tras un reintento, el comprobante está en `PROCESANDO` con una sola tarea activa.

**Excepciones**
- E1. El estado no es `FALLIDO` al reintentar: conflicto.
- E2. El actor que reintenta no es el pagador: no autorizado.
- E3. El actor no pertenece al evento: *no encontrado*.
- E4. Reintento repetido (doble clic): no se crea una segunda tarea.

---

### CU-10 Ingresar comprobante manualmente

| Campo | Contenido |
|---|---|
| **Nombre** | CU-10 Ingresar comprobante manualmente |
| **Actor(es)** | Pagador |
| **Objetivo** | Registrar un gasto sin imagen, o completar uno cuya extracción falló |
| **Precondiciones** | Sesión activa; el actor es participante; si completa uno existente, este está `FALLIDO` y el actor es su pagador |
| **Disparador** | El pagador selecciona "Ingresar manualmente" |

**Flujo principal**
1. El pagador ingresa descripción y monto total.
2. El pagador agrega, opcionalmente, ítems con descripción, cantidad y precio unitario.
3. El sistema valida los datos.
4. El sistema crea el comprobante (o completa el `FALLIDO`) y lo deja en `EXTRAÍDO`.

**Flujos alternativos**
- 2a. El pagador no agrega ítems: solo podrá usar reparto equitativo en CU-13.

**Postcondiciones**
- Existe un comprobante en `EXTRAÍDO`, pendiente de revisión y confirmación.

**Excepciones**
- E1. Monto ≤ 0, con más de 2 decimales, o ítems con cantidad o precio inválidos: error de validación.
- E2. El comprobante a completar no está `FALLIDO`: conflicto.
- E3. El actor no pertenece al evento: *no encontrado*.

---

### CU-11 Listar comprobantes del evento

| Campo | Contenido |
|---|---|
| **Nombre** | CU-11 Listar comprobantes del evento |
| **Actor(es)** | Participante |
| **Objetivo** | Ver los gastos registrados en el evento y su estado |
| **Precondiciones** | Sesión activa; el actor es participante |
| **Disparador** | El participante abre la sección de comprobantes del evento |

**Flujo principal**
1. El participante solicita la lista de comprobantes.
2. El sistema muestra pagador, monto, estado y fecha de cada uno, del más reciente al más antiguo.

**Flujos alternativos**
- 2a. El evento no tiene comprobantes: el sistema muestra una lista vacía con la opción de subir uno (CU-07).

**Postcondiciones**
- Ninguna (consulta).

**Excepciones**
- E1. El actor no pertenece al evento: *no encontrado*.

---

### CU-12 Revisar y corregir datos extraídos

| Campo | Contenido |
|---|---|
| **Nombre** | CU-12 Revisar y corregir datos extraídos |
| **Actor(es)** | Pagador |
| **Objetivo** | Verificar y corregir lo que leyó el OCR antes de generar deudas |
| **Precondiciones** | El comprobante está `EXTRAÍDO` y el actor es su pagador |
| **Disparador** | El pagador abre un comprobante `EXTRAÍDO` |

**Flujo principal**
1. El sistema muestra monto total, descripción e ítems (cantidad, precio unitario y subtotal).
2. El pagador corrige los datos que sean erróneos y registra impuestos, propina y descuentos como montos.
3. El sistema valida los datos y los guarda.
4. El pagador continúa con la configuración del reparto (CU-13).

**Flujos alternativos**
- 2a. Los datos son correctos: el pagador no modifica nada y continúa.
- 2b. El pagador agrega o elimina ítems.

**Postcondiciones**
- Los datos del comprobante han sido revisados por una persona.
- No se generan deudas hasta la confirmación (CU-14).

**Excepciones**
- E1. Montos, cantidades o precios inválidos: error de validación; no se guardan los cambios.
- E2. El comprobante ya está `CONFIRMADO`: conflicto; no es editable.
- E3. El actor no es el pagador: no autorizado.

---

### CU-13 Configurar reparto

| Campo | Contenido |
|---|---|
| **Nombre** | CU-13 Configurar reparto |
| **Actor(es)** | Pagador |
| **Objetivo** | Definir cómo se divide el gasto entre los participantes |
| **Precondiciones** | El comprobante está `EXTRAÍDO` y el actor es su pagador |
| **Disparador** | El pagador selecciona "Configurar reparto" |

**Flujo principal**
1. El pagador elige la modalidad: equitativo o por ítems.
2. Si es equitativo, selecciona los participantes que dividen el gasto (por defecto, todos).
3. Si es por ítems, asigna cada unidad de cada ítem a un participante.
4. El sistema guarda la configuración.

**Flujos alternativos**
- 3a. Un ítem de cantidad 2 se asigna a personas distintas (una unidad a cada una) o a la misma persona (las dos unidades).
- 1a. El pagador cambia de modalidad: la configuración anterior se descarta.

**Postcondiciones**
- La configuración queda guardada y puede editarse hasta la confirmación.

**Excepciones**
- E1. No se selecciona ningún participante en reparto equitativo: error de validación.
- E2. Se asigna una unidad a alguien que no es participante: error de validación.
- E3. El comprobante ya está `CONFIRMADO`: conflicto.
- E4. El comprobante no tiene ítems y se elige reparto por ítems: error de validación; se sugiere equitativo o agregar ítems.

---

### CU-14 Confirmar reparto y generar deudas

| Campo | Contenido |
|---|---|
| **Nombre** | CU-14 Confirmar reparto y generar deudas |
| **Actor(es)** | Pagador; Sistema (cálculo) |
| **Objetivo** | Cerrar el reparto y generar las deudas de los demás participantes |
| **Precondiciones** | Comprobante `EXTRAÍDO`, datos revisados y reparto configurado y completo |
| **Disparador** | El pagador selecciona "Confirmar" |

**Flujo principal**
1. El pagador solicita confirmar.
2. El sistema verifica que no haya unidades sin asignar y que ítems + impuestos + propina − descuentos coincida con el total.
3. El sistema calcula la parte de cada participante en centavos exactos, distribuyendo impuestos, propina y descuentos proporcionalmente.
4. El sistema asigna los centavos sobrantes con una regla fija y repetible.
5. El sistema verifica que la suma de las partes sea igual al total del comprobante.
6. El sistema cambia el comprobante a `CONFIRMADO`.
7. El sistema genera una deuda por cada participante distinto del pagador, con saldo igual a su parte, todas o ninguna.
8. El sistema muestra el resumen de deudas generadas.

**Flujos alternativos**
- 3a. Reparto equitativo: el total se divide entre los participantes seleccionados.
- 7a. Un participante tiene parte igual a cero (no consumió nada): no se genera deuda para él.

**Postcondiciones**
- El comprobante está `CONFIRMADO` y no es editable.
- Cada deuda tiene saldo pendiente igual a su monto.
- La suma de las partes (incluida la del pagador) es igual al total del comprobante.

**Excepciones**
- E1. Unidades sin asignar: validación, indicando cuáles; no se genera nada.
- E2. Los ítems, impuestos y descuentos no cuadran con el total: validación, indicando la diferencia.
- E3. El comprobante ya está `CONFIRMADO` o aún no `EXTRAÍDO`: conflicto; no se duplican deudas.
- E4. Falla durante la generación de deudas: se revierte todo; el comprobante sigue `EXTRAÍDO`.
- E5. El actor no es el pagador: no autorizado.

---

### CU-15 Registrar pago con evidencia

| Campo | Contenido |
|---|---|
| **Nombre** | CU-15 Registrar pago con evidencia |
| **Actor(es)** | Deudor |
| **Objetivo** | Declarar un pago hecho fuera del sistema para que el acreedor lo confirme |
| **Precondiciones** | Sesión activa; el actor es el deudor de una deuda con saldo disponible mayor a cero |
| **Disparador** | El deudor selecciona "Registrar pago" en una de sus deudas |

**Flujo principal**
1. El deudor ingresa monto, método (efectivo, Yape, Plin, transferencia bancaria u otro) y referencia opcional.
2. El deudor adjunta la imagen de evidencia (obligatoria salvo en efectivo).
3. El sistema valida los datos, la referencia y la imagen.
4. El sistema verifica que el monto no supere el saldo disponible vigente.
5. El sistema registra el pago como `PENDIENTE` y reserva ese monto.
6. El sistema muestra el pago registrado y el nuevo saldo disponible.

**Flujos alternativos**
- 2a. El método es efectivo: la evidencia es opcional; si no se adjunta, el acreedor confirmará por haber recibido el dinero en mano.
- 1a. El deudor paga solo una parte: queda saldo disponible para pagos posteriores.

**Postcondiciones**
- Existe un pago `PENDIENTE` que reserva su monto.
- Pagos confirmados + pagos pendientes ≤ monto de la deuda.
- El saldo pendiente no cambia hasta que el acreedor confirme.

**Excepciones**
- E1. Monto ≤ 0, con más de 2 decimales, método no válido o referencia inválida: error de validación.
- E2. Falta la evidencia en un método que la exige: error de validación; no se reserva saldo.
- E3. Imagen con formato, tamaño o contenido inválido: error de validación.
- E4. El monto supera el saldo disponible, incluso porque otro pago simultáneo ya lo reservó: conflicto; el saldo no cambia.
- E5. La deuda ya está saldada: conflicto.
- E6. El actor no es el deudor: *no encontrado*.
- E7. Reenvío idéntico (doble clic o reintento de red): se mantiene un solo pago.

---

### CU-16 Cancelar pago pendiente

| Campo | Contenido |
|---|---|
| **Nombre** | CU-16 Cancelar pago pendiente |
| **Actor(es)** | Deudor |
| **Objetivo** | Retirar un pago registrado por error antes de que sea resuelto |
| **Precondiciones** | El pago está `PENDIENTE` y el actor es quien lo registró |
| **Disparador** | El deudor selecciona "Cancelar" sobre un pago pendiente |

**Flujo principal**
1. El deudor solicita cancelar el pago.
2. El sistema verifica que siga `PENDIENTE`.
3. El sistema cambia el pago a `CANCELADO`.
4. El sistema libera el monto reservado.

**Flujos alternativos**
- 4a. El deudor registra de inmediato un nuevo pago con el monto correcto (CU-15).

**Postcondiciones**
- El pago queda `CANCELADO` y el saldo disponible se restablece.

**Excepciones**
- E1. El acreedor ya lo confirmó o rechazó: conflicto; el estado resuelto prevalece.
- E2. Confirmación y cancelación simultáneas: solo una prevalece; la otra recibe conflicto.
- E3. El actor no es quien registró el pago: *no encontrado*.

---

### CU-17 Revisar pagos por confirmar

| Campo | Contenido |
|---|---|
| **Nombre** | CU-17 Revisar pagos por confirmar |
| **Actor(es)** | Acreedor |
| **Objetivo** | Ver los pagos que le declararon y revisar su evidencia |
| **Precondiciones** | Sesión activa; el actor es acreedor de al menos una deuda |
| **Disparador** | El acreedor abre "Pagos por confirmar" o lo selecciona desde sus pendientes (CU-23) |

**Flujo principal**
1. El acreedor solicita sus pagos `PENDIENTE`.
2. El sistema muestra deudor, deuda, monto, método, referencia y fecha, del más antiguo al más reciente.
3. El acreedor abre un pago.
4. El sistema muestra la imagen de evidencia.
5. El acreedor decide confirmar (CU-18) o rechazar (CU-19).

**Flujos alternativos**
- 1a. No hay pagos pendientes: lista vacía.
- 4a. El pago es en efectivo sin evidencia: el sistema indica que no hay imagen adjunta.

**Postcondiciones**
- Ninguna (consulta).

**Excepciones**
- E1. El actor no es el acreedor de esa deuda: *no encontrado* (incluida la evidencia).
- E2. La imagen no se puede recuperar: error controlado; el pago sigue visible para decidir.

---

### CU-18 Confirmar pago recibido

| Campo | Contenido |
|---|---|
| **Nombre** | CU-18 Confirmar pago recibido |
| **Actor(es)** | Acreedor |
| **Objetivo** | Reconocer que recibió el dinero y reducir la deuda |
| **Precondiciones** | El pago está `PENDIENTE` y el actor es acreedor de esa deuda |
| **Disparador** | El acreedor selecciona "Confirmar" sobre un pago pendiente |

**Flujo principal**
1. El acreedor revisa la evidencia o verifica que recibió el dinero en mano.
2. El acreedor confirma el pago.
3. El sistema verifica que siga `PENDIENTE`.
4. El sistema cambia el pago a `CONFIRMADO`.
5. El sistema reduce el saldo pendiente de la deuda en el monto del pago.

**Flujos alternativos**
- 5a. El pago salda la deuda por completo: la deuda queda con saldo cero.

**Postcondiciones**
- Saldo pendiente = monto de la deuda − pagos confirmados.
- El monto ya no está reservado, sino aplicado.

**Excepciones**
- E1. El pago fue cancelado, rechazado o ya confirmado: conflicto; el saldo no cambia.
- E2. Cancelación simultánea del deudor: solo una operación prevalece.
- E3. El actor no es el acreedor de la deuda: *no encontrado*.

---

### CU-19 Rechazar pago

| Campo | Contenido |
|---|---|
| **Nombre** | CU-19 Rechazar pago |
| **Actor(es)** | Acreedor |
| **Objetivo** | Desestimar un pago que no recibió o que es incorrecto |
| **Precondiciones** | El pago está `PENDIENTE` y el actor es acreedor de esa deuda |
| **Disparador** | El acreedor selecciona "Rechazar" sobre un pago pendiente |

**Flujo principal**
1. El acreedor ingresa el motivo (máx. 200 caracteres).
2. El sistema valida el motivo.
3. El sistema verifica que el pago siga `PENDIENTE`.
4. El sistema cambia el pago a `RECHAZADO` y libera el monto reservado.
5. El sistema deja el rechazo visible para el deudor, con su motivo, en sus pendientes.

**Flujos alternativos**
- 5a. El deudor registra un nuevo pago corregido (CU-15).

**Postcondiciones**
- El pago queda `RECHAZADO` con motivo y el saldo disponible se restablece.
- El saldo pendiente no cambia.

**Excepciones**
- E1. Motivo vacío o de más de 200 caracteres: error de validación.
- E2. El pago ya fue resuelto o cancelado: conflicto.
- E3. El actor no es el acreedor de la deuda: *no encontrado*.

---

### CU-20 Consultar mis deudas y cobros

| Campo | Contenido |
|---|---|
| **Nombre** | CU-20 Consultar mis deudas y cobros |
| **Actor(es)** | Participante |
| **Objetivo** | Saber cuánto debe y cuánto le deben, en el detalle de cada deuda |
| **Precondiciones** | Sesión activa; el actor es participante del evento |
| **Disparador** | El participante abre "Mis deudas" o "Me deben" |

**Flujo principal**
1. El participante solicita lo que debe.
2. El sistema lista sus deudas como deudor: acreedor, comprobante, monto, saldo pendiente y saldo disponible.
3. El participante solicita lo que le deben.
4. El sistema lista sus deudas como acreedor: deudor, monto y saldo pendiente.

**Flujos alternativos**
- 2a. No tiene deudas: lista vacía.
- 2b. Selecciona una deuda para ver su historial (CU-21) o registrar un pago (CU-15).

**Postcondiciones**
- Ninguna (consulta).

**Excepciones**
- E1. El actor no pertenece al evento: *no encontrado*.

---

### CU-21 Consultar historial de una deuda

| Campo | Contenido |
|---|---|
| **Nombre** | CU-21 Consultar historial de una deuda |
| **Actor(es)** | Deudor o Acreedor de la deuda |
| **Objetivo** | Revisar todos los pagos de una deuda y su evidencia |
| **Precondiciones** | Sesión activa; el actor es deudor o acreedor de esa deuda |
| **Disparador** | El actor abre una deuda |

**Flujo principal**
1. El actor solicita el historial de la deuda.
2. El sistema lista todos los pagos, en cualquier estado, con quién, cuándo, monto y estado.
3. El sistema muestra el saldo pendiente y confirma que pagos confirmados + saldo pendiente = monto total.
4. El actor abre la evidencia de un pago.

**Flujos alternativos**
- 2a. La deuda no tiene pagos: historial vacío.
- 4a. El pago no tiene evidencia (efectivo): se indica que no hay imagen.

**Postcondiciones**
- Ninguna (consulta).

**Excepciones**
- E1. El actor es otro participante del evento: *no encontrado*.
- E2. El actor no pertenece al evento: *no encontrado*.

---

### CU-22 Consultar balance del evento

| Campo | Contenido |
|---|---|
| **Nombre** | CU-22 Consultar balance del evento |
| **Actor(es)** | Participante |
| **Objetivo** | Ver cómo va el grupo: quién pagó, quién debe y quién tiene por cobrar |
| **Precondiciones** | Sesión activa; el actor es participante |
| **Disparador** | El participante abre "Balance" del evento |

**Flujo principal**
1. El participante solicita el balance.
2. El sistema calcula los valores con los pagos `CONFIRMADO`.
3. El sistema muestra, por cada participante, el total pagado, lo que debe, lo que le deben y su saldo neto.
4. El sistema muestra los totales del evento (gasto total, total confirmado, total pendiente) y los pagos en revisión.

**Flujos alternativos**
- 4a. Todas las deudas están saldadas: el total pendiente es S/ 0.00.
- 4b. Hay pagos registrándose a la vez: el balance refleja un estado consistente, sin valores intermedios incoherentes.

**Postcondiciones**
- Ninguna (consulta). El detalle de deudas y pagos sigue restringido a deudor y acreedor.

**Excepciones**
- E1. El actor no pertenece al evento: *no encontrado*.
- E2. El evento no tiene gastos confirmados: se muestran valores en cero.

---

### CU-23 Consultar pendientes

| Campo | Contenido |
|---|---|
| **Nombre** | CU-23 Consultar pendientes |
| **Actor(es)** | Usuario |
| **Objetivo** | Saber qué debe atender, sin notificaciones push |
| **Precondiciones** | Sesión activa |
| **Disparador** | El usuario abre su bandeja de pendientes |

**Flujo principal**
1. El usuario abre su bandeja.
2. El sistema muestra un contador y la lista de: pagos por confirmar (como acreedor), pagos rechazados (como deudor) y comprobantes `FALLIDO` o `EXTRAÍDO` por revisar (como pagador).
3. El usuario selecciona un pendiente.
4. El sistema lleva al caso de uso correspondiente (CU-17, CU-15, CU-09 o CU-12).

**Flujos alternativos**
- 2a. No hay pendientes: contador en cero y mensaje vacío.
- 2b. La pantalla actualiza el contador periódicamente mientras está abierta.

**Postcondiciones**
- Ninguna (consulta).

**Excepciones**
- E1. Sesión expirada: *no autorizado*; el usuario vuelve a ingresar (CU-02).

---

### Trazabilidad RF → CU

| RF | CU | RF | CU |
|---|---|---|---|
| RF-01 | CU-01 | RF-15 | CU-13 |
| RF-02 | CU-02 | RF-16 | CU-14 |
| RF-03 | CU-03 | RF-17 | CU-14 |
| RF-04 | CU-04 | RF-18 | CU-15 |
| RF-05, RF-06 | CU-05 | RF-19 | CU-16 |
| RF-07, RF-08 | CU-06 | RF-20 | CU-17 |
| RF-09 | CU-07, CU-08 | RF-21 | CU-18 |
| RF-10, RF-11 | CU-08, CU-09 | RF-22 | CU-19 |
| RF-12 | CU-10 | RF-23 | CU-17, CU-21 |
| RF-13 | CU-11 | RF-24, RF-25 | CU-20 |
| RF-14 | CU-12 | RF-26 | CU-21 |
| RF-27 | CU-22 | RF-28 | CU-23 |