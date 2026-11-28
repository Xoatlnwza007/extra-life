/* One Piece Life Simulator — pirate crew and faction primitives.
 * Pure helpers; the game layer owns persistence and UI integration.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const DEFAULT_ROLES = ['captain', 'first-mate', 'navigator', 'swordsman', 'sniper', 'cook', 'doctor', 'shipwright', 'musician', 'archaeologist', 'helmsman', 'fighter'];

  function createCrew(input = {}) {
    const captainId = input.captainId ? String(input.captainId) : null;
    const crew = {
      id: input.id || 'crew-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      name: String(input.name || 'Unnamed Pirates').trim() || 'Unnamed Pirates',
      captainId,
      members: [],
      shipName: input.shipName || null,
      bounty: clamp(Number(input.bounty) || 0, 0, Number.MAX_SAFE_INTEGER),
      reputation: clamp(Number(input.reputation) || 0, -100, 100),
      status: 'active',
      foundedAt: input.foundedAt || new Date().toISOString(),
      history: []
    };
    if (captainId) {
      crew.members.push({ characterId: captainId, role: 'captain', joinedAt: crew.foundedAt });
    }
    return crew;
  }

  function joinCrew(crew, characterId, role = 'fighter', options = {}) {
    if (!crew || crew.status !== 'active' || !characterId) return { crew, joined: false, reason: 'invalid-crew' };
    const id = String(characterId);
    if ((crew.members || []).some(member => member.characterId === id)) {
      return { crew, joined: false, reason: 'already-member' };
    }
    const capacity = Math.max(1, Math.floor(Number(options.capacity) || 10));
    if ((crew.members || []).length >= capacity) return { crew, joined: false, reason: 'crew-full' };
    const safeRole = DEFAULT_ROLES.includes(role) && role !== 'captain' ? role : 'fighter';
    const member = { characterId: id, role: safeRole, joinedAt: options.joinedAt || new Date().toISOString() };
    const next = {
      ...crew,
      members: [...(crew.members || []), member],
      history: [...(crew.history || []), { type: 'joined', characterId: id, role: safeRole, at: member.joinedAt }].slice(-100)
    };
    return { crew: next, joined: true, member };
  }

  function leaveCrew(crew, characterId, options = {}) {
    if (!crew || !characterId) return { crew, left: false, reason: 'invalid-crew' };
    const id = String(characterId);
    if (id === crew.captainId) return { crew, left: false, reason: 'captain-must-transfer-or-disband' };
    const member = (crew.members || []).find(item => item.characterId === id);
    if (!member) return { crew, left: false, reason: 'not-member' };
    const at = options.leftAt || new Date().toISOString();
    return {
      crew: {
        ...crew,
        members: crew.members.filter(item => item.characterId !== id),
        history: [...(crew.history || []), { type: 'left', characterId: id, role: member.role, at }].slice(-100)
      },
      left: true,
      member
    };
  }

  function setMemberRole(crew, characterId, role) {
    if (!crew || !DEFAULT_ROLES.includes(role) || role === 'captain') {
      return { crew, updated: false, reason: 'invalid-role' };
    }
    const id = String(characterId);
    if (!(crew.members || []).some(member => member.characterId === id)) {
      return { crew, updated: false, reason: 'not-member' };
    }
    const members = crew.members.map(member => member.characterId === id ? { ...member, role } : member);
    return { crew: { ...crew, members }, updated: true };
  }

  function transferCaptaincy(crew, newCaptainId, options = {}) {
    if (!crew || !newCaptainId || !(crew.members || []).some(member => member.characterId === String(newCaptainId))) {
      return { crew, transferred: false, reason: 'new-captain-not-member' };
    }
    const oldCaptainId = crew.captainId;
    const next = {
      ...crew,
      captainId: String(newCaptainId),
      members: crew.members.map(member => {
        if (member.characterId === String(newCaptainId)) return { ...member, role: 'captain' };
        if (member.characterId === oldCaptainId) return { ...member, role: 'first-mate' };
        return member;
      }),
      history: [...(crew.history || []), { type: 'captaincy-transferred', from: oldCaptainId, to: String(newCaptainId), at: options.at || new Date().toISOString() }].slice(-100)
    };
    return { crew: next, transferred: true };
  }

  function addBounty(crew, amount, reason = 'world-event') {
    const value = Number(amount);
    if (!crew || !Number.isFinite(value) || value <= 0) return crew;
    return {
      ...crew,
      bounty: clamp((Number(crew.bounty) || 0) + Math.floor(value), 0, Number.MAX_SAFE_INTEGER),
      history: [...(crew.history || []), { type: 'bounty-increased', amount: Math.floor(value), reason: String(reason), at: new Date().toISOString() }].slice(-100)
    };
  }

  function adjustReputation(crew, delta, reason = 'world-event') {
    const amount = Number(delta);
    if (!crew || !Number.isFinite(amount) || amount === 0) return crew;
    const current = clamp(Number(crew.reputation) || 0, -100, 100);
    const nextValue = clamp(current + amount, -100, 100);
    return {
      ...crew,
      reputation: nextValue,
      history: [...(crew.history || []), {
        type: 'reputation-changed', delta: nextValue - current,
        reputation: nextValue, reason: String(reason), at: new Date().toISOString()
      }].slice(-100)
    };
  }

  function crewRelationLabel(score) {
    const value = clamp(Number(score) || 0, -100, 100);
    if (value >= 60) return 'allied';
    if (value >= 20) return 'friendly';
    if (value <= -60) return 'at-war';
    if (value <= -20) return 'hostile';
    return 'neutral';
  }

  function setCrewRelation(crew, otherCrewId, score, options = {}) {
    if (!crew || !otherCrewId || String(otherCrewId) === String(crew.id)) {
      return { crew, updated: false, reason: 'invalid-target' };
    }
    const value = Number(score);
    if (!Number.isFinite(value)) return { crew, updated: false, reason: 'invalid-score' };
    const bounded = clamp(value, -100, 100);
    const relations = { ...(crew.relations || {}), [String(otherCrewId)]: bounded };
    return {
      crew: {
        ...crew,
        relations,
        history: [...(crew.history || []), {
          type: 'relation-changed', otherCrewId: String(otherCrewId),
          score: bounded, label: crewRelationLabel(bounded),
          reason: options.reason || 'diplomacy', at: options.at || new Date().toISOString()
        }].slice(-100)
      },
      updated: true
    };
  }

  function resolveCrewEncounter(first, second, options = {}) {
    if (!first || !second || !first.id || !second.id || first.id === second.id ||
        first.status !== 'active' || second.status !== 'active') {
      return { resolved: false, reason: 'invalid-crews' };
    }
    const winnerId = options.winnerId ? String(options.winnerId) : null;
    if (winnerId && winnerId !== first.id && winnerId !== second.id) {
      return { resolved: false, reason: 'winner-not-in-encounter' };
    }
    const hostility = clamp(Number(options.hostilityDelta ?? -25), -100, 0);
    const firstReputation = winnerId ? (winnerId === first.id ? 5 : -3) : -1;
    const secondReputation = winnerId ? (winnerId === second.id ? 5 : -3) : -1;
    const event = {
      type: 'crew-encounter',
      opponentId: second.id,
      winnerId,
      outcome: winnerId ? (winnerId === first.id ? 'victory' : 'defeat') : 'stalemate',
      at: options.at || new Date().toISOString()
    };
    const reverseEvent = { ...event, opponentId: first.id,
      outcome: winnerId ? (winnerId === second.id ? 'victory' : 'defeat') : 'stalemate' };
    let nextFirst = setCrewRelation(first, second.id, (first.relations || {})[second.id] || 0, { reason: 'encounter' }).crew;
    let nextSecond = setCrewRelation(second, first.id, (second.relations || {})[first.id] || 0, { reason: 'encounter' }).crew;
    nextFirst = setCrewRelation(nextFirst, second.id,
      clamp(((first.relations || {})[second.id] || 0) + hostility, -100, 100),
      { reason: 'crew-encounter', at: event.at }).crew;
    nextSecond = setCrewRelation(nextSecond, first.id,
      clamp(((second.relations || {})[first.id] || 0) + hostility, -100, 100),
      { reason: 'crew-encounter', at: event.at }).crew;
    nextFirst = adjustReputation(nextFirst, firstReputation, 'crew-encounter');
    nextSecond = adjustReputation(nextSecond, secondReputation, 'crew-encounter');
    nextFirst = { ...nextFirst, history: [...nextFirst.history, event].slice(-100) };
    nextSecond = { ...nextSecond, history: [...nextSecond.history, reverseEvent].slice(-100) };
    if (winnerId && Number(options.winnerBountyIncrease) > 0) {
      if (winnerId === first.id) nextFirst = addBounty(nextFirst, options.winnerBountyIncrease, 'crew-encounter-victory');
      else nextSecond = addBounty(nextSecond, options.winnerBountyIncrease, 'crew-encounter-victory');
    }
    return { resolved: true, first: nextFirst, second: nextSecond, winnerId, outcome: event.outcome };
  }

  function findCrewForMember(crews, characterId) {
    const id = String(characterId);
    return (crews || []).find(crew => crew.status === 'active' && (crew.members || []).some(member => member.characterId === id)) || null;
  }


  // Recruitment is a negotiation, not an automatic player command.
  function evaluateRecruitment(character, offer = {}) {
    if (!character || !character.id) return { eligible: false, score: 0, reasons: ['missing-character'] };
    const relationship = clamp(Number((character.relationships || {})[offer.captainId || 'player']) || 0, -100, 100);
    const traits = Array.isArray(character.traits) ? character.traits : [];
    const desiredTags = new Set(Array.isArray(offer.sharedGoals) ? offer.sharedGoals : []);
    const goals = (character.goals || []).filter(goal => goal.status === 'active');
    const aligned = goals.some(goal => (goal.tags || []).some(tag => desiredTags.has(tag)));
    const role = String(offer.role || 'fighter');
    const skill = clamp(Number((character.skills || {})[role]) || 0, 0, 100);
    const risk = clamp(Number(offer.riskLevel) || 0, 0, 100);
    let score = 50 + relationship * 0.35 + (aligned ? 12 : 0) + skill * 0.12;
    if (traits.includes('independent')) score -= 8;
    if (traits.includes('loyal')) score += 7;
    if (traits.includes('cautious')) score -= risk * 0.12;
    if (traits.includes('brave') || traits.includes('reckless')) score += risk * 0.06;
    if (character.needs && Number(character.needs.safety) > 80 && risk > 40) score -= 10;
    score = clamp(score, 0, 100);
    return {
      eligible: true,
      score: Math.round(score),
      willing: score >= clamp(Number(offer.minimumScore) || 60, 0, 100),
      reasons: [
        relationship >= 20 ? 'positive-relationship' : relationship <= -20 ? 'negative-relationship' : 'neutral-relationship',
        aligned ? 'shared-goal' : 'no-shared-goal',
        skill > 0 ? 'role-skill-match' : 'role-training-needed',
        risk > 40 ? 'high-risk-offer' : 'ordinary-risk'
      ]
    };
  }

  function recruitMember(crew, character, role = 'fighter', options = {}) {
    if (!character || !character.id) return { crew, joined: false, reason: 'invalid-character' };
    const evaluation = evaluateRecruitment(character, { ...options, role });
    if (!evaluation.eligible) return { crew, joined: false, reason: 'invalid-character', evaluation };
    if (!evaluation.willing) return { crew, joined: false, reason: 'declined', evaluation };
    const result = joinCrew(crew, character.id, role, {
      ...options,
      memberProfile: character,
      loyalty: clamp(evaluation.score, 0, 100)
    });
    return { ...result, evaluation };
  }

  function updateMemberCondition(crew, characterId, changes = {}, options = {}) {
    if (!crew || !characterId) return { crew, updated: false, reason: 'invalid-member' };
    const current = (crew.members || []).find(member => member.characterId === String(characterId));
    if (!current) return { crew, updated: false, reason: 'not-member' };
    const bounded = {};
    for (const key of ['loyalty', 'morale', 'fatigue', 'skill']) {
      if (changes[key] !== undefined) {
        const value = Number(changes[key]);
        if (!Number.isFinite(value)) return { crew, updated: false, reason: 'invalid-' + key };
        bounded[key] = clamp(value, 0, 100);
      }
    }
    if (changes.directive !== undefined) {
      const allowed = ['autonomous', 'follow-captain', 'protect-crew', 'pursue-goal', 'avoid-combat', 'custom'];
      if (!allowed.includes(changes.directive)) return { crew, updated: false, reason: 'invalid-directive' };
      bounded.directive = changes.directive;
    }
    const members = crew.members.map(member => member.characterId === String(characterId)
      ? { ...member, ...bounded, updatedAt: options.at || new Date().toISOString() }
      : member);
    return { crew: { ...crew, members }, updated: true, member: members.find(item => item.characterId === String(characterId)) };
  }

  function setCrewSupplies(crew, supplies = {}) {
    if (!crew) return crew;
    const nextSupplies = { ...(crew.supplies || {}) };
    for (const [key, raw] of Object.entries(supplies)) {
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      nextSupplies[key] = clamp(Math.floor(value), 0, 1000000);
    }
    return { ...crew, supplies: nextSupplies };
  }

  function applyCrewMonth(crew, options = {}) {
    if (!crew || crew.status !== 'active') return { crew, events: [], changed: false };
    const foodPerMember = Math.max(0, Number(options.foodPerMember ?? 1));
    const wagesPerMember = Math.max(0, Number(options.wagesPerMember ?? 0));
    const members = (crew.members || []).map(member => ({ ...member }));
    const supplies = { ...(crew.supplies || {}) };
    const events = [];
    const foodCost = Math.ceil(members.length * foodPerMember);
    const availableFood = Math.max(0, Number(supplies.food) || 0);
    supplies.food = Math.max(0, availableFood - foodCost);
    const shortage = Math.max(0, foodCost - availableFood);
    for (const member of members) {
      const morale = clamp(Number(member.morale ?? 60) - (shortage ? 12 : 0) + (options.sharedVictory ? 4 : 0), 0, 100);
      const fatigue = clamp(Number(member.fatigue ?? 20) + (options.rested ? -15 : 5), 0, 100);
      const loyalty = clamp(Number(member.loyalty ?? 50) - (shortage ? 3 : 0), 0, 100);
      Object.assign(member, { morale, fatigue, loyalty });
      if (morale <= 20 || loyalty <= 15) events.push({ type: 'member-at-risk', characterId: member.characterId, morale, loyalty });
    }
    const updated = {
      ...crew,
      members,
      supplies,
      history: [...(crew.history || []), {
        type: 'monthly-crew-upkeep', foodCost, shortage, wagesPerMember,
        at: options.at || new Date().toISOString()
      }].slice(-100)
    };
    return { crew: updated, events, changed: true, foodCost, shortage };
  }

  function getCrewReadiness(crew) {
    const members = (crew && crew.members) || [];
    if (!members.length) return { score: 0, morale: 0, loyalty: 0, fatigue: 0, memberCount: 0 };
    const average = key => members.reduce((sum, member) => sum + clamp(Number(member[key] ?? (key === 'fatigue' ? 20 : 60)), 0, 100), 0) / members.length;
    const morale = average('morale');
    const loyalty = average('loyalty');
    const fatigue = average('fatigue');
    return {
      score: Math.round(clamp(morale * 0.4 + loyalty * 0.4 + (100 - fatigue) * 0.2, 0, 100)),
      morale: Math.round(morale),
      loyalty: Math.round(loyalty),
      fatigue: Math.round(fatigue),
      memberCount: members.length
    };
  }

  function disbandCrew(crew, reason = 'disbanded') {
    if (!crew || crew.status !== 'active') return crew;
    return {
      ...crew,
      status: 'disbanded',
      disbandedAt: new Date().toISOString(),
      disbandReason: String(reason),
      history: [...(crew.history || []), { type: 'disbanded', reason: String(reason), at: new Date().toISOString() }].slice(-100)
    };
  }

  const api = Object.freeze({ DEFAULT_ROLES, createCrew, joinCrew, leaveCrew, setMemberRole, transferCaptaincy, addBounty, adjustReputation, crewRelationLabel, setCrewRelation, resolveCrewEncounter, findCrewForMember, evaluateRecruitment, recruitMember, updateMemberCondition, setCrewSupplies, applyCrewMonth, getCrewReadiness, disbandCrew });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceCrewSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
