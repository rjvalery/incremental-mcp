// =============================================================================
// engine.js — GameLoop maestro con Delta Time
// =============================================================================
// Implementa el ciclo de juego completo: calendario, producción pasiva,
// consumo, supervivencia (invierno, mortalidad) y caza.
// =============================================================================

import { getInitialState } from './state.js';

// ─── Variables internas del motor ─────────────────────────────────────────────

/** @type {object|null} Estado mutable del juego */
let _gameState = null;

/** @type {number|null} ID de requestAnimationFrame activo */
let _rafId = null;

/** @type {number|null} Timestamp del último tick (performance.now) */
let _lastTickTime = null;

/** @type {boolean} Indica si el motor está corriendo */
let _running = false;

/** @type {boolean} Indica si el juego está en pausa */
let _paused = false;

/** @type {number} Intervalo objetivo entre ticks en milisegundos */
const TICK_INTERVAL_MS = 1000;

// ─── Constantes del calendario ────────────────────────────────────────────────

const TICKS_PER_SEASON = 120;

const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];

/**
 * Devuelve el índice de la siguiente estación en el ciclo.
 * Primavera → Verano → Otoño → Invierno → Primavera
 * @param {number} currentIdx
 * @returns {number}
 */
function _nextSeasonIndex(currentIdx) {
  return (currentIdx + 1) % SEASON_NAMES.length;
}

// ─── Contador de mortalidad (cada 10 ticks en invierno con food ≤ 0) ─────────

/** @type {number} Contador interno de ticks de inanición */
let _starvationCounter = 0;

// ─── API de estado ────────────────────────────────────────────────────────────

/**
 * Inicializa (o reinicia) el estado del juego con los valores por defecto.
 * @returns {object}
 */
export function initGameState() {
  _gameState = getInitialState();
  _starvationCounter = 0;
  return getGameState();
}

/**
 * Devuelve una copia profunda del estado actual (solo lectura).
 * @returns {object|null}
 */
export function getGameState() {
  if (!_gameState) return null;
  return structuredClone(_gameState);
}

/**
 * Devuelve la referencia mutable al estado interno.
 * ⚠️ Solo para uso interno del motor y módulos autorizados.
 * @returns {object|null}
 */
export function getMutableState() {
  return _gameState;
}

// ─── Bucle principal (Delta Time) ─────────────────────────────────────────────

/**
 * Función interna del gameLoop, llamada por requestAnimationFrame.
 * @param {DOMHighResTimeStamp} timestamp
 */
function _gameLoop(timestamp) {
  if (!_running) return;

  if (_lastTickTime === null) {
    _lastTickTime = timestamp;
    _rafId = requestAnimationFrame(_gameLoop);
    return;
  }

  const delta = timestamp - _lastTickTime;

  if (delta >= TICK_INTERVAL_MS && !_paused) {
    const ticksToProcess = Math.floor(delta / TICK_INTERVAL_MS);

    for (let i = 0; i < ticksToProcess; i++) {
      _executeTick();
    }

    // Ajustar referencia, descartando el residuo para evitar acumulación
    _lastTickTime += ticksToProcess * TICK_INTERVAL_MS;
  }

  _notifyFrame(delta);

  _rafId = requestAnimationFrame(_gameLoop);
}

// ─── Ejecución de un tick individual ──────────────────────────────────────────

/**
 * Ejecuta la lógica completa de un tick del juego.
 * Orden de operaciones:
 *   1. Incrementar contador de ticks
 *   2. Ciclo del calendario (estaciones cada 120 ticks)
 *   3. Producción pasiva de recursos según jobs
 *   4. Consumo de comida por población
 *   5. Mortalidad por inanición en invierno
 *   6. Disparar evento game-tick
 */
function _executeTick() {
  if (!_gameState) return;

  const state = _gameState;

  // ── 1. Incrementar contador global de ticks ──────────────────────────
  state.calendar.ticks += 1;

  // ── 2. Ciclo del calendario ─────────────────────────────────────────
  // Solo avanza estaciones si Calendar está investigado
  if (state.technologies.calendar) {
    _updateCalendar(state);
  }

  // ── 3. Producción pasiva de recursos ─────────────────────────────────
  _processProduction(state);

  // ── 4. Consumo de comida ────────────────────────────────────────────
  _processConsumption(state);

  // ── 5. Mortalidad por inanición ─────────────────────────────────────
  _processStarvation(state);

  // ── 6. Evento de tick ───────────────────────────────────────────────
  document.dispatchEvent(new CustomEvent('game-tick', {
    detail: {
      tick: state.calendar.ticks,
      season: state.calendar.season,
      year: state.calendar.year,
    },
  }));
}

