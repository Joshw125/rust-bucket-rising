# Rust Bucket Rising - Brainstorm: New Mechanics & Ideas

**From design exploration session — February 2026**

These are outside-the-box ideas for mechanics that could make the game more fun, more replayable, and more unique. None of these are "fixes" — they're new features to consider. Roughly ordered by implementation effort (easiest first).

---

## 1. Secret Objectives

**Effort: Very Low** (end-game scoring check, no engine changes needed)

Each player is dealt a secret objective card at game start. At end-game scoring, reveal and award bonus fame if completed.

### Example Objectives
- "Complete 3 Combat missions" → +3 Fame
- "Have 4 installations at end of game" → +3 Fame
- "Visit all 6 locations in a single game" → +4 Fame
- "End the game with 0 hazards in your deck" → +2 Fame
- "Complete a Deep Space mission before any opponent" → +3 Fame
- "Complete missions at 4+ different locations" → +3 Fame
- "Earn 10+ credits in a single turn" → +2 Fame
- "Have 3+ trophies at end of game" → +3 Fame

### Why This Is Great
- Near-zero mechanical complexity — it's just a card you reveal at end-game
- Makes every game feel different — players diverge because they're chasing different goals
- Adds bluffing and misdirection — "why is that player rushing Deep Space?"
- Natural catch-up mechanic — a player behind on fame might be ahead on their secret objective
- Creates replayability without changing the core game at all

### Implementation
- Create a pool of ~15-20 objective cards
- Deal 2 to each player at start, they keep 1 (gives choice)
- At end-game, after hazard penalty, reveal and score
- Add to `Player` type: `secretObjective: ObjectiveCard | null`
- Add end-game check in `endGame()` method

---

## 2. Location Effects — Make the Map Feel Alive

**Effort: Low-Medium** (turn-start checks based on location, plus UI indicators)

Each of the 6 locations has a persistent environmental effect that triggers when you're there. Suddenly the track isn't just "where am I relative to a mission" — it's strategic terrain.

### Suggested Location Effects

| Location | Name | Effect | Design Rationale |
|----------|------|--------|-----------------|
| 1 | **Scrapyard** | Cards here cost -1 to buy | Thematic (junkyard), makes early shopping easier |
| 2 | **Patrol Zone** | Turn start: draw 1 extra card (6-card hand) | Rewards staying in safe space, helps card cycling |
| 3 | **Trade Hub** | May sell 1 card from hand for 2 credits | Mid-game economy option, deck thinning |
| 4 | **Nebula** | Hazards can't target you here (weapons abilities too) | Safe harbor, strategic positioning |
| 5 | **Arsenal** | Weapons abilities cost -1⚡ here | Rewards aggressive players who travel far |
| 6 | **The Frontier** | Missions here give +1 Fame bonus | Makes Deep Space worth the trip |

### Why This Is Great
- Makes movement decisions about *where to be*, not just *how far to go*
- Navigator captain becomes the "exploit location effects" captain
- Creates emergent strategy — "I need to sell a card, let me stop at the Trade Hub"
- Makes the physical map a core strategic element rather than just distance
- Each game, players spread out across the map instead of clustering at location 1

### Alternative: Rotating Location Effects
Instead of fixed effects, draw location effect cards at game start (or each round) and place them on the track. Different effects each game = more replayability.

### Implementation
- Add `locationEffects` to GameState or constants
- Check location in `startTurn()` for turn-start effects
- Check location in relevant action methods (buy, activate, etc.)
- Add visual indicators on the SpaceTrack component

---

## 3. Round Events — Shared Galaxy-Wide Effects

**Effort: Medium** (new event deck, round tracking, temporary modifiers)

After every player has taken a turn (end of round), flip an event card from a small event deck. The event lasts for the entire next round, affecting all players.

### Example Events
- **"Solar Storm"**: All systems start at -1⚡ next round
- **"Trade Winds"**: Cards cost -1 to buy this round
- **"Bounty Posted"**: First player to complete a mission this round gets +1 Fame
- **"Distress Signal"**: A bonus mission appears at a random location (disappears at round end if not completed)
- **"Smuggler's Market"**: You may buy from any station regardless of location
- **"Nebula Drift"**: All players drift 1 space toward location 6 at round start
- **"Pirate Raid"**: All players at locations 1-2 receive a hazard
- **"Surplus Shipment"**: All system abilities can be used twice this round
- **"Communications Blackout"**: Can't give hazards this round
- **"Gold Rush"**: Missions reward +1 credit this round

