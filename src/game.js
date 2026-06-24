// =============================================================================
// game.js — Estado central del juego (privado, encapsulado)
// =============================================================================
// El estado interno NO se exporta. Solo se accede a través de getGameState()
// (que entrega una copia profunda) y de las funciones mutadoras.
// =============================================================================

/** @type {GameState} Estado privado del juego */
const _state = {
  resources: {
    wood: 0,
    stone: 0,
    gold: 0,
    food: 10,
  },
  structures: {
    house: 0,
    farm: 0,
    mine: 0,
    lumberMill: 0,
  },
  meta: {
    totalTicks: 0,
    startedAt: Date.now(),
  },
};

// ─── Acceso de solo lectura (copia profunda) ─────────────────────────────────

/**
 * Devuelve una copia profunda e inmutable del estado actual.
 * @returns {GameState}
 */
export function getGameState() {
  return structuredClone(_state);
}

// ─── Mutadores de recursos ────────────────────────────────────────────────────

/**
 * Suma una cantidad a un recurso.
 * @param {string} resource - Nombre del recurso ('wood', 'stone', 'gold', 'food').
 * @param {number} amount - Cantidad a añadir (debe ser ≥ 0).
 * @returns {boolean} true si se realizó la operación.
 */
export function addResource(resource, amount) {
  if (amount < 0) return false;
  if (!(resource in _state.resources)) return false;

  _state.resources[resource] += amount;
  return true;
}

/**
 * Resta una cantidad de un recurso si hay saldo suficiente.
 * @param {string} resource
 * @param {number} amount - Cantidad a restar (debe ser ≥ 0).
 * @returns {boolean} true si se descontó; false si no hay suficientes unidades.
 */
export function removeResource(resource, amount) {
  if (amount < 0) return false;
  if (!(resource in _state.resources)) return false;
  if (_state.resources[resource] < amount) return false;

  _state.resources[resource] -= amount;
  return true;
}

/**
 * Verifica si hay al menos `amount` unidades de un recurso.
 * @param {string} resource
 * @param {number} amount
 * @returns {boolean}
 */
export function hasResource(resource, amount) {
  if (!(resource in _state.resources)) return false;
  return _state.resources[resource] >= amount;
}

// ─── Mutadores de estructuras ─────────────────────────────────────────────────

/**
 * Construye una estructura (incrementa su contador).
 * @param {string} structure - Nombre de la estructura ('house', 'farm', 'mine', 'lumberMill').
 * @param {number} amount - Cantidad a construir (≥ 1).
 * @returns {boolean} true si se construyó exitosamente.
 */
export function addStructure(structure, amount = 1) {
  if (amount < 1) return false;
  if (!(structure in _state.structures)) return false;

  _state.structures[structure] += amount;
  return true;
}

/**
 * Demuele una estructura (decrementa su contador, mínimo 0).
 * @param {string} structure
 * @param {number} amount - Cantidad a demoler (≥ 1).
 * @returns {boolean} true si se demolió; false si no había suficientes.
 */
export function removeStructure(structure, amount = 1) {
  if (amount < 1) return false;
  if (!(structure in _state.structures)) return false;
  if (_state.structures[structure] < amount) return false;

  _state.structures[structure] -= amount;
  return true;
}

// ─── Mutadores de metadatos ───────────────────────────────────────────────────

/**
 * Incrementa el contador de ticks en 1.
 */
export function incrementTick() {
  _state.meta.totalTicks += 1;
}

/**
 * Reinicia el estado completo a sus valores iniciales.
 */
export function resetGame() {
  _state.resources.wood = 0;
  _state.resources.stone = 0;
  _state.resources.gold = 0;
  _state.resources.food = 10;

  _state.structures.house = 0;
  _state.structures.farm = 0;
  _state.structures.mine = 0;
  _state.structures.lumberMill = 0;

  _state.meta.totalTicks = 0;
  _state.meta.startedAt = Date.now();
}

// ─── Type definitions (JSDoc, solo para IDE) ──────────────────────────────────

/**
 * @typedef {Object} Resources
 * @property {number} wood
 * @property {number} stone
 * @property {number} gold
 * @property {number} food
 */

/**
 * @typedef {Object} Structures
 * @property {number} house
 * @property {number} farm
 * @property {number} mine
 * @property {number} lumberMill
 */

/**
 * @typedef {Object} Meta
 * @property {number} totalTicks
 * @property {number} startedAt
 */

/**
 * @typedef {Object} GameState
 * @property {Resources} resources
 * @property {Structures} structures
 * @property {Meta} meta
 */