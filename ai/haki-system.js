/* One Piece Life Simulator — Haki progression rules.
 * Pure character-state helpers; combat and persistence remain game-layer concerns.
 */
(function (root) {
  'use strict';

  const TYPES = Object.freeze(['armament', 'observation', 'conquerors']);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function createHakiState(options = {}) {
    const conquerorsUnlocked = Boolean(options.hasConquerorsHaki);
    const makeStyle = unlocked => ({ unlocked, mastery: 0 });
    return {
      armament: makeStyle(true),
      observation: makeStyle(true),
      conquerors: makeStyle(conquerorsUnlocked)
    };
  }

  function train(character, type, amount) {
    if (!character || !character.haki || !TYPES.includes(type)) {
      return { trained: false, reason: 'invalid-character-or-type', character };
    }
    const style = character.haki[type];
    if (!style || !style.unlocked) return { trained: false, reason: 'haki-locked', character };
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return { trained: false, reason: 'invalid-training', character };
    }
    const current = clamp(Number(style.mastery) || 0, 0, 100);
    const mastery = clamp(current + value, 0, 100);
    return {
      trained: mastery > current,
      gained: mastery - current,
      character: {
        ...character,
        haki: { ...character.haki, [type]: { ...style, mastery } }
      }
    };
  }

  function masteryRank(value) {
    const mastery = clamp(Number(value) || 0, 0, 100);
    if (mastery >= 90) return 'master';
    if (mastery >= 65) return 'expert';
    if (mastery >= 35) return 'adept';
    if (mastery > 0) return 'novice';
    return 'untrained';
  }

  function getCombatProfile(character) {
    const haki = (character && character.haki) || {};
    const score = type => haki[type] && haki[type].unlocked
      ? clamp(Number(haki[type].mastery) || 0, 0, 100) : 0;
    const armament = score('armament');
    const observation = score('observation');
    const conquerors = score('conquerors');
    return {
      defenseBonus: Math.round(armament * 0.3),
      awarenessBonus: Math.round(observation * 0.3),
      pressureBonus: Math.round(conquerors * 0.3),
      ranks: {
        armament: masteryRank(armament),
        observation: masteryRank(observation),
        conquerors: masteryRank(conquerors)
      }
    };
  }

  const api = Object.freeze({ TYPES, createHakiState, train, masteryRank, getCombatProfile });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceHakiSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
