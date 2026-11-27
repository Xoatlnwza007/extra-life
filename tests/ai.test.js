'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const stateApi = require('../ai/character-state.js');
const decision = require('../ai/decision-engine.js');
globalThis.OnePieceCharacterState = stateApi;
globalThis.OnePieceDecisionEngine = decision;
const brain = require('../ai/npc-brain.js');
globalThis.OnePieceNPCBrain = brain;
const world = require('../ai/world-simulation.js');
const crews = require('../ai/crew-system.js');
const fruits = require('../ai/devil-fruit-system.js');
const haki = require('../ai/haki-system.js');
const progression = require('../ai/progression-system.js');
const marines = require('../ai/marine-system.js');
const combat = require('../ai/combat-adapter.js');
const events = require('../ai/event-adapter.js');
const marineUI = require('../ai/marine-ui.js');

test('browser bootstrap loads every companion module in dependency order', async () => {
  const scripts = [];
  const names = {
    './ai/decision-engine.js': 'OnePieceDecisionEngine',
    './ai/character-state.js': 'OnePieceCharacterState',
    './ai/npc-brain.js': 'OnePieceNPCBrain',
    './ai/event-adapter.js': 'OnePieceEventAdapter',
    './ai/crew-system.js': 'OnePieceCrewSystem',
    './ai/devil-fruit-system.js': 'OnePieceDevilFruitSystem',
    './ai/haki-system.js': 'OnePieceHakiSystem',
    './ai/progression-system.js': 'OnePieceProgressionSystem',
    './ai/marine-system.js': 'OnePieceMarineSystem',
    './ai/combat-adapter.js': 'OnePieceCombatAdapter',
    './ai/marine-ui.js': 'OnePieceMarineUI'
  };
  const host = {
    document: {
      head: { appendChild(script) { scripts.push(script.src); host[names[script.src]] = {}; queueMicrotask(() => script.onload()); } },
      createElement: () => ({})
    }
  };
  assert.equal(await world.loadCompanionModules(host), true);
  assert.deepEqual(scripts, Object.keys(names));
  assert.equal(await world.loadCompanionModules(host), true);
  assert.equal(scripts.length, 11);
});

test('companion loader continues after one missing script and reports it', async () => {
  const host = {
    document: {
      head: { appendChild(script) {
        if (script.src === './ai/character-state.js') return queueMicrotask(() => script.onerror(new Error('missing')));
        const name = {
          './ai/decision-engine.js': 'OnePieceDecisionEngine',
          './ai/npc-brain.js': 'OnePieceNPCBrain',
          './ai/event-adapter.js': 'OnePieceEventAdapter',
          './ai/crew-system.js': 'OnePieceCrewSystem',
          './ai/devil-fruit-system.js': 'OnePieceDevilFruitSystem',
          './ai/haki-system.js': 'OnePieceHakiSystem',
          './ai/progression-system.js': 'OnePieceProgressionSystem',
          './ai/marine-system.js': 'OnePieceMarineSystem',
          './ai/combat-adapter.js': 'OnePieceCombatAdapter',
          './ai/marine-ui.js': 'OnePieceMarineUI'
        }[script.src];
        host[name] = {};
        queueMicrotask(() => script.onload());
      } },
      createElement: () => ({})
    }
  };
  assert.equal(await world.loadCompanionModules(host), false);
  assert.deepEqual(host.__onePieceModuleErrors, ['./ai/character-state.js']);
});

test('NPC character state stores bounded memories and bilateral relationships', () => {
  let first = stateApi.createCharacterState({ id: 'first' });
  let second = stateApi.createCharacterState({ id: 'second' });
  first = stateApi.remember(first, 'Met a traveller', { tags: ['travel'], importance: 3 });
  const pair = stateApi.interact(first, second, 8, { replyDelta: 4, event: 'Shared a meal' });
  assert.equal(stateApi.getRelationship(pair.first, 'second'), 8);
  assert.equal(stateApi.getRelationship(pair.second, 'first'), 4);
  assert.equal(pair.first.memories.length, 1);
});

