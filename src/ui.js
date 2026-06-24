// =============================================================================
// ui.js — Funciones de renderizado y actualización del DOM
// =============================================================================
// Compatible con la estructura de state.js (GAME_SPEC.md v1.0.0).
// Lee el estado mediante getGameState() de engine.js y actualiza el DOM
// a través de atributos data-ui.
// =============================================================================

import { getGameState } from './engine.js';

// ─── Referencias al DOM (se cachean al inicializar) ──────────────────────────

/** @type {Object<string, HTMLElement>} */
const _elements = {};

// ─── Inicialización de la UI ─────────────────────────────────────────────────

/**
 * Escanea el DOM y cachea referencias a elementos con data-ui.
 * Ejemplo: <span data-ui="resource-wood">0</span>
 */
export function initUI() {
  const nodes = document.querySelectorAll('[data-ui]');
  nodes.forEach((el) => {
    const key = el.getAttribute('data-ui');
    if (key) _elements[key] = el;
  });
}

// ─── Renderizado completo ────────────────────────────────────────────────────

/**
 * Renderiza TODOS los elementos de la UI basados en el estado actual.
 */
export function renderAll() {
  const state = getGameState();
  if (!state) return;

  renderResources(state);
  renderMap(state);
  renderUrbanism(state);
  renderJobs(state);
  renderTechnologies(state);
  renderPolitics(state);
  renderCalendar(state);
}

// ─── Renderizado por sección ─────────────────────────────────────────────────

/**
 * Recursos y límites de almacenamiento.
 * @param {object} state
 */
export function renderResources(state) {
  const r = state.resources;
  _setText('resource-wood',     _fmt(r.wood));
  _setText('resource-wood-max', _fmt(r.woodMax));
  _setText('resource-stone',     _fmt(r.stone));
  _setText('resource-stone-max', _fmt(r.stoneMax));
  _setText('resource-food',      _fmt(r.food));
  _setText('resource-food-max',  _fmt(r.foodMax));
  _setText('resource-science',   _fmt(r.science));
  _setText('resource-science-max', _fmt(r.scienceMax));
  _setText('resource-gold',      _fmt(r.gold));
  _setText('resource-money',     _fmt(r.money));
  _setText('resource-tools',     _fmt(r.tools));
  _setText('resource-population', _fmt(r.population));
  _setText('resource-housing',   _fmt(r.housingMax));
}

/**
 * Mapa y territorio.
 * @param {object} state
 */
export function renderMap(state) {
  _setText('map-total-plots', _fmt(state.map.totalPlots));
  _setText('map-used-plots',  _fmt(state.map.usedPlots));
  _setText('map-free-plots',  _fmt(state.map.totalPlots - state.map.usedPlots));
}

/**
 * Urbanismo (parcelas, casas construidas, progreso).
 * @param {object} state
 */
export function renderUrbanism(state) {
  const u = state.urbanism;
  _setText('urbanism-assigned-plots', _fmt(u.assignedPlots));
  _setText('urbanism-built-houses',   _fmt(u.builtHouses));
  _setText('urbanism-build-progress', _fmt(Math.floor(u.buildProgress)) + '%');

  // Barra de progreso de construcción
  const buildBar = _elements['urbanism-progress-bar'];
  if (buildBar) {
    const isBuilding = u.buildProgress > 0 && u.buildProgress < 100;
    buildBar.style.display = isBuilding ? 'block' : 'none';
    if (isBuilding) {
      buildBar.style.width = u.buildProgress + '%';
    }
  }
}

/**
 * Roles de población (trabajos).
 * @param {object} state
 */
export function renderJobs(state) {
  _setText('job-farmers',     _fmt(state.jobs.farmers));
  _setText('job-lumberjacks', _fmt(state.jobs.lumberjacks));
  _setText('job-miners',      _fmt(state.jobs.miners));
  _setText('job-scientists',  _fmt(state.jobs.scientists));
  _setText('job-hunters',     _fmt(state.jobs.hunters));
  _setText('job-bankers',     _fmt(state.jobs.bankers));
}

/**
 * Árbol de tecnologías.
 * @param {object} state
 */
export function renderTechnologies(state) {
  const techLabels = {
    calendar:        'Calendar',
    agriculture:     'Agriculture',
    mining:          'Mining',
    animalHusbandry: 'Animal Husbandry',
    construction:    'Construction',
    civilService:    'Civil Service',
    currency:        'Currency',
  };

  for (const [tech, label] of Object.entries(techLabels)) {
    const unlocked = state.technologies[tech];
    _setText('tech-' + tech, unlocked ? '✅' : '🔒');
    _setClass('tech-' + tech, 'unlocked', unlocked);
  }
}

/**
 * Sistema político.
 * @param {object} state
 */
export function renderPolitics(state) {
  const policyNames = {
    monarchy:     'Monarquía',
    democracy:    'Democracia',
    capitalism:   'Capitalismo',
    technocracy:  'Tecnocracia',
  };

  const current = state.politics.currentPolicy;
  _setText('politics-current', current ? policyNames[current] || current : 'Ninguna');
  _setText('politics-last-change-year', _fmt(state.politics.lastPolicyChangeYear));
}

/**
 * Calendario / estaciones.
 * @param {object} state
 */
export function renderCalendar(state) {
  const seasonNames = {
    spring: 'Primavera',
    summer: 'Verano',
    autumn: 'Otoño',
    winter: 'Invierno',
  };

  _setText('calendar-season', seasonNames[state.calendar.season] || state.calendar.season);
  _setText('calendar-year', _fmt(state.calendar.year));
  _setText('calendar-ticks', _fmt(state.calendar.ticks));
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Establece el textContent de un elemento si existe.
 * @param {string} key
 * @param {string} value
 */
function _setText(key, value) {
  const el = _elements[key];
  if (el) el.textContent = value;
}

/**
 * Añade o remueve una clase CSS de un elemento.
 * @param {string} key
 * @param {string} className
 * @param {boolean} add
 */
function _setClass(key, className, add) {
  const el = _elements[key];
  if (el) el.classList.toggle(className, add);
}

/**
 * Formatea un número para mostrar.
 * @param {number} n
 * @returns {string}
 */
function _fmt(n) {
  if (n === undefined || n === null) return '0';
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}