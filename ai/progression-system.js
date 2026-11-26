/* One Piece Life Simulator — character progression coordinator.
 * Connects Haki and Devil Fruit rules to a single immutable character state.
 */
(function (root) {
  'use strict';
  function systems(options = {}) {
    return { haki: options.hakiSystem || root.OnePieceHakiSystem,
      fruit: options.devilFruitSystem || root.OnePieceDevilFruitSystem };
  }
  function syncCharacter(character, options = {}) {
    if (!character || typeof character !== 'object') return { ok: false, reason: 'invalid-character', character };
    const api = systems(options);
    if (!api.haki || !api.fruit) return { ok: false, reason: 'systems-not-ready', character };
    const synced = api.haki.syncUnlockedStyles(character, Array.isArray(character.powers) ? character.powers : []);
    if (!synced.synced) return { ok: false, reason: synced.reason, character };
    return { ok: true, changed: synced.changed, character: synced.character };
  }
  function trainHaki(character, type, amount, options = {}) {
    const api = systems(options).haki;
    if (!api) return { trained: false, reason: 'haki-system-not-ready', character };
    const synced = syncCharacter(character, options);
    if (!synced.ok) return { trained: false, reason: synced.reason, character };
    return api.train(synced.character, type, amount);
  }
  function consumeFruit(character, fruit, options = {}) {
    const api = systems(options).fruit;
    return api ? api.consumeFruit(character, fruit, options) :
      { consumed: false, reason: 'fruit-system-not-ready', character, fruit };
  }
  function trainFruit(character, amount, options = {}) {
    const api = systems(options).fruit;
    return api ? api.trainMastery(character, amount) :
      { trained: false, reason: 'fruit-system-not-ready', character };
  }
  function awakenFruit(character, options = {}) {
    const api = systems(options).fruit;
    return api ? api.awaken(character, options) :
      { awakened: false, reason: 'fruit-system-not-ready', character };
  }
  function getSeaEffect(character, environment, options = {}) {
    const api = systems(options).fruit;
    return api ? api.getSeaEffect(character, environment) :
      { weakened: false, canSwim: true, strengthMultiplier: 1 };
  }
  function getSummary(character, options = {}) {
    const api = systems(options);
    if (!character || typeof character !== 'object' || !api.haki || !api.fruit)
      return { ready: false, reason: 'invalid-character-or-systems' };
    const haki = character.haki || {}, fruit = character.devilFruit || null;
    return {
      ready: true,
      haki: Object.fromEntries(api.haki.TYPES.map(type => {
        const style = haki[type] || {};
        return [type, { unlocked: Boolean(style.unlocked),
          mastery: Math.max(0, Math.min(100, Number(style.mastery) || 0)),
          rank: api.haki.masteryRank(style.mastery) }];
      })),
      devilFruit: fruit ? { id: fruit.id, name: fruit.name, type: fruit.type,
        mastery: Math.max(0, Math.min(100, Number(fruit.mastery) || 0)),
        awakened: Boolean(fruit.awakened) } : null
    };
  }
  const api = Object.freeze({ syncCharacter, trainHaki, consumeFruit, trainFruit,
    awakenFruit, getSeaEffect, getSummary });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceProgressionSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