### Why This Is Great
- Creates narrative arc — the galaxy feels dynamic, not static
- Forces adaptation — your plan from last round might not work this round
- Makes other players' turns interesting — everyone watches the event flip
- Naturally creates varied pacing — some rounds are aggressive, some defensive
- Can be used to push players toward Deep Space mid/late game (events that benefit being further out)

### Implementation
- Create `EventCard` type with effect description and modifier data
- Add `currentEvent: EventCard | null` to GameState
- Flip at end of each round (when `currentPlayerIndex` wraps to 0)
- Apply modifiers temporarily in relevant engine methods
- Display current event prominently in game UI

---

## 4. Spatial Card Deployment — Leave Things on the Map

**Effort: Medium-High** (new action type, board state tracking, multi-player interactions)

Some cards can be *deployed to a location* instead of played normally. They persist on the map and affect anyone at that location.

### Example Deployable Cards
- **"Relay Beacon"** (Computers): Deploy to your location. Any player starting their turn here draws +1 card. You gain +1 credit when they do.
- **"Mining Probe"** (Logistics): Deploy to your location. Any player here gains +1 credit at turn start. You gain +1⚡ Logistics.
- **"Defense Turret"** (Weapons): Deploy to your location. Opponents starting their turn here receive a hazard.
- **"Trade Post"** (Logistics): Deploy to your location. Any player here can buy from any station.

### Why This Is Great
- Players shape the board — the map evolves during the game
- Creates cooperation and competition — your beacon helps you AND opponents
- Adds area control without complex combat mechanics
- Creates "traps" and "boons" that make the map feel alive
- Gives weapons-heavy players a non-hazard way to project power

### Considerations
- Keep it to 3-4 deployable cards in the Tier 2/3 pool — don't overload
- Each location can have max 1 deployment (replace old one if new one placed)
- Deployments could be destroyed by opponents (spend 2⚡ Weapons?)
- Deployments belong to the player who placed them (track ownership)

### Implementation
- Add `deployments: Record<number, DeployedCard | null>` to GameState
- New action type: `DEPLOY_CARD`
- Check deployments in `startTurn()` and relevant action methods
- Visual indicators on SpaceTrack for deployed cards

---

## 5. Shared Scrapyard — Trash Becomes a Market

**Effort: Medium** (new shared pile, location-gated access)

When cards are trashed, they don't vanish — they go to a shared "Scrapyard" pile accessible at location 1. Anyone at location 1 can buy from the Scrapyard at a discount (half price, rounded down).

### Why This Is Great
- Trashing becomes strategic — you're potentially feeding opponents
- Creates a player-driven market that's different every game
- Gives location 1 a late-game reason to visit (currently only useful early for T1 station)
- Deck-thinning has a social cost — "do I trash this card knowing my opponent wants it?"
- Thematic — it's a scrapyard, of course there's salvage

### Variant: Scrapyard at All Stations
Instead of just location 1, each station gets its own scrapyard. Trashed cards go to the scrapyard at the station nearest to where you trashed them.

### Implementation
- Add `scrapyard: CardInstance[]` to GameState
- Modify `trashCard()` to push to scrapyard instead of removing
- Add buy-from-scrapyard logic (half price, must be at location 1)
- UI: Show scrapyard contents when at location 1

---

## 6. Crew Members — Stackable Micro-Upgrades

**Effort: Medium-High** (new card type, crew management UI, persistent effects)

Throughout the game, players can recruit crew members — small persistent bonuses that stack. You can hold up to 3 crew at a time and must choose who to keep when you exceed the limit.

### Example Crew Members
- **Mechanic**: +1⚡ Engines at turn start
- **Quartermaster**: +1 credit at turn start
- **Navigator's Mate**: +1 free move every other turn
- **Medic**: Hazards cost -1 to clear
- **Gunner**: Weapons abilities give +1 hazard
- **Scholar**: Draw 6 cards instead of 5
- **Smuggler**: Can buy from adjacent stations (1 location away)
- **Scout**: See face-down missions 1 location ahead

