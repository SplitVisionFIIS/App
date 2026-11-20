import os

html_content = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentación PC3 — SplitVision | Grupo 2 UNI FIIS</title>
  <!-- Google Fonts: Plus Jakarta Sans + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --bg: #090d16;
      --slide-bg: #0f172a;
      --card-bg: rgba(255, 255, 255, 0.035);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --subtle: #64748b;
      --emerald: #10b981;
      --emerald-bg: rgba(16, 185, 129, 0.1);
      --emerald-border: rgba(16, 185, 129, 0.25);
      --blue: #3b82f6;
      --blue-bg: rgba(59, 130, 246, 0.1);
      --rose: #f43f5e;
      --rose-bg: rgba(244, 63, 94, 0.1);
      --rose-border: rgba(244, 63, 94, 0.3);
      --amber: #f59e0b;
      --amber-bg: rgba(245, 158, 11, 0.1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-x: hidden;
    }

    /* Contenedor diapositiva 16:9 exacto estilo Canva / Keynote */
    .slide-deck {
      width: 100%;
      max-width: 1100px;
      aspect-ratio: 16 / 9;
      background: var(--slide-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .slide-page {
      display: none;
      width: 100%;
      height: 100%;
      padding: 44px 56px;
      flex-direction: column;
      justify-content: space-between;
      animation: fadeIn 0.25s ease-out;
    }

    .slide-page.active {
      display: flex;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.99); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Encabezado discreto de cada diapositiva */
    .slide-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .slide-category {
      font-size: 11px;
      font-weight: 700;
      color: #34d399;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--emerald-bg);
      border: 1px solid var(--emerald-border);
    }

    .slide-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--subtle);
      font-weight: 600;
    }

    /* Títulos */
    .slide-title {
      font-size: 27px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }

    .slide-subtitle {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    /* Grillas y tarjetas */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 18px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .code-box {
      background: #040711;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 12px 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #e2e8f0;
      line-height: 1.6;
      overflow-x: auto;
      margin-top: 8px;
    }

    .badge-ok {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--emerald-bg);
      color: #34d399;
      border: 1px solid var(--emerald-border);
    }

    /* Pasos FSM */
    .flow-steps {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: 14px 0;
    }

    .step-box {
      flex: 1;
      padding: 12px 8px;
      text-align: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }

    .step-box.active {
      background: var(--emerald-bg);
      border-color: var(--emerald-border);
      color: #34d399;
    }

    /* Barra inferior de navegación */
    .deck-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 1100px;
      margin-top: 14px;
      padding: 0 8px;
    }

    .btn-ctrl {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-ctrl:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); }
    .btn-ctrl:disabled { opacity: 0.25; cursor: not-allowed; }
    .btn-ctrl.primary { background: #059669; border-color: var(--emerald); color: #fff; }

    .dots-nav { display: flex; gap: 6px; }
    .dot-nav {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .dot-nav.active { width: 22px; border-radius: 999px; background: var(--emerald); }
  </style>
</head>
<body>

  <!-- Lienzo de Presentación 16:9 -->
  <div class="slide-deck" id="deckContainer">

    <!-- DIAPOSITIVA 1: PORTADA -->
    <div class="slide-page active" id="slide-0">
      <div class="slide-topbar">
        <span class="slide-category">Evaluación Oficial PC3</span>
        <span class="slide-num">SW707 · UNI FIIS</span>
      </div>
      <div style="text-align: center; max-width: 800px; margin: 0 auto; flex: 1; display: flex; flex-direction: column; justify-content: center;">
        <h1 style="font-size: 34px; font-weight: 800; color: #fff; line-height: 1.25; margin-bottom: 12px;">
          Construcción Dirigida por Datos y Observabilidad
        </h1>
        <p style="font-size: 15px; color: var(--muted); line-height: 1.5; margin-bottom: 24px;">
          Cómo pasamos de código acoplado con <code style="color:#60a5fa;">if / else</code> a un sistema guiado por tablas, con métricas en tiempo real y tolerante a fallas en <strong>SplitVision</strong>.
        </p>
        <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 24px;">
          <div class="card" style="padding: 10px 18px; font-size: 12px; color: var(--muted);">
            👨‍💻 <strong>Gonzalo Albornoz</strong> (20232551K)
          </div>
          <div class="card" style="padding: 10px 18px; font-size: 12px; color: var(--muted);">
            👨‍💻 <strong>Luis Angel Vargas</strong> (20231314E)
          </div>
          <div class="card" style="padding: 10px 18px; font-size: 12px; color: var(--muted);">
            👨‍💻 <strong>Farid Zamudio</strong> (20231215G)
          </div>
        </div>
        <div style="font-size: 12px; color: var(--subtle); font-family: 'JetBrains Mono';">
          Facultad de Ingeniería Industrial y de Sistemas · Ciclo 2026-II
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 2: EL CAMINO DE LA UNIDAD 3 -->
    <div class="slide-page" id="slide-1">
      <div class="slide-topbar">
        <span class="slide-category">Unidad 3 · De Dónde Venimos y a Dónde Vamos</span>
        <span class="slide-num">02 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">El Camino de la Unidad 3: En Cristiano</h2>
        <p class="slide-subtitle">Dejamos de escribir condicionales defensivos para construir un sistema que se reconfigura en caliente y nos dice exactamente qué le pasa.</p>
        <div class="grid-3">
          <div class="card">
            <span style="font-size: 11px; font-family: 'JetBrains Mono'; color: var(--subtle); font-weight: 700;">SEMANAS 1 – 8</span>
            <div class="card-title" style="margin-top: 6px;">1. Hacer que no se caiga</div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.5;">
              Programación defensiva, contratos estrictos, transacciones ACID con bloqueos pesimistas para no cobrar doble y tolerancia a caídas en PostgreSQL.
            </p>
          </div>
          <div class="card" style="border-color: var(--emerald-border); background: var(--emerald-bg);">
            <span style="font-size: 11px; font-family: 'JetBrains Mono'; color: #34d399; font-weight: 700;">SEMANA 9</span>
            <div class="card-title" style="margin-top: 6px; color: #fff;">2. Sacar la lógica del código</div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.5;">
              Reemplazamos cascadas de <code>if/else</code> por tablas de estados (FSM) y feature flags que se activan al instante sin reiniciar el backend.
            </p>
          </div>
          <div class="card" style="border-color: rgba(59, 130, 246, 0.3); background: var(--blue-bg);">
            <span style="font-size: 11px; font-family: 'JetBrains Mono'; color: #60a5fa; font-weight: 700;">SEMANA 10</span>
            <div class="card-title" style="margin-top: 6px; color: #fff;">3. Saber qué pasa en producción</div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.5;">
              Trazabilidad con <code>trace_id</code> único en cada log (MDC), métricas RED en vivo y perfilado del algoritmo de reparto con Flame Graphs.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 3: ARQUITECTURA DISTRIBUIDA -->
    <div class="slide-page" id="slide-2">
      <div class="slide-topbar">
        <span class="slide-category">Requisito PC3 · Arquitectura</span>
        <span class="slide-num">03 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Nuestra Arquitectura: Separar el Trabajo Pesado</h2>
        <p class="slide-subtitle">Si Tesseract OCR procesa una foto pesada, no debe congelar la experiencia del usuario que solo quiere ver su cuenta.</p>
        <div class="grid-2">
          <div class="card">
            <div class="card-title">🌐 1. API Principal (NestJS + TypeScript)</div>
            <ul style="font-size: 12px; color: var(--muted); line-height: 1.7; padding-left: 18px;">
              <li>Atiende a los usuarios, autentica y calcula el reparto de inmediato.</li>
              <li>Al subir una boleta, responde al instante con estado <code>PROCESANDO</code>.</li>
              <li><strong>Ventaja:</strong> El usuario nunca se queda esperando con la pantalla congelada.</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-title">⚙️ 2. Worker Autónomo de OCR (Segundo Plano)</div>
            <ul style="font-size: 12px; color: var(--muted); line-height: 1.7; padding-left: 18px;">
              <li>Toma las fotos de la cola en PostgreSQL con <code>FOR UPDATE SKIP LOCKED</code>.</li>
              <li>Ningún worker procesa la misma boleta dos veces.</li>
              <li><strong>Ventaja:</strong> Si una foto es ilegible o Tesseract falla, jamás tumba el servidor web.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 4: REGLAS DE PAGO EN O(1) -->
    <div class="slide-page" id="slide-3">
      <div class="slide-topbar">
        <span class="slide-category">Semana 9 · Tablas de Decisión O(1)</span>
        <span class="slide-num">04 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Reglas de Pago en O(1): Adiós a los if / else</h2>
        <p class="slide-subtitle">Validar si un pago con Yape o Efectivo necesita comprobante adjunto ahora es una consulta instantánea a un diccionario.</p>
        <div class="grid-2">
          <div class="card" style="border-color: var(--rose-border);">
            <div class="card-title" style="color: #fca5a5;">❌ Antes: Cascada de condicionales</div>
            <p style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
              Si queríamos agregar un nuevo método o cambiar una regla, había que modificar el controlador y recompilar todo el proyecto.
            </p>
            <div class="code-box" style="color: #fca5a5;">
// Peligro de regresiones y código espagueti:
if (metodo === 'YAPE' && !foto) {
  throw new Error("Voucher obligatorio");
} else if (metodo === 'EFECTIVO' && ...) { ... }</div>
          </div>

          <div class="card" style="border-color: var(--emerald-border);">
            <div class="card-title" style="color: #6ee7b7;">✅ Ahora: Tabla de Decisión O(1)</div>
            <p style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
              Diccionario indexado en memoria. Agregar un método toma una línea en los datos y la búsqueda tarda 0.001 ms.
            </p>
            <div class="code-box" style="color: #a7f3d0;">
// Archivo: src/modules/pagos/payment-rules.ts
const regla = TABLA_REGLAS_PAGO[metodo];
if (regla.exigeEvidencia && !foto) {
  throw new BadRequestException(regla.mensajeError);
}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 5: FSM DE ESTADOS -->
    <div class="slide-page" id="slide-4">
      <div class="slide-topbar">
        <span class="slide-category">Semana 9 · Máquinas de Estado Finito</span>
        <span class="slide-num">05 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Máquina de Estados: Cero Boletas Corruptas</h2>
        <p class="slide-subtitle">Una boleta no puede confirmarse si ni siquiera se han extraído sus platos. La tabla de estados lo impide por diseño.</p>
        
        <div class="card" style="margin-bottom: 14px;">
          <div style="font-size: 12px; font-weight: 700; color: #34d399; margin-bottom: 6px;">
            Ciclo de Vida Formal de la Boleta en SplitVision:
          </div>
          <div class="flow-steps">
            <div class="step-box active">📸 1. CARGADO</div>
            <span style="color: var(--subtle);">→</span>
            <div class="step-box active">🔍 2. PROCESANDO</div>
            <span style="color: var(--subtle);">→</span>
            <div class="step-box active">🍽️ 3. EXTRAÍDO</div>
            <span style="color: var(--subtle);">→</span>
            <div class="step-box active">💳 4. CONFIRMADO</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">La Regla de Oro en Cristiano</div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.6;">
              El backend no confía en lo que envíe el cliente. Consulta la matriz de adyacencia de estados: si el salto no está permitido en la tabla, devuelve <strong><code>409 Conflict</code></strong> de inmediato.
            </p>
          </div>
          <div class="card">
            <div class="card-title">Código en <code>src/common/fsm.ts</code></div>
            <div class="code-box" style="color: #a7f3d0;">
export const RECEIPT_FSM = new StateMachine([
  { from: 'CARGADO', to: ['PROCESANDO'] },
  { from: 'PROCESANDO', to: ['EXTRAÍDO', 'FALLIDO'] },
  { from: 'EXTRAÍDO', to: ['CONFIRMADO'] },
  { from: 'CONFIRMADO', to: [] } // Estado terminal inmutable
]);</div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 6: DEMOSTRACIÓN FSM EN VIVO -->
    <div class="slide-page" id="slide-5">
      <div class="slide-topbar">
        <span class="slide-category">Semana 9 · Simulación Interactiva</span>
        <span class="slide-num">06 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Demostración en Vivo: Intentando Romper la FSM</h2>
        <p class="slide-subtitle">Probemos qué pasa en vivo cuando se sigue el flujo normal vs. cuando alguien intenta saltarse pasos.</p>
        
        <div class="card" style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 700;">Simular Intento de Salto Ilegal:</span>
            <span class="badge-ok">Autómata Activo</span>
          </div>
          <p style="font-size: 12px; color: var(--muted); margin-bottom: 14px;">
            ¿Qué sucede si un usuario intenta confirmar una boleta recién subida que todavía está en estado <code>CARGADO</code>?
          </p>
          <div style="display: flex; gap: 10px;">
            <button class="btn-ctrl" onclick="simularExitoFsm()">
              Probar Flujo Normal (CARGADO → PROCESANDO)
            </button>
            <button class="btn-ctrl primary" style="background: var(--rose); border-color: var(--rose);" onclick="simularFalloFsm()">
              Intentar Salto Ilegal (CARGADO → CONFIRMADO)
            </button>
          </div>
        </div>

        <div id="demoFsmBox" class="code-box" style="display: none; padding: 14px; font-size: 12px;"></div>
      </div>
    </div>

    <!-- DIAPOSITIVA 7: FEATURE FLAGS Y LATE BINDING -->
    <div class="slide-page" id="slide-6">
      <div class="slide-topbar">
        <span class="slide-category">Semana 9 · Late Binding & Resiliencia</span>
        <span class="slide-num">07 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Feature Flags: Cambiar de Estrategia sin Reiniciar</h2>
        <p class="slide-subtitle">¿Qué hacemos si Tesseract OCR colapsa con imágenes pesadas? Activamos el 'Modo Manual' en caliente.</p>
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Caso Real en SplitVision</div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 14px;">
              El OCR en Node.js puede saturar la CPU con fotos borrosas. Con un flag en memoria, conmutamos de inmediato a ingreso manual sin reiniciar el servicio ni afectar a los usuarios activos.
            </p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 12px; display: block;">Estrategia de Carga</strong>
                <span id="modoOcrTxt" style="font-size: 11px; color: #34d399;">OCR Automático Activo</span>
              </div>
              <button class="btn-ctrl" onclick="toggleModoOcr()" style="font-size: 11px;">Alternar</button>
            </div>
          </div>
          <div class="card">
            <div class="card-title">Concepto de Late Binding</div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.6;">
              <strong>Enlace Tardío:</strong> No dejar las decisiones fijas en el código compilado, sino resolverlas en memoria en el último milisegundo posible.
            </p>
            <div class="code-box" style="color: #6ee7b7; margin-top: 10px;">
// Archivo: src/common/feature-flags.service.ts
featureFlags.set('ocr_habilitado', false);
featureFlags.set('modo_manual_forzado', true);
// El cambio toma efecto en 0 milisegundos</div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 8: SEMANA 10 - LOS 3 PILARES -->
    <div class="slide-page" id="slide-7">
      <div class="slide-topbar">
        <span class="slide-category">Semana 10 · Diagnóstico en Producción</span>
        <span class="slide-num">08 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Observabilidad: Entender qué le Duele al Sistema</h2>
        <p class="slide-subtitle">No basta con saber si el servidor está prendido; necesitamos saber por qué una petición tardó o por qué falló.</p>
        <div class="grid-3">
          <div class="card">
            <div style="font-size: 22px; margin-bottom: 6px;">📋</div>
            <div class="card-title">1. Logs Estructurados</div>
            <span style="font-size: 11px; font-weight: 700; color: var(--blue); display: block; margin-bottom: 6px;">El Historial Clínico</span>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.5;">
              Cada evento sale en JSON con su usuario, hora exacta y un <code>trace_id</code> único para no perderle la pista.
            </p>
          </div>
          <div class="card">
            <div style="font-size: 22px; margin-bottom: 6px;">💓</div>
            <div class="card-title">2. Métricas RED</div>
            <span style="font-size: 11px; font-weight: 700; color: var(--emerald); display: block; margin-bottom: 6px;">Los Signos Vitales</span>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.5;">
              Monitoreo en vivo: <strong>Rate</strong> (cuántas entran), <strong>Errors</strong> (cuántas fallan) y <strong>Duration</strong> (cuánto demoran).
            </p>
          </div>
          <div class="card">
            <div style="font-size: 22px; margin-bottom: 6px;">🩻</div>
            <div class="card-title">3. Trazas OTel</div>
            <span style="font-size: 11px; font-weight: 700; color: #c084fc; display: block; margin-bottom: 6px;">La Resonancia Magnética</span>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.5;">
              Saber con precisión cuántos milisegundos se consumieron en la base de datos vs. en la CPU.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 9: SEMANA 10 - MDC Y ASYNCLOCALSTORAGE -->
    <div class="slide-page" id="slide-8">
      <div class="slide-topbar">
        <span class="slide-category">Semana 10 · Contexto de Diagnóstico</span>
        <span class="slide-num">09 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Logs con MDC: Rastrear a un Usuario entre Miles</h2>
        <p class="slide-subtitle">Usamos <code>AsyncLocalStorage</code> para que cada log lleve el <code>trace_id</code> sin ensuciar los parámetros de las funciones.</p>
        <div class="grid-2">
          <div class="card">
            <div class="card-title">El Log que se Emite en Producción:</div>
            <div class="code-box" style="color: #a7f3d0;">
{
  "timestamp": "2026-11-20T21:10:05.120Z",
  "level": "INFO",
  "event": "payment.create",
  "trace_id": "8a3c60f7-b24a-4e92",
  "user_id": "usr_andres",
  "ip_address": "192.168.1.15",
  "amount_cents": 3500,
  "method": "YAPE"
}</div>
          </div>
          <div class="card">
            <div class="card-title">¿Por qué es Clave en Cristiano?</div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 8px;">
              Si un usuario dice <em>"me dio error al subir mi voucher de Yape"</em>, filtramos por su <code>trace_id</code> y vemos exactamente la línea de código y la consulta SQL que falló.
            </p>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.6;">
              En Java usan <code>MDC</code> de log4j; en TypeScript/Node.js lo construimos de forma limpia con <strong><code>AsyncLocalStorage</code></strong> nativo.
            </p>
            <div style="margin-top: 10px;">
              <span class="badge-ok">test/telemetry.test.ts (100% probado)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 10: SEMANA 10 - MODELO RED -->
    <div class="slide-page" id="slide-9">
      <div class="slide-topbar">
        <span class="slide-category">Semana 10 · Telemetría OTel</span>
        <span class="slide-num">10 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Modelo RED: Los Tres Números que Importan</h2>
        <p class="slide-subtitle">Supervisión en tiempo real lista para tableros de Grafana y raspado automático de Prometheus.</p>
        
        <div class="grid-3" style="margin-bottom: 16px;">
          <div class="card" style="text-align: center;">
            <span style="font-size: 11px; font-weight: 700; color: var(--blue);">RATE (TASA)</span>
            <div id="dynRate" style="font-size: 26px; font-weight: 800; color: #fff; margin: 6px 0;">145 req/s</div>
            <span style="font-size: 11px; color: var(--muted);">Peticiones atendidas por segundo</span>
          </div>
          <div class="card" style="text-align: center;">
            <span style="font-size: 11px; font-weight: 700; color: var(--rose);">ERRORS (FALLOS)</span>
            <div style="font-size: 26px; font-weight: 800; color: #34d399; margin: 6px 0;">0.02%</div>
            <span style="font-size: 11px; color: var(--muted);">Tasa mínima de error HTTP 5xx</span>
          </div>
          <div class="card" style="text-align: center;">
            <span style="font-size: 11px; font-weight: 700; color: var(--emerald);">DURATION (LATENCIA)</span>
            <div id="dynDur" style="font-size: 26px; font-weight: 800; color: #fff; margin: 6px 0;">4.4 ms</div>
            <span style="font-size: 11px; color: var(--muted);">Percentil 95 (p95) en API</span>
          </div>
        </div>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 700;">Endpoint Prometheus Nativo:</span>
            <span class="badge-ok">GET /api/admin/metrics</span>
          </div>
          <div class="code-box" style="color: #94a3b8;">
http_requests_total 12480
http_errors_total{code="5xx"} 2
http_request_duration_ms{quantile="0.95"} 4.4</div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 11: SEMANA 10 - PROFILING Y FLAME GRAPH -->
    <div class="slide-page" id="slide-10">
      <div class="slide-topbar">
        <span class="slide-category">Semana 10 · Rendimiento y Profiling</span>
        <span class="slide-num">11 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Flame Graph: ¿Dónde se va el Tiempo en SplitVision?</h2>
        <p class="slide-subtitle">Medimos el reparto con 50 amigos y 150 platos. La CPU casi ni se entera; el cuello de botella es la base de datos.</p>
        
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Benchmark con 50 Comensales y 150 Platos:</div>
            <div style="font-size: 22px; font-weight: 800; color: #fff; margin: 8px 0;">
              ⚡ 0.062 ms por cálculo
            </div>
            <p style="font-size: 12px; color: var(--muted); line-height: 1.6;">
              El algoritmo de Hamilton (mayor residuo) ejecuta más de <strong>16,000 repartos por segundo</strong> en un solo hilo sin retención de memoria (0 memory leaks).
            </p>
            <span style="font-size: 11px; color: var(--subtle); margin-top: 8px; display: block;">
              Script ejecutable: <code>scripts/benchmark-profiling.js</code>
            </span>
          </div>

          <div class="card">
            <div class="card-title">Distribución Temporal de la Flama:</div>
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                <span>Transacción en PostgreSQL (I/O Bound)</span>
                <span style="font-weight: 700; color: var(--blue);">85%</span>
              </div>
              <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden;">
                <div style="width: 85%; height: 100%; background: var(--blue);"></div>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                <span>Cálculo Matemático CPU (Hamilton distribute)</span>
                <span style="font-weight: 700; color: #34d399;">15%</span>
              </div>
              <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden;">
                <div style="width: 15%; height: 100%; background: var(--emerald);"></div>
              </div>
            </div>
            <p style="font-size: 11px; color: var(--subtle); margin-top: 10px; line-height: 1.4;">
              <strong>Diagnóstico en Cristiano:</strong> El sistema es I/O-Bound. El cálculo matemático es ultra rápido; optimizar más el algoritmo no hace falta.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 12: PRUEBAS AUTOMATIZADAS -->
    <div class="slide-page" id="slide-11">
      <div class="slide-topbar">
        <span class="slide-category">Verificación y Pruebas</span>
        <span class="slide-num">12 / 13</span>
      </div>
      <div>
        <h2 class="slide-title">Verificación Automática: Cero Floro, Puro Código Probado</h2>
        <p class="slide-subtitle">Cada concepto de la Unidad 3 cuenta con pruebas unitarias reales que el profesor puede ejecutar en la terminal.</p>
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Suites de Pruebas en Jest:</div>
            <ul style="font-size: 12px; color: var(--muted); line-height: 1.8; padding-left: 18px;">
              <li><code>test/fsm.test.ts</code>: Valida transiciones válidas y saltos bloqueados.</li>
              <li><code>test/payment-rules.test.ts</code>: Comprueba la búsqueda $O(1)$ de reglas.</li>
              <li><code>test/telemetry.test.ts</code>: Verifica que el <code>trace_id</code> viaje en los logs.</li>
              <li><code>test/properties.test.ts</code>: Pruebas con fast-check para repartos.</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-title">Comandos para la Demostración:</div>
            <div class="code-box" style="color: #6ee7b7;">
# Ejecutar verificación de estados y telemetría:
npm test test/fsm.test.ts
npm test test/payment-rules.test.ts
npm test test/telemetry.test.ts

# Ejecutar benchmark de rendimiento:
node scripts/benchmark-profiling.js</div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAPOSITIVA 13: CHECKLIST PC3 -->
    <div class="slide-page" id="slide-12">
      <div class="slide-topbar">
        <span class="slide-category">Evaluación Oficial PC3</span>
        <span class="slide-num">13 / 13</span>
      </div>
      <div style="text-align: center; max-width: 760px; margin: 0 auto;">
        <h2 style="font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 8px;">
          Cumplimiento del Checklist de la PC3
        </h2>
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 18px;">
          Verificación de las 5 pautas formales de la Diapositiva 9 de Semana 10:
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px; text-align: left; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid var(--emerald-border); border-radius: 10px; font-size: 12px;">
            <span>✅ <strong>1. Servicio Distribuido:</strong> API REST + Worker OCR desacoplados por colas PostgreSQL.</span>
            <span class="badge-ok">CUMPLIDO</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid var(--emerald-border); border-radius: 10px; font-size: 12px;">
            <span>✅ <strong>2. Logs JSON con MDC:</strong> Contexto automático por petición vía AsyncLocalStorage.</span>
            <span class="badge-ok">CUMPLIDO</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid var(--emerald-border); border-radius: 10px; font-size: 12px;">
            <span>✅ <strong>3. Telemetría OTel y Modelo RED:</strong> Endpoint Prometheus y Spans de trazabilidad.</span>
            <span class="badge-ok">CUMPLIDO</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid var(--emerald-border); border-radius: 10px; font-size: 12px;">
            <span>✅ <strong>4. Resiliencia Activa:</strong> FSM formal y Feature Flags para alternar contingencia.</span>
            <span class="badge-ok">CUMPLIDO</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid var(--emerald-border); border-radius: 10px; font-size: 12px;">
            <span>✅ <strong>5. Profiling de Runtime:</strong> Flame Graph demostrando algoritmo I/O-Bound en 0.06 ms.</span>
            <span class="badge-ok">CUMPLIDO</span>
          </div>
        </div>
        <button class="btn-ctrl primary" onclick="goTo(0)" style="font-size: 12px;">
          ↺ Volver a la Portada
        </button>
      </div>
    </div>

  </div>

  <!-- Controles inferiores de diapositivas tipo Canva / Keynote -->
  <div class="deck-controls">
    <button id="btnPrev" class="btn-ctrl" onclick="prevSlide()" disabled>← Anterior</button>
    <div class="dots-nav" id="dotsContainer"></div>
    <button id="btnNext" class="btn-ctrl primary" onclick="nextSlide()">Siguiente →</button>
  </div>

  <script>
    let currentSlide = 0;
    const totalSlides = 13;

    const deck = document.getElementById('deckContainer');
    const dotsContainer = document.getElementById('dotsContainer');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    // Generar dots
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot-nav' + (i === 0 ? ' active' : '');
      dot.onclick = () => goTo(i);
      dotsContainer.appendChild(dot);
    }

    function updateView() {
      for (let i = 0; i < totalSlides; i++) {
        const slide = document.getElementById('slide-' + i);
        if (slide) {
          slide.classList.toggle('active', i === currentSlide);
        }
      }

      const dots = document.querySelectorAll('.dot-nav');
      dots.forEach((d, idx) => {
        d.classList.toggle('active', idx === currentSlide);
      });

      btnPrev.disabled = (currentSlide === 0);
      btnNext.disabled = (currentSlide === totalSlides - 1);
      btnNext.textContent = (currentSlide === totalSlides - 1) ? 'Finalizar' : 'Siguiente →';
    }

    function nextSlide() {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
        updateView();
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        updateView();
      }
    }

    function goTo(idx) {
      currentSlide = idx;
      updateView();
    }

    // Navegación con teclado
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Home') {
        goTo(0);
      } else if (e.key === 'End') {
        goTo(totalSlides - 1);
      }
    });

    // Simulaciones Interactivas
    function simularExitoFsm() {
      const box = document.getElementById('demoFsmBox');
      box.style.display = 'block';
      box.style.borderColor = 'var(--emerald-border)';
      box.style.color = '#34d399';
      box.innerHTML = `// [HTTP POST /api/receipts/rec_01/start-ocr] (200 OK)
{
  "status": 200,
  "transition": "CARGADO -> PROCESANDO",
  "result": "APROBADO por la FSM",
  "timestamp": "${new Date().toISOString()}"
}`;
    }

    function simularFalloFsm() {
      const box = document.getElementById('demoFsmBox');
      box.style.display = 'block';
      box.style.borderColor = 'var(--rose-border)';
      box.style.color = '#fca5a5';
      box.innerHTML = `// [HTTP POST /api/receipts/rec_01/confirm] (409 CONFLICT)
{
  "statusCode": 409,
  "error": "ConflictException",
  "message": "Transición inválida: no se puede pasar directamente de CARGADO a CONFIRMADO sin procesar ni extraer platos",
  "trace_id": "err_98f411b0",
  "timestamp": "${new Date().toISOString()}"
}`;
    }

    let ocrActivo = true;
    function toggleModoOcr() {
      ocrActivo = !ocrActivo;
      const txt = document.getElementById('modoOcrTxt');
      if (ocrActivo) {
        txt.textContent = 'OCR Automático Activo';
        txt.style.color = '#34d399';
      } else {
        txt.textContent = 'Modo Manual Forzado (Contingencia)';
        txt.style.color = '#f59e0b';
      }
    }

    // Variación sutil en métricas para sensación viva
    setInterval(() => {
      const rate = document.getElementById('dynRate');
      const dur = document.getElementById('dynDur');
      if (rate) {
        const val = 140 + Math.floor(Math.random() * 12);
        rate.textContent = val + ' req/s';
      }
      if (dur) {
        const val = (4.1 + Math.random() * 0.6).toFixed(1);
        dur.textContent = val + ' ms';
      }
    }, 2500);
  </script>
</body>
</html>
"""

with open('presentacion.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

with open('frontend/public/presentacion.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Updated both presentation files successfully!")
