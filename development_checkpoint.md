# Rust Bucket Rising - Development Checkpoint

**Last Updated:** April 18, 2026 — Server-authoritative migration, Simulation Lab, Analytics Dashboard, AI fixes, playtest feedback

## April 2026 Session Summary (most recent work)

This session (starting from bug reports about multiplayer desync) landed a large
refactor + several new features. Architecture now substantially different from
the February checkpoint below:

### Phase 1 — Extract engine to `shared/`
Moved `src/engine/`, `src/data/`, `src/types/` to `shared/engine/`, `shared/data/`,
`shared/types/` so both client and server can import the same game logic.
Updated client tsconfig/vite alias (`@shared/*`), server tsconfig rootDir,
Render start command. Server's duplicate `multiplayer.ts` types deleted —
`shared/types/multiplayer.ts` is now the single source of truth.

### Phase 2 — Server-authoritative engine
The big flip. Server now instantiates a `GameEngine` per room on `START_GAME`,
validates + dispatches every `GAME_ACTION`, broadcasts full state. Client for
online games is now a pure view — its local engine is a "mirror" that accepts
server state updates, never dispatches actions itself. All the old desync
mechanisms (host snapshots, grace periods, action replay, state hash) are
gone. Mission reveals, hazard target validation, and mission completion now
happen on a single authoritative state that all clients see identically.

### Phase 3 — Cleanup (-172 lines)
Removed dead code: `computeStateHash`, `applyRemoteAction`, `onActionDispatched`,
`lastLocalDispatchTime`, `loadSnapshot`, `sendStateSnapshot`, `RESYNC_REQUESTED`
server→client message, `Room.stateHash`, host-fallback paths in
`handleRequestResync`, `getClientByPlayerId`. Zero behavior change.

### Phase 4 — UX polish
- **ErrorBoundary** (`src/components/ErrorBoundary.tsx`) — recoverable error
  screen instead of blank page on uncaught render errors.
- **Toast** (`src/components/Toast.tsx`) — global top-right notification for
  server ERRORs, auto-dismisses at 5s.
- **Optimistic "Syncing…" indicator** — the online-game badge pulses amber
  while waiting for server response after an action.

### Analytics Dashboard (new)
Main menu button opens a dashboard at `/analytics`. Fetches aggregated stats
from server's `/stats` endpoint (expanded to compute captain winrates,
game duration, turn count, player-count distribution, recent games).

### Simulation Lab
Massive expansion of the existing Simulation Mode:
- Per-decision action log (every AI dispatch recorded with turn, player,
  action, post-action state)
- Fixed matchup mode (pin captain + strategy per seat)
- Per-game replay viewer with filter + drill-down
- JSON export
- Auto-analysis view: anomaly banner, turn-length histogram, captain matchup
  matrix, fame trajectory chart, card impact table

### AI bug fixes
- **Infinite dispatch loops** — when AI scored an action the engine rejected
  (e.g. MOVE when Thruster Jam is in hand), the simulator kept re-proposing
  the same action. Fixed: SimulationRunner now treats two consecutive
  rejections as "force end turn."
- **Hazard awareness in AI scorers** — AI no longer proposes COMPLETE_MISSION
  under Corrupted Nav Chip, MOVE under Thruster Jam, PLAY under Failsafe
  Lockdown, or INSTALL under Rogue AI Fragment / Corrosive Spores.
- **Deficit-aware power scoring** — AI boosts score for cards whose power
  matches the specific system deficit for an in-range mission (new
  `getActiveDeficit`, `powerMatchBonus` helpers).

### Silent no-ops fixed during audit
Parallel agent audit of all cards/missions turned up 11 effect fields that
were declared in data but never read by the engine:
- Card plays (3): Remote Uplink `conditionalPower.cardsPlayed7plus`, Gravity
  Sling `conditionalDraw.moved2plus`, Targeting Array
  `conditionalMissionDiscount.weaponsPower3plus`
- Mission rewards (8): all `conditional*` fields on rewardData (Signal Boost,
  System Check, Encrypted Relay, Smuggler Rendezvous, Relic Excavation,
  Hazard Dump Zone, Quantum Proxy Hack, Fleet Arbitration)
