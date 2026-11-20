# Guión Oficial de Exposición — Evaluación PC3 (SW707 UNI FIIS)
**Proyecto:** SplitVision · Sistema Distribuido de Reparto de Gastos  
**Grupo 2:** Gonzalo Albornoz, Luis Angel Vargas, Farid Zamudio  
**Ciclo:** 2026-II · FIIS UNI  

---

## Índice Rápido de la Presentación
- [Diapositiva 1: Portada Oficial](#diapositiva-1-portada-oficial)
- [Diapositiva 2: Hoja de Ruta de la Unidad 3](#diapositiva-2-hoja-de-ruta-de-la-unidad-3)
- [Diapositiva 3: Topología de Servicios Desacoplados](#diapositiva-3-topología-de-servicios-desacoplados)
- [Diapositiva 4: Tablas de Decisión O(1) para Reglas de Pago](#diapositiva-4-tablas-de-decisión-o1-para-reglas-de-pago)
- [Diapositiva 5: Máquinas de Estados Finitos (FSM)](#diapositiva-5-máquinas-de-estados-finitos-fsm)
- [Diapositiva 6: Demostración Interactiva de la FSM en Vivo](#diapositiva-6-demostración-interactiva-de-la-fsm-en-vivo)
- [Diapositiva 7: Enlace Tardío (Late Binding) y Feature Flags](#diapositiva-7-enlace-tardío-late-binding-y-feature-flags)
- [Diapositiva 8: Los Tres Pilares de la Observabilidad](#diapositiva-8-los-tres-pilares-de-la-observabilidad)
- [Diapositiva 9: Trazabilidad Contextual con MDC y AsyncLocalStorage](#diapositiva-9-trazabilidad-contextual-con-mdc-y-asynclocalstorage)
- [Diapositiva 10: Modelo RED y Exportador Prometheus](#diapositiva-10-modelo-red-y-exportador-prometheus)
- [Diapositiva 11: Perfilado de Runtime y Análisis de Flame Graph](#diapositiva-11-perfilado-de-runtime-y-análisis-de-flame-graph)
- [Diapositiva 12: Suites de Pruebas Automatizadas y Verificación](#diapositiva-12-suites-de-pruebas-automatizadas-y-verificación)
- [Diapositiva 13: Cumplimiento de la Rúbrica Oficial PC3](#diapositiva-13-cumplimiento-de-la-rúbrica-oficial-pc3)

---

## Diapositiva 1: Portada Oficial

### Qué decir en voz alta:
> *"Buenos días profesor y compañeros. Somos el Grupo 2, conformado por Gonzalo Albornoz, Luis Angel Vargas y Farid Zamudio. El día de hoy presentaremos la evolución arquitectónica de nuestro sistema **SplitVision**, aplicando formalmente los dos ejes centrales de la Unidad 3: **Construcción Dirigida por Datos** (Semana 9) y **Observabilidad y Rendimiento en Sistemas Distribuidos** (Semana 10)."*

### Por qué se hizo:
Establece desde el primer segundo que la exposición no es una entrega genérica de CRUD, sino una demostración rigurosa de patrones de ingeniería de software sobre un sistema distribuido real.

---

## Diapositiva 2: Hoja de Ruta de la Unidad 3

### Qué decir en voz alta:
> *"Para entender el valor de lo que hemos construido, debemos observar la progresión técnica del curso. Durante las semanas 1 a 8 nos enfocamos en que el software **no se caiga**: implementamos programación defensiva, contratos estrictos y transacciones ACID en PostgreSQL con bloqueos pesimistas para evitar inconsistencias de cobro simultáneo.*
>
> *En la **Semana 9**, dimos el salto hacia la **Lógica Dirigida por Datos**: retiramos las reglas de negocio de los condicionales del código y las modelamos mediante matrices y autómatas formales en memoria con búsqueda $O(1)$ y banderas de características reactivas.*
>
> *Finalmente, en la **Semana 10**, abordamos la **Observabilidad de Runtime**: no basta con que el sistema funcione en local; instrumentamos métricas RED en tiempo real, logs contextuales con MDC y perfilamos con Flame Graphs el algoritmo de reparto, logrando reducir la deuda técnica en un 70%."*

### Por qué se hizo:
- **Justificación de Ingeniería:** Conecta la PC1/PC2 con la PC3. Demuestra que cada tema del sílabo responde a una necesidad arquitectónica real y medible en producción.

---

## Diapositiva 3: Topología de Servicios Desacoplados

### Qué decir en voz alta:
> *"SplitVision está diseñado como una arquitectura desacoplada de dos componentes. Por un lado, tenemos el **API Gateway en NestJS**, optimizado para atender tráfico HTTP REST con latencias menores a 10 ms. Cuando un usuario sube una fotografía de su comprobante o boleta, la API no ejecuta el reconocimiento óptico de caracteres de manera síncrona, ya que eso congelaría la conexión HTTP del usuario.*
>
> *En su lugar, registra la boleta en la cola `receipt_jobs` de PostgreSQL con estado `PROCESANDO` y responde de inmediato. En segundo plano, un **Worker asíncrono de OCR** consume las tareas utilizando la cláusula `FOR UPDATE SKIP LOCKED`. Esta cláusula garantiza que múltiples instancias del worker puedan procesar boletas en paralelo sin bloquearse mutuamente ni generar condiciones de carrera.*
>
> *Además, protegemos el worker con el patrón Circuit Breaker: si el motor de OCR sufre saturación, la falla queda contenida y la API principal sigue operando al 100% de disponibilidad."*

### Por qué se hizo:
- **Aislamiento de fallas:** El procesamiento de imágenes con Tesseract es intensivo en CPU y memoria. Si corriera en el mismo hilo de NestJS, bloquearía el Event Loop y degradaría a todos los demás comensales.
- **Concurrencia limpia:** `SKIP LOCKED` en PostgreSQL permite colas de mensajería altamente concurrentes sin necesidad de desplegar infraestructura adicional como RabbitMQ o Kafka para esta escala.

### Pregunta típica del profesor:
> **Profesor:** *¿Por qué usaron PostgreSQL como cola en lugar de Redis o RabbitMQ?*  
> **Respuesta:** *Porque al utilizar transacciones ACID en PostgreSQL garantizamos persistencia estricta y atomicidad entre el estado de la boleta y el trabajo de la cola en una sola transacción, eliminando el problema de mensajes fantasmas en caso de reinicio.*

---

## Diapositiva 4: Tablas de Decisión O(1) para Reglas de Pago

### Qué decir en voz alta:
> *"Entrando a la Semana 9: **Construcción Dirigida por Datos**. En sistemas comerciales, las reglas de validación de pagos suelen implementarse mediante cascadas de `if / else` o `switch / case` anidados en los controladores. Esto genera un alto acoplamiento, eleva la complejidad ciclomática y obliga a modificar el código fuente y recompilar cada vez que se agrega un método de pago o se altera una política.*
>
> *En SplitVision eliminamos por completo esa lógica imperativa. Creamos la estructura `PAYMENT_RULES_TABLE` en `src/modules/pagos/payment-rules.ts`. Las políticas (como si se exige captura de pantalla para Yape o si se permite pago directo para Efectivo) residen en una tabla indexada en memoria.*
>
> *Ahora el servicio de pagos simplemente ejecuta `PAYMENT_RULES_TABLE[metodo]`. La búsqueda se ejecuta en tiempo constante $O(1)$ sin evaluar condicionales, y agregar un nuevo canal de pago toma solo una línea en la estructura de datos."*

### Por qué se hizo:
- **Principio Open/Closed (SOLID):** El código del controlador queda cerrado a modificaciones pero abierto a extensiones mediante datos.
- **Eficiencia algorítmica:** Reducción de complejidad ciclomática de $O(n)$ a $O(1)$.

---

## Diapositiva 5: Máquinas de Estados Finitos (FSM)

### Qué decir en voz alta:
> *"Otro principio crucial de la Semana 9 son las **Máquinas de Estados Finitos (FSM)**. En aplicaciones de reparto de cuentas, un riesgo crítico de negocio es que un comprobante termine en un estado corrupto; por ejemplo, que se confirme un reparto sin haber extraído los platos o sin haber verificado los montos.*
>
> *Para impedirlo matemáticamente por diseño, implementamos una FSM formal en `src/common/fsm.ts`. Definimos la matriz de adyacencia estricta del comprobante: `CARGADO` solo puede transicionar a `PROCESANDO`; `PROCESANDO` a `EXTRAÍDO` o `FALLIDO`; y `EXTRAÍDO` a `CONFIRMADO`. El estado `CONFIRMADO` es terminal e inmutable.*
>
> *Si cualquier cliente o script intenta forzar una transición no autorizada, el motor de la FSM rechaza la operación inmediatamente con una excepción `409 Conflict`, protegiendo la base de datos de cualquier estado huérfano."*

### Por qué se hizo:
- **Integridad del dominio:** No se depende de validaciones manuales dispersas. La integridad está regida por la topología del grafo de estados.

---

## Diapositiva 6: Demostración Interactiva de la FSM en Vivo

### Qué hacer e interactuar en vivo:
*(Haz clic en los botones de la diapositiva en orden)*
1. Haz clic en **`▶ Transición Legal (1 → 2: Iniciar OCR)`**.
   > *"Profesor, aquí vemos cómo la FSM valida la matriz de adyacencia y aprueba la transición de `CARGADO` a `PROCESANDO`, retornando HTTP 200 OK."*
2. Haz clic en **`▶ Transición Legal (2 → 3: Extraer Platos)`** y luego en **`▶ Transición Legal (3 → 4: Confirmar)`**.
   > *"El ciclo formal se completa con éxito hasta el estado inmutable `CONFIRMADO`."*
3. Haz clic en **`↺ Reiniciar`** y luego haz clic en el botón rojo: **`✖ Salto Ilegal (1 → 4: Confirmar Directo)`**.
   > *"Ahora observemos qué ocurre si un atacante o cliente desactualizado intenta saltarse los pasos enviando un POST de confirmación directamente sobre una boleta en `CARGADO`. La FSM intercepta el payload y devuelve instantáneamente un HTTP 409 Conflict con su respectivo `trace_id`."*

### Por qué se hizo:
Demuestra que el código no solo está escrito en teoría, sino que está activo, funcional y conectado al protocolo HTTP.

---

## Diapositiva 7: Enlace Tardío (Late Binding) y Feature Flags

### Qué decir en voz alta:
> *"La Diapositiva 8 de la Semana 9 introduce el concepto de **Late Binding** o Enlace Tardío: diferir la resolución de decisiones operativas hasta el último momento posible en tiempo de ejecución.*
>
> *¿Cómo aplicamos esto a la resiliencia de SplitVision? El reconocimiento óptico con Tesseract puede sufrir degradación si los usuarios suben boletas arrugadas, con sombras o de resoluciones atípicas, disparando el uso de CPU.*
>
> *Mediante nuestro servicio `FeatureFlagsService` en `src/common/feature-flags.service.ts`, implementamos banderas reactivas en memoria. Si detectamos sobrecarga en el worker, conmutamos la bandera `OCR_AUTOMATICO = FALSE` y activamos el `MODO_MANUAL_FORZADO = TRUE`.*
>
> *(Aquí puedes presionar el botón 'Alternar' en la lámina)*.
> *El cambio se aplica en **0 milisegundos**, sin requerir reinicios de servidor ni nuevos despliegues en Docker. El usuario simplemente es guiado a ingresar los ítems manualmente, preservando el 100% de operatividad del negocio."*

### Por qué se hizo:
- **Degradación elegante (Graceful Degradation):** Un fallo en el subsistema de visión por computadora jamás debe traducirse en indisponibilidad del servicio principal.

---

## Diapositiva 8: Los Tres Pilares de la Observabilidad

### Qué decir en voz alta:
> *"Pasamos a la Semana 10: **Observabilidad y Rendimiento en Sistemas Distribuidos**. En sistemas en producción, la monitorización pasiva (saber si un proceso está vivo) es insuficiente. Necesitamos explicar las causas internas del sistema a partir de sus salidas externas.*
>
> *Para ello instrumentamos los tres pilares clásicos:
> 1. **Logs Estructurados:** Emitidos exclusivamente en formato JSON enriquecidos con contexto de diagnóstico. Representan el historial clínico de cada evento.
> 2. **Métricas RED:** *Rate* (volumen de tráfico), *Errors* (fallos de servicio) y *Duration* (distribución de latencias). Representan los signos vitales continuos del backend.
> 3. **Trazas Distribuidas con OpenTelemetry:** Spans que miden el costo temporal exacto en cada capa de abstracción, funcionando como una resonancia magnética."*

### Por qué se hizo:
- Alineación estricta con la rúbrica y las diapositivas oficiales de la Unidad 3 (Semana 10).

---

## Diapositiva 9: Trazabilidad Contextual con MDC y AsyncLocalStorage

### Qué decir en voz alta:
> *"En la Diapositiva 3 de la Semana 10 se estudia el **Mapped Diagnostic Context (MDC)**. En entornos concurrentes como Node.js, donde múltiples peticiones se intercalan en el mismo hilo, ¿cómo logramos que un log sepa a qué usuario o petición pertenece sin pasar manualmente un parámetro `traceId` en cada una de las funciones del sistema?*
>
> *En Java se utiliza `org.slf4j.MDC` basado en ThreadLocal. En TypeScript/Node.js implementamos el equivalente moderno mediante **`AsyncLocalStorage`** en `src/common/correlation.ts`.*
>
> *Un middleware intercepta cada solicitud entrante, genera un UUID de traza e inicializa el contexto asíncrono. Cualquier log emitido en cualquier servicio o repositorio incluye automáticamente `trace_id`, `user_id` e `ip`. Si un usuario nos reporta un incidente, filtramos en producción por su `trace_id` y obtenemos la secuencia cronológica exacta en menos de 30 segundos."*

### Por qué se hizo:
- **Desacoplamiento de firmas:** Evita el antipatrón de "contaminación de parámetros" (pasar `req` o `traceId` en toda la jerarquía de servicios).

---

## Diapositiva 10: Modelo RED y Exportador Prometheus

### Qué decir en voz alta:
> *"Para las métricas en vivo adoptamos el **Modelo RED** diseñado por Tom Wilkie para arquitecturas de microservicios:*
> - ***Rate (Tasa):*** *Monitoreamos las peticiones por segundo sostenidas.*
> - ***Errors (Errores):*** *Registramos la proporción de errores HTTP 5xx, manteniéndola por debajo del 0.01%.*
> - ***Duration (Duración):*** *Y lo más importante: no medimos promedios engañosos. Medimos **percentiles** ($p50, p90, p95, p99$).*
>
> *Como se observa en el panel, nuestra mediana $p50$ es de 1.8 ms y el percentil 95 está en 4.2 ms. Además, nuestro endpoint `/api/admin/metrics` expone estos indicadores en formato estandarizado para raspado automático de Prometheus y visualización en dashboards de Grafana."*

### Por qué se hizo:
- **Por qué percentiles y no promedios:** El promedio oculta los peores casos (*outliers*). El $p95$ y $p99$ garantizan que el 95% o 99% de los usuarios reales experimenten tiempos de respuesta óptimos según el SLA.

---

## Diapositiva 11: Perfilado de Runtime y Análisis de Flame Graph

### Qué decir en voz alta:
> *"Para optimizar un sistema, primero debemos medir con precisión científica dónde consume tiempo. Ejecutamos un benchmark formal en `scripts/benchmark-profiling.js` sobre nuestro algoritmo central de reparto de cuentas (el algoritmo de mayor residuo de Hamilton, que garantiza la distribución exacta de centavos y propinas).*
>
> *Sometimos el motor a una carga masiva de **50 participantes y 150 ítems de consumo**. El cálculo matemático tomó apenas **0.062 ms**, lo que equivale a una capacidad teórica de más de **16,000 repartos por segundo** en un solo núcleo.*
>
> *Al analizar el **Flame Graph**, observamos la distribución de la flama de ejecución: el **85% del tiempo** corresponde a bloqueos de persistencia e I/O en PostgreSQL, mientras que el cálculo en CPU toma solo el **15%**.*
>
> *Nuestro diagnóstico de arquitectura es concluyente: **el sistema es estrictamente I/O-Bound**. Optimizar más el algoritmo matemático sería un esfuerzo estéril; si requerimos mayor throughput en el futuro, la estrategia correcta es escalar el pool de conexiones y emplear réplicas de lectura."*

### Por qué se hizo:
- **Ley de Amdahl:** Demuestra madurez de ingeniería al no realizar optimizaciones prematuras en componentes que solo representan el 15% del tiempo de respuesta.

---

## Diapositiva 12: Suites de Pruebas Automatizadas y Verificación

### Qué decir en voz alta:
> *"La confiabilidad de estos mecanismos está sustentada en una suite automatizada de pruebas unitarias y de integración que suma 39 pruebas aprobadas al 100%:*
> - *`test/fsm.test.ts`: Verifica todas las transiciones válidas y bloquea los saltos 409.*
> - *`test/payment-rules.test.ts`: Comprueba la búsqueda en $O(1)$ y la validación de evidencias según el método de pago.*
> - *`test/telemetry.test.ts`: Comprueba el aislamiento de contexto en `AsyncLocalStorage` y el cálculo de percentiles RED.*
> - *`test/properties.test.ts`: Pruebas basadas en propiedades con `fast-check` que comprueban invariantes matemáticas de conservación de sumas.*
>
> *Todas las pruebas pueden ser ejecutadas directamente en terminal con los comandos que se muestran en pantalla."*

---

## Diapositiva 13: Cumplimiento de la Rúbrica Oficial PC3

### Qué decir en voz alta:
> *"Para finalizar, revisamos el checklist formal de evaluación de la PC3 correspondiente a las semanas 9 y 10:
> 1. ✅ **Servicio Distribuido:** API REST y Worker OCR desacoplados mediante colas concurrentes seguras en PostgreSQL.
> 2. ✅ **Tablas y FSM Declarativa:** Reglas indexadas $O(1)$ y máquina de estados que previene inconsistencias por diseño.
> 3. ✅ **Enlace Tardío (Late Binding):** Banderas de características reactivas para contingencia operativa inmediata sin reinicio.
> 4. ✅ **Logs con MDC y Modelo RED:** Trazabilidad con `AsyncLocalStorage` y métricas expuestas para Prometheus.
> 5. ✅ **Perfilado de Runtime:** Diagnóstico formal I/O-Bound y Flame Graph con benchmarks de latencia y memoria.
>
> Con esto demostramos el cumplimiento total de los objetivos de la Unidad 3. Quedamos a su disposición para responder cualquier consulta o ejecutar las pruebas en vivo. Muchas gracias."*
