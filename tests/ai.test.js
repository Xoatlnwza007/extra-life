'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const stateApi = require('../ai/character-state.js');
const engine = require('../ai/decision-engine.js');
globalThis.OnePieceCharacterState = stateApi;
globalThis.OnePieceDecisionEngine = engine;
const brain = require('../ai/npc-brain.js');
globalThis.OnePieceNPCBrain = brain;
const eventAdapter = require('../ai/event-adapter.js');
const world = require('../ai/world-simulation.js');
const crews = require('../ai/crew-system.js');

 
test('game touch stylesheet adapts controls for phones and tablets', () => {
  const styles = world.getMobileTouchStyles();
  assert.match(styles, /any-pointer:coarse/);
  assert.match(styles, /min-height:48px/);
  assert.match(styles, /\.actbar/);
  assert.match(styles, /max-height:min\(52dvh,420px\)/);
  assert.match(styles, /safe-area-inset-left/);
  assert.match(styles, /max-width:900px/);
});


test('save controls provide mobile-safe touch targets and viewport spacing', () => {
  const styles = world.getSaveControlsStyles();
  assert.match(styles, /min-width:48px/);
  assert.match(styles, /min-height:48px/);
  assert.match(styles, /touch-action:manipulation/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /max-width:480px/);
  assert.match(styles, /orientation:landscape/);
  assert.match(styles, /100dvh/);
});

test('decision engine prefers an action that advances an active goal', () => {
  const state = {
    goals: [{ id: 'g1', status: 'active', action: 'train', priority: 90 }],
    needs: {}, traits: [], riskTolerance: 50
  };
  const result = engine.decide(state, [
    { id: 'rest', expectedReward: 2 },
    { id: 'train', expectedReward: 1 }
  ]);
  assert.equal(result.action.id, 'train');
  assert.equal(result.ranking[0].id, 'train');
});

test('negative memories discourage matching actions', () => {
  const state = {
    memories: [{ tags: ['explore'], importance: 5, polarity: 'negative' }],
    needs: {}, goals: [], traits: [], riskTolerance: 100
  };
  const result = engine.decide(state, [
    { id: 'explore', tags: ['explore'] },
    { id: 'rest', tags: ['rest'] }
  ]);
  assert.equal(result.action.id, 'rest');
});

test('character state caps memories and expires timed memories', () => {
  let character = stateApi.createCharacterState({ id: 'test-npc' });
  for (let i = 0; i < 105; i++) {
    character = stateApi.remember(character, 'event ' + i, { importance: 1 });
  }
  assert.equal(character.memories.length, 100);
  character = stateApi.remember(character, 'temporary danger', {
    expiresAt: '2000-01-01T00:00:00.000Z'
  });
  character = stateApi.advanceTime(character, Date.parse('2020-01-01T00:00:00.000Z'));
  assert.equal(character.memories.at(-1).expired, true);
});

test('event adapter returns the original selected choice object', () => {
  const state = {
    goals: [{ id: 'g1', status: 'active', action: 'help', priority: 100 }],
    needs: {}, traits: [], riskTolerance: 100
  };
  const choices = [
    { id: 'rest', label: 'Rest' },
    { id: 'help', label: 'Help', tags: ['help'] }
  ];
  const result = eventAdapter.choose(state, choices);
  assert.equal(result.usedAI, true);
  assert.equal(result.choice, choices[1]);
});

test('relationships are clamped, classified, and keep a bounded interaction history', () => {
  let character = stateApi.createCharacterState({ id: 'social-npc' });
  character = stateApi.adjustRelationship(character, 'player', 65, { event: 'player helped the village' });
  assert.equal(stateApi.getRelationship(character, 'player'), 65);
  assert.equal(stateApi.relationshipLabel(65), 'trusted');
  character = stateApi.adjustRelationship(character, 'player', 80, { event: 'another act of kindness' });
  assert.equal(stateApi.getRelationship(character, 'player'), 100);
  assert.equal(character.relationshipHistory.at(-1).delta, 35);
  character = stateApi.adjustRelationship(character, 'player', -250, { event: 'betrayal' });
  assert.equal(stateApi.getRelationship(character, 'player'), -100);
  assert.equal(stateApi.relationshipLabel(-100), 'nemesis');
  assert.equal(stateApi.getRelationship(character, 'unknown'), 0);
});

