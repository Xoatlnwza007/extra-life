# NPC AI modules

These modules are framework-independent helpers for the One Piece Life Simulator. They do not read the DOM or write to storage; the game layer owns loading and saving character state.

## Browser load order

Load the core scripts in this order before the game code that creates or updates NPCs:

```html
<script src="./ai/decision-engine.js"></script>
<script src="./ai/character-state.js"></script>
<script src="./ai/npc-brain.js"></script>
<script src="./ai/combat-adapter.js"></script>
<script src="./ai/world-simulation.js"></script>
```

In the main browser game, `index.html` loads `combat-adapter.js` before the battle code. `world-simulation.js` also loads `event-adapter.js`, `crew-system.js`, `devil-fruit-system.js`, and `haki-system.js` sequentially. The resulting promise is exposed as `OnePieceSystemsReady`; failed companion loads are recorded in `__onePieceModuleErrors`.

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

The returned `ranking` includes each candidate's score and scoring reasons, which can be used for debugging or NPC activity logs. For reproducible world-simulation tests, pass a seeded `random` function in the simulation context; the simulator uses it for stochastic goal completion and actor selection. Without an injected function, it retains the browser's default `Math.random` behavior. The event adapter maps game event choices to AI candidates and returns the original selected choice object, so existing event handlers can continue to consume it.

## Current game integration

The annual world simulator maintains role-based NPC profiles, seeds long-term goals, chooses autonomous activities, records memories, and updates needs. Profiles are stored in `S.npcBrains` and should be serialized by the game's existing save/load flow. This is an initial monthly population simulation layer, not yet a full real-time NPC economy or a complete crew/relationship system.

### Simulate every living NPC

The `simulate(worldState, npcList, context)` function remains compatible with
single-actor callers. In the actual One Piece game loop, a call with
`world: 'op'` automatically advances the full living NPC population. The
`simulatePopulation` helper is also available for explicit population passes:

```js
const result = OnePieceWorldSimulation.simulatePopulation(S, npcList, {
  seaDanger: false
});
S.npcBrains = result.profiles;
// Use result.stories for a world-news or annual-summary panel.
```

It processes each living NPC once per month, carries updated profiles forward between
steps, skips dead NPCs, and returns month-stamped per-NPC actions plus story summaries. When
an NPC helps or socializes, the pass also records a bilateral interaction,
updates both relationship scores, and stores the event in both NPC memories.
The existing game still presents a yearly `nextYear()` action. To avoid rewriting its very large bundled `index.html` before browser-level regression coverage exists, that yearly boundary now runs twelve ordered logical monthly population passes internally. Each NPC therefore makes one autonomous decision per simulated month; monthly action/interactions carry year and month fields, and `simulationCalendar` records `{ year, month, totalMonths }`. The current game loop only copies `npcBrains` from the result, so the simulator also writes the calendar to `S.npcSimulationCalendar`. The game's existing `save()` serializes the complete `S` object to `localStorage`, and `loadSaved()` parses it before `migrate(s)` adds legacy defaults; these paths preserve both fields without changing the large game bundle. Unit tests cover a JSON save/load round trip, continued simulation after loading, and a legacy save with no NPC metadata. This advances NPC behavior monthly, but does not yet convert the player's UI, age, money, or story-event cadence to monthly turns. NPC profiles are returned for the existing `S.npcBrains` assignment, while the monthly calendar is stored on `S.npcSimulationCalendar`; both are part of the existing game state and save/load flow.

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
joining if the game mode uses another limit. The main One Piece game now exposes a floating **ลูกเรือ** panel for living pirate-captain characters. Players can create a crew, recruit living NPCs, edit each recruit's role, buy the in-game small sailboat, name that ship, and dismiss non-captain members. The panel shows crew history, bounty and reputation. Recruiting or dismissing an NPC also records a memory and relationship change in that NPC's AI profile. The player's bounty and fame/dark balance synchronize to crew bounty and reputation. The crew roster and `playerCrewId` are stored directly on the game state (`S.crews` and `S.playerCrewId`), so the existing save/load flow persists them. Crew diplomacy and encounter resolution remain helper APIs; they are not yet connected to the game's story events or combat outcomes.

