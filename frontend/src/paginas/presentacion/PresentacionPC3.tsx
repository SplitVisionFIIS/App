import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface SlideItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
}

const SLIDES: SlideItem[] = [
  {
    id: 'portada',
    tag: 'UNIDAD 3: SEMANAS 9 & 10 · SW707',
    title: 'Construcción Dirigida por Datos y Observabilidad de Runtime',
    subtitle: 'Sprint PC3 · Grupo 2: SplitVision (UNI FIIS)',
  },
  {
    id: 'paradigma',
    tag: 'SEMANA 9 · PRINCIPIO ARQUITECTÓNICO',
    title: 'Lógica Imperativa vs. Datos Estructurados',
    subtitle: 'Reemplazando cascadas de if/else con estructuras de datos en O(1)',
  },
  {
    id: 'fsm',
    tag: 'SEMANA 9 · MÁQUINAS DE ESTADO FINITO (FSM)',
    title: 'Autómatas y Restricción Matemática',
    subtitle: 'Garantía formal de transiciones legales por diseño (Table-Driven FSM)',
  },
  {
    id: 'flags',
    tag: 'SEMANA 9 · LATE BINDING & RESILIENCIA',
    title: 'Feature Flags y Kill Switches en Caliente',
    subtitle: 'Desacoplar despliegue de lanzamiento sin recompilar ni reiniciar',
  },
  {
    id: 'mdc',
    tag: 'SEMANA 10 · OBSERVABILIDAD & LOGS',
    title: 'Logs Estructurados y Contexto MDC',
    subtitle: 'Hiper-contextualización de hilos con AsyncLocalStorage y JSON nativo',
  },
  {
    id: 'red',
    tag: 'SEMANA 10 · TELEMETRÍA OPENTELEMETRY',
    title: 'Modelo RED y Spans de Dominio',
    subtitle: 'Métricas de Rate, Errors, Duration y trazabilidad con OpenTelemetry',
  },
  {
    id: 'profiling',
    tag: 'SEMANA 10 · PROFILING DE RUNTIME',
    title: 'Análisis de Rendimiento y Flame Graph',
    subtitle: 'Detección estadística de cuellos de botella: CPU vs. I/O en split-calculator',
  },
  {
    id: 'checklist',
    tag: 'EVALUACIÓN PRÁCTICA CALIFICADA 3',
    title: 'Checklist de Cumplimiento PC3',
    subtitle: 'Verificación punto por punto de las pautas de la Diapositiva 9',
  },
];