test('NPC outcome recording treats a string tag as one tag, not characters', () => {
  const character = stateApi.createCharacterState({ id: 'tag-test' });
  const decision = {
    action: { id: 'help', label: 'Help', tags: ['community'] },
    ranking: [{ id: 'help', score: 10 }]
  };
  const updated = brain.recordOutcome(character, decision, { tags: 'kindness' });
  assert.deepEqual(updated.memories.at(-1).tags, ['community', 'kindness']);
});

test('NPC interactions update both sides without sharing relationship state', () => {
  let alice = stateApi.createCharacterState({ id: 'alice' });
  let bob = stateApi.createCharacterState({ id: 'bob' });
  const result = stateApi.interact(alice, bob, 12, {
    replyDelta: 5,
    event: 'bob shared supplies with alice'
  });
  assert.equal(stateApi.getRelationship(result.first, 'bob'), 12);
  assert.equal(stateApi.getRelationship(result.second, 'alice'), 5);
  assert.equal(result.first.relationshipHistory.at(-1).event, 'bob shared supplies with alice');
  assert.equal(stateApi.getRelationship(alice, 'bob'), 0);
  assert.equal(stateApi.getRelationship(bob, 'alice'), 0);
});

test('population simulation processes every living NPC and skips dead NPCs', () => {
  const npcs = [
    { n: 'Villager A', r: 'kind', alive: true },
    { n: 'Villager B', r: 'rival', alive: true },
    { n: 'Villager C', r: 'shop', alive: false }
  ];
  const result = world.simulatePopulation({ npcBrains: {} }, npcs, {});
  assert.equal(result.simulatedCount, 2);
  assert.deepEqual(result.actions.map(item => item.npc), ['Villager A', 'Villager B']);
  assert.ok(result.profiles['Villager A'].memories.length > 0);
  assert.ok(result.profiles['Villager B'].memories.length > 0);
  assert.equal(result.profiles['Villager C'], undefined);
  assert.ok(Array.isArray(result.interactions));
  for (const interaction of result.interactions) {
    assert.ok(result.profiles[interaction.from].relationshipHistory.length > 0);
    assert.ok(result.profiles[interaction.to].relationshipHistory.length > 0);
  }
});

test('social NPC actions create memories and bilateral relationships', () => {
  const npcs = [
    { n: 'Kind A', r: 'kind', alive: true },
    { n: 'Kind B', r: 'kind', alive: true }
  ];
  const result = world.simulatePopulation({ npcBrains: {} }, npcs, {});
  assert.equal(result.interactions.length, 2);
  assert.ok(stateApi.getRelationship(result.profiles['Kind A'], 'op-npc-Kind B') > 0);
  assert.ok(stateApi.getRelationship(result.profiles['Kind B'], 'op-npc-Kind A') > 0);
  assert.ok(result.profiles['Kind A'].memories.some(memory => memory.source === 'npc-interaction'));
  assert.ok(result.profiles['Kind B'].memories.some(memory => memory.source === 'npc-interaction'));
});

