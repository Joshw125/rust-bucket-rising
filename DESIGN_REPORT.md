# Rust Bucket Rising: Design Report v2

**Revised analysis incorporating playtester feedback and new design directions**

---

## Corrections From v1

Before diving in, a few important corrections from the first report:

1. **Power IS spent on missions.** The original report implied missions only check a threshold. That was wrong — completing a mission consumes the required power, which directly competes with using power for system abilities. The core tension already exists in the design. The real question is whether mission reward bonuses (Bolt/Gear/Trophy) are so strong that they make system ability usage feel like a waste of power by comparison.

2. **Ship boards already exist.** Four beautiful ship boards (Ship1-4.png) with fame tracks, system slots with printed abilities, and captain portrait areas are already designed. They were removed from the digital game due to screen space constraints, not because they don't exist. The challenge is reintegrating them.

3. **Hazards are supposed to suck.** The v1 suggestion of "draw a card as compensation when you receive a hazard" undermines the entire design intent. Hazards are punishments — that's the point. There are already trash mechanics to deal with them. The design space for hazards is about making the *giving* of hazards more interesting, not softening the *receiving*.

---

## Executive Summary

Rust Bucket Rising has a stronger foundation than the v1 report gave it credit for. The power-as-shared-resource tension between system abilities and mission completion is a genuinely good core mechanic. The areas that need the most attention are:

1. The spatial map is underutilized — a new map topology could transform the game's identity
2. Cards lack synergy hooks — system-restricted installation and cross-card combos would add real depth
3. Weapons are one-dimensional — they only give hazards when they could do so much more
4. Game-to-game variety is low — galactic events and secret objectives would fix this
5. The ship boards deserve to be in the game — they're too good to hide

The recommendations below are ordered by design excitement and impact.

---

## 1. THE BIG IDEA: A Concentric Ring Map

### Why Rethink the Map?

The current 6-location linear track works mechanically, but it doesn't feel like exploring a galaxy. It's a number line. Players move left and right along it, and once you learn the layout, movement decisions are rote — go to the nearest valuable mission, come back to a station, repeat.

A concentric ring map would fundamentally change the spatial feel of the game and create a much more dynamic, exploratory experience.

### The Concept: Rings of Space

Imagine the map as 3 concentric rings around a central hub:

```
                        _______________
                       /   DEEP SPACE  \
                      /   ___________   \
                     /   / MID SPACE \   \
                    /   /   _______   \   \
                   |   |   / NEAR  \   |   |
                   |   |   | SPACE |   |   |
                   |   |   | (Hub) |   |   |
                   |   |   \_______/   |   |
                    \   \___________/   /
                     \                 /
                      \_______________/
```

**Ring Structure:**
- **Hub (Center):** The station/market. Always accessible. This is home base — where you buy cards, install systems, and regroup. No missions spawn here.
- **Near Ring (Ring 1):** 6 nodes arranged in a circle around the hub. Low-risk, low-reward missions (2-3 fame). 1 move from hub, 1 move between adjacent nodes.
- **Mid Ring (Ring 2):** 8 nodes in a wider circle. Medium missions (3-5 fame). 1 move from a Near node outward, 1 move between adjacent nodes.
- **Deep Ring (Ring 3):** 6 nodes in the outermost circle. High-risk, high-reward missions (5-7 fame). 1 move from a Mid node outward, 1 move between adjacent nodes.

**Movement Rules:**
- Moving between adjacent nodes on the same ring costs 1 move
- Moving inward or outward one ring costs 1 move
- You can only move outward from a node that connects to the outer ring (not every node connects — the rings have "spokes")
- Returning to the Hub from Near Ring costs 1 move

**Why Concentric Rings Work:**

The fundamental tension becomes **depth vs. safety**. Pushing outward gets you to higher-value missions, but you're further from the station (can't buy/install), further from the hub, and potentially cut off if another player blocks a spoke. Coming back inward is safe but costs you precious movement that could be spent reaching the next mission.

This also makes Engines matter far more. In the linear track, you only need to move 1-5 spaces. In the ring map, reaching a specific Deep Ring mission might require 3+ moves through specific nodes, making movement planning a real puzzle.

### Missions Pop Up Dynamically

Instead of pre-placed missions at fixed locations, missions appear randomly on the map:

**Spawn Mechanic:**
- At the start of each round, roll to spawn 1-2 new missions on empty nodes. Use a weighted system: Near Ring missions are more common early, Deep Ring missions appear more as the game progresses.
- Missions have a visible timer (2-3 rounds). If nobody completes a mission before its timer expires, it disappears and is replaced on the next spawn.
- When a mission spawns, all players can see it — the race to reach it begins immediately.

**Why Dynamic Spawning Works:**
- Creates urgency — you can't leisurely plan your route, because missions come and go
- Rewards map awareness — seeing a Deep Ring mission spawn near your current position is exciting
- Prevents the "I'll just camp at the best location" strategy — there is no permanently best location
- Every game has a different spatial puzzle based on where missions appear
- Timer pressure creates natural pacing without artificial mechanics

### Station Placement Options

With a ring map, the station/market situation has a few options:

**Option A: Central Hub is the only station.** All buying and installing happens at the center. This maximizes the tension between exploring and building — every trip outward for missions means time away from the market. Simple, clean, high tension.

**Option B: Tier-based ring stations.** The hub sells Tier 1. A node on the Near Ring is a Tier 2 outpost. A node on the Mid Ring is a Tier 3 outpost. This spreads the market across the map and gives reasons to visit specific nodes beyond missions.

**Option C: Roaming merchant.** The station is a single token that moves around the map each round (maybe clockwise one ring at a time). You can only buy when you're at the merchant's current location. This is the most dynamic but also the most chaotic.

**Recommendation: Option A** for the base game. It's the cleanest design and creates the strongest push-pull between building and scoring. If it feels too restrictive in testing, upgrade to Option B.

### What This Means for Existing Mechanics

- **Captains:** Navigator's free move becomes even more valuable. Engines-focused captains get a real identity.
- **Engine cards/power:** The entire Engines system becomes critical rather than a convenience. Reaching Deep Ring from the Hub takes 3 moves minimum — that's 3 Engine power or significant card investment.
- **Weapons range:** "Give hazard to player at your location" becomes more meaningful when locations are scattered across a 2D ring map. Players spread out more, making the 1-power local hazard harder to use and the 3-power anywhere hazard more valuable.
- **Fame track:** Already on the ship boards (1-10). The 25-fame victory threshold works the same regardless of map shape.

---

## 2. CARD SYNERGY CHAINS & SYSTEM-RESTRICTED INSTALLATION

### The Current State

Cards can currently be installed to any system slot. Most cards provide power to a specific system, but installation is flexible. This means there's rarely a hard choice about where to install — you just put whatever is strongest in the open slot.

### The Fix: Cards Can Only Install to Their Matching System

Bring back the restriction that was in an earlier version of the game: a Weapons card can only be installed to the Weapons slot, a Computer card to Computers, etc. This single rule change has cascading benefits:

**Installation Scarcity Creates Real Decisions:**
- You draw a great Weapons card AND a great Weapons installation in the same hand. You can only install one. Which do you pick? That's a decision that doesn't exist today.
- Your Engines slot already has a solid install. A better Engines card shows up in the market. Do you spend credits to upgrade, losing your current install to the discard pile? Or save for something in a different system?
- With synergy chains (below), the order and timing of installations matter much more.

**Weapons Cards Can Do More Than Give Hazards:**

This is the big unlock. Right now, the Weapons system's identity is "give hazards." That's its only unique verb. With system-restricted installation and synergy design, Weapons cards can have a much richer identity:

| Card | Play Effect | Install Effect (Weapons Slot Only) |
|------|-------------|-----------------------------------|
| Overcharged Railgun | +3 Weapons power | When you give a hazard, also gain +1 fame |
| Targeting Array | +1 Weapons, +1 Computers | When you activate any Weapons ability, draw 1 card |
| Suppression Field | +2 Weapons power | Opponents at your location: their system abilities cost +1 power |
| Boarding Clamps | +1 Weapons, +1 move | When you give a hazard, steal 1 credit from the target |
| Salvage Drone | +2 Weapons power | When you give a hazard, you may trash 1 card from your hand |
| Missile Barrage | +4 Weapons (trash this card after play) | N/A (no install — it's a one-shot card) |

Now Weapons is about **pressure, tempo, and aggression** — not just "pick a hazard, give it to someone." The system has a real mechanical identity.

### Cross-System Synergy Chains

The real depth comes from cards that reward building a coherent strategy. These are effects that reference other systems or game state:

**Within-System Synergies (reward system focus):**
- "+1 power for each other [System] card you've played this turn"
- "If you have a [System] card installed, this card also gives +1 credit"
- "Draw 1 card. If it's a Computer card, you may play it immediately"

**Cross-System Combos (reward combining two systems):**
- Engines + Logistics: "Move 1. If you're at a station, +2 credits"
- Weapons + Engines: "Give hazard to adjacent node. +1 move"
- Computers + Weapons: "Look at top 3 of hazard deck. Choose which one to give"
- Logistics + Computers: "Trash a card. If you do, draw 2"

**Installation Chain Bonuses (reward having multiple installs):**
- "+1 power per filled installation slot on your ship" (already exists on Synced Loop — expand this pattern)
- "If all 4 systems have installations, this card costs 0 credits to install"
- "At end of turn, if you have 3+ installations, draw 1 extra card"

**Conditional Triggers (reward specific play patterns):**
- `onGiveHazard`: When you give a hazard this turn...
- `onTrash`: When you trash a card this turn...
- `onMissionComplete`: When you complete a mission this turn...
- `onMove2Plus`: When you move 2+ spaces this turn...
- `atStation`: While at a station...
- `ifAlone`: While alone at a location...

Many of these triggers already exist in the codebase. The recommendation is to lean into them harder and design more cards around them, particularly for the Weapons system which currently has the fewest interesting triggers.

---

## 3. GALACTIC EVENTS: Variety Without Turn-Order Advantage

### The Core Design Constraint

Events that say "first player to do X gets a bonus" are unfair — whoever goes first in the round has a structural advantage that later players can't overcome. All events must either affect everyone equally regardless of turn order, or explicitly compensate for turn order.

### Revised Event Design

At the start of each round, flip a Galaxy Event card. It lasts one full round.

**Fair Events (no turn-order advantage):**

| Event | Effect | Why It's Fair |
|-------|--------|---------------|
| Solar Storm | All players: -1 power from highest system at turn start | Applies identically to each player |
| Trade Winds | All card purchases cost -1 credit this round | Same discount for everyone |
| Comm Blackout | Computer system abilities disabled this round | Everyone loses the same access |
| Asteroid Field | All movement costs +1 Engine power per space | Same restriction for all |
| Merchant Convoy | Each player: +1 credit per card played on their turn | Scales with individual play |
| Weapon Malfunction | No hazards can be given this round | Ceasefire for all |
| Nebula Drift | All missions shift one node clockwise on the map | Changes landscape for everyone equally |
| Power Surge | All players: one system of your choice starts at max (6) this turn | Each player picks independently |
| Debris Field | No installations this round | Same restriction for all |
| Supply Drop | Each player draws +2 cards at start of their turn | Same bonus for everyone |
| Gravity Well | No outward movement this round (can move laterally or inward only) | Traps everyone equally |
| Market Crash | All Tier 2+ cards cost +2 credits this round | Same price hike for all |
| Distress Signals | 2 extra missions spawn on the map this round | More opportunities for everyone |
| Ion Storm | All installed card effects are disabled this round | Levels the playing field |
| Calm Skies | All players: +1 power to every system at turn start | Universal boost |

**Design Rules for Events:**
- Never "first to X" effects
- Never effects that advantage a specific map position (unless all players are forced to the same position)
- Prefer symmetric effects (same rule for everyone) over asymmetric ones
- Effects that disable something are fine — they force adaptation without favoring anyone
- Effects that spawn missions or change the map are great — they create shared urgency

### Event Deck Structure

Stack the deck in three tiers to create natural pacing:
- **Top third (early game):** Mild, beneficial events — Supply Drop, Trade Winds, Calm Skies
- **Middle third (mid game):** Disruptive, tactical events — Comm Blackout, Asteroid Field, Nebula Drift
- **Bottom third (late game):** Dramatic, high-impact events — Ion Storm, Gravity Well, Power Surge

This creates a three-act structure without any explicit phase tracking. The event deck IS the pacing mechanism.

---

## 4. INTEGRATING THE SHIP BOARDS

### What Already Exists

The four ship boards (Ship1-4.png) are gorgeous. Each one has:
- A fame track (1-10, with the star marker)
- Four system slots (Engines on the left, Computers/Logistics/Weapons across the bottom) with ability text printed on them
- A captain portrait area on the right
- Unique ship art for each player

These were removed from the digital game because of screen space constraints. But they add so much to the game's identity and table presence that finding a way to bring them back is worth the effort.

### Integration Options

**Option A: Slide-Out Ship Panel**

Add a ship board icon/tab on the side of the screen. Clicking/tapping it slides out a panel showing your full ship board with:
- Current fame position on the track
- All four system slots with installed cards visible
- Captain portrait and ability reminder
- Power levels overlaid on each system

The panel overlays part of the map but can be dismissed quickly. This is the lowest-effort approach and keeps the main game screen clean.

**Option B: Split-Screen Ship View**

Dedicate the bottom ~30% of the screen to a simplified ship board view at all times. The ship art becomes a persistent backdrop. Installed cards sit in their system slots visually. The fame track runs along the top of the ship area.

This reduces map space but means the player always sees their ship, which reinforces the "building your ship" fantasy.

**Option C: Ship Board as Player Identity Screen**

Between turns (or during opponent turns), show the full ship board as an interstitial screen. "Your Ship" appears with all your current state — installations, fame, power, captain. Players can review their ship while waiting.

During your active turn, the ship board minimizes to a compact status bar.

**Option D: Inspectable Ship Board via Hover/Click on Player Avatar**

Keep the current compact UI, but make the player avatar/name clickable. Clicking it opens a full-screen ship board overlay showing everything. Works well for inspecting other players' ships too ("what does Player 2 have installed?").

**Recommendation:** Start with **Option A** (slide-out panel) because it requires the least layout restructuring. If it feels good, evolve toward **Option B** in a future pass. **Option D** is also very low-effort and could be added alongside any other option for the "inspect opponent" use case.

---

## 5. SECRET OBJECTIVES: State-Based, Not Tracking-Based

### The Design Constraint

Objectives that require tracking cumulative actions ("give 4+ hazards during the game," "trash 4+ cards") are problematic:
- They require persistent counters that aren't currently in the UI
- They create a "did I remember to count that?" problem
- They pull attention away from the game and toward bookkeeping

Good objectives should be checkable at game end by looking at game state, not requiring a running tally.

### Revised Objective Design

All objectives below can be verified by inspecting the board/deck state at game end:

| Objective | Condition | Bonus | How to Verify |
|-----------|-----------|-------|---------------|
| Deep Explorer | Have completed 2+ Deep Ring missions | +4 Fame | Check completed mission pile for Deep Ring missions |
| Engineer's Pride | All 4 system slots have installations at game end | +4 Fame | Look at ship board |
| Minimalist | Have 12 or fewer cards in your deck at game end | +4 Fame | Count deck + hand + discard |
| Outfitted | Have 3+ Tier 2 or higher cards installed | +4 Fame | Check installations |
| Far Traveler | Be on the Deep Ring when the game ends | +3 Fame | Check position on map |
| Hoarder | Have 5+ credits at game end | +3 Fame | Check credit total (only relevant if credits carry over or are gained from end-game effects) |
| Diversified | Have completed missions in all 3 rings | +5 Fame | Check completed mission pile for ring diversity |
| Lone Outpost | End the game alone at your location (no other players on your node) | +3 Fame | Check positions |
| Loaded Ship | Have the most installed cards of any player | +3 Fame | Compare installations |
| Clean Running | Have 0 hazards in your deck at game end | +4 Fame | Check deck for hazards |
| Full Spread | Have at least 1 card from each system type (W/C/E/L) in your deck | +3 Fame | Check deck composition |
| Station Regular | End the game at the Hub/Station | +3 Fame | Check position |
| Weapons Hot | Have a Weapons card installed AND be on the same node as another player at game end | +3 Fame | Check state |
| Power Broker | Have 4+ power in a single system at end of your last turn | +3 Fame | Check final power state |

**Draft Rule:** Deal 3 objectives to each player at game start, keep 1. This gives more choice than pick-1-of-2 and reduces the chance of getting objectives that conflict with your captain.

---

## 6. CONTESTED MISSIONS: Working With Distinct Turns

### The Design Constraint

Players take distinct, sequential turns. There's no simultaneous action. Any contest mechanic must work within this turn structure, not against it.

### Proposal: Shared Missions with Diminishing Returns

When a mission spawns on the map, it's available to all players. The first player to reach it and complete it gets full fame. But unlike the current system where the mission immediately disappears, the mission remains for one additional round at reduced value:

- **First completion:** Full fame (e.g., 4 fame)
- **Second completion (same mission, next player or next round):** Half fame, rounded down (e.g., 2 fame)
- **After second completion:** Mission is removed

**Why This Works With Turn Order:**
- The later player isn't locked out — they can still complete the mission for reduced value
- The first completer got an advantage, but the second completer didn't waste their turn
- Creates interesting timing decisions: "Do I rush this 4-fame mission now, or complete a different one and come back for this at 2 fame?"
- With the ring map, being in the right position when a mission spawns matters more than turn order

### Alternative: Bounty Missions

Certain missions (marked with a special icon) are "bounty" type — they're harder than normal but when completed, the completer gets to choose: take the fame OR place a hazard on another player as part of the mission reward. This ties Weapons thematically into the mission system without requiring the Weapons system directly.

---

## 7. THE POWER BALANCE QUESTION: Systems vs. Missions

### Reframing the Problem

The v1 report was wrong to say there's "no tension" — there is. You spend power on missions and that power can't be used for system abilities. The real question is: **are mission rewards so good that spending power on system abilities instead feels like a mistake?**

Looking at mission rewards:
- **Bolt** rewards give immediate power back (partially refunding the cost)
- **Gear** rewards install the mission card itself as a permanent effect
- **Trophy** rewards give passive triggers for the rest of the game

If a Bolt mission costs 5 total power but gives back 3 power as a reward, the net cost was only 2 power. That's very efficient compared to spending 1-3 power on a system ability.

### Possible Adjustments (To Be Tested)

**Option A: Reduce Bolt Reward Values**

If Bolt missions are refunding too much power, reduce the power-back amounts by 1-2. A mission that costs Weapons 3 + Engines 2 should not give back 3+ power — that makes the system ability alternative feel pointless.

**Option B: Make System Abilities More Impactful**

Rather than nerfing missions, buff what system abilities do. If the Computers draw-3-keep-1 ability (3 power) consistently finds you the exact card you need, it competes with completing a mission. Currently, system abilities are decent but not exciting.

Ideas:
- Weapons (1 power): Give hazard locally. Weapons (3 power): Give hazard anywhere **AND choose which hazard from the deck**.
- Computers (1 power): Draw 1. Computers (3 power): Draw 3, keep 1, **and you may play 1 of the drawn cards immediately**.
- Engines (1 power): Move 1. Add a second ability — Engines (2 power): Move 1 **and reveal all face-down missions in your ring**.
- Logistics (1 power): Gain 1 credit. Logistics (3 power): Trash a card **and gain 1 credit**.

**Option C: The "Spent" Power Lingers**

When you spend power on a mission, those systems are "depleted" for the rest of the turn — you can't use system abilities on any system you spent mission power from. This is already sort of true (power is gone), but making it an explicit rule with visual feedback ("your Weapons system is greyed out because you spent 3 Weapons power on that mission") reinforces the tradeoff.

**Recommendation:** Start with **Option B** — making system abilities more exciting is a buff that feels good, rather than a nerf to missions that might feel bad. Test it and only move to Option A if missions still dominate.

---

## 8. MAP LOCATION EFFECTS: The Trigger Problem

### The Constraint

Players can move multiple times per turn. If location effects trigger on arrival, a player who moves through 3 nodes triggers 3 effects, which is potentially overpowered and creates a tracking headache.

### Solution: Effects Apply Based on Where You ARE, Not Where You Arrive

Location effects are passive — they modify actions you take while at that location, rather than triggering when you enter. Since you're only actively *doing things* at your final position (completing missions, buying cards, activating abilities), the effects naturally only apply once.

**Design Pattern: "While at this location..."**

| Node Type | Effect | Why It's Not OP |
|-----------|--------|-----------------|
| Scrapyard | While here: you may trash 1 card for free per turn | You have to end your movement here and spend your turn |
| Comm Relay | While here: system abilities cost -1 power (min 1) | Only benefits abilities used at this location |
| Nebula Cloud | While here: you cannot be targeted by hazards | You're safe, but missions here are weaker |
| Gravity Anchor | While here: missions cost -1 total power | Discount only for missions at this specific node |
| Dead Zone | While here: no card draws allowed | Dangerous, but missions here pay +1 fame |
| Relay Station | While here: you may buy Tier 1 cards | Mini-market away from the hub |

With the concentric ring map, these effects can be placed on specific nodes. Not every node needs an effect — some are just empty space. Maybe 4-6 nodes across the whole map have effects, and they're marked with icons.

**Key Rule:** Effects only apply to actions taken while at that node. Moving through a node with an effect does NOT trigger it. You must stop there and take an action.

---

## 9. CREDITS: Keep the Reset (For Now)

The credit-carry-over suggestion from v1 was flagged as uncertain. Here's the case for keeping the current reset:

**Why Resetting Works:**
- Forces players to be efficient within a single turn — no lazy "I'll save up"
- Makes credit-generating cards and the Logistics system feel necessary every turn
- Keeps the game snappy — no hoarding, no analysis paralysis about saving vs. spending
- The Tycoon captain's +1 credit per turn is balanced around the assumption that credits don't carry over

**The Real Problem Credits-Carry-Over Was Trying to Solve:**
If players can't afford Tier 3 cards in a single turn, that's a credit generation problem, not a saving problem. The fix might be better Logistics cards or more credit-generating effects, not changing the fundamental economy.

**Verdict:** Keep credits resetting for the base game. Revisit if Tier 3 cards are consistently unaffordable after other changes are implemented.

---

## 10. CARGO HOLD & CREW: Future Expansion

These are great ideas that should wait until the base mechanics are solid. Documenting them here for future reference:

**Cargo Hold (Future):**
- 3-4 slots on the ship board for consumable items
- Gained from missions, events, or special market purchases
- Examples: Fuel Cells (+3 Engine power, one use), Data Cores (draw 3, one use), Contraband (+2 fame at end but risky)
- Adds inventory management as a secondary strategic layer

**Crew Quarters (Future):**
- 2-3 slots for persistent minor passive abilities
- Recruited from missions or purchased at stations
- Examples: Pilot (+1 move/turn), Mechanic (installs -1 credit), Gunner (hazards harder to clear)
- Micro-upgrades that fine-tune strategy without full card commitment

Both of these would integrate naturally with the ship board once it's reintegrated into the UI.

---

## Summary: Priority Ranking

| Priority | Change | Impact | Effort | Status |
|----------|--------|--------|--------|--------|
| 1 | Concentric Ring Map | Transformative | High | New concept — needs prototyping |
| 2 | Card Synergy Chains + System-Restricted Installation | Very High | Medium | Partially exists — extend it |
| 3 | Secret Objectives (state-based) | Very High | Low | New — straightforward to add |
| 4 | Galaxy Events (turn-order fair) | Very High | Medium | New — deck design + round logic |
| 5 | Weapons System Identity Expansion | High | Medium | Ties into synergy chains |
| 6 | Ship Board Reintegration | Medium-High | Medium | Assets exist — UI work needed |
| 7 | System Ability Buffs | High | Low | Tuning existing abilities |
| 8 | Map Location Effects (passive) | Medium | Low-Medium | Pairs with new map design |
| 9 | Contested Missions (diminishing returns) | Medium | Low | Simple rule addition |
| 10 | Cargo & Crew | Medium | High | Future expansion |

### Recommended Implementation Path

**Phase 1 — Core Loop Improvements (no map change needed):**
Card synergy chains, system-restricted installation, Weapons identity expansion, system ability buffs, secret objectives. These can all be implemented on the current linear map and immediately improve depth.

**Phase 2 — The New Map:**
Prototype the concentric ring map. This is the biggest single change and will require significant work on movement logic, mission spawning, and UI. But it has the potential to make Rust Bucket Rising feel truly unique in the deck-builder space.

**Phase 3 — Atmosphere & Variety:**
Galaxy events, ship board reintegration, location effects on the ring map, contested missions. These add flavor and variety on top of the now-solid core.

**Phase 4 — Expansion Content:**
Cargo hold, crew quarters, more captains, more events. Only after the base game is rock solid.
