/* One Piece Life Simulator — autonomous NPC life and activity planning.
 * Pure helpers: no DOM, storage, or direct game-global mutations.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const CAREERS = Object.freeze(['sailor', 'merchant', 'doctor', 'craftsman', 'fighter', 'scholar', 'musician', 'farmer', 'explorer', 'independent']);
  const NEEDS = Object.freeze(['food', 'rest', 'safety', 'social', 'wealth', 'purpose']);
  const ACTIVITIES = Object.freeze({
    rest: { tags: ['rest', 'health'], relief: { rest: 22, safety: 3 }, reward: 1, risk: 0 },
    eat: { tags: ['food', 'survival'], relief: { food: 28 }, reward: 0, risk: 0 },
    work: { tags: ['work', 'career', 'wealth'], relief: { wealth: 15, purpose: 4 }, reward: 7, risk: 2 },
    train: { tags: ['train', 'growth', 'combat'], relief: { purpose: 12 }, reward: 5, risk: 8 },
    socialize: { tags: ['social', 'community'], relief: { social: 18 }, reward: 2, risk: 1 },
    help: { tags: ['help', 'community', 'social'], relief: { social: 8, purpose: 8 }, reward: 4, risk: 3 },
    explore: { tags: ['explore', 'travel', 'discovery'], relief: { purpose: 14 }, reward: 6, risk: 25 },
    craft: { tags: ['craft', 'career', 'wealth'], relief: { purpose: 10, wealth: 5 }, reward: 5, risk: 2 },
    trade: { tags: ['trade', 'career', 'wealth'], relief: { wealth: 18 }, reward: 8, risk: 4 },
    study: { tags: ['study', 'knowledge', 'career'], relief: { purpose: 10 }, reward: 4, risk: 1 },
    travel: { tags: ['travel', 'explore'], relief: { purpose: 8 }, reward: 3, risk: 30 }
  });

  const CAREER_ACTIONS = Object.freeze({
    sailor: ['work', 'travel', 'train'],
    merchant: ['trade', 'work', 'travel'],
    doctor: ['work', 'study', 'help'],
    craftsman: ['craft', 'work', 'study'],
    fighter: ['train', 'work', 'help'],
    scholar: ['study', 'explore', 'work'],
    musician: ['work', 'socialize', 'travel'],
    farmer: ['work', 'craft', 'help'],
    explorer: ['explore', 'travel', 'study'],
    independent: ['work', 'explore', 'socialize']
  });

  function createLifeProfile(input = {}) {
    const needs = {};
    for (const key of NEEDS) needs[key] = clamp(Number((input.needs || {})[key] ?? 50), 0, 100);
    const career = CAREERS.includes(input.career) ? input.career : 'independent';
    return {
      id: String(input.id || 'npc-unknown'),
      career,
      careerLevel: clamp(Math.floor(Number(input.careerLevel) || 1), 1, 100),
      skills: { ...(input.skills || {}) },
      needs,
      money: Math.max(0, Number(input.money) || 0),
      inventory: { ...(input.inventory || {}) },
      location: input.location || null,
      homeLocation: input.homeLocation || input.location || null,
      schedule: { ...(input.schedule || {}) },
      goals: Array.isArray(input.goals) ? input.goals.map(goal => ({ ...goal })) : [],
      traits: Array.isArray(input.traits) ? [...input.traits] : [],
      riskTolerance: clamp(Number(input.riskTolerance ?? 35), 0, 100),
      autonomy: input.autonomy || 'independent',
      status: input.status || 'active',
      progress: { ...(input.progress || {}) },
      lastAction: input.lastAction || null,
      updatedAt: input.updatedAt || null
    };
  }

  function scheduleBlock(hour) {
    const h = ((Math.floor(Number(hour) || 0) % 24) + 24) % 24;
    if (h >= 5 && h < 8) return 'morning';
    if (h >= 8 && h < 12) return 'work';
    if (h >= 12 && h < 14) return 'midday';
    if (h >= 14 && h < 18) return 'afternoon';
    if (h >= 18 && h < 22) return 'evening';
    return 'night';
  }

  function getScheduledActivity(profile, context = {}) {
    const block = context.block || scheduleBlock(context.hour);
    const custom = profile && profile.schedule && profile.schedule[block];
    if (custom) return custom;
    const defaults = {
      morning: 'eat', work: 'work', midday: 'socialize',
      afternoon: 'career', evening: 'socialize', night: 'rest'
    };
    return defaults[block] || 'rest';
  }

  function generateCandidates(profile, context = {}) {
    if (!profile || profile.status !== 'active') return [];
    const careerActions = CAREER_ACTIONS[profile.career] || CAREER_ACTIONS.independent;
    const scheduled = getScheduledActivity(profile, context);
    const ids = new Set(['rest', 'eat', 'socialize', 'help', ...careerActions]);
    if (context.reachableDestinations && context.reachableDestinations.length) ids.add('travel');
    if (context.discoverableArea) ids.add('explore');
    return [...ids].map(id => {
      const definition = ACTIVITIES[id];
      if (!definition) return null;
      const available = id !== 'travel' || Boolean(context.reachableDestinations && context.reachableDestinations.length);
      const needRelief = Object.entries(definition.relief).reduce((sum, [key, value]) => {
        return sum + ((100 - Number(profile.needs[key] ?? 50)) / 100) * value * 0.24;
      }, 0);
      const goalMatch = (profile.goals || []).some(goal => goal.status === 'active' &&
        (goal.action === id || (goal.tags || []).some(tag => definition.tags.includes(tag))));
      return {
        id, label: id, tags: definition.tags, relief: definition.relief,
        expectedReward: definition.reward + (profile.careerLevel - 1) * 0.15,
        risk: definition.risk, available,
        opportunityValue: goalMatch ? 12 : 0,
        scheduled: scheduled === id || (scheduled === 'career' && careerActions.includes(id)),
        destination: id === 'travel' && available ? context.reachableDestinations[0] : null
      };
    }).filter(Boolean);
  }

  function resolveActivity(profile, action, context = {}) {
    if (!profile || profile.status !== 'active' || !action || action.available === false) {
      return { profile, resolved: false, reason: 'unavailable' };
    }
    if ((action.id === 'travel' || action.id === 'explore') && !context.destination && !action.destination && !context.discoverableArea) {
      return { profile, resolved: false, reason: 'no-valid-route' };
    }
    const needs = { ...profile.needs };
    for (const key of NEEDS) needs[key] = clamp(Number(needs[key] ?? 50) - 3, 0, 100);
    for (const [key, amount] of Object.entries(action.relief || {})) {
      needs[key] = clamp(Number(needs[key] || 0) + Number(amount || 0), 0, 100);
    }
    const moneyDelta = action.id === 'work' || action.id === 'trade' || action.id === 'craft'
      ? Math.max(0, Number(context.earnings ?? action.expectedReward ?? 0))
      : action.id === 'travel' ? -Math.max(0, Number(context.travelCost) || 0) : 0;
    const skills = { ...(profile.skills || {}) };
    const skillKey = context.skillKey || (action.id === 'train' ? 'combat' : profile.career);
    if (['work', 'train', 'craft', 'study', 'trade', 'help'].includes(action.id)) {
      skills[skillKey] = clamp((Number(skills[skillKey]) || 0) + Math.max(1, Number(context.skillGain) || 1), 0, 100);
    }
    const destination = context.destination || action.destination || profile.location;
    const goals = (profile.goals || []).map(goal => {
      if (goal.status !== 'active') return goal;
      const match = goal.action === action.id || (goal.tags || []).some(tag => (action.tags || []).includes(tag));
      if (!match) return goal;
      const progress = Math.max(0, Number(goal.progress) || 0) + Math.max(1, Number(context.goalProgress) || 1);
      const target = Math.max(1, Number(goal.targetProgress) || 3);
      return { ...goal, progress, status: progress >= target ? 'completed' : 'active' };
    });
    const next = {
      ...profile, needs, skills, goals,
      money: Math.max(0, Number(profile.money) + moneyDelta),
      location: action.id === 'travel' ? destination : profile.location,
      lastAction: { id: action.id, at: context.at || null, location: profile.location, destination: action.id === 'travel' ? destination : null },
      updatedAt: context.at || null
    };
    return {
      profile: next, resolved: true, action: action.id,
      worldEffects: {
        locationChanged: action.id === 'travel' && destination !== profile.location,
        from: profile.location, to: action.id === 'travel' ? destination : profile.location,
        moneyDelta, publicActivity: ['work', 'trade', 'help', 'explore', 'travel'].includes(action.id)
      }
    };
  }

  function takeTurn(profile, context = {}, options = {}) {
    if (!profile || profile.status !== 'active') return { profile, action: null, reason: 'inactive' };
    const candidates = generateCandidates(profile, context);
    const decide = options.decide || (root.OnePieceDecisionEngine && root.OnePieceDecisionEngine.decide);
    if (typeof decide !== 'function') return { profile, action: null, reason: 'decision-engine-unavailable' };
    const decision = decide(profile, candidates, {
      resourcePressure: context.resourcePressure || 0,
      travelDanger: context.travelDanger || 0
    });
    if (!decision.action) return { profile, action: null, reason: 'no-valid-action', ranking: decision.ranking || [] };
    const result = resolveActivity(profile, decision.action, context);
    return { ...result, action: result.resolved ? decision.action.id : null, ranking: decision.ranking || [] };
  }

  const api = Object.freeze({
    CAREERS, NEEDS, ACTIVITIES, CAREER_ACTIONS,
    createLifeProfile, scheduleBlock, getScheduledActivity,
    generateCandidates, resolveActivity, takeTurn
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceNPCLifeSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
