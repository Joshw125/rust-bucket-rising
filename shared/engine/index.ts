// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Engine Module Exports
// ═══════════════════════════════════════════════════════════════════════════════

export {
  GameEngine,
  createPlayer,
  createCardInstance,
  createMissionInstance,
  createEmptyPowerState,
  createStartingPowerState,
  createMaxPowerState,
  clampPower,
  getTotalPower,
  getHighestSystem,
  shuffle,
  generateInstanceId,
  resetInstanceIdCounter,
  setupMarket,
  setupMissions,
  setupHazardDeck,
} from './GameEngine.js';

export { AIEngine } from './AIEngine.js';
export { SimulationRunner } from './SimulationRunner.js';

export type { default as GameEngineType } from './GameEngine.js';
