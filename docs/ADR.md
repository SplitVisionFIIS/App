# SplitVision — Decisiones de diseño (ADR)

**Curso:** Construcción de Software II (SW707) · **Versión:** v1.0

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React + Vite + TypeScript |
| **Backend** | Node.js + NestJS + TypeScript |
| **API** | REST + JSON |
| **Base de datos** | PostgreSQL |
| **Acceso a datos** | TypeORM + SQL nativo para operaciones críticas |
| **Pruebas** | Vitest/Jest + Testcontainers + fast-check |
| **Build y dependencias** | npm + `package-lock.json` |
| **Contenedores** | Docker Compose |


Las categorías corresponden a las siete categorías de decisiones de diseño: 

(1) Asignación de Responsabilidades, 

(2) Modelo de Coordinación, 

(3) Modelo de Datos, 

(4) Gestión de Recursos, 

(5) Mapeo entre Elementos Arquitectónicos, 

(6) Tiempo de Enlace y 

(7) Elección de Tecnología.

**Aviso de uso:** la fila "Fuentes a consultar" indica dónde verificar lo afirmado en cada ADR. Antes de entregar, contrasten las afirmaciones técnicas y los valores numéricos (marcados como *propuesto*) con esas fuentes y con sus propias mediciones. Tres decisiones dependen de datos que el equipo debe confirmar: **ADR-31** (lenguaje), **ADR-36** (proveedor de OCR) y **ADR-37** (frontend).

## Índice

| Cat. | ADR | Decisión |
|---|---|---|
| 1 | ADR-01 | Monolito modular frente a microservicios |
| 1 | ADR-02 | Dominio puro con puertos y adaptadores |
| 1 | ADR-03 | Mecanismo de contratos (Design by Contract) |
| 1 | ADR-04 | Política de errores y excepciones |
| 1 | ADR-05 | Autorización por pertenencia al evento y a la deuda |
| 1 | ADR-06 | Regla de asignación de centavos residuales |
| 2 | ADR-07 | Control de concurrencia en pagos |
| 2 | ADR-08 | Estrategia de idempotencia |
| 2 | ADR-09 | Procesamiento asíncrono del OCR |
| 2 | ADR-10 | Tolerancia a fallas en la integración con el OCR |
| 2 | ADR-11 | Notificación del estado al cliente |
| 2 | ADR-12 | Estilo de API |
| 2 | ADR-13 | Gestión de sesión |
| 3 | ADR-14 | Modelo de datos relacional |
| 3 | ADR-15 | Representación del dinero |
| 3 | ADR-16 | Modelado de saldos y reservas |
| 3 | ADR-17 | Modelado de los estados |
| 3 | ADR-18 | Asignación de unidades de un ítem |
| 3 | ADR-19 | Almacenamiento de imágenes |
| 4 | ADR-20 | Pool de conexiones y tiempos de bloqueo |
| 4 | ADR-21 | Arrendamiento y concurrencia del worker |
| 4 | ADR-22 | Control y validación de archivos subidos |
| 4 | ADR-23 | Limitación de intentos de login |
| 5 | ADR-24 | Mapeo de módulos a procesos |
| 5 | ADR-25 | Mapeo de procesos a infraestructura |
| 5 | ADR-26 | Entrega del frontend |
| 6 | ADR-27 | Configuración externalizada y parámetros de dominio |
| 6 | ADR-28 | Selección del cliente OCR (real o simulado) |
| 6 | ADR-29 | Migraciones de esquema |
| 6 | ADR-30 | Mensajes y localización |
| 7 | ADR-31 | Lenguaje y plataforma |
| 7 | ADR-32 | Framework de backend |
| 7 | ADR-33 | Base de datos |
| 7 | ADR-34 | Acceso a datos |
| 7 | ADR-35 | Algoritmo de hash de contraseñas |
| 7 | ADR-36 | Proveedor de OCR |
| 7 | ADR-37 | Tecnología de frontend |
| 7 | ADR-38 | Estrategia y herramientas de pruebas |
| 7 | ADR-39 | Gestión de dependencias y build |
| 7 | ADR-40 | Logging estructurado y correlación |

---

# Categoría 1: Asignación de Responsabilidades

## ADR-01: Elección entre monolito modular y microservicios

| Sección | Descripción |
|---|---|
| **Título** | Elección entre monolito modular, microservicios y monolito en capas sin módulos |
| **Contexto** | Equipo de 3 integrantes y un semestre para entregar v1.0 (parcial) y evolucionar a v2.0 (final). Hay seis áreas de negocio (identidad, eventos, comprobantes, OCR/jobs, reparto, deudas/pagos). Los retos críticos (concurrencia en pagos, tolerancia a fallas del OCR, precisión de montos) no dependen de distribuir el sistema. El curso acepta no dividir artificialmente el sistema si se demuestra comprensión del problema de distribución. Atributos priorizados: consistencia, verificabilidad, mantenibilidad. |
| **Alternativas** | **A. Monolito modular:** un solo código base dividido en módulos con interfaces explícitas y una sola base de datos. Ventaja: transacciones locales ACID entre módulos y despliegue simple. Limitación: el acoplamiento se controla solo con disciplina o pruebas.<br>**B. Microservicios:** un servicio por área, con su base de datos. Ventaja: despliegue y escalado independientes. Limitación: el pago y el saldo ya no podrían compartir una transacción local (exigiría sagas o consistencia eventual), más operación, observabilidad distribuida y mayor costo para un equipo pequeño.<br>**C. Monolito en capas sin módulos:** capas técnicas (controladores, servicios, repositorios) sin fronteras por área. Ventaja: es lo más rápido de arrancar. Limitación: crece como una sola masa, dificulta el análisis de impacto y la ingeniería reversa del final. |
| **Criterios de Elección** | Consistencia transaccional entre deuda y pago (RNF-01, RNF-03); costo de construcción y operación para 3 personas; facilidad de pruebas reproducibles (RNF-32); capacidad de evolucionar hacia la extracción de un servicio en el final (reingeniería); claridad de fronteras para mantenimiento (RNF-37). |
| **Decisión** | Se adopta un monolito modular con módulos por área de negocio y una sola base de datos. |
| **Sustento** | La invariante central (pagos confirmados + pendientes ≤ monto) se protege de forma simple y verificable con una transacción local; en microservicios habría que coordinar varios servicios para lo mismo. Los módulos dan fronteras claras sin el costo operativo de la distribución. Se sacrifica el escalado independiente por área, aceptable con la carga objetivo (50 usuarios concurrentes, RNF-22). El problema de distribución se aborda de forma real separando el worker del OCR como proceso aparte (ADR-24), y el módulo `ocr` queda como candidato natural para extraerse como servicio en la reingeniería del final. |
| **Fuentes a consultar** | Bass, Clements y Kazman, *Software Architecture in Practice*; Newman, *Building Microservices* (capítulos sobre cuándo no usar microservicios); Fowler, "MonolithFirst". |

## ADR-02: Elección de la estructura interna de cada módulo

| Sección | Descripción |
|---|---|
| **Título** | Elección entre dominio puro con puertos y adaptadores, capas tradicionales y scripts transaccionales |
| **Contexto** | El motor de reparto y las reglas de pago son el núcleo con contratos (RNF-34) y deben probarse de forma aislada, con miles de casos aleatorios (RNF-02). Las integraciones (OCR, almacenamiento, base de datos) cambian con el tiempo (RNF-38). El final exige refactorización y pruebas de caracterización sobre un componente existente. |
| **Alternativas** | **A. Dominio puro con puertos y adaptadores (hexagonal):** el dominio no depende de frameworks; define interfaces (puertos) que implementan adaptadores (TypeORM, HTTP, archivos). Ventaja: pruebas rápidas sin infraestructura y sustitución de adaptadores. Limitación: más clases e indirección.<br>**B. Capas tradicionales (controlador, servicio, repositorio):** el servicio mezcla reglas y acceso a datos con entidades del ORM. Ventaja: es el estilo más difundido y rápido. Limitación: las reglas quedan acopladas al ORM y a la base de datos, por lo que probarlas exige infraestructura.<br>**C. Transaction script:** un procedimiento por caso de uso con las reglas incluidas. Ventaja: mínimo código inicial. Limitación: duplicación de reglas y dificultad para expresar invariantes. |
| **Criterios de Elección** | Aislamiento para pruebas por propiedades; facilidad para aplicar contratos; reemplazo del proveedor de OCR y del almacenamiento; verificabilidad automática de las dependencias; costo de construcción adicional. |
| **Decisión** | Cada módulo se organiza en `api`, `application`, `domain` e `infrastructure`, con el dominio independiente de NestJS y de TypeORM. |
| **Sustento** | Permite probar el reparto y las reglas de pago en milisegundos y sin base de datos, y ejecutar muchos casos aleatorios (RNF-33). Las transacciones se definen en `application`, donde se orquestan los casos de uso. El costo (más interfaces y mapeos entre entidades de dominio y de persistencia) se acepta porque las reglas críticas ganan verificabilidad. La regla "las dependencias apuntan hacia adentro" se comprueba automáticamente con una prueba arquitectónica (RNF-37) y sirve de evidencia para la ingeniería reversa. |
| **Fuentes a consultar** | Cockburn, "Hexagonal Architecture"; Fowler, *Patterns of Enterprise Application Architecture* (Transaction Script, Domain Model); herramientas de pruebas arquitectónicas compatibles con TypeScript, como dependency-cruiser. |

## ADR-03: Elección del mecanismo de contratos

| Sección | Descripción |
|---|---|
| **Título** | Elección entre clase propia de contratos, Bean Validation y aserciones del lenguaje |
| **Contexto** | El curso exige al menos 3 rutinas con precondiciones, postcondiciones o invariantes (reparto, registro de pago, validación de la respuesta del OCR). Los contratos deben activarse siempre, producir errores tipados y poder ejercitarse con pruebas que los violen (RNF-34). |
| **Alternativas** | **A. Clase propia `Contract` (`require`, `ensure`, `invariant`)** que lanza una excepción tipada de la jerarquía de errores. Ventaja: siempre activa, mensajes claros y control total. Limitación: hay que mantenerla y no tiene herencia automática de contratos.<br>**B. Bean Validation (Jakarta) con anotaciones:** declarativa y muy usada en la capa web. Ventaja: estándar y concisa. Limitación: pensada para validar datos de entrada, no postcondiciones ni invariantes de operaciones.<br>**C. Sentencia `assert` del lenguaje:** sin dependencias. Limitación: las aserciones están desactivadas por defecto en la JVM, por lo que no protegerían en ejecución normal. |
| **Criterios de Elección** | Que el contrato se verifique siempre; que distinga precondición, postcondición e invariante; que el error sea tipado y mapeable a respuestas (ADR-04); costo de adopción; capacidad de demostrarlo en la defensa. |
| **Decisión** | Se usa una clase propia `Contract` en el módulo compartido, complementada con Bean Validation solo para la validación de formato en la capa `api`. |
| **Sustento** | Garantiza que la precondición `monto ≤ saldo` y la postcondición "suma de partes = total" se evalúen en todos los entornos, y que su violación produzca una excepción que el manejador global traduce a una respuesta controlada. Bean Validation se mantiene donde es fuerte (formato de campos), sin forzarlo a expresar invariantes. Se sacrifica el uso de una librería de contratos y se asume el mantenimiento de una clase pequeña, aceptable por su tamaño y por el control que da en la defensa. |
| **Fuentes a consultar** | Meyer, *Object-Oriented Software Construction* (Design by Contract); especificación Jakarta Bean Validation; Java Language Specification / documentación de `assert`. |

