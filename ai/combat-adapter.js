/* One Piece Life Simulator — bridge power unlocks and mastery into combat math.
 * Supports legacy S.powers flags and optional progression records (state.haki,
 * state.devilFruit). The game layer owns progression and persistence.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const masteryOf = style => style && style.unlocked
    ? clamp(Number(style.mastery) || 0, 0, 100) : 0;

  function getModifiers(state, worldId) {
    if (worldId !== 'op' || !state) {
      return { outgoing: 1, incoming: 1 };
    }
    const powers = new Set(Array.isArray(state.powers) ? state.powers : []);
    const fruit = state.devilFruit || null;
    const fruitType = fruit && ['paramecia', 'zoan', 'logia'].includes(fruit.type)
      ? fruit.type : null;
    let outgoing = 1;
    let incoming = 1;

    if (powers.has('df_para') || fruitType === 'paramecia') outgoing *= 1.10;
    if (powers.has('df_zoan') || fruitType === 'zoan') { outgoing *= 1.12; incoming *= 0.88; }
    if (powers.has('df_logia') || fruitType === 'logia') { outgoing *= 1.10; incoming *= 0.92; }
    if (powers.has('haki_arm')) { outgoing *= 1.15; incoming *= 0.90; }
    if (powers.has('haki_obs')) incoming *= 0.90;
    if (powers.has('haki_king')) outgoing *= 1.12;

    // Mastery scales unlocked techniques gradually instead of granting the
    // full unlock bonus at every training level.
    const haki = state.haki || {};
    const armament = masteryOf(haki.armament);
    const observation = masteryOf(haki.observation);
    const conquerors = masteryOf(haki.conquerors);
    outgoing *= 1 + armament * 0.0008 + conquerors * 0.0006;
    incoming *= 1 - armament * 0.0005 - observation * 0.0008;

    // Fruit mastery and awakening only apply when a fruit progression record
    // exists. A fruit's type can also identify the baseline power family.
    if (fruitType) {
      const fruitMastery = clamp(Number(fruit.mastery) || 0, 0, 100);
      outgoing *= 1 + fruitMastery * 0.0008 + (fruit.awakened ? 0.05 : 0);
      if (fruitType === 'zoan') incoming *= 1 - fruitMastery * 0.00035;
      if (fruitType === 'logia') incoming *= 1 - fruitMastery * 0.0002;
      if (fruit.awakened) incoming *= 0.97;
    }

    return {
      outgoing: clamp(outgoing, 0.55, 1.85),
      incoming: clamp(incoming, 0.45, 1)
    };
  }

  function modifyOutgoingDamage(damage, state, worldId) {
    const value = Number(damage);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.max(0, Math.round(value * getModifiers(state, worldId).outgoing));
  }

  function modifyIncomingDamage(damage, state, worldId) {
    const value = Number(damage);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.max(0, Math.round(value * getModifiers(state, worldId).incoming));
  }

  const api = Object.freeze({ getModifiers, modifyOutgoingDamage, modifyIncomingDamage });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceCombatAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
