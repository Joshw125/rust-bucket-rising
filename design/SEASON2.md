# RUST BUCKET RISING — "Season 2" Ruleset (Design Spec)

**Status:** Design draft for review — NOT implemented. The current game ("Season 1", the 1–6 line
board) is untouched and remains the shipping version. Season 2 is a distinct ruleset to be
prototyped in the arena and A/B'd against Season 1 before any commitment.

**Numbers marked ⚙ are first-pass proposals** — expect tuning. Items marked ❓ are open design
decisions the designer (Josh) has not yet made.

---

## 1. What carries over from Season 1 unchanged

- Deckbuilding core: 10-card starter (6/3/1 split and its opening-hand guarantee), draw 5, cleanup.
- Four systems (W/C/E/L), power 0–6 per system, **power persists** across turns.
- Credits reset each turn. *(Separate open thread: unified capped credit banking — not part of this spec.)*
- Installs: one per system, overwrite allowed, fire every turn start.
- Missions: hidden until visited ("Unknown Space"), finite zone pools, zero-sum claims.
- Fame cards (Model A): set-aside credit→Fame purchases at stations, tiered supply.
- Hazard card types and clear conditions (10 types) — delivery changes (see Hunter), cards don't.
- 25 Fame triggers the final round (unchanged rule — now the last boundary of the season track).
- Captains as currently shipped (their rework is a separate, pending effort).

## 2. The board: orbits around the sun

The sun sits at the center. It is not a location — it is the uncrossable middle of the arena.
Three concentric orbital rings, wider as they go out:

| Ring | Spaces | Zone | Notes |
|---|---|---|---|
| Inner | N1–N4 | Near | Home station starts here. |
| Middle | M1–M6 | Mid | |
| Outer | D1–D8 | Deep | The frontier — widest, most to explore. |

**Adjacency.** Every space connects to its two ring neighbors (rings wrap). Radial **gates**
connect rings at four points ⚙:

```
Gates (⚙ proposed):  N1–M1   N2–M3   N3–M4   N4–M6
                     M1–D1   M3–D3   M4–D5   M6–D7
```

Max distance N-space → D-space ≈ 4–5 moves. Movement costs 1 Engine power per edge (ring or
gate), exactly as Season 1; free moves work the same.

**Stations.** Three stations, one per ring: **S1** (Tier-1 market + Sponsor Plug fame card),
**S2** (Tier-2 + Syndication Deal), **S3** (Tier-3 + Prime-Time Special).

❓ **Station drift (proposed: YES).** Stations are ships, not places: at the end of each full
round, each station moves 1 space clockwise along its ring. Consequences: market camping is
physically impossible (the shop leaves you); intercepting a station becomes a small, fully
deterministic planning puzzle. Cost: one upkeep step (move 3 tokens). If drift feels fiddly in
testing, stations freeze and this line is deleted.

**Missions.** Zone pools map to rings (near pool on N spaces, etc.). Placement: one mission per
⚙ every-other-space at setup (N: 2, M: 3, D: 4 live missions), hidden until a player is at the
space. Completed missions refill from the pool at end of turn (Season 1 rule) until the episode
spine stops near-refills (see §3).

**Setup.** All players start at S1's space. Sun in the middle. Deep space dark and full of money.

## 3. The Season (episode clock)

**The Fame track is the season track.** Episode = determined by the **highest Fame any player has
ever reached** (high-water ratchet — the show never de-escalates).

| Fame high-water | Episode | Spine effects (always on, printed on the track) ⚙ |
|---|---|---|
| 0–4 | **Ep 1 — Premiere** | Calm. No modifiers. |
| 5–9 | **Ep 2 — The Hunt Begins** | **The Hunter enters play** at its den. |
| 10–14 | **Ep 3 — Mid-Season** | Hazard clear costs +1. Near missions stop refilling. |
| 15–19 | **Ep 4 — Sweeps Week** | Clears +1. Deep missions +1 Fame. |
| 20–24 | **Ep 5 — Finale** | Clears +2. All missions +1 Fame. |
| 25+ | Final round | Existing Season 1 rule, unchanged: everyone else gets one last turn. |

Expected pacing (from arena data: ~2 Fame/turn early, ~3.5 built): Ep2 around round 3, Sweeps
around round 6–7, Finale round 8–9, 25 by round 10–11. The season *converges* without a hard cap;
soft timers: finite mission pools, finite fame cards, near-refill stop, sweeps acceleration.
⚙ Optional backstop if testing shows drag: "the network cancels after round 12" (highest Fame wins).