## ADR-04: Elección de la política de errores y excepciones

| Sección | Descripción |
|---|---|
| **Título** | Elección entre jerarquía de excepciones de dominio con manejador global y resultados explícitos (Result/Either) |
| **Contexto** | La rúbrica del parcial asigna 15 % a errores y excepciones. Hay cuatro tipos de error funcional (validación, no autorizado, no encontrado, conflicto) más fallas externas e internas. La API debe devolver un formato uniforme y estable, sin trazas ni datos internos (RNF-18, RNF-30). |
| **Alternativas** | **A. Jerarquía de excepciones de dominio** (`DomainException` y subtipos) lanzadas por el dominio y traducidas por un manejador global a respuestas HTTP. Ventaja: el flujo exitoso queda limpio, integra el rollback de transacciones y es el idioma habitual del framework. Limitación: el flujo de control por excepciones puede ocultar caminos de error.<br>**B. Tipo `Result`/`Either` en cada operación:** los errores son parte de la firma. Ventaja: errores explícitos y verificados por el compilador. Limitación: no es idiomático en el lenguaje y exige adaptar el framework y las transacciones.<br>**C. Códigos de retorno o booleanos:** simple, pero se pierde el motivo, se olvida comprobarlos y no deshace transacciones. |
| **Criterios de Elección** | Uniformidad de respuestas; rollback transaccional automático; separación entre errores esperados y fallas inesperadas; integración con el framework; facilidad de prueba por tipo de error. |
| **Decisión** | Se adopta una jerarquía de excepciones de dominio (validación, no autorizado, no encontrado, conflicto, falla externa) con un manejador global que produce un formato de error único con código estable. |
| **Sustento** | Cada tipo de error se asocia a un código HTTP y a un código de negocio estable (útil para la localización, ADR-30). Una excepción lanzada dentro de una transacción provoca su reversión, que es lo que exigen RNF-03 y los escenarios EC-06. Las fallas inesperadas se registran con nivel de error y se responden de forma genérica. Se sacrifica la explicitud de `Result`, y se compensa con pruebas por cada tipo de error y con una política escrita (sección 7 del documento técnico). |
| **Fuentes a consultar** | Bloch, *Effective Java* (ítems sobre excepciones); documentación de manejo de errores del framework elegido; RFC 9457 (Problem Details for HTTP APIs). |

## ADR-05: Elección del mecanismo de autorización

| Sección | Descripción |
|---|---|
| **Título** | Elección entre guardas explícitas en la capa de aplicación, seguridad por anotaciones y filtros por ruta |
| **Contexto** | La autorización depende de datos: pertenencia al evento, rol por comprobante (pagador) y rol por deuda (deudor o acreedor). Quien no corresponde debe recibir "no encontrado" para no revelar la existencia del recurso (RNF-14, RNF-15). Debe probarse con una matriz rol × operación. |
| **Alternativas** | **A. Guardas explícitas en los casos de uso** (`EventAccessGuard`, verificación de rol en la operación). Ventaja: la regla vive junto a la operación, es testeable y devuelve "no encontrado" sin depender de la web. Limitación: hay que invocarlas en cada caso de uso (se mitiga con pruebas).<br>**B. Seguridad de métodos por anotaciones (expresiones):** declarativa. Ventaja: concisa. Limitación: las expresiones sobre datos del dominio son difíciles de probar y de leer, y por defecto responden "prohibido".<br>**C. Filtros o reglas por URL:** buenos para "requiere sesión" y roles globales. Limitación: no conocen el evento ni la deuda del recurso. |
| **Criterios de Elección** | Capacidad de expresar reglas por recurso; respuesta uniforme "no encontrado"; testeabilidad; posibilidad de verificar que ningún caso de uso omita la autorización. |
| **Decisión** | La sesión se exige con filtros de seguridad (identidad), y la autorización por evento, pagador, deudor y acreedor se realiza con guardas explícitas dentro de los casos de uso. |
| **Sustento** | Las reglas dependen del dominio, por lo que viven en la capa de aplicación y no en la web. La matriz de pruebas rol × operación (EC-13, EC-14) comprueba que cada caso de uso invoque su guarda. Se acepta el riesgo de olvidar una invocación y se mitiga con esa matriz y con una prueba arquitectónica que exija que los casos de uso dependan del guarda. |
| **Fuentes a consultar** | OWASP Cheat Sheet de Autorización; OWASP Top 10 (Broken Access Control); documentación de NestJS y Passport. |

## ADR-06: Elección de la regla de asignación de centavos residuales

| Sección | Descripción |
|---|---|
| **Título** | Elección entre método del mayor residuo, sobrante al pagador y sobrante al primero de la lista |
| **Contexto** | Al dividir S/ 100.00 entre 3 sobra un centavo; con impuestos y propina proporcionales, los residuos aparecen en cada parte. La suma de las partes debe ser igual al total (RNF-02) y el resultado debe ser repetible para un mismo comprobante (RF-16). |
| **Alternativas** | **A. Método del mayor residuo:** se asigna a cada uno la parte entera en centavos y los centavos sobrantes se reparten de uno en uno a quienes tienen mayor residuo fraccionario; los empates se resuelven por un orden fijo (identificador). Ventaja: mínima desviación respecto a la proporción exacta. Limitación: algo más compleja.<br>**B. Todo el sobrante al pagador:** simple. Limitación: sesgo sistemático contra el pagador y distinto del criterio del reparto en ítems.<br>**C. Todo el sobrante al primer participante:** simple. Limitación: sesgo acumulativo hacia una persona y dependiente del orden de la lista. |
| **Criterios de Elección** | Exactitud (suma de partes = total); equidad (desviación mínima); determinismo; facilidad de verificar con pruebas por propiedades. |
| **Decisión** | Se aplica el método del mayor residuo con desempate por identificador ascendente del participante. |
| **Sustento** | Con S/ 100.00 entre 3 todos los residuos son iguales y el desempate asigna el centavo extra al primero: 33.34 / 33.33 / 33.33, igual que el criterio de RF-16. La regla se prueba con propiedades (suma = total, ninguna parte difiere de la exacta en más de 1 centavo). Se acepta un algoritmo más largo que las alternativas simples a cambio de equidad y un invariante comprobable. |
| **Fuentes a consultar** | Literatura sobre apportionment (método de Hamilton o del mayor resto); documentación de fast-check para las propiedades. |

---

# Categoría 2: Modelo de Coordinación

## ADR-07: Elección del control de concurrencia en pagos

| Sección | Descripción |
|---|---|
| **Título** | Elección entre bloqueo pesimista, bloqueo optimista, aislamiento serializable y actualización condicional atómica |
| **Contexto** | El saldo de una deuda se lee, valida y modifica en pasos (patrón verificar y luego actuar), lo que produce *Lost Update* (sección 1.2.A). Hay tres operaciones que modifican la misma deuda: registrar pago (reserva), confirmar y rechazar o cancelar (liberan o aplican). Se exige que 50 solicitudes simultáneas sobre una deuda respeten las invariantes (RNF-01) con p95 ≤ 3 s (RNF-20) y una prueba reproducible (RNF-32). |
| **Alternativas** | **A. Bloqueo pesimista de la fila de la deuda** (`SELECT ... FOR UPDATE`) dentro de la transacción y validación posterior al bloqueo. Ventaja: serializa solo las operaciones sobre la misma deuda, sin reintentos y con lógica simple. Limitación: las solicitudes esperan, y un bloqueo mal acotado puede causar esperas largas.<br>**B. Bloqueo optimista con columna de versión:** se detecta el conflicto al escribir y se reintenta. Ventaja: sin bloqueos. Limitación: bajo alta contención sobre la misma fila hay muchos rechazos y reintentos, y el cliente debe tolerarlos.<br>**C. Aislamiento SERIALIZABLE:** el motor detecta anomalías. Ventaja: delega la corrección al motor. Limitación: aborta transacciones con error de serialización que la aplicación debe reintentar, con costo para todas las operaciones.<br>**D. `UPDATE` condicional atómico** (`SET reservado = reservado + :m WHERE total - confirmado - reservado >= :m`). Ventaja: una sola sentencia, sin bloqueo explícito. Limitación: más difícil de extender cuando la operación necesita varias lecturas y validaciones de dominio antes de escribir. |
| **Criterios de Elección** | Corrección de las invariantes bajo contención; simplicidad para expresar precondiciones de dominio y contratos; rendimiento bajo contención sobre una misma deuda; aislamiento entre deudas distintas; reproducibilidad en pruebas. |
| **Decisión** | Se usa bloqueo pesimista de la fila de la deuda con `SELECT ... FOR UPDATE` y aislamiento READ COMMITTED, validando las precondiciones después de obtener el bloqueo. |
| **Sustento** | Permite evaluar las precondiciones de dominio (usuario = deudor, monto ≤ saldo disponible, deuda no saldada) con el dato vigente y de forma explícita, que es lo que el curso pide demostrar. En READ COMMITTED, la sentencia bloqueante vuelve a leer la fila tras la espera, de modo que la segunda solicitud ve el saldo ya actualizado. Las deudas distintas no se bloquean entre sí (escenario del Paso 5). Las tres operaciones sobre un pago bloquean primero la deuda, lo que fija un orden de bloqueo único y evita interbloqueos. Se acepta que las solicitudes sobre la misma deuda se serialicen y se limita la espera con un tiempo máximo de bloqueo (ADR-20). Una restricción `CHECK` en la base de datos actúa como última defensa (RNF-05). |
| **Fuentes a consultar** | Documentación de PostgreSQL (capítulos "Concurrency Control", "Transaction Isolation" y "Explicit Locking"); Kleppmann, *Designing Data-Intensive Applications* (cap. 7); documentación del ORM sobre modos de bloqueo. |