- `oneTimeUse` was tracked but never checked in `canPlayCard` — cards could
  be replayed if re-drawn. Now truly once-per-game.

### Playtest feedback captured (April 2026)
One 7-turn game played by Claude-as-player (Scrapper) vs 3 AIs. Won 23 fame.
Key observations recorded in conversation — summary:

**Design issues to address:**
- Mag-Leash install text ≠ data ("+1 move" in text, +1 power in data)
- Targeting Array install effect declared but `applyInstallationEffects`
  doesn't handle `conditionalMissionDiscount` field → dead code
- Orbital Delivery `credits: 1` double-counts (mission completion AND every
  turn start from gear)
- Supply Check overrepresented in starter deck (4 of 10) — credits reset
  so excess is waste
- Captain balance wide: high-starting-power captains (Scrapper, Engineer)
  dominate vs economy/utility captains (Tycoon, Navigator)
- Engine Boosters (T1 install +1 move/turn) potentially too strong for
  its cost
- Gear stacking: 3 credit-generating gears simultaneously is probably too
  much
- Rulebook says "only top card of stack buyable" but code allows any
  `cardIndex`

**Playtest tool gaps:**
- Market display only shows played effect, not install effect (IMAGE-based
  cards DO show both — it's a tooling gap for devs inspecting data, not
  a player-facing issue)
- No preview of opponents' installations
- No deck composition view
- No turn-by-turn "what did opponent do last turn" log

---

## Project Overview

**Rust Bucket Rising** is a competitive spacefaring deck-builder board game for 2-4 players with real-time online multiplayer. Players captain salvaged starships, travel 6 locations, upgrade their ships via tiered card markets, and complete missions to gain Fame.

### Live URLs
- **Game Client**: https://rust-bucket-rising-client.onrender.com
- **WebSocket Server**: wss://rust-bucket-rising.onrender.com
- **GitHub**: https://github.com/Joshw125/rust-bucket-rising

### Tech Stack
- **Frontend**: React 18 + TypeScript 5.3 + Vite 5 + Tailwind CSS + Zustand 4.4 (Immer)
- **Backend**: Node.js + WebSocket (ws library) + UUID
- **Testing**: Vitest (70 tests passing)
- **Hosting**: Render free tier (Web Service for server, Static Site for client)

---

## Current State — Everything Working

### Core Gameplay (complete)
- 3-phase turn: Initial → Action → Cleanup
- Deckbuilding: draw 5, play cards, discard all, shuffle when empty
- 4 ship systems: Weapons, Computers, Engines, Logistics (max 6 power each)
- System abilities (once per turn each)
- Card playing, power generation (fixed + flexible powerChoice)
- Card installation to systems (from hand or buy+install)
- Movement across 6 locations (Engine power)
- Mission completion with power requirements
- Market stations at locations 1, 3, 5 (Tier 1, 2, 3)
- Credits system (resets each turn)
- Fame tracking, victory at 25 Fame
- End-game hazard penalty (-1 Fame per hazard in deck)
- Tiebreaker: Fame → Missions completed → Fewest hazards → Credits

### All Card Effects (fixed Feb 2026)
- **oneTimeUse**: cards are trashed from game on play (removed from played pile)
- **mustTrash**: sets mandatory pending action with deferred effects
- **powerPerInstallation**: counts occupied install slots, bonus power to highest system
- **fameIfHazards**: counts hazards via `countPlayerHazards()`, awards fame if threshold met
- **extraTurn**: sets `extraTurnQueued` flag, cleanup skips advancing player index
- **playFromDiscard**: pops top of discard, recursively applies its effects
- **hazardAllAtLocation**: filters players at same location, gives hazard to each
- **hazardAll + powerPerHazard**: gives hazards to all opponents, bonus power per hazard given
- **giveHazard (single target)**: pending action with bonusIfHadHazard and moveOther chaining
- **moveOther**: moveOtherPlayer pending action with directional movement UI