test('crew system manages membership, roles, captaincy and bounty', () => {
  let crew = crews.createCrew({ id: 'straw-test', name: 'Test Pirates', captainId: 'luffy', bounty: 100 });
  let result = crews.joinCrew(crew, 'zoro', 'swordsman', { capacity: 3 });
  assert.equal(result.joined, true);
  crew = result.crew;
  assert.equal(crews.joinCrew(crew, 'zoro').reason, 'already-member');
  result = crews.joinCrew(crew, 'nami', 'navigator', { capacity: 3 });
  assert.equal(result.joined, true);
  crew = result.crew;
  result = crews.joinCrew(crew, 'sanji', 'cook', { capacity: 3 });
  assert.equal(result.reason, 'crew-full');
  crew = crews.setMemberRole(crew, 'zoro', 'first-mate').crew;
  assert.equal(crew.members.find(member => member.characterId === 'zoro').role, 'first-mate');
  result = crews.transferCaptaincy(crew, 'zoro');
  assert.equal(result.transferred, true);
  crew = result.crew;
  assert.equal(crew.captainId, 'zoro');
  assert.equal(crew.members.find(member => member.characterId === 'luffy').role, 'first-mate');
  crew = crews.addBounty(crew, 500, 'defeated-pirates');
  assert.equal(crew.bounty, 600);
  assert.equal(crews.findCrewForMember([crew], 'luffy').id, 'straw-test');
  assert.equal(crews.leaveCrew(crew, 'zoro').reason, 'captain-must-transfer-or-disband');
  result = crews.leaveCrew(crew, 'luffy');
  assert.equal(result.left, true);
  assert.equal(result.crew.members.some(member => member.characterId === 'luffy'), false);
});

test('crew capacity and disbanded status prevent new members', () => {
  let crew = crews.createCrew({ id: 'closed-crew', captainId: 'captain' });
  crew = crews.disbandCrew(crew, 'story-event');
  const result = crews.joinCrew(crew, 'new-member');
  assert.equal(result.joined, false);
  assert.equal(result.reason, 'invalid-crew');
});

test('crew diplomacy and encounters update rivalries and rewards', () => {
  let first = crews.createCrew({ id: 'sun-pirates', captainId: 'captain-a', reputation: 10 });
  let second = crews.createCrew({ id: 'moon-pirates', captainId: 'captain-b', reputation: 5 });
  let relation = crews.setCrewRelation(first, second.id, 45, { reason: 'shared-enemy' });
  first = relation.crew;
  assert.equal(relation.updated, true);
  assert.equal(crews.crewRelationLabel(first.relations[second.id]), 'friendly');
  const encounter = crews.resolveCrewEncounter(first, second, {
    winnerId: first.id,
    winnerBountyIncrease: 250,
    at: '2026-01-01T00:00:00.000Z'
  });
  assert.equal(encounter.resolved, true);
  assert.equal(encounter.outcome, 'victory');
  assert.equal(encounter.first.bounty, 250);
  assert.equal(encounter.first.reputation, 15);
  assert.equal(encounter.second.reputation, 2);
  assert.equal(encounter.first.relations[second.id], 20);
  assert.equal(encounter.second.relations[first.id], -25);
  assert.equal(encounter.first.history.at(-2).type, 'crew-encounter');
  assert.equal(crews.resolveCrewEncounter(first, second, { winnerId: 'outsider' }).reason, 'winner-not-in-encounter');
});

test('world simulation initializes and returns persistent NPC profiles', () => {
  const npc = { n: 'Test villager', r: 'kind', alive: true };
  const result = world.simulate({ npcBrains: {} }, [npc], {});
  assert.ok(result.profiles[npc.n]);
  assert.ok(result.profiles[npc.n].memories.length >= 1);
  assert.ok(result.action);
});


test('Devil Fruit system enforces one fruit, mastery and awakening rules', () => {
  const fruits = require('../ai/devil-fruit-system.js');
  const made = fruits.createFruit({ id: 'mera-test', name: 'Mera Mera no Mi', type: 'logia' });
  assert.equal(made.created, true);
  const invalid = fruits.createFruit({ name: 'Unknown Fruit', type: 'mythical' });
  assert.equal(invalid.created, false);

  const luffy = { id: 'luffy', name: 'Luffy' };
  const consumed = fruits.consumeFruit(luffy, made.fruit, { at: '2026-01-01T00:00:00.000Z' });
  assert.equal(consumed.consumed, true);
  assert.equal(consumed.character.devilFruit.mastery, 0);
  assert.equal(fruits.consumeFruit(consumed.character, made.fruit).reason, 'already-has-devil-fruit');
  assert.equal(fruits.consumeFruit({ id: 'ace' }, consumed.fruit).reason, 'fruit-already-consumed');

  assert.equal(fruits.awaken(consumed.character).reason, 'insufficient-mastery');
  const trained = fruits.trainMastery(consumed.character, 85);
  assert.equal(trained.character.devilFruit.mastery, 85);
  const awakened = fruits.awaken(trained.character, { at: '2026-02-01T00:00:00.000Z' });
  assert.equal(awakened.awakened, true);
  assert.equal(fruits.awaken(awakened.character).reason, 'already-awakened');
  assert.equal(fruits.trainMastery({ id: 'none' }, 10).reason, 'no-devil-fruit');
});