## ADR-08: Elección de la estrategia de idempotencia

| Sección | Descripción |
|---|---|
| **Título** | Elección entre restricciones únicas con claves de idempotencia, deduplicación en memoria y control solo en la interfaz |
| **Contexto** | El bloqueo protege el saldo pero no distingue un doble envío de un pago legítimo: dos envíos idénticos de S/ 30 sobre una deuda de S/ 100 serían aceptados ambos. Además, reintentos del OCR o doble subida pueden duplicar comprobantes o deudas (RNF-04). Se requiere la misma garantía frente a reinicios y varios procesos. |
| **Alternativas** | **A. Claves únicas persistidas:** clave de idempotencia por pago generada por el cliente y registrada con restricción `UNIQUE`; hash de la imagen por evento con restricción `UNIQUE` para comprobantes; estado de la tarea para el procesamiento. Ventaja: la garantía la da la base de datos, sobrevive a reinicios y funciona con varios procesos. Limitación: el cliente debe generar y reenviar la clave.<br>**B. Caché de solicitudes en memoria del servidor:** rápida. Limitación: se pierde al reiniciar y no funciona con más de una instancia.<br>**C. Solo deshabilitar el botón en la interfaz:** reduce el doble clic. Limitación: no cubre reintentos de red, clientes alternativos ni fallas del navegador. |
| **Criterios de Elección** | Robustez frente a reinicios y concurrencia; garantía verificable en pruebas; bajo costo; que la defensa esté en el servidor y no dependa del cliente. |
| **Decisión** | Se adoptan claves únicas persistidas: clave de idempotencia por pago, hash de imagen por evento y restricción de una tarea de extracción activa por comprobante. |
| **Sustento** | La restricción única hace imposible, a nivel de datos, que una repetición cree un segundo efecto, incluso si dos solicitudes idénticas llegan a la vez (una falla por violación de unicidad y se traduce a "devolver el existente"). Se cumple RNF-04 y los escenarios EC-03 y EC-11. Se sacrifica algo de complejidad en el cliente (generar la clave por intento de pago) y espacio de almacenamiento, ambos acotados. La interfaz además deshabilita el botón como mejora de usabilidad, no como garantía. |
| **Fuentes a consultar** | Documentación de PostgreSQL (restricciones únicas, `ON CONFLICT`); borrador IETF "The Idempotency-Key HTTP Header Field"; documentación pública de APIs de pago que usan claves de idempotencia. |

## ADR-09: Elección del mecanismo de procesamiento asíncrono

| Sección | Descripción |
|---|---|
| **Título** | Elección entre cola en tabla de PostgreSQL con worker separado, broker de mensajes y ejecución asíncrona en el mismo proceso |
| **Contexto** | La llamada al OCR es lenta e inestable y no debe bloquear al usuario (RNF-06). Las tareas deben sobrevivir a reinicios, tener estados, reintentos y recuperación (RNF-07, RNF-09). El volumen esperado es bajo (decenas de comprobantes por hora). El equipo debe operar pocos componentes. |
| **Alternativas** | **A. Tabla `jobs` en PostgreSQL con worker separado** que toma tareas con `FOR UPDATE SKIP LOCKED`. Ventaja: sin un componente adicional, transaccional con los datos (se crea el comprobante y la tarea en la misma transacción) y fácil de probar. Limitación: sondeo periódico y menor rendimiento que un broker a gran escala.<br>**B. Broker de mensajes (RabbitMQ o similar):** entrega, reintentos y colas de mensajes fallidos integrados. Ventaja: diseñado para mensajería a escala. Limitación: nuevo servicio que operar y monitorear, y la publicación del mensaje no es atómica con la escritura en la base de datos (requiere un patrón de *outbox*).<br>**C. Ejecución asíncrona dentro del proceso de la API (hilos o ejecutor):** lo más simple. Limitación: las tareas se pierden si el proceso se reinicia y compiten por los recursos de la API. |
| **Criterios de Elección** | Durabilidad y atomicidad entre dato y tarea; costo operativo; capacidad de reintento y recuperación; reproducibilidad en pruebas; adecuación al volumen; evolución hacia mensajería. |
| **Decisión** | Se usa una tabla `jobs` en PostgreSQL consumida por un worker que corre como proceso separado, con `FOR UPDATE SKIP LOCKED`. |
| **Sustento** | La tarea y el comprobante se crean en una misma transacción, lo que elimina el riesgo de un comprobante sin tarea. `SKIP LOCKED` permite varios workers sin que tomen la misma tarea. Evita un servicio más, coherente con el volumen y el equipo. Se sacrifica rendimiento a gran escala y se asume un sondeo periódico. Migrar a un broker es la reingeniería prevista para el final, apoyada en que la cola queda detrás de una interfaz de repositorio de tareas. |
| **Fuentes a consultar** | Documentación de PostgreSQL (`SELECT ... FOR UPDATE SKIP LOCKED`); Kleppmann, *Designing Data-Intensive Applications* (procesamiento por lotes y mensajería); documentación de RabbitMQ sobre confirmaciones y reentrega. |

## ADR-10: Elección de la estrategia de tolerancia a fallas del OCR

| Sección | Descripción |
|---|---|
| **Título** | Elección entre Opossum o un mecanismo equivalente con reintentos persistidos, implementación manual e implementación manual |
| **Contexto** | El servicio externo presenta latencia, timeouts, errores 5xx y límites de uso. Se exige un máximo de 10 s por llamada, hasta 3 reintentos con espera creciente y un corte temporal tras fallas consecutivas (RNF-07), de forma que el comprobante termine siempre en `EXTRAÍDO` o `FALLIDO`. El curso pide al menos 2 mecanismos de resiliencia. |
| **Alternativas** | **A. Opossum o un circuit breaker equivalente para Node.js** (timeout, circuit breaker) más reintentos con espera creciente registrados en la tabla de tareas (intentos y próxima ejecución). Ventaja: biblioteca ligera y modular con métricas, y los reintentos sobreviven a reinicios. Limitación: se combinan dos mecanismos que hay que alinear.<br>**B. Reintento gestionado por la aplicación:** anotaciones de reintento con espera creciente. Ventaja: muy simple. Limitación: no ofrece circuit breaker propio y los reintentos viven en memoria.<br>**C. Implementación manual con bucles y temporizadores:** control total. Limitación: más código propio propenso a errores (por ejemplo, esperas sin tope o reintentos sin límite) y menos métricas. |
| **Criterios de Elección** | Cobertura de timeout, reintento y corte de circuito; supervivencia a reinicios; observabilidad (RNF-31); simplicidad; facilidad de inyectar fallas en pruebas. |
| **Decisión** | Se usa un circuit breaker compatible con Node.js para el tiempo de espera y el corte de circuito en la llamada al OCR, y el reintento con espera creciente se gestiona en la tabla de tareas (número de intentos y próxima ejecución). |
| **Sustento** | El circuit breaker protege al worker y al proveedor de una cadena de llamadas fallidas, y el timeout acota cada intento. Persistir los intentos hace que un reinicio no pierda el estado ni reinicie el conteo, y permite que RNF-07 se cumpla de forma comprobable. Se acepta la complejidad de dos capas a cambio de resistir caídas del proceso. Las pruebas inyectan timeouts, errores 5xx y respuestas corruptas con un servidor simulado (ADR-38). |
| **Fuentes a consultar** | Documentación del circuit breaker elegido para Node.js; Nygard, *Release It!* (patrones de estabilidad). |

## ADR-11: Elección del mecanismo de notificación de estado

| Sección | Descripción |
|---|---|
| **Título** | Elección entre polling, Server-Sent Events y WebSockets |
| **Contexto** | El cliente debe saber cuándo termina la extracción y cuándo hay pagos por confirmar. Las notificaciones push están fuera del alcance de v1.0. La carga es baja y la interfaz corre en navegadores de PC y móvil (incluidos los que suspenden conexiones en segundo plano). |
| **Alternativas** | **A. Polling periódico a un endpoint de estado:** el cliente consulta cada pocos segundos. Ventaja: simple, sin conexiones persistentes y compatible con cualquier navegador. Limitación: tráfico innecesario y latencia de hasta el intervalo.<br>**B. Server-Sent Events:** el servidor envía eventos por una conexión HTTP abierta. Ventaja: actualizaciones inmediatas. Limitación: conexiones largas que gestionar y reconexión en móviles.<br>**C. WebSockets:** canal bidireccional. Ventaja: baja latencia. Limitación: mayor complejidad de servidor, balanceo y reconexión, innecesaria para consultas de estado. |
| **Criterios de Elección** | Cumplir "sin push"; simplicidad; robustez en móviles; costo de implementación; facilidad de prueba. |
| **Decisión** | Se usa polling con un intervalo configurable (propuesto: 3 s mientras el estado sea `PROCESANDO`) y la bandeja de pendientes se actualiza al consultarla. |
| **Sustento** | Cumple el alcance sin añadir infraestructura de conexiones persistentes, y se comporta bien en navegadores móviles. Se sacrifica inmediatez y se acepta un tráfico leve, adecuado al volumen. El polling se detiene al llegar a un estado final para no consumir recursos. Pasar a SSE sería un cambio local si en el final se decide mejorar la experiencia. |
| **Fuentes a consultar** | Documentación MDN sobre Server-Sent Events y WebSocket; documentación de TanStack Query sobre `refetchInterval`. |

## ADR-12: Elección del estilo de API

| Sección | Descripción |
|---|---|
| **Título** | Elección entre REST con JSON, GraphQL y gRPC |
| **Contexto** | El único cliente es una interfaz web propia. Las operaciones son casos de uso con estados claros (crear, confirmar, rechazar) y errores tipados. El final exige documentar la API (OpenAPI) y demostrar integración. |
| **Alternativas** | **A. REST con JSON:** recursos y verbos HTTP. Ventaja: soportado nativamente por navegadores, herramientas y documentación (OpenAPI) y códigos de estado que mapean los errores. Limitación: puede requerir varias llamadas para pantallas compuestas.<br>**B. GraphQL:** consulta flexible en un solo punto. Ventaja: el cliente pide exactamente lo que necesita. Limitación: complejidad de autorización por campo y de caché, y no aporta valor con un único cliente.<br>**C. gRPC:** contratos binarios y alto rendimiento. Ventaja: eficiente entre servicios. Limitación: los navegadores no lo consumen directamente (requiere una capa adicional). |
| **Criterios de Elección** | Compatibilidad con navegadores; mapeo de errores de dominio a códigos; herramientas de documentación y pruebas; curva de aprendizaje; encaje con operaciones con estado. |
| **Decisión** | Se expone una API REST con JSON, con errores en un formato uniforme y documentación OpenAPI en el final. |
| **Sustento** | Los cuatro tipos de error del dominio se corresponden con códigos HTTP (400/422, 401, 404, 409), y las operaciones de estado se modelan como acciones sobre recursos (por ejemplo, confirmar o rechazar un pago). Se sacrifican las consultas a medida de GraphQL, innecesarias con un único cliente. REST también facilita probar con herramientas estándar. |
| **Fuentes a consultar** | Fielding, tesis doctoral (capítulo 5); especificación OpenAPI; RFC 9110 (semántica HTTP). |

