/* One Piece Life Simulator — Devil Fruit rules.
 * Pure data helpers. The game layer owns persistence, inventory and UI.
 */
(function (root) {
  'use strict';

  const TYPES = Object.freeze(['paramecia', 'zoan', 'logia']);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function createFruit(input = {}) {
    const type = String(input.type || '').toLowerCase();
    const name = String(input.name || '').trim();
    if (!name || !TYPES.includes(type)) return { created: false, reason: 'invalid-fruit' };
    return {
      created: true,
      fruit: {
        id: String(input.id || ('fruit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7))),
        name,
        type,
        rarity: String(input.rarity || 'unknown'),
        consumedBy: null,
        consumedAt: null
      }
    };
  }

  function consumeFruit(character, fruit, options = {}) {
    if (!character || !character.id || !fruit || !fruit.id || !TYPES.includes(fruit.type)) {
      return { consumed: false, reason: 'invalid-input', character, fruit };
    }
    if (character.devilFruit) return { consumed: false, reason: 'already-has-devil-fruit', character, fruit };
    if (fruit.consumedBy) return { consumed: false, reason: 'fruit-already-consumed', character, fruit };
    const consumedAt = options.at || new Date().toISOString();
    const nextCharacter = {
      ...character,
      devilFruit: {
        id: fruit.id,
        name: fruit.name,
        type: fruit.type,
        mastery: 0,
        awakened: false,
        consumedAt
      }
    };
    const nextFruit = { ...fruit, consumedBy: String(character.id), consumedAt };
    return { consumed: true, character: nextCharacter, fruit: nextFruit };
  }

  function trainMastery(character, amount) {
    const value = Number(amount);
    if (!character || !character.devilFruit) return { trained: false, reason: 'no-devil-fruit', character };
    if (!Number.isFinite(value) || value <= 0) return { trained: false, reason: 'invalid-training', character };
    const current = clamp(Number(character.devilFruit.mastery) || 0, 0, 100);
    const mastery = clamp(current + value, 0, 100);
    return {
      trained: mastery > current,
      gained: mastery - current,
      character: { ...character, devilFruit: { ...character.devilFruit, mastery } }
    };
  }

  function awaken(character, options = {}) {
    if (!character || !character.devilFruit) return { awakened: false, reason: 'no-devil-fruit', character };
    if (character.devilFruit.awakened) return { awakened: false, reason: 'already-awakened', character };
    const mastery = clamp(Number(character.devilFruit.mastery) || 0, 0, 100);
    const threshold = clamp(Number(options.requiredMastery) || 80, 1, 100);
    if (mastery < threshold) {
      return { awakened: false, reason: 'insufficient-mastery', required: threshold, current: mastery, character };
    }
    return {
      awakened: true,
      character: {
        ...character,
        devilFruit: {
          ...character.devilFruit,
          awakened: true,
          awakenedAt: options.at || new Date().toISOString()
        }
      }
    };
  }

  function getSeaEffect(character, environment = {}) {
    const hasFruit = Boolean(character && character.devilFruit);
    const exposedToWater = Boolean(environment.inSea || environment.submerged || environment.seaStone);
    if (!hasFruit || !exposedToWater) {
      return { weakened: false, canSwim: true, strengthMultiplier: 1 };
    }
    return {
      weakened: true,
      canSwim: false,
      strengthMultiplier: environment.seaStone ? 0.25 : 0.5
    };
  }

  const api = Object.freeze({ TYPES, createFruit, consumeFruit, trainMastery, awaken, getSeaEffect });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceDevilFruitSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
