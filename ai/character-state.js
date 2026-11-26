/* One Piece Life Simulator — persistent NPC memory and goals.
 * Pure state helpers. Storage is owned by the game layer.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const makeId = (prefix) => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  function createCharacterState(input = {}) {
    return {
      id: input.id || makeId('character'),
      traits: Array.isArray(input.traits) ? [...input.traits] : [],
      personalityPreferences: { ...(input.personalityPreferences || {}) },
      riskTolerance: clamp(Number(input.riskTolerance ?? 35), 0, 100),
      needs: { ...(input.needs || {}) },
      memories: Array.isArray(input.memories) ? input.memories.slice(-100) : [],
      goals: Array.isArray(input.goals) ? input.goals : [],
      relationships: { ...(input.relationships || {}) },
      inventory: Array.isArray(input.inventory) ? input.inventory : [],
      lastDecision: input.lastDecision || null,
      updatedAt: input.updatedAt || new Date().toISOString()
    };
  }

  function remember(character, event, options = {}) {
    if (!character || !event) return character;
    const memory = {
      id: options.id || makeId('memory'),
      event: String(event),
      tags: Array.isArray(options.tags) ? [...new Set(options.tags.map(String))] : [],
      importance: clamp(Number(options.importance ?? 1), 0, 5),
      polarity: options.polarity === 'negative' ? 'negative' : 'positive',
      createdAt: options.createdAt || new Date().toISOString(),
      expiresAt: options.expiresAt || null,
      expired: false,
      source: options.source || 'world'
    };
    const memories = [...(character.memories || []), memory];
    return { ...character, memories: memories.slice(-100), updatedAt: new Date().toISOString() };
  }

  function addGoal(character, goal) {
    if (!character || !goal || !goal.description) return character;
    const nextGoal = {
      id: goal.id || makeId('goal'),
      description: String(goal.description),
      action: goal.action || null,
      tags: Array.isArray(goal.tags) ? [...new Set(goal.tags.map(String))] : [],
      priority: clamp(Number(goal.priority ?? 50), 0, 100),
      status: 'active',
      createdAt: goal.createdAt || new Date().toISOString(),
      deadline: goal.deadline || null
    };
    return { ...character, goals: [...(character.goals || []), nextGoal], updatedAt: new Date().toISOString() };
  }

  function updateGoal(character, goalId, status) {
    const allowed = ['active', 'completed', 'abandoned'];
    if (!character || !allowed.includes(status)) return character;
    return {
      ...character,
      goals: (character.goals || []).map(goal => goal.id === goalId
        ? { ...goal, status, updatedAt: new Date().toISOString() }
        : goal),
      updatedAt: new Date().toISOString()
    };
  }

  function getRelationship(character, targetId) {
    if (!character || !targetId) return 0;
    const value = (character.relationships || {})[targetId];
    return clamp(Number(value) || 0, -100, 100);
  }

  function adjustRelationship(character, targetId, delta, options = {}) {
    if (!character || !targetId) return character;
    const amount = Number(delta);
    if (!Number.isFinite(amount) || amount === 0) return character;
    const current = getRelationship(character, targetId);
    const score = clamp(current + amount, -100, 100);
    const history = [...(character.relationshipHistory || []), {
      targetId: String(targetId),
      delta: score - current,
      score,
      event: options.event ? String(options.event) : null,
      createdAt: options.createdAt || new Date().toISOString()
    }].slice(-50);
    return {
      ...character,
      relationships: { ...(character.relationships || {}), [targetId]: score },
      relationshipHistory: history,
      updatedAt: new Date().toISOString()
    };
  }

  function interact(first, second, delta, options = {}) {
    if (!first || !second || !first.id || !second.id || first.id === second.id) {
      return { first, second };
    }
    const firstDelta = Number(delta);
    const secondDelta = Number(options.replyDelta ?? delta);
    const nextFirst = Number.isFinite(firstDelta)
      ? adjustRelationship(first, second.id, firstDelta, {
          event: options.event || 'interaction',
          createdAt: options.createdAt
        })
      : first;
    const nextSecond = Number.isFinite(secondDelta)
      ? adjustRelationship(second, first.id, secondDelta, {
          event: options.replyEvent || options.event || 'interaction',
          createdAt: options.createdAt
        })
      : second;
    return { first: nextFirst, second: nextSecond };
  }

  function relationshipLabel(score) {
    const value = clamp(Number(score) || 0, -100, 100);
    if (value >= 80) return 'devoted';
    if (value >= 50) return 'trusted';
    if (value >= 20) return 'friendly';
    if (value <= -80) return 'nemesis';
    if (value <= -50) return 'hostile';
    if (value <= -20) return 'unfriendly';
    return 'neutral';
  }

  function advanceTime(character, now = Date.now()) {
    if (!character) return character;
    const memories = (character.memories || []).map(memory => {
      if (!memory.expiresAt || memory.expired) return memory;
      return { ...memory, expired: new Date(memory.expiresAt).getTime() <= now };
    });
    const goals = (character.goals || []).map(goal => {
      if (goal.status !== 'active' || !goal.deadline) return goal;
      return new Date(goal.deadline).getTime() <= now
        ? { ...goal, status: 'abandoned', expiredAt: new Date(now).toISOString() }
        : goal;
    });
    return { ...character, memories, goals, updatedAt: new Date(now).toISOString() };
  }

  const api = Object.freeze({ createCharacterState, remember, addGoal, updateGoal, getRelationship, adjustRelationship, interact, relationshipLabel, advanceTime });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceCharacterState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
