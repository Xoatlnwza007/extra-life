# NPC AI modules

These modules are framework-independent helpers for the One Piece Life Simulator. They do not read the DOM or write to storage; the game layer owns loading and saving character state.

## Browser load order

Load the scripts in this order before the game code that creates or updates NPCs:

```html
<script src="./ai/decision-engine.js"></script>
<script src="./ai/character-state.js"></script>
<script src="./ai/npc-brain.js"></script>
<script src="./ai/event-adapter.js"></script>
<script src="./ai/world-simulation.js"></script>
<script src="./ai/crew-system.js"></script>
```

## Create and persist an NPC

```js
const npc = OnePieceCharacterState.createCharacterState({
  id: 'npc-001',
  traits: ['brave', 'ambitious'],
  riskTolerance: 55,
  needs: { food: 45, rest: 70 }
});

// Persist with the game's existing save system.
```

## Add goals and memories

```js
let updated = OnePieceCharacterState.addGoal(npc, {
  description: 'หาเงินเพื่อซื้อเรือ',
  tags: ['work', 'money', 'ship'],
  priority: 75
});

updated = OnePieceCharacterState.remember(updated, 'เคยถูกโจรสลัดปล้นระหว่างเดินทาง', {
  tags: ['travel', 'pirates', 'danger'],
  importance: 4,
  polarity: 'negative'
});
```

Memories are capped at the latest 100 entries. The decision engine considers the latest 40 non-expired memories when scoring actions. Goals with status other than `active` are ignored. Call `advanceTime(character, now)` when the simulation clock advances to expire timed memories and overdue goals.

## NPC relationships and interactions

Relationship scores range from -100 to 100 and can be classified with
`relationshipLabel(score)`. Use `adjustRelationship` for a one-sided change,
or `interact(first, second, delta, options)` to update both characters'
relationship records independently:

```js
const result = OnePieceCharacterState.interact(npcA, npcB, 8, {
  replyDelta: 3,
  event: 'ช่วยกันปกป้องหมู่บ้าน'
});
npcA = result.first;
npcB = result.second;
```

The second character's change defaults to the same delta; set `replyDelta`
when the interaction affects each participant differently. The helper returns
new character objects and does not mutate the inputs.

## Let an NPC choose an activity

```js
const decision = OnePieceNPCBrain.decide(updated, [
  { id: 'work', label: 'ทำงาน', tags: ['work', 'money'], expectedReward: 8, risk: 5 },
  { id: 'travel', label: 'ออกเดินทาง', tags: ['travel'], expectedReward: 5, risk: 35 }
], { resourcePressure: 10, travelDanger: 20 });

if (decision.action) {
  // Execute the chosen action through the game's existing activity system.
  updated = OnePieceNPCBrain.recordOutcome(updated, decision, {
    event: 'NPC เริ่มทำงาน',
    tags: ['work'],
    importance: 1
  });
}
```

The returned `ranking` includes each candidate's score and scoring reasons, which can be used for debugging or NPC activity logs. The event adapter maps game event choices to AI candidates and returns the original selected choice object, so existing event handlers can continue to consume it.

## Current game integration

The annual world simulator maintains role-based NPC profiles, seeds long-term goals, chooses autonomous activities, records memories, and updates needs. Profiles are stored in `S.npcBrains` and should be serialized by the game's existing save/load flow. This is an initial annual simulation layer, not yet a full real-time NPC economy or a complete crew/relationship system.

### Simulate every living NPC

The original `simulate(worldState, npcList, context)` function remains a
single-NPC annual step for compatibility with the existing game loop. For a
full-population pass, call the optional `simulatePopulation` helper:

```js
const result = OnePieceWorldSimulation.simulatePopulation(S, npcList, {
  seaDanger: false
});
S.npcBrains = result.profiles;
// Use result.stories for a world-news or annual-summary panel.
```

It processes each living NPC once, carries updated profiles forward between
steps, skips dead NPCs, and returns per-NPC actions plus story summaries. When
an NPC helps or socializes, the pass also records a bilateral interaction,
updates both relationship scores, and stores the event in both NPC memories.
This helper is additive; it is not automatically wired into the game's annual
loop yet. Integrate it only after checking the existing game-loop performance
and save flow.

## Pirate crews

`crew-system.js` provides framework-independent crew management. A crew can
have a captain, a roster with roles, a ship name, a shared bounty, reputation,
and a bounded event history.

```js
let crew = OnePieceCrewSystem.createCrew({
  name: 'Straw Hat Pirates',
  captainId: 'luffy',
  shipName: 'Thousand Sunny'
});
const joined = OnePieceCrewSystem.joinCrew(crew, 'zoro', 'swordsman', {
  capacity: 10
});
crew = joined.crew;
crew = OnePieceCrewSystem.addBounty(crew, 30000000, 'defeated-a-warlord');
```

The helpers support joining, leaving, assigning non-captain roles, transferring
captaincy, looking up a member's active crew, increasing crew bounty, and
disbanding a crew. They also support reputation changes, crew-to-crew diplomatic
relations (allied, friendly, neutral, hostile, or at-war), and resolving a
crew encounter as a victory, defeat, or stalemate. An encounter updates both
crews' relation scores and reputation; a configured victory reward can also
increase the winning crew's bounty. The default capacity is 10; pass a different capacity when
joining if the game mode uses another limit. These are data-layer primitives:
they are not yet wired into the main game's recruitment UI, save flow, or
story events.

## Automated tests

Run the AI unit tests with Node.js 18 or later:

```sh
node --test tests/ai.test.js
```

The tests cover goal-aware action selection, negative memory weighting, memory expiry and limits, event-choice compatibility, NPC world simulation and social interactions, pirate crew membership rules, and crew diplomacy/encounter outcomes.
