# Rust Bucket Rising: Design Analysis & Recommendations

**A comprehensive gameplay review with proposals for improving depth, tension, and fun**

---

## Executive Summary

Rust Bucket Rising has a strong mechanical foundation: a clean turn structure, a satisfying power allocation system, and a spatial element that gives the game a distinct identity within the deck-building genre. However, in its current state, the game suffers from several structural issues that reduce strategic depth and replayability:

1. There is no meaningful tension between building your engine and scoring points
2. The economy is too linear — every turn feels the same regardless of game phase
3. Player interaction through hazards is disruptive but not strategically interesting
4. The spatial map is underutilized — locations are interchangeable waypoints
5. Game-to-game variety is low — without variable setup, every session converges on the same strategies

The recommendations below are organized from highest-impact to lowest, with rationale grounded in principles from games like Dominion, Dune: Imperium, Clank!, and Terraforming Mars.

---

## 1. THE CORE PROBLEM: No Tension Between Building and Scoring

### What's Happening Now

In the best deck-builders, there is a fundamental conflict between making your engine better and using it to score. In Dominion, every Victory Point card you buy clogs your deck with a dead card. In Clank!, going deeper for better treasure means you might not escape alive. In Dune: Imperium, spending influence to score VP means you're not buying powerful new cards.

In Rust Bucket Rising, this tension doesn't exist. Everything you do feeds the same pipeline: play cards, gain power, complete missions, gain fame. Buying better cards makes you complete missions faster. Installing cards makes you complete missions faster. There is no sacrifice for scoring — the optimal play is always "build engine, then score, then build more engine." The engine and the scoring are perfectly aligned, which means there's never a moment where a player has to make a genuinely difficult strategic trade-off.

### The Fix: Make Missions Cost Something Real

**Proposal: Missions should consume power, not just require it.** When you complete a mission, the power you spent should be gone — truly spent, not just checked against a threshold. This is how the game already works mechanically (power is deducted), but the impact is muted because power regenerates fully each turn. The real tension comes from what that spent power prevents you from doing *this turn*.

**Proposal: Limit missions to one per turn.** This is already suggested in your brainstorm doc and it's the right call. Multiple mission completions per turn eliminate the need to choose which mission matters most. With a one-mission limit, the question becomes: "Do I complete this easy 2-fame mission now, or do I push to the harder 4-fame mission next turn?" That's a real decision.

**Proposal: Consider a "mission fatigue" cost.** Each mission completed after your first in a game could require +1 additional power across the board. Your 1st mission needs base requirements. Your 5th mission needs base + 4 extra power spread however you like. This creates natural pacing — early missions are accessible, late missions require a fully built engine, and every player's path to 25 fame involves genuine escalation.

---

## 2. MAKE THE MAP MATTER: Location Effects

### What's Happening Now

The 6 locations are functionally identical except for which missions sit at them and which stations are nearby. Locations 2, 4, and 6 have no station and no special properties — they're empty corridors. The map is a number line, not a place. Players don't feel like they're exploring a galaxy; they're moving a token along a track.

### The Fix: Every Location Should Have an Identity

Give each location a persistent effect that applies to all players present there. This transforms the map from a number line into a strategic landscape where *where you are* matters as much as *what you do*.

**Suggested Location Effects:**

| Location | Name | Effect |
|----------|------|--------|
| 1 | Scrapyard Station | Buy Tier 1 cards. Trash a card for free once per turn. |
| 2 | Comm Relay | Draw 1 extra card at start of turn while here. |
| 3 | Trading Post | Buy Tier 2 cards. All card purchases cost -1 credit. |
| 4 | Pirate Corridor | All players here: hazard clear costs are doubled. Missions here give +1 fame. |
| 5 | Deep Dock | Buy Tier 3 cards. May install a card for free once per turn. |
| 6 | The Fringe | Missions here give +2 fame. No system abilities can target you here. |

**Why this works:**
- Creates push-pull tension: Location 2's extra card draw is great, but you can't buy there. Location 4 is dangerous but rewarding. Location 6 is isolated but lucrative.
- Players must choose between safe/efficient positions and risky/rewarding ones.
- Movement becomes a strategic decision rather than a rote "go to the nearest mission."
- Different captains and strategies naturally favor different locations, increasing asymmetry.

---

## 3. ROUND EVENTS: Create Game-to-Game Variety

### What's Happening Now

Every game of Rust Bucket Rising plays out in roughly the same arc: buy Tier 1 cards, install them, push toward mid-space, buy Tier 2 cards, complete missions, race to 25 fame. There is no external pressure, no surprises, and no variety between sessions. The market is the same, the map is the same, and the missions (while shuffled) are drawn from a known pool.

### The Fix: A Galaxy Event Deck