test('decision engine and NPC brain expose deterministic decision contracts', () => {
  const character = stateApi.createCharacterState({ id: 'npc-1', traits: ['kind'], needs: { social: 80 } });
  const candidates = [
    { id: 'rest', tags: ['rest'], expectedReward: 1 },
    { id: 'help', tags: ['help'], expectedReward: 5 }
  ];
  const result = brain.decide(character, candidates, { random: () => 0 });
  assert.ok(result);
  assert.ok(Array.isArray(result.ranking));
  assert.equal(typeof decision.decide, 'function');
});

test('crew primitives create a captain and enforce unique membership', () => {
  const crew = crews.createCrew({ id: 'crew-test', name: 'Test Pirates', captainId: 'player' });
  assert.equal(crew.members[0].characterId, 'player');
  const joined = crews.joinCrew(crew, 'npc-1', 'navigator');
  assert.equal(joined.joined, true);
  assert.equal(joined.crew.members.length, 2);
  assert.equal(crews.joinCrew(joined.crew, 'npc-1').reason, 'already-member');
});

test('Devil Fruit rules enforce one fruit and require explicit water exposure', () => {
  const fruit = fruits.createFruit({ id: 'fruit-test', name: 'Test Fruit', type: 'paramecia' });
  assert.equal(fruit.created, true);
  const eaten = fruits.consumeFruit({ id: 'player' }, fruit.fruit, { at: 'test-time' });
  assert.equal(eaten.consumed, true);
  assert.equal(fruits.consumeFruit(eaten.character, fruit.fruit).reason, 'already-has-devil-fruit');
  assert.equal(fruits.getSeaEffect(eaten.character, { aboardShip: true }).weakened, false);
  assert.equal(fruits.getSeaEffect(eaten.character, { submerged: true }).weakened, true);
});

test('Haki progression syncs unlocked legacy powers and trains mastery', () => {
  const synced = haki.syncUnlockedStyles({ id: 'player' }, ['haki_arm', 'haki_obs']);
  assert.equal(synced.character.haki.armament.unlocked, true);
  assert.equal(synced.character.haki.conquerors.unlocked, false);
  const trained = haki.train(synced.character, 'armament', 10);
  assert.equal(trained.character.haki.armament.mastery, 10);
  assert.equal(haki.train(trained.character, 'conquerors', 5).reason, 'haki-locked');
});

test('progression coordinator synchronizes character Haki state', () => {
  const result = progression.syncCharacter({ id: 'player', powers: ['haki_arm'] });
  assert.equal(result.ok, true);
  assert.equal(result.character.haki.armament.unlocked, true);
});

test('Marine intelligence registers wanted targets and detects deterministic sightings', () => {
  const force = marines.createMarineForce({ id: 'east-blue', intelligence: 100, alertness: 100 });
  const registered = marines.registerWanted(force, { id: 'player', name: 'Pirate', bounty: 1000000, location: 'foosha' });
  assert.equal(registered.registered, true);
  const sighting = marines.evaluateSighting(registered.force, { id: 'player', name: 'Pirate', bounty: 1000000 }, { random: () => 0, location: 'foosha' });
  assert.equal(sighting.detected, true);
  assert.equal(sighting.record.status, 'tracking');
});

test('combat adapter applies One Piece-only power modifiers and active crew support', () => {
  const crew = crews.createCrew({ id: 'player-crew', captainId: 'player' });
  const joined = crews.joinCrew(crew, 'npc-1');
  const state = {
    world: 'op', powers: ['haki_arm'], playerCrewId: 'player-crew',
    crews: [joined.crew], npcs: [{ id: 'npc-1', alive: true }]
  };
  const op = combat.getModifiers(state, 'op');
  const other = combat.getModifiers(state, 'naruto');
  assert.ok(op.outgoing > 1);
  assert.ok(op.incoming < 1);
  assert.deepEqual(other, { outgoing: 1, incoming: 1 });
});

test('versioned save system round-trips state and detects corruption', () => {
  const encoded = world.saveSystem.encode({ world: 'op', year: 1522, flags: { bounty: 1000 } });
  const decoded = world.saveSystem.decode(encoded);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.data.year, 1522);
  const damaged = encoded.replace('1522', '1523');
  assert.equal(world.saveSystem.decode(damaged).reason, 'checksum-mismatch');
});

