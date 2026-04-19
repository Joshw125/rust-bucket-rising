# Rust Bucket Rising — Project Guide

## What This Is
Competitive spacefaring deck-builder board game themed as a deadly game show (2-4 players) with online multiplayer.
React 18 / TypeScript / Vite / Tailwind / Zustand / WebSocket server.

- **Live**: https://rust-bucket-rising-client.onrender.com
- **Server**: wss://rust-bucket-rising.onrender.com
- **Repo**: https://github.com/Joshw125/rust-bucket-rising

## Architecture (as of April 2026)

**Server-authoritative multiplayer.** The `GameEngine` runs on the server, not on each client. Clients send action intents; the server validates, dispatches, and broadcasts the resulting state. This eliminated the old class of desync bugs (missing mission reveals, wrong-location hazard targets, ghost completions).

```
/shared/          ← game logic consumed by BOTH client and server
  /engine/        ← GameEngine, AIEngine, SimulationRunner, tests
  /data/          ← cards, captains, missions, constants
  /types/         ← shared types, WS message protocol
/src/             ← React client (rendering + input only for online games)
/server/src/      ← Node WebSocket server + authoritative engine
```

**Key implication for development:** `shared/` is imported by both sides. Edits to `shared/engine/GameEngine.ts` affect both local AI games (client-side) and online games (server-side) — they're the same code.

### Server version health check
`GET https://rust-bucket-rising.onrender.com/health` → returns `version: 4, architecture: 'server-authoritative'`. If you see `version: 2 or 3`, the server hasn't been redeployed since the Phase 2 migration.

## Google Sheets Integration

The game data lives in two places that must stay in sync:

| Source | What | Format |
|--------|------|--------|
| **Google Sheets** | Card stats, costs, copies, text | Dextrous notation (`{RBR/credit.png}`, `{weapons: Weapons}`, `⚡`) |
| **App code** (`shared/data/`) | Same data + game logic (effectData, ability, etc.) | Clean display text + TypeScript objects |

**Spreadsheet**: `1wkwNEjC75ph0bmO6p5omltYcFbUC7eoBeFFVmZblqiA`
**Service account creds**: `sync/credentials.json` (gitignored)

### Source of Truth Rules
- **Sheet owns**: card costs, installCost, copies, system, mission power requirements, fame, rewardType
- **App owns**: effectData, installData, ability, clearCost, rewardData, captain abilities, display text
- **Parallel** (intentionally different): effect descriptions use Dextrous markup in sheets and clean text in app — do NOT sync these literally
- **Captains**: app is the source of truth

### Sync Tooling (`sync/`)
```bash
npx tsx sync/fetch-sheets.ts              # Pull all 12 sheets → sync/cache/*.json
npx tsx sync/diff-sheets.ts               # Compare sheet data vs app data
npx tsx sync/push-to-sheets.ts report     # Compare captains (app vs sheet)
npx tsx sync/push-to-sheets.ts captain X  # Push one captain to sheet
npx tsx sync/push-to-sheets.ts cell "tab" A2 val  # Write single cell
```

### Dextrous Icon Notation (for writing to sheets)
- `{RBR/credit.png}` — credit icon
- `{RBR/move.png}` — movement icon
- `{RBR/card.png}` — draw card icon
- `{RBR/hazard.png}` — hazard icon
- `{RBR/trashcan.png}` — trash icon
- `{weapons: Weapons}` — system-colored text (also: engines, computers, logistics)
- `⚡` — power/lightning bolt
- `bolt.png` / `gear.png` / `trophy.png` — reward type icons

## Key Data Files (now under shared/)
- `shared/data/cards.ts` — 34 action cards (5 T1 + 20 T2 + 9 T3) + 10 hazard types
- `shared/data/captains.ts` — 9 captains with ability objects (Ghost excluded from selection)
- `shared/data/missions.ts` — 30 missions across 3 zones (near/mid/deep)
- `shared/data/constants.ts` — Game settings
- `shared/types/index.ts` — All type definitions
- `shared/types/multiplayer.ts` — WebSocket message protocol (used by both client and server)

## Game Mechanics Quick Reference
- 4 systems: Weapons, Computers, Engines, Logistics (max 6 power each)
- **Power resets at the start of each turn** (to starting values = base 1 + captain bonus + installation bonuses). Credits reset too — a card giving `credits` only matters if spent that same turn.
- **Installations persist.** An installed card activates its `installData` effects at every turn start. Stacking installs is the scaling engine of the game.
- 3-phase turns: Initial (installations fire, hand drawn) → Action (unlimited plays) → Cleanup (discard hand, draw 5)
- 6 fixed locations, markets at stations 1/3/5, missions at all locations
- **Missions at locations 2-6 start hidden.** Only L1 is revealed at game start. Missions reveal when any player visits or when replaced after completion.
- 25 Fame to trigger final round. All remaining players take one more turn, then end-game hazard penalty applies: **-1 Fame per hazard still in deck** (1:1, not 1:3; docs briefly claimed the latter — they lied).
- Hazard copies: 3 for common (first 5), 1 for rare (last 5)

