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
} from './GameEngine';

export { AIEngine } from './AIEngine';
export { SimulationRunner } from './SimulationRunner';

export type { default as GameEngineType } from './GameEngine';