test('One Piece yearly population advances a persistent twelve-month calendar', () => {
  const state = { world: 'op', year: 1522, npcBrains: {} };
  const result = world.simulate(state, [], { random: () => 0.5 });
  assert.equal(result.simulatedMonths, 12);
  assert.equal(result.simulationCalendar.totalMonths, 12);
  assert.equal(state.npcSimulationCalendar.month, 12);
});

test('mobile UI styles keep progression and Marine panels separated from crew controls', () => {
  const progressionStyles = world.getProgressionControlsStyles();
  const crewStyles = world.getCrewControlsStyles();
  const marineStyles = marineUI.getMarineControlsStyles();
  assert.match(progressionStyles, /bottom:calc\(82px \+ env\(safe-area-inset-bottom/);
  assert.match(progressionStyles, /bottom:calc\(78px \+ env\(safe-area-inset-bottom/);
  assert.match(crewStyles, /bottom:calc\(18px \+ env\(safe-area-inset-bottom/);
  assert.match(marineStyles, /bottom:calc\(82px \+ env\(safe-area-inset-bottom/);
  assert.match(world.getSaveControlsStyles(), /min-height:48px/);
});

test('main game loads save protection before the game bootstrap', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const runtimeScript = html.indexOf('<script src="./ai/world-simulation.js"></script>');
  const gameBootstrap = html.indexOf('window.claude?.hot?.ready');
  assert.ok(runtimeScript >= 0, 'modular simulation runtime script is present');
  assert.ok(gameBootstrap > runtimeScript, 'runtime installs before the game's initial resume/bootstrap check');
  assert.match(html, /OnePieceWorldSimulation\.simulate\(S,population/);
  assert.match(html, /OnePieceCombatAdapter\.modifyOutgoingDamage\(v,S,'op'\)/);
  assert.match(html, /OnePieceCombatAdapter\.modifyIncomingDamage\(d,S,'op'\)/);
});


test('progression controls migrate legacy fruit flags and enforce annual training limits', () => {
  const state = {
    world: 'op', alive: true, year: 1522, powers: ['df_para'],
    flags: { df: 'ผลโอโตะโอโตะ' }, haki: {}
  };
  globalThis.S = state;
  let saves = 0;
  function element(tag) {
    return {
      tagName: tag.toUpperCase(), children: [], attributes: {}, listeners: {}, hidden: false,
      style: {},
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren(...children) { this.children = children; },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      getAttribute(key) { return this.attributes[key] || null; },
      addEventListener(name, handler) { this.listeners[name] = handler; },
      click() { if (!this.disabled && this.listeners.click) this.listeners.click({ target: this }); }
    };
  }
  const body = element('body'), head = element('head');
  const doc = { body, head, readyState: 'complete', createElement: element, getElementById() { return null; } };
  const host = { document: doc, OnePieceProgressionSystem: progression, save() { saves++; }, setInterval() { return 1; } };
  try {
    assert.equal(world.installProgressionControls(host), true);
    const wrap = body.children.find(node => node.id === 'extra-life-progression-tools');
    wrap.children[1].click();
    assert.equal(state.devilFruit.name, 'ผลโอโตะโอโตะ');
    assert.equal(state.devilFruit.type, 'paramecia');
    assert.match(state.devilFruit.id, /^op_df_paramecia_/);
    assert.equal(state.devilFruit.mastery, 0);
    assert.equal(saves, 1);
    let fruitTrain = wrap.children[0].children[1].children.find(node =>
      node.tagName === 'BUTTON' && node.textContent.includes('ฝึกผลปีศาจ'));
    assert.ok(fruitTrain);
    fruitTrain.click();
    assert.equal(state.devilFruit.mastery, 5);
    assert.equal(saves, 2);
    fruitTrain = wrap.children[0].children[1].children.find(node =>
      node.tagName === 'BUTTON' && node.textContent.includes('ฝึกผลปีศาจ'));
    assert.ok(fruitTrain.disabled);
  } finally {
    delete globalThis.S;
  }
});


test('save manager recovers the last known-good backup after primary corruption', () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  const manager = world.saveSystem.createManager(storage);
  assert.equal(manager.save({ world: 'op', year: 1522 }).ok, true);
  assert.equal(manager.save({ world: 'op', year: 1523 }).ok, true);
  storage.setItem('extra-life-v2', '{corrupted');
  const recovered = manager.load();
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.source, 'backup');
  assert.equal(recovered.state.year, 1522);
});
