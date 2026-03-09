# Rust Bucket Rising — Project Guide

## What This Is
Competitive spacefaring deck-builder board game themed as a deadly game show (2-4 players) with online multiplayer.
React 18 / TypeScript / Vite / Tailwind / Zustand / WebSocket server.

- **Live**: https://rust-bucket-rising-client.onrender.com
- **Server**: wss://rust-bucket-rising.onrender.com

## Google Sheets Integration

The game data lives in two places that must stay in sync:

| Source | What | Format |
|--------|------|--------|
| **Google Sheets** | Card stats, costs, copies, text | Dextrous notation (`{RBR/credit.png}`, `{weapons: Weapons}`, `⚡`) |
| **App code** (`src/data/`) | Same data + game logic (effectData, ability, etc.) | Clean display text + TypeScript objects |

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

## Key Data Files
- `src/data/cards.ts` — 34 action cards (5 T1 + 20 T2 + 9 T3) + 10 hazard types
- `src/data/captains.ts` — 9 captains with ability objects
- `src/data/missions.ts` — 30 missions across 3 zones (near/mid/deep)
- `src/data/constants.ts` — Game settings
- `src/types/index.ts` — All type definitions

## Game Mechanics Quick Reference
- 4 systems: Weapons, Computers, Engines, Logistics (max 6 power each)
- 3-phase turns: Initial → Action (unlimited plays) → Cleanup (discard/draw 5)
- 6 fixed locations, markets at stations 1/3/5, missions at all locations
- 25 Fame to trigger final round
- Hazard copies: 3 for common (first 5), 1 for rare (last 5)

## Workflow
Sheets (source of truth for stats) → Dextrous (card design/JPGs) → Print / TTS / App

## Testing
```bash
npx vitest run    # 70 tests in GameEngine.test.ts
```

## Deployment
Push to main → manually deploy from Render dashboard.
- Client: Static site built to `dist/`
- Server: Node.js at `server/dist/index.js`, port 10000
