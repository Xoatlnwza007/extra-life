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

 
test('browser bootstrap loads the One Piece companion systems in dependency order', async () => {
  const scripts = [];
  const host = {
    document: {
      head: {
        appendChild(script) {
          scripts.push(script.src);
          const globals = {
            './ai/event-adapter.js': 'OnePieceEventAdapter',
            './ai/crew-system.js': 'OnePieceCrewSystem',
            './ai/devil-fruit-system.js': 'OnePieceDevilFruitSystem',
            './ai/haki-system.js': 'OnePieceHakiSystem'
          };
          host[globals[script.src]] = {};
          queueMicrotask(() => script.onload());
        }
      },
      createElement: () => ({})
    }
  };
  assert.equal(await world.loadCompanionModules(host), true);
  assert.deepEqual(scripts, [
    './ai/event-adapter.js',
    './ai/crew-system.js',
    './ai/devil-fruit-system.js',
    './ai/haki-system.js'
  ]);
  assert.equal(await world.loadCompanionModules(host), true);
  assert.equal(scripts.length, 4);
});

test('browser bootstrap reports a missing companion module without stopping later loads', async () => {
  const scripts = [];
  const host = {
    document: {
      head: {
        appendChild(script) {
          scripts.push(script.src);
          if (script.src === './ai/event-adapter.js') {
            queueMicrotask(() => script.onerror(new Error('network')));
            return;
          }
          const globals = {
            './ai/crew-system.js': 'OnePieceCrewSystem',
            './ai/devil-fruit-system.js': 'OnePieceDevilFruitSystem',
            './ai/haki-system.js': 'OnePieceHakiSystem'
          };
          host[globals[script.src]] = {};
          queueMicrotask(() => script.onload());
        }
      },
      createElement: () => ({})
    }
  };
  assert.equal(await world.loadCompanionModules(host), false);
  assert.deepEqual(host.__onePieceModuleErrors, ['./ai/event-adapter.js']);
  assert.equal(scripts.length, 4);
});

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

test('pirate crew management is limited to active One Piece pirate careers', () => {
  assert.equal(world.canManagePirateCrew({ world: 'op', alive: true, job: { id: 'pirate' } }), false);
  assert.equal(world.canManagePirateCrew({ world: 'op', alive: true, job: { id: 'pcapt' } }), true);
  assert.equal(world.canManagePirateCrew({ world: 'op', alive: true, job: { id: 'marine' } }), false);
  assert.equal(world.canManagePirateCrew({ world: 'naruto', alive: true, job: { id: 'pirate' } }), false);
  assert.equal(world.canManagePirateCrew({ world: 'op', alive: false, job: { id: 'pcapt' } }), false);
});

