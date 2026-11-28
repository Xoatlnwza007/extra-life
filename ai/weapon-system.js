/* One Piece Life Simulator — backward-compatible weapon/equipment rules.
 * Reads legacy shop entries (id, n, cat:'wpn', pw) and adds optional equipped
 * weapon state, durability, repair and stat calculation. No DOM or storage.
 * The game layer remains responsible for saving the returned state.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function isWeapon(item) {
    return Boolean(item && item.id != null && (item.cat === 'wpn' || finite(item.pw) > 0));
  }

  function getCatalog(shop) {
    return (Array.isArray(shop) ? shop : []).filter(isWeapon).map(item => ({
      id: String(item.id), name: String(item.n || item.name || item.id),
      power: Math.max(0, finite(item.pw)), category: item.cat || 'wpn',
      rarity: item.rarity || 'common',
      maxDurability: Math.max(1, finite(item.maxDurability, 100)), source: item
    }));
  }

  function getOwnedWeaponIds(state) {
    const items = state && state.own && Array.isArray(state.own.items) ? state.own.items : [];
    return new Set(items.map(String));
  }

  function resolveWeapon(state, shop, weaponId) {
    const owned = getOwnedWeaponIds(state);
    const candidates = getCatalog(shop).filter(item => owned.has(item.id));
    if (weaponId != null) return candidates.find(item => item.id === String(weaponId)) || null;

    const equipment = state && state.equipment;
    if (equipment && Object.prototype.hasOwnProperty.call(equipment, 'weaponId')) {
      if (equipment.weaponId == null) return null;
      return candidates.find(item => item.id === String(equipment.weaponId)) || null;
    }

    // Legacy saves have no equipment.weaponId: preserve strongest-owned behavior.
    return candidates.sort((a, b) => b.power - a.power)[0] || null;
  }

  function getDurability(state, weapon) {
    if (!weapon) return 0;
    const stored = state && state.equipment && state.equipment.durability &&
      state.equipment.durability[weapon.id];
    return clamp(finite(stored, weapon.maxDurability), 0, weapon.maxDurability);
  }

  function equipWeapon(state, shop, weaponId) {
    if (!state || typeof state !== 'object') return { ok: false, reason: 'invalid-state', state };
    const weapon = resolveWeapon(state, shop, weaponId);
    if (!weapon) return { ok: false, reason: 'weapon-not-owned', state };
    if (getDurability(state, weapon) <= 0) return { ok: false, reason: 'weapon-broken', state };
    const equipment = { ...(state.equipment || {}), weaponId: weapon.id,
      durability: { ...((state.equipment || {}).durability || {}) } };
    if (equipment.durability[weapon.id] == null) equipment.durability[weapon.id] = weapon.maxDurability;
    return { ok: true, state: { ...state, equipment }, weapon };
  }

  function unequipWeapon(state) {
    if (!state || typeof state !== 'object') return { ok: false, reason: 'invalid-state', state };
    return { ok: true, state: { ...state, equipment: { ...(state.equipment || {}), weaponId: null } } };
  }

  function getCombatStats(state, shop) {
    const weapon = resolveWeapon(state, shop);
    const durability = getDurability(state, weapon);
    const usable = Boolean(weapon && durability > 0);
    const condition = usable ? durability / weapon.maxDurability : 0;
    const power = usable ? Math.round(weapon.power * (condition < 0.2 ? 0.5 : condition < 0.5 ? 0.8 : 1)) : 0;
    return {
      weaponId: usable ? weapon.id : null, weaponName: usable ? weapon.name : null,
      weaponPower: power, durability, maxDurability: usable ? weapon.maxDurability : 0,
      broken: Boolean(weapon && !usable)
    };
  }

  function damageDurability(state, shop, amount = 1) {
    if (!state || typeof state !== 'object') return { ok: false, reason: 'invalid-state', state };
    const weapon = resolveWeapon(state, shop);
    if (!weapon) return { ok: false, reason: 'no-weapon', state };
    const damage = Math.max(0, Math.floor(finite(amount)));
    const current = getDurability(state, weapon);
    const nextValue = clamp(current - damage, 0, weapon.maxDurability);
    const equipment = { ...(state.equipment || {}), durability: {
      ...((state.equipment || {}).durability || {}), [weapon.id]: nextValue
    } };
    if (nextValue === 0 && equipment.weaponId === weapon.id) equipment.weaponId = null;
    return { ok: true, broken: current > 0 && nextValue === 0,
      state: { ...state, equipment }, durability: nextValue, weapon };
  }

  function repairWeapon(state, shop, weaponId, amount = Infinity) {
    if (!state || typeof state !== 'object') return { ok: false, reason: 'invalid-state', state };
    const weapon = resolveWeapon(state, shop, weaponId);
    if (!weapon) return { ok: false, reason: 'weapon-not-owned', state };
    const current = getDurability(state, weapon);
    const repair = amount === Infinity ? weapon.maxDurability : Math.max(0, finite(amount));
    const nextValue = clamp(current + repair, 0, weapon.maxDurability);
    const equipment = { ...(state.equipment || {}), durability: {
      ...((state.equipment || {}).durability || {}), [weapon.id]: nextValue
    } };
    return { ok: nextValue > current, state: { ...state, equipment }, repaired: nextValue - current,
      durability: nextValue, weapon };
  }

  const api = Object.freeze({ isWeapon, getCatalog, getOwnedWeaponIds, resolveWeapon,
    getDurability, equipWeapon, unequipWeapon, getCombatStats, damageDurability, repairWeapon });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceWeaponSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