test('Devil Fruit users are weakened by seawater and Sea Prism Stone', () => {
  const fruits = require('../ai/devil-fruit-system.js');
  const user = { id: 'user', devilFruit: { id: 'fruit-1', name: 'Test', type: 'paramecia' } };
  assert.deepEqual(fruits.getSeaEffect(user), {
    weakened: false, canSwim: true, strengthMultiplier: 1
  });
  assert.deepEqual(fruits.getSeaEffect(user, { inSea: true }), {
    weakened: true, canSwim: false, strengthMultiplier: 0.5
  });
  assert.equal(fruits.getSeaEffect(user, { seaStone: true }).strengthMultiplier, 0.25);
  assert.equal(fruits.getSeaEffect({ id: 'normal' }, { inSea: true }).canSwim, true);
});


test('Haki system trains unlocked styles and keeps Conquerors Haki innate', () => {
  const haki = require('../ai/haki-system.js');
  const character = { id: 'fighter', haki: haki.createHakiState() };
  assert.equal(character.haki.armament.unlocked, true);
  assert.equal(character.haki.observation.unlocked, true);
  assert.equal(character.haki.conquerors.unlocked, false);
  assert.equal(haki.train(character, 'conquerors', 20).reason, 'haki-locked');

  const trained = haki.train(character, 'armament', 70);
  assert.equal(trained.character.haki.armament.mastery, 70);
  assert.equal(character.haki.armament.mastery, 0);
  assert.equal(haki.masteryRank(70), 'expert');
  assert.equal(haki.train(trained.character, 'armament', 80).character.haki.armament.mastery, 100);

  const bornWithConquerors = {
    id: 'captain',
    haki: haki.createHakiState({ hasConquerorsHaki: true })
  };
  const conquerors = haki.train(bornWithConquerors, 'conquerors', 95);
  assert.equal(conquerors.character.haki.conquerors.mastery, 95);
  assert.deepEqual(haki.getCombatProfile(conquerors.character), {
    defenseBonus: 0,
    awarenessBonus: 0,
    pressureBonus: 29,
    ranks: { armament: 'untrained', observation: 'untrained', conquerors: 'master' }
  });
});

test('Haki training rejects invalid amounts and unknown styles', () => {
  const haki = require('../ai/haki-system.js');
  const character = { id: 'fighter', haki: haki.createHakiState() };
  assert.equal(haki.train(character, 'armament', 0).reason, 'invalid-training');
  assert.equal(haki.train(character, 'unknown', 10).reason, 'invalid-character-or-type');
});


