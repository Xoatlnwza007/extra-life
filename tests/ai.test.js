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

test('world simulation initializes and returns persistent NPC profiles', () => {
  const npc = { n: 'Test villager', r: 'kind', alive: true };
  const result = world.simulate({ npcBrains: {} }, [npc], {});
  assert.ok(result.profiles[npc.n]);
  assert.ok(result.profiles[npc.n].memories.length >= 1);
  assert.ok(result.action);
});