// ─── 2. Calendario ────────────────────────────────────────────────────────────

/**
 * Actualiza el ciclo de estaciones.
 * Cada 120 ticks avanza a la siguiente estación.
 * Al completar un ciclo de 4 estaciones (Primavera→Verano→Otoño→Invierno→Primavera)
 * incrementa el año.
 * Dispara el evento 'game-season-change' en cada cambio de estación.
 * @param {object} state
 */
function _updateCalendar(state) {
  const prevSeason = state.calendar.season;

  // Calcular la estación actual basada en ticks transcurridos
  const seasonCycle = Math.floor(state.calendar.ticks / TICKS_PER_SEASON);
  const seasonIndex = seasonCycle % SEASON_NAMES.length;
  state.calendar.season = SEASON_NAMES[seasonIndex];

  // Calcular el año: 1 año = 4 estaciones = 480 ticks
  const computedYear = 1 + Math.floor(seasonCycle / SEASON_NAMES.length);
  state.calendar.year = computedYear;

  // Disparar evento si la estación cambió
  if (state.calendar.season !== prevSeason) {
    document.dispatchEvent(new CustomEvent('game-season-change', {
      detail: {
        season: state.calendar.season,
        year: state.calendar.year,
        ticks: state.calendar.ticks,
      },
    }));
  }
}

// ─── 3. Producción pasiva ─────────────────────────────────────────────────────

/**
 * Constantes de producción por rol (por tick).
 */
const PRODUCTION_RATES = {
  farmers:     0.15,  // Comida
  lumberjacks: 0.08,  // Madera
  miners:      0.05,  // Oro (requiere Metal Working)
  scientists:  0.05,  // Ciencia (limitado por scienceMax)
  bankers:     0.10,  // Monedas (requiere Currency)
  hunters:     0.03,  // Carne/Comida independiente del invierno (requiere Animal Husbandry)
};

/**
 * Calcula y aplica la producción pasiva de todos los recursos.
 * Aplica penalización de invierno (-75%) a la producción de comida de granjeros.
 * La producción de cazadores es independiente del invierno.
 * @param {object} state
 */
function _processProduction(state) {
  const { jobs, technologies, calendar, resources } = state;
  const isWinter = technologies.calendar && calendar.season === 'winter';
  const seasonMultiplier = isWinter ? 0.25 : 1.0; // -75% en invierno

  // ── Granjeros: +0.15 food/tick (penalizado en invierno) ─────────────
  if (jobs.farmers > 0) {
    resources.food += jobs.farmers * PRODUCTION_RATES.farmers * seasonMultiplier;
  }

  // ── Cazadores: +0.03 food/tick (independiente del invierno) ─────────
  // Solo si Animal Husbandry está investigado
  if (jobs.hunters > 0 && technologies.animalHusbandry) {
    resources.food += jobs.hunters * PRODUCTION_RATES.hunters;
  }

  // ── Leñadores: +0.08 wood/tick ──────────────────────────────────────
  if (jobs.lumberjacks > 0) {
    resources.wood += jobs.lumberjacks * PRODUCTION_RATES.lumberjacks;
  }

  // ── Mineros: +0.05 gold/tick (requiere Metal Working) ───────────────
  if (jobs.miners > 0 && technologies.mining) {
    resources.gold += jobs.miners * PRODUCTION_RATES.miners;
  }

  // ── Científicos: +0.05 science/tick (limitado por scienceMax) ───────
  if (jobs.scientists > 0) {
    const gain = jobs.scientists * PRODUCTION_RATES.scientists;
    resources.science = Math.min(
      resources.science + gain,
      resources.scienceMax
    );
  }

  // ── Banqueros: +0.10 money/tick (requiere Currency) ─────────────────
  if (jobs.bankers > 0 && technologies.currency) {
    resources.money += jobs.bankers * PRODUCTION_RATES.bankers;
  }
}

// ─── 4. Consumo de comida ─────────────────────────────────────────────────────

