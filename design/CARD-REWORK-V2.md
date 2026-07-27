# Card Rework V2 — post-markup (July 2026)

Supersedes `CARD-REWORK-2026-07.md` where they differ. ✅ = approved by Josh, unchanged from v1.
Everything else here reflects the markup round.

---

## 1. Costing framework (revised)

One change: **Trash 1 card = 3.0** (was 2.0) — at or above printed Fame. Rationale confirmed by
your instinct: a trash compounds every reshuffle for the whole game; a Fame point is one point.
Ladder: **trash 3.0 ≥ fame 2.5–3 > flexible ⚡ 1.5 > fixed ⚡ 1.25 ≈ draw > move 1.0 > credit 0.8**.

Cost checks under the new trash value: Efficient Routing 5 ✓ (2cr + may-trash ≈ 4.6) ·
Cargo Jettison 5 ✓ (forced trash is worth a bit less than optional ≈ 2.5, + 2⚡ = 5.5) ·
Salvage Network 6 ✓ (3cr + trash-up-to-2 ≈ 8 — actually now *undercosted*; consider 7 or
"trash up to 1"). Forgotten Vault's trash-2 reward is now a premium reward — appropriate for deep.

## 2. Hazard economy — my recommendation on the 2⚡ question

**Yes — raise the Weapons ability to 2⚡ (at location), and raise "anywhere" to 4⚡.** Reasoning:

- The math agrees with your playtesters. Giving costs 1⚡; clearing costs the victim ~2⚡/2 cards
  (rising if you ever adopt episode escalation), plus the held-hazard effect, plus −1 Fame exposure.
  The attacker profits on every flick, so the dominant line is "flick every turn" — which is
  exactly the "too easy" *feel* they reported. At 2⚡ it's a real decision, still slightly
  attacker-favorable (the victim's total cost is higher), so hazards keep flowing.
- **Keep hazard-giving CARDS as printed.** The cards already pay via purchase cost — this change
  only taxes the repeatable ability spam. Side benefit: Scrap Shot, Energy Recoil, Pulse Grenade
  et al. become *relatively better*, which pushes hazard delivery toward cards (fun, varied)
  and away from ability-flicking (monotonous). That's the right shape.
- 3⚡→4⚡ for "anywhere" preserves the range premium (otherwise range would cost just +1 over the
  new base).
- It's already on the GenCon feedback sheet ("did hazards ever feel threatening?") — ship the con
  build at 2⚡/4⚡ and let the sheets confirm.

## 3. Locked from v1 ✅

Refit Contract (hand-delivery install) · Market Insider → shop-anywhere · Trade Nexus → buy→+1⚡ ·
Remote Uplink (reallocate 3) · Feedback Surge → 5 · Synced Loop (install-synergy pair) ·
**all nine mission reworks** (with one amendment below) · Siphon Array · Leech Coupling* ·
ability-chips concept.

*Leech Coupling caveat: it triggers on an opponent's turn (they complete a mission at your
location → you gain 1⚡). You vetoed off-turn *credit* tracking (Toll Authority). If power-dial
changes off-turn bother you too, the on-turn variant is: "At the start of your turn: +1⚡ if
another player is at your location" — but that's a state check. Flag for playtest; keep as-is
for now since power dials are chunky and the event is rare/memorable.

## 4. Revised reworks (your markup applied)