At the start of each round (after all players have taken a turn), flip a Galaxy Event card. Events last for one full round and affect all players equally. This creates a shared challenge that players must adapt to, rewards tactical flexibility, and ensures no two games feel the same.

**Design a deck of 15-20 events, flip one per round. Examples:**

| Event | Effect | Strategic Impact |
|-------|--------|-----------------|
| Solar Storm | All players lose 1 power from their highest system at turn start | Punishes over-specialization |
| Trade Winds | All card purchases cost -1 credit this round | Buying window — everyone rushes the market |
| Bounty Posted | First player to complete a mission this round gets +2 bonus fame | Race tension |
| Comm Blackout | Computer system abilities are disabled this round | Forces alternative strategies |
| Pirate Raid | All players at stations must discard 1 card or lose 2 credits | Positional risk |
| Asteroid Field | Movement costs +1 engine power per space | Slows the game, rewards staying put |
| Merchant Convoy | Gain +1 credit for each card played this round | Rewards wide card play |
| Weapon Malfunction | No hazards can be given this round | Ceasefire — focus on building |
| Scavenger's Market | May buy cards from any station regardless of location | Opens up strategies |
| Distress Signal | A new mission appears at every empty location | More scoring opportunities |

**Why this works:**
- Borrowed from Terraforming Mars's Turmoil expansion, where events visible in advance create anticipation.
- Prevents "solved" games — even if a player knows the optimal strategy, events force adaptation.
- Creates memorable moments ("Remember that game where the Solar Storm hit right when I was about to complete the deep space mission?").
- Low implementation cost — it's just a single card flip per round with a global modifier.

---

## 4. REDESIGN THE HAZARD SYSTEM: From Harassment to Strategic Interaction

### What's Happening Now

Hazards are "take that" cards that punish a targeted player. The attacker gains nothing except the satisfaction of disrupting someone. The defender feels bad. Neither player made an interesting decision. The Weapons system exists primarily to be annoying, and the AI correctly evaluates hazards as the lowest-priority action.

This is the Munchkin problem: spending your resources to hurt someone else is only fun in very fast games. In a 30-45 minute game, having your carefully built engine disrupted by a random hazard feels disproportionately punishing.

### The Fix: Make Hazards a Shared Challenge, Not a Personal Attack

**Option A: Environmental Hazards**

Replace the hazard deck with a shared hazard pool at locations. When a player enters a location (or at certain triggers), a hazard is revealed at that location and affects everyone there. Players can spend power to clear location hazards, which benefits everyone at that location but costs the clearer resources.

This transforms the Weapons system from "attack your friend" to "manage environmental threats." The player who clears a hazard is doing something heroic and useful, not mean. Other players benefit, creating a moment of cooperative tension within a competitive game.

**Option B: Bounties Instead of Hazards**

Replace "give opponent a hazard" with "place a bounty on a location." A bounty is a challenge card placed at a map location. Any player can attempt to complete a bounty for its reward (fame + credits). The Weapons system becomes about creating opportunities and controlling where bounties appear (ideally at locations convenient for you).

This transforms combat from destructive (hurt someone) to productive (create a scoring opportunity that you can race to claim). It keeps the Weapons system relevant without the feel-bad of targeted disruption.

**Option C: Keep Hazards, But Add Counterplay and Rewards**

If you want to preserve the direct-conflict feel:
- When a player receives a hazard, they immediately draw 1 card as compensation
- Clearing a hazard grants +1 fame (making hazards a risky gift)
- The attacker must choose: cheap hazard (easy to clear, gives opponent +1 fame when they clear it) or expensive hazard (hard to clear, but costs the attacker more power)

This creates a genuine risk-reward calculation for the attacker: is it worth giving my opponent a +1 fame opportunity in exchange for temporarily disrupting them?

---

## 5. CARD SYSTEM OVERHAUL: Create Deck Identity

### What's Happening Now

Most cards in the game do some variation of "+N power to System X." The difference between Weapons Core (+2 Weapons) and Engine Boosters (+2 Engines) is purely which number goes up. Cards lack personality, synergy hooks, or strategic identity. There is no reason to build a "Weapons deck" vs a "Logistics deck" beyond which missions you're targeting.

### The Fix: Give Each System a Mechanical Identity

Each of the four systems should feel fundamentally different to play, not just be a different color of the same resource.

**Weapons: Tempo and Disruption**
Weapons cards should be fast, aggressive, and create pressure. They should let you do things *now* at the cost of future efficiency. Design principle: high immediate impact, low installation value.

- Cards that give big power spikes but are one-time-use
- Cards that interact with other players (bounties, challenges, races)
- Cards that trade long-term deck health for short-term power (trash themselves after play)

**Computers: Information and Precision**
Computers cards should be about seeing more options and making better choices. They should let you optimize and plan. Design principle: card draw, deck filtering, and selection.