test('pirate crew panel creates a crew and recruits an NPC through its controls', () => {
  const previousState = globalThis.S;
  const previousWorld = globalThis.W;
  const previousBuy = globalThis.buy;
  function element(tag) {
    return {
      tagName: tag.toUpperCase(), children: [], attributes: {}, listeners: {}, value: '',
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren(...children) { this.children = children; },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      getAttribute(key) { return this.attributes[key] || null; },
      addEventListener(name, handler) { this.listeners[name] = handler; },
      click() { if (this.listeners.click) this.listeners.click({ target: this }); },
      dispatch(name) { if (this.listeners[name]) this.listeners[name]({ target: this }); }
    };
  }
  const head = element('head');
  const body = element('body');
  const doc = {
    head, body, readyState: 'complete',
    createElement: element,
    getElementById(id) { return body.children.find(node => node.id === id) || null; }
  };
  const state = {
    world: 'op', alive: true, job: { id: 'pcapt' }, name: 'Luffy',
    flags: { bounty: 0 }, fame: 0, dark: 0, money: 100, own: { items: [] },
    npcs: [{ id: 'nami', n: 'Nami', alive: true, d: 'navigator' }],
    crews: []
  };
  globalThis.S = state;
  globalThis.W = { shop: [{ id: 'boat', n: 'เรือใบลำเล็ก', cost: 40 }] };
  globalThis.buy = item => { state.money -= item.cost; state.own.items.push(item.id); };
  const host = { document: doc, OnePieceCrewSystem: crews, setInterval: () => 1 };
  try {
    assert.equal(world.installCrewControls(host), true);
    const wrap = body.children.find(node => node.id === 'extra-life-crew-tools');
    assert.ok(wrap);
    assert.equal(wrap.hidden, false);
    const panel = wrap.children[0];
    const trigger = wrap.children[1];
    trigger.click();
    assert.equal(panel.hidden, false);

    const panelBody = panel.children[1];
    const createButton = panelBody.children[1].children[1];
    createButton.click();
    assert.equal(state.crews.length, 1);
    assert.equal(state.crews[0].captainId, 'player');

    const buyButton = panelBody.children.find(node => node.tagName === 'BUTTON' && node.textContent.startsWith('ซื้อเรือใบ'));
    buyButton.click();
    assert.deepEqual(state.own.items, ['boat']);
    assert.ok(state.crews[0].history.some(entry => entry.type === 'ship-purchased'));
    const shipForm = panelBody.children.find(node => node.className === 'el-crew-form');
    shipForm.children[0].value = 'Going Merry';
    shipForm.children[1].click();
    assert.equal(state.crews[0].shipName, 'Going Merry');
    assert.equal(state.flags.shipName, 'Going Merry');

    const recruitRow = panelBody.children[panelBody.children.length - 1];
    recruitRow.children[1].click();
    assert.equal(state.crews[0].members.length, 2);
    assert.ok(state.crews[0].members.some(member => member.characterId === 'nami'));
    assert.ok(panelBody.children.some(node => typeof node.textContent === 'string' && node.textContent.includes('Nami เข้าร่วมลูกเรือ')));

    const memberRow = panelBody.children.find(node =>
      node.className === 'el-crew-row' &&
      node.children.some(child => child.tagName === 'SELECT')
    );
    const roleSelect = memberRow.children.find(child => child.tagName === 'SELECT');
    roleSelect.value = 'cook';
    roleSelect.dispatch('change');
    assert.equal(state.crews[0].members.find(member => member.characterId === 'nami').role, 'cook');
    state.crews[0].history.push(
      { type: 'bounty-increased', amount: 2500000, at: '2026-11-26T00:00:00.000Z' },
      { type: 'reputation-changed', delta: 5, reputation: 45, at: '2026-11-25T00:00:00.000Z' }
    );
    trigger.click();
    trigger.click();
    const historyEntries = panel.children[1].children.filter(node =>
      node.className === 'el-crew-muted' && /ค่าหัวเพิ่มขึ้น|ชื่อเสียงเปลี่ยน/.test(node.textContent)
    );
    assert.equal(historyEntries.length, 2);
    const bountyHistory = historyEntries.find(node => node.textContent.includes('ค่าหัวเพิ่มขึ้น'));
    const reputationHistory = historyEntries.find(node => node.textContent.includes('ชื่อเสียงเปลี่ยน'));
    assert.ok(bountyHistory.textContent.includes('ค่าหัวเพิ่มขึ้น 2,500,000 เบรี'));
    assert.ok(reputationHistory.textContent.includes('ชื่อเสียงเปลี่ยน +5'));
  } finally {
    if (previousState === undefined) delete globalThis.S;
    else globalThis.S = previousState;
    if (previousWorld === undefined) delete globalThis.W;
    else globalThis.W = previousWorld;
    if (previousBuy === undefined) delete globalThis.buy;
    else globalThis.buy = previousBuy;
  }
});