### How to Acquire Crew
- Specific missions reward crew (especially Deep Space — incentivize traveling there)
- Could appear at stations as purchasable (separate from cards)
- Could be randomly placed at locations to be "picked up"

### Why This Is Great
- Gradual ship customization beyond just card installations
- "Which 3 crew do I keep?" is a meaningful ongoing decision
- Natural catch-up: make crew more available at Deep Space locations
- Creates ship identity — "my ship has a Mechanic, Gunner, and Scholar"
- Crew members could have flavor text and portraits for personality

### Implementation
- Add `CrewMember` type
- Add `crew: CrewMember[]` to Player (max 3)
- Apply crew effects in relevant engine methods
- UI for crew management (view, dismiss when over limit)

---

## 7. Escalation Track — The Galaxy Gets Dangerous

**Effort: Medium** (round tracking, threshold effects, UI indicator)

A global escalation track advances as the game progresses. At certain thresholds, the game state changes, creating narrative arc and naturally pushing players toward bigger plays.

### Suggested Escalation Triggers

Advance the track by 1 each time ANY player completes a mission.

| Threshold | Event | Effect |
|-----------|-------|--------|
| 3 missions completed | **"Pirate Activity"** | Hazards in hand now drain 1⚡ from a random system at turn start |
| 6 missions completed | **"Supply Shortage"** | Market card costs increase by 1 |
| 9 missions completed | **"Frontier Boom"** | Deep Space missions are worth +2 Fame |
| 12 missions completed | **"Full Alert"** | All hazard clear costs increase by 1 |
| 15 missions completed | **"Final Push"** | All missions give +1 Fame (speeds up endgame) |

### Why This Is Great
- Creates narrative: early game is scrappy, mid game gets tense, late game is a race
- Naturally solves Near Space spam — at threshold 9, Deep Space becomes clearly better
- Creates urgency — "the galaxy is escalating, I need to finish soon"
- Shared experience — all players feel the escalation together
- Prevents games from dragging — late escalation speeds up the endgame

### Alternative: Time-Based
Instead of mission-count triggers, advance every round. Simpler to track, more predictable pacing.

### Implementation
- Add `escalationLevel: number` to GameState
- Increment in `completeMission()` (or in round transition)
- Check thresholds in relevant engine methods
- Display escalation track in UI (progress bar or markers)

---

## 8. Combination Ideas — Mixing Multiple Mechanics

### "The Living Galaxy" Package
Combine **Location Effects** + **Round Events** + **Escalation Track**. Each game, the map has different terrain, events shake things up round-to-round, and the escalation ensures the game builds to a climax. Maximum variety, moderate implementation effort since each piece is independent.

### "The Social Galaxy" Package
Combine **Spatial Deployments** + **Shared Scrapyard** + **Crew Members**. Players shape the board, trade through the scrapyard, and build unique crews. Maximum player interaction, higher implementation effort.

### "The Strategic Galaxy" Package
Combine **Secret Objectives** + **Location Effects** + **Escalation Track**. Each player has a hidden goal, the map matters strategically, and the game builds tension. Maximum strategic depth with the least mechanical overhead.

### Recommended Starting Point
**Secret Objectives + Location Effects**. These two together:
- Are the easiest to implement (lowest code changes)
- Have the highest impact on replayability and strategic depth
- Don't require any core engine rewrites
- Can be layered on top of the existing game cleanly
- Naturally address the "Near Space is too good" problem (Frontier bonus at location 6)

---

## Ideas Considered and Rejected (With Reasons)

### Free Move Per Turn for Everyone
- **Rejected**: Engine power is the core constraint. Free movement undermines engines as a system. Movement should cost something.

### Card Play Limit (3 per turn)
- **Rejected by designer**: The fun is in playing all your cards and optimizing your full hand. A limit adds hand management but reduces the "engine building" satisfaction of a growing deck.

### Trading Between Players
- **Tabled**: Adds social interaction but creates balance issues (kingmaking, collusion). Could revisit if crew/scrapyard doesn't solve the interaction gap.

### Real-Time Elements
- **Rejected**: Doesn't fit the turn-based strategy feel. Would require massive engine rewrite.
