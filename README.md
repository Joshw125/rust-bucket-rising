# Rust Bucket Rising - Digital Playtest Edition

A competitive spacefaring deck-builder board game, now in digital form!

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
rust-bucket-rising/
├── src/
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts     # All game types
│   ├── data/            # Game data (cards, missions, etc.)
│   │   ├── constants.ts # Game constants & config
│   │   ├── captains.ts  # Captain definitions
│   │   ├── cards.ts     # All card data
│   │   ├── missions.ts  # Mission definitions
│   │   └── index.ts     # Re-exports
│   ├── engine/          # Game logic
│   │   └── GameEngine.ts # Core game engine (WIP)
│   ├── components/      # React components (to build)
│   ├── hooks/           # Custom React hooks (to build)
│   ├── assets/          # Images (copy your PNGs here!)
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Styles
├── public/              # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## 🎮 Game Rules Summary

### Systems (4 total, max 6 power each)
- **Weapons (Red)**: 1⚡ hazard at location, 3⚡ hazard anywhere
- **Computers (Teal)**: 1⚡ draw 1, 3⚡ draw 3 keep 1
- **Engines (Orange)**: 1⚡ move 1 space
- **Logistics (Yellow)**: 1⚡ +1 credit, 3⚡ trash card

### Space Track
- 6 locations in a row
- Stations at locations 1, 3, 5 (markets)
- Missions start face-down (except location 1)

### Victory
- First to **25 Fame** triggers end game
- Complete missions to gain Fame
- Finish the round, highest Fame wins

## 🛠️ Development with Claude Code

This project is set up to be developed with Claude Code. Key areas to build:

1. **Complete GameEngine** (`src/engine/GameEngine.ts`)
   - Player turn logic
   - Card effect resolution
   - Mission completion
   - Hazard handling

2. **UI Components** (`src/components/`)
   - Card.tsx - Card display
   - PlayerBoard.tsx - Player area
   - SpaceTrack.tsx - Game board
   - MarketBrowser.tsx - Card shop
   - PowerAllocationModal.tsx - Power choices

3. **AI Player** (`src/engine/AIPlayer.ts`)
   - Decision making
   - Strategy implementations

4. **Simulation Engine** (`src/engine/Simulator.ts`)
   - Batch game running
   - Balance analysis

## 🎨 Adding Card Art

Copy your card PNG files to `src/assets/cards/` and update the card data to reference them:

```typescript
// In cards.ts
{
  id: 'weapons-core',
  title: 'Weapons Core',
  image: 'Weapons_Core.png', // Add this
  // ...
}
```

## 📦 Dependencies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Framer Motion** - Animations
- **Lucide React** - Icons

## 🎯 What's Already Done

✅ Complete TypeScript type system
✅ All 9 captains with abilities
✅ All starting cards (10 per player)
✅ All Tier 1 cards (Station 1)
✅ All Tier 2 cards (Station 3)
✅ All Tier 3 cards (Station 5)
✅ All hazard cards
✅ All missions (Near/Mid/Deep)
✅ System configuration with abilities
✅ Game constants and balance values
✅ Tailwind theme with game colors
✅ Project structure

## 📝 License

This is a playtest version for personal use.

---

Built with ❤️ for tabletop gaming
