// =============================================================================
// main.js — Punto de entrada del juego
// =============================================================================
// Inicializa el estado, configura los event listeners globales,
// conecta el motor con la UI y arranca el gameLoop.
// =============================================================================

import { initGameState, startGame, stopGame, getGameState } from './engine.js';
import { initUI, renderAll } from './ui.js';

// ─── Inicialización completa ─────────────────────────────────────────────────

/**
 * Inicializa todos los sistemas del juego en orden:
 * 1. Estado del juego
 * 2. Referencias UI
 * 3. Renderizado inicial
 * 4. Suscripción a eventos
 * 5. Arranque del gameLoop
 */
function bootstrap() {
  console.log('[main] Inicializando simulador de asentamiento incremental...');

  // 1. Crear estado inicial
  const state = initGameState();
  if (!state) {
    console.error('[main] Error al inicializar el estado del juego');
    return;
  }

  console.log('[main] Estado inicial creado:', state);

  // 2. Cachear referencias del DOM
  initUI();

  // 3. Renderizar estado inicial en el DOM
  renderAll();

  // 4. Suscribirse a eventos del motor para actualizar la UI
  _setupEventListeners();

  // 5. Arrancar el gameLoop
  startGame();

  console.log('[main] Simulador listo y funcionando.');
}

// ─── Suscripción a eventos ────────────────────────────────────────────────────

/**
 * Configura los listeners de eventos personalizados del juego.
 * Mantiene la UI desacoplada del motor (solo escucha eventos).
 */
function _setupEventListeners() {
  // ── Tick del juego → actualizar UI ──────────────────────────────────────
  document.addEventListener('game-tick', () => {
    renderAll();
  });

  // ── Acción del jugador → actualizar UI ──────────────────────────────────
  document.addEventListener('game-action', () => {
    renderAll();
  });

  // ── Cambio de estación ──────────────────────────────────────────────────
  document.addEventListener('game-season-change', (e) => {
    const { season, year } = e.detail;
    console.log(`[estación] Cambio a temporada ${season}, año ${year}`);
  });

  // ── Construcción completada ─────────────────────────────────────────────
  document.addEventListener('game-construction-complete', () => {
    console.log('[urbanismo] Construcción finalizada');
  });

  // ── Nuevo inmigrante ────────────────────────────────────────────────────
  document.addEventListener('game-immigrant-arrived', (e) => {
    console.log(`[población] Nuevo inmigrante — total: ${e.detail.total}`);
  });

  // ── Frame (animaciones) ─────────────────────────────────────────────────
  // Por ahora no hacemos nada en cada frame, pero está disponible
  // para futuras animaciones CSS o transiciones suaves.
  document.addEventListener('game-frame', () => {
    // Placeholder para animaciones futuras
  });

  // ── Pausa ───────────────────────────────────────────────────────────────
  document.addEventListener('game-pause-change', (e) => {
    console.log(`[motor] Juego ${e.detail.paused ? 'pausado' : 'reanudado'}`);
  });

  // ── Inicio / Detención ──────────────────────────────────────────────────
  document.addEventListener('game-started', () => {
    console.log('[motor] Juego iniciado');
  });

  document.addEventListener('game-stopped', () => {
    console.log('[motor] Juego detenido');
  });
}

// ─── Exponer API en window para debugging en consola ──────────────────────────

/**
 * Expone funciones clave en window para depuración desde la consola del navegador.
 */
function _exposeDebugAPI() {
  window.__game = {
    getState: getGameState,
    stop: stopGame,
  };

  console.log('[main] API de debugging disponible en window.__game');
}

// ─── Arranque ────────────────────────────────────────────────────────────────

// Esperar a que el DOM esté listo antes de iniciar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
    _exposeDebugAPI();
  });
} else {
  // DOM ya cargado
  bootstrap();
  _exposeDebugAPI();
}