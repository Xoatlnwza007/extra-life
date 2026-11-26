/* One Piece Life Simulator — event decision adapter
 * Bridges existing event-choice objects to OnePieceDecisionEngine.
 * This module is deliberately side-effect free and preserves the original
 * choice object so callers can keep using the game's existing event flow.
 */
(function (root) {
  'use strict';

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toCandidate(choice, index) {
    const source = choice || {};
    const effects = source.effects || source.effect || {};
    const tags = source.tags || source.aiTags || source.category || [];
    const relief = source.relief || source.needRelief || {};
    return {
      id: String(source.id ?? source.key ?? 'choice-' + index),
      available: source.available !== false && source.disabled !== true,
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
    if (!options.length) return { choice: null, ranking: [], usedAI: false };

    const engine = root.OnePieceDecisionEngine;
    if (!engine || typeof engine.decide !== 'function') {
      return { choice: options[0], ranking: [], usedAI: false };
    }

    const candidates = options.map(toCandidate);
    const result = engine.decide(state || {}, candidates, context);
    if (!result || !result.action) {
      return { choice: options[0], ranking: [], usedAI: false };
    }

    return {
      choice: result.action.original || options[0],
      ranking: result.ranking || [],
      usedAI: true
    };
  }

  const api = Object.freeze({ choose, toCandidate });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceEventAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
