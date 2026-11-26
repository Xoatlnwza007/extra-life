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

  function findCrewForMember(crews, characterId) {
    const id = String(characterId);
    return (crews || []).find(crew => crew.status === 'active' && (crew.members || []).some(member => member.characterId === id)) || null;
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

  const api = Object.freeze({ DEFAULT_ROLES, createCrew, joinCrew, leaveCrew, setMemberRole, transferCaptaincy, addBounty, findCrewForMember, disbandCrew });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceCrewSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