## ADR-13: Elección de la gestión de sesión

| Sección | Descripción |
|---|---|
| **Título** | Elección entre sesión en servidor con cookie y tokens JWT sin estado |
| **Contexto** | El cierre de sesión debe invalidar la sesión de inmediato (RF-03, RNF-12). La interfaz y la API se sirven desde el mismo origen (ADR-26). Se maneja información sensible (evidencias de pago). Debe poder sobrevivir al reinicio de la API. |
| **Alternativas** | **A. Sesión en el servidor con cookie `HttpOnly` y `Secure`, con el estado de sesión almacenado en la base de datos.** Ventaja: invalidación inmediata, la cookie no es accesible desde scripts y el estado sobrevive reinicios. Limitación: lectura de estado en cada solicitud y protección contra CSRF necesaria.<br>**B. JWT sin estado en un encabezado:** no consulta el estado en cada solicitud. Ventaja: escalado horizontal sencillo. Limitación: la revocación antes de la expiración requiere una lista de bloqueo (lo que reintroduce estado) y, si se guarda en el navegador de forma accesible a scripts, es vulnerable a XSS. |
| **Criterios de Elección** | Invalidación inmediata; exposición a XSS y CSRF; supervivencia a reinicios; simplicidad; coherencia con un único origen. |
| **Decisión** | Se usa sesión en el servidor identificada por una cookie `HttpOnly` y `SameSite`, con el estado persistido en la base de datos y protección CSRF activa. |
| **Sustento** | RF-03 exige que el cierre de sesión surta efecto de inmediato, algo natural con estado en servidor y costoso con JWT. La cookie `HttpOnly` reduce el robo por scripts, y `SameSite` más CSRF cubren los ataques desde otros sitios. Persistir en la base de datos permite que la API y el worker se reinicien sin cerrar sesiones. Se sacrifica algo de rendimiento por la consulta de sesión, irrelevante con 50 usuarios concurrentes. |
| **Fuentes a consultar** | OWASP Session Management Cheat Sheet y CSRF Prevention Cheat Sheet; documentación de NestJS sobre sesiones y cookies; RFC 6265bis (cookies). |

---

# Categoría 3: Modelo de Datos

## ADR-14: Elección del modelo de datos

| Sección | Descripción |
|---|---|
| **Título** | Elección entre modelo relacional normalizado y modelo documental |
| **Contexto** | Las entidades tienen relaciones claras (usuario, evento, participación, comprobante, ítem, deuda, pago) y las invariantes se expresan sobre varias de ellas (saldo = monto − pagos). Se requieren transacciones entre deuda y pago, restricciones de unicidad y consultas agregadas para el balance (RNF-21). |
| **Alternativas** | **A. Relacional normalizado con restricciones** (claves foráneas, `UNIQUE`, `CHECK`). Ventaja: integridad referencial y reglas declaradas en el motor, transacciones multi-tabla y consultas agregadas eficientes. Limitación: el esquema exige migraciones.<br>**B. Documental (un documento por evento o comprobante):** esquema flexible. Ventaja: lectura de un evento completo en una operación. Limitación: las actualizaciones concurrentes de partes del mismo documento y las transacciones multi-documento son más difíciles, y las invariantes entre entidades quedan a cargo de la aplicación. |
| **Criterios de Elección** | Integridad y atomicidad entre entidades; defensa de invariantes en el motor (RNF-05); consultas agregadas; madurez de herramientas de prueba. |
| **Decisión** | Se adopta un modelo relacional normalizado con claves foráneas y restricciones `UNIQUE` y `CHECK`. |
| **Sustento** | Las invariantes críticas se pueden reforzar en el motor como segunda línea de defensa tras el dominio. Las agregaciones del balance son consultas naturales. Se sacrifica flexibilidad de esquema, aceptable porque el dominio está bien definido y se versiona con migraciones (ADR-29). |
| **Fuentes a consultar** | Date, *An Introduction to Database Systems*; documentación de PostgreSQL (restricciones); Kleppmann, *Designing Data-Intensive Applications* (cap. 2). |

## ADR-15: Elección de la representación del dinero

| Sección | Descripción |
|---|---|
| **Título** | Elección entre enteros en centavos, decimal exacto y punto flotante |
| **Contexto** | Los montos deben sumar exactamente el total (RNF-02). El punto flotante binario no representa exactamente muchos decimales (por ejemplo, 0.1 + 0.2). Hay prorrateos de impuestos y propina que generan residuos. Una sola moneda (PEN) con 2 decimales. |
| **Alternativas** | **A. Enteros en centavos** (`long` en el dominio y `BIGINT` en la base de datos). Ventaja: aritmética exacta y rápida, sin ambigüedades de escala ni redondeo implícito. Limitación: hay que convertir al mostrar y vigilar el desbordamiento (muy lejano para estos montos).<br>**B. Decimal exacto** (`BigDecimal` y `NUMERIC(12,2)`). Ventaja: representa montos tal cual. Limitación: exige fijar escala y modo de redondeo en cada operación, con riesgo de errores sutiles.<br>**C. Punto flotante (`double`):** no es exacto y acumula errores; no es admisible para dinero. |
| **Criterios de Elección** | Exactitud; simplicidad para aplicar la regla de residuos (ADR-06); facilidad de pruebas por propiedades; riesgo de error de programación. |
| **Decisión** | Se representan los montos como enteros en centavos, encapsulados en un tipo de valor `Money`. |
| **Sustento** | La división y el prorrateo se hacen con aritmética entera, por lo que la regla del mayor residuo es directa y la igualdad "suma de partes = total" es exacta. El tipo `Money` prohíbe mezclar montos con números sueltos y concentra la conversión a texto con 2 decimales. Se sacrifica algo de comodidad (convertir en los bordes) a cambio de eliminar toda una clase de errores de redondeo. |
| **Fuentes a consultar** | IEEE 754; documentación de `BigDecimal` del lenguaje; Fowler, *Patterns of Enterprise Application Architecture* (patrón Money). |

## ADR-16: Elección del modelado de saldos y reservas

| Sección | Descripción |
|---|---|
| **Título** | Elección entre columnas persistidas actualizadas en transacción, saldo derivado por agregación y registro contable (ledger) |
| **Contexto** | Cada deuda necesita saldo pendiente y saldo disponible (que descuenta pagos pendientes de confirmar). Se consulta con frecuencia (listas, balance) y se modifica bajo contención (ADR-07). El documento técnico define `Saldo_Pendiente` como atributo de la deuda y exige que sea consistente con los pagos (RF-26). |
| **Alternativas** | **A. Columnas persistidas** (`pagado_confirmado` y `reservado`) en la deuda, actualizadas en la misma transacción que inserta o cambia el pago, con `CHECK (confirmado + reservado ≤ monto)` y los pagos como registros inmutables que se conservan. Ventaja: lecturas rápidas y la restricción protege el invariante. Limitación: dato redundante que debe mantenerse coherente con los pagos.<br>**B. Saldo siempre derivado sumando pagos:** sin redundancia. Limitación: cada lectura agrega pagos y la validación bajo contención requiere bloquear o sumar todos los pagos.<br>**C. Libro contable (ledger) de movimientos con eventos:** auditoría completa. Limitación: complejidad desproporcionada para v1.0. |
| **Criterios de Elección** | Coherencia bajo concurrencia; rendimiento de lectura (RNF-21); protección con restricciones del motor; trazabilidad de pagos; simplicidad. |
| **Decisión** | Se persisten el monto confirmado y el monto reservado en la deuda, actualizados en la transacción del pago, con una restricción `CHECK`, y los pagos se conservan como historial inmutable. |
| **Sustento** | La fila de la deuda es también el punto de bloqueo (ADR-07), por lo que leer y escribir sus columnas en la misma transacción es natural y barato. La redundancia se controla con una restricción del motor y con una prueba que recalcula el saldo desde los pagos y lo compara (invariante 2). Se sacrifica la pureza de un saldo derivado a cambio de simplicidad y rendimiento. |
| **Fuentes a consultar** | Documentación de PostgreSQL (restricciones `CHECK`); Fowler, "Event Sourcing" y "Accounting Patterns" (para contrastar con ledger). |

## ADR-17: Elección del modelado de los estados

| Sección | Descripción |
|---|---|
| **Título** | Elección entre enumeración con tabla declarativa de transiciones, State pattern por clases y banderas booleanas |
| **Contexto** | El comprobante (`CARGADO`, `PROCESANDO`, `EXTRAÍDO`, `CONFIRMADO`, `FALLIDO`) y el pago (`PENDIENTE`, `CONFIRMADO`, `RECHAZADO`, `CANCELADO`) tienen transiciones válidas limitadas; toda operación inválida debe producir conflicto. El final pide construcción basada en tablas o máquina de estados. |
| **Alternativas** | **A. Enumeración con tabla declarativa de transiciones permitidas** (estado actual, evento, estado siguiente) validada por el dominio. Ventaja: las reglas son datos legibles y comprobables, y facilita la evolución table-driven. Limitación: las acciones asociadas se implementan aparte.<br>**B. State pattern (una clase por estado):** el comportamiento vive en cada estado. Ventaja: orientado a objetos. Limitación: muchas clases para pocos estados y reglas dispersas.<br>**C. Banderas booleanas (`confirmado`, `fallido`):** simple al inicio. Limitación: combinaciones inválidas posibles y difícil de verificar. |
| **Criterios de Elección** | Imposibilidad de estados inválidos; legibilidad; capacidad de verificar todas las transiciones con pruebas; preparación para el final. |
| **Decisión** | Cada ciclo de vida se modela con una enumeración y una tabla declarativa de transiciones que el dominio consulta antes de cada cambio; la base de datos restringe los valores de estado. |
| **Sustento** | Una prueba recorre la tabla y verifica que toda transición no listada produce conflicto, lo que demuestra los escenarios EC-04 y RF-19 a RF-22. La estructura ya es table-driven, por lo que el final solo la externaliza o amplía. Se sacrifica el comportamiento por estado en clases, innecesario con tan pocos estados. |
| **Fuentes a consultar** | McConnell, *Code Complete* (construcción basada en tablas); Gamma et al., *Design Patterns* (State). |

