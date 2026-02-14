// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Mission Data
// ═══════════════════════════════════════════════════════════════════════════════

import type { Mission } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Near Space Missions (Locations 1-2) - 2 Fame
// ─────────────────────────────────────────────────────────────────────────────

export const NEAR_MISSIONS: Mission[] = [
  {
    id: 'refuel-station',
    zone: 'near',
    title: 'Refuel Station',
    requirements: { computers: 1, engines: 1, logistics: 1 },
    fame: 2,
    type: 'Trade',
    rewardType: 'bolt',
    reward: '+2⚡',
    rewardData: { powerChoice: 2 },
  },
  {
    id: 'signal-boost',
    zone: 'near',
    title: 'Signal Boost',
    requirements: { computers: 2, logistics: 1 },
    fame: 2,
    type: 'Diplomacy',
    rewardType: 'gear',
    reward: '+1⚡ if 3+ missions',
    rewardData: { conditionalPower: { trigger: 'missions3plus', amount: 1 } },
  },
  {
    id: 'cargo-recovery',
    zone: 'near',
    title: 'Cargo Recovery',
    requirements: { weapons: 1, engines: 1, logistics: 1 },
    fame: 2,
    type: 'Exploration',
    rewardType: 'bolt',
    reward: '+2 Credits',
    rewardData: { credits: 2 },
  },
  {
    id: 'trade-route-mapping',
    zone: 'near',
    title: 'Trade Route Mapping',
    requirements: { computers: 1, engines: 2 },
    fame: 2,
    type: 'Exploration',
    rewardType: 'trophy',
    reward: 'Gain credits: +1⚡',
    rewardData: { passive: { trigger: 'onGainCredits', power: 1 } },
  },
  {
    id: 'perimeter-patrol',
    zone: 'near',
    title: 'Perimeter Patrol',
    requirements: { weapons: 1, computers: 1, engines: 1 },
    fame: 2,
    type: 'Combat',
    rewardType: 'bolt',
    reward: '+1⚡, +1 Credit',
    rewardData: { powerChoice: 1, credits: 1 },
  },
  {
    id: 'system-check',
    zone: 'near',
    title: 'System Check',
    requirements: { computers: 1, logistics: 2 },
    fame: 2,
    type: 'Maintenance',
    rewardType: 'gear',
    reward: '+1⚡ if 2+ cards played',
    rewardData: { conditionalPower: { trigger: 'cards2plus', amount: 1 } },
  },
  {
    id: 'black-box-retrieval',
    zone: 'near',
    title: 'Black Box Retrieval',
    requirements: { weapons: 1, computers: 2 },
    fame: 2,
    type: 'Exploration',
    rewardType: 'bolt',
    reward: '+2⚡ or +3 Credits',
    rewardData: { choice: [{ powerChoice: 2 }, { credits: 3 }] },
  },
  {
    id: 'merchant-escort',
    zone: 'near',
    title: 'Merchant Escort',
    requirements: { weapons: 1, engines: 1, logistics: 1 },
    fame: 2,
    type: 'Diplomacy',
    rewardType: 'trophy',
    reward: 'If alone: +1⚡',
    rewardData: { passive: { trigger: 'ifAlone', power: 1 } },
  },
  {
    id: 'fence-the-goods',
    zone: 'near',
    title: 'Fence the Goods',
    requirements: { engines: 1, logistics: 2 },
    fame: 2,
    type: 'Smuggling',
    rewardType: 'bolt',
    reward: '+3 Credits',
    rewardData: { credits: 3 },
  },
  {
    id: 'orbital-delivery',
    zone: 'near',
    title: 'Orbital Delivery',
    requirements: { computers: 1, engines: 1, logistics: 1 },
    fame: 2,
    type: 'Trade',
    rewardType: 'gear',
    reward: '+1 Credit/turn',
    rewardData: { credits: 1 },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mid Space Missions (Locations 3-4) - 3-4 Fame
// ─────────────────────────────────────────────────────────────────────────────

export const MID_MISSIONS: Mission[] = [
  {
    id: 'encrypted-relay-spike',
    zone: 'mid',
    title: 'Encrypted Relay',
    requirements: { weapons: 1, computers: 3, logistics: 1 },
    fame: 3,
    type: 'Diplomacy',
    rewardType: 'gear',
    reward: '+1⚡. Mission: +1 credit',
    rewardData: { powerChoice: 1, conditionalCredits: { trigger: 'onMission', amount: 1 } },
  },
  {
    id: 'raider-ambush',
    zone: 'mid',
    title: 'Raider Ambush',
    requirements: { weapons: 3, engines: 2 },
    fame: 4,
    type: 'Combat',
    rewardType: 'bolt',
    reward: '+3⚡',
    rewardData: { powerChoice: 3 },
  },
  {
    id: 'smuggler-rendezvous',
    zone: 'mid',
    title: 'Smuggler Rendezvous',
    requirements: { weapons: 1, computers: 1, engines: 2, logistics: 2 },
    fame: 4,
    type: 'Smuggling',
    rewardType: 'trophy',
    reward: '+1 Credit. 2+ Trophy: +1⚡',
    rewardData: { credits: 1, conditionalPower: { trigger: 'trophies2plus', amount: 1 } },
  },
  {
    id: 'forbidden-artifact',
    zone: 'mid',
    title: 'Forbidden Artifact',
    requirements: { computers: 3, engines: 1, logistics: 1 },
    fame: 3,
    type: 'Exploration',
    rewardType: 'gear',
    reward: '+2⚡. EoG: -1 Fame if kept',
    rewardData: { powerChoice: 2, endGamePenalty: { fame: -1 } },
  },
  {
    id: 'orbital-tax-evasion',
    zone: 'mid',
    title: 'Orbital Tax Evasion',
    requirements: { computers: 2, engines: 1, logistics: 2 },
    fame: 3,
    type: 'Trade',
    rewardType: 'bolt',
    reward: '+3 Credits, trash 1',
    rewardData: { credits: 3, mayTrash: 1 },
  },
  {
    id: 'broker-uprising',
    zone: 'mid',
    title: 'Broker Uprising',
    requirements: { weapons: 2, computers: 2, logistics: 1 },
    fame: 4,
    type: 'Diplomacy',
    rewardType: 'bolt',
    reward: '+2⚡, +2 Credits',
    rewardData: { powerChoice: 2, credits: 2 },
  },
  {
    id: 'deep-void-courier',
    zone: 'mid',
    title: 'Deep Void Courier',
    requirements: { computers: 1, engines: 3, logistics: 1 },
    fame: 4,
    type: 'Trade',
    rewardType: 'gear',
    reward: '+1⚡. Alone: +1 credit',
    rewardData: { powerChoice: 1, conditionalCredits: { trigger: 'ifAlone', amount: 1 } },
  },
  {
    id: 'hazard-bounty',
    zone: 'mid',
    title: 'Hazard Bounty',
    requirements: { weapons: 2, computers: 1, engines: 1, logistics: 1 },
    fame: 3,
    type: 'Combat',
    rewardType: 'bolt',
    reward: '+3⚡, trash hazard',
    rewardData: { powerChoice: 3, trashHazard: 1 },
  },
  {
    id: 'contraband-cleanup',
    zone: 'mid',
    title: 'Contraband Cleanup',
    requirements: { computers: 2, logistics: 3 },
    fame: 3,
    type: 'Smuggling',
    rewardType: 'trophy',
    reward: 'Trash: +1⚡',
    rewardData: { passive: { trigger: 'onTrash', power: 1 } },
  },
  {
    id: 'adaptive-drone-deployment',
    zone: 'mid',
    title: 'Adaptive Drone',
    requirements: { weapons: 1, computers: 2, engines: 2 },
    fame: 4,
    type: 'Exploration',
    rewardType: 'gear',
    reward: '+2⚡ if 5+ cards',
    rewardData: { conditionalPower: { trigger: 'cards5plus', amount: 2 } },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Deep Space Missions (Locations 5-6) - 5-6 Fame
// ─────────────────────────────────────────────────────────────────────────────

export const DEEP_MISSIONS: Mission[] = [
  {
    id: 'council-tribunal',
    zone: 'deep',
    title: 'Council Tribunal',
    requirements: { weapons: 2, computers: 3, engines: 1, logistics: 2 },
    fame: 5,
    type: 'Diplomacy',
    rewardType: 'bolt',
    reward: '+4⚡, +2 Credits',
    rewardData: { powerChoice: 4, credits: 2 },
  },
  {
    id: 'asteroid-siege',
    zone: 'deep',
    title: 'Asteroid Siege',
    requirements: { weapons: 4, engines: 3 },
    fame: 6,
    type: 'Combat',
    rewardType: 'gear',
    reward: '+2⚡. 2+ hazards: +4⚡',
    rewardData: { powerChoice: 2, conditionalPower: { trigger: 'hazards2plus', amount: 4 } },
  },
  {
    id: 'silent-exchange',
    zone: 'deep',
    title: 'Silent Exchange',
    requirements: { weapons: 1, computers: 2, engines: 2, logistics: 3 },
    fame: 5,
    type: 'Smuggling',
    rewardType: 'bolt',
    reward: '+3⚡, +3 Credits',
    rewardData: { powerChoice: 3, credits: 3 },
  },
  {
    id: 'relic-excavation',
    zone: 'deep',
    title: 'Relic Excavation',
    requirements: { computers: 3, engines: 2, logistics: 2 },
    fame: 5,
    type: 'Exploration',
    rewardType: 'gear',
    reward: '+2⚡. 5th mission: +1 Fame',
    rewardData: { powerChoice: 2, conditionalFame: { trigger: 'mission5', amount: 1 } },
  },
  {
    id: 'fleet-arbitration',
    zone: 'deep',
    title: 'Fleet Arbitration',
    requirements: { weapons: 2, computers: 4, engines: 1, logistics: 1 },
    fame: 5,
    type: 'Diplomacy',
    rewardType: 'trophy',
    reward: '+1⚡. Station: +2 credits',
    rewardData: { powerChoice: 1, conditionalCredits: { trigger: 'atStation', amount: 2 } },
  },
  {
    id: 'hazard-dump-zone',
    zone: 'deep',
    title: 'Hazard Dump Zone',
    requirements: { weapons: 2, computers: 1, engines: 1, logistics: 3 },
    fame: 5,
    type: 'Maintenance',
    rewardType: 'bolt',
    reward: 'Trash 2+ hazards: +4⚡, +1 Fame',
    rewardData: { conditionalReward: { trigger: 'trash2hazards', power: 4, fame: 1 } },
  },
  {
    id: 'quantum-proxy-hack',
    zone: 'deep',
    title: 'Quantum Proxy Hack',
    requirements: { weapons: 1, computers: 4, engines: 1, logistics: 2 },
    fame: 5,
    type: 'Exploration',
    rewardType: 'gear',
    reward: '+2⚡. Solo mission: +2⚡',
    rewardData: { powerChoice: 2, conditionalPower: { trigger: 'soloMission', amount: 2 } },
  },
  {
    id: 'warlords-convoy',
    zone: 'deep',
    title: "Warlord's Convoy",
    requirements: { weapons: 3, computers: 2, engines: 2 },
    fame: 6,
    type: 'Combat',
    rewardType: 'trophy',
    reward: '+1⚡. Give hazard: +1 credit',
    rewardData: { powerChoice: 1, passive: { trigger: 'onGiveHazard', credits: 1 } },
  },
  {
    id: 'interstellar-arms-deal',
    zone: 'deep',
    title: 'Arms Deal',
    requirements: { weapons: 3, computers: 1, engines: 2, logistics: 2 },
    fame: 5,
    type: 'Smuggling',
    rewardType: 'bolt',
    reward: '+5⚡',
    rewardData: { powerChoice: 5 },
  },
  {
    id: 'forgotten-vault',
    zone: 'deep',
    title: 'Forgotten Vault',
    requirements: { computers: 2, engines: 2, logistics: 4 },
    fame: 5,
    type: 'Exploration',
    rewardType: 'gear',
    reward: '+3⚡. EoG: -2 credits if kept',
    rewardData: { powerChoice: 3, endGamePenalty: { credits: -2 } },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Export All Missions
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_MISSIONS = [...NEAR_MISSIONS, ...MID_MISSIONS, ...DEEP_MISSIONS];

export const getMissionsByZone = (zone: 'near' | 'mid' | 'deep'): Mission[] => {
  switch (zone) {
    case 'near': return NEAR_MISSIONS;
    case 'mid': return MID_MISSIONS;
    case 'deep': return DEEP_MISSIONS;
  }
};

export const getMissionById = (id: string): Mission | undefined => {
  return ALL_MISSIONS.find(m => m.id === id);
};
