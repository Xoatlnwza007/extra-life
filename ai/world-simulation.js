/* One Piece Life Simulator — yearly autonomous NPC simulation.
 * Persists each NPC's personality, goals, relationships and memories inside S.npcBrains.
 */
(function (root) {
  'use strict';

  function createProfile(npc, api) {
    const roleTraits = {
      gossip: ['social', 'curious'], grump: ['cautious', 'stubborn'],
      kid: ['curious', 'brave'], shop: ['ambitious', 'practical'],
      kind: ['kind', 'social'], rival: ['ambitious', 'brave'],
      craft: ['patient', 'practical']
    };
    const preferences = {
      social: { socialize: 5, help: 3 },
      curious: { explore: 6, socialize: 2 },
      cautious: { rest: 4, trade: 2 },
      stubborn: { rest: -2, train: 3 },
      brave: { explore: 4, train: 4, help: 1 },
      ambitious: { trade: 4, train: 3, explore: 2 },
      practical: { trade: 5, craft: 5 },
      kind: { help: 7, socialize: 2 },
      patient: { craft: 6, rest: 2 }
    };
    const traits = roleTraits[npc.r] || ['practical'];
    const merged = {};
    traits.forEach(trait => { merged[trait] = preferences[trait] || {}; });
    let profile = api.createCharacterState({
      id: 'op-npc-' + npc.n,
      traits,
      personalityPreferences: merged,
      riskTolerance: traits.includes('brave') ? 65 : traits.includes('cautious') ? 20 : 40,
      needs: { energy: 55, social: 45, safety: 60, wealth: 45, ambition: 40 },
      relationships: { player: 0 }
    });
    const goals = {
      gossip: { description: 'เป็นคนที่ทุกคนในชุมชนไว้วางใจให้เล่าข่าว', action: 'socialize', tags: ['socialize'], priority: 55 },
      grump: { description: 'รักษาความสงบและความปลอดภัยในละแวกบ้าน', action: 'rest', tags: ['rest', 'safety'], priority: 45 },
      kid: { description: 'ออกไปเห็นโลกกว้างและค้นพบสิ่งใหม่', action: 'explore', tags: ['explore'], priority: 65 },
      shop: { description: 'ทำให้ร้านเติบโตและมีเงินเก็บ', action: 'trade', tags: ['trade'], priority: 70 },
      kind: { description: 'ช่วยเหลือผู้คนในชุมชน', action: 'help', tags: ['help'], priority: 65 },
      rival: { description: 'แข็งแกร่งขึ้นและเอาชนะคู่แข่ง', action: 'train', tags: ['train'], priority: 75 },
      craft: { description: 'สร้างผลงานช่างฝีมือที่มีชื่อเสียง', action: 'craft', tags: ['craft'], priority: 70 }
    };
    if (goals[npc.r]) profile = api.addGoal(profile, goals[npc.r]);
    return profile;
  }

  function simulate(worldState, npcList, context = {}) {
    const stateApi = root.OnePieceCharacterState;
    const brain = root.OnePieceNPCBrain;
    if (!stateApi || !brain) return { profiles: worldState.npcBrains || {}, story: null };
    const profiles = { ...(worldState.npcBrains || {}) };
    const living = (npcList || []).filter(npc => npc && npc.alive);
    if (!living.length) return { profiles, story: null };

    for (const npc of living) {
      if (!profiles[npc.n]) profiles[npc.n] = createProfile(npc, stateApi);
    }

    const actor = (context.actorId && living.find(npc => npc.n === context.actorId)) || living[Math.floor(Math.random() * living.length)];
    let profile = stateApi.advanceTime(profiles[actor.n]);
    const candidates = [
      { id: 'rest', label: 'พักผ่อนและดูแลตัวเอง', tags: ['rest', 'safety'], relief: { energy: 18, safety: 5 }, risk: 2, expectedReward: 1 },
      { id: 'socialize', label: 'พบปะพูดคุยกับคนในชุมชน', tags: ['socialize'], relief: { social: 20 }, relationshipValue: 2, expectedReward: 2 },
      { id: 'help', label: 'ช่วยเหลือคนในชุมชน', tags: ['help', 'socialize'], relief: { social: 8, ambition: 8 }, relationshipValue: 5, expectedReward: 4 },
      { id: 'trade', label: 'ค้าขายและหาเงิน', tags: ['trade'], relief: { wealth: 18, ambition: 4 }, expectedReward: 7, resourceCost: 1 },
      { id: 'train', label: 'ฝึกฝนร่างกายและการต่อสู้', tags: ['train'], relief: { ambition: 16 }, expectedReward: 5, risk: 8 },
      { id: 'explore', label: 'ออกสำรวจเกาะหรือเส้นทางทะเล', tags: ['explore'], relief: { ambition: 14 }, expectedReward: 6, risk: context.seaDanger ? 35 : 12, travelCost: context.seaDanger ? 8 : 2 },
      { id: 'craft', label: 'สร้างหรือซ่อมแซมสิ่งของ', tags: ['craft', 'trade'], relief: { ambition: 12, wealth: 8 }, expectedReward: 5, resourceCost: 2 }
    ];
    const decision = brain.decide(profile, candidates, {
      resourcePressure: context.resourcePressure || 0,
      travelDanger: context.seaDanger ? 25 : 0
    });
    if (!decision.action) return { profiles, story: null };

    const chosen = decision.action;
    const needs = { ...(profile.needs || {}) };
    for (const key of Object.keys(needs)) needs[key] = Math.max(0, Math.min(100, needs[key] - 3));
    for (const [key, amount] of Object.entries(chosen.relief || {})) {
      needs[key] = Math.min(100, (needs[key] || 0) + amount);
    }
    profile = { ...profile, needs };
    const activeGoal = (profile.goals || []).find(goal => goal.status === 'active' &&
      (goal.action === chosen.id || (goal.tags || []).some(tag => (chosen.tags || []).includes(tag))));
    if (activeGoal && Math.random() < 0.22) {
      profile = stateApi.updateGoal(profile, activeGoal.id, 'completed');
    }
    profile = brain.recordOutcome(profile, decision, {
      event: chosen.label,
      tags: chosen.tags,
      importance: activeGoal ? 2 : 1,
      polarity: 'positive'
    });
    profile.relationships = {
      ...(profile.relationships || {}),
      player: Math.max(-100, Math.min(100, (profile.relationships?.player || 0) + (chosen.id === 'help' ? 2 : 0)))
    };
    profiles[actor.n] = profile;

    const story = chosen.id === 'explore' && context.seaDanger
      ? actor.n + ' ออกสำรวจเส้นทางทะเล แต่ต้องกลับเข้าฝั่งเพราะสภาพอากาศไม่ปลอดภัย'
      : actor.n + ' ' + chosen.label;
    return { profiles, story, actor: actor.n, action: chosen.id, ranking: decision.ranking };
  }

  // Optional full-population pass. The existing simulate() API remains unchanged.
  function simulatePopulation(worldState, npcList, context = {}) {
    const living = (npcList || []).filter(npc => npc && npc.alive);
    let currentState = {
      ...(worldState || {}),
      npcBrains: { ...((worldState && worldState.npcBrains) || {}) }
    };
    const actions = [];
    const stories = [];

    for (const npc of living) {
      const result = simulate(currentState, living, { ...context, actorId: npc.n });
      currentState = { ...currentState, npcBrains: result.profiles };
      if (result.action) {
        actions.push({ npc: npc.n, action: result.action, ranking: result.ranking });
      }
      if (result.story) stories.push(result.story);
    }

    return {
      profiles: currentState.npcBrains,
      actions,
      stories,
      simulatedCount: actions.length,
      story: stories.length ? stories.join('。') : null
    };
  }

  root.OnePieceWorldSimulation = Object.freeze({ simulate, simulatePopulation });
})(typeof globalThis !== 'undefined' ? globalThis : this);