test('One Piece yearly simulation automatically advances the full living NPC population', () => {
  const npcs = [
    { n: 'Nami', r: 'shop', alive: true },
    { n: 'Usopp', r: 'kid', alive: true },
    { n: 'Sanji', r: 'kind', alive: true },
    { n: 'Deceased', r: 'grump', alive: false }
  ];
  const gameState = { world: 'op', npcBrains: {} };
  const result = world.simulate(gameState, npcs, {});
  assert.equal(result.simulatedCount, 3);
  assert.equal(result.simulatedMonths, 12);
  assert.equal(result.actionCount, 36);
  assert.equal(result.actions.length, 36);
  assert.equal(result.monthlyResults.length, 12);
  assert.deepEqual(result.monthlyResults.map(month => month.month), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(result.simulationCalendar.totalMonths, 12);
  assert.deepEqual(gameState.npcSimulationCalendar, result.simulationCalendar);
  assert.ok(result.profiles.Nami);
  assert.ok(result.profiles.Usopp);
  assert.ok(result.profiles.Sanji);
  assert.equal(result.profiles.Deceased, undefined);
});


test('One Piece population remains valid across twelve annual simulation ticks', () => {
  const npcs = [
    { n: 'Gossip', r: 'gossip', alive: true },
    { n: 'Grump', r: 'grump', alive: true },
    { n: 'Kid', r: 'kid', alive: true },
    { n: 'Shopkeeper', r: 'shop', alive: true },
    { n: 'Doctor', r: 'kind', alive: true },
    { n: 'Swordsman', r: 'rival', alive: true },
    { n: 'Craftsperson', r: 'craft', alive: true }
  ];
  let state = { world: 'op', npcBrains: {} };
  const actionHistory = Object.fromEntries(npcs.map(npc => [npc.n, []]));

  for (let year = 0; year < 12; year++) {
    const result = world.simulate(state, npcs, {});
    assert.equal(result.simulatedCount, npcs.length);
    for (const npc of npcs) {
      const profile = result.profiles[npc.n];
      assert.ok(profile, npc.n + ' profile should persist');
      assert.ok(profile.memories.length <= 100, npc.n + ' memory cap should hold');
      for (const value of Object.values(profile.needs)) {
        assert.ok(value >= 0 && value <= 100, npc.n + ' needs should remain bounded');
      }
      const monthlyActions = result.actions.filter(action => action.npc === npc.n);
      assert.equal(monthlyActions.length, 12);
      actionHistory[npc.n].push(...monthlyActions.map(action => action.action));
    }
    state = { ...state, npcBrains: result.profiles, simulationCalendar: result.simulationCalendar };
  }

  assert.equal(state.npcSimulationCalendar.totalMonths, 144);
  assert.equal(state.npcSimulationCalendar.month, 12);
  assert.equal(state.npcSimulationCalendar.year, 11);
  for (const npc of npcs) {
    assert.equal(actionHistory[npc.n].length, 144);
    assert.ok(new Set(actionHistory[npc.n]).size >= 1);
  }
});


test('NPC population simulation is reproducible across long runs with a seeded random source', () => {
  const npcs = [
    { n: 'Gossip', r: 'gossip', alive: true },
    { n: 'Grump', r: 'grump', alive: true },
    { n: 'Kid', r: 'kid', alive: true },
    { n: 'Shopkeeper', r: 'shop', alive: true },
    { n: 'Doctor', r: 'kind', alive: true },
    { n: 'Swordsman', r: 'rival', alive: true },
    { n: 'Craftsperson', r: 'craft', alive: true }
  ];

  function run(seed, ticks) {
    let randomState = seed >>> 0;
    const random = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0;
      return randomState / 0x100000000;
    };
    let state = { world: 'op', npcBrains: {} };
    const history = [];

    for (let tick = 0; tick < ticks; tick++) {
      const result = world.simulate(state, npcs, { random });
      assert.equal(result.simulatedCount, npcs.length);
      history.push(result.actions.map(action => [action.npc, action.action]));
      for (const npc of npcs) {
        const profile = result.profiles[npc.n];
        assert.ok(profile, npc.n + ' profile should persist at tick ' + tick);
        assert.ok(profile.memories.length <= 100, npc.n + ' memory cap should hold');
        for (const value of Object.values(profile.needs)) {
          assert.ok(value >= 0 && value <= 100, npc.n + ' needs should remain bounded');
        }
        for (const value of Object.values(profile.relationships || {})) {
          assert.ok(value >= -100 && value <= 100, npc.n + ' relationships should remain bounded');
        }
      }
      state = { ...state, npcBrains: result.profiles };
    }
    return history;
  }

  for (const ticks of [1, 12, 60, 240]) {
    assert.deepEqual(
      run(20261126, ticks),
      run(20261126, ticks),
      'same seed and tick count should produce the same NPC action history for ' + ticks + ' ticks'
    );
  }
});


