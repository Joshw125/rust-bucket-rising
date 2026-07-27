/**
 * One-off: construct a "built economy" mid-game for testing the Fame-card path.
 * Tycoon, Fame 13, three clean credit installs (~+5 credits/turn), at Station 1.
 * Mirrors the mission-push test's Fame-13 starting point for comparability.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { GameEngine, createCardInstance } from '../shared/engine/GameEngine.js';
import { ALL_ACTION_CARDS } from '../shared/data/cards.js';
import { getCaptainById } from '../shared/data/captains.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '.arena');
const find = (id: string) => ALL_ACTION_CARDS.find(c => c.id === id)!;

const e = new GameEngine([
  { name: 'P1_Tycoon', captain: getCaptainById('tycoon')! },
  { name: 'P2_Nav', captain: getCaptainById('navigator')! },
]);
const s = e.getState();
const p = s.players[0];
p.fame = 13;
p.location = 1;
p.credits = 0;
s.players[1].fame = 12;
// Clean credit installs (installData.credits only — no pending-triggering effects)
(p.installations as any).logistics = createCardInstance(find('credit-surge'));  // +2 cr/turn
(p.installations as any).computers = createCardInstance(find('trade-nexus'));    // +2 cr/turn
(p.installations as any).weapons = createCardInstance(find('repo-order'));       // +1 cr/turn
s.turn = 8;
s.currentPlayerIndex = 0;
s.phase = 'action';

fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(s));
fs.writeFileSync(path.join(dir, 'state.econ.json'), JSON.stringify(s));
console.log('Econ midgame set: Tycoon Fame 13, installs = Credit Surge + Trade Nexus + Repo Order (~+5 cr/turn).');
