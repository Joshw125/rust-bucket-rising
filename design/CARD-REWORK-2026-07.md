# Card Rework — July 2026 (proposals for markup)

Everything here is a **proposal**. Nothing is in the app or sheets until approved. Organized as:
costing framework → the fiddliness rule → market card reworks → mission reworks → new-card menu →
captain framework.

---

## 1. Costing framework (exchange rates under persistent power)

The value ladder, in credits of card-cost:

| Resource on a card | ≈ value | Why |
|---|---|---|
| Trash 1 card | **2.0+** | Permanent deck improvement; compounds every reshuffle. The strongest common effect. |
| 1⚡ any-system ("choose") | 1.5 | Persists until spent; fully fungible. |
| 1⚡ fixed system | 1.25 | Persists, less flexible. |
| 1 card draw | 1.25 | |
| 1 explicit move | **1.0** | Single-use, this-turn-only — moves do NOT persist. |
| 1 credit | 0.8 | Evaporates at cleanup. |
| Give 1 hazard | 1.0 | Soft in Season 1. |
| 1 printed Fame | 2.5–3 | Direct win progress. |

**Your engine-power-vs-moves rule, formalized:** `+2⚡ Engines` (≈2.5) must cost more than
`+2 moves` (≈2.0), because power does everything moves do *and* pays missions *and* persists.
A card is fairly priced when its total value ≈ cost + ~0.5 (you pay a small premium for choice).

**Cost corrections implied** (play effects unchanged):

| Card | Now | → | Reasoning |
|---|---|---|---|
| Feedback Surge | 4 | **5** | +3⚡ choose ≈ 4.5. (Note: your physical print may say 3 — sheet & app both say 4; either way it's undercosted.) |
| Efficient Routing | 4 | **5** | +2 credits + may-trash ≈ 3.6+; trash is the premium part. |
| Cargo Jettison | 4 | **5** | Forced trash + 2⚡ ≈ 5. |
| Afterburner Surge | 4 | **5** | +3⚡ Engines play + 2⚡/turn install is the best raw engine in T2. |
| Temporal Jump | 6 | **8** | See §3 — the extra turn is worth more than any 6-cost effect. |
| Phase Skip Drive | 7 | **6** | Overpriced for what it does; see §3 install fix. |

---

## 2. The Fiddliness Rule (physical-first triggers)

**A card effect may only be:** (a) an always-on constant (+1⚡ each turn), (b) triggered by a
**discrete, momentary event** — complete a mission, buy a card, install, give/receive/clear a
hazard, move onto a space — or (c) a once-per-turn choice the owner initiates.

**Never:** continuous state checks ("if alone", "if you played 2+ cards", "if 3+ missions
completed", "whenever you gain credits"). The app automates them; a table can't. Every card you
flagged as annoying violates this rule — that's not a coincidence, it's the diagnosis.

---

## 3. Market card reworks

### The "boring discount" trio → rule-benders

| Card | New design |
|---|---|
| **Refit Contract** (5/3, L, fame 1) | Play: +2 credits, may trash 1 card. **Install: "Cards you buy go to your hand instead of your discard pile."** *(Buy it, play it this turn — the shipyard delivers pre-fitted.)* |
| **Market Insider** (4/4, L) | Play: +2 credits. **Install: "You may buy from any station's market, regardless of your location."** *(Your insider shops for you. Install cost up 2→4 — this bends a core rule.)* |
| **Trade Nexus** (7/4, L, fame 2) | Play: +4 credits. **Install: "When you buy a card, +1⚡ (choose)."** *(Commerce feeds the ship. Event-based engine, install 5→4.)* |

### The rest of your list

| Card | Problem | New design |
|---|---|---|
| **Remote Uplink** (3/2, C) | Reallocation too small | Play: **"Reallocate up to 3⚡ among your systems. +1 card."** Install: "Once per turn: reallocate 1⚡." *(Under persistent power, stranded power is a real problem — this is genuinely useful now.)* |
| **Efficient Routing** (5/2, L) | Trash too cheap | Cost → 5 (see §1). Play unchanged. Install: +1 credit each turn. |
| **Feedback Surge** (5/3, C) | Too cheap | Cost → 5. Otherwise unchanged. |
| **Cargo Jettison** (5/2, L) | Cheap + boring install | Cost → 5. **Install: "Once per turn: discard a card → +1⚡ (choose)."** *(Jettison dead weight for thrust — converts your late-game Supply Checks into power.)* |
| **Chain Reaction** (6/3, W, fame 1) | Scales badly in 2p; install unfun | Play: **"Give each opponent a hazard. +2⚡ per hazard given."** *(2p: 1 hazard +2⚡; 4p: 3 hazards +6⚡ — the per-hazard rate is constant.)* **Install: "When you give a hazard, the target also loses 1⚡ (their choice of system)."** *(Your energy-drain want, fused with hazards. Install 4→3.)* |
| **Phase Skip Drive** (6/3, E, fame 2) | Costs wrong, install weak | Cost 7→6, install 5→3. Play unchanged (+3 moves, mission −2⚡). **Install: "Once per turn, one of your moves may be 2 spaces."** *(It phases. On-name, simple.)* |
| **Temporal Jump** (8/2, C, fame 1) | Broken-good, install overpriced | Keep the extra turn — price it honestly: cost 6→**8**. Install 5→**2**, keep "Complete a mission: +1⚡" (event-based, fine — it was just absurd at 5). |
| **Synced Loop** (5/3, C, fame 1) | Card doesn't parse | Play: **"+1⚡ (choose) for each card installed on your ship."** Install: **"When you install another card: +2⚡ (choose)."** *(All install-synergy, all discrete. The loop syncs your systems.)* |

---

## 4. Mission reworks (rewards only; requirements/fame unchanged)

Every one of these replaces a continuous-state check with a constant or an event:

| Mission | Old reward | New reward |
|---|---|---|
| **Signal Boost** (near, gear) | +1⚡ if 3+ missions | **+1⚡ each turn** |
| **System Check** (near, gear) | +1⚡ if 2+ cards played | **At turn start, you may reallocate 1⚡ between systems** *(maintenance!)* |
| **Merchant Escort** (near, trophy) | If alone: +1⚡ | **Your Logistics 1⚡ ability yields 2 credits** *(ability-upgrade trophy — sits next to the system it modifies)* |
| **Trade Route Mapping** (near, trophy) | Gain credits → +1⚡ | **When you buy a card: +1⚡ (choose)** |
| **Deep Void Courier** (mid, gear) | +1⚡; if alone +1 credit | **+1⚡ and +1 credit each turn** |
| **Adaptive Drone** (mid, gear) | +2⚡ if 5+ cards | **At turn start: +1⚡ to your lowest system** *(it adapts)* |
| **Quantum Proxy Hack** (deep, gear) | +2⚡; solo mission +2⚡ | **+2⚡ each turn** |
| **Forbidden Artifact** (mid, gear) | +2⚡; EoG −1 Fame if kept | **+2⚡ each turn. Game end: −1 Fame if still installed on your ship** *(your phrasing — evict it by overwriting the slot to dodge the curse. Push-your-luck in one sentence.)* |
| **Forgotten Vault** (deep, **bolt** now) | +3⚡; EoG −2 credits | **+3⚡ and trash up to 2 cards** *(dump your junk in the vault — and your mission-trash wish delivered)* |

Also per your wish, trash already lives on Orbital Tax Evasion (trash 1), Hazard Bounty (trash a
hazard), Salvage Network — with Forgotten Vault that's 4 trash outlets. Suggest stopping there;
trash is the strongest effect in the game (§1) and scarcity is what makes it exciting.

---

## 5. New-card menu: interaction & rule-benders (pick your favorites)

Your three, specced:

1. **Remote Ops** (T3 install, ~6/4, C): *"You may complete missions at locations adjacent to
   yours as if you were there."* — the range upgrade.
2. **Pursuit Drive** (T2 install, ~4/3, E): *"Once per turn: move directly to any location where
   another player is."* — hunt the leader, shadow the rich.
3. *(Shop-anywhere lives on Market Insider above.)*

New proposals:

4. **Leech Coupling** (T2 install, ~4/2, C): *"When another player at your location completes a
   mission: +1⚡ (choose)."* — the mooch. Encourages shadowing; deliciously game-show.
5. **Siphon Array** (T2 play, ~4, W): *"Steal 1⚡ from a player at your location (you pick the
   system)."* — direct energy theft, positional.
6. **Toll Authority** (T3 install, ~6/4, L): *"When another player at your location uses a system
   ability: you gain 1 credit."* — passive-aggressive rent-seeking.
7. **Tow Cable** (T2 play, ~3, E): *"Move a player at your location 1 space in a direction you
   choose. +1⚡."* — bodyguard removal / drag them off their mission.
8. **Ability-chip class** (installs/trophies that upgrade a printed system ability): *"Your
   Computers 1⚡ ability draws 2"* / *"Your Weapons 3⚡ ability costs 2."* — physically clean
   (place the chip next to the system), zero tracking, and it makes the ship feel *tuned*.

All are discrete-event or owner-initiated — Fiddliness Rule compliant.

---

## 6. Captain framework: asymmetric starting arrays

**The rule:** every captain's starting power sums to **5** (up from base 4 — uniform across
captains, so no more Scrapper-6 vs Tycoon-4), shaped as **{3,1,1,0}** or **{2,2,1,0}**. The 3 is
your identity; the 0 is your weakness; the turn-1 guarantee survives because Cheap Batteries are
"choose" power and can patch any hole (worst-case opening hand still completes most near missions
or buys a card).