## ADR-18: Elección del modelado de la asignación de unidades

| Sección | Descripción |
|---|---|
| **Título** | Elección entre tabla de asignación, expansión de cada unidad como ítem y documento JSON |
| **Contexto** | En reparto por ítems, cada unidad de un ítem (por ejemplo, 2 chaufas) se asigna a un único participante; un ítem de cantidad 2 puede dividirse entre personas distintas (RF-15). Se debe verificar que no queden unidades sin asignar y calcular las partes con exactitud. |
| **Alternativas** | **A. Tabla de asignación** (ítem, número de unidad, participante) con clave única por unidad. Ventaja: conserva el ítem tal como lo leyó el OCR y garantiza a lo sumo un responsable por unidad. Limitación: una tabla adicional.<br>**B. Expandir cada unidad como un ítem independiente:** modelo simple. Limitación: se pierde la correspondencia con el comprobante original y complica la edición de cantidades.<br>**C. Guardar la asignación como JSON dentro del comprobante:** flexible. Limitación: sin integridad referencial ni restricciones del motor. |
| **Criterios de Elección** | Integridad (una unidad, un responsable); fidelidad al comprobante; facilidad de validar "todas asignadas"; consulta del reparto. |
| **Decisión** | Se usa una tabla de asignación con clave única (ítem, unidad) y referencia al participante. |
| **Sustento** | La clave única impide asignar una unidad dos veces y la validación "todas las unidades asignadas" es un conteo contra la cantidad del ítem. Se mantiene el ítem como lo corrige el pagador (RF-14). Se sacrifica una tabla más, trivial frente a la garantía de integridad. |
| **Fuentes a consultar** | Documentación de PostgreSQL (claves e integridad referencial). |

## ADR-19: Elección del almacenamiento de imágenes

| Sección | Descripción |
|---|---|
| **Título** | Elección entre sistema de archivos con metadatos en la base de datos, BLOB en la base de datos y almacenamiento de objetos |
| **Contexto** | Se guardan fotos de comprobantes y de evidencias de pago (hasta 5 MB). Deben ser privadas (RNF-15), no accesibles por una URL pública y poder migrarse más adelante. La API y el worker, procesos separados, deben leer los mismos archivos. |
| **Alternativas** | **A. Sistema de archivos (volumen compartido) con interfaz de almacenamiento** y en la base de datos solo ruta lógica, hash y metadatos. Ventaja: simple, sin costo y base de datos liviana. Limitación: los archivos no están dentro de la transacción de la base de datos y el volumen debe compartirse entre procesos.<br>**B. BLOB en PostgreSQL:** transaccional y un único respaldo. Limitación: engorda la base de datos, afecta los respaldos y el rendimiento de consultas.<br>**C. Almacenamiento de objetos en la nube (bucket):** escalable. Limitación: costo, credenciales y dependencia de red que el despliegue final en la nube está fuera del alcance de v1.0. |
| **Criterios de Elección** | Privacidad; simplicidad y costo; compartición entre API y worker; posibilidad de migrar; impacto en la base de datos. |
| **Decisión** | Se almacenan las imágenes en un volumen del sistema de archivos con nombre generado, detrás de una interfaz `ReceiptStorage`, y la base de datos guarda la referencia, el hash y los metadatos. |
| **Sustento** | Un volumen compartido en el despliegue con contenedores permite que API y worker accedan a los mismos archivos. Las imágenes se sirven solo mediante endpoints autorizados (RF-23). La interfaz permite migrar a un bucket sin tocar el dominio. Se sacrifica la atomicidad con la base de datos y se mitiga guardando primero el archivo y registrando después los metadatos, con limpieza de huérfanos. |
| **Fuentes a consultar** | Documentación de Docker (volúmenes); OWASP File Upload Cheat Sheet. |

---

# Categoría 4: Gestión de Recursos

## ADR-20: Elección del dimensionamiento de conexiones y los tiempos de bloqueo

| Sección | Descripción |
|---|---|
| **Título** | Elección entre pool de conexiones acotado con tiempos máximos de bloqueo, configuración por defecto y espera sin límite |
| **Contexto** | Las solicitudes sobre una misma deuda esperan al bloqueo (ADR-07), y cada una mantiene una conexión. Con 50 solicitudes simultáneas, una espera sin límite podría agotar el pool y paralizar las demás operaciones. La API y el worker tienen cada uno su pool y PostgreSQL limita el total de conexiones. |
| **Alternativas** | **A. Pool acotado y configurable con tiempo máximo de espera de conexión y de bloqueo** (`lock_timeout`). Ventaja: protege la disponibilidad ante contención y es ajustable por medición. Limitación: hay que dimensionar y medir.<br>**B. Valores por defecto sin ajuste:** cero esfuerzo. Limitación: no hay garantía bajo contención y no se sabe cuándo se agota el pool.<br>**C. Sin límite de espera de bloqueo:** simple. Limitación: una transacción detenida bloquea indefinidamente a todas las solicitudes de esa deuda. |
| **Criterios de Elección** | Disponibilidad del resto de operaciones bajo contención (RNF-08, RNF-20); evitar esperas indefinidas; capacidad de ajustar con datos; suma de conexiones dentro del límite del motor. |
| **Decisión** | Se usa el pool de conexiones del framework con tamaño configurable (valor inicial propuesto: 10 por proceso), tiempo máximo de espera de conexión y `lock_timeout` de pocos segundos (propuesto: 5 s), ajustados con la prueba de estrés. |
| **Sustento** | Un `lock_timeout` convierte una espera indefinida en un conflicto controlable que se informa al usuario. El dimensionamiento inicial es una hipótesis que la prueba de carga (RNF-20, EC-02) valida o corrige, y los valores viven en configuración (ADR-27). Se sacrifica algo de capacidad ante picos extremos, aceptable con la carga objetivo. |
| **Fuentes a consultar** | Documentación de TypeORM y del driver `pg`; documentación de PostgreSQL (`lock_timeout`, `max_connections`). |

## ADR-21: Elección del arrendamiento y la concurrencia del worker

| Sección | Descripción |
|---|---|
| **Título** | Elección entre arrendamiento (lease) con expiración, bloqueo sin expiración y worker de un solo hilo |
| **Contexto** | Si el worker se detiene a mitad de una tarea, esta no debe quedar bloqueada para siempre ni procesarse dos veces (RNF-09). Un intento de OCR dura como máximo 10 s (RNF-07). Se puede ejecutar más de un worker o hilo. |
| **Alternativas** | **A. Arrendamiento con expiración:** al tomar una tarea se registra quién y hasta cuándo; si vence, otra ejecución puede retomarla. Ventaja: recuperación automática. Limitación: debe ser mayor que el tiempo máximo de procesamiento y obliga a ser idempotente.<br>**B. Estado "en proceso" sin expiración:** simple. Limitación: una caída deja la tarea atascada.<br>**C. Un solo hilo y un solo worker:** evita la concurrencia. Limitación: no escala y una caída detiene todo el procesamiento. |
| **Criterios de Elección** | Recuperación ante caídas; ausencia de duplicados; simplicidad; capacidad de escalar el número de workers. |
| **Decisión** | Se usa arrendamiento con expiración (propuesto: 60 s) y un número configurable de hilos (valor inicial: 2), apoyado en la idempotencia del ADR-08. |
| **Sustento** | El arrendamiento supera claramente el tiempo máximo de un intento (10 s), por lo que una tarea sana no se reasigna, y una tarea de un worker caído se retoma sola. El resultado de reprocesar una tarea es el mismo gracias a las claves únicas, lo que da la garantía de EC-11 y EC-12. Se acepta que, en una caída, haya un retraso de hasta el tiempo de arrendamiento. |
| **Fuentes a consultar** | Kleppmann, *Designing Data-Intensive Applications* (cap. 8, sobre leases); documentación de colas con visibilidad de mensajes (por ejemplo, Amazon SQS visibility timeout, como referencia de patrón). |

## ADR-22: Elección del control y la validación de archivos subidos

| Sección | Descripción |
|---|---|
| **Título** | Elección entre validación en el servidor por contenido real, validación solo por extensión y validación solo en el cliente |
| **Contexto** | Se reciben imágenes de usuarios (comprobantes y evidencias) y se envían a un tercero. Un archivo malicioso o enorme puede agotar recursos o comprometer el servidor (RNF-16). Límite: JPG, PNG o WEBP de hasta 5 MB. |
| **Alternativas** | **A. Validación en el servidor:** límite de tamaño, tipo real por contenido (decodificar la imagen), nombre generado por el sistema y almacenamiento fuera de la raíz pública. Ventaja: no depende del cliente y detecta archivos renombrados. Limitación: algo de costo de procesamiento.<br>**B. Solo extensión o tipo declarado:** trivial de evadir.<br>**C. Solo validación en el cliente:** mejora la usabilidad pero se omite fácilmente con otro cliente. |
| **Criterios de Elección** | Seguridad frente a archivos maliciosos; control del consumo de recursos; usabilidad. |
| **Decisión** | La validación definitiva se hace en el servidor (tamaño, tipo real por contenido y nombre generado), y el cliente replica el límite solo para dar respuesta inmediata. |
| **Sustento** | Se verifica el contenido real, no la extensión, y se rechaza antes de guardar o de enviar al OCR, protegiendo el almacenamiento y los costos del proveedor. Se limita el tamaño en el propio servidor para acotar memoria y disco. Se acepta el costo de decodificar la imagen por la protección obtenida. |
| **Fuentes a consultar** | OWASP File Upload Cheat Sheet; documentación del framework sobre límites de carga multipart. |

## ADR-23: Elección de la limitación de intentos de login

