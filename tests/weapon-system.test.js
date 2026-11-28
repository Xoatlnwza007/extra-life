const test = require('node:test');
const assert = require('node:assert/strict');
const weapons = require('../ai/weapon-system');

const shop = [
  { id: 'knife', n: 'มีด', cat: 'wpn', pw: 4 },
  { id: 'sword', n: 'ดาบ', cat: 'wpn', pw: 12, maxDurability: 80 },
  { id: 'coat', n: 'เสื้อคลุม', cat: 'fit', pw: 0 }
];

test('legacy owned weapon is resolved as strongest without requiring migration', () => {
  const state = { own: { items: ['knife', 'sword', 'coat'] } };
  assert.equal(weapons.getCombatStats(state, shop).weaponId, 'sword');
  assert.equal(weapons.getCombatStats(state, shop).weaponPower, 12);
});

test('only owned weapons can be equipped', () => {
  const state = { own: { items: ['knife'] } };
  assert.equal(weapons.equipWeapon(state, shop, 'sword').reason, 'weapon-not-owned');
  const result = weapons.equipWeapon(state, shop, 'knife');
  assert.equal(result.ok, true);
  assert.equal(result.state.equipment.weaponId, 'knife');
});

test('durability reduces weapon power and broken weapons stop contributing', () => {
  const state = { own: { items: ['sword'] } };
  const equipped = weapons.equipWeapon(state, shop, 'sword').state;
  const worn = weapons.damageDurability(equipped, shop, 50);
  assert.equal(weapons.getCombatStats(worn.state, shop).weaponPower, 9);
  const broken = weapons.damageDurability(worn.state, shop, 30);
  assert.equal(broken.broken, true);
  assert.equal(weapons.getCombatStats(broken.state, shop).weaponPower, 0);
});

test('repair restores durability and allows equipping again', () => {
  const state = { own: { items: ['sword'] }, equipment: { durability: { sword: 0 }, weaponId: null } };
  assert.equal(weapons.equipWeapon(state, shop, 'sword').reason, 'weapon-broken');
  const repaired = weapons.repairWeapon(state, shop, 'sword', 25);
  assert.equal(repaired.durability, 25);
  assert.equal(weapons.equipWeapon(repaired.state, shop, 'sword').ok, true);
});

test('invalid damage and repair inputs do not create negative durability', () => {
  const state = { own: { items: ['knife'] } };
  const equipped = weapons.equipWeapon(state, shop, 'knife').state;
  const damaged = weapons.damageDurability(equipped, shop, -5);
  assert.equal(damaged.durability, 100);
  const repaired = weapons.repairWeapon(damaged.state, shop, 'knife', 1000);
  assert.equal(repaired.durability, 100);
});