## Automated tests

Run the AI unit tests with Node.js 18 or later:

```sh
node --test tests/ai.test.js
```

The tests cover goal-aware action selection, negative memory weighting, memory expiry and limits, event-choice compatibility, NPC world simulation and social interactions, pirate crew membership rules, crew diplomacy/encounter outcomes, and seeded replay consistency over 1, 12, 60 and 240 annual game advances. Each One Piece advance now contains twelve monthly NPC population passes (up to 2,880 months in the longest replay test). The player's UI and story events remain annual.


## Devil Fruits

`devil-fruit-system.js` provides pure helpers for creating valid Paramecia,
Zoan and Logia fruit records, consuming a fruit (one per character and one
consumer per fruit record), training mastery from 0–100, and awakening at a
configurable mastery threshold (80 by default). `getSeaEffect` reports the
baseline swimming/weakness effect in seawater and a stronger penalty for Sea
Prism Stone exposure. The main game already has its own Devil Fruit discovery event and power flags. This helper remains a separate mastery/awakening data model; it is loaded by the browser bootstrap but is not yet synchronized with the game's existing `S.flags.df` / `S.powers` values or combat outcomes.

Load this module after the other AI helpers:

```html
<script src="./ai/devil-fruit-system.js"></script>
```


## One Piece combat power modifiers

The main battle loop now uses `ai/combat-adapter.js` for baseline bonuses from
existing unlocked power IDs in `S.powers`. Paramecia, Zoan and Logia fruits
provide distinct offensive bonuses; Zoan and Logia also provide durability
bonuses. Armament Haki improves outgoing and incoming damage, Observation Haki
reduces incoming damage, and Conqueror's Haki improves outgoing damage. The
adapter additionally accepts optional `state.haki` and `state.devilFruit`
progression records: unlocked Haki mastery scales its relevant combat effects,
while Devil Fruit mastery and awakening add bounded offensive/durability
scaling. Existing saves without these records retain their original unlock-only
behavior. The game does not yet expose training controls or persist these
optional progression records.

The adapter is loaded before the main inline game script and is only applied
when the active world is One Piece. Other anime worlds and characters without
these unlocked powers retain their existing combat calculations. Unit tests
cover the modifier combinations, world isolation and invalid damage inputs.

## Haki progression

`haki-system.js` tracks Armament, Observation and Conqueror's Haki mastery
from 0–100. Armament and Observation are available by default; Conqueror's
Haki must be marked as innate when creating the character's Haki state.
Training is bounded, and `getCombatProfile` converts mastery into simple
defense, awareness and pressure bonuses plus rank labels. The main game already contains Haki-related power flags. This helper is loaded by the browser bootstrap, but mastery values are not yet synchronized with those existing flags or applied to the main game's combat calculations.

```js
const haki = OnePieceHakiSystem.createHakiState({ hasConquerorsHaki: true });
const result = OnePieceHakiSystem.train({ id: 'captain', haki }, 'armament', 10);
```

Load `haki-system.js` after the other AI helper scripts.


## Automatic One Piece population turns

The existing game's annual loop calls `OnePieceWorldSimulation.simulate(S, S.npcs, context)`
once per year. When the state identifies the One Piece world (`world: 'op'`),
that call now advances every living NPC through twelve ordered monthly population passes,
retaining each NPC's profile and recording social interactions. Other callers
and tests without the One Piece world identifier retain the original
single-actor `simulate()` behavior. This connects the population system to
the game's current yearly loop without changing the large `index.html`.

## Versioned game saves and recovery

`world-simulation.js` also exposes `OnePieceSaveSystem` and installs a compatibility
layer for the existing `extra-life-v2` localStorage key before the main inline
game script runs. The existing `save()` and `loadSaved()` call sites do not need
to change.

