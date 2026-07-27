/**
 * Rust Bucket Rising — Agent Arena
 *
 * A move-by-move driver for the real GameEngine, designed so an external brain
 * (me + subagents) can play a full game. Game state is persisted to JSON between
 * CLI invocations, so each call is stateless: load -> act -> save.
 *
 * Legality is delegated entirely to the engine via trial-dispatch on a throwaway
 * clone (loadState), so the menu only ever offers moves the engine accepts —
 * including all hazard gating, affordability, location checks, etc.
 *
 * Usage:
 *   npx tsx sim/arena.ts init [cap1,cap2,...]      # new game (default: veteran,tycoon)
 *   npx tsx sim/arena.ts view                       # show current player's POV + legal menu
 *   npx tsx sim/arena.ts act <index> [opts]         # apply menu choice #index
 *   npx tsx sim/arena.ts auto [N]                   # auto-play N decisions (validation)
 *   npx tsx sim/arena.ts state                      # dump raw saved state path
 *
 * act options:
 *   --alloc w=2,c=1,e=0,l=0   # required for PLAY_CARD of a powerChoice card (sum must match)
 *   --system <weapons|computers|engines|logistics>   # override INSTALL target system
 *   --note "free text"        # reasoning, recorded in the transcript
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { GameEngine } from '../shared/engine/GameEngine.js';
import { CAPTAINS, getCaptainById } from '../shared/data/captains.js';
import { SYSTEMS, SYSTEM_CONFIG, STATION_LOCATIONS, ZONE_MAP } from '../shared/data/constants.js';
import type {
  GameState,
  GameAction,
  Player,
  SystemType,
  CardInstance,
  ActionCard,
  MissionInstance,
  PowerAllocation,
} from '../shared/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIR = path.join(__dirname, '.arena');
const STATE_FILE = path.join(DIR, 'state.json');
const TRANSCRIPT_FILE = path.join(DIR, 'transcript.jsonl');

// Experiment toggles (sim/.arena/config.json). revealMissions: show all board missions'
// full details in `view` even before they're visited (tests the "blindness" lever).
function readConfig(): { revealMissions: boolean } {
  try { return { revealMissions: false, ...JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf-8')) }; }
  catch { return { revealMissions: false }; }
}

const SYS_ABBR: Record<SystemType, string> = { weapons: 'W', computers: 'C', engines: 'E', logistics: 'L' };
const SYS_FROM_ABBR: Record<string, SystemType> = { w: 'weapons', c: 'computers', e: 'engines', l: 'logistics' };

// ─── Persistence ──────────────────────────────────────────────────────────────

function ensureDir() { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); }

function saveState(state: GameState) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

function loadEngine(): GameEngine {
  if (!fs.existsSync(STATE_FILE)) {
    console.error('No game in progress. Run: npx tsx sim/arena.ts init');
    process.exit(1);
  }
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as GameState;
  const engine = new GameEngine([{ name: 'tmp', captain: CAPTAINS[0] }]);
  engine.loadState(state);
  return engine;
}

// A reusable throwaway engine for trial-dispatch legality checks.
let _probe: GameEngine | null = null;
function isLegal(state: GameState, action: GameAction): boolean {
  if (!_probe) _probe = new GameEngine([{ name: 'probe', captain: CAPTAINS[0] }]);
  _probe.loadState(JSON.parse(JSON.stringify(state)));
  try {
    return _probe.dispatch(action) === true;
  } catch {
    return false;
  }
}

// ─── Legal-move enumeration ─────────────────────────────────────────────────────

interface Move {
  action: GameAction;
  label: string;
  needsAlloc?: number; // PLAY_CARD powerChoice amount that must be supplied via --alloc
}

function cardEffectText(c: CardInstance): string {
  const a = c as ActionCard & { effect?: string };
  return a.effect ?? '';
}

function powerChoiceOf(c: CardInstance): number {
  const ed = (c as any).effectData;
  return ed?.powerChoice ?? 0;
}

function enumerateTopLevel(state: GameState, player: Player): Move[] {
  const moves: Move[] = [];
  const at = player.location;
  const atStation = (STATION_LOCATIONS as readonly number[]).includes(at);

  // Plays
  for (const c of player.hand) {
    if (c.type === 'hazard') continue;
    const pc = powerChoiceOf(c);
    const action: GameAction = { type: 'PLAY_CARD', cardInstanceId: c.instanceId };
    if (isLegal(state, action)) {
      moves.push({
        action,
        label: `PLAY ${c.title}${cardEffectText(c) ? ` — ${cardEffectText(c)}` : ''}`,
        needsAlloc: pc > 0 ? pc : undefined,
      });
    }
  }

  // Installs (native system)
  for (const c of player.hand) {
    if (c.type !== 'action') continue;
    const ac = c as ActionCard & { instanceId: string };
    if (ac.installCost === undefined) continue;
    const sys = (ac.system ?? 'weapons') as SystemType;
    const action: GameAction = { type: 'INSTALL_CARD', cardInstanceId: c.instanceId, targetSystem: sys };
    if (isLegal(state, action)) {
      moves.push({ action, label: `INSTALL ${c.title} → ${sys} (cost ${ac.installCost}) — ${ac.installEffect ?? ''}` });
    }
  }

  // Complete mission here
  {
    const action: GameAction = { type: 'COMPLETE_MISSION' };
    if (isLegal(state, action)) {
      const m = state.trackMissions[at]?.mission;
      moves.push({ action, label: `COMPLETE MISSION${m ? ` "${m.title}" (+${m.fame} fame)` : ''}` });
    }
  }

  // Moves
  for (const dir of [1, -1] as const) {
    const action: GameAction = { type: 'MOVE', direction: dir };
    if (isLegal(state, action)) {
      moves.push({ action, label: `MOVE ${dir > 0 ? 'forward' : 'back'} → location ${at + dir}` });
    }
  }

  // Market (at station): reveal stacks + buy / buy+install revealed cards
  if (atStation) {
    const stacks = state.marketStacks[at as 1 | 3 | 5] ?? [];
    stacks.forEach((stack: any, stackIndex: number) => {
      if (!stack.revealed) {
        const action: GameAction = { type: 'REVEAL_STACK', station: at as 1 | 3 | 5, stackIndex };
        if (isLegal(state, action)) moves.push({ action, label: `REVEAL market stack #${stackIndex}` });
        return;
      }
      // top card only (rulebook), index 0
      const card = stack.cards[0] as (ActionCard & { instanceId: string }) | undefined;
      if (!card) return;
      const buy: GameAction = { type: 'BUY_CARD', stackIndex, cardIndex: 0 };
      if (isLegal(state, buy)) {
        moves.push({ action: buy, label: `BUY ${card.title} (cost ${card.cost}, T${card.tier}, ${card.system}) — ${card.effect}` });
      }
      if (card.installCost !== undefined) {
        const sys = (card.system ?? 'weapons') as SystemType;
        const bi: GameAction = { type: 'BUY_AND_INSTALL', stackIndex, cardIndex: 0, targetSystem: sys };
        if (isLegal(state, bi)) {
          moves.push({ action: bi, label: `BUY+INSTALL ${card.title} → ${sys} (cost ${card.cost}+${card.installCost}) — ${card.installEffect ?? ''}` });
        }
      }
    });
  }

  // Fame card at this station (buyable VP)
  {
    const fameAction: GameAction = { type: 'BUY_FAME_CARD' };
    if (isLegal(state, fameAction)) {
      const slot = (state as any).fameMarket?.[at];
      moves.push({ action: fameAction, label: `BUY FAME CARD: ${slot?.card?.title ?? ''} (cost ${slot?.card?.cost}) — +${slot?.card?.fame} Fame [${slot?.remaining} left]` });
    }
  }

  // System abilities
  for (const sys of SYSTEMS) {
    const abilities = SYSTEM_CONFIG[sys].abilities;
    abilities.forEach((ab, abilityIndex) => {
      const action: GameAction = { type: 'ACTIVATE_SYSTEM', system: sys, abilityIndex };
      if (isLegal(state, action)) {
        moves.push({ action, label: `ACTIVATE ${sys} (cost ${ab.cost}⚡) — ${ab.description}` });
      }
    });
  }

  // Clear hazards in hand
  for (const c of player.hand) {
    if (c.type !== 'hazard') continue;
    const action: GameAction = { type: 'CLEAR_HAZARD', hazardInstanceId: c.instanceId };
    if (isLegal(state, action)) {
      moves.push({ action, label: `CLEAR HAZARD ${c.title} — ${(c as any).clearCondition ?? ''}` });
    }
  }

  // End turn is always available
  moves.push({ action: { type: 'END_TURN' }, label: 'END TURN' });
  return moves;
}

// Enumerate the discrete choices for the active pending action.
function enumeratePending(state: GameState, player: Player): Move[] {
  const p = state.pendingAction!;
  const d: any = p.data ?? {};
  const rp = (choice: unknown, label: string): Move => ({ action: { type: 'RESOLVE_PENDING', choice }, label });
  const moves: Move[] = [];

  const systemsWithPower = SYSTEMS.filter(s => player.currentPower[s] > 0);
  const installedSystems = SYSTEMS.filter(s => (player.installations as any)[s]);

  switch (p.type) {
    case 'revealHazards':
      return [rp(null, 'Acknowledge revealed hazards')];

    case 'powerAllocation':
    case 'missionReward': {
      const amt = d.powerAmount ?? 1;
      for (const s of SYSTEMS) moves.push(rp(s, `Put +${amt}⚡ into ${s} (now ${player.currentPower[s]})`));
      return moves;
    }

    case 'missionRewardChoice': {
      const choices = d.mission?.rewardData?.choice ?? [];
      choices.forEach((ch: any, i: number) => moves.push(rp(i, `Reward option ${i}: ${JSON.stringify(ch)}`)));
      if (moves.length === 0) moves.push(rp(0, 'Take reward'));
      return moves;
    }

    case 'targetPlayer': {
      const ids: number[] = d.targetPlayerIds && d.targetPlayerIds.length
        ? d.targetPlayerIds
        : state.players.filter(pl => pl.id !== player.id
            && (d.source !== 'giveHazardAtLocation' || pl.location === player.location)).map(pl => pl.id);
      for (const id of ids) {
        const t = state.players.find(pl => pl.id === id)!;
        moves.push(rp(id, `Target ${t.name} (fame ${t.fame}, loc ${t.location})`));
      }
      moves.push(rp(-1, 'Cancel / no target'));
      return moves;
    }

    case 'moveOtherPlayer': {
      const ids: number[] = d.targetPlayerIds ?? state.players.filter(pl => pl.id !== player.id).map(pl => pl.id);
      for (const id of ids) {
        const t = state.players.find(pl => pl.id === id)!;
        for (const dir of [-1, 1]) moves.push(rp({ targetId: id, direction: dir }, `Move ${t.name} ${dir > 0 ? 'forward' : 'back'}`));
      }
      if (moves.length === 0) moves.push(rp({ targetId: -1, direction: 1 }, 'No valid target'));
      return moves;
    }

    case 'draw3keep1': {
      const cards: CardInstance[] = d.cards ?? [];
      cards.forEach((c, i) => moves.push(rp(i, `Keep ${c.title}`)));
      if (moves.length === 0) moves.push(rp(0, 'Keep card'));
      return moves;
    }

    case 'trashCard': {
      const trashable = [...player.hand, ...player.discard];
      for (const c of trashable) moves.push(rp(c.instanceId, `Trash ${c.title}${c.type === 'hazard' ? ' (hazard)' : ''}`));
      if (!d.mandatory) moves.push(rp(null, 'Skip (trash nothing)'));
      return moves;
    }

    case 'forceDiscard': {
      const amount = d.amount ?? 1;
      const hand = player.hand.filter(c => c.type !== 'hazard');
      if (amount === 1) {
        for (const c of hand) moves.push(rp(c.instanceId, `Discard ${c.title}`));
        if (hand.length === 0) moves.push(rp(null, 'Nothing to discard'));
      } else {
        // v1: offer lowest-N-by-title default; multi-select is rare.
        const ids = hand.slice(0, amount).map(c => c.instanceId);
        moves.push(rp(ids, `Discard ${amount}: ${hand.slice(0, amount).map(c => c.title).join(', ') || '(none)'}`));
      }
      return moves;
    }

    case 'chooseOpponentDiscard': {
      const oh: CardInstance[] = d.opponentHand ?? [];
      for (const c of oh) moves.push(rp(c.instanceId, `Make them discard ${c.title}`));
      if (oh.length === 0) moves.push(rp(null, 'Opponent hand empty'));
      return moves;
    }

    case 'choosePowerLoss': {
      for (const s of systemsWithPower) moves.push(rp(s, `Lose 1⚡ from ${s} (now ${player.currentPower[s]})`));
      if (moves.length === 0) moves.push(rp('weapons', 'No power to lose'));
      return moves;
    }

    case 'forceUninstall':
    case 'chooseOpponentInstall': {
      const targetId = d.targetPlayerId;
      const owner = p.type === 'chooseOpponentInstall'
        ? state.players.find(pl => pl.id === targetId)
        : player;
      const sysList = owner ? SYSTEMS.filter(s => (owner.installations as any)[s]) : installedSystems;
      for (const s of sysList) {
        const card = (owner!.installations as any)[s];
        moves.push(rp(s, `${p.type === 'forceUninstall' ? 'Return your' : 'Uninstall their'} ${s}: ${card?.title ?? ''}`));
      }
      if (moves.length === 0) moves.push(rp('weapons', 'No installations'));
      return moves;
    }

    case 'interactionChoice':
      return [rp('uninstall', 'Uninstall one of their cards'), rp('discard', 'Make them discard')];

    case 'mayDiscardToDraw':
      return [rp(true, 'Yes — discard 1 to draw 1'), rp(false, 'No')];

    case 'maySwapHandDiscard':
      return [rp(true, 'Yes — swap a hand card with a discard card'), rp(false, 'No')];

    case 'hazardClearPower': {
      const count = d.powerAmount ?? 2;
      const avail = systemsWithPower;
      // enumerate combinations of `count` systems
      const combos = kCombinations(avail, Math.min(count, avail.length));
      for (const combo of combos) {
        const alloc: any = { weapons: 0, computers: 0, engines: 0, logistics: 0 };
        for (const s of combo) alloc[s] = 1;
        moves.push(rp(alloc, `Spend 1⚡ each from: ${combo.join(', ')}`));
      }
      if (moves.length === 0) moves.push(rp({ weapons: 0, computers: 0, engines: 0, logistics: 0 }, 'Not enough power'));
      return moves;
    }

    case 'selectSwapDiscard': {
      const src = d.source === 'hand' ? player.hand.filter(c => c.type !== 'hazard') : player.discard;
      for (const c of src) moves.push(rp(c.instanceId, `Select ${c.title}`));
      if (src.length === 0) moves.push(rp(null, 'None available'));
      return moves;
    }

    default:
      return [rp(null, `Resolve pending (${p.type})`)];
  }
}

function kCombinations<T>(arr: T[], k: number): T[][] {
  if (k <= 0) return [[]];
  if (k > arr.length) return [];
  const [head, ...rest] = arr;
  const withHead = kCombinations(rest, k - 1).map(c => [head, ...c]);
  const withoutHead = kCombinations(rest, k);
  return [...withHead, ...withoutHead];
}

function enumerate(state: GameState, player: Player): Move[] {
  return state.pendingAction ? enumeratePending(state, player) : enumerateTopLevel(state, player);
}

// ─── POV serialization ──────────────────────────────────────────────────────────

function fmtPower(p: any): string {
  return SYSTEMS.map(s => `${SYS_ABBR[s]}:${p[s]}`).join(' ');
}

function missionLine(m: MissionInstance): string {
  const req = SYSTEMS.filter(s => (m.requirements as any)[s]).map(s => `${SYS_ABBR[s]}${(m.requirements as any)[s]}`).join('+');
  return `"${m.title}" [${m.zone}] need ${req} → +${m.fame} fame, ${m.rewardType}: ${m.reward}`;
}

function renderPOV(state: GameState, player: Player, moves: Move[]): string {
  const cfg = readConfig();
  const L: string[] = [];
  L.push('═══════════════════════════════════════════════════════════════');
  L.push(`TURN ${state.turn} · phase ${state.phase} · ${player.name}'s decision  (victory at 25 fame)`);
  L.push('═══════════════════════════════════════════════════════════════');

  // Self
  L.push(`YOU: ${player.name} [${player.captain.name}] — ${player.captain.effect}`);
  L.push(`  Fame ${player.fame} | Credits ${player.credits} | Location ${player.location} (${ZONE_MAP[player.location]}) | Power ${fmtPower(player.currentPower)} | Free moves available: ${player.movesRemaining ?? 0}`);
  const installs = SYSTEMS.filter(s => (player.installations as any)[s])
    .map(s => `${s}=${(player.installations as any)[s].title}`);
  L.push(`  Installs: ${installs.length ? installs.join(', ') : '(none)'} | Hand ${player.hand.length} | Deck ${player.deck.length} | Discard ${player.discard.length} | Hazards in cards ${player.hazardsInDeck ?? 0}`);

  // Hand
  L.push('  Hand:');
  for (const c of player.hand) {
    if (c.type === 'hazard') {
      L.push(`    · [HAZARD] ${c.title} — ${(c as any).effect} (clear: ${(c as any).clearCondition})`);
    } else {
      const ac = c as ActionCard;
      const inst = ac.installCost !== undefined ? ` {installable ${ac.installCost}: ${ac.installEffect}}` : '';
      L.push(`    · ${c.title} — ${cardEffectText(c)}${inst}`);
    }
  }

  // Board missions (revealed only)
  L.push('  Board missions:');
  for (let loc = 1; loc <= 6; loc++) {
    const tm = state.trackMissions[loc];
    const here = loc === player.location ? ' ←you' : '';
    const station = (STATION_LOCATIONS as readonly number[]).includes(loc) ? ' [station]' : '';
    if (tm?.mission && (tm.revealed || cfg.revealMissions)) {
      const tag = tm.revealed ? '' : ' (not yet visited — travel here to complete)';
      L.push(`    L${loc}${station}: ${missionLine(tm.mission)}${tag}${here}`);
    } else if (tm && !tm.revealed) {
      L.push(`    L${loc}${station}: (mission hidden — reveal by visiting)${here}`);
    } else {
      L.push(`    L${loc}${station}: (empty)${here}`);
    }
  }

  // Market at current station
  if ((STATION_LOCATIONS as readonly number[]).includes(player.location)) {
    L.push(`  Market @ station ${player.location}:`);
    const stacks = state.marketStacks[player.location as 1 | 3 | 5] ?? [];
    stacks.forEach((st: any, i: number) => {
      if (!st.revealed) { L.push(`    stack#${i}: (unrevealed)`); return; }
      const top = st.cards[0];
      const inst = top && top.installCost !== undefined ? `, install +${top.installCost}` : '';
      L.push(`    stack#${i}: ${top ? `${top.title} (buy ${top.cost}${inst}, T${top.tier}, ${top.system}) — ${top.effect}` : '(empty)'}`);
    });
    const fameSlot = (state as any).fameMarket?.[player.location];
    if (fameSlot && fameSlot.card) {
      L.push(`    FAME CARD: ${fameSlot.card.title} — ${fameSlot.card.cost}cr → +${fameSlot.card.fame} Fame [${fameSlot.remaining} left]`);
    }
  }

  // Opponents (public info only)
  L.push('  Opponents:');
  for (const o of state.players) {
    if (o.id === player.id) continue;
    L.push(`    ${o.name} [${o.captain.name}] — Fame ${o.fame} | Loc ${o.location} | Power ${fmtPower(o.currentPower)} | Hand ${o.hand.length} | Hazards ${o.hazardsInDeck ?? 0}`);
  }

  // Pending action context
  if (state.pendingAction) {
    L.push(`  ⏳ PENDING DECISION: ${state.pendingAction.type}${state.pendingAction.data?.cardTitle ? ` (${state.pendingAction.data.cardTitle})` : ''}`);
  }

  // Menu
  L.push('───────────────────────────────────────────────────────────────');
  L.push('LEGAL MOVES:');
  moves.forEach((m, i) => {
    const alloc = m.needsAlloc ? `  ⟨needs --alloc summing to ${m.needsAlloc}⟩` : '';
    L.push(`  [${i}] ${m.label}${alloc}`);
  });
  L.push('───────────────────────────────────────────────────────────────');
  L.push(`Act with:  npx tsx sim/arena.ts act <index> [--alloc w=..,c=..,e=..,l=..] [--system sys] [--note "why"]`);
  return L.join('\n');
}

// ─── Commands ───────────────────────────────────────────────────────────────────

function parseAlloc(s: string | undefined): PowerAllocation | undefined {
  if (!s) return undefined;
  const alloc: any = { weapons: 0, computers: 0, engines: 0, logistics: 0 };
  for (const part of s.split(',')) {
    const [k, v] = part.split('=');
    const sys = SYS_FROM_ABBR[k.trim().toLowerCase()] ?? (SYSTEMS.includes(k.trim() as SystemType) ? k.trim() as SystemType : undefined);
    if (sys) alloc[sys] = parseInt(v, 10) || 0;
  }
  return alloc;
}

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function cmdInit(args: string[]) {
  const capArg = args[0];
  let capIds: string[];
  if (capArg) {
    capIds = capArg.split(',').map(s => s.trim());
  } else {
    capIds = ['veteran', 'tycoon'];
  }
  const players = capIds.map((id, i) => {
    const captain = getCaptainById(id);
    if (!captain) { console.error(`Unknown captain "${id}". Options: ${CAPTAINS.map(c => c.id).join(', ')}`); process.exit(1); }
    return { name: `P${i + 1}_${captain!.name}`, captain: captain! };
  });
  const engine = new GameEngine(players);
  saveState(engine.getState());
  ensureDir();
  fs.writeFileSync(TRANSCRIPT_FILE, '');
  console.log(`Initialized game: ${players.map(p => p.name).join(' vs ')}`);
  cmdView();
}

function cmdView() {
  const engine = loadEngine();
  const state = engine.getState();
  if (state.gameOver) { printGameOver(state); return; }
  const player = state.players[state.currentPlayerIndex];
  const moves = enumerate(state, player);
  console.log(renderPOV(state, player, moves));
}

function cmdAct(args: string[]) {
  const index = parseInt(args[0], 10);
  if (Number.isNaN(index)) { console.error('Usage: act <index> [--alloc ..] [--system ..] [--note ..]'); process.exit(1); }
  const note = getFlag(args, '--note');
  const allocStr = getFlag(args, '--alloc');
  const systemOverride = getFlag(args, '--system') as SystemType | undefined;

  const engine = loadEngine();
  const state = engine.getState();
  const player = state.players[state.currentPlayerIndex];
  const actorName = player.name;
  const moves = enumerate(state, player);
  if (index < 0 || index >= moves.length) { console.error(`Index out of range (0..${moves.length - 1}).`); process.exit(1); }

  const chosen = moves[index];
  let action = chosen.action;

  // PLAY_CARD powerChoice → attach allocation
  if (chosen.needsAlloc) {
    const alloc = parseAlloc(allocStr);
    if (!alloc) { console.error(`This move needs --alloc summing to ${chosen.needsAlloc} (e.g. --alloc e=${chosen.needsAlloc}).`); process.exit(1); }
    const sum = SYSTEMS.reduce((a, s) => a + (alloc as any)[s], 0);
    if (sum !== chosen.needsAlloc) { console.error(`--alloc sums to ${sum}, must be ${chosen.needsAlloc}.`); process.exit(1); }
    action = { ...(action as any), powerAllocation: alloc };
  }
  // INSTALL / BUY_AND_INSTALL → optional system override
  if (systemOverride && (action.type === 'INSTALL_CARD' || action.type === 'BUY_AND_INSTALL')) {
    action = { ...(action as any), targetSystem: systemOverride };
  }

  const ok = engine.dispatch(action);
  if (!ok) { console.error(`Engine REJECTED action: ${JSON.stringify(action)}. (State unchanged.)`); process.exit(1); }

  const newState = engine.getState();
  saveState(newState);

  // Transcript
  ensureDir();
  const actor = newState.players.find(p => p.name === actorName);
  fs.appendFileSync(TRANSCRIPT_FILE, JSON.stringify({
    turn: state.turn, actor: actorName, label: chosen.label, action,
    note: note ?? null,
    after: actor ? { fame: actor.fame, credits: actor.credits, location: actor.location, power: actor.currentPower } : null,
  }) + '\n');

  // Show recent log + next view
  const recent = newState.log.slice(-6).map(l => `   · ${l.message}`).join('\n');
  console.log(`✓ ${actorName}: ${chosen.label}${note ? `  (note: ${note})` : ''}`);
  if (recent) console.log(recent);
  console.log('');
  cmdView();
}

function printGameOver(state: GameState) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('GAME OVER');
  const ranked = [...state.players].sort((a, b) => b.fame - a.fame);
  ranked.forEach((p, i) => console.log(`  ${i === 0 ? '🏆' : '  '} ${p.name} [${p.captain.name}] — ${p.fame} fame (${p.completedMissions?.length ?? 0} missions)`));
  console.log(`  Ended turn ${state.turn}${state.winner ? `, winner: ${state.winner.name}` : ''}`);
  console.log('═══════════════════════════════════════════════════════════════');
}

// Auto-play with a trivial policy (validation only): prefer completing missions,
// else first productive move, else end turn. Not a real AI — just exercises the loop.
function cmdAuto(args: string[]) {
  const maxDecisions = parseInt(args[0], 10) || 400;
  const engine = loadEngine();
  let decisions = 0;
  let endsInARow = 0;
  let lastSig = '';
  let sigRepeat = 0;
  while (decisions < maxDecisions) {
    const state = engine.getState();
    if (state.gameOver) break;
    const player = state.players[state.currentPlayerIndex];
    const moves = enumerate(state, player);

    // policy: complete > buy/install > play (non-alloc) > activate > move-forward > reveal > end
    const pick = (pred: (m: Move) => boolean) => moves.findIndex(pred);
    let idx = pick(m => m.action.type === 'COMPLETE_MISSION');
    if (idx < 0) idx = pick(m => (m.action.type === 'BUY_CARD' || m.action.type === 'BUY_AND_INSTALL'));
    if (idx < 0) idx = pick(m => m.action.type === 'PLAY_CARD' && !m.needsAlloc);
    if (idx < 0) idx = pick(m => m.action.type === 'PLAY_CARD'); // alloc card
    if (idx < 0) idx = pick(m => m.action.type === 'RESOLVE_PENDING');
    if (idx < 0) idx = pick(m => m.action.type === 'ACTIVATE_SYSTEM');
    if (idx < 0) idx = pick(m => m.action.type === 'REVEAL_STACK');
    if (idx < 0) idx = pick(m => m.action.type === 'MOVE' && (m.action as any).direction === 1);
    if (idx < 0) idx = pick(m => m.action.type === 'END_TURN');
    if (idx < 0) idx = 0;

    let action = moves[idx].action;
    if (moves[idx].needsAlloc) {
      const alloc: any = { weapons: 0, computers: 0, engines: 0, logistics: 0 };
      alloc.engines = moves[idx].needsAlloc; // dump into engines
      action = { ...(action as any), powerAllocation: alloc };
    }
    const sig = `${state.currentPlayerIndex}|${state.turn}|${state.pendingAction?.type ?? '-'}|${action.type}`;
    if (sig === lastSig) { sigRepeat++; } else { sigRepeat = 0; lastSig = sig; }
    if (sigRepeat > 25) {
      console.error(`LOOP: repeating ${sig} (chosen: ${moves[idx].label}). hand=${player.hand.length} power=${JSON.stringify(player.currentPower)} pendingData=${JSON.stringify(state.pendingAction?.data ?? null)}`);
      break;
    }
    endsInARow = action.type === 'END_TURN' ? endsInARow + 1 : 0;
    const turnBefore = state.turn;
    const ok = engine.dispatch(action);
    decisions++;
    if (!ok) {
      console.error(`STUCK: engine rejected ${JSON.stringify(action)} at turn ${state.turn}, phase ${state.phase}, pending ${state.pendingAction?.type ?? 'none'}`);
      break;
    }
    const after = engine.getState();
    if (action.type === 'END_TURN' && after.turn === turnBefore && !after.pendingAction && after.players[after.currentPlayerIndex].id === player.id) {
      console.error(`STUCK: END_TURN did not advance (turn ${after.turn}, phase ${after.phase})`);
      break;
    }
    if (endsInARow > state.players.length * 3 && after.turn > 60) break; // stall guard
  }
  saveState(engine.getState());
  const s = engine.getState();
  console.log(`Auto-played ${decisions} decisions. turn=${s.turn} gameOver=${s.gameOver}`);
  console.log(`Fame: ${s.players.map(p => `${p.name}=${p.fame}`).join(', ')}`);
  if (s.gameOver) printGameOver(s);
}

// Resolve any pending sub-decisions automatically, guided by an optional hint
// (e.g. reward preference "credits"/"power"/a system name). Defaults are sensible.
function resolvePendings(engine: GameEngine, hint?: string) {
  let guard = 0;
  while (engine.getState().pendingAction && guard++ < 30) {
    const state = engine.getState();
    const player = state.players[state.currentPlayerIndex];
    const p = state.pendingAction!;
    const choices = enumeratePending(state, player);
    let pick = choices[0];

    if (p.type === 'missionRewardChoice') {
      const wantCredits = hint === 'credits';
      const found = choices.find(c => /Credits|credit/.test(c.label) === wantCredits);
      if (found && hint) pick = found;
    } else if (p.type === 'missionReward' || p.type === 'powerAllocation') {
      if (hint) {
        const sys = SYS_FROM_ABBR[hint[0]?.toLowerCase()] ?? (SYSTEMS.includes(hint as SystemType) ? hint as SystemType : undefined);
        const found = sys ? choices.find(c => c.label.includes(sys)) : undefined;
        if (found) pick = found;
      } else {
        // default: feed the lowest current-power system to spread out
        const lowest = [...SYSTEMS].sort((a, b) => player.currentPower[a] - player.currentPower[b])[0];
        pick = choices.find(c => c.label.includes(lowest)) ?? pick;
      }
    }
    const ok = engine.dispatch(pick.action);
    if (!ok) { console.error(`  (pending ${p.type}: could not resolve, picking null)`); engine.dispatch({ type: 'RESOLVE_PENDING', choice: null }); }
  }
}

// Best-effort explanation for why the engine rejected a step, so brains don't waste turns.
function rejectReason(state: GameState, player: Player, action: GameAction): string {
  const stacks = state.marketStacks[player.location as 1 | 3 | 5] as any;
  switch (action.type) {
    case 'BUY_CARD': {
      const c = stacks?.[action.stackIndex]?.cards?.[0];
      if (!c) return 'no revealed card in that stack';
      const cost = Math.max(0, c.cost - player.buyDiscount);
      return player.credits < cost ? `need ${cost} credits, have ${player.credits}` : `not buyable here`;
    }
    case 'BUY_AND_INSTALL': {
      const c = stacks?.[action.stackIndex]?.cards?.[0];
      if (!c) return 'no revealed card in that stack';
      const total = Math.max(0, c.cost - player.buyDiscount) + Math.max(0, (c.installCost ?? 0) - player.installDiscount);
      return player.credits < total ? `need ${total} credits (buy ${c.cost} + install ${c.installCost}), have ${player.credits}` : 'not installable/buyable here';
    }
    case 'INSTALL_CARD': {
      const c = player.hand.find(h => h.instanceId === action.cardInstanceId) as any;
      const cost = Math.max(0, (c?.installCost ?? 0) - player.installDiscount);
      return player.credits < cost ? `need ${cost} install credits, have ${player.credits}` : 'cannot install (hazard? not installable?)';
    }
    case 'COMPLETE_MISSION': {
      const m = state.trackMissions[player.location]?.mission;
      if (!m) return 'no mission at your location';
      const short = SYSTEMS.filter(s => player.currentPower[s] < ((m.requirements as any)[s] ?? 0))
        .map(s => `${s} ${player.currentPower[s]}/${(m.requirements as any)[s]}`);
      return short.length ? `short on ${short.join(', ')}` : 'blocked (hazard: corrupted-nav / warrant?)';
    }
    case 'MOVE':
      return player.currentPower.engines < 1 && player.movesRemaining < 1 ? 'no engine power or free move' : 'blocked (edge of board / thruster jam)';
    default:
      return 'not legal in current state';
  }
}

function findHandCard(player: Player, title: string, wantHazard = false): CardInstance | undefined {
  const t = title.toLowerCase();
  return player.hand.find(c => (wantHazard ? c.type === 'hazard' : c.type !== 'hazard')
    && (c.title.toLowerCase() === t || c.title.toLowerCase().includes(t)));
}

function findMarketStack(state: GameState, player: Player, title: string): number {
  const t = title.toLowerCase();
  const stacks = state.marketStacks[player.location as 1 | 3 | 5] ?? [];
  return stacks.findIndex((s: any) => s.revealed && s.cards[0] && s.cards[0].title.toLowerCase().includes(t));
}

// Execute a turn as a sequence of intent steps. Grammar (one per arg):
//   play:Title[:w=1,c=1]   install:Title:system   buy:Title   buyinstall:Title:system
//   complete[:credits|power|system]   move:fwd|back   activate:system[:abilityIndex]
//   reveal:stackIndex   clear:HazardTitle   end
function cmdDo(steps: string[]) {
  const engine = loadEngine();
  for (const step of steps) {
    const state = engine.getState();
    const player = state.players[state.currentPlayerIndex];
    const [verb, ...rest] = step.split(':');
    let action: GameAction | null = null;
    let hint: string | undefined;

    switch (verb) {
      case 'play': {
        const card = findHandCard(player, rest[0]);
        if (!card) { console.error(`  play: no hand card matching "${rest[0]}"`); continue; }
        action = { type: 'PLAY_CARD', cardInstanceId: card.instanceId };
        if (powerChoiceOf(card)) {
          const alloc = parseAlloc(rest[1]);
          if (!alloc) { console.error(`  play ${card.title}: needs alloc (e.g. play:${card.title}:c=${powerChoiceOf(card)})`); continue; }
          (action as any).powerAllocation = alloc;
        }
        break;
      }
      case 'install': {
        const card = findHandCard(player, rest[0]);
        if (!card) { console.error(`  install: no hand card "${rest[0]}"`); continue; }
        const sys = (rest[1] as SystemType) || ((card as any).system ?? 'weapons');
        action = { type: 'INSTALL_CARD', cardInstanceId: card.instanceId, targetSystem: sys };
        break;
      }
      case 'buy': {
        const si = findMarketStack(state, player, rest[0]);
        if (si < 0) { console.error(`  buy: no revealed market card "${rest[0]}" here`); continue; }
        action = { type: 'BUY_CARD', stackIndex: si, cardIndex: 0 };
        break;
      }
      case 'buyinstall': {
        const si = findMarketStack(state, player, rest[0]);
        if (si < 0) { console.error(`  buyinstall: no revealed market card "${rest[0]}" here`); continue; }
        const stacks = state.marketStacks[player.location as 1 | 3 | 5] as any;
        const sys = (rest[1] as SystemType) || (stacks[si].cards[0].system ?? 'weapons');
        action = { type: 'BUY_AND_INSTALL', stackIndex: si, cardIndex: 0, targetSystem: sys };
        break;
      }
      case 'complete': action = { type: 'COMPLETE_MISSION' }; hint = rest[0]; break;
      case 'move': action = { type: 'MOVE', direction: /(-|back|b)/i.test(rest[0] ?? 'fwd') ? -1 : 1 }; break;
      case 'activate': action = { type: 'ACTIVATE_SYSTEM', system: rest[0] as SystemType, abilityIndex: parseInt(rest[1] ?? '0', 10) }; break;
      case 'buyfame': action = { type: 'BUY_FAME_CARD' }; break;
      case 'reveal': action = { type: 'REVEAL_STACK', station: player.location as 1 | 3 | 5, stackIndex: parseInt(rest[0], 10) }; break;
      case 'clear': { const h = findHandCard(player, rest[0], true); if (h) action = { type: 'CLEAR_HAZARD', hazardInstanceId: h.instanceId }; break; }
      case 'end': action = { type: 'END_TURN' }; break;
      default: console.error(`  unknown step: ${step}`); continue;
    }
    if (!action) continue;
    const ok = engine.dispatch(action);
    if (!ok) { console.error(`  ✗ step rejected: ${step}  (${rejectReason(state, player, action)})`); continue; }
    resolvePendings(engine, hint);
    const a = engine.getState().players.find(pp => pp.id === player.id)!;
    console.log(`  ✓ ${step}  → fame ${a.fame} cr ${a.credits} loc ${a.location} pow ${fmtPower(a.currentPower)}`);
    fs.appendFileSync(TRANSCRIPT_FILE, JSON.stringify({ turn: state.turn, actor: player.name, step, after: { fame: a.fame, credits: a.credits, location: a.location, power: a.currentPower } }) + '\n');
  }
  saveState(engine.getState());
  console.log('');
  cmdView();
}

// ─── Entry ───────────────────────────────────────────────────────────────────

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'init': cmdInit(rest); break;
  case 'view': cmdView(); break;
  case 'act': cmdAct(rest); break;
  case 'auto': cmdAuto(rest); break;
  case 'do': cmdDo(rest); break;
  case 'state': console.log(STATE_FILE); break;
  default:
    console.log('Commands: init [caps] | view | act <index> [--alloc][--system][--note] | auto [N] | state');
}
