# Rust Bucket Rising - Digital Playtest Edition

A competitive spacefaring deck-builder board game for 2-4 players with real-time online multiplayer.

## Play Now

| | URL |
|--|-----|
| **Game** | https://rust-bucket-rising-client.onrender.com |
| **Server** | wss://rust-bucket-rising.onrender.com |

> Free tier: server sleeps after ~15min idle, first reconnect takes ~30-50s to wake.

## Local Development

```bash
# Client (React + Vite)
npm install
npm run dev          # http://localhost:5173

# Server (WebSocket)
cd server
npm install
npm run dev          # ws://localhost:3001

# Tests
npx vitest run       # 70 tests

# Production build
npm run build        # outputs to dist/
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript 5.3, Vite 5, Tailwind CSS, Zustand (Immer) |
| Backend | Node.js, WebSocket (ws), UUID |
| Testing | Vitest |
| Hosting | Render (free tier) — Web Service (server) + Static Site (client) |

## Project Structure

```
rust-bucket-rising/
├── src/
│   ├── types/index.ts              # All game types
│   ├── engine/
│   │   ├── GameEngine.ts           # Core game logic (~2100 lines)
│   │   ├── GameEngine.test.ts      # 70 tests
│   │   ├── AIEngine.ts             # AI decision-making
│   │   └── SimulationRunner.ts     # Batch balance testing
│   ├── hooks/
│   │   ├── useGameStore.ts         # Zustand store with Immer
│   │   └── useMultiplayer.ts       # WebSocket multiplayer sync
│   ├── data/
│   │   ├── constants.ts            # Game settings, system configs
│   │   ├── cards.ts                # All card definitions
│   │   ├── captains.ts             # 9 captain definitions
│   │   └── missions.ts             # 30 missions across 3 zones
│   ├── components/                 # 14+ React components
│   │   ├── GameBoard.tsx           # Main game screen + modals
│   │   ├── OnlineLobby.tsx         # Multiplayer lobby
│   │   └── ...
│   └── App.tsx                     # Menu routing
├── server/
│   ├── src/index.ts                # WebSocket server + HTTP health check
│   ├── render.yaml                 # Render deployment blueprint
│   └── package.json
├── public/cards/                   # 98 PNG card artworks
├── .env.production                 # Production WebSocket URL
└── development_checkpoint.md       # Detailed dev state for AI assistants
```

## Game Overview

- **2-4 players** captain salvaged starships across 6 locations
- **Deck-building**: buy cards from tiered markets (Stations 1/3/5)
- **4 ship systems**: Weapons, Computers, Engines, Logistics (max 6 power each)
- **Missions**: complete for Fame, first to 25 triggers endgame
- **Hazards**: attack opponents to slow them down
- **9 unique captains** with distinct abilities

## Deployment

Both services deploy from the `main` branch of https://github.com/Joshw125/rust-bucket-rising

**Server** (Render Web Service):
- Root directory: `server/`
- Build: `npm install && npm run build`
- Start: `node dist/index.js`
- Env: `PORT=10000`, `NODE_ENV=production`

**Client** (Render Static Site):
- Build: `npm install && npm run build`
- Publish: `dist/`
- Env: `VITE_WS_URL=wss://rust-bucket-rising.onrender.com`

Push to `main` and manually deploy from Render dashboard.

---

Built with Claude Code