/**
 * Procesa el consumo de comida por la población total.
 * Cada aldeano consume 0.05 food/tick.
 * En invierno el consumo se incrementa un 20% (×1.2).
 *
 * La comida nunca baja de 0.
 *
 * @param {object} state
 */
function _processConsumption(state) {
  const pop = state.resources.population;
  if (pop <= 0) return;

  const { technologies, calendar } = state;
  const isWinter = technologies.calendar && calendar.season === 'winter';

  // Consumo base por aldeano: 0.05 food/tick
  let consumptionRate = 0.05;

  // En invierno: +20% de consumo
  if (isWinter) {
    consumptionRate *= 1.2;
  }

  const totalConsumption = pop * consumptionRate;
  state.resources.food = Math.max(0, state.resources.food - totalConsumption);
}

// ─── 5. Mortalidad por inanición ──────────────────────────────────────────────

/**
 * En invierno, si la comida es ≤ 0, se reduce la población en 1
 * cada 10 ticks (efecto de inanición/muerte por frío extremo).
 *
 * Usa un contador interno _starvationCounter para llevar la cuenta
 * de ticks consecutivos de inanición.
 *
 * @param {object} state
 */
function _processStarvation(state) {
  const { technologies, calendar, resources } = state;
  const isWinter = technologies.calendar && calendar.season === 'winter';

  // Solo aplica en invierno y cuando la comida es 0 o menos
  if (!isWinter || resources.food > 0) {
    _starvationCounter = 0;
    return;
  }

  _starvationCounter += 1;

  // Cada 10 ticks de inanición, muere 1 aldeano
  if (_starvationCounter >= 10) {
    _starvationCounter = 0;

    if (resources.population > 0) {
      resources.population -= 1;

      // Si había trabajadores asignados, desasignar uno de cada rol
      // de forma proporcional para mantener coherencia
      _removeOneWorker(state);

      document.dispatchEvent(new CustomEvent('game-villager-died', {
        detail: {
          cause: 'starvation',
          remainingPopulation: resources.population,
        },
      }));
    }
  }
}

/**
 * Elimina un trabajador de algún rol, priorizando roles no esenciales.
 * Si no hay trabajadores asignados, solo reduce la población.
 * @param {object} state
 */
function _removeOneWorker(state) {
  const { jobs } = state;

  // Intentar desasignar en orden inverso de prioridad
  const priorityOrder = ['bankers', 'hunters', 'miners', 'scientists', 'lumberjacks', 'farmers'];

  for (const job of priorityOrder) {
    if (jobs[job] > 0) {
      jobs[job] -= 1;
      return;
    }
  }
}

// ─── Frame (animaciones) ──────────────────────────────────────────────────────

/**
 * Notifica a la UI en cada frame para animaciones suaves.
 * @param {number} delta
 */
function _notifyFrame(delta) {
  document.dispatchEvent(new CustomEvent('game-frame', {
    detail: { delta },
  }));
}

// ─── API pública del motor ────────────────────────────────────────────────────

/**
 * Inicia el gameLoop maestro.
 * Si el estado no está inicializado, lo crea automáticamente.
 */
export function startGame() {
  if (_running) return;

  if (!_gameState) {
    initGameState();
  }

  _running = true;
  _paused = false;
  _lastTickTime = null;
  _starvationCounter = 0;
  _rafId = requestAnimationFrame(_gameLoop);

  document.dispatchEvent(new CustomEvent('game-started'));
}

/**
 * Detiene el gameLoop por completo.
 */
export function stopGame() {
  _running = false;

  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }

  _lastTickTime = null;
  _paused = false;

  document.dispatchEvent(new CustomEvent('game-stopped'));
}

/**
 * Pausa o reanuda el juego.
 * @param {boolean} [pause]
 */
export function togglePause(pause) {
  _paused = pause !== undefined ? pause : !_paused;

  if (!_paused) {
    _lastTickTime = null;
  }

  document.dispatchEvent(new CustomEvent('game-pause-change', {
    detail: { paused: _paused },
  }));
}

/**
 * Indica si el motor está activo.
 * @returns {boolean}
 */
export function isRunning() {
  return _running;
}

/**
 * Indica si el juego está en pausa.
 * @returns {boolean}
 */
export function isPaused() {
  return _paused;
}