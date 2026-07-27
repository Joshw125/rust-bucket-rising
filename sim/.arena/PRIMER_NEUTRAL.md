# Rust Bucket Rising — Player Reference

You control one seat in a 2-player game. Goal: be the first to reach **25 Fame**.

## Mechanics
- 4 systems: Weapons(W) Computers(C) Engines(E) Logistics(L), each holds 0–6 power.
- Power persists across turns (accumulates, capped 6/system). It is removed when you spend it
  (completing missions, using system abilities) or when a hazard drains it. Installations and your
  captain re-add power at the start of each turn.
- Credits reset each turn — unspent credits are lost. Spend them the same turn buying/installing cards.
- Board: 6 locations in a line. Card markets (stations) are at locations 1, 3, 5, selling Tier 1, 2, 3
  cards respectively. Missions sit at every location. Missions at locations you have not visited are
  hidden until someone is there.
- Mission Fame by region: locations 1–2 give 2 Fame, locations 3–4 give 3–4, locations 5–6 give 5–6.
  To complete a mission you pay its required power (spent permanently) and gain its Fame + reward.
- Moving 1 space costs 1 Engine power, unless you have a free move (from a card or captain).
- System abilities (spend power; each usable once per turn): Weapons → give a hazard to a player at
  your location (1⚡) or anywhere (3⚡); Computers → draw 1 (1⚡) or draw 3 keep 1 (3⚡); Engines →
  move 1 (1⚡); Logistics → gain 1 credit (1⚡) or trash a card (3⚡).
- Hazards: given to opponents (they land in the opponent's discard; they are bad to hold and cost
  power/cards to clear). At game end, each player loses 1 Fame per hazard still in their cards.
- Installable cards: pay an install cost to slot a card into one of your 4 systems (one per system;
  installing overwrites). It fires its install effect every turn start.

## Captains
- Veteran: at turn start, +1 power to your highest system if that system has ≤2 power.
- Scrapper: started with +2 Logistics power (a one-time bonus that persists). No recurring ability.

## Driving your turn (command line; cwd = project root)
1. See your point of view and the numbered legal moves:  `npx tsx sim/arena.ts view`
2. Execute your whole turn in one command (quote each step):
     npx tsx sim/arena.ts do "step1" "step2" ... "end"
   Steps:
     play:CardTitle            (for "+X choose" power cards add an allocation summing to X, e.g. play:Cheap Battery:c=1)
     buy:CardTitle             buy top card of a revealed stack you're standing on (it enters your deck)
     buyinstall:CardTitle:system   buy AND install it (needs credits for buy + install cost)
     install:CardTitle:system  install a card already in your hand
     complete[:hint]           complete the mission at your location (if reward is a choice: complete:credits or complete:power; if "choose system" power reward: complete:weapons etc.)
     move:fwd | move:back      move 1 space (costs 1 Engine power unless you have a free move)
     activate:system[:abilityIndex]   e.g. activate:logistics:0
     reveal:stackIndex         reveal a market stack (one per station per turn; Tier-1 station is pre-revealed)
     clear:HazardTitle         clear a hazard in your hand
     end                       end your turn — REQUIRED as the final step
   The output shows ✓/✗ per step (✗ includes a reason) and your resulting state.

Notes: play exactly one turn (yours), ending with `end`. Earn credits before buying; raise the needed
power before completing a mission. To buy at a Tier 2/3 station, be there and `reveal` a stack first.
Use only `view`/`do` to gather information.
