/* One Piece Life Simulator — autonomous decision engine
 * Pure utility scorer. No DOM, storage, or game-global dependencies.
 * Integration contract: decide(state, candidates, context) -> { action, ranking }.
 */
(function (root) {
  'use strict';

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const tokens = value => Array.isArray(value) ? value : String(value || '').split(/[\s,|]+/).filter(Boolean);

  function needValue(state, action) {
    const needs = state.needs || {};
    const relief = action.relief || {};
    let score = 0;
    for (const [key, amount] of Object.entries(relief)) {
      const deficit = clamp(100 - num(needs[key], 50), 0, 100) / 100;
      score += deficit * num(amount) * 0.24;
    }
    return score;
  }

  function goalValue(state, action) {
    const goals = state.goals || [];
    const tags = new Set(tokens(action.tags));
    let score = 0;
    for (const goal of goals) {
      if (goal.status && goal.status !== 'active') continue;
      const weight = clamp(num(goal.priority, 50) / 50, 0.2, 2);
      if (goal.action === action.id || (goal.tags || []).some(tag => tags.has(tag))) {
        score += 18 * weight;
      }
    }
    return score;
  }

  function personalityValue(state, action) {
    const traits = state.traits || [];
    const tags = tokens(action.tags);
    let score = 0;
    for (const trait of traits) {
      const preferences = (state.personalityPreferences || {})[trait] || {};
      for (const tag of tags) score += num(preferences[tag]) * 3;
      if (action.risk > 0 && trait === 'cautious') score -= action.risk * 0.12;
      if (action.risk > 0 && ['brave', 'reckless', 'ambitious'].includes(trait)) score += action.risk * 0.07;
    }
    return score;
  }

  function memoryValue(state, action) {
    const memories = state.memories || [];
    const tags = new Set(tokens(action.tags));
    let score = 0;
    for (const memory of memories.slice(-40)) {
      if (memory.expired) continue;
      const relevance = (memory.tags || []).filter(tag => tags.has(tag)).length;
      if (!relevance) continue;
      const strength = clamp(num(memory.importance, 1), 0, 5);
      const polarity = memory.polarity === 'negative' ? -1 : 1;
      score += relevance * strength * polarity * 1.5;
    }
    return clamp(score, -15, 15);
  }

  function scoreAction(state, action, context = {}) {
    if (action.available === false) return { id: action.id, score: -Infinity, reasons: ['unavailable'] };
    const risk = clamp(num(action.risk), 0, 100);
    const riskTolerance = clamp(num(state.riskTolerance, 35), 0, 100);
    const riskPenalty = Math.max(0, risk - riskTolerance) * 0.28;
    const resourceCost = num(action.resourceCost) * (1 + num(context.resourcePressure) / 100);
    const travelCost = num(action.travelCost) * (1 + num(context.travelDanger) / 100);
    const reward = num(action.expectedReward);
    const opportunity = num(action.opportunityValue);
    const relationship = num(action.relationshipValue);
    const need = needValue(state, action);
    const goal = goalValue(state, action);
    const personality = personalityValue(state, action);
    const memory = memoryValue(state, action);
    const score = need + goal + personality + memory + opportunity + relationship + reward
      - riskPenalty - resourceCost - travelCost;
    return {
      id: action.id,
      score: Number(score.toFixed(3)),
      reasons: [
        ['needs', need], ['goals', goal], ['personality', personality],
        ['memory', memory], ['opportunity', opportunity], ['relationships', relationship],
        ['reward', reward], ['risk penalty', -riskPenalty],
        ['resource cost', -resourceCost], ['travel cost', -travelCost]
      ].filter(([, value]) => Math.abs(value) > 0.001)
    };
  }

  function decide(state, candidates, context = {}) {
    const ranking = (candidates || [])
      .map(action => ({ action, evaluation: scoreAction(state || {}, action, context) }))
      .filter(item => Number.isFinite(item.evaluation.score))
      .sort((a, b) => b.evaluation.score - a.evaluation.score);
    return {
      action: ranking.length ? ranking[0].action : null,
      ranking: ranking.map(item => ({ id: item.evaluation.id, score: item.evaluation.score, reasons: item.evaluation.reasons }))
    };
  }

  const api = Object.freeze({ decide, scoreAction });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceDecisionEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