**Timing note.** Crossing an episode boundary takes effect immediately — advancing the season is
a *choice you can time* ("if I complete this now, we go to Sweeps before my rival's turn").

## 4. Episode cards

One card per episode slot (Ep 2–5), drawn at setup from that episode's pool of ⚙ 3 designs
(12 cards total; Ep 1 is always clean). **All revealed at setup** — the season's TV guide.
Each card = the fixed spine line (reprinted for reference) + **one variable line**: a bounty or
a located event. Bounties are **open** — *"each player who X while this episode airs: +Y Fame
(once each)"* — never "first player to," per the turn-order fairness rule.

Starter set ⚙ (first-pass content, expects editing):

**Episode 2 pool — "The Hunt Begins"**
- *Meet the Hunter*: Each player who ends a turn adjacent to the Hunter without being caught this episode: +1 Fame. ("Get the close-up.")
- *Salvage Sweepstakes*: Event at **D5**: first ship to visit claims 3 credits + 1⚡ (choose).
- *Sponsor Day*: Fame cards cost −1 while this episode airs.

**Episode 3 pool — "Mid-Season"**
- *Filmed at M-Ring*: Missions on the mid ring +1 Fame while this episode airs.
- *Clean-Up Special*: Each player who clears a hazard this episode: +1 Fame.
- *Repo Blitz*: The Hunter moves +1 this episode; each player who repels it: +1 additional Fame.

**Episode 4 pool — "Sweeps Week"**
- *Live from Deep Space*: Deep missions +1 additional Fame (stacks with spine).
- *Celebrity Cameo*: Pop-up mission at **D2** worth 3 Fame, no power cost, first-come — expires
  when this episode ends.
- *Betrayal Special*: Each player who paints or bribes the Hunter onto an opponent this episode: +1 Fame.

**Episode 5 pool — "Finale"**
- *Showdown*: Each player who completes a mission on the Hunter's ring this episode: +2 Fame.
- *The Gauntlet*: Missions +1 Fame if the Hunter is within 2 spaces when you complete them.
- *Last Dance*: Each player who repels the Hunter this episode: +2 Fame instead of +1.

Elegance guards: max one located event per episode (printed on the card), events expire when the
episode changes (self-cleaning board).

## 5. The Hunter

The show's own enforcer — every season has a villain. *(Running Man frame: it is sent, staged,
and on the payroll. Not a pirate; nothing in this game comes from outside the show.)*

