# Rust Bucket Rising - Development Checkpoint

**Last Updated:** February 13, 2026 — All card effects fixed, balanced, deployed to Render

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
- End-game hazard penalty (-1 Fame per 3 hazards)
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

### Multiplayer (working)
- WebSocket server with room-based matchmaking (4-char join codes)
- HTTP health check endpoint at /health
- Client connects via VITE_WS_URL env variable
- OnlineLobby component for creating/joining rooms

### UI Components (14+)
- GameBoard (main screen + Draw3Keep1Modal + MoveOtherPlayerModal)
- GameSetup, HandDisplay, Card, PlayerBoard, PlayerTableau
- SpaceTrack, MarketDisplay, PyramidMarket, PlayerStatsBar, OpponentBar
- SimulationMode, OnlineLobby, App (menu routing)

### AI System
- 5 strategies: balanced, aggressive, economic, explorer, rush
- Scoring-based decision making for all action types
- Handles pending actions: hazard targets, draw-3-keep-1, trash selection, power allocation

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
- `PendingAction.type: 'moveOtherPlayer'` — move another player's ship

### Server Architecture
- `server/src/index.ts`: HTTP server wrapping WebSocketServer
- Health check: GET /health returns JSON status
- Room-based: clients send JOIN_ROOM/CREATE_ROOM, server manages game state sync
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
- **Reconnection**: no reconnect handling if WebSocket drops mid-game.

### Future Enhancements
- Server-side game state validation
- Reconnection support for dropped WebSocket connections
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
1. **Initial Phase**: Reveal hazards, apply installations, captain start abilities
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
