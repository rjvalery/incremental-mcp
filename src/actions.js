// =============================================================================
// actions.js — Lógica de interacción del jugador
// =============================================================================
// Compatible con la estructura de state.js (GAME_SPEC.md v1.0.0).
// Funciones que representan acciones del jugador: recolectar, asignar zonas,
// asignar trabajadores, investigar tecnologías, cambiar políticas, comerciar.
// =============================================================================

import { getMutableState, getGameState } from './engine.js';
import {
  BASE_WOOD_COST,
  ARCHITECTURE_COST_MULTIPLIER,
  TOTAL_PLOTS,
} from './state.js';

// ─── Recolección manual ──────────────────────────────────────────────────────

/**
 * Recolecta comida manualmente (+1).
 * @returns {boolean}
 */
export function gatherFood() {
  const state = getMutableState();
  if (!state) return false;
  state.resources.food += 1;
  _notifyAction('food-gathered');
  return true;
}

/**
 * Recolecta madera manualmente (+1).
 * @returns {boolean}
 */
export function gatherWood() {
  const state = getMutableState();
  if (!state) return false;
  state.resources.wood += 1;
  _notifyAction('wood-gathered');
  return true;
}

// ─── Zonificación (Urbanismo) ────────────────────────────────────────────────

/**
 * Calcula el costo en madera de la siguiente parcela residencial.
 * Fórmula: BASE_WOOD_COST × 1.15^(assignedPlots)
 * @returns {{ wood: number, plotCost: number } | null}
 */
export function getNextPlotCost() {
  const state = getGameState();
  if (!state) return null;

  const currentPlots = state.urbanism.assignedPlots;
  const woodCost = Math.floor(BASE_WOOD_COST * Math.pow(1.15, currentPlots));

  return { wood: woodCost, plotCost: 1 };
}

/**
 * Asigna una nueva parcela residencial.
 * Valida: almacén vital, casillas disponibles, recursos suficientes.
 * Cobra al instante e inicia construcción pasiva.
 * @returns {{ success: boolean, reason?: string }}
 */
export function assignPlot() {
  const state = getMutableState();
  if (!state) return { success: false, reason: 'Estado no inicializado' };

  // 1. Validar que no haya una obra en curso
  if (state.urbanism.buildProgress > 0 && state.urbanism.buildProgress < 100) {
    return { success: false, reason: 'Ya hay una construcción en curso' };
  }

  // 2. Calcular costo
  const cost = getNextPlotCost();
  if (!cost) return { success: false, reason: 'Error al calcular costo' };

  // 3. Regla del Almacén Vital: woodMax debe ser >= costo de madera
  if (state.resources.woodMax < cost.wood) {
    return { success: false, reason: 'Almacén de madera insuficiente para el costo' };
  }

  // 4. Validar casillas disponibles
  const freePlots = state.map.totalPlots - state.map.usedPlots;
  if (freePlots < cost.plotCost) {
    return { success: false, reason: 'No hay casillas de terreno disponibles' };
  }

  // 5. Validar recursos suficientes
  if (state.resources.wood < cost.wood) {
    return { success: false, reason: 'Madera insuficiente' };
  }

  // 6. Cobro al instante
  state.resources.wood -= cost.wood;

  // 7. Ocupar casilla e iniciar construcción
  state.urbanism.assignedPlots += cost.plotCost;
  state.map.usedPlots += cost.plotCost;
  state.urbanism.buildProgress = 1; // Inicia la construcción (>0 la activa)

  _notifyAction('plot-assigned', { woodCost: cost.wood });
  return { success: true };
}

// ─── Asignación de trabajadores ───────────────────────────────────────────────

/**
 * Roles válidos y sus requisitos tecnológicos.
 */
const JOB_TECH_REQUIREMENTS = {
  miners: 'mining',
  hunters: 'animalHusbandry',
  bankers: 'currency',
};

/**
 * Asigna un aldeano libre a un rol.
 * @param {'farmers'|'lumberjacks'|'miners'|'scientists'|'hunters'|'bankers'} job
 * @returns {{ success: boolean, reason?: string }}
 */
export function assignWorker(job) {
  const state = getMutableState();
  if (!state) return { success: false, reason: 'Estado no inicializado' };

  const validJobs = ['farmers', 'lumberjacks', 'miners', 'scientists', 'hunters', 'bankers'];
  if (!validJobs.includes(job)) {
    return { success: false, reason: `Rol inválido: ${job}` };
  }

  // Calcular aldeanos libres (population - todos los trabajadores asignados)
  const totalAssigned = Object.values(state.jobs).reduce((a, b) => a + b, 0);
  const idle = state.resources.population - totalAssigned;

  if (idle <= 0) {
    return { success: false, reason: 'No hay aldeanos libres' };
  }

  // Validar requisitos tecnológicos
  const requiredTech = JOB_TECH_REQUIREMENTS[job];
  if (requiredTech && !state.technologies[requiredTech]) {
    return { success: false, reason: `Se requiere ${requiredTech} para este rol` };
  }

  state.jobs[job] += 1;

  _notifyAction('worker-assigned', { job });
  return { success: true };
}

/**
 * Desasigna un trabajador de un rol.
 * @param {'farmers'|'lumberjacks'|'miners'|'scientists'|'hunters'|'bankers'} job
 * @returns {{ success: boolean, reason?: string }}
 */
export function unassignWorker(job) {
  const state = getMutableState();
  if (!state) return { success: false, reason: 'Estado no inicializado' };

  if (state.jobs[job] <= 0) {
    return { success: false, reason: `No hay trabajadores en ${job}` };
  }

  state.jobs[job] -= 1;

  _notifyAction('worker-unassigned', { job });
  return { success: true };
}

