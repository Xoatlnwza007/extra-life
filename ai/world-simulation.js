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
    // The game's yearly loop calls simulate() once. For the One Piece world,
    // turn that call into a full-population tick while preserving the single-NPC
    // API for tests and other callers that do not identify the One Piece world.
    if (worldState && worldState.world === 'op' && !context.actorId &&
        (npcList || []).filter(npc => npc && npc.alive).length > 1) {
      return simulateYearlyPopulation(worldState, npcList, context);
    }
    const stateApi = root.OnePieceCharacterState;
    const brain = root.OnePieceNPCBrain;
    if (!stateApi || !brain) return { profiles: worldState.npcBrains || {}, story: null };
    const profiles = { ...(worldState.npcBrains || {}) };
    const living = (npcList || []).filter(npc => npc && npc.alive);
    if (!living.length) return { profiles, story: null };

    for (const npc of living) {
      if (!profiles[npc.n]) profiles[npc.n] = createProfile(npc, stateApi);
    }

    const random = typeof context.random === 'function' ? context.random : Math.random;
    const actor = (context.actorId && living.find(npc => npc.n === context.actorId)) || living[Math.floor(random() * living.length)];
    const now = Number.isFinite(context.now) ? context.now : Date.now();
    let profile = stateApi.advanceTime(profiles[actor.n], now);
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
    if (activeGoal && random() < 0.22) {
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

  // The game's current UI advances by year. Run twelve logical monthly
  // population ticks inside that existing yearly boundary until the main
  // game clock/UI can be migrated safely without rewriting its large bundle.
  function simulateYearlyPopulation(worldState, npcList, context = {}) {
    const living = (npcList || []).filter(npc => npc && npc.alive);
    let currentState = {
      ...(worldState || {}),
      npcBrains: { ...((worldState && worldState.npcBrains) || {}) }
    };
    const previous = currentState.npcSimulationCalendar || currentState.simulationCalendar || {};
    let calendarYear = Number.isFinite(Number(previous.year))
      ? Number(previous.year) : (Number(currentState.year) || 0);
    let calendarMonth = Number.isInteger(previous.month)
      ? Math.max(0, Math.min(12, previous.month)) : 0;
    let totalMonths = Number(previous.totalMonths) || 0;
    const actions = [];
    const interactions = [];
    const monthlyResults = [];
    const stories = [];

    for (let tick = 0; tick < 12; tick++) {
      calendarMonth += 1;
      if (calendarMonth > 12) {
        calendarMonth = 1;
        calendarYear += 1;
      }
      totalMonths += 1;
      const monthContext = {
        ...context,
        now: Date.UTC(calendarYear, calendarMonth - 1, 1)
      };
      const result = simulatePopulation(currentState, living, monthContext);
      currentState = { ...currentState, npcBrains: result.profiles };
      const monthActions = result.actions.map(action => ({
        ...action, year: calendarYear, month: calendarMonth
      }));
      const monthInteractions = result.interactions.map(interaction => ({
        ...interaction, year: calendarYear, month: calendarMonth
      }));
      actions.push(...monthActions);
      interactions.push(...monthInteractions);
      if (result.stories.length) stories.push(result.stories[0]);
      monthlyResults.push({
        year: calendarYear,
        month: calendarMonth,
        actionCount: monthActions.length,
        interactionCount: monthInteractions.length,
        actions: monthActions,
        stories: result.stories
      });
    }

    const simulationCalendar = { year: calendarYear, month: calendarMonth, totalMonths };
    // The existing game loop only copies npcBrains from the result. Persist the
    // clock on S itself so the existing save(S) path retains month progress.
    if (worldState && typeof worldState === 'object') {
      worldState.npcSimulationCalendar = simulationCalendar;
    }

    return {
      profiles: currentState.npcBrains,
      actions,
      interactions,
      stories,
      monthlyResults,
      simulatedCount: living.length,
      actionCount: actions.length,
      simulatedMonths: 12,
      simulationCalendar,
      story: stories.length ? stories.join('。') : null
    };
  }

  function stateApiForInteractions() {
    return root.OnePieceCharacterState;
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
    const interactions = [];

    for (let index = 0; index < living.length; index++) {
      const npc = living[index];
      const result = simulate(currentState, living, { ...context, actorId: npc.n });
      currentState = { ...currentState, npcBrains: result.profiles };
      if (result.action) {
        actions.push({ npc: npc.n, action: result.action, ranking: result.ranking });
        const socialAction = result.action === 'help' || result.action === 'socialize';
        if (socialAction && living.length > 1) {
          const partner = living[(index + 1) % living.length];
          const first = currentState.npcBrains[npc.n];
          const second = currentState.npcBrains[partner.n];
          const delta = result.action === 'help' ? 5 : 2;
          const event = result.action === 'help'
            ? npc.n + ' ช่วยเหลือ ' + partner.n
            : npc.n + ' ได้พูดคุยกับ ' + partner.n;
          const pair = stateApiForInteractions().interact(first, second, delta, {
            replyDelta: result.action === 'help' ? 1 : 2,
            event
          });
          const api = stateApiForInteractions();
          currentState.npcBrains[npc.n] = api.remember(pair.first, event, {
            tags: ['social', result.action], importance: 2, source: 'npc-interaction'
          });
          currentState.npcBrains[partner.n] = api.remember(pair.second, event, {
            tags: ['social', result.action], importance: 1, source: 'npc-interaction'
          });
          interactions.push({
            from: npc.n, to: partner.n, type: result.action,
            fromDelta: delta, toDelta: result.action === 'help' ? 1 : 2,
            event
          });
        }
      }
      if (result.story) stories.push(result.story);
    }

    return {
      profiles: currentState.npcBrains,
      actions,
      interactions,
      stories,
      simulatedCount: actions.length,
      story: stories.length ? stories.join('。') : null
    };
  }


  // Versioned, checksummed save protection for the existing extra-life-v2 key.
  // The main game's save()/loadSaved() API remains unchanged.
  const SAVE_SCHEMA_VERSION = 1;
  const GAME_SAVE_KEY = 'extra-life-v2';
  const GAME_BACKUP_KEY = 'extra-life-v2-backup';

  function savePayloadChecksum(payload) {
    const source = JSON.stringify(payload);
    let hash = 2166136261;
    for (let i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function withoutSaveMetadata(value) {
    const payload = JSON.parse(JSON.stringify(value));
    delete payload._saveMeta;
    return payload;
  }

  function encodeSavePayload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Save payload must be a plain object');
    }
    const payload = withoutSaveMetadata(value);
    const meta = value._saveMeta;
    if (meta && Number(meta.schemaVersion) > SAVE_SCHEMA_VERSION) {
      throw new Error('Save was created by a newer game version');
    }
    payload._saveMeta = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      checksum: savePayloadChecksum(payload)
    };
    return JSON.stringify(payload);
  }

  function decodeSavePayload(raw) {
    if (raw == null) return { ok: false, reason: 'missing' };
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      return { ok: false, reason: 'invalid-json', error };
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, reason: 'invalid-shape' };
    }

    const version = value._saveMeta && Number.isInteger(Number(value._saveMeta.schemaVersion))
      ? Number(value._saveMeta.schemaVersion) : 0;
    if (version > SAVE_SCHEMA_VERSION) {
      return { ok: false, reason: 'future-version', version };
    }
    if (version < 0) return { ok: false, reason: 'invalid-version', version };

    const payload = withoutSaveMetadata(value);
    if (version === 0) {
      // v0 is the original unversioned game state. Preserve all fields;
      // the game's existing migrate(s) function still owns gameplay defaults.
      return { ok: true, data: payload, migrated: true, fromVersion: 0 };
    }
    const expected = value._saveMeta && value._saveMeta.checksum;
    if (typeof expected !== 'string' || expected !== savePayloadChecksum(payload)) {
      return { ok: false, reason: 'checksum-mismatch', version };
    }
    return { ok: true, data: payload, migrated: false, fromVersion: version };
  }

  function createSaveManager(storage, options = {}) {
    if (!storage || typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function') {
      throw new TypeError('A Storage-compatible adapter is required');
    }
    const primaryKey = options.key || GAME_SAVE_KEY;
    const backupKey = options.backupKey || GAME_BACKUP_KEY;

    function readValid(raw) {
      const decoded = decodeSavePayload(raw);
      if (!decoded.ok) return decoded;
      return {
        ...decoded,
        encoded: encodeSavePayload(decoded.data)
      };
    }

    function load() {
      let primaryRaw;
      let backupRaw;
      try {
        primaryRaw = storage.getItem(primaryKey);
        const primary = readValid(primaryRaw);
        if (primary.ok) {
          return {
            state: primary.data, source: 'primary', recovered: false,
            migrated: primary.migrated, readOnly: false
          };
        }
        if (primary.reason === 'future-version') {
          return { state: null, source: 'primary', recovered: false, readOnly: true, reason: primary.reason };
        }

        backupRaw = storage.getItem(backupKey);
        const backup = readValid(backupRaw);
        if (backup.ok) {
          return {
            state: backup.data, source: 'backup', recovered: true,
            migrated: backup.migrated, readOnly: false, reason: primary.reason
          };
        }
        if (backup.reason === 'future-version') {
          return { state: null, source: 'backup', recovered: false, readOnly: true, reason: backup.reason };
        }
        return {
          state: null, source: 'none', recovered: false, readOnly: false,
          reason: primary.reason === 'missing' ? backup.reason : primary.reason
        };
      } catch (error) {
        return { state: null, source: 'none', recovered: false, readOnly: false, reason: 'storage-error', error };
      }
    }

    function save(state) {
      let previous;
      try {
        const encoded = encodeSavePayload(state);
        const currentRaw = storage.getItem(primaryKey);
        const current = readValid(currentRaw);
        if (current.ok) previous = current.encoded;
        else {
          const backupRaw = storage.getItem(backupKey);
          const backup = readValid(backupRaw);
          if (backup.ok) previous = backup.encoded;
          if (current.reason === 'future-version') {
            return { ok: false, reason: 'future-version' };
          }
        }
        // Write the last known-good snapshot first. If the primary write fails,
        // the previous save remains recoverable.
        if (previous) storage.setItem(backupKey, previous);
        storage.setItem(primaryKey, encoded);
        return { ok: true, version: SAVE_SCHEMA_VERSION };
      } catch (error) {
        return { ok: false, reason: 'storage-error', error };
      }
    }

    function restore(raw) {
      const decoded = readValid(raw);
      if (!decoded.ok) return { ok: false, reason: decoded.reason };
      return save(decoded.data);
    }

    return Object.freeze({ load, save, restore, version: SAVE_SCHEMA_VERSION });
  }

  function installBrowserSaveProtection(host) {
    try {
      if (!host || !host.Storage || !host.Storage.prototype) return false;
      const prototype = host.Storage.prototype;
      if (prototype.__extraLifeSaveProtection) return true;
      const nativeGet = prototype.getItem;
      const nativeSet = prototype.setItem;

      prototype.getItem = function (key) {
        const raw = nativeGet.call(this, key);
        if (key !== GAME_SAVE_KEY) return raw;
        const primary = decodeSavePayload(raw);
        if (primary.ok) {
          if (primary.migrated) {
            try { return encodeSavePayload(primary.data); } catch (error) { return raw; }
          }
          return raw;
        }
        if (primary.reason === 'future-version') {
          host.__extraLifeSaveReadOnly = true;
          return null;
        }
        const backupRaw = nativeGet.call(this, GAME_BACKUP_KEY);
        const backup = decodeSavePayload(backupRaw);
        if (backup.ok) {
          host.__extraLifeSaveRecovered = true;
          try { return encodeSavePayload(backup.data); } catch (error) { return backupRaw; }
        }
        return null;
      };

      prototype.setItem = function (key, value) {
        if (key !== GAME_SAVE_KEY) return nativeSet.call(this, key, value);
        if (host.__extraLifeSaveReadOnly) return;
        let encoded;
        try {
          const incoming = decodeSavePayload(value);
          if (!incoming.ok && incoming.reason !== 'missing') {
            throw new Error('Refusing to write an invalid game save: ' + incoming.reason);
          }
          encoded = encodeSavePayload(incoming.data);
          const oldRaw = nativeGet.call(this, GAME_SAVE_KEY);
          const old = decodeSavePayload(oldRaw);
          if (old.ok) nativeSet.call(this, GAME_BACKUP_KEY, encodeSavePayload(old.data));
          else {
            const oldBackup = nativeGet.call(this, GAME_BACKUP_KEY);
            if (decodeSavePayload(oldBackup).ok) {
              // Keep the existing known-good backup when the primary is damaged.
            }
          }
          nativeSet.call(this, GAME_SAVE_KEY, encoded);
        } catch (error) {
          throw error;
        }
      };
      Object.defineProperty(prototype, '__extraLifeSaveProtection', {
        value: true, configurable: false, enumerable: false
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  const saveSystem = Object.freeze({\n    version: SAVE_SCHEMA_VERSION,\n    encode: encodeSavePayload,\n    decode: decodeSavePayload,\n    createManager: createSaveManager,\n    installBrowserProtection: installBrowserSaveProtection\n  });\n\n  const api = Object.freeze({ simulate, simulatePopulation, saveSystem });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceWorldSimulation = api;\n  root.OnePieceSaveSystem = saveSystem;\n  installBrowserSaveProtection(root);
})(typeof globalThis !== 'undefined' ? globalThis : this);
