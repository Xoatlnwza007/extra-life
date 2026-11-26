/* One Piece Life Simulator — NPC decision adapter.
 * Bridges character state + candidate activities to decision-engine.js.
 */
(function (root) {
  'use strict';

  function getDependencies() {
    const engine = root.OnePieceDecisionEngine;
    const stateApi = root.OnePieceCharacterState;
    if (!engine || !stateApi) throw new Error('Load decision-engine.js and character-state.js before npc-brain.js');
    return { engine, stateApi };
  }

  function decide(character, candidates, context = {}) {
    const { engine } = getDependencies();
    const result = engine.decide(character || {}, candidates || [], context);
    return {
      action: result.action,
      ranking: result.ranking,
      characterId: character && character.id || null,
      decidedAt: new Date().toISOString()
    };
  }

  function recordOutcome(character, decision, outcome = {}) {
    const { stateApi } = getDependencies();
    if (!character || !decision || !decision.action) return character;
    const action = decision.action;
    const next = {
      ...character,
      lastDecision: {
        actionId: action.id,
        decidedAt: decision.decidedAt || new Date().toISOString(),
        score: (decision.ranking || []).find(item => item.id === action.id)?.score ?? null
      }
    };
    const event = outcome.event || ('ทำกิจกรรม: ' + (action.label || action.name || action.id));
    return stateApi.remember(next, event, {
      tags: [...new Set([...(Array.isArray(action.tags) ? action.tags : []), ...(outcome.tags || [])])],
      importance: outcome.importance ?? 1,
      polarity: outcome.polarity || 'positive',
      source: 'npc-action'
    });
  }

  const api = Object.freeze({ decide, recordOutcome });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceNPCBrain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