test('crew management panel is sized for mobile touch and safe scrolling', () => {
  const styles = world.getCrewControlsStyles();
  assert.match(styles, /min-height:44px/);
  assert.match(styles, /touch-action:manipulation/);
  assert.match(styles, /max-height:min\(70dvh,calc\(100dvh - 100px/);
  assert.match(styles, /safe-area-inset-left/);
  assert.match(styles, /max-width:380px/);
  assert.ok(styles.includes('minmax(96px,auto) auto'));
});

test('crew boat purchase respects the game wallet and existing inventory', () => {
  const state = { world: 'op', money: 20, own: { items: [] } };
  const boat = { id: 'boat', cost: 40 };
  let purchases = 0;
  const buy = item => {
    purchases += 1;
    state.money -= item.cost;
    state.own.items.push(item.id);
  };
  assert.equal(world.buyBoatForPlayerCrew(state, boat, buy).reason, 'insufficient-funds');
  assert.equal(world.buyBoatForPlayerCrew({ world: 'op', own: { items: [] } }, boat, buy).reason, 'insufficient-funds');
  assert.equal(purchases, 0);
  state.money = 60;
  const result = world.buyBoatForPlayerCrew(state, boat, buy);
  assert.equal(result.ok, true);
  assert.equal(state.money, 20);
  assert.deepEqual(state.own.items, ['boat']);
  assert.equal(world.buyBoatForPlayerCrew(state, boat, buy).alreadyOwned, true);
  assert.equal(purchases, 1);
});

test('player crew is stored in game state and recruits NPCs persistently', () => {
  const state = {
    world: 'op',
    name: 'Monkey D. Luffy',
    flags: { bounty: 30000000 },
    fame: 60,
    dark: 15,
    npcBrains: { 'op-npc-Nami': stateApi.createCharacterState({ id: 'op-npc-Nami' }) },
    npcs: [
      { id: 'npc-nami', n: 'Nami', alive: true },
      { n: 'Zoro', alive: true },
      { n: 'Zoro', alive: true },
      { n: 'Lost Villager', alive: false }
    ]
  };
  const created = world.createPlayerCrew(state, 'Straw Hat Pirates', crews);
  assert.equal(created.ok, true);
  assert.equal(created.crew.captainId, 'player');
  assert.equal(state.flags.crew, 'Straw Hat Pirates');
  assert.equal(world.getPlayerCrew(state, crews).id, created.crew.id);
  assert.equal(world.createPlayerCrew(state, 'Second Crew', crews).reason, 'already-has-crew');

  const synced = world.syncPlayerCrew(state, crews);
  assert.equal(synced.changed, true);
  assert.equal(synced.crew.bounty, 30000000);
  assert.equal(synced.crew.reputation, 45);
  assert.deepEqual(synced.crew.history.map(entry => entry.type), ['bounty-increased', 'reputation-changed']);
  state.flags.bounty = 50000000;
  state.fame = 20;
  state.dark = 60;
  const updatedCrew = world.syncPlayerCrew(state, crews).crew;
  assert.equal(updatedCrew.reputation, -40);
  assert.equal(updatedCrew.history.length, 4);
  assert.equal(updatedCrew.history[2].amount, 20000000);

  const joined = world.recruitNpcToPlayerCrew(state, state.npcs[0], 'navigator', crews);
  assert.equal(joined.joined, true);
  assert.equal(joined.member.characterId, 'npc-nami');
  assert.equal(stateApi.getRelationship(state.npcBrains['op-npc-Nami'], 'player'), 15);
  assert.equal(state.npcBrains['op-npc-Nami'].memories.at(-1).source, 'crew');
  assert.equal(world.recruitNpcToPlayerCrew(state, state.npcs[0], 'navigator', crews).reason, 'already-member');
  assert.equal(world.recruitNpcToPlayerCrew(state, state.npcs[1], 'fighter', crews).joined, true);
  assert.equal(world.recruitNpcToPlayerCrew(state, state.npcs[2], 'fighter', crews).joined, true);
  assert.notEqual(world.crewNpcId(state.npcs[1], 1), world.crewNpcId(state.npcs[2], 2));
  assert.equal(world.recruitNpcToPlayerCrew(state, state.npcs[3], 'fighter', crews).reason, 'invalid-recruitment');

  const saved = JSON.parse(JSON.stringify(state));
  const encoded = world.saveSystem.encode(saved);
  const decoded = world.saveSystem.decode(encoded);
  assert.deepEqual(decoded.data.crews, saved.crews);
  assert.equal(world.getPlayerCrew(saved, crews).members.length, 4);
  const left = world.removeNpcFromPlayerCrew(saved, 'npc-nami', crews);
  assert.equal(left.left, true);
  assert.equal(world.getPlayerCrew(saved, crews).members.length, 3);
  assert.equal(stateApi.getRelationship(saved.npcBrains['op-npc-Nami'], 'player'), 3);
  assert.equal(saved.npcBrains['op-npc-Nami'].memories.at(-1).source, 'crew');
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
  assert.deepEqual(fruits.getSeaEffect(user, { submerged: true }), {
    weakened: true, canSwim: false, strengthMultiplier: 0.5
  });
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
  const trainedCombatant = {
    id: 'combatant',
    haki: {
      armament: { unlocked: true, mastery: 80 },
      observation: { unlocked: true, mastery: 50 },
      conquerors: { unlocked: false, mastery: 100 }
    }
  };
  assert.deepEqual(haki.getCombatProfile(trainedCombatant), {
    defenseBonus: 24,
    awarenessBonus: 15,
    pressureBonus: 0,
    ranks: { armament: 'expert', observation: 'adept', conquerors: 'untrained' }
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



test('One Piece yearly simulation advances a solo living NPC through all twelve months', () => {
  const npcs = [{ n: 'Last Sailor', r: 'grump', alive: true }];
  const gameState = { world: 'op', year: 1520, npcBrains: {} };
  const result = world.simulate(gameState, npcs, { random: () => 0.25 });

  assert.equal(result.simulatedCount, 1);
  assert.equal(result.simulatedMonths, 12);
  assert.equal(result.actionCount, 12);
  assert.equal(result.actions.length, 12);
  assert.equal(result.monthlyResults.length, 12);
  assert.equal(result.simulationCalendar.year, 1520);
  assert.equal(result.simulationCalendar.totalMonths, 12);
  assert.ok(result.profiles['Last Sailor']);
  assert.deepEqual(gameState.npcSimulationCalendar, result.simulationCalendar);
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
