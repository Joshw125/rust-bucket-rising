# Rust Bucket Rising — Player Primer (for arena seat-brains)

You control ONE seat in a 2-player game. Play to WIN (first to **25 Fame**). We are also
stress-testing balance — flag anything degenerate/confusing/exploitable.

## Rules
- 4 systems: Weapons(W) Computers(C) Engines(E) Logistics(L), each 0–6 power.
- **POWER PERSISTS** across turns (accumulates, capped 6/system); only removed by SPENDING
  (completing missions, system abilities) or hazard drains. Installs + captain re-add power each
  turn start. Power is durable & scarce — **"fame per power spent" is the key metric.**
- **CREDITS RESET** each turn (unspent = lost). Spend them the same turn buying/installing cards.
- Stations (markets) at locations 1/3/5 sell Tier 1/2/3 cards. Missions at every location;
  L2–6 hidden until visited. Near(L1-2)=2 fame, mid(L3-4)=3-4, deep(L5-6)=5-6. **Near space totals
  only 20 fame, so you must push outward to reach 25.** Mission = pay the required power
  (permanently) → gain fame + reward.
- Moving 1 space costs 1 Engine power (or a free move from a card/captain).
- System abilities (spend power, once each/turn): Weapons→give hazard (1⚡ at location / 3⚡ anywhere);
  Computers→draw1(1⚡)/draw3keep1(3⚡); Engines→move1(1⚡); Logistics→gain1credit(1⚡)/trash card(3⚡).
- Hazards: give to opponents (land in their discard; bad to hold; cost power/cards to clear).
  End-game: −1 fame per hazard still in your cards.
- Installable cards: pay install cost to slot into a system (one per system; overwrites); fires its
  install effect every turn start — the main way to scale.

## Captains
- Veteran: turn start +1 power to your highest system, but only if that system has ≤2 power.
- Scrapper: started with +2 Logistics power (one-time; persists). No recurring ability.

## How to play your turn (command line; cwd = project root)
1. See your POV + numbered legal menu (shows only the current player — that's you):
     npx tsx sim/arena.ts view
2. Execute your whole turn in ONE command (quote each step):
     npx tsx sim/arena.ts do "step1" "step2" ... "end"
   Intent grammar:
     play:CardTitle                  play a card. For "+X choose" power cards add an allocation summing
                                     to X, e.g.  play:Cheap Battery:c=1   or   play:Impulse Boosters:e=1,w=1
     buy:CardTitle                   buy top card of a revealed stack you're standing on
     buyinstall:CardTitle:system     buy AND install (needs credits for BOTH buy + install cost)
     install:CardTitle:system        install a card already in hand
     complete[:hint]                 complete the mission here. If reward is a choice: complete:credits or
                                     complete:power. If reward is "choose system" power: complete:weapons (etc.)
     move:fwd | move:back            move 1 space (costs 1 Engine power unless you have a free move)
     activate:system[:abilityIndex]  e.g. activate:logistics:0 (gain credit), activate:computers:1 (draw3keep1)
     reveal:stackIndex               reveal a market stack (only ONE per station per turn; T1 is pre-revealed)
     clear:HazardTitle               clear a hazard in hand
     end                             END your turn — REQUIRED as the final step
   Output prints ✓/✗ per step (✗ includes a reason, e.g. "need 5 credits, have 3") then your new state.

## Rules of engagement
- Play exactly ONE turn (your current turn); make `end` the final step.
- Earn credits before buying; raise the right power before completing a mission.
- To buy at a T2/T3 station: be there, then `reveal` a stack first.
- Use ONLY `view`/`do` to gather info (don't read raw state files).

## After your turn, report
SUMMARY: 2–4 sentences — what you did, your strategic intent, your read on the game.
OBSERVATIONS: bullets — anything off/degenerate/confusing/exploitable, or "none this turn".
