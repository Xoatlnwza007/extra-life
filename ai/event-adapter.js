/* One Piece Life Simulator — event decision adapter
 * Bridges legacy game choices to OnePieceDecisionEngine without executing
 * choice effects. The original choice object is returned for the game to apply.
 */
(function (root) {
  'use strict';

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function isAvailable(choice) {
    const source = choice || {};
    return source.available !== false && source.disabled !== true &&
      source.ok !== false && source.skip !== true;
  }

  function toCandidate(choice, index) {
    const source = choice || {};
    const effects = source.effects || source.effect || {};
    const tags = source.tags || source.aiTags || source.category || source.g || [];
    const relief = source.relief || source.needRelief || {};
    return {
      id: String(source.id ?? source.key ?? 'choice-' + index),
      available: isAvailable(source),
      tags,
      relief,
      risk: number(source.risk ?? source.danger),
      resourceCost: number(source.resourceCost ?? source.cost),
      travelCost: number(source.travelCost),
      expectedReward: number(source.expectedReward ?? source.reward ?? effects.reward),
      opportunityValue: number(source.opportunityValue),
      relationshipValue: number(source.relationshipValue ?? effects.relationship),
      original: source
    };
  }

  function choose(state, choices, context = {}) {
    const options = Array.isArray(choices) ? choices : [];
    const available = options.filter(isAvailable);
    if (!available.length) return { choice: null, ranking: [], usedAI: false };

    const engine = root.OnePieceDecisionEngine;
    if (!engine || typeof engine.decide !== 'function') {
      return { choice: available[0], ranking: [], usedAI: false };
    }

    const candidates = available.map(toCandidate);
    const result = engine.decide(state || {}, candidates, context);
    if (!result || !result.action) {
      return { choice: available[0], ranking: [], usedAI: false };
    }

    return {
      choice: result.action.original || available[0],
      ranking: result.ranking || [],
      usedAI: true
    };
  }

  const api = Object.freeze({ choose, toCandidate, isAvailable });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceEventAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