| Card | V2 design |
|---|---|
| **Chain Reaction** (6/3, W, fame 1) | Play: **"Give a hazard to up to 2 different opponents. +2⚡ per hazard given."** — hard cap kills the 4p blowout (2p: 1 hazard, 3–4p: 2, rate constant). **Install: "Your hazard-giving cards and abilities may target players at any location."** — a range rule-bender that's actually worth a slot, on-name (your hazards *chain* to anyone), and synergizes with the 2⚡/4⚡ ability change (installed, you never pay the range premium again). |
| **Phase Skip Drive** (6, E, fame 2) | Play: +3 moves, mission −2⚡. **No install.** A pure T3 play-bomb — the wordy pseudo-move install is gone. |
| **Temporal Jump** (8, C, fame 1) | Once/game extra turn. **No install.** Priced like the haymaker it is. |
| **Cargo Jettison** (5/2, L) | Play: trash a card, +2⚡. Install: **+1⚡ each turn** (simple; the discard-conversion moved to its own card ↓). |
| **NEW — Scrap Furnace** (T2, 5/3, L) | Play: **"Trash a card: +2⚡ (choose)."** Install: **"Any number of times on your turn: discard a card → +1⚡ (choose)."** — *unbounded*, per your call. Trash-into-treasure, literally burning cargo for thrust. Watch in testing: with big draw engines this can convert whole hands into power; if it runs away, the fix is "up to 3/turn," but start unbounded. |
| **Forbidden Artifact** (mid gear) | +2⚡ each turn. **Game end: −2 Fame if still installed.** Agreed — at −1 keeping it was almost always right (no decision); at −2 (≈ a whole near mission) you genuinely sweat. Note the eviction rule so it's explicit: *gear slots can only be overwritten by another gear reward* — so escaping the curse means completing another gear mission and slotting it there. The curse is a quest. |
| **Forgotten Vault** (deep **bolt**) | To clear up the confusion: the end-game penalty is **gone entirely** in this rework. It's now a simple immediate reward: **"+3⚡ (choose) and you may trash up to 2 cards from your hand or discard."** You visit the vault, power up, and abandon your junk in it. Nothing to remember later, no negative anything. |

## 5. Rule-bender roster (V2)

**The pattern, per your note:** modest play effect (~3 credits of value) + spicy install, priced
so **buy + install ≈ 6 credits** — achievable in one good economy turn.