test('NPC profiles and monthly calendar survive the game JSON save/load round trip', () => {
  const npcs = [
    { n: 'Navigator', r: 'kid', alive: true },
    { n: 'Doctor', r: 'kind', alive: true },
    { n: 'Merchant', r: 'shop', alive: true }
  ];
  const randomFor = seed => {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x100000000;
    };
  };

  const original = { world: 'op', year: 1522, npcBrains: {} };
  const firstYear = world.simulate(original, npcs, { random: randomFor(77) });
  original.npcBrains = firstYear.profiles;

  const serialized = JSON.stringify(original);
  const loaded = JSON.parse(serialized);
  assert.deepEqual(loaded.npcSimulationCalendar, {
    year: 1522, month: 12, totalMonths: 12
  });
  assert.deepEqual(loaded.npcBrains, firstYear.profiles);

  const memoryCounts = Object.fromEntries(
    npcs.map(npc => [npc.n, loaded.npcBrains[npc.n].memories.length])
  );
  const secondYear = world.simulate(loaded, npcs, { random: randomFor(78) });
  assert.equal(secondYear.simulationCalendar.totalMonths, 24);
  assert.equal(secondYear.simulationCalendar.year, 1523);
  for (const npc of npcs) {
    assert.ok(secondYear.profiles[npc.n].memories.length >= memoryCounts[npc.n]);
  }
});

test('legacy saves without NPC simulation metadata initialize safely', () => {
  const npcs = [
    { n: 'Old Sailor', r: 'grump', alive: true },
    { n: 'Old Friend', r: 'gossip', alive: true }
  ];
  const legacySave = JSON.parse(JSON.stringify({
    world: 'op',
    year: 1500,
    age: 24,
    alive: true,
    npcBrains: {}
  }));

  assert.equal(legacySave.npcSimulationCalendar, undefined);
  const result = world.simulate(legacySave, npcs, {});
  assert.equal(result.simulatedMonths, 12);
  assert.equal(result.simulationCalendar.year, 1500);
  assert.equal(result.simulationCalendar.totalMonths, 12);
  assert.deepEqual(legacySave.npcSimulationCalendar, result.simulationCalendar);
});


test('save system migrates legacy saves into the current versioned schema', () => {
  const values = new Map([['extra-life-v2', JSON.stringify({
    name: 'Legacy Captain', age: 31, npcBrains: { Chopper: { memories: [] } }
  })]]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);
  const loaded = manager.load();

  assert.equal(loaded.state.name, 'Legacy Captain');
  assert.equal(loaded.migrated, true);
  const saved = manager.save(loaded.state);
  assert.equal(saved.ok, true);
  const decoded = world.saveSystem.decode(values.get('extra-life-v2'));
  assert.equal(decoded.ok, true);
  assert.equal(decoded.fromVersion, 1);
  assert.equal(decoded.data.name, 'Legacy Captain');
});

test('save system keeps a last-known-good backup and recovers a corrupted primary', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);

  assert.equal(manager.save({ name: 'First Captain', age: 20 }).ok, true);
  assert.equal(manager.save({ name: 'Second Captain', age: 21 }).ok, true);
  assert.equal(world.saveSystem.decode(values.get('extra-life-v2-backup')).data.name, 'First Captain');

  values.set('extra-life-v2', '{"broken":');
  const loaded = manager.load();
  assert.equal(loaded.recovered, true);
  assert.equal(loaded.source, 'backup');
  assert.equal(loaded.state.name, 'First Captain');
});

test('save system can recover from a missing primary using its backup', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);
  manager.save({ name: 'Backup Captain', age: 42 });
  manager.save({ name: 'Current Captain', age: 43 });
  values.delete('extra-life-v2');

  const loaded = manager.load();
  assert.equal(loaded.recovered, true);
  assert.equal(loaded.state.name, 'Backup Captain');
});

test('save system refuses future schema versions and detects checksum tampering', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);
  const future = JSON.stringify({
    name: 'Future Captain',
    _saveMeta: { schemaVersion: world.saveSystem.version + 1, checksum: 'future' }
  });
  values.set('extra-life-v2', future);

  assert.equal(manager.load().readOnly, true);
  assert.equal(manager.save({ name: 'Overwrite Attempt' }).reason, 'future-version');
  assert.equal(values.get('extra-life-v2'), future);

  const encoded = world.saveSystem.encode({ name: 'Checksum Captain', age: 25 });
  const altered = JSON.parse(encoded);
  altered.age = 99;
  assert.equal(world.saveSystem.decode(JSON.stringify(altered)).reason, 'checksum-mismatch');
});