| Sección | Descripción |
|---|---|
| **Título** | Elección entre contador persistido en la base de datos, contador en memoria y limitación en un proxy |
| **Contexto** | Se quiere bloquear temporalmente tras 5 intentos fallidos en 10 minutos (RNF-13, propuesto). La API puede reiniciarse y pueden existir varias instancias. |
| **Alternativas** | **A. Contador por cuenta y ventana en la base de datos:** Ventaja: consistente entre instancias y reinicios. Limitación: una escritura por intento fallido.<br>**B. Contador en memoria del proceso:** sin base de datos. Limitación: se pierde al reiniciar y no se comparte entre instancias.<br>**C. Limitación en un proxy o gateway:** desacopla la aplicación. Limitación: añade un componente que el alcance de v1.0 no contempla. |
| **Criterios de Elección** | Consistencia ante reinicios; ausencia de componentes nuevos; simplicidad; facilidad de prueba (EC-16). |
| **Decisión** | Se registran los intentos fallidos por cuenta en la base de datos y se bloquea al superar el umbral dentro de la ventana, ambos configurables. |
| **Sustento** | Reutiliza la base de datos ya existente y se comporta igual tras un reinicio, lo que lo hace verificable con una prueba determinista. El costo de una escritura por intento fallido es despreciable. Se sacrifica la protección a nivel de red (por ejemplo, por IP), que queda para una etapa posterior. |
| **Fuentes a consultar** | OWASP Authentication Cheat Sheet (sección sobre bloqueo y límites de intentos). |

---

# Categoría 5: Mapeo entre Elementos Arquitectónicos

## ADR-24: Elección del mapeo de módulos a procesos

| Sección | Descripción |
|---|---|
| **Título** | Elección entre un solo código base con dos perfiles de ejecución, un único proceso y servicios en repositorios separados |
| **Contexto** | La API debe responder sin esperar al OCR (RNF-06), y una falla del OCR no debe afectar al resto (RNF-08). Los módulos comparten el dominio y la base de datos. El equipo es pequeño. |
| **Alternativas** | **A. Un código base, dos perfiles (`api` y `worker`):** el mismo artefacto se ejecuta en dos procesos con distinta configuración. Ventaja: aislamiento de recursos y fallas sin duplicar código. Limitación: ambos procesos comparten versión y esquema.<br>**B. Un único proceso con hilos para el OCR:** simple. Limitación: la API y el procesamiento compiten por recursos y una caída afecta a ambos.<br>**C. Servicios en repositorios separados:** independencia total. Limitación: duplicación del dominio o una biblioteca compartida a versionar, más costo para el equipo. |
| **Criterios de Elección** | Aislamiento de fallas y recursos; costo de mantenimiento; reutilización del dominio; despliegue sencillo. |
| **Decisión** | Se construye un único artefacto que se ejecuta como proceso `api` o como proceso `worker` según el perfil activo. |
| **Sustento** | Un OCR lento o caído solo afecta al proceso worker, lo que respalda RNF-06 y RNF-08 con una prueba directa. Se evita duplicar el dominio y se simplifica el despliegue. Se acepta que ambos procesos se despliegan juntos y comparten versión, coherente con ADR-01. |
| **Fuentes a consultar** | Documentación de configuración y perfiles de NestJS; Wiggins, "The Twelve-Factor App" (procesos y concurrencia). |

## ADR-25: Elección del mapeo de procesos a infraestructura

| Sección | Descripción |
|---|---|
| **Título** | Elección entre Docker Compose, ejecución local manual y orquestación con Kubernetes |
| **Contexto** | Se necesitan tres componentes (API, worker, base de datos) más el volumen de imágenes. El README debe permitir instalar y ejecutar el sistema (RNF-41), y el despliegue final en la nube está fuera del alcance de v1.0. El final pide contenerización. |
| **Alternativas** | **A. Docker Compose:** definición declarativa de servicios, redes y volúmenes en un archivo. Ventaja: un comando levanta todo y es reproducible en cualquier máquina con Docker. Limitación: no es para producción a gran escala.<br>**B. Ejecución local manual** (instalar la base de datos y lanzar procesos a mano). Ventaja: sin Docker. Limitación: diferencias entre máquinas y pasos no documentados.<br>**C. Kubernetes:** orquestación completa. Limitación: complejidad desproporcionada para el alcance. |
| **Criterios de Elección** | Reproducibilidad; facilidad de arranque (≤ 15 min); costo; adecuación al alcance. |
| **Decisión** | Se usa Docker Compose con servicios para la API, el worker y PostgreSQL, y un volumen compartido para las imágenes. |
| **Sustento** | Un único comando arranca el entorno completo, con la base de datos migrada, y permite que las pruebas de integración y la integración continua usen el mismo mecanismo. Se sacrifica la escalabilidad de una orquestación completa, que no se necesita. La misma imagen sirve de base para la contenerización exigida en el final. |
| **Fuentes a consultar** | Documentación oficial de Docker Compose; Wiggins, "The Twelve-Factor App". |

## ADR-26: Elección de la entrega del frontend

| Sección | Descripción |
|---|---|
| **Título** | Elección entre aplicación web servida desde el mismo origen del backend y frontend como servicio separado |
| **Contexto** | La sesión usa cookies (ADR-13) y debe evitarse exponer las evidencias en rutas públicas. Es una web responsive de un único cliente. Un origen distinto exige configurar CORS y cookies entre sitios. |
| **Alternativas** | **A. Frontend compilado y servido como recursos estáticos por el mismo origen que la API:** Ventaja: sin CORS, cookies más simples y seguras, y un solo despliegue. Limitación: el frontend se despliega con el backend.<br>**B. Frontend como servicio o sitio separado (otro origen):** despliegue independiente. Limitación: CORS, cookies entre sitios y más infraestructura. |
| **Criterios de Elección** | Seguridad de cookies y CSRF; simplicidad de despliegue; número de componentes. |
| **Decisión** | El frontend compilado se sirve desde el mismo origen que la API, y durante el desarrollo se usa un proxy hacia el servidor de desarrollo del frontend. |
| **Sustento** | Evita configurar CORS y permite `SameSite` estricto, lo que simplifica la protección de la sesión. Se reduce un componente a desplegar. Se sacrifica el despliegue independiente del frontend, innecesario con un único cliente. |
| **Fuentes a consultar** | Documentación MDN sobre CORS y cookies `SameSite`; documentación del empaquetador del frontend sobre proxies de desarrollo. |

---

# Categoría 6: Tiempo de Enlace

## ADR-27: Elección de la configuración externalizada y de los parámetros de dominio

| Sección | Descripción |
|---|---|
| **Título** | Elección entre configuración externa por perfil y variables de entorno, constantes en código y servidor de configuración |
| **Contexto** | Valores como tiempos de espera, reintentos, tamaños, duración de sesión, umbrales y credenciales cambian entre entornos y entre pruebas. No deben guardarse secretos en el repositorio (RNF-39). El curso pide configuración externalizada y feature flags en el final. |
| **Alternativas** | **A. Archivos de configuración por perfil más variables de entorno para secretos** (con `.env.example` versionado). Ventaja: el valor se enlaza al arrancar sin recompilar. Limitación: hay que documentar cada variable.<br>**B. Constantes en el código:** simple. Limitación: cada cambio exige recompilar y desplegar, y facilita dejar secretos en el repositorio.<br>**C. Servidor de configuración centralizado:** cambios en caliente. Limitación: nuevo componente innecesario para este alcance. |
| **Criterios de Elección** | Tiempo de enlace de cada parámetro; seguridad de secretos; facilidad de ajustar con mediciones; número de componentes. |
| **Decisión** | Los parámetros operativos se externalizan en archivos por perfil y variables de entorno (enlace al arrancar); las listas cerradas de dominio, como los métodos de pago, se mantienen como enumeraciones en código (enlace en compilación) con sus reglas, como la exigencia de evidencia, declaradas junto a ellas. |
| **Sustento** | Permite ajustar timeouts y reintentos con los resultados de las pruebas sin tocar el código, y evita secretos en el repositorio. Las listas cerradas cambian rara vez y su cambio debe pasar por pruebas, por lo que se enlazan en compilación. Se sacrifica el cambio en caliente, que no se necesita en v1.0, y la configuración queda lista para agregar feature flags en el final. |
| **Fuentes a consultar** | Wiggins, "The Twelve-Factor App" (config); documentación de configuración externa del framework; Bass et al., tácticas de tiempo de enlace. |

## ADR-28: Elección de la selección del cliente OCR (real o simulado)

| Sección | Descripción |
|---|---|
| **Título** | Elección entre selección por configuración al arrancar, bandera en tiempo de ejecución y compilación condicional |
| **Contexto** | Las pruebas deben inyectar fallas (timeouts, 5xx, JSON corrupto) sin internet (RNF-36), mientras que la demostración usa el proveedor real. El cambio de proveedor no debe tocar otros módulos (RNF-38). |
| **Alternativas** | **A. Selección por propiedad o perfil al arrancar:** la implementación (`HttpOcrClient` o `FakeOcrClient`) se inyecta según la configuración. Ventaja: simple y sin código condicional disperso. Limitación: el cambio exige reiniciar.<br>**B. Bandera consultada en cada llamada (en caliente):** permite cambiar sin reiniciar. Limitación: más complejidad y riesgo de estados mezclados.<br>**C. Compilación condicional o artefactos distintos:** cero lógica en ejecución. Limitación: dos artefactos que mantener. |
| **Criterios de Elección** | Simplicidad; facilidad de pruebas; tiempo de enlace razonable; evitar condicionales dispersos. |
| **Decisión** | La implementación del cliente OCR se elige por propiedad de configuración al arrancar, detrás de la interfaz `OcrClient`. |
| **Sustento** | Un único punto de decisión (inyección de dependencias) mantiene el código sin condicionales, y las pruebas usan la versión simulada con fallas inyectadas. Se sacrifica el cambio en caliente, que podría retomarse como feature flag en el final. |
| **Fuentes a consultar** | Gamma et al., *Design Patterns* (Strategy); Bass et al., tácticas de tiempo de enlace. |

## ADR-29: Elección de las migraciones de esquema

| Sección | Descripción |
|---|---|
| **Título** | Elección entre migraciones versionadas, generación automática del esquema por el ORM y scripts manuales |
| **Contexto** | El esquema contiene restricciones críticas (`CHECK`, `UNIQUE`, claves foráneas) que forman parte de la defensa de integridad (RNF-05). Debe reproducirse igual en cualquier máquina y evolucionar entre v1.0 y v2.0 (RNF-42). |
| **Alternativas** | **A. Migraciones versionadas con una herramienta (por ejemplo Flyway):** scripts SQL numerados y aplicados al arrancar. Ventaja: historial reproducible en Git y esquema idéntico en todos los entornos. Limitación: hay que escribir SQL.<br>**B. Generación automática por el ORM** (`ddl-auto`): sin esfuerzo. Limitación: no es recomendable para producción, no deja historial y puede omitir restricciones que se quieren fijas.<br>**C. Scripts manuales sin herramienta:** propenso a olvidos y diferencias entre entornos. |
| **Criterios de Elección** | Reproducibilidad; control de restricciones; trazabilidad en Git; evolución hacia v2.0. |
| **Decisión** | Se usan migraciones SQL versionadas, aplicadas automáticamente al arrancar, y el ORM solo valida que el esquema coincida. |
| **Sustento** | Las restricciones se escriben a propósito en SQL, no se infieren. El historial en el repositorio sirve de evidencia de evolución. Una base nueva y una existente llegan al mismo esquema (EC-31). Se sacrifica la comodidad de la generación automática. |
| **Fuentes a consultar** | Documentación de Flyway y Liquibase; documentación del ORM sobre `ddl-auto`. |

