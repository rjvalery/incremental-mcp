// =============================================================================
// ticks.js — Motor de tiempo preciso con requestAnimationFrame y eventos
// =============================================================================
import { incrementTick, getGameState, addResource } from './game.js';

// ─── Configuración ────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 1000; // 1 segundo real por tick

// ─── Variables internas del ticker ────────────────────────────────────────────

/** @type {number|null} ID de la RAF activa (para poder cancelarla). */
let _rafId = null;

/** @type {number|null} Timestamp del último tick completado. */
let _lastTickTimestamp = null;

/** @type {boolean} Indica si el ticker está corriendo. */
let _running = false;

// ─── Cálculo de producción pasiva ─────────────────────────────────────────────

/**
 * Calcula la producción pasiva de recursos por segundo basada en las
 * estructuras actuales.
 *
 * @param {import('./game.js').GameState} state - Copia del estado del juego.
 * @returns {{ wood: number, stone: number, gold: number, food: number }}
 */
function computePassiveProduction(state) {
  const { structures } = state;

  return {
    wood:  structures.lumberMill * 2,   // +2 madera/seg por aserradero
    stone: structures.mine * 1,          // +1 piedra/seg por mina
    gold:  structures.mine * 1,          // +1 oro/seg por mina
    food:  structures.farm * 3           // +3 comida/seg por granja
            + structures.house * 1,      // +1 comida/seg por casa (huertos)
  };
}

/**
 * Aplica la producción pasiva al estado del juego usando addResource().
 * @param {{ wood: number, stone: number, gold: number, food: number }} production
 */
function applyPassiveProduction(production) {
  if (production.wood  > 0) addResource('wood',  production.wood);
  if (production.stone > 0) addResource('stone', production.stone);
  if (production.gold  > 0) addResource('gold',  production.gold);
  if (production.food  > 0) addResource('food',  production.food);
}

// ─── Bucle principal (precisión por delta time) ───────────────────────────────

/**
 * Loop interno basado en requestAnimationFrame.
 * Mide el tiempo real transcurrido y ejecuta ticks completos cada 1000 ms.
 * @param {DOMHighResTimeStamp} now - Timestamp proporcionado por rAF.
 */
function _tickLoop(now) {
  if (!_running) return;

  if (_lastTickTimestamp === null) {
    // Primera ejecución: inicializamos sin procesar nada
    _lastTickTimestamp = now;
    _rafId = requestAnimationFrame(_tickLoop);
    return;
  }

  // Calcular cuánto tiempo real ha pasado desde el último tick
  const elapsed = now - _lastTickTimestamp;

  if (elapsed >= TICK_INTERVAL_MS) {
    // Avanzar tantos ticks completos como hayan transcurrido
    // (en casos extremos de congelación del tab podrían ser varios)
    const ticksToProcess = Math.floor(elapsed / TICK_INTERVAL_MS);

    for (let i = 0; i < ticksToProcess; i++) {
      executeTick();
    }

    // Ajustar el timestamp de referencia sin acumular el residuo
    _lastTickTimestamp += ticksToProcess * TICK_INTERVAL_MS;
  }

  _rafId = requestAnimationFrame(_tickLoop);
}

// ─── Ejecución de un tick individual ──────────────────────────────────────────

/**
 * Ejecuta la lógica completa de un solo tick:
 * 1. Incrementa el contador de ticks.
 * 2. Lee el estado actual.
 * 3. Calcula y aplica la producción pasiva.
 * 4. Dispara el evento personalizado `game-tick`.
 */
function executeTick() {
  // 1. Avanzar el contador
  incrementTick();

  // 2. Obtener estado actual (copia)
  const state = getGameState();

  // 3. Calcular producción pasiva y aplicarla
  const production = computePassiveProduction(state);
  applyPassiveProduction(production);

  // 4. Notificar a la UI (desacoplado)
  document.dispatchEvent(new CustomEvent('game-tick', {
    detail: {
      production,
      tick: state.meta.totalTicks + 1, // ya se incrementó, sumamos 1 sobre la copia
    },
  }));
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia el bucle de ticks preciso basado en requestAnimationFrame.
 * Si ya está corriendo, no hace nada.
 */
export function startTicker() {
  if (_running) return;

  _running = true;
  _lastTickTimestamp = null; // reiniciar referencia
  _rafId = requestAnimationFrame(_tickLoop);
}

/**
 * Detiene el bucle de ticks.
 */
export function stopTicker() {
  _running = false;

  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }

  _lastTickTimestamp = null;
}

/**
 * Indica si el ticker está actualmente activo.
 * @returns {boolean}
 */
export function isTickerRunning() {
  return _running;
}

/**
 * Obtiene la producción pasiva por segundo actual sin ejecutar un tick.
 * Útil para previsualizaciones o UI.
 * @returns {{ wood: number, stone: number, gold: number, food: number }}
 */
export function getCurrentProduction() {
  const state = getGameState();
  return computePassiveProduction(state);
}

// ─── Manejo offline eficiente (sin bucle) ─────────────────────────────────────

/**
 * Calcula e inyecta al estado los recursos que se habrían generado
 * durante el tiempo offline.
 *
 * @param {number} lastSavedTimestamp - Timestamp (Date.now()) del último guardado.
 *
 * Estrategia:
 *   - Se calcula la diferencia en segundos entre ahora y lastSavedTimestamp.
 *   - Se multiplica directamente por la producción pasiva por segundo actual.
 *   - Se añaden los recursos de una sola vez con addResource().
 *
 * Esto evita O(n) bucles y funciona en O(1) incluso para días offline.
 */
export function handleOfflineTime(lastSavedTimestamp) {
  const now = Date.now();

  // Si no hay timestamp o es futuro, salir
  if (!lastSavedTimestamp || lastSavedTimestamp > now) return;

  const diffSeconds = Math.floor((now - lastSavedTimestamp) / 1000);

  // Si pasó menos de 1 segundo, no hay nada que calcular
  if (diffSeconds < 1) return;

  // Obtener el estado actual y la producción por segundo
  const state = getGameState();
  const productionPerSecond = computePassiveProduction(state);

  // Multiplicar producción por segundos offline (O(1), sin bucle)
  const offlineProduction = {
    wood:  productionPerSecond.wood  * diffSeconds,
    stone: productionPerSecond.stone * diffSeconds,
    gold:  productionPerSecond.gold  * diffSeconds,
    food:  productionPerSecond.food  * diffSeconds,
  };

  // Inyectar todos los recursos acumulados de una vez
  applyPassiveProduction(offlineProduction);

  // Disparar evento con detalle de producción offline
  document.dispatchEvent(new CustomEvent('game-offline-recovery', {
    detail: {
      offlineSeconds: diffSeconds,
      recovered: offlineProduction,
    },
  }));
}