test('save system does not discard damaged save data when both copies are invalid', () => {
  const values = new Map([
    ['extra-life-v2', '{"primary":'],
    ['extra-life-v2-backup', '{"backup":']
  ]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const loaded = world.saveSystem.createManager(storage).load();

  assert.equal(loaded.state, null);
  assert.equal(values.get('extra-life-v2'), '{"primary":');
  assert.equal(values.get('extra-life-v2-backup'), '{"backup":');
});


test('save manager exports a verified save and imports it without losing the current backup', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);

  manager.save({ captain: 'Current Captain', berries: 900 });
  const exported = manager.exportSave();
  assert.equal(exported.ok, true);
  assert.match(exported.filename, /extra-life-save-v1\.json$/);
  assert.equal(world.saveSystem.decode(exported.data).data.captain, 'Current Captain');

  const importedPayload = world.saveSystem.encode({
    captain: 'Imported Captain', berries: 1200,
    npcSimulationCalendar: { year: 1524, month: 6, totalMonths: 30 }
  });
  const imported = manager.importSave(importedPayload);
  assert.equal(imported.ok, true);
  assert.equal(manager.load().state.captain, 'Imported Captain');
  assert.equal(manager.load().state.npcSimulationCalendar.totalMonths, 30);
  assert.equal(world.saveSystem.decode(values.get('extra-life-v2-backup')).data.captain, 'Current Captain');
});

test('save manager rejects invalid imports and preserves the current game save', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);
  manager.save({ captain: 'Safe Captain', berries: 500 });
  const before = values.get('extra-life-v2');

  assert.equal(manager.importSave('not-json').reason, 'invalid-json');
  const tampered = JSON.parse(world.saveSystem.encode({ captain: 'Tampered', berries: 1 }));
  tampered.berries = 999999;
  assert.equal(manager.importSave(JSON.stringify(tampered)).reason, 'checksum-mismatch');
  assert.equal(values.get('extra-life-v2'), before);
  assert.equal(manager.load().state.captain, 'Safe Captain');
});

test('save manager can import a legacy unversioned JSON file', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);
  const result = manager.importSave(JSON.stringify({
    captain: 'Old Era Captain', age: 47, npcBrains: { Robin: { memories: [] } }
  }));

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);
  assert.equal(manager.load().state.captain, 'Old Era Captain');
});

test('save import from a future schema is rejected without replacing local progress', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);
  manager.save({ captain: 'Local Captain' });
  const before = values.get('extra-life-v2');
  const future = JSON.stringify({
    captain: 'Future Captain',
    _saveMeta: { schemaVersion: world.saveSystem.version + 1, checksum: 'future' }
  });

  assert.equal(manager.importSave(future).reason, 'future-version');
  assert.equal(values.get('extra-life-v2'), before);
  assert.equal(manager.load().state.captain, 'Local Captain');
});


test('browser save helpers download exports and import selected JSON files', async () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const manager = world.saveSystem.createManager(storage);
  manager.save({ captain: 'Browser Captain', age: 29 });

  let clicked = false;
  let revoked = false;
  let downloadedBlob;
  const anchor = {
    style: {},
    click() { clicked = true; },
    remove() { this.removed = true; }
  };
  const host = {
    Blob: class {
      constructor(parts, options) { downloadedBlob = { parts, options }; }
    },
    URL: {
      createObjectURL() { return 'blob:save-export'; },
      revokeObjectURL(url) { revoked = url === 'blob:save-export'; }
    },
    document: {
      body: { appendChild(node) { assert.equal(node, anchor); } },
      createElement(tag) { assert.equal(tag, 'a'); return anchor; }
    }
  };
  const download = world.saveSystem.downloadExport(manager, host);
  assert.equal(download.ok, true);
  assert.equal(clicked, true);
  assert.equal(anchor.removed, true);
  assert.equal(revoked, true);
  assert.equal(downloadedBlob.options.type, 'application/json;charset=utf-8');
  assert.equal(JSON.parse(downloadedBlob.parts[0]).captain, 'Browser Captain');

  const imported = await world.saveSystem.importFile({
    text: async () => JSON.stringify({ captain: 'File Import Captain', age: 35 })
  }, manager);
  assert.equal(imported.ok, true);
  assert.equal(imported.migrated, true);
  assert.equal(manager.load().state.captain, 'File Import Captain');
});

