# Rust Bucket Rising - Suggested Fixes & Balance Changes

**Compiled from analysis session — February 2026**

---

## Table of Contents

1. [Critical: Broken / Non-Functional Mechanics](#1-critical-broken--non-functional-mechanics)
2. [Critical: Cards With Non-Functional Effects](#2-critical-cards-with-non-functional-effects)
3. [Cards That Need Redesign](#3-cards-that-need-redesign)
4. [Balance Issues](#4-balance-issues)
5. [Near Space Snowball Problem](#5-near-space-snowball-problem)
6. [Hazard System Issues](#6-hazard-system-issues)
7. [Captain Balance](#7-captain-balance)
8. [Engine Logic Bugs](#8-engine-logic-bugs)
9. [Suggested Card Replacement](#9-suggested-card-replacement)

---

## 1. Critical: Broken / Non-Functional Mechanics

These are mechanics that are defined in types/data but have no implementation in GameEngine.ts.

### Reaction Cards — Completely Unimplemented
- **What**: The `ReactionData` type exists, Countermeasures has `reaction: { trigger: 'onReceiveHazard', effect: 'blockHazard', bonus: { draw: 1 } }`
- **Problem**: `giveHazard()` never checks the target's hand for reaction cards. The entire reaction system is dead code.
- **Impact**: Countermeasures' reaction ability does nothing. Players holding it in hand thinking it protects them get no benefit.
- **Fix**: Either implement the reaction system in `giveHazard()`, or remove reaction data from cards and redesign Countermeasures (see Section 9).

### Trophy Passive Effects — Never Trigger
- **What**: Trophies define passive effects like `{ trigger: 'onGainCredits', power: 1 }` or `{ trigger: 'ifAlone', power: 1 }`
- **Problem**: There is no event system. The `trophies[]` array is populated but never read during gameplay.
- **Impact**: Trophy-type mission rewards are functionally identical to "nothing" — the player gets fame but the passive text is decorative.
- **Fix**: Add trigger checks at relevant points in the engine:
  - `onGainCredits`: check in any credit-granting flow
  - `ifAlone`: check at turn start (is player alone at their location?)
  - `onGiveHazard`: check in `giveHazard()`
  - `onTrash`: check in `trashCard()`
  - `atStation`: check at turn start (is player at location 1/3/5?)

### Gear Conditional Effects — Partially Working
- **What**: Gear installations check some triggers at turn start in `applyInstallationEffects()`
- **Working**: `missions3plus`, `hazards2plus`, `trophies2plus`
- **Not working**: `cards2plus`, `cards5plus` (explicitly skipped with TODO comments)
- **Fix**: These triggers don't make sense at turn start (cards haven't been played yet). Either:
  - Change the trigger to check at end of turn
  - Redesign these gears to use turn-start-checkable conditions

### `oneTimeUse` — Not Tracked
- **What**: Cards like Temporal Jump and Detonator Relay have `oneTimeUse: true`
- **Problem**: `usedOneTimeCards[]` exists on Player but is never checked in `canPlayCard()` or `playCard()`
- **Impact**: These cards can be played every turn, making them massively overpowered once implemented
- **Fix**: In `canPlayCard()`, check if `card.id` is in `player.usedOneTimeCards`. In `playCard()`, add the card ID to the array after use.

---

## 2. Critical: Cards With Non-Functional Effects

These cards exist and can be bought/played, but specific effects silently do nothing.

### Completely Non-Functional Effects

| Card | Effect Text | Missing Implementation |
|------|-------------|----------------------|
| **Synced Loop** (T2) | "Play an extra card free" | `extraPlay` is tracked but never checked — playing cards is unlimited and free |
| **Synced Loop** install | "First card costs -1⚡" | `cardPowerDiscount` is never processed — cards don't cost power |
| **Echo Engine** (T3) | "Play top card of discard" | `playFromDiscard` has no implementation |
| **Echo Engine** install | "May play top of discard" | `mayPlayFromDiscard` has no implementation |
| **Temporal Jump** (T3) | "Once/game: Extra turn" | `extraTurn` has no implementation |
| **Remote Uplink** install | "Reallocate 1⚡" | `reallocate` has no implementation |

### Partially Non-Functional Effects

| Card | Effect Text | What Works | What Doesn't |
|------|-------------|------------|--------------|
| **Interceptor Mode** (T2) | "+1 Move. If complete mission: +2⚡" | Move works | `conditionalPower` with `onMissionComplete` trigger never checked |
| **Scrap Shot** (T2) | "Give hazard. +1⚡ if they had one" | Hazard works | `bonusIfHadHazard` never checked |
| **Pulse Grenade** (T2) | "Hazard to all at location, +2⚡" | Power works | `hazardAllAtLocation` not implemented (only single target) |
| **Chain Reaction** (T3) | "Hazard to all players, +1⚡ per" | Nothing | `hazardAll` and `powerPerHazard` both unimplemented |
| **Detonator Relay** (T3) | "Once/game: Hazard all, mission -2⚡" | `missionDiscount` works | `oneTimeUse` and `hazardAll` unimplemented |
| **Scorch Protocol** (T3) | "+4⚡. +1 Fame if 3+ hazards" | Power works | `fameIfHazards` never checked |
| **Mag-Leash** (T2) | "Move player 1 space, give hazard" | Hazard works | `moveOther` not implemented |
| **Thruster Array** (T2) | "+1 Move, +1⚡ to two systems" | Move works | `powerToTwo` not implemented |
| **Cargo Jettison** (T2) | "Trash a card, +2⚡" | Power works | `mustTrash` treated as optional (same as `mayTrash`) |

---

## 3. Cards That Need Redesign

These cards have fundamental design problems beyond just missing implementation.

### Synced Loop — Complete Redesign Needed
- **Current**: Play "+1 extra card free" / Install "First card costs -1⚡"
- **Problem**: Playing cards is unlimited and free. Both effects are meaningless under current rules.
- **If adding a play limit (e.g., 3/turn)**: Keep as-is, it would work perfectly.
- **If NOT adding a play limit**: Redesign entirely.
- **Suggestion**: Play: "+2⚡. +1⚡ to each system that has an installation." Install: "+1 Card draw per turn."

### Refit Contract — Generates Nothing
- **Current**: Play "Install a card at -2 cost" (gives only `installDiscount: 2`)
- **Problem**: No credits, no power, no cards. Playing this card gives you literally nothing except a discount on a future install — but you need credits for that install, which this card doesn't provide.
- **Suggestion**: Add "+2 Credits" to the play effect so it funds the install it's discounting.

### Interceptor Mode — Awkward Timing
- **Current**: "+1 Move. If complete mission: +2⚡"
- **Problem**: Even if implemented, the conditional trigger has timing issues — you play the card first, then later complete a mission, but the bonus should retroactively apply.
- **Suggestion**: Simplify to "+1 Move, +2⚡ Engines" — straightforward, worth the 5 cost.

### Thruster Array — Needs UI That Doesn't Exist
- **Current**: "+1 Move, +1⚡ to two systems" (`powerToTwo: 1`)
- **Problem**: Would need a new "pick two systems" UI prompt.
- **Suggestion**: Simplify to "+1 Move, +2⚡ (choose system)" (`moves: 1, powerChoice: 2`).

### Remote Uplink Install — Needs UI That Doesn't Exist
- **Current install**: "Reallocate 1⚡" (`reallocate: 1`)
- **Problem**: Would need a "move power from A to B" UI prompt.
- **Suggestion**: Simplify to "+1⚡ (choose)" (`powerChoice: 1`).

---

## 4. Balance Issues

### Credits Reset + Economy Pacing
- Credits reset to 0 each turn (line 480 in GameEngine.ts)
- Starter deck: 6x Supply Check (+1 credit), 3x Cheap Battery (+1⚡), 1x Basic Engines (+2⚡ engines)
- Typical turn 1 hand: ~3 Supply Checks + 1-2 power cards = 3 credits
- Tier 1 card costs 3 credits (affordable), install costs 2 more (need 5 total = hard)
- **Assessment**: This is working as designed — buy now, install later when you draw it. The economy is tight but functional.

### Discount Reset Inconsistency
- `buyDiscount` resets to 0 after a single purchase (line 1232) AND at turn start (line 476)
- `installDiscount` resets only after use (line 1682), also reset at turn start (line 477)
- `missionDiscount` resets after mission completion (line 1370), also reset at turn start (line 478)
- **Issue**: The in-use reset is redundant with turn-start reset for buy/install discounts. But `missionDiscount` resetting on completion means it only applies to one mission per turn, which seems intentional.
- **Potential issue**: `buyDiscount` resetting after first buy means multi-card discount effects only apply once. Is this intentional?

### No Tiebreaker Logic
- Lines 792-800: If two players have same fame, Player 1 (first in array) wins.
- **Fix**: Add tiebreakers — most completed missions → fewest hazards → most credits at end → player who triggered end-game loses ties (other player had fewer turns).

### Replaced Missions Always Revealed
- Line 1501-1504: `replaceMission()` sets `revealed: true` on new missions.
- **Suggestion**: Set `revealed: false` for mid/deep zone replacements. Near space could stay revealed (it's well-scouted territory). Reveal when a player is at or moves to that location.
- **Alternative**: Reveal at end of turn (not immediately) so the completing player doesn't get first crack at the replacement.

---

## 5. Near Space Snowball Problem

### The Core Issue
- All location-1 missions require exactly 3 total power
- Players start with 4 power (1 in each system)
- Result: First mission can be completed before playing any cards
- Mission rewards (often +2⚡) refuel power for the next mission
- Replacement missions are immediately revealed and completable
- Three Near Space missions = 6 Fame with minimal effort on turn 1

### Recommended Fixes (pick 1-2)

**Option A: Limit 1 mission per turn**
- Simple, clean rule. Completing a mission is the climax of your turn.
- Makes movement decisions matter — be at the right place when you commit.

**Option B: Limit 1 mission per zone per turn**
- Slightly more permissive — you could do 1 Near + 1 Mid if you can get there.
- Still prevents Near Space spam.

**Option C: Increase Near Space requirements to 4-5 total power**
- Forces players to play at least 1-2 cards before completing.
- Examples: Refuel Station C:1, E:2, L:1 (was 1/1/1). Cargo Recovery W:2, E:1, L:1 (was 1/1/1).

**Option D: Remove power from Near Space rewards**
- Near missions reward credits, cards, or conditional effects only.
- Power rewards reserved for Mid/Deep (incentivizes traveling there).
- Breaks the cascade where completing mission → get power → complete next mission.

**Option E: Delay mission replacement**
- New missions don't appear until end of turn (or next round).
- Player can't chain-complete at the same location.

---

## 6. Hazard System Issues

### `playerHasActiveHazard` Checks Entire Deck
- Line 877-881: Checks hand, deck, AND discard for hazard presence.
- **Problem**: Hazards buried in your deck face-down are "active" — restricting you even when you haven't drawn them.
- **Impact**: Once you receive a hazard, it affects you EVERY turn forever until cleared, even if it's shuffled deep in your deck.
- **Suggestion**: Only check `player.hand` — hazards should only be active when drawn and visible. This matches the thematic intent (hazard is revealed, you deal with it) and most deck-builder conventions.

### Three Hazards Do Nothing

**Warrant Issued** — "Missions cost +2 Credits"
- Lines 1344-1348: Check exists but is just a comment. No credits are required or deducted.
- **Fix**: In `canCompleteMission()`, check `player.credits >= 2` when this hazard is active. In `completeMission()`, deduct 2 credits.

**Overloaded Circuits** — "Max +2⚡ from cards this turn"
- No enforcement anywhere in `applyCardEffects()` or `playCard()`.
- **Fix**: Track `powerGainedFromCards` on the player. In `applyCardEffects()`, cap total power gain when this hazard is active.

**Thruster Jam** — "Can't move more than 1 space"
- Lines 853-856: Empty if-block, never prevents movement.
- **Fix**: Track `spacesMovedThisTurn` on the player. In `move()`, reject if >= 1 and hazard is active. (Note: this should count all moves, not just engine-powered ones.)

### Hazard Deck Exhaustion
- Only 21 hazard cards total (sum of all copies across 11 types).
- In a 4-player aggressive game, deck could empty quickly.
- Weapons system abilities become useless when hazard deck is empty.
- **Suggestion**: Consider recycling cleared hazards back into the hazard deck (shuffle them back in). Or increase copies of common hazards.

---

## 7. Captain Balance

### Engineer Is Overpowered
- **Effect**: +1 to all four starting systems = +4 total power per turn
- **Comparison**:
  - Veteran: +1 to highest = +1/turn
  - Tycoon: +1 credit = ~0.67 power equivalent
  - Navigator: 1 free move = ~1 engine power
  - Scrapper: +3 logistics (strong but single-system)
  - Ghost: -1 all = **-4/turn** with conditional draw
- **Engineer's 8 starting power** lets them complete Near missions without playing cards AND have power left over.
- **Suggestion**: Reduce to +1 in two systems (player chooses at game start), or +1 all but reduce max power to 5 in each system.

### Broker Ability Is Silently Broken
- Lines 1639-1642: After system activation, there's a comment "Can activate again - handled by UI"
- The engine marks abilities as used (`usedSystemAbilities[system][abilityIndex] = true`) but the Broker's "reset one ability" logic is never implemented.
- **Fix**: After Broker activates a system, if `!player.usedCaptainAbility`, present option to reset that ability's used flag. Mark `usedCaptainAbility = true` after.

### Ghost Is Severely Underpowered
- -1 to ALL systems = starts with 0/0/0/0 power
- Compensation: +1 card when drawing a hazard (situational, may never trigger)
- **Net**: Worst starting position in the game, with a reward that requires opponents to give you hazards
- **Suggestion**: Change to -1 in two systems (not all four), or improve the draw trigger to "+2 cards when revealing a hazard"

---

## 8. Engine Logic Bugs

### Movement Cost With Scrambled Controls
- Lines 1785-1794: When moving via engine power (not free move), the cost calculation is correct (checks `scrambled-controls` hazard).
- However, the `canActivateSystem` check (line 1531) is used to determine if the player can move, but the MOVE dispatch bypasses the normal `activateSystem` flow. This means the engine ability isn't marked as "used" for movement, which is correct (movement shouldn't prevent draw1 from computers), but the hazard cost increase IS applied, which is also correct. This seems fine.

### Buy Discount Edge Case
- Line 1232: `player.buyDiscount = 0` after ANY buy, even if the discount came from an install effect that should persist.
- If an installation gives `buyDiscount: 1` every turn (via `applyInstallationEffects`), it gets reset after the first buy. The next buy that turn is full price.
- **Question**: Is this intentional? If so, it should be documented. If not, track "base discount from installations" separately from "temporary discount from played cards."

---

## 9. Suggested Card Replacement

### Replace Countermeasures (Tier 1, Logistics)
- **Current**: "+2 Credits. Reaction: Block hazard, draw 1 card"
- **Problem**: Reaction system is unimplemented. Even if implemented, holding a card in hand waiting for a trigger is feel-bad in a game where you want to play everything.
- **Suggested replacement**: **"Salvage Run"**
  - Tier 1, Logistics, Cost 3
  - Effect: "+1 Credit, +1⚡ Logistics. May trash a card from hand."
  - Rationale: Gives economy + power + early deck thinning. Currently, trashing requires 3⚡ Logistics (expensive). This gives accessible early trashing. Copies: 4 (same as other T1 cards).

---

## Priority Order for Fixes

### Phase 1: Make Existing Cards Work
1. Implement `hazardAllAtLocation` and `hazardAll` (affects Pulse Grenade, Chain Reaction, Detonator Relay)
2. Implement `bonusIfHadHazard` check (affects Scrap Shot)
3. Implement `fameIfHazards` check (affects Scorch Protocol)
4. Implement `mustTrash` as mandatory (affects Cargo Jettison)
5. Implement `oneTimeUse` tracking (affects Temporal Jump, Detonator Relay)
6. Fix Warrant Issued, Overloaded Circuits, Thruster Jam hazards

### Phase 2: Fix Core Balance
7. Fix `playerHasActiveHazard` to only check hand (not deck/discard)
8. Add tiebreaker logic to `endGame()`
9. Fix Broker captain ability in engine
10. Address Near Space snowball (choose one option from Section 5)

### Phase 3: Redesign Broken Cards
11. Redesign Synced Loop (both play and install effects)
12. Add credits to Refit Contract play effect
13. Simplify Thruster Array to `powerChoice: 2`
14. Simplify Remote Uplink install to `powerChoice: 1`
15. Simplify or redesign Interceptor Mode conditional

### Phase 4: Implement Complex Missing Features
16. Implement trophy passive trigger system
17. Implement Echo Engine play-from-discard
18. Implement Temporal Jump extra turn
19. Implement Mag-Leash move-other with target selection
20. Replace Countermeasures with Salvage Run (or implement reactions)