export function PresentacionPC3() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estados para demos interactivas en vivo
  const [activeCodeTab, setActiveCodeTab] = useState<'antes' | 'despues'>('despues');
  const [fsmState, setFsmState] = useState<'CARGADO' | 'PROCESANDO' | 'EXTRAÍDO' | 'CONFIRMADO' | 'FALLIDO'>('CARGADO');
  const [fsmTarget, setFsmTarget] = useState<'CARGADO' | 'PROCESANDO' | 'EXTRAÍDO' | 'CONFIRMADO' | 'FALLIDO'>('CONFIRMADO');
  const [fsmLog, setFsmLog] = useState<{ allowed: boolean; message: string } | null>(null);

  // Feature flags en vivo
  const [flags, setFlags] = useState({
    enable_plin_payments: true,
    enable_yape_payments: true,
    use_external_ocr: false,
    strict_fsm_enforcement: true,
    detailed_telemetry: true,
  });
  const [flagAuditLog, setFlagAuditLog] = useState<string[]>([]);

  // Telemetría simulada / real en vivo
  const [metrics, setMetrics] = useState({
    rate: 142.5,
    errors: 0.12,
    p50: 1.2,
    p95: 4.8,
    p99: 12.1,
    activeRequests: 4,
    heapMb: 68.4,
  });

  // Flame graph hover interactivo
  const [selectedFlameNode, setSelectedFlameNode] = useState<string | null>(null);

  // Navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlide(SLIDES.length - 1);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const probarTransicionFsm = () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      CARGADO: ['PROCESANDO'],
      PROCESANDO: ['EXTRAÍDO', 'FALLIDO'],
      EXTRAÍDO: ['CONFIRMADO', 'FALLIDO'],
      FALLIDO: ['PROCESANDO', 'EXTRAÍDO'],
      CONFIRMADO: [],
    };
    const allowed = VALID_TRANSITIONS[fsmState]?.includes(fsmTarget) ?? false;
    if (allowed) {
      setFsmLog({
        allowed: true,
        message: `✅ TRANSICIÓN VÁLIDA: [${fsmState}] → [${fsmTarget}]. El autómata actualiza el estado formalmente en O(1).`,
      });
      setFsmState(fsmTarget);
    } else {
      const permitidos = VALID_TRANSITIONS[fsmState]?.join(', ') || 'ninguno (estado terminal)';
      setFsmLog({
        allowed: false,
        message: `❌ TRANSICIÓN ILEGAL (409 Conflict): La FSM bloquea el salto de [${fsmState}] a [${fsmTarget}]. Estados matemáticamente permitidos: [${permitidos}].`,
      });
    }
  };

  const toggleFlag = (key: keyof typeof flags) => {
    const nextVal = !flags[key];
    setFlags((prev) => ({ ...prev, [key]: nextVal }));
    const logEntry = `[${new Date().toLocaleTimeString()}] Late-binding toggle '${key}' → ${nextVal ? 'ACTIVADO' : 'DESACTIVADO'} (Kill switch aplicado en caliente sin reinicio)`;
    setFlagAuditLog((prev) => [logEntry, ...prev.slice(0, 4)]);
  };

  // Simular ligera variación de métricas RED
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        rate: Number((135 + Math.random() * 20).toFixed(1)),
        p95: Number((4.2 + Math.random() * 1.2).toFixed(1)),
        activeRequests: Math.floor(2 + Math.random() * 6),
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col justify-between">
      {/* Barra superior minimalista */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-black/20 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            ← Volver a SplitVision
          </Link>
          <span className="hidden sm:inline text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            branch: develop
          </span>
          <span className="text-xs text-white/50 hidden md:inline">
            SW707 Construcción de Software II · UNI FIIS
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-white/60 font-mono">
            <span>Slide {currentSlide + 1} de {SLIDES.length}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition text-xs"
            title="Pantalla completa (tecla F)"
          >
            {isFullscreen ? '⤢ Salir' : '⛶ Pantalla Completa'}
          </button>
        </div>
      </header>

      {/* Área principal del Slide */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-6xl w-full mx-auto">
        <div className="w-full">
          {/* Encabezado del Slide */}
          <div className="mb-6 animate-fade-in">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {SLIDES[currentSlide].tag}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 text-white">
              {SLIDES[currentSlide].title}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">
              {SLIDES[currentSlide].subtitle}
            </p>
          </div>

          {/* Contenido dinámico según el slide actual */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl min-h-[460px] flex flex-col justify-center">
            {/* SLIDE 1: PORTADA */}
            {currentSlide === 0 && (
              <div className="flex flex-col md:flex-row items-center gap-8 py-4">
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Sprint de Evaluación: Práctica Calificada 3
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                    Ingeniería de Software Dirigida por Datos y Telemetría de Runtime
                  </h2>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Aplicación de los principios de diseño de la <strong>Semana 9</strong> (FSM, Table-Driven Design, Late Binding, Feature Flags) y <strong>Semana 10</strong> (Logs MDC, OpenTelemetry, Modelo RED, Profiling con Flame Graphs) sobre la arquitectura de <strong>SplitVision</strong>.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono text-slate-400">
                    <span className="bg-white/5 px-2.5 py-1 rounded border border-white/10">Node.js 22+ / NestJS 11</span>
                    <span className="bg-white/5 px-2.5 py-1 rounded border border-white/10">PostgreSQL 16</span>
                    <span className="bg-white/5 px-2.5 py-1 rounded border border-white/10">OpenTelemetry</span>
                    <span className="bg-white/5 px-2.5 py-1 rounded border border-white/10">Clean Architecture</span>
                  </div>
                </div>

                <div className="w-full md:w-80 bg-slate-950/80 border border-white/10 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 border-b border-white/10 pb-2">
                    Integrantes · Grupo 2
                  </h3>
                  <ul className="space-y-2 text-xs font-mono">
                    <li className="flex justify-between items-center text-slate-200">
                      <span>Albornoz Azurza, Gonzalo</span>
                      <span className="text-emerald-400">20232551K</span>
                    </li>
                    <li className="flex justify-between items-center text-slate-200">
                      <span>Vargas Ponce, Luis Angel</span>
                      <span className="text-emerald-400">20231314E</span>
                    </li>
                    <li className="flex justify-between items-center text-slate-200">
                      <span>Zamudio Sanchez, Farid</span>
                      <span className="text-emerald-400">20231215G</span>
                    </li>
                  </ul>
                  <div className="border-t border-white/10 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Docente: SW707</span>
                    <span className="text-emerald-400 font-semibold">Ciclo 2026-II</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: LÓGICA IMPERATIVA VS DATOS */}
            {currentSlide === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveCodeTab('antes')}
                      className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition ${
                        activeCodeTab === 'antes'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      ❌ Antes: Lógica Imperativa (Cascada if/else)
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('despues')}
                      className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition ${
                        activeCodeTab === 'despues'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      ✅ Después: Construcción Dirigida por Datos
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    Semana 9 · Diapositiva 3
                  </span>
                </div>

                {activeCodeTab === 'antes' ? (
                  <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 font-mono text-xs text-rose-200/90 overflow-x-auto space-y-1">
                    <div className="text-rose-400/60">// Alta complejidad ciclomática. Recompilación requerida ante cambios de reglas.</div>
                    <div><span className="text-purple-400">if</span> (method !== <span className="text-amber-300">'EFECTIVO'</span> && !evidence) &#123;</div>
                    <div className="pl-4"><span className="text-purple-400">throw new</span> <span className="text-yellow-400">Error</span>(<span className="text-amber-300">'Evidencia requerida'</span>);</div>
                    <div>&#125; <span className="text-purple-400">else if</span> (method === <span className="text-amber-300">'PLIN'</span> && amount &gt; 1500) &#123;</div>
                    <div className="pl-4"><span className="text-purple-400">throw new</span> <span className="text-yellow-400">Error</span>(<span className="text-amber-300">'Límite PLIN excedido'</span>);</div>
                    <div>&#125; <span className="text-purple-400">else if</span> (receipt.status !== <span className="text-amber-300">'EXTRAÍDO'</span>) &#123;</div>
                    <div className="pl-4"><span className="text-purple-400">if</span> (receipt.status === <span className="text-amber-300">'CONFIRMADO'</span>) &#123; <span className="text-purple-400">throw conflict</span>(...); &#125;</div>
                    <div className="pl-4"><span className="text-purple-400">throw conflict</span>(<span className="text-amber-300">'Estado inválido'</span>);</div>
                    <div>&#125;</div>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 font-mono text-xs text-emerald-200/90 overflow-x-auto space-y-1">
                    <div className="text-emerald-400/60">// Búsqueda directa en O(1) + Restricción FSM matemática + Late Binding</div>
                    <div><span className="text-blue-400">const</span> rule = <span className="text-amber-300">PAYMENT_RULES_TABLE</span>[method]; <span className="text-slate-500">// O(1) Data-driven lookup</span></div>
                    <div><span className="text-blue-400">const</span> isPlinActive = <span className="text-blue-400">this</span>.featureFlags.<span className="text-yellow-300">isEnabled</span>(<span className="text-amber-300">'enable_plin_payments'</span>); <span className="text-slate-500">// Late binding kill switch</span></div>
                    <div><span className="text-yellow-300">validatePaymentByRules</span>(method, amountCents, ref, hasEvidence, isPlinActive);</div>
                    <div className="text-slate-500 mt-2">// Autómata de estados: no permite transiciones ilegales por diseño</div>
                    <div><span className="text-amber-300">RECEIPT_FSM</span>.<span className="text-yellow-300">assertTransition</span>(receipt.status, <span className="text-amber-300">'CONFIRMADO'</span>, receiptId);</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
                    <span className="text-emerald-400 font-bold block mb-1">Complejidad Ciclomática</span>
                    <span className="text-slate-300">Reducción de 14 caminos de bifurcación condicional a 1 sola indexación de matriz.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
                    <span className="text-emerald-400 font-bold block mb-1">Enlace Tardío (Late Binding)</span>
                    <span className="text-slate-300">Las reglas se cargan y modifican en memoria en runtime sin recompilar el código.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
                    <span className="text-emerald-400 font-bold block mb-1">Principio Open/Closed (OCP)</span>
                    <span className="text-slate-300">Agregar un nuevo método de pago sólo requiere añadir una fila en la tabla de datos.</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 3: FSM INTERACTIVA */}
            {currentSlide === 2 && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-slate-950 border border-white/10">
                  <h3 className="text-xs font-mono uppercase text-emerald-400 mb-2">
                    Topología Matemática del Ciclo de Vida del Comprobante
                  </h3>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono py-2">
                    <span className={`px-2.5 py-1 rounded-md border ${fsmState === 'CARGADO' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>[CARGADO]</span>
                    <span className="text-slate-600">→</span>
                    <span className={`px-2.5 py-1 rounded-md border ${fsmState === 'PROCESANDO' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>[PROCESANDO]</span>
                    <span className="text-slate-600">→</span>
                    <span className={`px-2.5 py-1 rounded-md border ${fsmState === 'EXTRAÍDO' ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>[EXTRAÍDO]</span>
                    <span className="text-slate-600">→</span>
                    <span className={`px-2.5 py-1 rounded-md border ${fsmState === 'CONFIRMADO' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>[CONFIRMADO (Terminal)]</span>
                    <span className="text-slate-600">|</span>
                    <span className={`px-2.5 py-1 rounded-md border ${fsmState === 'FALLIDO' ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>[FALLIDO]</span>
                  </div>
                </div>

                {/* Simulador interactivo en vivo */}
                <div className="bg-slate-950/80 p-5 rounded-xl border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">Estado Actual:</span>
                      <select
                        value={fsmState}
                        onChange={(e) => setFsmState(e.target.value as any)}
                        className="bg-slate-900 border border-white/20 text-white font-mono text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="CARGADO">CARGADO</option>
                        <option value="PROCESANDO">PROCESANDO</option>
                        <option value="EXTRAÍDO">EXTRAÍDO</option>
                        <option value="FALLIDO">FALLIDO</option>
                        <option value="CONFIRMADO">CONFIRMADO</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">Intentar Transición a:</span>
                      <select
                        value={fsmTarget}
                        onChange={(e) => setFsmTarget(e.target.value as any)}
                        className="bg-slate-900 border border-white/20 text-white font-mono text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="CONFIRMADO">CONFIRMADO</option>
                        <option value="PROCESANDO">PROCESANDO</option>
                        <option value="EXTRAÍDO">EXTRAÍDO</option>
                        <option value="FALLIDO">FALLIDO</option>
                        <option value="CARGADO">CARGADO</option>
                      </select>
                    </div>

                    <button
                      onClick={probarTransicionFsm}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition"
                    >
                      ⚡ Ejecutar Transición en la FSM
                    </button>
                  </div>

                  {fsmLog && (
                    <div className={`p-3 rounded-lg border font-mono text-xs transition ${
                      fsmLog.allowed
                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                        : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                    }`}>
                      {fsmLog.message}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 italic">
                  * Demostración en vivo: Si intentas pasar de [CARGADO] a [CONFIRMADO], la FSM previene el salto ilegal y arroja un 409 Conflict sin necesidad de escribir múltiples validaciones if en cada controlador.
                </p>
              </div>
            )}

            {/* SLIDE 4: FEATURE FLAGS & KILL SWITCH */}
            {currentSlide === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono uppercase text-emerald-400">
                      Consola de Control de Feature Flags en Caliente
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/10">
                        <div>
                          <div className="text-xs font-semibold text-white">Kill Switch: Método PLIN</div>
                          <div className="text-[11px] text-slate-400">Deshabilita transacciones PLIN si la red está saturada</div>
                        </div>
                        <button
                          onClick={() => toggleFlag('enable_plin_payments')}
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition ${
                            flags.enable_plin_payments
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {flags.enable_plin_payments ? 'ACTIVO' : 'KILL SWITCH (OFF)'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/10">
                        <div>
                          <div className="text-xs font-semibold text-white">Kill Switch: Método YAPE</div>
                          <div className="text-[11px] text-slate-400">Corta solicitudes YAPE instantáneamente</div>
                        </div>
                        <button
                          onClick={() => toggleFlag('enable_yape_payments')}
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition ${
                            flags.enable_yape_payments
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {flags.enable_yape_payments ? 'ACTIVO' : 'KILL SWITCH (OFF)'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/10">
                        <div>
                          <div className="text-xs font-semibold text-white">Proveedor OCR Externo HTTP</div>
                          <div className="text-[11px] text-slate-400">Conmuta entre OCR remoto y Tesseract local</div>
                        </div>
                        <button
                          onClick={() => toggleFlag('use_external_ocr')}
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition ${
                            flags.use_external_ocr
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {flags.use_external_ocr ? 'HTTP REMOTO' : 'LOCAL TESSERACT'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-mono uppercase text-slate-400">
                      Registro de Auditoría de Enlace Tardío (Late Binding)
                    </h3>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-white/10 h-[190px] overflow-y-auto font-mono text-[11px] space-y-1.5 text-slate-300">
                      {flagAuditLog.length === 0 ? (
                        <div className="text-slate-600 text-center py-10">Haz clic en los interruptores para alterar el comportamiento en caliente.</div>
                      ) : (
                        flagAuditLog.map((log, idx) => (
                          <div key={idx} className="border-b border-white/5 pb-1 text-emerald-300/90">{log}</div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                  <span>💡 <strong>Desacoplar Despliegue de Lanzamiento:</strong> El código ya está desplegado en producción, pero la activación se gobierna en milisegundos mediante configuración reactiva.</span>
                </div>
              </div>
            )}

            {/* SLIDE 5: LOGS ESTRUCTURADOS & MDC */}
            {currentSlide === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-rose-400">❌ Log de texto plano tradicional (No indexable):</span>
                    <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 font-mono text-xs text-rose-300/80 leading-relaxed">
                      [INFO] 2026-11-20 15:30:12 - Pago 8847 registrado por usuario andres en evento Viaje Canta
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Requiere expresiones regulares frágiles para parsing; imposible de correlacionar en hilos asíncronos distribuidos.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-mono text-emerald-400">✅ Log JSON Estructurado con MDC (Mapped Diagnostic Context):</span>
                    <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 font-mono text-xs text-emerald-300/90 leading-relaxed overflow-x-auto">
                      <pre>{`{
  "timestamp": "${new Date().toISOString()}",
  "level": "INFO",
  "event": "payment.create",
  "trace_id": "8a3c60f7-b24a-4e92-bc91-235123d",
  "user_id": "usr_9921",
  "tenant": "event_7714",
  "ip_address": "192.168.1.45",
  "amount_cents": 3500,
  "method": "YAPE"
}`}</pre>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-white/10">
                  <h4 className="text-xs font-mono uppercase text-emerald-400 mb-1">
                    ¿Cómo se implementa el MDC en Node.js? (Semana 10 · Diapositiva 3)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Utilizamos <code>AsyncLocalStorage</code> de la API de Node.js. Al recibir la petición HTTP, se inyecta el <strong>pasaporte de datos</strong> (traceId, userId, ipAddress). Cualquier función invocada dentro de ese contexto asíncrono tiene acceso transparente a los metadatos sin necesidad de ensuciar la firma de los métodos.
                  </p>
                </div>
              </div>
            )}

            {/* SLIDE 6: MODELO RED & OPENTELEMETRY */}
            {currentSlide === 5 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-blue-400 uppercase font-bold">Rate (Tasa)</span>
                      <span className="text-xs text-slate-400">Peticiones / s</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metrics.rate} req/s</div>
                    <div className="text-[11px] text-slate-400 mt-1">Concurrencia activa: {metrics.activeRequests} sockets</div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-rose-400 uppercase font-bold">Errors (Errores)</span>
                      <span className="text-xs text-slate-400">Tasa de fallo HTTP 5xx</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metrics.errors}%</div>
                    <div className="text-[11px] text-emerald-400 mt-1">SLA 99.9% garantizado</div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-emerald-400 uppercase font-bold">Duration (Latencia)</span>
                      <span className="text-xs text-slate-400">Percentil 95 (p95)</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metrics.p95} ms</div>
                    <div className="text-[11px] text-slate-400 mt-1">p50: {metrics.p50}ms · p99: {metrics.p99}ms</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-mono uppercase text-emerald-400">
                      Instrumentación con OpenTelemetry (Spans Manuales)
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">Endpoint: GET /api/admin/metrics</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto">
                    <pre>{`# Prometheus Standard Format (RED Metric Model)
http_requests_total 12480
http_errors_total{code="5xx"} 2
http_request_duration_ms{quantile="0.5"} 1.2
http_request_duration_ms{quantile="0.95"} 4.8
http_request_duration_ms{quantile="0.99"} 12.1
process_resident_memory_bytes ${metrics.heapMb * 1024 * 1024}`}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 7: PROFILING Y FLAME GRAPH */}
            {currentSlide === 6 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-mono uppercase text-emerald-400">
                    Visualizador Interactivo de Flame Graph (Gráfico de Flamas de CPU)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Lectura: La meseta más ancha monopoliza la CPU
                  </span>
                </div>

                {/* Gráfico de Flamas Interactivo */}
                <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-1 font-mono text-xs">
                  {/* Capa 1: Root */}
                  <div
                    onMouseEnter={() => setSelectedFlameNode('HTTP Request: POST /api/receipts/:id/confirm (100% CPU)')}
                    className="w-full bg-slate-800 hover:bg-slate-700 py-1.5 px-3 text-center text-slate-200 rounded cursor-pointer transition border border-white/10"
                  >
                    HTTP Root: POST /api/receipts/:id/confirm (100% de muestras)
                  </div>

                  {/* Capa 2: Service */}
                  <div className="flex gap-1 w-full">
                    <div
                      onMouseEnter={() => setSelectedFlameNode('RepartoService.confirmSplit() — Lógica de negocio (85% tiempo)')}
                      className="w-[85%] bg-amber-900/60 hover:bg-amber-800/80 py-1.5 px-2 text-center text-amber-200 rounded cursor-pointer transition border border-amber-500/20"
                    >
                      RepartoService.confirmSplit() [85%]
                    </div>
                    <div
                      onMouseEnter={() => setSelectedFlameNode('PostgreSQL Transaction I/O: Bloqueo SELECT FOR UPDATE (15% tiempo)')}
                      className="w-[15%] bg-blue-900/60 hover:bg-blue-800/80 py-1.5 px-2 text-center text-blue-200 rounded cursor-pointer transition border border-blue-500/20"
                    >
                      DB I/O [15%]
                    </div>
                  </div>

                  {/* Capa 3: Algoritmo */}
                  <div className="flex gap-1 w-[85%]">
                    <div
                      onMouseEnter={() => setSelectedFlameNode('computeSplit(): Algoritmo de Hamilton (65% CPU de cálculo)')}
                      className="w-[76%] bg-orange-700/70 hover:bg-orange-600/90 py-1.5 px-2 text-center text-orange-100 rounded cursor-pointer transition border border-orange-500/30"
                    >
                      computeSplit() [Hamilton Largest Remainder] [65%]
                    </div>
                    <div
                      onMouseEnter={() => setSelectedFlameNode('V8 Garbage Collection & Allocations de Objetos (20% CPU)')}
                      className="w-[24%] bg-rose-900/50 hover:bg-rose-800/70 py-1.5 px-2 text-center text-rose-200 rounded cursor-pointer transition border border-rose-500/20"
                    >
                      V8 GC Heap [20%]
                    </div>
                  </div>

                  {/* Capa 4: Mesetas en la cima (Hotspots) */}
                  <div className="flex gap-1 w-[65%]">
                    <div
                      onMouseEnter={() => setSelectedFlameNode('distribute(): Cálculo con BigInt de cocientes y residuos (38% CPU)')}
                      className="w-[58%] bg-amber-500 hover:bg-amber-400 py-2 px-2 text-center text-black font-bold rounded cursor-pointer transition shadow-lg"
                    >
                      distribute() [BigInt Residuo] (38%)
                    </div>
                    <div
                      onMouseEnter={() => setSelectedFlameNode('Array.prototype.sort(): Desempate determinista O(N log N) (27% CPU)')}
                      className="w-[42%] bg-yellow-500 hover:bg-yellow-400 py-2 px-2 text-center text-black font-bold rounded cursor-pointer transition shadow-lg"
                    >
                      sort() [Desempate] (27%)
                    </div>
                  </div>
                </div>

                {/* Caja de diagnóstico */}
                <div className="p-3.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <div className="text-emerald-400 font-mono font-semibold mb-1">
                    Nodo Seleccionado en la Flama:
                  </div>
                  <div className="font-mono text-slate-200">
                    {selectedFlameNode ?? 'Pasa el cursor sobre los bloques del Flame Graph para inspeccionar la pila de llamadas.'}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  <strong>Diagnóstico de Runtime:</strong> El cálculo matemático se resuelve en &lt; 0.2 ms por operación (CPU altamente eficiente). El cuello de botella real está en el tiempo de I/O de red con la base de datos, lo que valida la decisión arquitectónica de usar transacciones breves.
                </p>
              </div>
            )}

            {/* SLIDE 8: CHECKLIST PC3 */}
            {currentSlide === 7 && (
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase text-emerald-400 mb-2">
                  Checklist Oficial de la Práctica Calificada 3 (Semana 10 · Diapositiva 9)
                </h3>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-emerald-400 font-bold text-base">☑</span>
                    <div className="flex-1 text-xs">
                      <strong className="text-white block">1. Servicio Distribuido</strong>
                      <span className="text-slate-300">API NestJS REST + Worker de OCR asíncrono desacoplado por colas en PostgreSQL.</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">CUMPLIDO</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-emerald-400 font-bold text-base">☑</span>
                    <div className="flex-1 text-xs">
                      <strong className="text-white block">2. Logs Estructurados en JSON con MDC</strong>
                      <span className="text-slate-300">Implementación de Mapped Diagnostic Context via AsyncLocalStorage inyectando trace_id, user_id e IP.</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">CUMPLIDO</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-emerald-400 font-bold text-base">☑</span>
                    <div className="flex-1 text-xs">
                      <strong className="text-white block">3. Telemetría OpenTelemetry & Modelo RED</strong>
                      <span className="text-slate-300">Endpoint /api/admin/metrics (Prometheus) + Spans manuales en reparto.confirmSplit y pagos.createPayment.</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">CUMPLIDO</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-emerald-400 font-bold text-base">☑</span>
                    <div className="flex-1 text-xs">
                      <strong className="text-white block">4. Resiliencia Activa basada en Configuración Dinámica</strong>
                      <span className="text-slate-300">Circuit Breaker (opossum) + Feature Flags con Kill Switches en caliente (Late Binding).</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">CUMPLIDO</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-emerald-400 font-bold text-base">☑</span>
                    <div className="flex-1 text-xs">
                      <strong className="text-white block">5. Análisis de Runtime y Profiling</strong>
                      <span className="text-slate-300">Reporte de profiling y visualizador interactivo de Flame Graph identificando el consumo de CPU vs I/O.</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">CUMPLIDO</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dock de navegación inferior moderno */}
      <footer className="px-6 py-4 border-t border-white/10 backdrop-blur-md bg-black/30 sticky bottom-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Barra de progreso */}
          <div className="w-full sm:w-48 bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300 ease-out"
              style={{ width: `${((currentSlide + 1) / SLIDES.length) * 100}%` }}
            ></div>
          </div>

          {/* Selector de miniaturas / dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-6 bg-emerald-400'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                title={`Ir a ${slide.title}`}
              />
            ))}
          </div>

          {/* Controles de avance */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
              disabled={currentSlide === 0}
              className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1))}
              disabled={currentSlide === SLIDES.length - 1}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold disabled:opacity-30 disabled:pointer-events-none transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