Plus **one simple, event-based ability** each (Fiddliness Rule applies to captains too).

Proposed slate (sketches for your markup — names/flavors flexible):

| Captain | Array (W/C/E/L) | Ability |
|---|---|---|
| **Scientist** *(new)* | 0/3/1/1 | Your Computers 3⚡ ability keeps 2 cards instead of 1 |
| **Veteran** | 3/0/1/1 | When you give a hazard: +1⚡ (choose) |
| **Navigator** | 1/1/3/0 | Once per turn: 1 free move *(unchanged — it was always good)* |
| **Scrapper** | 1/1/0/3 | When you trash a card: +1 credit |
| **Tycoon** | 0/2/1/2 | Your credits carry over between turns (max 3) |
| **Broker** | 1/2/0/2 | Once per turn: activate one system ability twice *(unchanged)* |
| **Engineer** | 0/2/2/1 | When you install a card: +2⚡ (choose) |
| **Mercenary** | 2/1/2/0 | When you give a hazard: +1 credit *(unchanged ability, new array)* |
| **Daredevil** *(new, replaces Ghost?)* | 2/1/2/0 | When you clear a hazard: +1 Fame |

Notes: Tycoon finally gets the banking you liked, at a modest cap. Veteran's dead guard is gone.
Daredevil makes *receiving* hazards almost welcome — a spicy playtest. Arrays are first-pass;
the invariant (sum 5, one 0, one 3-or-two-2s) is the part to keep.

---

## 7. What I did NOT touch

Engine Boosters, install-anywhere, gear first-tick timing (your standing rulings) · card
requirements/fame on missions · starters · hazard cards · Fame cards (still benched for GenCon).
