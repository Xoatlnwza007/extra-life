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
    if (worldState && worldState.world === 'op' && !context.actorId) {
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

    function exportSave() {
      const loaded = load();
      if (!loaded.state) return { ok: false, reason: loaded.reason || 'missing' };
      try {
        return { ok: true, filename: 'extra-life-save-v' + SAVE_SCHEMA_VERSION + '.json',
          data: encodeSavePayload(loaded.state) };
      } catch (error) {
        return { ok: false, reason: 'export-error', error };
      }
    }

    function importSave(raw) {
      const decoded = readValid(raw);
      if (!decoded.ok) return { ok: false, reason: decoded.reason };
      const result = save(decoded.data);
      return result.ok
        ? { ok: true, version: SAVE_SCHEMA_VERSION, migrated: decoded.migrated }
        : result;
    }

    return Object.freeze({
      load, save, restore, exportSave, importSave,
      version: SAVE_SCHEMA_VERSION
    });
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

  const saveSystem = Object.freeze({
    version: SAVE_SCHEMA_VERSION,
    encode: encodeSavePayload,
    decode: decodeSavePayload,
    createManager: createSaveManager,
    installBrowserProtection: installBrowserSaveProtection,
    downloadExport: function (manager, host = root) {
      if (!manager || typeof manager.exportSave !== 'function' ||
          !host || !host.Blob || !host.URL || !host.URL.createObjectURL ||
          !host.document) return { ok: false, reason: 'unsupported' };
      const exported = manager.exportSave();
      if (!exported.ok) return exported;
      let url;
      try {
        const blob = new host.Blob([exported.data], { type: 'application/json;charset=utf-8' });
        url = host.URL.createObjectURL(blob);
        const anchor = host.document.createElement('a');
        anchor.href = url;
        anchor.download = exported.filename;
        anchor.style.display = 'none';
        host.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return { ok: true, filename: exported.filename };
      } catch (error) {
        return { ok: false, reason: 'download-error', error };
      } finally {
        if (url) host.URL.revokeObjectURL(url);
      }
    },
    importFile: async function (file, manager) {
      if (!file || typeof file.text !== 'function' || !manager ||
          typeof manager.importSave !== 'function') {
        return { ok: false, reason: 'unsupported' };
      }
      try {
        const raw = await file.text();
        return manager.importSave(raw);
      } catch (error) {
        return { ok: false, reason: 'import-error', error };
      }
    }
  });


  const COMPANION_MODULES = Object.freeze([
    { src: './ai/event-adapter.js', globalName: 'OnePieceEventAdapter' },
    { src: './ai/crew-system.js', globalName: 'OnePieceCrewSystem' },
    { src: './ai/devil-fruit-system.js', globalName: 'OnePieceDevilFruitSystem' },
    { src: './ai/haki-system.js', globalName: 'OnePieceHakiSystem' },
    { src: './ai/progression-system.js', globalName: 'OnePieceProgressionSystem' },
    { src: './ai/marine-system.js', globalName: 'OnePieceMarineSystem' },
    { src: './ai/marine-ui.js', globalName: 'OnePieceMarineUI' }
  ]);

  function loadCompanionModules(host = root) {
    const doc = host && host.document;
    if (!doc || !doc.head || !doc.createElement) return Promise.resolve(false);
    if (host.__onePieceModulesPromise) return host.__onePieceModulesPromise;

    const promise = COMPANION_MODULES.reduce((chain, item) => chain.then(results => {
      if (host[item.globalName]) return results.concat(true);
      return new Promise(resolve => {
        const script = doc.createElement('script');
        script.src = item.src;
        script.async = false;
        script.onload = () => resolve(!!host[item.globalName]);
        script.onerror = () => {
          host.__onePieceModuleErrors = (host.__onePieceModuleErrors || []).concat(item.src);
          resolve(false);
        };
        doc.head.appendChild(script);
      }).then(loaded => results.concat(loaded));
    }), Promise.resolve([])).then(results => results.every(Boolean));
    host.__onePieceModulesPromise = promise;
    host.OnePieceSystemsReady = promise;
    return promise;
  }

  function crewNpcId(npc, index) {
    if (!npc) return null;
    if (npc.id !== undefined && npc.id !== null && String(npc.id)) return String(npc.id);
    if (!npc.n) return null;
    return 'npc:' + (Number.isInteger(index) && index >= 0 ? index + ':' : '') + String(npc.n);
  }

  function getPlayerCrew(worldState, crewApi = root.OnePieceCrewSystem) {
    if (!worldState || !crewApi) return null;
    const crews = Array.isArray(worldState.crews) ? worldState.crews : [];
    if (worldState.playerCrewId) {
      const selected = crews.find(crew => crew && crew.id === worldState.playerCrewId && crew.status === 'active');
      if (selected) return selected;
    }
    return typeof crewApi.findCrewForMember === 'function'
      ? crewApi.findCrewForMember(crews, 'player') : null;
  }

  function createPlayerCrew(worldState, name, crewApi = root.OnePieceCrewSystem) {
    if (!worldState || worldState.world !== 'op' || !crewApi) {
      return { ok: false, reason: 'unsupported-world' };
    }
    const existing = getPlayerCrew(worldState, crewApi);
    if (existing) return { ok: false, reason: 'already-has-crew', crew: existing };
    const crewName = String(name || '').trim() || 'โจรสลัดไร้นาม';
    const crew = crewApi.createCrew({ name: crewName, captainId: 'player', shipName: worldState.flags && worldState.flags.shipName });
    worldState.crews = (Array.isArray(worldState.crews) ? worldState.crews : []).concat(crew);
    worldState.playerCrewId = crew.id;
    worldState.flags = worldState.flags || {};
    worldState.flags.crew = crew.name;
    return { ok: true, crew };
  }

  function recordCrewNpcInteraction(worldState, npc, event, relationshipDelta) {
    const stateApi = root.OnePieceCharacterState;
    if (!worldState || !npc || !npc.n || !stateApi ||
        !worldState.npcBrains || typeof worldState.npcBrains !== 'object') return false;
    const profileKey = 'op-npc-' + npc.n;
    let profile = worldState.npcBrains[profileKey];
    if (!profile) return false;
    profile = stateApi.adjustRelationship(profile, 'player', relationshipDelta, { event });
    profile = stateApi.remember(profile, event, {
      tags: ['crew', 'pirates', 'player'],
      importance: 4,
      source: 'crew'
    });
    worldState.npcBrains = { ...worldState.npcBrains, [profileKey]: profile };
    return true;
  }

  function buyBoatForPlayerCrew(worldState, boatDefinition, buyFunction, crewApi = root.OnePieceCrewSystem) {
    if (!worldState || worldState.world !== 'op') {
      return { ok: false, reason: 'unsupported-world' };
    }
    const items = worldState.own && Array.isArray(worldState.own.items) ? worldState.own.items : [];
    if (items.includes('boat')) return { ok: true, alreadyOwned: true };
    if (!boatDefinition || typeof buyFunction !== 'function') {
      return { ok: false, reason: 'unavailable' };
    }
    const cost = Number(boatDefinition.cost);
    const balance = Number(worldState.money);
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(balance) || balance < cost) {
      return { ok: false, reason: 'insufficient-funds' };
    }
    buyFunction(boatDefinition);
    const crew = getPlayerCrew(worldState, crewApi);
    if (crew) {
      const updated = {
        ...crew,
        history: [...(crew.history || []), {
          type: 'ship-purchased',
          itemId: 'boat',
          at: new Date().toISOString()
        }].slice(-100)
      };
      worldState.crews = (worldState.crews || []).map(item => item && item.id === crew.id ? updated : item);
    }
    return { ok: true, alreadyOwned: false };
  }

  function syncPlayerCrew(worldState, crewApi = root.OnePieceCrewSystem) {
    if (!worldState || worldState.world !== 'op' || !crewApi) {
      return { ok: false, reason: 'unsupported-world', crew: null, changed: false };
    }
    const crew = getPlayerCrew(worldState, crewApi);
    if (!crew) return { ok: false, reason: 'no-player-crew', crew: null, changed: false };
    const playerBounty = Math.max(0, Math.floor(Number(worldState.flags && worldState.flags.bounty) || 0));
    const reputation = Math.max(-100, Math.min(100,
      Math.round((Number(worldState.fame) || 0) - (Number(worldState.dark) || 0))));
    const oldBounty = Number(crew.bounty) || 0;
    const oldReputation = Number(crew.reputation) || 0;
    const nextBounty = Math.max(oldBounty, playerBounty);
    const history = [...(crew.history || [])];
    const at = new Date().toISOString();
    if (nextBounty > oldBounty) {
      history.push({ type: 'bounty-increased', amount: nextBounty - oldBounty, bounty: nextBounty, at });
    }
    if (reputation !== oldReputation) {
      history.push({ type: 'reputation-changed', delta: reputation - oldReputation, reputation, at });
    }
    const updated = {
      ...crew,
      bounty: nextBounty,
      reputation,
      history: history.slice(-100)
    };
    const changed = updated.bounty !== crew.bounty || updated.reputation !== crew.reputation;
    if (changed) {
      worldState.crews = (worldState.crews || []).map(item => item && item.id === crew.id ? updated : item);
    }
    return { ok: true, crew: changed ? updated : crew, changed };
  }

  function recruitNpcToPlayerCrew(worldState, npc, role = 'fighter', crewApi = root.OnePieceCrewSystem) {
    if (!worldState || worldState.world !== 'op' || !crewApi || !npc || !npc.alive) {
      return { crew: null, joined: false, reason: 'invalid-recruitment' };
    }
    const crew = getPlayerCrew(worldState, crewApi);
    if (!crew) return { crew: null, joined: false, reason: 'no-player-crew' };
    const npcIndex = Array.isArray(worldState.npcs) ? worldState.npcs.indexOf(npc) : -1;
    const characterId = crewNpcId(npc, npcIndex);
    if (!characterId || characterId === 'player') {
      return { crew, joined: false, reason: 'invalid-character' };
    }
    const result = crewApi.joinCrew(crew, characterId, role, { capacity: 10 });
    if (result.joined) {
      worldState.crews = worldState.crews.map(item => item && item.id === crew.id ? result.crew : item);
      recordCrewNpcInteraction(worldState, npc, 'เข้าร่วมลูกเรือ ' + crew.name, 15);
    }
    return result;
  }

  function removeNpcFromPlayerCrew(worldState, characterId, crewApi = root.OnePieceCrewSystem) {
    if (!worldState || worldState.world !== 'op' || !crewApi) {
      return { crew: null, left: false, reason: 'unsupported-world' };
    }
    const crew = getPlayerCrew(worldState, crewApi);
    if (!crew) return { crew: null, left: false, reason: 'no-player-crew' };
    const result = crewApi.leaveCrew(crew, characterId);
    if (result.left) {
      worldState.crews = worldState.crews.map(item => item && item.id === crew.id ? result.crew : item);
      const npc = (worldState.npcs || []).find((item, index) => crewNpcId(item, index) === String(characterId));
      if (npc) recordCrewNpcInteraction(worldState, npc, 'ออกจากลูกเรือ ' + crew.name, -12);
    }
    return result;
  }

  function getCrewControlsStyles() {
    return `
      #extra-life-crew-tools{position:fixed;left:max(10px,env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147482000;font:14px/1.45 system-ui,sans-serif;color:#18211c;max-width:calc(100vw - 20px)}
      #extra-life-crew-tools button,#extra-life-crew-tools input,#extra-life-crew-tools select{font:inherit;min-height:44px;max-width:100%;box-sizing:border-box}
      #extra-life-crew-tools button{cursor:pointer;touch-action:manipulation;border:1px solid #aab5aa;border-radius:9px;padding:9px 12px;background:#f5f7f2;color:#18211c}
      #extra-life-crew-tools .el-crew-trigger{min-height:48px;padding:11px 17px;background:#203f32;color:#fff;border-color:#203f32;font-weight:700;box-shadow:0 2px 12px #0003}
      #extra-life-crew-tools .el-crew-panel{width:min(360px,calc(100vw - 20px));max-height:min(70dvh,calc(100dvh - 100px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)));overflow:auto;overscroll-behavior:contain;margin-bottom:8px;padding:12px;background:#f5f7f2;border:1px solid #aab5aa;border-radius:14px;box-shadow:0 5px 24px #0004}
      #extra-life-crew-tools .el-crew-panel[hidden]{display:none}
      #extra-life-crew-tools .el-crew-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
      #extra-life-crew-tools .el-crew-head strong{font-size:15px}
      #extra-life-crew-tools .el-crew-body{display:grid;gap:9px}
      #extra-life-crew-tools .el-crew-body h4{margin:6px 0 0;font-size:13px}
      #extra-life-crew-tools .el-crew-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(96px,auto) auto;gap:7px;align-items:center;padding:7px 0;border-top:1px solid #d7ddd5}
      #extra-life-crew-tools .el-crew-row label{min-width:0;overflow-wrap:anywhere}
      #extra-life-crew-tools .el-crew-row select{width:100%;margin-top:4px}
      #extra-life-crew-tools .el-crew-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
      #extra-life-crew-tools input,#extra-life-crew-tools select{width:100%;padding:8px 10px;border:1px solid #aab5aa;border-radius:8px;background:#fff;color:#18211c}
      #extra-life-crew-tools .el-crew-status{font-size:12px;min-height:1.4em;color:#405348;margin:8px 0 0;overflow-wrap:anywhere}
      #extra-life-crew-tools .el-crew-muted{font-size:12px;color:#526257}
      @media(max-width:380px){#extra-life-crew-tools .el-crew-form{grid-template-columns:1fr}#extra-life-crew-tools .el-crew-row{grid-template-columns:1fr}}
    `;
  }

  function canManagePirateCrew(state) {
    return !!(state && state.world === 'op' && state.alive && state.job && state.job.id === 'pcapt');
  }

  function currentOnePieceState(host = root) {
    let state = null;
    try { if (typeof S !== 'undefined') state = S; } catch (error) {}
    if (!state && host && host.S) state = host.S;
    return state && state.world === 'op' ? state : null;
  }

  function installCrewControls(host = root) {
    const doc = host && host.document;
    const crewApi = host && host.OnePieceCrewSystem;
    if (!doc || !doc.body || !doc.createElement || !crewApi) return false;
    if (doc.getElementById('extra-life-crew-tools')) return true;

    const style = doc.createElement('style');
    style.textContent = getCrewControlsStyles();
    if (doc.head) doc.head.appendChild(style);

    const wrap = doc.createElement('div');
    wrap.id = 'extra-life-crew-tools';
    wrap.hidden = true;
    const panel = doc.createElement('section');
    panel.className = 'el-crew-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'จัดการลูกเรือ');
    const head = doc.createElement('div');
    head.className = 'el-crew-head';
    const heading = doc.createElement('strong');
    heading.textContent = 'จัดการลูกเรือ';
    const close = doc.createElement('button');
    close.type = 'button';
    close.textContent = 'ปิด';
    head.appendChild(heading);
    head.appendChild(close);
    const body = doc.createElement('div');
    body.className = 'el-crew-body';
    const status = doc.createElement('p');
    status.className = 'el-crew-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(status);

    const trigger = doc.createElement('button');
    trigger.type = 'button';
    trigger.className = 'el-crew-trigger';
    trigger.textContent = 'ลูกเรือ';
    trigger.setAttribute('aria-expanded', 'false');
    wrap.appendChild(panel);
    wrap.appendChild(trigger);
    doc.body.appendChild(wrap);

    const setStatus = message => { status.textContent = message; };
    const persist = () => {
      try {
        if (typeof save === 'function') save();
        else if (host && typeof host.save === 'function') host.save();
      } catch (error) { setStatus('บันทึกไม่สำเร็จ: ' + error.message); }
    };
    const make = (tag, text, className) => {
      const node = doc.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const makeButton = (label, handler) => {
      const button = make('button', label);
      button.type = 'button';
      button.addEventListener('click', handler);
      return button;
    };

    function renderCrewPanel() {
      const state = currentOnePieceState(host);
      if (!state || !state.alive || !canManagePirateCrew(state)) return;
      body.replaceChildren();
      const api = host.OnePieceCrewSystem;
      const synced = syncPlayerCrew(state, api);
      if (synced.changed) persist();
      const crew = synced.crew || getPlayerCrew(state, api);
      if (!crew) {
        body.appendChild(make('p', 'สร้างกลุ่มโจรสลัดของคุณ แล้วชวน NPC ที่ยังมีชีวิตเข้าร่วม'));
        const form = make('div', undefined, 'el-crew-form');
        const name = doc.createElement('input');
        name.type = 'text';
        name.maxLength = 40;
        name.placeholder = 'ชื่อกลุ่มโจรสลัด';
        name.value = state.flags && state.flags.crew ? state.flags.crew : '';
        name.setAttribute('aria-label', 'ชื่อกลุ่มโจรสลัด');
        const create = makeButton('สร้าง', () => {
          const result = createPlayerCrew(state, name.value.trim() || 'โจรสลัดไร้นาม', api);
          if (!result.ok) setStatus(result.reason === 'already-has-crew' ? 'คุณมีกลุ่มอยู่แล้ว' : 'สร้างกลุ่มไม่สำเร็จ');
          else { setStatus('สร้างกลุ่มโจรสลัดแล้ว'); persist(); renderCrewPanel(); }
        });
        form.appendChild(name);
        form.appendChild(create);
        body.appendChild(form);
        return;
      }

      body.appendChild(make('strong', crew.name));
      body.appendChild(make('div', 'สมาชิก ' + (crew.members || []).length + '/10 · ค่าหัวกลุ่ม ' + (crew.bounty || 0).toLocaleString('th-TH') + ' เบรี · ชื่อเสียง ' + (crew.reputation || 0), 'el-crew-muted'));

      const ownsBoat = !!(state.own && Array.isArray(state.own.items) && state.own.items.includes('boat'));
      if (!ownsBoat) {
        body.appendChild(make('p', 'ลูกเรือยังไม่มีเรือ ซื้อเรือใบลำเล็กก่อนจึงจะตั้งชื่อเรือได้', 'el-crew-muted'));
        let boatDefinition = null;
        try {
          if (typeof W !== 'undefined' && W && Array.isArray(W.shop)) {
            boatDefinition = W.shop.find(item => item.id === 'boat') || null;
          }
        } catch (error) {}
        const purchase = makeButton(
          boatDefinition ? 'ซื้อเรือใบลำเล็ก · ' + boatDefinition.cost + ' เบรี' : 'เรือยังไม่พร้อมซื้อ',
          () => {
            let buyFunction = null;
            try { if (typeof buy === 'function') buyFunction = buy; } catch (error) {}
            const result = buyBoatForPlayerCrew(state, boatDefinition, buyFunction, api);
            if (!result.ok) {
              setStatus(result.reason === 'insufficient-funds' ? 'เงินไม่พอซื้อเรือ' : 'ยังซื้อเรือไม่ได้');
              return;
            }
            persist();
            setStatus('ซื้อเรือแล้ว');
            renderCrewPanel();
          }
        );
        purchase.disabled = !boatDefinition || !Number.isFinite(Number(state.money)) || Number(state.money) < Number(boatDefinition.cost);
        body.appendChild(purchase);
      } else {
        const shipForm = make('div', undefined, 'el-crew-form');
        const ship = doc.createElement('input');
        ship.type = 'text';
        ship.maxLength = 40;
        ship.placeholder = 'ชื่อเรือ';
        ship.value = crew.shipName || (state.flags && state.flags.shipName) || '';
        ship.setAttribute('aria-label', 'ชื่อเรือ');
        const saveShip = makeButton('บันทึกเรือ', () => {
          const updated = { ...crew, shipName: ship.value.trim() || null };
          state.crews = (state.crews || []).map(item => item && item.id === crew.id ? updated : item);
          state.flags = state.flags || {};
          state.flags.shipName = updated.shipName;
          persist();
          setStatus('บันทึกชื่อเรือแล้ว');
        });
        shipForm.appendChild(ship);
        shipForm.appendChild(saveShip);
        body.appendChild(shipForm);
      }

      body.appendChild(make('h4', 'สมาชิกในลูกเรือ'));
      for (const member of crew.members || []) {
        const row = make('div', undefined, 'el-crew-row');
        const npc = (state.npcs || []).find((item, index) => crewNpcId(item, index) === member.characterId);
        const label = member.characterId === 'player'
          ? (state.name || 'ผู้เล่น') + ' · กัปตัน'
          : (npc ? npc.n + ' · ' + member.role : member.characterId + ' · ' + member.role);
        row.appendChild(make('label', label));
        if (member.characterId !== 'player') {
          const role = doc.createElement('select');
          role.setAttribute('aria-label', 'เปลี่ยนตำแหน่งของ ' + (npc ? npc.n : member.characterId));
          for (const roleName of api.DEFAULT_ROLES.filter(value => value !== 'captain')) {
            const option = doc.createElement('option');
            option.value = roleName;
            option.textContent = roleName;
            option.selected = roleName === member.role;
            role.appendChild(option);
          }
          role.addEventListener('change', () => {
            const result = api.setMemberRole(crew, member.characterId, role.value);
            if (!result.updated) {
              setStatus('เปลี่ยนตำแหน่งไม่สำเร็จ: ' + result.reason);
              return;
            }
            const updatedCrew = {
              ...result.crew,
              history: [...(result.crew.history || []), {
                type: 'role-changed',
                characterId: member.characterId,
                from: member.role,
                to: role.value,
                at: new Date().toISOString()
              }].slice(-100)
            };
            state.crews = (state.crews || []).map(item => item && item.id === crew.id ? updatedCrew : item);
            persist();
            setStatus('เปลี่ยนตำแหน่งสมาชิกแล้ว');
            renderCrewPanel();
          });
          row.appendChild(role);
          row.appendChild(makeButton('ออกจากกลุ่ม', () => {
            const result = removeNpcFromPlayerCrew(state, member.characterId, api);
            setStatus(result.left ? 'นำสมาชิกออกจากกลุ่มแล้ว' : 'ทำรายการไม่สำเร็จ');
            if (result.left) { persist(); renderCrewPanel(); }
          }));
        } else {
          row.appendChild(make('span', ''));
        }
        body.appendChild(row);
      }

      body.appendChild(make('h4', 'บันทึกลูกเรือ'));
      const history = (crew.history || []).slice(-5).reverse();
      if (!history.length) body.appendChild(make('p', 'ยังไม่มีบันทึกกิจกรรม', 'el-crew-muted'));
      const characterName = characterId => {
        if (characterId === 'player') return state.name || 'ผู้เล่น';
        const npc = (state.npcs || []).find((item, index) => crewNpcId(item, index) === characterId);
        return npc ? npc.n : characterId || 'ไม่ทราบชื่อ';
      };
      const historyMessage = entry => {
        switch (entry.type) {
          case 'joined': return characterName(entry.characterId) + ' เข้าร่วมลูกเรือ · ' + entry.role;
          case 'ship-purchased': return 'ซื้อเรือใบลำเล็กสำหรับลูกเรือ';
          case 'role-changed': return characterName(entry.characterId) + ' เปลี่ยนตำแหน่งจาก ' + entry.from + ' เป็น ' + entry.to;
          case 'left': return characterName(entry.characterId) + ' ออกจากลูกเรือ';
          case 'captaincy-transferred': return 'เปลี่ยนกัปตันจาก ' + characterName(entry.from) + ' เป็น ' + characterName(entry.to);
          case 'bounty-increased': return 'ค่าหัวเพิ่มขึ้น ' + Number(entry.amount || 0).toLocaleString('th-TH') + ' เบรี';
          case 'reputation-changed': return 'ชื่อเสียงเปลี่ยน ' + (Number(entry.delta) > 0 ? '+' : '') + Number(entry.delta || 0) + ' · ปัจจุบัน ' + Number(entry.reputation || 0);
          case 'relation-changed': return 'ความสัมพันธ์กับกลุ่มอื่นเปลี่ยนเป็น ' + (entry.label || 'neutral');
          case 'crew-encounter': return entry.outcome === 'victory' ? 'ชนะการปะทะกับกลุ่มโจรสลัด' : entry.outcome === 'defeat' ? 'พ่ายแพ้ในการปะทะกับกลุ่มโจรสลัด' : 'ปะทะกับกลุ่มโจรสลัดโดยไม่มีผู้ชนะ';
          case 'disbanded': return 'ยุบกลุ่มโจรสลัด · ' + (entry.reason || 'ไม่ระบุเหตุผล');
          default: return 'กิจกรรมลูกเรือ · ' + String(entry.type || 'ไม่ทราบประเภท');
        }
      };
      for (const entry of history) {
        const date = entry.at ? new Date(entry.at) : null;
        const dateLabel = date && Number.isFinite(date.getTime())
          ? date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · '
          : '';
        body.appendChild(make('div', dateLabel + historyMessage(entry), 'el-crew-muted'));
      }

      body.appendChild(make('h4', 'ชวน NPC เข้าร่วม'));
      const candidates = (state.npcs || []).filter(npc => {
        if (!npc || !npc.alive) return false;
        const id = crewNpcId(npc, (state.npcs || []).indexOf(npc));
        return id && !api.findCrewForMember(state.crews || [], id);
      });
      if (!candidates.length) {
        body.appendChild(make('p', 'ยังไม่มี NPC ว่างให้ชวนเข้ากลุ่ม', 'el-crew-muted'));
      }
      for (const npc of candidates.slice(0, 20)) {
        const row = make('div', undefined, 'el-crew-row');
        const details = make('label', npc.n + (npc.d ? ' · ' + npc.d : ''));
        const role = doc.createElement('select');
        role.setAttribute('aria-label', 'ตำแหน่งของ ' + npc.n);
        for (const roleName of api.DEFAULT_ROLES.filter(value => value !== 'captain')) {
          const option = doc.createElement('option');
          option.value = roleName;
          option.textContent = roleName;
          role.appendChild(option);
        }
        details.appendChild(role);
        row.appendChild(details);
        row.appendChild(makeButton('ชวนเข้ากลุ่ม', () => {
          const result = recruitNpcToPlayerCrew(state, npc, role.value, api);
          setStatus(result.joined ? npc.n + ' เข้าร่วมลูกเรือแล้ว' : 'ชวนไม่สำเร็จ: ' + result.reason);
          if (result.joined) { persist(); renderCrewPanel(); }
        }));
        body.appendChild(row);
      }
    }

    trigger.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) renderCrewPanel();
    });
    close.addEventListener('click', () => {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    });

    const syncVisibility = () => {
      const state = currentOnePieceState(host);
      const visible = !!(state && state.alive && canManagePirateCrew(state));
      wrap.hidden = !visible;
      if (!visible) {
        panel.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        return;
      }
      const synced = syncPlayerCrew(state, host.OnePieceCrewSystem);
      if (synced.changed) {
        persist();
        if (!panel.hidden) renderCrewPanel();
      }
    };
    syncVisibility();
    if (typeof host.setInterval === 'function') {
      host.__onePieceCrewUiTimer = host.setInterval(syncVisibility, 800);
    }
    return true;
  }

  function scheduleCrewControls(host = root) {
    if (!host || !host.document) return false;
    const install = () => installCrewControls(host);
    if (host.document.readyState === 'loading') {
      host.document.addEventListener('DOMContentLoaded', install, { once: true });
      return true;
    }
    return install();
  }



  function loadRogerEraContent(host = root) {
    const doc = host && host.document;
    if (!doc || !doc.head || !doc.createElement) return Promise.resolve(false);
    if (host.OnePieceRogerEraContent) return Promise.resolve(true);
    if (host.__onePieceRogerEraPromise) return host.__onePieceRogerEraPromise;
    const promise = new Promise(resolve => {
      const script = doc.createElement('script');
      script.src = './ai/roger-era-content.js';
      script.async = false;
      script.onload = () => resolve(!!host.OnePieceRogerEraContent);
      script.onerror = () => {
        host.__onePieceContentErrors = (host.__onePieceContentErrors || []).concat(script.src);
        resolve(false);
      };
      doc.head.appendChild(script);
    });
    host.__onePieceRogerEraPromise = promise;
    return promise;
  }

  function scheduleRogerEraContent(host = root) {
    if (!host || !host.document) return false;
    const doc = host.document;
    if (doc.readyState === 'loading') {
      if (!host.__onePieceRogerEraScheduled) {
        host.__onePieceRogerEraScheduled = true;
        doc.addEventListener('DOMContentLoaded', () => { loadRogerEraContent(host); }, { once: true });
      }
      return true;
    }
    loadRogerEraContent(host);
    return true;
  }

  // Player-facing Haki and Devil Fruit mastery controls.
  // Training is limited to once per in-game year per discipline to prevent UI spam.
  function getProgressionControlsStyles() {
    return `
      #extra-life-progression-tools{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147482998;font:14px/1.45 system-ui,sans-serif;color:#18211c;max-width:calc(100vw - 24px)}
      #extra-life-progression-tools button{font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border:1px solid #aab5aa;border-radius:10px;min-width:48px;min-height:48px;padding:10px 14px;background:#f5f7f2;color:#18211c}
      #extra-life-progression-tools .el-progression-trigger{background:#263e62;color:#fff;border-color:#263e62;font-weight:700}
      #extra-life-progression-tools .el-progression-panel{display:none;width:min(360px,calc(100vw - 24px));max-height:calc(100dvh - 48px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));overflow:auto;overscroll-behavior:contain;margin-bottom:8px;padding:12px;background:#f5f7f2;border:1px solid #aab5aa;border-radius:14px;box-shadow:0 5px 24px #0003}
      #extra-life-progression-tools[data-open="true"] .el-progression-panel{display:grid;gap:9px}
      #extra-life-progression-tools .el-progression-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #d8ded6}
      #extra-life-progression-tools .el-progression-row span{min-width:0;overflow-wrap:anywhere}
      #extra-life-progression-tools .el-progression-row button{flex:0 0 auto}
      #extra-life-progression-tools .el-progression-muted{font-size:12px;color:#536257;margin:0}
      #extra-life-progression-tools .el-progression-status{min-height:1.4em;font-size:12px;color:#405348;overflow-wrap:anywhere}
      @media(max-width:480px){#extra-life-progression-tools{left:max(8px,env(safe-area-inset-left,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px))}#extra-life-progression-tools .el-progression-panel{width:min(340px,calc(100vw - 16px))}}
      @media(max-height:520px) and (orientation:landscape){#extra-life-progression-tools .el-progression-panel{max-height:calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}}
    `;
  }

  function installProgressionControls(host = root) {
    const doc = host && host.document;
    const api = host && host.OnePieceProgressionSystem;
    if (!doc || !doc.body || !doc.createElement || !api) return false;
    if (doc.getElementById('extra-life-progression-tools')) return true;

    const style = doc.createElement('style');
    style.textContent = getProgressionControlsStyles();
    if (doc.head) doc.head.appendChild(style);
    const wrap = doc.createElement('div');
    wrap.id = 'extra-life-progression-tools';
    wrap.hidden = true;
    const panel = doc.createElement('section');
    panel.className = 'el-progression-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'พัฒนาพลังฮาคิและผลปีศาจ');
    const heading = doc.createElement('strong');
    heading.textContent = 'พัฒนาพลัง';
    const close = doc.createElement('button');
    close.type = 'button';
    close.textContent = 'ปิด';
    const body = doc.createElement('div');
    const status = doc.createElement('p');
    status.className = 'el-progression-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(heading);
    panel.appendChild(body);
    panel.appendChild(status);
    panel.appendChild(close);
    const trigger = doc.createElement('button');
    trigger.type = 'button';
    trigger.className = 'el-progression-trigger';
    trigger.textContent = 'พลัง';
    trigger.setAttribute('aria-expanded', 'false');
    wrap.appendChild(panel);
    wrap.appendChild(trigger);
    doc.body.appendChild(wrap);

    const make = (tag, text, className) => {
      const node = doc.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const button = (label, handler) => {
      const node = make('button', label);
      node.type = 'button';
      node.addEventListener('click', handler);
      return node;
    };
    const setStatus = message => { status.textContent = message; };
    let renderedYear = null;
    const persist = () => {
      try {
        if (typeof save === 'function') save();
        else if (host && typeof host.save === 'function') host.save();
      } catch (error) { setStatus('บันทึกไม่สำเร็จ: ' + error.message); }
    };
    const currentYear = state => Number.isFinite(Number(state.year)) ? Number(state.year) : null;
    const trainingUsed = (state, key) => {
      const year = currentYear(state);
      return year !== null && state.progressionTraining &&
        state.progressionTraining[key] === year;
    };
    const markTraining = (state, key) => {
      const year = currentYear(state);
      if (year === null) return;
      state.progressionTraining = { ...(state.progressionTraining || {}), [key]: year };
    };

    function render() {
      const state = currentOnePieceState(host);
      if (!state || !state.alive) return;
      renderedYear = currentYear(state);
      body.replaceChildren();
      const synced = api.syncCharacter(state);
      if (synced.ok && synced.changed) {
        state.haki = synced.character.haki;
        persist();
      }
      const summary = api.getSummary(state);
      if (!summary.ready) {
        body.appendChild(make('p', 'ระบบพัฒนาพลังยังไม่พร้อม', 'el-progression-muted'));
        return;
      }
      body.appendChild(make('p', 'ฝึกได้อย่างละ 1 ครั้งต่อปีเกม · เพิ่มความชำนาญครั้งละ 5 แต้ม', 'el-progression-muted'));
      body.appendChild(make('h4', 'ฮาคิ'));
      const labels = {
        armament: 'ฮาคิเกราะ',
        observation: 'ฮาคิสังเกต',
        conquerors: 'ฮาคิราชัน'
      };
      for (const type of ['armament', 'observation', 'conquerors']) {
        const styleState = summary.haki[type];
        const row = make('div', undefined, 'el-progression-row');
        const detail = make('span', labels[type] + ' · ' +
          (styleState.unlocked ? styleState.mastery + '/100 · ' + styleState.rank : 'ยังไม่ปลุกพลัง'));
        row.appendChild(detail);
        if (styleState.unlocked) {
          const used = trainingUsed(state, 'haki:' + type);
          const train = button(used ? 'ฝึกแล้ว' : '+5 ฝึกฝน', () => {
            if (trainingUsed(state, 'haki:' + type)) return setStatus('ฮาคิชนิดนี้ฝึกได้อีกครั้งในปีเกมถัดไป');
            const result = api.trainHaki(state, type, 5);
            if (!result.trained) return setStatus('ฝึกไม่สำเร็จ: ' + result.reason);
            state.haki = result.character.haki;
            markTraining(state, 'haki:' + type);
            persist();
            setStatus(labels[type] + ' เพิ่มขึ้น ' + result.gained + ' แต้ม');
            render();
          });
          train.disabled = used || styleState.mastery >= 100;
          row.appendChild(train);
        }
        body.appendChild(row);
      }

      body.appendChild(make('h4', 'ผลปีศาจ'));
      if (!summary.devilFruit) {
        body.appendChild(make('p', 'ยังไม่มีข้อมูลผลปีศาจที่กินแล้ว', 'el-progression-muted'));
      } else {
        const fruit = summary.devilFruit;
        body.appendChild(make('p', fruit.name + ' · ' + fruit.type + ' · ความชำนาญ ' + fruit.mastery + '/100' +
          (fruit.awakened ? ' · ปลุกพลังแล้ว' : ''), 'el-progression-muted'));
        if (!fruit.awakened) {
          const used = trainingUsed(state, 'fruit');
          const train = button(used ? 'ฝึกผลปีศาจแล้ว' : '+5 ฝึกผลปีศาจ', () => {
            if (trainingUsed(state, 'fruit')) return setStatus('ฝึกผลปีศาจได้อีกครั้งในปีเกมถัดไป');
            const result = api.trainFruit(state, 5);
            if (!result.trained) return setStatus('ฝึกไม่สำเร็จ: ' + result.reason);
            state.devilFruit = result.character.devilFruit;
            markTraining(state, 'fruit');
            persist();
            setStatus('ความชำนาญผลปีศาจเพิ่มขึ้น ' + result.gained + ' แต้ม');
            render();
          });
          train.disabled = used || fruit.mastery >= 100;
          body.appendChild(train);
          const awaken = button('ลองปลุกพลัง (ต้องมี 80 แต้ม)', () => {
            const result = api.awakenFruit(state, { requiredMastery: 80 });
            if (!result.awakened) return setStatus(result.reason === 'insufficient-mastery'
              ? 'ความชำนาญยังไม่ถึง ' + result.required + ' แต้ม' : 'ปลุกพลังไม่สำเร็จ: ' + result.reason);
            state.devilFruit = result.character.devilFruit;
            persist();
            setStatus('ปลุกพลังผลปีศาจสำเร็จ');
            render();
          });
          awaken.disabled = fruit.mastery < 80;
          body.appendChild(awaken);
        }
      }
    }

    trigger.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      wrap.setAttribute('data-open', String(open));
      trigger.setAttribute('aria-expanded', String(open));
      if (open) render();
    });
    close.addEventListener('click', () => {
      panel.hidden = true;
      wrap.setAttribute('data-open', 'false');
      trigger.setAttribute('aria-expanded', 'false');
    });
    const syncVisibility = () => {
      const state = currentOnePieceState(host);
      const visible = !!(state && state.alive);
      wrap.hidden = !visible;
      if (!visible) {
        panel.hidden = true;
        wrap.setAttribute('data-open', 'false');
        trigger.setAttribute('aria-expanded', 'false');
      } else if (!panel.hidden && currentYear(state) !== renderedYear) render();
    };
    syncVisibility();
    if (typeof host.setInterval === 'function') {
      host.__onePieceProgressionUiTimer = host.setInterval(syncVisibility, 1000);
    }
    return true;
  }

  function scheduleProgressionControls(host = root) {
    if (!host || !host.document) return false;
    const install = () => installProgressionControls(host);
    if (host.document.readyState === 'loading') {
      host.document.addEventListener('DOMContentLoaded', install, { once: true });
      return true;
    }
    return install();
  }

  function getMobileTouchStyles() {
    return `
      @media(any-pointer:coarse){
        .world,.origin,.ghost,.primary,.act,.seg button,#playBtn,#ageBtn,.hud .hudb{min-height:48px}
        .act{padding:10px 9px}
        .seg button{padding:10px 14px}
        .pp{min-height:44px;align-items:center;padding-top:8px;padding-bottom:8px}
        .tog{min-height:44px;padding-block:6px}
        input[type=range]{min-height:44px}
        .hud .hudb{padding:8px 10px}
      }
      @media(max-width:560px) and (any-pointer:coarse){
        .actbar{max-height:min(52dvh,420px);overflow-y:auto;overscroll-behavior:contain;padding-left:max(8px,env(safe-area-inset-left,0px));padding-right:max(8px,env(safe-area-inset-right,0px))}
        .actbar .inner{gap:10px}
        .actrow{gap:8px}
        .acts{gap:8px}
        .act{overflow-wrap:anywhere;line-height:1.3}
        .scrim{padding-top:max(16px,env(safe-area-inset-top,0px));padding-bottom:max(16px,env(safe-area-inset-bottom,0px))}
        .dlg{max-height:calc(100dvh - 32px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}
      }
      @media(min-width:561px) and (max-width:900px) and (any-pointer:coarse){
        .actrow{gap:10px}
        .acts{gap:8px}
      }
    `;
  }

  function installMobileTouchStyles(host = root) {
    const doc = host && host.document;
    if (!doc || !doc.head || !doc.createElement) return false;
    if (doc.getElementById('extra-life-mobile-touch-styles')) return true;
    const style = doc.createElement('style');
    style.id = 'extra-life-mobile-touch-styles';
    style.textContent = getMobileTouchStyles();
    doc.head.appendChild(style);
    return true;
  }

  function getSaveControlsStyles() {
    return `
      #extra-life-save-tools{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147483000;font:14px/1.45 system-ui,sans-serif;color:#18211c;max-width:calc(100vw - 24px)}
      #extra-life-save-tools button{font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border:1px solid #aab5aa;border-radius:10px;min-width:48px;min-height:48px;padding:12px 16px;background:#f5f7f2;color:#18211c;box-shadow:0 2px 12px #0002}
      #extra-life-save-tools .el-save-trigger{background:#203f32;color:#fff;border-color:#203f32;font-weight:700}
      #extra-life-save-tools .el-save-panel{display:none;width:min(320px,calc(100vw - 24px));max-height:calc(100dvh - 48px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));overflow:auto;overscroll-behavior:contain;margin-bottom:8px;padding:12px;background:#f5f7f2;border:1px solid #aab5aa;border-radius:14px;box-shadow:0 5px 24px #0003}
      #extra-life-save-tools[data-open="true"] .el-save-panel{display:grid;gap:8px}
      #extra-life-save-tools .el-save-panel p{margin:0 0 4px;font-size:13px}
      #extra-life-save-tools .el-save-status{min-height:1.4em;font-size:12px;color:#405348;overflow-wrap:anywhere}
      #extra-life-save-tools .el-save-close{justify-self:end;padding:8px 12px}
      @media(max-width:480px){#extra-life-save-tools{right:max(8px,env(safe-area-inset-right,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px))}#extra-life-save-tools .el-save-panel{width:min(320px,calc(100vw - 16px))}}
      @media(max-height:520px) and (orientation:landscape){#extra-life-save-tools .el-save-panel{max-height:calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}}
      @media(prefers-reduced-motion:no-preference){#extra-life-save-tools .el-save-panel{animation:elSaveIn .12s ease-out}@keyframes elSaveIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}}
    `;
  }

  function installSaveControls(host = root) {
    const doc = host && host.document;
    if (!doc || !doc.createElement || !doc.body) return false;
    if (doc.getElementById('extra-life-save-tools')) return true;

    const style = doc.createElement('style');
    style.textContent = getSaveControlsStyles();
    doc.head && doc.head.appendChild(style);
    const wrap = doc.createElement('div');
    wrap.id = 'extra-life-save-tools';
    wrap.innerHTML = '<div class="el-save-panel" role="dialog" aria-label="จัดการไฟล์เซฟ"><p><strong>จัดการไฟล์เซฟ</strong></p><button type="button" data-action="export">ส่งออกไฟล์เซฟ</button><button type="button" data-action="import">นำเข้าไฟล์เซฟ</button><div class="el-save-status" role="status" aria-live="polite"></div><button type="button" class="el-save-close" data-action="close">ปิด</button></div><button type="button" class="el-save-trigger" aria-expanded="false">จัดการเซฟ</button><input type="file" accept=".json,application/json" hidden>';
    doc.head && doc.head.appendChild(style);
    doc.body.appendChild(wrap);

    const panel = wrap.querySelector('.el-save-panel');
    const trigger = wrap.querySelector('.el-save-trigger');
    const input = wrap.querySelector('input[type="file"]');
    const status = wrap.querySelector('.el-save-status');
    const manager = createSaveManager(host.localStorage);
    const setStatus = message => { status.textContent = message; };

    trigger.addEventListener('click', () => {
      const open = wrap.getAttribute('data-open') !== 'true';
      wrap.setAttribute('data-open', String(open));
      trigger.setAttribute('aria-expanded', String(open));
    });
    wrap.addEventListener('click', async event => {
      const action = event.target && event.target.getAttribute('data-action');
      if (!action) return;
      if (action === 'close') {
        wrap.setAttribute('data-open', 'false');
        trigger.setAttribute('aria-expanded', 'false');
      } else if (action === 'export') {
        const result = saveSystem.downloadExport(manager, host);
        setStatus(result.ok ? 'ส่งออกไฟล์สำเร็จ: ' + result.filename :
          result.reason === 'missing' ? 'ยังไม่พบข้อมูลเซฟ' : 'ส่งออกไม่สำเร็จ: ' + result.reason);
      } else if (action === 'import') {
        input.value = '';
        input.click();
      }
    });
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setStatus('ไฟล์มีขนาดเกิน 10 MB');
        return;
      }
      const confirmed = typeof host.confirm !== 'function' ||
        host.confirm('นำเข้าไฟล์เซฟนี้หรือไม่? เซฟปัจจุบันจะถูกเก็บเป็น Backup ก่อน');
      if (!confirmed) {
        setStatus('ยกเลิกการนำเข้าแล้ว');
        return;
      }
      const result = await saveSystem.importFile(file, manager);
      if (!result.ok) {
        setStatus('นำเข้าไม่สำเร็จ: ' + result.reason);
        return;
      }
      setStatus('นำเข้าสำเร็จ กำลังโหลดเกมใหม่…');
      if (host.location && typeof host.location.reload === 'function') {
        host.setTimeout(() => host.location.reload(), 250);
      }
    });
    return true;
  }

  function scheduleSaveControls(host = root) {
    if (!host || !host.document) return false;
    const install = () => installSaveControls(host);
    if (host.document.readyState === 'loading') {
      host.document.addEventListener('DOMContentLoaded', install, { once: true });
      return true;
    }
    return install();
  }

  const api = Object.freeze({ simulate, simulatePopulation, saveSystem, installProgressionControls, scheduleProgressionControls, getProgressionControlsStyles, loadRogerEraContent, scheduleRogerEraContent, installSaveControls, getSaveControlsStyles, getMobileTouchStyles, installMobileTouchStyles, loadCompanionModules, companionModules: COMPANION_MODULES, crewNpcId, getPlayerCrew, createPlayerCrew, recruitNpcToPlayerCrew, removeNpcFromPlayerCrew, syncPlayerCrew, recordCrewNpcInteraction, buyBoatForPlayerCrew, canManagePirateCrew, getCrewControlsStyles, installCrewControls, scheduleCrewControls });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceWorldSimulation = api;
  root.OnePieceSaveSystem = saveSystem;
  installBrowserSaveProtection(root);
  installMobileTouchStyles(root);
  scheduleSaveControls(root);
  loadCompanionModules(root).then(loaded => { if (loaded) { scheduleCrewControls(root); scheduleProgressionControls(root); if (root.OnePieceMarineUI) root.OnePieceMarineUI.scheduleMarineControls(root); } scheduleRogerEraContent(root); });
})(typeof globalThis !== 'undefined' ? globalThis : this);