## Features (as of April 2026)

### Multiplayer (server-authoritative)
- Server owns the engine. Room-state is one true source.
- Action rejection surfaces to the offending client as a toast.
- Rejoin on disconnect via name match; server serves stored state.

### Analytics Dashboard
Accessible from main menu. Reads `games.jsonl` event log on server and displays:
- Captain leaderboard (plays/wins/winrate/avg fame/avg missions), color-coded by winrate
- Summary: total games / avg duration / avg turns / avg winning fame / abandoned games
- Player-count distribution (2p / 3p / 4p histogram)
- Recent games list (winner, participants, duration, relative time)

Endpoint: `GET /stats` returns the full aggregated payload as JSON.

### Simulation Lab (in Simulation Mode)
- **Per-decision action log**: every AI dispatch recorded with turn, player, action, post-state (fame/credits/power/location)
- **Fixed matchup mode**: pin specific captain + strategy to each seat for focused testing
- **Per-game replay viewer**: click any game to scrub action logs, turn by turn
- **JSON export**: download full aggregates + action logs for offline analysis
- **Analysis layer** (auto-generated after each run):
  - Anomaly banner (flags captain/strategy winrate outliers, pacing issues, blowout rates)
  - Turn-length histogram
  - Captain matchup matrix (pairwise winrates)
  - Fame trajectory chart (avg fame/turn by strategy)
  - Card impact table (winrate delta: bought vs not)

### ErrorBoundary + Toast
- Uncaught component render errors show a recoverable error screen instead of a blank page (`src/components/ErrorBoundary.tsx`)
- Global toast (`src/components/Toast.tsx`) surfaces server ERROR messages on any screen, not just the lobby

## AI Engine Caveats

The AI is a **greedy scorer** (no lookahead). It's good enough to play legal games without infinite loops and produces directionally useful simulation data, but:

- It **camps Location 1** in basic balanced matchups because completing near-space missions always scores higher than moving to unknown locations. This was confirmed empirically via action-log diagnostics.
- It **under-installs** — installs rarely beat buys in the scorer when credits are tight.
- Captain spread is wide (Scrapper ~52% / Tycoon ~2% in 4p random) — AI can't compensate for non-power-bonus captains.

**Conclusion from playtest:** for serious balance work you need a reasoning model (Claude-as-player) to stress test, not the algorithmic AI. The current AI is fine for "does the engine run end-to-end" and "does each card's effect fire" but not for "is Captain X strong against Captain Y."

**Recent AI fixes (won't regress):**
- Infinite dispatch loops on hazard-blocked actions (AI scored high, engine rejected, AI looped)
- Hazard awareness in scorers (Thruster Jam, Corrupted Nav Chip, Failsafe Lockdown, Rogue AI Fragment, Corrosive Spores, Warrant Issued)
- Deficit-aware power scoring (card giving `computers: 1` scores higher when that's exactly the gap)

## Testing
```bash
npx vitest run    # 99 tests in GameEngine.test.ts (was 70 pre-migration)
```

## Deployment
Push to main → manually deploy both services from Render dashboard.
- **Client**: static site, `rust-bucket-rising-client`
- **Server**: Node.js web service, `rust-bucket-rising`
  - ⚠️ **Start Command** is `node dist/server/src/index.js` (NOT `dist/index.js` — that was pre-Phase-1 layout). If deploy fails with "cannot find module /dist/index.js", the Start Command in Render dashboard needs updating.
- After deploy, verify `/health` returns `version: 4`.

## Known design/implementation mismatches (to fix)

Identified during April 2026 playtest:

- **Mag-Leash** install text says "+1 move" but `installData` grants `+1 power` on hazard given. Either rewrite text or change data.
- **Targeting Array** install effect (`conditionalMissionDiscount`) is declared but `applyInstallationEffects` doesn't read it. Effect is dead code.
- **Mission reward `credits: 1` double-dips** on gear rewards — fires once at completion via `applyMissionRewards` AND again every turn start via `applyInstallationEffects`. Orbital Delivery's "+1 credit/turn gear" therefore also gives +1 credit on completion. Unclear if intentional.
- **`cardIndex` in BUY_CARD / BUY_AND_INSTALL is unenforced** — rulebook says only the top card of a revealed stack is buyable, but the engine accepts any index.

## Workflow
Sheets (source of truth for stats) → Dextrous (card design/JPGs) → Print / TTS / App
