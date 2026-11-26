/* One Piece Life Simulator — Marine intelligence and pirate pursuit.
 * Pure helpers: callers own world-state persistence and UI.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function createMarineForce(input = {}) {
    return {
      id: String(input.id || 'marine-' + Date.now().toString(36)),
      name: String(input.name || 'Marine Patrol'),
      base: input.base || null,
      strength: clamp(finite(input.strength, 50), 1, 100),
      intelligence: clamp(finite(input.intelligence, 35), 0, 100),
      alertness: clamp(finite(input.alertness, 40), 0, 100),
      wantedRecords: {},
      patrols: [],
      updatedAt: input.updatedAt || new Date().toISOString()
    };
  }

  function registerWanted(force, target, options = {}) {
    if (!force || !target || target.id == null || !String(target.id).trim()) {
      return { force, registered: false, reason: 'invalid-target' };
    }
    const bounty = Math.max(0, Math.floor(finite(target.bounty)));
    if (bounty <= 0) return { force, registered: false, reason: 'no-bounty' };
    const id = String(target.id);
    const previous = (force.wantedRecords || {})[id] || {};
    const record = {
      targetId: id,
      name: String(target.name || previous.name || 'Unknown Pirate'),
      bounty: Math.max(bounty, finite(previous.bounty)),
      notoriety: clamp(finite(target.notoriety, finite(previous.notoriety)), 0, 100),
      lastKnownLocation: target.location || previous.lastKnownLocation || null,
      status: ['captured', 'tracking'].includes(previous.status) ? previous.status : 'wanted',
      sightings: Math.max(0, Math.floor(finite(previous.sightings))),
      confidence: clamp(finite(previous.confidence), 0, 100),
      lastSeenAt: previous.lastSeenAt || null,
      pursuit: previous.pursuit || null,
      registeredAt: previous.registeredAt || options.at || new Date().toISOString(),
      updatedAt: options.at || new Date().toISOString()
    };
    return {
      force: { ...force, wantedRecords: { ...(force.wantedRecords || {}), [id]: record }, updatedAt: record.updatedAt },
      registered: true,
      record
    };
  }

  function evaluateSighting(force, target, context = {}) {
    const registered = registerWanted(force, target, context);
    if (!registered.registered) return { ...registered, detected: false, chance: 0 };
    const record = registered.record;
    if (record.status === 'captured') {
      return { force: registered.force, record, detected: false, chance: 0, reason: 'already-captured' };
    }
    const random = typeof context.random === 'function' ? context.random : Math.random;
    const bountySignal = Math.min(30, Math.log10(Math.max(1, record.bounty)) * 2.2);
    const locationMatch = context.location && record.lastKnownLocation &&
      String(context.location) === String(record.lastKnownLocation) ? 18 : 0;
    const coverPenalty = clamp(finite(context.cover), 0, 100) * 0.35;
    const distancePenalty = clamp(finite(context.distance, 50), 0, 100) * 0.22;
    const chance = clamp(
      8 + finite(registered.force.intelligence) * 0.28 +
      finite(registered.force.alertness) * 0.16 + bountySignal +
      record.notoriety * 0.12 + locationMatch - coverPenalty - distancePenalty,
      2, 95
    );
    const detected = Number(random()) < chance / 100;
    const at = context.at || new Date().toISOString();
    const nextRecord = detected ? {
      ...record,
      sightings: record.sightings + 1,
      confidence: clamp(record.confidence + 15 + chance * 0.25, 0, 100),
      lastSeenAt: at,
      lastKnownLocation: context.location || record.lastKnownLocation,
      status: 'tracking',
      pursuit: record.pursuit || { phase: 'investigating', progress: 10, pressure: 0, updatedAt: at },
      updatedAt: at
    } : { ...record, updatedAt: at };
    const nextForce = {
      ...registered.force,
      wantedRecords: { ...registered.force.wantedRecords, [record.targetId]: nextRecord },
      updatedAt: at
    };
    return { force: nextForce, record: nextRecord, detected, chance: Math.round(chance * 100) / 100 };
  }

  function advancePursuit(record, context = {}) {
    if (!record || !record.pursuit || ['captured', 'escaped'].includes(record.status)) {
      return { record, advanced: false, reason: 'no-active-pursuit' };
    }
    const evidence = clamp(finite(context.evidence, 10), 0, 100);
    const targetMovement = clamp(finite(context.targetMovement, 30), 0, 100);
    const marineResources = clamp(finite(context.resources, 50), 0, 100);
    const progress = clamp(
      finite(record.pursuit.progress) + evidence * 0.35 +
      marineResources * 0.18 - targetMovement * 0.22,
      0, 100
    );
    const pressure = clamp(
      finite(record.pursuit.pressure) + marineResources * 0.2 +
      evidence * 0.12 - targetMovement * 0.1,
      0, 100
    );
    const phase = progress >= 85 ? 'pursuing' : progress >= 45 ? 'tracking' : 'investigating';
    const at = context.at || new Date().toISOString();
    const next = {
      ...record,
      status: 'tracking',
      pursuit: { phase, progress, pressure, updatedAt: at },
      confidence: clamp(Math.max(finite(record.confidence), progress), 0, 100),
      updatedAt: at
    };
    return { record: next, advanced: true, phase, progress, pressure };
  }

  function resolveEncounter(record, options = {}) {
    if (!record || !record.pursuit || record.status === 'captured' || record.status === 'escaped') {
      return { record, resolved: false, reason: 'no-active-pursuit' };
    }
    const strength = clamp(finite(options.marineStrength, 50), 0, 100);
    const targetStrength = clamp(finite(options.targetStrength, 50), 0, 100);
    const support = clamp(finite(options.support, 0), 0, 100);
    const captureChance = clamp(
      50 + (strength - targetStrength) * 0.55 +
      finite(record.pursuit.pressure) * 0.25 + support * 0.2,
      5, 95
    );
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const captured = Number(random()) < captureChance / 100;
    const at = options.at || new Date().toISOString();
    const next = {
      ...record,
      status: captured ? 'captured' : 'escaped',
      pursuit: { ...record.pursuit, phase: captured ? 'captured' : 'escaped', resolvedAt: at, captureChance },
      updatedAt: at
    };
    return { record: next, resolved: true, captured, captureChance: Math.round(captureChance * 100) / 100 };
  }

  function getActivePursuits(force) {
    return Object.values((force && force.wantedRecords) || {})
      .filter(record => record && record.status === 'tracking' && record.pursuit)
      .sort((a, b) => b.bounty - a.bounty);
  }

  const api = Object.freeze({
    createMarineForce, registerWanted, evaluateSighting,
    advancePursuit, resolveEncounter, getActivePursuits
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceMarineSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