### All Hazard Effects (fixed Feb 2026)
- **Warrant Issued**: missions cost +2 credits (checked in canCompleteMission/completeMission)
- **Overloaded Circuits**: caps power from cards at 2 per turn (tracked via powerGainedFromCardsThisTurn)
- **Thruster Jam**: max 1 move per turn (tracked via movesThisTurn)

### Captain Abilities (fixed Feb 2026)
- **Broker**: doubleActivate bypass — can use one system ability twice (checked in canActivateSystem)
- **Ghost**: draw hazard gives +1 Card AND +1 Credit (buffed from just +1 Card)
- **Reaction cards**: framework for blocking hazards (checks target hand for reaction cards)
- **Trophy passives**: `checkTrophyPassives()` helper fires on onGiveHazard, onGainCredits, atStation, ifAlone

### Balance Changes (Feb 2026)
- **Engineer nerfed**: start bonus reduced from +1 all four systems to +1 computers, +1 logistics only
- **Ghost buffed**: hazard draw reward changed from +1 Card to +1 Card AND +1 Credit
- **Near Space missions**: all 14 bumped from 3 total power to 4 total power requirement
- **Tiebreaker**: Fame → Missions → Fewest hazards → Credits (was: just Fame, player 1 wins ties)

### Multiplayer (working — overhauled Feb 25, 2026)
- WebSocket server with room-based matchmaking (4-char join codes)
- Supports multiple simultaneous games (each room is fully isolated)
- HTTP health check endpoint at /health
- Client connects via VITE_WS_URL env variable
- OnlineLobby component for creating/joining rooms
- **Host-authoritative sync**: host sends full state snapshot after every action (not just END_TURN)
- **Modal gating**: `GameBoardContext` + `useShouldShowPendingAction()` hook ensures all 9 modal types only display for the intended player in online mode
- **Reconnection**: automatic resync via host snapshot on reconnect

### Hazard System (updated Feb 25, 2026)
- **40 hazard cards** total (4 copies x 10 types, increased from ~20)
- Hazards can be trashed via Logistics ability (removed `c.type !== 'hazard'` filter from trash modal)
- `powerFromDifferent` clearing now prompts player with system picker modal (`hazardClearPower` pending action) instead of auto-selecting

### Installation System (updated Feb 25, 2026)
- **Installation powerChoice**: prompts player to allocate power instead of auto-assigning
- Turn-start installs: queued via `_pendingInstallPowerChoices`, resolved sequentially before captain abilities/hazards via `continueInitialPhase()`
- Mid-turn installs: sets `powerAllocation` pending action immediately
- New `PowerAllocationPendingModal` in GameBoard.tsx handles both cases

### Undo System (updated Feb 25, 2026)
- `hasRevealedInfo = true` now set before draw1 (Computers ability), blocking undo after seeing drawn card

### UI Components (16+)
- GameBoard (main screen + 9 modals: HazardReveal, TrashCard, MissionReward, MissionRewardChoice, TargetPlayer, Draw3Keep1, MoveOtherPlayer, PowerAllocationPending, HazardClearPower)
- CaptainViewerModal (click any captain portrait/name to view ability)
- GameSetup, HandDisplay, Card, PlayerBoard, PlayerTableau
- SpaceTrack (zone labels as zero-width flex children for even spacing)
- MarketDisplay, PyramidMarket, PlayerStatsBar, OpponentBar (clickable captain images)
- GameLogPanel (always-visible floating panel in bottom-right, minimizable)
- Turn timer banner (appears after 60s, shows elapsed time)
- SimulationMode, OnlineLobby, App (menu routing)

### AI System
- 5 strategies: balanced, aggressive, economic, explorer, rush
- Scoring-based decision making for all action types
- Handles pending actions: hazard targets, draw-3-keep-1, trash selection, power allocation, hazard clear power choice

---

## Key Architecture Details

### Game Engine Pattern
```
GameEngine.ts: dispatch(state, action) → mutated state
  - Actions: PLAY_CARD, BUY_CARD, MOVE, COMPLETE_MISSION, ACTIVATE_SYSTEM, etc.
  - Pending actions: engine sets state.pendingAction, UI renders modal, user resolves
  - Card effects: applyCardEffects() processes CardEffectData fields sequentially
```

