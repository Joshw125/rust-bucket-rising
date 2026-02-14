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
    flavor: 'Nothing is useless.',
    image: 'Scrapper.png',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    effect: 'Turn start: +1⚡ in highest system',
    ability: { turnStart: 'powerToHighest' },
    flavor: 'Experience pays off.',
    image: 'Veteran.png',
  },
  {
    id: 'tycoon',
    name: 'Tycoon',
    effect: 'Turn start: +1 Credit',
    ability: { turnStart: 'credit' },
    flavor: 'Profit first. Then plasma.',
    image: 'Tycoon.png',
  },
  {
    id: 'mercenary',
    name: 'Mercenary',
    effect: 'Give hazard: +1 Credit',
    ability: { trigger: 'onGiveHazard', reward: 'credit' },
    flavor: 'Chaos is billable.',
    image: 'Mercenary.png',
  },
  {
    id: 'navigator',
    name: 'Navigator',
    effect: 'Once/turn: 1 free move',
    ability: { freeMove: 1 },
    flavor: 'I make jumps.',
    image: 'Navigator.png',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    effect: 'Draw hazard: +1 Card',
    ability: { trigger: 'onDrawHazard', reward: 'draw' },
    flavor: "What's wrecked can still haunt.",
    image: 'Ghost.png',
  },
  {
    id: 'broker',
    name: 'Broker',
    effect: 'Once/turn: Activate system twice',
    ability: { doubleActivate: true },
    flavor: "Deals don't wait.",
    image: 'Broker.png',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    effect: 'Start with +1 Computers, +1 Logistics',
    ability: { startBonus: { computers: 1, logistics: 1 } },
    flavor: 'Give me five minutes.',
    image: 'Engineer.png',
  },
  {
    id: 'infiltrator',
    name: 'Infiltrator',
    effect: 'Weapons on mission: give 1 hazard',
    ability: { trigger: 'onWeaponsMission', reward: 'giveHazard' },
    flavor: 'They never see me coming.',
    image: 'Infiltrator.png',
  },
];

export const getCaptainById = (id: string): Captain | undefined => {
  return CAPTAINS.find(c => c.id === id);
};
