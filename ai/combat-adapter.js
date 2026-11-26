/* One Piece Life Simulator — bridge existing unlock flags into combat math.
 * Mastery progression remains a separate system; these are baseline bonuses
 * for powers already unlocked in the main game's S.powers array.
 */
(function (root) {
  'use strict';

  function getModifiers(state, worldId) {
    if (worldId !== 'op' || !state) {
      return { outgoing: 1, incoming: 1 };
    }
    const powers = new Set(Array.isArray(state.powers) ? state.powers : []);
    let outgoing = 1;
    let incoming = 1;

    if (powers.has('df_para')) outgoing *= 1.10;
    if (powers.has('df_zoan')) { outgoing *= 1.12; incoming *= 0.88; }
    if (powers.has('df_logia')) { outgoing *= 1.10; incoming *= 0.92; }
    if (powers.has('haki_arm')) { outgoing *= 1.15; incoming *= 0.90; }
    if (powers.has('haki_obs')) incoming *= 0.90;
    if (powers.has('haki_king')) outgoing *= 1.12;

    return {
      outgoing: Math.min(1.65, outgoing),
      incoming: Math.max(0.55, incoming)
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