- Cards that let you look at the top of your deck and rearrange
- Cards that let you draw extra and discard down (filtering)
- Cards that get better the more you know (bonus if you've scouted a market stack)
- Installation effects that improve your draw quality rather than quantity

**Engines: Momentum and Range**
Engines cards should be about covering ground efficiently and reaching places others can't. Design principle: movement bonuses, position-dependent effects.

- Cards that give bonus effects when played at certain locations
- Cards that let you "leapfrog" (move 2+ spaces at once for a discount)
- Cards that give power based on distance from starting position
- Installation effects that make movement free or generate resources when moving

**Logistics: Economy and Flexibility**
Logistics cards should be the glue that holds strategies together. They should be less powerful individually but enable other systems. Design principle: credits, discounts, and deck manipulation.

- Cards that generate credits (the economy backbone)
- Cards that let you trash/cycle your deck (the thinning system)
- Cards that provide flexible power (choose which system)
- Installation effects that provide passive income or reduce costs

### Card Synergy Chains

The real depth comes from cards that reference each other. Consider effects like:

- "+1 power for each Weapons card you've played this turn" (rewards system focus)
- "+1 credit for each installation you have" (rewards engine building)
- "Draw 1 card. If it's a Computer card, play it immediately" (rewards Computer-heavy decks)
- "Move 1 space. If you're at a station, +2 credits" (rewards Engines + Logistics combo)

This gives players a reason to build a *coherent* deck rather than just buying the highest-power card available.

---

## 6. PLAYER BOARDS: Make Ship Building Tangible

### What's Happening Now

Each player has four installation slots (one per system) and some gear slots from missions. This is functional but invisible — it's tracked as game state, not as a physical/visual thing the player builds. There's no sense of "my ship is growing" over the course of the game.

### The Fix: A Proper Ship Board

Give each player a ship board (physical or digital) with:

**System Tracks (4 tracks, one per system):**
Instead of a flat "max 6 power," each system has a track from 1-6 that can be permanently upgraded. Base starting power is 1. Installing a card to a system permanently increases its starting power by 1 (in addition to the card's install effect). This means installations are now doubly valuable — they provide a per-turn effect AND permanently improve your base power.

This creates a visible, satisfying progression: your ship literally gets stronger over the course of the game. It also creates meaningful installation decisions — do you upgrade Weapons from 2 to 3, or Engines from 1 to 2?

**Cargo Hold (3-4 slots):**
A limited number of "cargo" slots that can hold special items gained from missions or events. Cargo might include:
- Fuel cells (consumable: +3 engine power, one use)
- Data cores (consumable: draw 3 cards, one use)
- Contraband (worth +2 fame at game end, but -3 fame if you have a Warrant Issued hazard)
- Salvage parts (can be spent in place of 2 credits)

The cargo hold creates interesting inventory management decisions and makes missions feel more rewarding (you're not just getting fame — you're getting stuff).

**Crew Quarters (2-3 slots):**
Small persistent bonuses represented as crew members recruited from missions or purchased at stations. Each crew member provides a minor passive ability:
- "Pilot: +1 movement per turn"
- "Mechanic: Installations cost -1 credit"
- "Broker: +1 credit per turn"
- "Gunner: Hazards you give are harder to clear"

Crew members are stackable micro-upgrades that let players fine-tune their strategy without the commitment of a full card installation.

---

## 7. SECRET OBJECTIVES: Divergent Strategies from Turn 1

### What's Happening Now

All players are pursuing the same goal in the same way: get to 25 fame via missions. There is no reason for two players to approach the game differently except captain abilities, which provide only mild asymmetry.

### The Fix: Deal Two Secret Objective Cards at Game Start, Keep One

Each objective provides +3-5 bonus fame at game end if its condition is met. Conditions should be achievable through different playstyles:

**Examples:**

| Objective | Condition | Bonus |
|-----------|-----------|-------|
| Deep Explorer | Complete 2+ missions in Deep Space | +4 Fame |
| Arms Dealer | Give 4+ hazards during the game | +3 Fame |
| Merchant Prince | Buy 5+ cards from the market | +3 Fame |
| Minimalist | Win with 12 or fewer cards in your deck | +4 Fame |
| Station Hopper | Complete missions at 3+ different locations | +3 Fame |
| Engineer's Pride | Have all 4 installation slots filled | +4 Fame |
| Speed Runner | Complete your 3rd mission before round 6 | +5 Fame |
| Nomad | Visit all 6 locations during the game | +3 Fame |
| Scrapyard King | Trash 4+ cards during the game | +3 Fame |
| Lone Wolf | Complete a mission while alone at a location 3+ times | +4 Fame |

**Why this works:**
- From turn 1, players have a reason to pursue different strategies
- Creates hidden information — you don't know what your opponent is optimizing for
- The "choose 1 of 2" draft prevents feel-bad moments of getting an impossible objective
- Adds 3-5 fame of scoring outside the mission system, creating more paths to victory
- Increases replayability enormously — even with the same captain, different objectives change your priorities

---

## 8. ECONOMY REFINEMENT: Credits Should Carry Over (Partially)

### What's Happening Now

Credits reset to 0 every turn. This means there is never a reason to generate more credits than you can spend in a single turn. Saving is impossible. Long-term economic planning doesn't exist. Every turn is economically identical — generate credits, spend them, reset.

### The Fix: Let Credits Carry Over, But With a Cap

Allow players to carry over up to 3 unspent credits between turns. This single change creates multiple new strategic dimensions:

- **Saving for big purchases**: A player can save 3 credits across turns to afford a Tier 3 card (5-7 cost), making big purchases feel like an achievement rather than requiring a lucky high-credit hand.
- **Economic specialization**: Logistics-heavy builds become more interesting because generating excess credits has lasting value.
- **Turn planning across turns**: "I'll save 2 credits this turn so I can buy-and-install next turn" is a plan that creates engagement even on turns where you can't do much else.
- **Install timing decisions**: With saved credits, the question of *when* to install becomes more interesting.

The cap of 3 prevents infinite hoarding and keeps the economy tight. You still need to generate credits each turn — you just have a small buffer to work with.

---

## 9. GAME PACING: Tighten the Arc

### What's Happening Now

The victory threshold is 25 fame. Games run approximately 10-15 turns per player with 2 players. With the current mission distribution (2/3-4/5-6 fame per zone), a typical game involves completing 5-8 missions. The game can feel samey in the middle — turns 4-8 often involve the same loop of "play cards, gain power, complete mission" without escalation.

### The Fix: Three-Act Structure

Design the game to have distinct early, mid, and late phases that feel different:

**Act 1 (Turns 1-4): Exploration & Setup**
- Players explore near space, buy first cards, make first installations
- Galaxy Events are mild (bonuses, opportunities)
- All Near Space missions available

**Act 2 (Turns 5-8): Expansion & Competition**
- Players push into mid and deep space
- Galaxy Events become more impactful (storms, raids, bounties)
- Competition for prime missions intensifies
- First player interactions (if using bounties or contested missions)

**Act 3 (Turns 9+): The Race**
- One or more players approach 25 fame
- Galaxy Events become dramatic (double-or-nothing opportunities, final challenges)
- Players make desperate plays — sacrifice deck efficiency for last points
- Secret objectives become deciding factors

The event deck can drive this naturally: stack mild events on top, moderate events in the middle, and dramatic events at the bottom. No complex phase-tracking needed — the event deck IS the pacing mechanism.

---

## 10. SMALLER IMPROVEMENTS

### Market Refresh Mechanism
Currently, market stacks can be depleted, leaving dead spaces in the market. Add a rule: at the end of each round, if any market stack is empty, refill it from a reserve. This prevents dead markets and ensures players always have buying options.

### Contested Missions
If two players are at the same location with a mission, allow both to attempt it — but only the first to complete it gets the fame. The second player still spends their power but gets nothing. This creates racing tension and makes movement timing critical. Alternatively, both can complete it but the second player gets -1 fame.

### Installation Upgrade Path
Instead of replacing an old installation with a new one (old goes to discard), allow "upgrading" — the new card sits on top of the old one, and you get both install effects. This rewards long-term investment in a system and makes installation order matter.

### Captain Drafting Improvement
Instead of random 2-choice, use a snake draft: in a 4-player game, player 1 picks from all 9, player 2 from remaining 8, player 3 from 7, player 4 from 6. This gives later-picking players a consolation of knowing their captain is guaranteed, and creates social dynamics around captain selection.

---

## Summary: Priority Ranking

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | One mission per turn limit | High | Trivial |
| 2 | Secret Objectives | Very High | Low |
| 3 | Location Effects | Very High | Low-Medium |
| 4 | Galaxy Event Deck | Very High | Medium |
| 5 | Credits carry over (cap 3) | High | Trivial |
| 6 | Card system identities | Very High | High |
| 7 | Hazard system redesign | High | Medium-High |
| 8 | Player ship board | Medium | Medium |
| 9 | Three-act pacing via events | High | Low (event deck does it) |
| 10 | Market refresh mechanism | Medium | Trivial |

The first five changes could be implemented with minimal mechanical disruption and would dramatically improve the game's strategic depth, replayability, and moment-to-moment decision quality. Changes 6-10 are more ambitious but would transform Rust Bucket Rising from a solid deck-builder into a distinctive, deep, and highly replayable game.