- New writes include `_saveMeta.schemaVersion` (currently 1) and an FNV-1a
  checksum over the saved game payload.
- Unversioned legacy saves are accepted as schema v0 and upgraded without
  discarding game fields. The main game's existing `migrate(s)` still handles
  gameplay defaults.
- Before replacing a valid primary save, the previous valid snapshot is written
  to `extra-life-v2-backup`.
- A missing, malformed, or checksum-invalid primary save falls back to a valid
  backup. Damaged raw copies are not deleted.
- Saves from a newer schema are treated as read-only so an older build cannot
  overwrite them.
- If both copies are invalid, loading returns no save rather than silently
  manufacturing a replacement over the damaged data.

The pure save manager can also be tested with a Storage-compatible adapter:

```js
const manager = OnePieceSaveSystem.createManager(localStorage);
const loaded = manager.load();
if (loaded.state) {
  // Continue with the loaded game state.
}
const result = manager.save(gameState);
```

The automated tests cover legacy migration, version metadata, checksum
validation, backup rotation, missing/corrupt primary recovery, preservation of
damaged copies, and future-version write protection. Browser refresh and
real-device storage-quota behavior still require manual browser testing.

### Save export and import

`OnePieceSaveSystem.createManager(storage)` now exposes `exportSave()` and
`importSave(raw)`. Export returns a verified, versioned JSON payload and a
suggested filename. Import validates JSON shape, schema version and checksum
before changing the current save; the current valid save is rotated into the
backup slot first. Legacy unversioned JSON is accepted and upgraded, while
future-version or tampered files are rejected without replacing local progress.

For browser UI, `OnePieceSaveSystem.downloadExport(manager)` downloads the JSON
file through a Blob URL, and `OnePieceSaveSystem.importFile(file, manager)`
reads a user-selected File and passes its contents through the same validator.
These are APIs only; the existing game's visible menu/buttons have not yet been
modified to expose export/import controls.

### In-game save controls

`world-simulation.js` installs a compact floating **จัดการเซฟ** control after the
document is ready. It exposes JSON export and file import in the game UI without
editing the 3.2 MB `index.html` bundle. Import asks for confirmation, validates
the selected JSON through the save manager, rotates the current valid save into
the backup slot, and reloads the page after success. Files larger than 10 MB are
rejected by the UI. The controls use the existing `extra-life-v2` storage key.

Automated tests cover the browser download helper and File-like import helper.
Actual touch interaction, browser download behavior, storage quota failures and
the full reload flow still need manual verification in Chrome Android/Desktop.


## Mobile and tablet touch support

The main game already has responsive layouts for narrow screens. The browser bootstrap adds touch-specific rules when the device reports a coarse pointer: primary actions and segmented controls receive larger hit areas, the bottom action bar can scroll on short phone screens, and dialogs respect display safe areas. The floating save and crew panels also use touch-sized controls and safe-area spacing. Automated tests verify these layout rules; real-device testing on Android and iPad/iPhone browsers is still required.


## Marine intelligence and pirate pursuit

`marine-system.js` provides framework-independent Marine force and wanted-record
helpers. A force can register pirates with an active bounty, evaluate sightings
using intelligence, alertness, notoriety, location match, distance and concealment,
then advance an investigation through tracking to active pursuit. Encounters
resolve to capture or escape using Marine strength, target strength, pursuit
pressure and support. Detection and encounter helpers accept an injected random
function for deterministic tests. The helpers return updated state objects; the game layer remains responsible
for saving state and presenting UI. The browser companion bootstrap loads the
rules as `OnePieceMarineSystem` and the player-facing adapter as
`OnePieceMarineUI`. The UI exposes wanted status, patrol checks, evasion, and
confrontation without duplicating the Marine rules engine.


### Mastery-aware combat adapter

The combat adapter remains backward-compatible with legacy saves that only
contain `S.powers`. If the game state also contains a Haki record from
`OnePieceHakiSystem` at `state.haki`, unlocked mastery adds gradual outgoing
or incoming damage modifiers. If it contains a Devil Fruit progression record
at `state.devilFruit`, fruit type supplies the baseline family modifier and
mastery/awakening add bounded scaling. These optional fields are not currently
created or persisted by the main game UI; callers must initialize and save them.