## ADR-30: Elección de los mensajes y la localización

| Sección | Descripción |
|---|---|
| **Título** | Elección entre códigos de error estables con textos externos en el frontend y mensajes redactados en el backend |
| **Contexto** | Los mensajes deben estar en español, ser claros y accionables (RNF-26), con moneda en soles y fechas en la zona horaria de Lima (RNF-27). El final puede pedir internacionalización. |
| **Alternativas** | **A. La API devuelve códigos de error estables y datos de contexto, y el frontend los traduce con un archivo de textos por idioma.** Ventaja: textos separados del código y fácil añadir otro idioma. Limitación: hay que mantener la correspondencia entre códigos y textos.<br>**B. Mensajes en el backend, ya redactados:** simple. Limitación: mezcla presentación con lógica y dificulta cambiar de idioma. |
| **Criterios de Elección** | Separación de textos y código; preparación para i18n; claridad para el usuario; costo. |
| **Decisión** | La API devuelve códigos estables y datos de contexto, y los textos se mantienen en un archivo de recursos de español (es-PE) en el frontend. |
| **Sustento** | El código de error nace de la jerarquía de excepciones (ADR-04), y el texto indica qué ítem falla y cuántas unidades faltan (EC-22). Añadir otro idioma en el final es agregar un archivo. Se sacrifica algo de trabajo de correspondencia, a cambio de textos externos. |
| **Fuentes a consultar** | Documentación de la biblioteca de i18n del frontend elegida; documentación de `Intl` de MDN para monedas y fechas. |

---

# Categoría 7: Elección de Tecnología

## ADR-31: Elección del lenguaje y la plataforma

| Sección | Descripción |
|---|---|
| **Título** | Elección de TypeScript sobre Node.js para el backend |
| **Contexto** | El curso exige contratos, concurrencia con prueba reproducible, profiling y análisis de dependencias transitivas. El proyecto también necesita compartir lenguaje entre frontend y backend para reducir la curva de aprendizaje y facilitar la integración. |
| **Alternativas** | **A. TypeScript sobre Node.js:** tipado estático, unificación del lenguaje con React, ecosistema amplio para API REST, pruebas y acceso a PostgreSQL. Limitación: el modelo de concurrencia es principalmente asíncrono y las operaciones CPU-intensivas deben aislarse.<br>**B. Java:** ecosistema maduro para transacciones y concurrencia. Limitación: introduce un segundo lenguaje y mayor costo de desarrollo para el equipo.<br>**C. Python:** desarrollo rápido. Limitación: tipado menos estricto y menor coherencia con el frontend TypeScript. |
| **Criterios de Elección** | Tipado estático; productividad; integración frontend/backend; soporte de pruebas; acceso transaccional a PostgreSQL; facilidad de despliegue. |
| **Decisión** | Se elige **TypeScript sobre Node.js** como lenguaje y plataforma del backend. |
| **Sustento** | Permite utilizar TypeScript tanto en frontend como backend, reduciendo cambios de contexto y facilitando el intercambio de tipos y contratos de API. Node.js ofrece un modelo asíncrono adecuado para API REST y tareas de I/O, mientras PostgreSQL mantiene las garantías de concurrencia e integridad. |
| **Fuentes a consultar** | Documentación oficial de TypeScript y Node.js; documentación de PostgreSQL; criterios de la plantilla del curso. |
## ADR-32: Elección del framework de backend

| Sección | Descripción |
|---|---|
| **Título** | Elección entre NestJS, Express y Fastify como framework de backend |
| **Contexto** | Se necesitan API REST, validación, acceso a datos, seguridad con sesiones, manejo de transacciones, configuración por perfiles y pruebas de integración. El equipo es pequeño y el tiempo es acotado. |
| **Alternativas** | **A. NestJS:** arquitectura modular, inyección de dependencias, validación, guards, configuración y soporte para pruebas. Ventaja: estructura clara y coherente con un monolito modular. Limitación: añade estructura y abstracciones sobre Node.js.<br>**B. Express:** simple y ampliamente conocido. Limitación: muchas decisiones de arquitectura quedan a cargo del equipo.<br>**C. Fastify:** alto rendimiento y baja sobrecarga. Limitación: requiere definir más piezas de arquitectura e integración por cuenta propia. |
| **Criterios de Elección** | Cobertura funcional; modularidad; validación y seguridad; transacciones; pruebas; documentación y mantenibilidad. |
| **Decisión** | Se usa **NestJS** sobre Node.js, con módulos para API, validación, seguridad, configuración y acceso a datos. |
| **Sustento** | NestJS proporciona una estructura modular coherente con ADR-01 y facilita aplicar inversión de dependencias, guards, validación y pruebas. Se sacrifica parte de la simplicidad de Express a cambio de una arquitectura más verificable y mantenible. |
| **Fuentes a consultar** | Documentación oficial de NestJS, Node.js, Express y Fastify. |
## ADR-33: Elección de la base de datos

| Sección | Descripción |
|---|---|
| **Título** | Elección entre PostgreSQL, MySQL y MongoDB |
| **Contexto** | Se necesitan transacciones multi-tabla, bloqueo de filas (ADR-07), cola de tareas con `SKIP LOCKED` (ADR-09), restricciones `CHECK` y `UNIQUE` (RNF-05) y consultas agregadas. Debe poder ejecutarse en contenedor y en pruebas con la misma versión. |
| **Alternativas** | **A. PostgreSQL:** transacciones ACID, bloqueos de fila explícitos, `SKIP LOCKED`, restricciones `CHECK` y amplio soporte de pruebas con contenedores. Limitación: requiere administrar un servidor.<br>**B. MySQL (InnoDB):** también transaccional y con bloqueos de fila. Limitación: el soporte de restricciones y de algunas funciones depende de la versión, y hay que contrastarlo en la documentación.<br>**C. MongoDB:** documental con transacciones multi-documento. Limitación: modelo menos adecuado para invariantes entre entidades y para agregaciones relacionales. |
| **Criterios de Elección** | Soporte del bloqueo de fila y de `SKIP LOCKED`; restricciones declarativas; pruebas con el motor real; familiaridad; ecosistema. |
| **Decisión** | Se elige PostgreSQL (versión estable vigente) como único almacén de datos y cola de tareas. |
| **Sustento** | Ofrece de forma estándar todo lo que sostiene las decisiones de concurrencia, cola y defensa de integridad, con un único componente. Las pruebas se ejecutan contra el mismo motor, de modo que el comportamiento del bloqueo observado es el real. Se sacrifica la sencillez de un motor embebido y se acepta operar un servidor, ya resuelto con contenedores (ADR-25). |
| **Fuentes a consultar** | Documentación oficial de PostgreSQL, MySQL (InnoDB locking) y MongoDB (transactions). |

## ADR-34: Elección del acceso a datos

| Sección | Descripción |
|---|---|
| **Título** | Elección entre ORM con TypeORM, SQL explícito y Prisma |
| **Contexto** | Hay operaciones con bloqueo de fila, restricciones y consultas agregadas (balance). Se requiere separar el dominio de la persistencia (ADR-02) y mantener el control de las transacciones y del SQL crítico. |
| **Alternativas** | **A. TypeORM:** ORM para TypeScript con repositorios, transacciones y soporte de locks. Ventaja: integración natural con NestJS y productividad. Limitación: algunas consultas críticas requieren SQL explícito.<br>**B. SQL explícito con `pg`:** control total del SQL. Limitación: más código repetitivo y mapeo manual.<br>**C. Prisma:** API de acceso a datos tipada y productiva. Limitación: algunas operaciones avanzadas de bloqueo requieren SQL nativo. |
| **Criterios de Elección** | Soporte de transacciones y bloqueo pesimista; control del SQL crítico; productividad; separación de dominio y persistencia; tipado. |
| **Decisión** | Se usa **TypeORM** para el acceso general y consultas SQL nativas mediante PostgreSQL para operaciones críticas como `FOR UPDATE`, `SKIP LOCKED` y agregaciones específicas. |
| **Sustento** | TypeORM se integra directamente con NestJS y permite mantener repositorios e infraestructura separados del dominio. El SQL nativo se reserva para los puntos donde se necesita control exacto del comportamiento de PostgreSQL. |
| **Fuentes a consultar** | Documentación de TypeORM (DataSource, transacciones, QueryRunner y locks); documentación oficial de PostgreSQL. |
## ADR-35: Elección del algoritmo de hash de contraseñas

| Sección | Descripción |
|---|---|
| **Título** | Elección entre Argon2id, bcrypt y PBKDF2 |
| **Contexto** | Las contraseñas deben almacenarse con hash adaptativo con sal (RNF-11). Una filtración de la base de datos no debe permitir recuperar contraseñas con facilidad (EC-17). El framework de seguridad ofrece codificadores para estos algoritmos. |
| **Alternativas** | **A. Argon2id:** algoritmo ganador de la competencia de hash de contraseñas, configurable en memoria, tiempo y paralelismo; es la primera opción de las guías de OWASP. Limitación: en el framework elegido su codificador requiere una dependencia adicional (Bouncy Castle), que debe incluirse en el análisis de dependencias.<br>**B. bcrypt:** muy difundido, sin dependencias adicionales y con factor de costo configurable. Limitación: limita la longitud efectiva de la contraseña y no es resistente a la memoria como Argon2.<br>**C. PBKDF2:** estándar y aprobado en entornos regulados. Limitación: menos resistente a ataques con hardware especializado. |
| **Criterios de Elección** | Resistencia a ataques fuera de línea; recomendación vigente de OWASP; dependencias adicionales; soporte del framework; facilidad de migrar parámetros. |
| **Decisión** | Se usa Argon2id con parámetros configurables y un esquema de hash que permite actualizarlos en el futuro. |
| **Sustento** | Es la opción recomendada actualmente y resiste mejor los ataques con GPU por su costo en memoria. Se acepta la dependencia adicional y se documenta en el análisis de dependencias transitivas y riesgos (ADR-39); si resultara problemática, bcrypt es el reemplazo directo gracias al codificador delegante que admite varios formatos. Los parámetros se ajustan midiendo el tiempo de verificación en el equipo de despliegue. |
| **Fuentes a consultar** | OWASP Password Storage Cheat Sheet; documentación de NestJS y Passport (`PasswordEncoder`); RFC 9106 (Argon2). |

