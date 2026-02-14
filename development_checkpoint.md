# Rust Bucket Rising - Development Checkpoint

**Last Updated:** February 2026 — Balance analysis & design review session

---

## Project Overview

**Rust Bucket Rising** is a competitive spacefaring deck-builder board game for 2-4 players, being developed as a digital Steam-quality app. Players captain salvaged starships, travel the galaxy, upgrade their ships, and complete missions to gain Fame.

### Tech Stack
- **React 18** + **TypeScript** (strict mode)
- **Vite 5** (build tool, hot reload)
- **Zustand 4.4** (state management with Immer middleware)
- **Tailwind CSS 3.3** (styling with custom game color theme)
- **Vitest 1** (testing)
- **Framer Motion 10** (animations, imported but minimally used)
- Run with: `npm run dev`

---

## Current State (What's Working)

### Core Gameplay Loop
- [x] 3-Phase turn structure: Initial → Action → Cleanup
- [x] Deckbuilding mechanics: draw 5, play cards, discard all, shuffle when empty
- [x] 4 Ship Systems: Weapons (red), Computers (blue), Engines (orange), Logistics (green)
- [x] System abilities (once per turn each, with visual strikethrough when used)
- [x] Card playing and power generation (fixed power + flexible powerChoice)
- [x] Card installation to systems (from hand or buy+install from market)
- [x] Movement across 6 locations (spending Engine power)
- [x] Mission completion with power requirements
- [x] Market stations at locations 1, 3, 5 (Tier 1, 2, 3 cards)
- [x] Credits system (resets to 0 each turn — no carry over)
- [x] Fame tracking with victory at 20 Fame
- [x] End-game hazard penalty (-1 Fame per 3 hazards in deck)
- [x] Turn restart (undo) if no info revealed yet

### Content — 100% Defined
- [x] 3 starter card types (10 cards per player: 6x Supply Check, 3x Cheap Battery, 1x Basic Engines)
- [x] 5 Tier 1 cards (4 copies each = 20 cards at Station 1)
- [x] 20 Tier 2 cards (1 copy each, shuffled into stacks at Station 3)
- [x] 10 Tier 3 cards (1 copy each, shuffled into stacks at Station 5)
- [x] 11 hazard card types (21 total cards in hazard deck)
- [x] 30 missions (10 Near Space, 10 Mid Space, 10 Deep Space)
- [x] 9 captains with unique abilities
- [x] **98 PNG card artworks** in `public/cards/` (~162MB)

### AI System
- [x] 5 AI strategies: balanced, aggressive, economic, explorer, rush
- [x] Scoring-based decision making for all action types
- [x] AI handles: play cards, buy cards, buy+install, move, complete missions, system abilities
- [x] AI handles pending actions: hazard targets, draw-3-keep-1, trash selection, power allocation
- [x] AI speed settings for UI responsiveness
- [x] SimulationRunner for batch game analysis (balance testing)

### Multiplayer
- [x] OnlineLobby component for matchmaking
- [x] useMultiplayer hook for action synchronization
- [x] Server skeleton in `/server` directory
- [ ] Server-side validation, reconnection, conflict resolution (not complete)

### UI Components (14 total)
- [x] GameBoard, GameSetup, HandDisplay, Card, PlayerBoard, PlayerTableau
- [x] SpaceTrack, MarketDisplay, PyramidMarket, PlayerStatsBar, OpponentBar
- [x] SimulationMode, OnlineLobby
- [x] App (menu routing)

---

## Known Issues — Prioritized

See `suggestedFixes.md` for full details with code references and suggested solutions.

