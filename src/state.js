// =============================================================================
// state.js — Estado inicial del juego (GAME_SPEC.md v1.0.0)
// =============================================================================
// Todas las propiedades comienzan en 0 / null / false.
// El juego empieza desde cero, sin recursos ni población.
// =============================================================================

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

/** Casillas de terreno útil al inicio del juego */
export const TOTAL_PLOTS = 50;

/** Capacidad máxima inicial de almacenamiento de Ciencia */
export const INITIAL_SCIENCE_CAP = 800;

/** Costo base de madera para la primera parcela residencial */
export const BASE_WOOD_COST = 50;

/** Multiplicador de costo instantáneo por nivel de arquitectura */
export const ARCHITECTURE_COST_MULTIPLIER = 120;

/** Velocidad base de construcción (+% por tick) */
export const BUILD_SPEED = 10;

// ─── ESTADO INICIAL DEL JUEGO ────────────────────────────────────────────────

export const INITIAL_GAME_STATE = {
  // ── 1. RECURSOS ─────────────────────────────────────────────────────────
  // Todos los recursos empiezan en 0. Los límites (Max) definen la capacidad
  // máxima de almacenamiento de cada recurso.
  resources: {
    wood: 0,
    woodMax: 100,
    stone: 0,
    stoneMax: 100,
    food: 0,
    foodMax: 100,
    science: 0,
    scienceMax: INITIAL_SCIENCE_CAP,
    gold: 0,
    money: 0,       // Monedas / Dinero (currency)
    tools: 0,
    population: 0,  // Total de aldeanos vivos
    housingMax: 0,  // Capacidad máxima de vivienda
  },

  // ── 2. MAPA / TERRITORIO ────────────────────────────────────────────────
  map: {
    totalPlots: TOTAL_PLOTS,  // Casillas totales de terreno útil
    usedPlots: 0,             // Casillas ocupadas (residenciales + industriales)
  },

  // ── 3. URBANISMO (Zonificación y Construcción) ──────────────────────────
  urbanism: {
    assignedPlots: 0,       // Parcelas residenciales asignadas
    builtHouses: 0,         // Casas completamente construidas
    buildProgress: 0,       // Progreso de construcción (0–100)
    buildSpeed: BUILD_SPEED, // % de avance por tick
  },

  // ── 4. ROLES DE POBLACIÓN (Trabajadores asignados) ─────────────────────
  jobs: {
    farmers: 0,       // Granjero:    +0.15 comida/seg
    lumberjacks: 0,   // Leñador:     +0.08 madera/seg
    miners: 0,        // Minero:      +0.05 oro/seg  (requiere Metal Working)
    scientists: 0,    // Científico:  +0.05 ciencia/seg
    hunters: 0,       // Cazador:     Expediciones de caza (requiere Animal Husbandry)
    bankers: 0,       // Banquero:    +0.10 monedas/seg (requiere Currency)
  },

  // ── 5. TECNOLOGÍAS (Árbol de Ciencia) ───────────────────────────────────
  technologies: {
    calendar: false,          // 30  ciencia — Desbloquea tiempo/estaciones
    agriculture: false,       // 100 ciencia — Desbloquea Granjeros y Barn
    mining: false,            // 500 ciencia — Desbloquea Piedra y Cantera
    animalHusbandry: false,   // 500 ciencia — Desbloquea Cazadores, Carne/Pieles
    construction: false,      // 1300 ciencia — Desbloquea Log House (vivienda niv. 2)
    civilService: false,      // 1500 ciencia — Desbloquea Gobierno/Sistema Político
    currency: false,          // 2200 ciencia — Desbloquea Banco, Banquero, Comercio
  },

  // ── 6. POLÍTICAS Y GOBIERNO ─────────────────────────────────────────────
  politics: {
    currentPolicy: null,            // 'monarchy' | 'democracy' | 'capitalism' | 'technocracy'
    lastPolicyChangeYear: 0,        // Año del último cambio (para cooldown)
  },

  // ── 7. CALENDARIO / ESTACIONES ──────────────────────────────────────────
  calendar: {
    ticks: 0,           // Contador global de ticks transcurridos
    year: 1,            // Año actual del juego
    season: 'spring',   // 'spring' | 'summer' | 'autumn' | 'winter'
  },
};

// ─── FUNCIÓN DE EXPORT ───────────────────────────────────────────────────────

/**
 * Devuelve una copia profunda (deep clone) del estado inicial.
 * Útil para reinicios de partida y para evitar mutaciones accidentales
 * del objeto original.
 *
 * @returns {typeof INITIAL_GAME_STATE}
 */
export function getInitialState() {
  return structuredClone(INITIAL_GAME_STATE);
}