| Card | Play (cheap) | Install (the point) | Cost |
|---|---|---|---|
| **Remote Ops** (C) | +1 card, +1⚡ | You may complete missions at locations adjacent to yours as if you were there | 3/3 |
| **Pursuit Drive** (E) | +1 move, +1⚡ | Once per turn: move directly to any location where another player is | 3/3 |
| **Repulsor Blast** (W) *(was Tow Cable — it pushes, so now it's named like it pushes)* | Push a player at your location 1 space (your choice of direction), +1⚡ | If you pushed a player this turn: +1⚡ | 3/2 |
| **Survey Probes** (C) | +1 card | You may look at face-down missions at locations adjacent to yours at any time | 3/2 |
| **Overdrive Governor** (E) | +2⚡ (choose) | **Your systems can hold 8⚡ instead of 6** | 4/3 |
| **Auto-Dock** (L) | +1 credit, +1 move | When you move onto a station: +1 credit | 3/2 |
| **Express Lane** (L) | +2 credits | Cards you buy may be placed on top of your deck | 3/2 |
| **Salvage Rig** (W) | +1⚡, clear one of your hazards for free | When you clear a hazard: +1⚡ (choose) | 4/2 |

**The Tuning Chip cycle** (T2, one per system — the "tune the ship" class you loved; each chip
physically sits beside the system it modifies, zero tracking):

| Chip | Play | Install |
|---|---|---|
| **Overclocked Processor** (C, 3/2) | +2⚡ Computers | Your Computers 1⚡ ability draws **2** cards |
| **Hair Trigger** (W, 3/2) | +2⚡ Weapons | Your Weapons give-hazard ability costs **1 less** ⚡ |
| **Fuel Injector** (E, 3/2) | +2⚡ Engines | Your Engines 1⚡ ability moves **2** spaces |
| **Bulk Contracts** (L, 3/2) | +2⚡ Logistics | Your Logistics 1⚡ ability yields **2** credits |

(Hair Trigger deliberately offsets the 2⚡ hazard bump for the dedicated aggressor — the archetype
pays an install to get the old rate back. Note Merchant Escort's trophy duplicates Bulk Contracts'
upgrade — differentiate by keeping the trophy version and, if both feel same-y, retheming the
trophy to "+1 credit when you complete a mission.")

**Cut:** Toll Authority (off-turn credit tracking — your veto, now a standing rule: no
bookkeeping on other players' turns).

## 6. Captains V2

Arrays sum to **5**; allowed shapes now **{3,1,1,0}, {2,2,1,0}, or {2,1,1,1}** — zeros optional,
used only where the weakness is the flavor.

| Captain | W/C/E/L | Ability |
|---|---|---|
| Scientist | 0/3/1/1 | Your Computers 3⚡ ability keeps 2 |
| Veteran | 3/1/1/0 | When you give a hazard: +1⚡ (choose) |
| Navigator | 1/1/3/0 | Once per turn: 1 free move |
| Scrapper | 1/1/0/3 | When you trash a card: +1 credit |
| Tycoon | 0/2/1/2 | Credits carry over between turns (max 3) |
| Broker | 1/2/0/2 | Once per turn: activate one system ability twice |
| Engineer | 1/2/1/1 | When you install a card: +2⚡ (choose) |
| Mercenary | 2/1/2/0 | When you give a hazard: +1 credit |
| **Daredevil** | 2/1/1/1 | When you clear a hazard: **+1⚡ (choose) and +1 credit** — Fame removed; you were right, with hazards flying every turn a Fame faucet would run wild. This version makes being attacked *fuel*, not points. |

## 7. Pool & interaction assessment (post-V2 snapshot)

**Pool size:** 43 current action cards + ~13 new (8 benders + 4 chips + Scrap Furnace) ≈ **56**,
minus any cuts. Market setup samples stacks from the pool, so a bigger pool = more game-to-game
variety with zero rules cost. (CLAUDE.md's "34 cards" is stale — it's been 43 for a while.)

**Interaction share:** currently ~11/43 (~26%) touch opponents. V2 adds Pursuit, Repulsor, Siphon,
Leech (+ hazard suite unchanged) → **~30%**, right at the 30/70 direct/indirect target. The new
interaction is positional (be where they are / move them / mooch off them) rather than take-that —
the healthier kind.

**System identity after V2:**
- **Weapons** — hazards + the fight-adjacent toys (Repulsor, Salvage Rig, Hair Trigger). Better,
  still thinnest; Season 2's Hunter is its real payoff.
- **Computers** — draw + information (Survey Probes) + reach (Remote Ops). Strong, varied.
- **Engines** — movement + tempo (Pursuit, Overdrive, Fuel Injector). Strong.
- **Logistics** — economy + trash (Scrap Furnace, Express Lane, Auto-Dock). Fixed by this pass:
  its cards now *do things* instead of discounting things.

**Open cost flags:** Salvage Network at 6 is now undercosted under trash=3 (→ 7, or trash-up-to-1);
Overdrive Governor's cap-raise is untested (8⚡ banks are big — watch it).

**Print delta from current physical set:** ~14 changed cards + ~13 new + captain cards.

---

## 8. V2.1 addendum (second markup round)

- **Tuning chips are Tier 2** (Station 3), 3/2 each: cheap play effect + the ability-upgrade install.
- **Weapons Core (T1) install → "Your Weapons abilities cost 1 less ⚡."** (User call — replaces the
  weak give-hazard-discard rider; makes aggression accessible from Tier 1. With the 2⚡/4⚡ ability
  bump this restores the old 1⚡ local flick for anyone who invests the install.) Consequence:
  **Hair Trigger is cut** — the chip cycle is now three (C/E/L); Weapons' upgrade lives at T1.
- **NEW — Intimidation** (T2, 4/3, W): Play: *"+1⚡ Weapons. This turn, you may spend Weapons ⚡ as
  credits when buying (1:1)."* Install: *"Once per turn: convert up to 2 Weapons ⚡ → 2 credits."*
  Menace the shopkeeper. Spending persistent power as evaporating credits is self-balancing (you're
  trading your best resource for your worst), but it gives Weapons builds a buy engine and makes a
  banked W6 a burst wallet. Synergy note: makes the Veteran array (W3 start) buy-capable turn 1.
- **Scorch Protocol flagged (missed in v1/v2):** "+1 Fame if 3+ hazards in your deck" is a
  continuous-state count — Fiddliness Rule violation. Rework candidate: *"Play: +4⚡. If you cleared
  a hazard this turn: +1 Fame."* (discrete, same-turn) — or cut.
- **Cull list (replaced by better uniques; pending Josh's approval):**
  1. **Impulse Boosters** (T2 E) — statless stat-mix; the engines suite has 5 near-identical cards.
  2. **Thruster Array** (T2 E) — redundant with Tactical Vectoring.
  3. **Energy Recoil** (T2 W) — blandest hazard card + fiddly conditional install; Intimidation and
     Repulsor Blast take its slot.
  4. **Credit Surge** (T2 L) — pure vanilla credits (weakest resource); its job is now done by
     Trade Nexus, Intimidation, Auto-Dock, Fame cards.
  5. **Singularity Drive** (T3 E) — the dullest T3; T3 should be splashy.
  Net pool with adds: ~51 cards. (Keep: Interceptor Mode, Cyber Reflex, Nav Prediction, Gravity
  Sling — its "moved 2+ this turn" is same-turn short-term memory, acceptable.)