### Sync Haki unlocks with the legacy game flags

`OnePieceHakiSystem.syncUnlockedStyles(character, powers)` maps the existing
`haki_arm`, `haki_obs`, and `haki_king` power IDs into the progression
record's unlocked flags while preserving each style's mastery. This allows the
game layer to migrate an existing character without granting Haki that has not
been unlocked. The function returns a new character object and does not mutate
the input. Call it when loading or updating a character's power unlocks, then
persist the returned `character.haki` with the normal game save.


### Unified character progression coordinator

`progression-system.js` coordinates Haki and Devil Fruit progression through
one immutable character-state API. It synchronizes unlocked Haki styles from
the character's existing `powers`, supports Haki and fruit training, fruit
consumption and awakening, exposes sea/Seastone weakness, and builds a compact
progress summary for UI use. It is loaded as `OnePieceProgressionSystem`.
The coordinator does not itself award training points, spend currency, or save
the character; game rules and persistence remain owned by the main game layer.


## Player-facing Haki and Devil Fruit progression

The One Piece world simulator now installs a compact **พลัง** panel for the living player character. It synchronizes Haki unlocks from the existing `S.powers` flags, displays each unlocked Haki mastery/rank, and allows one +5 mastery training action per Haki discipline per in-game year. For existing saves that only have the legacy `S.flags.df` fruit name and `df_para` / `df_zoan` / `df_logia` power flag, the panel migrates those values into `S.devilFruit` using a stable fruit ID. The panel then allows one +5 fruit-mastery training action per year and enables awakening at 80 mastery. Training state is stored on `S.progressionTraining`; mastery remains on `S.haki` and `S.devilFruit`, so the existing full-state save flow persists it. No fruit is granted by this panel, and it does not unlock Haki that the character has not already obtained.

The panel is mounted by `OnePieceWorldSimulation.scheduleProgressionControls()` after the companion systems finish loading. Its controls use 48px touch targets, safe-area insets, and viewport-bounded scrolling for phone and tablet layouts. Unit coverage is in `tests/ai.test.js`; GitHub Actions run 45854778043 completed successfully with 67 tests passed and 0 failed, including legacy Devil Fruit migration, Haki/fruit training, Marine UI, and Roger-era integration.


## Roger-era content integration

The narrative-owned `ai/roger-era-content.js` pack registers eight replay-safe encounter events into the existing One Piece `W.meets` collection and adds an optional 1475 birth-year preset. `OnePieceWorldSimulation.scheduleRogerEraContent()` loads it only after `DOMContentLoaded`, so the main game's lexical world/cast/configuration helpers are initialized before registration. The loader is idempotent and records load failures in `__onePieceContentErrors`. The event module remains content-owned; runtime loading and integration remain engineering-owned.


## Marine wanted and pursuit panel

`marine-ui.js` mounts a player-facing **กองทัพเรือ** panel when an alive One Piece character has a positive bounty. It registers/updates the player's wanted record in `S.marineForce`, lets the player check local patrol activity, and, when a sighting starts a pursuit, attempt to hide and cut the trail. Patrol checks and evasion are each limited to one action of that type per in-game month using `S.marineActionAt`; wanted/pursuit state is persisted in the normal `S` save. Losing a pursuit does not erase the bounty. The panel is loaded after `marine-system.js` and uses touch-sized controls and safe-area-aware mobile/tablet layout. When a pursuit is active, the player can also confront the patrol. A capture enters the existing game's prison flow by setting `S.flags.jailUntil`, clearing the current job/rent, and resetting heat; the existing `jailed()` / `jailMonth()` logic handles confinement, sentence expiry, and prison escape. On sentence expiry, the Marine wanted record becomes active again while the bounty remains. Location-specific Marine force rosters and trial mechanics are not implemented yet.