### Critical: Non-Functional Mechanics
1. **~50% of Tier 2/3 card effects are broken** — conditional triggers, multi-target hazards, play-from-discard, extra turns, move-other, and more are defined in card data but have no implementation in the engine. Players pay full price for cards with effects that silently do nothing.
2. **3 hazards do nothing** — Warrant Issued (missions cost +2 credits), Overloaded Circuits (max +2⚡ from cards), and Thruster Jam (can't move >1 space) have placeholder code that doesn't enforce their effects.
3. **Reaction cards never trigger** — Countermeasures' block-hazard ability is dead code. The reaction system has types defined but zero engine implementation.
4. **Trophy passive effects never fire** — the `trophies[]` array is populated but never read during gameplay. All trophy-type mission rewards are decorative.
5. **`oneTimeUse` not tracked** — Temporal Jump and Detonator Relay can be played every turn.

### High Priority: Balance
6. **`playerHasActiveHazard()` checks entire deck** — hazards restrict you even when buried in your deck face-down. Should only check hand.
7. **Engineer captain is ~4x stronger than peers** — +4 total starting power vs. Veteran's +1 or Ghost's -4.
8. **Broker captain ability is a no-op** — "activate system twice" is commented as "handled by UI" but never implemented.
9. **No tiebreaker** — if two players have same fame, Player 1 always wins.
10. **Near Space snowball** — 3-power missions completable with starting power alone, rewards cascade into more missions, 3 missions possible on turn 1.

### Medium Priority: Design Gaps
11. **Replaced missions always revealed** — removes exploration element for mid/deep space
12. **Synced Loop does literally nothing** — "play extra card" is meaningless when card plays are unlimited
13. **Refit Contract generates nothing** — only gives install discount, no credits/power/cards
14. **Several card effects need UI that doesn't exist** — powerToTwo, reallocate, moveOther all need new prompt types

---

## File Structure

```
rust-bucket-rising/
├── src/
│   ├── types/index.ts             # All TypeScript types (525 lines)
│   ├── engine/
│   │   ├── GameEngine.ts          # Core game logic (~1,956 lines)
│   │   ├── AIEngine.ts            # AI decision-making (~858 lines)
│   │   ├── SimulationRunner.ts    # Batch game analysis
│   │   └── GameEngine.test.ts     # Vitest tests (utilities only)
│   ├── hooks/
│   │   ├── useGameStore.ts        # Zustand store with Immer
│   │   └── useMultiplayer.ts      # Multiplayer sync
│   ├── data/
│   │   ├── constants.ts           # Game settings, system configs, UI layout
│   │   ├── cards.ts               # All card definitions (starters, T1-T3, hazards)
│   │   ├── captains.ts            # 9 captain definitions
│   │   └── missions.ts            # 30 mission definitions across 3 zones
│   ├── components/                # 14 React components
│   │   ├── GameBoard.tsx          # Main game screen (53KB)
│   │   ├── Card.tsx               # Card rendering with PNG support (25KB)
│   │   ├── PlayerBoard.tsx        # Player tableau, systems, card play (28KB)
│   │   ├── PyramidMarket.tsx      # Market browser (24KB)
│   │   ├── PlayerStatsBar.tsx     # Player info bar (18KB)
│   │   ├── OnlineLobby.tsx        # Multiplayer lobby (19KB)
│   │   ├── SimulationMode.tsx     # Balance testing UI (15KB)
│   │   └── [7 more components]
│   ├── App.tsx                    # Application routing (9KB)
│   ├── main.tsx                   # React entry point
│   └── index.css                  # Tailwind + custom styles
├── public/cards/                  # 98 PNG card artworks (~162MB)
│   ├── starter/, tier1/, tier2/, tier3/
│   ├── hazards/, missions/, captain/
│   ├── station/, player/, background/, back/
├── server/                        # Multiplayer backend (skeleton)
├── suggestedFixes.md              # Detailed fix list with priorities
├── brainstorm.md                  # New mechanic ideas (secret objectives, location effects, etc.)
├── package.json                   # 17 dependencies
├── vite.config.ts, tsconfig.json, tailwind.config.js
└── index.html
```

---

## Card Naming Convention

Card IDs in code use `kebab-case`, PNG filenames use `Title_Case`:

| Code ID | PNG Filename |
|---------|--------------|
| `refuel-station` | `Refuel_Station.png` |
| `weapons-core` | `Weapons_Core.png` |
| `scrambled-controls` | `Scrambled_Controls.png` |

The `idToFilename()` function in `Card.tsx` handles conversion.

---

## Game Rules Reference

### Turn Structure
1. **Initial Phase**: Reveal hazards in hand, apply installation effects, apply captain turn-start abilities, Navigator gets free move
2. **Action Phase**: Play cards, activate systems, move, complete missions, buy cards, install cards, clear hazards (any order, no limit on number of actions)
3. **Cleanup Phase**: Discard all played + hand cards, draw 5 new cards, check victory

### System Abilities (once per turn each)
- **Weapons**: 1⚡ give hazard at location, 3⚡ give hazard anywhere
- **Computers**: 1⚡ draw 1 card, 3⚡ draw 3 keep 1
- **Engines**: 1⚡ move 1 space
- **Logistics**: 1⚡ gain 1 credit, 3⚡ trash a card

### Key Constants
- `STARTING_POWER = 1` (per system, modified by captain)
- `MAX_POWER = 6` (per system)
- `HAND_SIZE = 5`
- `VICTORY_THRESHOLD = 20` Fame
- Starting deck: 10 cards (6x Supply Check, 3x Cheap Battery, 1x Basic Engines)
- All players start at location 1 with 0 credits

### Installation Flow
1. Buy a card from market → goes to discard pile
2. Eventually draw it into hand
3. Install from hand by paying the install cost (in credits)
4. Installed card goes to a system slot (1 per system, old one returns to deck)
5. Installation bonuses apply immediately AND at each subsequent turn start

---

## Design Documents

- **`suggestedFixes.md`** — Comprehensive list of bugs, broken cards, balance issues, and missing implementations. Organized by priority with specific code line references and suggested solutions.
- **`brainstorm.md`** — New mechanic ideas explored during design review: secret objectives, location effects, round events, spatial deployments, shared scrapyard, crew members, escalation track. Includes rejected ideas with reasoning.

---

## AI System Notes

The AI uses a greedy scoring approach — it generates all possible actions, scores each one, and picks the highest. It does NOT:
- Plan ahead (no lookahead or Monte Carlo simulation)
- Consider deck composition
- Model opponent strategies
- Evaluate card effects deeply (uses `tier * 3` as card value)

See `brainstorm.md` discussion on training approaches: evolutionary weight optimization, MCTS, or RL self-play.

---

## How to Resume Development

1. Run `npm run dev` to start the dev server
2. Read `suggestedFixes.md` for prioritized fix list
3. Read `brainstorm.md` for new feature ideas
4. Key decision points before implementing:
   - **Near Space balance**: Choose an approach (mission cap, requirement increase, or reward changes)
   - **Countermeasures**: Implement reaction system or replace with Salvage Run
   - **Synced Loop**: Redesign or add card play limit to make it meaningful
   - **Captain rebalance**: Nerf Engineer, fix Broker, buff Ghost
5. Test coverage is minimal — only utility functions tested. Consider adding engine tests before major refactors.

---

## Architecture Notes

- **Engine handles all game logic** — no React dependencies, pure TypeScript
- **Store syncs engine state to React** — Zustand with Immer for immutable updates
- **Components are purely presentational** — receive state, dispatch actions
- **Path aliases configured**: `@/` maps to `src/` (tsconfig + vite)
- **Large components** (GameBoard 53KB, PlayerBoard 28KB, Card 25KB, PyramidMarket 24KB) could benefit from decomposition