### Important Types (src/types/index.ts)
- `Player.movesThisTurn` — tracks moves for Thruster Jam
- `Player.powerGainedFromCardsThisTurn` — tracks power for Overloaded Circuits
- `GameState.extraTurnQueued` — Temporal Jump extra turn flag
- `PendingAction.data.mandatory` — must-trash cannot be dismissed
- `PendingAction.data.deferredEffects` — effects applied after mandatory trash
- `PendingAction.data.bonusIfHadHazard` — bonus for giving hazard to hazard-holding player
- `PendingAction.data.moveOther` — chain move after giving hazard
- `PendingAction.data.fromInstallPhase` — power allocation is from turn-start installation effects
- `PendingAction.type: 'moveOtherPlayer'` — move another player's ship
- `PendingAction.type: 'hazardClearPower'` — choose systems to spend power from for hazard clearing
- `PendingAction.type: 'powerAllocation'` — allocate power to systems (from installs, deferred effects)

### Server Architecture
- `server/src/index.ts`: HTTP server wrapping WebSocketServer
- Health check: GET /health returns JSON status
- Room-based: clients send JOIN_ROOM/CREATE_ROOM, server manages game state sync
- Multiple simultaneous games supported (rooms stored in `Map<string, Room>`, fully isolated)
- All broadcasts scoped to room via `client.roomId`
- Render config: `server/render.yaml` (blueprint) + env vars PORT=10000, NODE_ENV=production

### Environment
- `.env.production`: `VITE_WS_URL=wss://rust-bucket-rising.onrender.com`
- Client reads: `import.meta.env.VITE_WS_URL || 'ws://localhost:3001'`

---

## Known Remaining Issues

### Minor
- **"should apply buy discount" test**: intermittently flaky in watch mode (passes in `npx vitest run`). Pre-existing issue, not caused by recent changes. The test expects credits=9 after buying a discounted card but sometimes gets 10.
- **Synced Loop card**: "play extra card" is meaningless since card plays are unlimited. Could be redesigned.
- **Replaced missions**: always revealed when swapped in, reduces exploration element for mid/deep space.
- **Server-side validation**: server trusts client state, no server-side game logic validation.

### Future Enhancements
- Server-side game state validation
- More sophisticated AI (MCTS or RL self-play)
- Sound effects and animations
- Custom game settings (victory threshold, starting location, etc.)
- Spectator mode
- Game history/replay

---

## How to Resume Development

1. `npm install && npm run dev` — start client dev server
2. `cd server && npm install && npm run dev` — start local WebSocket server
3. `npx vitest run` — verify all 70 tests pass
4. Read this file for current state
5. Check `suggestedFixes.md` for original issue list (most now fixed)
6. Check `brainstorm.md` for future feature ideas

### Deploying Changes
1. Make changes locally, test with `npx vitest run`
2. `git add <files> && git commit -m "description"`
3. `git push origin main`
4. Go to Render dashboard → Manual Deploy → Deploy latest commit
   - Server: https://dashboard.render.com (rust-bucket-rising web service)
   - Client: https://dashboard.render.com (rust-bucket-rising-client static site)

---

## Game Rules Quick Reference

### Turn Structure
1. **Initial Phase**: Apply installations (player allocates powerChoice if any) → captain start abilities → reveal hazards
2. **Action Phase**: Play cards, activate systems, move, missions, buy, install (any order/count)
3. **Cleanup Phase**: Discard all, draw 5, check victory (25 Fame triggers final round)

### System Abilities (once per turn each)
| System | 1 Power | 3 Power |
|--------|---------|---------|
| Weapons | Hazard at location | Hazard anywhere |
| Computers | Draw 1 card | Draw 3 keep 1 |
| Engines | Move 1 space | — |
| Logistics | +1 credit | Trash a card |

### Key Constants
- `STARTING_POWER = 1` per system (modified by captain)
- `MAX_POWER = 6` per system
- `HAND_SIZE = 5`
- `VICTORY_THRESHOLD = 25` Fame (was 20, consider if this changed)
- Starting deck: 10 cards (6x Supply Check, 3x Cheap Battery, 1x Basic Engines)
- All players start at location 1 with 0 credits
