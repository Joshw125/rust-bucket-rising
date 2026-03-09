// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Captain Data
// ═══════════════════════════════════════════════════════════════════════════════

import type { Captain } from '@/types';

export const CAPTAINS: Captain[] = [
  {
    id: 'scrapper',
    name: 'Scrapper',
    effect: 'Start with +2 max Logistics',
    ability: { startBonus: { logistics: 2 } },
    flavor: 'Season 3 fan favorite. Somehow still alive.',
    image: 'Scrapper.png',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    effect: 'Turn start: +1⚡ in highest system',
    ability: { turnStart: 'powerToHighest' },
    flavor: 'Seven-time returning contestant. The producers hate him.',
    image: 'Veteran.png',
  },
  {
    id: 'tycoon',
    name: 'Tycoon',
    effect: 'Turn start: +1 Credit',
    ability: { turnStart: 'credit' },
    flavor: 'The only contestant with a pre-show sponsorship deal.',
    image: 'Tycoon.png',
  },
  {
    id: 'mercenary',
    name: 'Mercenary',
    effect: 'Give hazard: +1 Credit',
    ability: { trigger: 'onGiveHazard', reward: 'credit' },
    flavor: 'Banned from 2 previous seasons. Ratings gold.',
    image: 'Mercenary.png',
  },
  {
    id: 'navigator',
    name: 'Navigator',
    effect: 'Once/turn: 1 free move',
    ability: { freeMove: 1 },
    flavor: 'Set the speed record in Season 1. Still chasing that high.',
    image: 'Navigator.png',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    effect: 'Draw hazard: +1 Card',
    ability: { trigger: 'onDrawHazard', reward: 'draw' },
    flavor: 'Presumed dead after Season 4. Showed up anyway.',
    image: 'Ghost.png',
  },
  {
    id: 'broker',
    name: 'Broker',
    effect: 'Once/turn: Activate system twice',
    ability: { doubleActivate: true },
    flavor: 'Negotiated a cut of the merchandise before episode 1.',
    image: 'Broker.png',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    effect: 'Start with +1 Computers, +1 Logistics',
    ability: { startBonus: { computers: 1, logistics: 1 } },
    flavor: 'Built her qualifier ship from a dumpster. On camera.',
    image: 'Engineer.png',
  },
  {
    id: 'infiltrator',
    name: 'Infiltrator',
    effect: 'Weapons on mission: give 1 hazard',
    ability: { trigger: 'onWeaponsMission', reward: 'giveHazard' },
    flavor: "Nobody remembers him winning. That's the point.",
    image: 'Infiltrator.png',
  },
];

export const getCaptainById = (id: string): Captain | undefined => {
  return CAPTAINS.find(c => c.id === id);
};