// ─── Investigación de tecnologías ─────────────────────────────────────────────

/**
 * Prerrequisitos de cada tecnología.
 */
const TECH_PREREQUISITES = {
  calendar: [],
  agriculture: [],
  mining: [],
  animalHusbandry: [],
  construction: [],
  civilService: [],
  currency: ['mining', 'civilService'],
};

/**
 * Costos de cada tecnología en ciencia.
 */
const TECH_COSTS = {
  calendar: 30,
  agriculture: 100,
  mining: 500,
  animalHusbandry: 500,
  construction: 1300,
  civilService: 1500,
  currency: 2200,
};

/**
 * Intenta investigar una tecnología.
 * @param {string} techId
 * @returns {{ success: boolean, reason?: string }}
 */
export function researchTechnology(techId) {
  const state = getMutableState();
  if (!state) return { success: false, reason: 'Estado no inicializado' };

  if (!(techId in state.technologies)) {
    return { success: false, reason: `Tecnología desconocida: ${techId}` };
  }

  if (state.technologies[techId]) {
    return { success: false, reason: 'Tecnología ya investigada' };
  }

  // Validar prerrequisitos
  const prereqs = TECH_PREREQUISITES[techId] || [];
  for (const prereq of prereqs) {
    if (!state.technologies[prereq]) {
      return { success: false, reason: `Requiere: ${prereq}` };
    }
  }

  const cost = TECH_COSTS[techId];
  if (cost === undefined) {
    return { success: false, reason: 'Costo no definido' };
  }

  if (state.resources.science < cost) {
    return { success: false, reason: `Ciencia insuficiente (${cost} requerida)` };
  }

  state.resources.science -= cost;
  state.technologies[techId] = true;

  _notifyAction('technology-researched', { techId, cost });
  return { success: true };
}

// ─── Sistema de Políticas ─────────────────────────────────────────────────────

/**
 * Cambia la política activa del gobierno.
 * Valida cooldown de 5 años.
 * @param {'monarchy'|'democracy'|'capitalism'|'technocracy'} policy
 * @returns {{ success: boolean, reason?: string }}
 */
export function setPolicy(policy) {
  const state = getMutableState();
  if (!state) return { success: false, reason: 'Estado no inicializado' };

  const validPolicies = ['monarchy', 'democracy', 'capitalism', 'technocracy'];
  if (!validPolicies.includes(policy)) {
    return { success: false, reason: `Política inválida: ${policy}` };
  }

  if (!state.technologies.civilService) {
    return { success: false, reason: 'Se requiere Civil Service' };
  }

  // Validar cooldown de 5 años
  if (state.politics.currentPolicy !== null) {
    const yearsSinceChange = state.calendar.year - state.politics.lastPolicyChangeYear;
    if (yearsSinceChange < 5) {
      const remaining = 5 - yearsSinceChange;
      return { success: false, reason: `Cooldown: ${remaining} año(s) restante(s)` };
    }
  }

  state.politics.currentPolicy = policy;
  state.politics.lastPolicyChangeYear = state.calendar.year;

  _notifyAction('policy-changed', { policy });
  return { success: true };
}

// ─── Comercio y Expediciones ──────────────────────────────────────────────────

/**
 * Ejecuta una expedición comercial.
 * Consume 100 monedas + 400 madera.
 * @returns {{ success: boolean, reason?: string, loot?: object }}
 */
export function sendExpedition() {
  const state = getMutableState();
  if (!state) return { success: false, reason: 'Estado no inicializado' };

  if (!state.technologies.currency) {
    return { success: false, reason: 'Se requiere Currency' };
  }

  const costMoney = 100;
  const costWood = 400;

  if (state.resources.money < costMoney) {
    return { success: false, reason: `Monedas insuficientes (${costMoney})` };
  }

  if (state.resources.wood < costWood) {
    return { success: false, reason: `Madera insuficiente (${costWood})` };
  }

  state.resources.money -= costMoney;
  state.resources.wood -= costWood;

  const loot = _generateLoot();
  _applyLoot(state, loot);

  _notifyAction('expedition-sent', { loot });
  return { success: true, loot };
}

/**
 * Genera un cargamento aleatorio de recursos.
 * @returns {Object<string, number>}
 */
function _generateLoot() {
  const possibleLoot = {
    stone: { min: 10, max: 50 },
    tools: { min: 1, max: 5 },
    science: { min: 5, max: 25 },
    gold: { min: 2, max: 10 },
  };

  const loot = {};
  const keys = Object.keys(possibleLoot);
  const numItems = 1 + Math.floor(Math.random() * 3);

  for (let i = 0; i < numItems; i++) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    const { min, max } = possibleLoot[key];
    loot[key] = (loot[key] || 0) + Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return loot;
}

/**
 * Aplica el botín al estado.
 * @param {object} state
 * @param {Object<string, number>} loot
 */
function _applyLoot(state, loot) {
  for (const [resource, amount] of Object.entries(loot)) {
    if (resource in state.resources) {
      state.resources[resource] += amount;
    }
  }
}

// ─── Helper interno ───────────────────────────────────────────────────────────

/**
 * Dispara un evento personalizado de acción.
 * @param {string} actionName
 * @param {object} [detail]
 */
function _notifyAction(actionName, detail = {}) {
  document.dispatchEvent(new CustomEvent('game-action', {
    detail: { action: actionName, ...detail },
  }));
}