**Entry.** When Episode 2 begins, place the Hunter at its den. ❓ Den proposed: **D5** (released
from the outer gate — deep space is its turf, making the frontier risky early; alternative: it
launches from S1 "escorting" players off the premises. Designer's call.)

**Movement.** At the end of each full round: roll d6, **capped at the current episode number**.
The Hunter moves that many spaces by shortest path toward the **nearest ship** (tie → highest
Fame: *it hunts the star*; still tied → clockwise). It stops when it enters a ship's space.
*(Capped-die property: at cap 2 it moves max on 83% of rolls — nearly deterministic; by the
finale the cap rarely binds — erratic terror. Predictable when weak, wild when strong.)*

**Catch** (enters your space) ⚙:

| Episode | Effect on caught ship |
|---|---|
| 2–3 | Takes 1 hazard ("roughed up on camera") |
| 4 | 1 hazard + drain 2⚡ from your highest system |
| 5 | 2 hazards + drain 2⚡ |

⚙ Optional anti-misery valve if testing shows pile-ons: a caught player also gains +1 Fame
("screentime"). Not exploitable — one catch per round, and the trade is terrible on purpose.

**The four verbs.** Every system has a native answer to the Hunter — no single system is
mandatory:

| System | Verb | How |
|---|---|---|
| Engines | **Flee** | Movement, as ever. |
| Weapons | **Fight** | Base ability (replaces the 3⚡ give-hazard-anywhere): *3⚡, Hunter in your or an adjacent space: repel it 2 spaces, +1 Fame.* Crowd goes wild. |
| Weapons | **Paint** | Card effect (Targeting Array): designate a ship — the Hunter treats them as nearest this round. Laser designation: you don't steer it, you illuminate the target. |
| Computers | **Jam** | Card effects: the Hunter cannot target you this round / spoof a transponder. |
| Logistics | **Bribe** | Card effects: pay credits to move or re-task it. Everyone knows the show is rigged. |

**Three named Hunters** — draw 1 per season (a card, same variety slot as episode cards) ⚙:

- **The Reckoner** — the default. Exactly the rules above.
- **The Collector** — on catch, also exiles the top card of your deck beneath it. Repelling it
  returns all exiled cards to their owners' discards (+1 Fame as usual). Fighting it is a rescue.
- **The Saboteur** — slower (cap = episode −1, min 1) but catch inflicts 2 hazards from Ep 2.
  Cannot be repelled — only jammed, bribed, or fled. (The fighter build's nightmare season.)

## 6. Weapons suite rework (mostly retext)

Principle: weapons power does weapons things — **shoot ships** (hazard = battle damage: the
fiction was always sound, just unstated) and **fight the Hunter**. "Give a hazard" via abstract
gifting is deleted as a base ability; hazards flow from gunfire (cards) and the Hunter.

| Card | Disposition |
|---|---|
| Weapons Core, Energy Recoil, Scrap Shot, Pulse Grenade | **Retext only** — "fire on a ship at your location: give a hazard" framing. Mechanics unchanged. |
| Expensive Countermeasures (+ block-hazard reactions) | **Unchanged — finally good**: point defense vs Hunter hits and rival fire. |
| Mag-Leash | Retext as harpoon (drag ship + damage). **Fix the known text/data bug** in passing. |
| Targeting Array | **New install effect (replaces dead code): "Once per turn: paint a ship — the Hunter treats it as nearest this round."** On-name, on-theme, resurrects the card. |
| Overload Conduit | ❓ Keep as long-range fire (hazard at range) or convert to a big repel. |
| Chain Reaction, Detonator Relay, Scorch Protocol (T3) | Retext as barrage flavor; mechanics intact. |
| **NEW: Warning Shots** (T2 ⚙ cost 3) | Play: repel the Hunter 1 from anywhere on its ring, +1⚡. Install: your repels push +1 further. The fighter build's enabler. |
| System ability change | Weapons 3⚡ ability becomes **Fight** (see §5). Weapons 1⚡ ability: fire on a ship at your location → give a hazard (unchanged mechanically, retexted). |
| Captain re-pointing | Mercenary ("give hazard: +1 credit") triggers on gunfire hazards as before; Infiltrator unchanged. ❓ Revisit both in the captain rework. |

## 7. What this ruleset is (honest sizing)

Season 2 ≈ a 60–75 minute medium game (Season 1 is 45–60 light-medium). It adds: one moving
piece (Hunter), one upkeep step per round (Hunter move; +station drift if kept), ~3 rules lines,
a bigger board, and a retexted weapons suite. In exchange: the hazard subsystem gets guaranteed
relevance (the Hunter is a faucet — hazards flow even at passive tables and in 2p), all four
systems get differentiated verbs against a common threat, aggression becomes positional and
visible, movement becomes tactical, and **scoring feeds the monster** (fame → episode → Hunter
speed → hunts the leader): a self-balancing loop with zero rubber-band rules.

## 8. Open decisions (designer)

1. ❓ Station drift: literal (proposed) or flavor-only?
2. ❓ Gate positions / count (4 proposed — fewer = tighter routing tension).
3. ❓ Hunter den: deep space (D5, proposed) or home station launch?
4. ❓ Overload Conduit: ranged fire or repel?
5. ❓ Credit banking (separate thread — interacts with Bribe costs).
6. ⚙ All numbers: episode thresholds, catch table, bounty values, ring sizes, mission density.

## 9. Test plan (arena, in layers)

1. **Graph board** — port arena to adjacency lists; agents play Season-1 rules on the ring board.
   *Question: does routing change behavior at all?*
2. **Episode spine** — zones + spine effects, no cards. *Question: does the game converge
   (~10–11 rounds)? Does the Fame curve rise like a finale?*
3. **The Hunter** — Reckoner only. *Questions: catch frequency (target ⚙ 2–4/game), do agents
   flee/fight/jam, does anyone force-buy engines every game (alarm), 2p leader-tax feel?*
4. **Episode cards + variants** — content layer last. *Question: do located events actually
   pull movement?*

Each layer A/B-able against Season 1 with identical agent prompts. Season 1 code stays frozen
throughout — Season 2 lives behind a ruleset flag or a branch until it earns its keep.
