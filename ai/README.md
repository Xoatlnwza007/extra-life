# NPC AI modules

These modules are framework-independent helpers for the One Piece Life Simulator. They do not read the DOM or write to storage; the game layer owns loading and saving character state.

## Browser load order

Load the scripts in this order before the game code that creates or updates NPCs:

```html
<script src="./ai/decision-engine.js"></script>
<script src="./ai/character-state.js"></script>
<script src="./ai/npc-brain.js"></script>
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
// Example only: localStorage.setItem('npc-001', JSON.stringify(npc));
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

The returned `ranking` includes each candidate's score and scoring reasons, which can be used for debugging or NPC activity logs. The adapter selects an action; it does not execute game effects itself.

## Current integration boundary

The modules are committed on `one-piece-development`, but the legacy game entry point (`index.html`) has not yet been modified to load or call them. Integration should happen at the existing NPC activity-selection and save/load boundaries, after confirming those exact hooks in the large legacy file. This avoids replacing or destabilizing the original game loop.