## ADR-36: Elección del proveedor de OCR

| Sección | Descripción |
|---|---|
| **Título** | Elección entre Azure AI Document Intelligence, AWS Textract (AnalyzeExpense), Google Document AI (Expense Parser) y Tesseract local |
| **Contexto** | Se necesita extraer monto total e ítems (cantidad, descripción, precio) de fotos de comprobantes peruanos (boletas, tickets). El servicio externo es el principal punto de inestabilidad que el proyecto quiere demostrar, pero debe ser utilizable con presupuesto de estudiantes. Todo proveedor queda detrás de la interfaz `OcrClient` (ADR-28), por lo que la decisión es reversible. **Los precios y la calidad deben validarse con una muestra real antes de cerrar la decisión.** |
| **Alternativas** | **A. Azure AI Document Intelligence (modelo de recibos):** modelo preentrenado para recibos que devuelve campos y líneas. Según comparativas secundarias, el nivel de modelos preentrenados cuesta del orden de 10 USD por 1000 páginas (verificar en la página oficial de precios).<br>**B. AWS Textract (AnalyzeExpense):** extracción de gastos con campos y líneas; un ejemplo de precios de AWS lo sitúa alrededor de 0.01 USD por página (verificar). Encaja mejor si el equipo ya usa AWS.<br>**C. Google Document AI (Expense Parser):** procesador específico para recibos. Cada procesador es un recurso que se despliega y consume por separado; costo y configuración más elaborados.<br>**D. Tesseract local:** motor de OCR de código abierto, sin costo ni dependencia de red. Limitación: devuelve texto, no campos estructurados, por lo que el equipo debe construir la interpretación de montos e ítems, y se pierde el caso de un servicio externo inestable. |
| **Criterios de Elección** | Salida estructurada (total e ítems); calidad con boletas peruanas en español; costo y capa gratuita disponibles; facilidad de integración por API REST; límites de uso y su manejo (códigos de rechazo); reversibilidad. |
| **Decisión** | Se adopta un proveedor en la nube con modelo preentrenado de recibos detrás de `OcrClient`, con Azure AI Document Intelligence como candidato principal, a confirmar tras probar una muestra de boletas reales; las pruebas automatizadas usan siempre el cliente simulado. |
| **Sustento** | Un modelo de recibos entrega campos y líneas, reduciendo el trabajo de interpretación, y su API REST con límites y errores propios permite demostrar las fallas reales que el proyecto pretende manejar. Tesseract se descarta como primera opción porque exigiría construir el análisis semántico y eliminaría el servicio externo inestable. La decisión final de proveedor depende de una prueba con unas 20 boletas peruanas y de los costos vigentes; como todo está detrás de una interfaz, un cambio de proveedor es local (EC-27). Se acepta el riesgo de lecturas incorrectas, tratado con validación y revisión obligatoria del usuario (ADR-03, RF-14). |
| **Fuentes a consultar** | Documentación y página de precios oficiales de Azure AI Document Intelligence, AWS Textract y Google Document AI; documentación de Tesseract. |

## ADR-37: Elección de la tecnología de frontend

| Sección | Descripción |
|---|---|
| **Título** | Elección de React con Vite y TypeScript frente a plantillas del servidor y otros frameworks SPA |
| **Contexto** | Se requiere una web responsive para PC y móvil con subida de imágenes, polling de estado y varias pantallas con estado (reparto por unidades y bandeja de pendientes). |
| **Alternativas** | **A. React con Vite y TypeScript (SPA):** componentes reutilizables, tipado estático y ecosistema amplio. Ventaja: buena experiencia para interfaces interactivas y coherencia con el backend TypeScript. Limitación: requiere una toolchain de frontend.<br>**B. Plantillas del servidor:** menos piezas. Limitación: interacciones y estado complejo requieren JavaScript adicional.<br>**C. Vue o Angular:** alternativas válidas, pero no aportan una ventaja clara frente a React para este equipo. |
| **Criterios de Elección** | Experiencia del equipo; soporte de estado y polling; productividad; mantenibilidad; separación entre API y presentación. |
| **Decisión** | Se usa **React + Vite + TypeScript**, con diseño mobile-first y una biblioteca de consultas para el polling. |
| **Sustento** | React permite construir las pantallas interactivas y reutilizar componentes, mientras TypeScript mantiene consistencia de tipos con el backend. La API REST de NestJS se consume directamente desde el frontend. |
| **Fuentes a consultar** | Documentación de React, Vite, TypeScript y TanStack Query; guías de diseño responsive de MDN. |
## ADR-38: Elección de la estrategia y las herramientas de pruebas

| Sección | Descripción |
|---|---|
| **Título** | Elección entre pruebas contra PostgreSQL real con contenedores y servidor simulado, y pruebas con base de datos en memoria y dobles |
| **Contexto** | Los escenarios críticos (concurrencia con bloqueos, atomicidad, unicidad) dependen del comportamiento real del motor. Las fallas del OCR deben inyectarse de forma controlada y repetible sin internet (RNF-32, RNF-36). Las reglas de reparto requieren cientos de casos aleatorios (RNF-33). |
| **Alternativas** | **A. Pruebas de integración con PostgreSQL real en contenedor (Testcontainers), servidor HTTP simulado para el OCR (WireMock), pruebas por propiedades (fast-check) y pruebas arquitectónicas (dependency-cruiser).** Ventaja: el comportamiento de bloqueos y restricciones es el real, y las fallas (retrasos, errores, respuestas corruptas) son configurables. Limitación: requiere Docker y es más lento que las pruebas en memoria.<br>**B. Base de datos en memoria (por ejemplo, H2) y dobles de prueba:** rápido y sin Docker. Limitación: el dialecto, los bloqueos y las restricciones pueden diferir del motor real, por lo que una prueba de concurrencia pasaría sin demostrar nada sobre PostgreSQL. |
| **Criterios de Elección** | Fidelidad del bloqueo y de las restricciones; capacidad de inyectar fallas; reproducibilidad; tiempo de ejecución; evidencia para la defensa. |
| **Decisión** | Se adopta la estrategia con PostgreSQL real en contenedor, WireMock para el OCR, fast-check para propiedades y dependency-cruiser para fronteras, todo ejecutado en integración continua. |
| **Sustento** | La prueba del escenario S/ 60 frente a S/ 70 solo es una evidencia válida si corre contra el motor y el mecanismo de bloqueo reales. Con WireMock se simulan retrasos, errores y respuestas malformadas de forma determinista, y con fast-check se comprueba la invariante de suma sobre muchos casos. Se sacrifica velocidad de ejecución y se exige Docker, resuelto en la integración continua del repositorio. |
| **Fuentes a consultar** | Documentación de Testcontainers, WireMock (simulación de fallas), fast-check y dependency-cruiser; documentación de Vitest/Jest y NestJS. |

## ADR-39: Elección de la gestión de dependencias y el build

| Sección | Descripción |
|---|---|
| **Título** | Elección de npm para dependencias y build, con análisis de vulnerabilidades y SBOM |
| **Contexto** | La rúbrica exige análisis de dependencias transitivas y riesgos. Las versiones deben fijarse para builds reproducibles y se necesita documentar vulnerabilidades, licencias y componentes. |
| **Alternativas** | **A. npm:** gestor incluido en Node.js, ampliamente soportado y con `package-lock.json`. Ventaja: disponibilidad inmediata y herramientas estándar. Limitación: instalaciones algo más pesadas.<br>**B. pnpm:** instalaciones eficientes y almacenamiento compartido. Limitación: una herramienta adicional que el equipo debe conocer.<br>**C. Yarn:** alternativa madura con lockfile. |
| **Criterios de Elección** | Reproducibilidad; árbol de dependencias; auditoría de vulnerabilidades; compatibilidad con CI; conocimiento del equipo. |
| **Decisión** | Se usa **npm** con `package-lock.json`, `npm audit`, análisis de licencias y generación de SBOM en formato CycloneDX en la integración continua. |
| **Sustento** | npm forma parte del ecosistema Node.js y permite obtener el árbol transitivo y fijar versiones mediante el lockfile. Se mantiene una herramienta estándar para reducir complejidad operativa. |
| **Fuentes a consultar** | Documentación oficial de npm, Node.js, `npm audit` y CycloneDX. |
## ADR-40: Elección del logging estructurado y la correlación

| Sección | Descripción |
|---|---|
| **Título** | Elección entre logs estructurados con identificador de correlación, logs de texto libre y herramientas de APM |
| **Contexto** | Se debe poder reconstruir quién hizo qué (auditoría, RNF-28) y seguir una subida de comprobante de punta a punta entre la API y el worker (RNF-29), sin registrar datos sensibles. El final exige logs estructurados y métricas. |
| **Alternativas** | **A. Logs en formato JSON con campos estándar (usuario, operación, resultado) y un identificador de correlación propagado a la tarea en segundo plano (contexto de diagnóstico del logger).** Ventaja: consultable por campo y compatible con las herramientas del final. Limitación: hay que definir los campos y propagarlos.<br>**B. Logs de texto libre:** inmediatos. Limitación: difíciles de filtrar y de enlazar solicitudes con tareas.<br>**C. Herramienta de APM comercial:** trazas y métricas listas. Limitación: costo y dependencia externa que el alcance de v1.0 no contempla. |
| **Criterios de Elección** | Capacidad de auditoría y de diagnóstico; seguimiento entre procesos; no registrar datos sensibles; preparación para métricas y trazas del final; costo. |
| **Decisión** | Se usan logs JSON con un identificador de correlación que viaja de la solicitud web a la tarea del worker, y una lista de campos prohibidos (contraseñas, tokens, contenido de evidencias). |
| **Sustento** | Con un solo identificador se sigue una subida de comprobante por todos sus reintentos (EC-24), y los campos de auditoría hacen reconstruible el flujo de un pago (EC-23). Es la base para métricas y trazas con herramientas estándar en el final. Se sacrifica algo de esfuerzo inicial de definición de campos. |
| **Fuentes a consultar** | Documentación del framework de logging elegido (contexto de diagnóstico o MDC); OWASP Logging Cheat Sheet; documentación de Micrometer y OpenTelemetry para el final. |