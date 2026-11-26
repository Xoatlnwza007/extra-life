/* One Piece Life Simulator — player-facing Marine wanted/pursuit panel.
 * UI adapter only. Marine rules remain in marine-system.js; game state/save belong to the host.
 */
(function (root) {
  'use strict';

  const STYLE_ID = 'extra-life-marine-tools';
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function getPlayerState(host = root) {
    const state = host && host.S;
    return state && state.world === 'op' && state.alive ? state : null;
  }

  function getBounty(state) {
    return Math.max(0, Math.floor(finite(state && state.flags && state.flags.bounty)));
  }

  function getMarineForce(state, api, at) {
    if (!state || !api) return null;
    let force = state.marineForce;
    if (!force || !force.wantedRecords) {
      force = api.createMarineForce({
        id: 'east-blue-marine-command',
        name: 'กองกำลังนาวิกโยธินประจำพื้นที่',
        base: state.place || null,
        strength: 48,
        intelligence: 38,
        alertness: 42,
        updatedAt: at
      });
    }
    const bounty = getBounty(state);
    if (bounty <= 0) {
      state.marineForce = force;
      return force;
    }
    const registered = api.registerWanted(force, {
      id: 'player',
      name: state.name || state.n || 'โจรสลัดนิรนาม',
      bounty,
      notoriety: finite(state.fame, finite(state.flags && state.flags.fame)),
      location: state.place || null
    }, { at });
    state.marineForce = registered.force;
    return registered.force;
  }

  function getMarineControlsStyles() {
    return `
      #${STYLE_ID}{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:2147481998;font:14px/1.45 system-ui,sans-serif;color:#18211c;max-width:calc(100vw - 24px)}
      #${STYLE_ID} button{font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border:1px solid #aab5aa;border-radius:10px;min-width:48px;min-height:48px;padding:10px 13px;background:#f5f7f2;color:#18211c}
      #${STYLE_ID} .el-marine-trigger{background:#713b32;color:#fff;border-color:#713b32;font-weight:700}
      #${STYLE_ID} .el-marine-panel{display:none;width:min(340px,calc(100vw - 24px));max-height:calc(100dvh - 120px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));overflow:auto;overscroll-behavior:contain;margin-bottom:8px;padding:12px;background:#f5f7f2;border:1px solid #c5b4a8;border-radius:14px;box-shadow:0 5px 24px #0003}
      #${STYLE_ID}[data-open="true"] .el-marine-panel{display:grid;gap:9px}
      #${STYLE_ID} .el-marine-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #ded8d3}
      #${STYLE_ID} .el-marine-muted{font-size:12px;color:#59615c;margin:0;overflow-wrap:anywhere}
      #${STYLE_ID} .el-marine-status{font-size:12px;min-height:1.4em;color:#713b32;margin:0;overflow-wrap:anywhere}
      @media(max-width:480px){#${STYLE_ID}{right:max(8px,env(safe-area-inset-right,0px));bottom:calc(78px + env(safe-area-inset-bottom,0px))}#${STYLE_ID} .el-marine-panel{width:min(320px,calc(100vw - 16px))}}
      @media(max-height:520px) and (orientation:landscape){#${STYLE_ID} .el-marine-panel{max-height:calc(100dvh - 96px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}}
    `;
  }

  function installMarineControls(host = root) {
    const doc = host && host.document;
    const api = host && host.OnePieceMarineSystem;
    if (!doc || !doc.body || !doc.createElement || !api) return false;
    if (doc.getElementById(STYLE_ID)) return true;

    const style = doc.createElement('style');
    style.textContent = getMarineControlsStyles();
    if (doc.head) doc.head.appendChild(style);
    const wrap = doc.createElement('div');
    wrap.id = STYLE_ID;
    wrap.hidden = true;
    const panel = doc.createElement('section');
    panel.className = 'el-marine-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'ประกาศจับและการติดตามของกองทัพเรือ');
    const title = doc.createElement('strong');
    title.textContent = 'ประกาศจับ / กองทัพเรือ';
    const body = doc.createElement('div');
    const status = doc.createElement('p');
    status.className = 'el-marine-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const close = doc.createElement('button');
    close.type = 'button';
    close.textContent = 'ปิด';
    panel.appendChild(title);
    panel.appendChild(body);
    panel.appendChild(status);
    panel.appendChild(close);
    const trigger = doc.createElement('button');
    trigger.type = 'button';
    trigger.className = 'el-marine-trigger';
    trigger.textContent = 'กองทัพเรือ';
    trigger.setAttribute('aria-expanded', 'false');
    wrap.appendChild(panel);
    wrap.appendChild(trigger);
    doc.body.appendChild(wrap);

    const make = (tag, value, className) => {
      const node = doc.createElement(tag);
      if (value !== undefined) node.textContent = value;
      if (className) node.className = className;
      return node;
    };
    const setStatus = value => { status.textContent = value; };
    const persist = () => {
      if (typeof host.save === 'function') host.save();
    };
    const currentPeriod = state => String(finite(state.year)) + ':' + String(finite(state.mo));
    const actionAvailable = (state, action) =>
      !state.marineActionAt || state.marineActionAt.period !== currentPeriod(state) ||
      state.marineActionAt.action !== action;

    function render() {
      const state = getPlayerState(host);
      if (!state) return;
      body.replaceChildren();
      const bounty = getBounty(state);
      const now = new Date().toISOString();
      let force = getMarineForce(state, api, now);
      let record = force.wantedRecords && force.wantedRecords.player;
      const gameMonth = finite(state.year) * 12 + finite(state.mo);
      if (record && record.status === 'captured' && finite(state.flags && state.flags.jailUntil) <= gameMonth) {
        record = { ...record, status: 'wanted', pursuit: null, confidence: Math.max(0, finite(record.confidence) - 15) };
        force = { ...force, wantedRecords: { ...force.wantedRecords, player: record }, updatedAt: now };
        state.marineForce = force;
      }
      if (!bounty) {
        body.appendChild(make('p', 'ขณะนี้ยังไม่มีค่าหัว กองทัพเรือจึงยังไม่มีประกาศจับของคุณ', 'el-marine-muted'));
        return;
      }
      body.appendChild(make('p', 'ค่าหัว ' + bounty.toLocaleString('th-TH') + ' เบรี', 'el-marine-row'));
      body.appendChild(make('p', 'สถานะ: ' + (record && record.status === 'tracking' ? 'กำลังติดตาม' : record && record.status === 'captured' ? 'ถูกจับกุม' : 'มีประกาศจับ'), 'el-marine-muted'));
      if (record && record.lastKnownLocation) {
        body.appendChild(make('p', 'พบเบาะแสล่าสุด: ' + record.lastKnownLocation, 'el-marine-muted'));
      }
      if (record && record.pursuit) {
        body.appendChild(make('p', 'การไล่ล่า: ' + record.pursuit.phase + ' · ความคืบหน้า ' + Math.round(record.pursuit.progress) + '% · แรงกดดัน ' + Math.round(record.pursuit.pressure), 'el-marine-muted'));
      }
      const check = make('button', actionAvailable(state, 'patrol') ? 'ตรวจสอบการลาดตระเวน' : 'ตรวจลาดตระเวนแล้วในเดือนนี้');
      check.disabled = !actionAvailable(state, 'patrol') || (record && record.status === 'captured');
      check.addEventListener('click', () => {
        if (!actionAvailable(state, 'patrol')) return setStatus('ตรวจสอบการลาดตระเวนได้อีกครั้งในเดือนเกมถัดไป');
        const result = api.evaluateSighting(force, {
          id: 'player',
          name: state.name || state.n || 'โจรสลัดนิรนาม',
          bounty,
          notoriety: finite(state.fame, finite(state.flags && state.flags.fame)),
          location: state.place || null
        }, { location: state.place || null, cover: 42, distance: 35, at: now });
        state.marineForce = result.force;
        state.marineActionAt = { period: currentPeriod(state), action: 'patrol' };
        persist();
        setStatus(result.detected ? 'หน่วยลาดตระเวนพบเบาะแส! เริ่มติดตามตัวคุณแล้ว' : 'ยังไม่พบคุณ แต่ประกาศจับยังคงอยู่');
        render();
      });
      body.appendChild(check);

      if (record && record.status === 'tracking' && record.pursuit) {
        const confront = make('button', actionAvailable(state, 'confront') ? 'เผชิญหน้าหน่วยไล่ล่า' : 'เผชิญหน้าแล้วในเดือนนี้');
        confront.disabled = !actionAvailable(state, 'confront');
        confront.addEventListener('click', () => {
          if (!actionAvailable(state, 'confront')) return setStatus('เผชิญหน้าหน่วยไล่ล่าได้อีกครั้งในเดือนเกมถัดไป');
          const fit = finite(state.st && state.st.fit, 40);
          const hakiMastery = Object.values(state.haki || {}).reduce((sum, item) => sum + finite(item && item.mastery), 0);
          const fruitMastery = finite(state.devilFruit && state.devilFruit.mastery);
          const targetStrength = Math.max(20, Math.min(100, 35 + fit * 0.45 + hakiMastery * 0.1 + fruitMastery * 0.05));
          const crew = (state.crews || []).find(item => item && item.id === state.playerCrewId && item.status === 'active');
          const support = Math.min(25, Math.max(0, ((crew && crew.members) || []).length - 1) * 5);
          const result = api.resolveEncounter(record, {
            marineStrength: force.strength,
            targetStrength,
            support,
            at: now
          });
          if (!result.resolved) return setStatus('ไม่มีการเผชิญหน้าที่กำลังดำเนินอยู่');
          const next = result.record;
          state.marineForce = {
            ...force,
            wantedRecords: { ...force.wantedRecords, player: next },
            updatedAt: now
          };
          state.marineActionAt = { period: currentPeriod(state), action: 'confront' };
          if (result.captured) {
            const years = bounty >= 100000000 ? 3 : bounty >= 10000000 ? 2 : 1;
            state.flags.jailUntil = gameMonth + years * 12;
            state.job = null;
            state.rent = null;
            state.heat = 0;
            if (typeof host.say === 'function') host.say('กองทัพเรือจับกุมคุณได้ คุณถูกส่งตัวไปคุมขัง', 'bad');
            if (typeof host.remember === 'function') host.remember('ถูกกองทัพเรือจับกุม', 'โทษจำคุก ' + years + ' ปี', 'grief', 3);
            setStatus('ถูกจับกุมแล้ว · จำคุก ' + years + ' ปี');
          } else {
            if (typeof host.say === 'function') host.say('คุณฝ่าวงล้อมของกองทัพเรือและหลบหนีไปได้', 'good');
            setStatus('คุณหลบหนีจากการเผชิญหน้าได้ แต่ค่าหัวยังคงอยู่');
          }
          persist();
          render();
        });
        body.appendChild(confront);
        const evade = make('button', actionAvailable(state, 'evade') ? 'หลบซ่อนและตัดร่องรอย' : 'หลบหนีแล้วในเดือนนี้');
        evade.disabled = !actionAvailable(state, 'evade');
        evade.addEventListener('click', () => {
          if (!actionAvailable(state, 'evade')) return setStatus('พยายามหลบหนีได้อีกครั้งในเดือนเกมถัดไป');
          const result = api.advancePursuit(record, {
            evidence: 0,
            targetMovement: 92,
            resources: 35,
            at: now
          });
          if (result.advanced) {
            const next = result.progress <= 0 ? {
              ...result.record,
              status: 'wanted',
              pursuit: null,
              confidence: Math.max(0, result.record.confidence - 15)
            } : result.record;
            state.marineForce = {
              ...force,
              wantedRecords: { ...force.wantedRecords, player: next },
              updatedAt: now
            };
            state.marineActionAt = { period: currentPeriod(state), action: 'evade' };
            persist();
            setStatus(result.progress <= 0 ? 'คุณหลุดจากการติดตามชั่วคราว แต่ประกาศจับยังไม่ถูกยกเลิก' : 'คุณตัดร่องรอยบางส่วนได้ แต่การไล่ล่ายังไม่สิ้นสุด');
            render();
          }
        });
        body.appendChild(evade);
      }
      body.appendChild(make('p', 'การกระทำแต่ละแบบทำได้หนึ่งครั้งต่อเดือนเกม · การหลบหนีไม่ลบค่าหัว', 'el-marine-muted'));
    }

    trigger.addEventListener('click', () => {
      const open = wrap.getAttribute('data-open') !== 'true';
      wrap.setAttribute('data-open', String(open));
      trigger.setAttribute('aria-expanded', String(open));
      if (open) render();
    });
    close.addEventListener('click', () => {
      wrap.setAttribute('data-open', 'false');
      trigger.setAttribute('aria-expanded', 'false');
    });
    const syncVisibility = () => {
      const visible = !!getPlayerState(host) && getBounty(getPlayerState(host)) > 0;
      wrap.hidden = !visible;
      if (!visible) {
        wrap.setAttribute('data-open', 'false');
        trigger.setAttribute('aria-expanded', 'false');
      } else if (wrap.getAttribute('data-open') === 'true') render();
    };
    syncVisibility();
    if (typeof host.setInterval === 'function') {
      host.__onePieceMarineUiTimer = host.setInterval(syncVisibility, 1000);
    }
    return true;
  }

  function scheduleMarineControls(host = root) {
    if (!host || !host.document) return false;
    const install = () => installMarineControls(host);
    if (host.document.readyState === 'loading') {
      host.document.addEventListener('DOMContentLoaded', install, { once: true });
      return true;
    }
    return install();
  }

  const api = Object.freeze({ getPlayerState, getBounty, getMarineForce, getMarineControlsStyles, installMarineControls, scheduleMarineControls });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceMarineUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
