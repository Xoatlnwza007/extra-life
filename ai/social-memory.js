/* One Piece Life Simulator — episodic recall and multi-dimensional bonds.
 * Pure helpers. Legacy scalar relationships remain available for compatibility.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const BOND_DIMENSIONS = Object.freeze(['trust', 'affection', 'respect', 'fear', 'rivalry', 'familiarity']);
  const DEFAULT_DIMENSIONS = Object.freeze({
    trust: 0, affection: 0, respect: 0, fear: 0, rivalry: 0, familiarity: 0
  });

  function normalizeEpisode(episode = {}) {
    return {
      id: String(episode.id || 'episode-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
      event: String(episode.event || 'Unspecified event'),
      tags: [...new Set((Array.isArray(episode.tags) ? episode.tags : []).map(String))],
      actorIds: [...new Set((Array.isArray(episode.actorIds) ? episode.actorIds : []).map(String))],
      targetIds: [...new Set((Array.isArray(episode.targetIds) ? episode.targetIds : []).map(String))],
      location: episode.location ? String(episode.location) : null,
      emotion: episode.emotion || null,
      importance: clamp(Number(episode.importance ?? 1), 0, 5),
      polarity: episode.polarity === 'negative' ? 'negative' : 'positive',
      source: episode.source || 'world',
      createdAt: episode.createdAt || new Date().toISOString(),
      expiresAt: episode.expiresAt || null,
      expired: false,
      witnessedBy: [...new Set((Array.isArray(episode.witnessedBy) ? episode.witnessedBy : []).map(String))],
      confidence: clamp(Number(episode.confidence ?? 1), 0, 1)
    };
  }

  function recordEpisode(character, episode, options = {}) {
    if (!character || !episode) return character;
    const normalized = normalizeEpisode(episode);
    const limit = Math.max(20, Math.min(300, Math.floor(Number(options.limit) || 150)));
    const memories = [...(character.memories || []), normalized].slice(-limit);
    return { ...character, memories, updatedAt: normalized.createdAt };
  }

  function recallMemories(character, query = {}, options = {}) {
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const tags = new Set((Array.isArray(query.tags) ? query.tags : []).map(String));
    const people = new Set((Array.isArray(query.people) ? query.people : query.personId ? [query.personId] : []).map(String));
    const location = query.location ? String(query.location) : null;
    const limit = Math.max(1, Math.min(30, Math.floor(Number(options.limit) || 5)));
    const scored = (character && character.memories || []).filter(memory =>
      !memory.expired && (!memory.expiresAt || new Date(memory.expiresAt).getTime() > now)
    ).map(memory => {
      const memoryTags = new Set(memory.tags || []);
      const tagMatches = [...tags].filter(tag => memoryTags.has(tag)).length;
      const personMatches = [...people].filter(person =>
        (memory.actorIds || []).includes(person) || (memory.targetIds || []).includes(person) ||
        (memory.witnessedBy || []).includes(person)
      ).length;
      const locationMatch = location && memory.location === location ? 1 : 0;
      const importance = clamp(Number(memory.importance) || 0, 0, 5);
      const ageDays = Math.max(0, (now - new Date(memory.createdAt || now).getTime()) / 86400000);
      const recency = Math.max(0, 5 - ageDays / 30);
      const relevance = tagMatches * 3 + personMatches * 5 + locationMatch * 2;
      const score = relevance + importance * 1.5 + recency * 0.2 + (memory.polarity === 'negative' ? 0.5 : 0);
      return { memory, score, reasons: { tagMatches, personMatches, locationMatch, importance, recency } };
    }).filter(item => item.score > 0);
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  function getBond(character, targetId) {
    const legacy = clamp(Number((character && character.relationships || {})[targetId]) || 0, -100, 100);
    const raw = character && character.relationshipProfiles && character.relationshipProfiles[targetId];
    const dimensions = { ...DEFAULT_DIMENSIONS };
    for (const key of BOND_DIMENSIONS) dimensions[key] = clamp(Number((raw && raw[key]) ?? 0), -100, 100);
    if (!raw) dimensions.familiarity = legacy;
    const score = raw ? clamp(
      dimensions.trust * 0.30 + dimensions.affection * 0.20 +
      dimensions.respect * 0.20 + dimensions.familiarity * 0.20 -
      dimensions.fear * 0.05 - dimensions.rivalry * 0.05,
      -100, 100
    ) : legacy;
    return { targetId: String(targetId), score: Math.round(score), legacyScore: legacy, dimensions };
  }

  function updateBond(character, targetId, changes = {}, options = {}) {
    if (!character || !targetId) return character;
    const current = getBond(character, targetId);
    const dimensions = { ...current.dimensions };
    for (const key of BOND_DIMENSIONS) {
      if (changes[key] === undefined) continue;
      const delta = Number(changes[key]);
      if (!Number.isFinite(delta)) continue;
      dimensions[key] = clamp(dimensions[key] + delta, -100, 100);
    }
    const score = clamp(
      dimensions.trust * 0.30 + dimensions.affection * 0.20 +
      dimensions.respect * 0.20 + dimensions.familiarity * 0.20 -
      dimensions.fear * 0.05 - dimensions.rivalry * 0.05,
      -100, 100
    );
    const history = [...(character.bondHistory || []), {
      targetId: String(targetId), changes: { ...changes },
      before: current.score, after: Math.round(score),
      event: options.event || null, createdAt: options.createdAt || new Date().toISOString()
    }].slice(-100);
    return {
      ...character,
      relationships: { ...(character.relationships || {}), [targetId]: Math.round(score) },
      relationshipProfiles: {
        ...(character.relationshipProfiles || {}),
        [targetId]: dimensions
      },
      bondHistory: history,
      updatedAt: options.createdAt || new Date().toISOString()
    };
  }

  function bondLabel(bond) {
    const score = typeof bond === 'number' ? bond : Number(bond && bond.score) || 0;
    if (score >= 75) return 'devoted';
    if (score >= 45) return 'trusted';
    if (score >= 15) return 'friendly';
    if (score <= -75) return 'nemesis';
    if (score <= -45) return 'hostile';
    if (score <= -15) return 'wary';
    return 'neutral';
  }

  function evaluateSocialResponse(character, targetId, context = {}) {
    const bond = getBond(character, targetId);
    const relevant = recallMemories(character, {
      people: [targetId],
      tags: context.tags || [],
      location: context.location
    }, { now: context.now, limit: 8 });
    const negative = relevant.filter(item => item.memory.polarity === 'negative').length;
    const positive = relevant.length - negative;
    const caution = bond.dimensions.fear + bond.dimensions.rivalry + negative * 8;
    const warmth = bond.dimensions.trust + bond.dimensions.affection + positive * 6;
    return {
      bond,
      recalled: relevant.map(item => item.memory),
      stance: warmth - caution >= 35 ? 'warm' : caution - warmth >= 35 ? 'guarded' : 'uncertain',
      willingnessToHelp: clamp(50 + warmth * 0.35 - caution * 0.35, 0, 100)
    };
  }

  function recordMutualInteraction(first, second, episode, firstImpact = {}, secondImpact = {}) {
    if (!first || !second || !first.id || !second.id || first.id === second.id) {
      return { first, second, recorded: false };
    }
    const firstEpisode = { ...episode, actorIds: [first.id], targetIds: [second.id] };
    const secondEpisode = { ...episode, actorIds: [second.id], targetIds: [first.id] };
    let nextFirst = recordEpisode(first, firstEpisode);
    let nextSecond = recordEpisode(second, secondEpisode);
    nextFirst = updateBond(nextFirst, second.id, firstImpact, { event: episode.event, createdAt: episode.createdAt });
    nextSecond = updateBond(nextSecond, first.id, secondImpact, { event: episode.event, createdAt: episode.createdAt });
    return { first: nextFirst, second: nextSecond, recorded: true };
  }

  const api = Object.freeze({
    BOND_DIMENSIONS, normalizeEpisode, recordEpisode, recallMemories,
    getBond, updateBond, bondLabel, evaluateSocialResponse, recordMutualInteraction
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceSocialMemorySystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