test('browser save helpers reject unsupported download and import inputs', async () => {
  const manager = world.saveSystem.createManager({
    getItem: () => null,
    setItem: () => {}
  });
  assert.equal(world.saveSystem.downloadExport(manager, {}).reason, 'unsupported');
  assert.equal((await world.saveSystem.importFile({}, manager)).reason, 'unsupported');
});


test('browser localStorage hook versions normal game saves and rotates a valid backup', () => {
  class MemoryStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
  }
  const host = { Storage: MemoryStorage };
  const storage = new MemoryStorage();
  host.localStorage = storage;

  assert.equal(world.saveSystem.installBrowserProtection(host), true);
  storage.setItem('extra-life-v2', JSON.stringify({ captain: 'Old Captain', age: 22 }));
  storage.setItem('extra-life-v2', JSON.stringify({ captain: 'New Captain', age: 23 }));

  const current = world.saveSystem.decode(storage.getItem('extra-life-v2'));
  const backup = world.saveSystem.decode(storage.getItem('extra-life-v2-backup'));
  assert.equal(current.ok, true);
  assert.equal(current.data.captain, 'New Captain');
  assert.equal(backup.ok, true);
  assert.equal(backup.data.captain, 'Old Captain');
});

test('browser localStorage hook recovers a damaged save from backup', () => {
  class MemoryStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
  }
  const host = { Storage: MemoryStorage };
  const storage = new MemoryStorage();
  host.localStorage = storage;
  world.saveSystem.installBrowserProtection(host);
  storage.setItem('extra-life-v2', JSON.stringify({ captain: 'Previous Captain' }));
  storage.setItem('extra-life-v2', JSON.stringify({ captain: 'Recoverable Captain' }));
  storage.values.set('extra-life-v2', '{damaged');

  const recoveredRaw = storage.getItem('extra-life-v2');
  const recovered = world.saveSystem.decode(recoveredRaw);
  assert.equal(recovered.ok, true);
  assert.equal(recovered.data.captain, 'Previous Captain');
  assert.equal(host.__extraLifeSaveRecovered, true);
});

test('browser localStorage hook preserves the previous save when storage quota is exceeded', () => {
  class QuotaStorage {
    constructor() { this.values = new Map(); this.failPrimary = false; }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) {
      if (key === 'extra-life-v2' && this.failPrimary) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      this.values.set(key, String(value));
    }
  }
  const host = { Storage: QuotaStorage };
  const storage = new QuotaStorage();
  host.localStorage = storage;
  world.saveSystem.installBrowserProtection(host);
  storage.setItem('extra-life-v2', JSON.stringify({ captain: 'Safe Captain' }));
  storage.failPrimary = true;

  assert.throws(() => storage.setItem('extra-life-v2', JSON.stringify({ captain: 'Too Large Captain' })), /QuotaExceededError/);
  const stillSaved = world.saveSystem.decode(storage.getItem('extra-life-v2'));
  const backup = world.saveSystem.decode(storage.getItem('extra-life-v2-backup'));
  assert.equal(stillSaved.data.captain, 'Safe Captain');
  assert.equal(backup.data.captain, 'Safe Captain');
});

  const styles = world.getSaveControlsStyles();
  assert.match(styles, /min-width:48px/);
  assert.match(styles, /min-height:48px/);
  assert.match(styles, /touch-action:manipulation/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /max-width:480px/);
  assert.match(styles, /orientation:landscape/);
  assert.match(styles, /100dvh/);
});

