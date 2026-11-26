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
