'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = file => file.endsWith('.html') ? 'text/html; charset=utf-8' :
  file.endsWith('.js') ? 'text/javascript; charset=utf-8' :
  file.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/octet-stream';

async function main() {
  const server = http.createServer((req, res) => {
    const requested = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const pathname = requested === '/' ? '/index.html' : requested;
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'content-type': mime(file), 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }]) {
      const page = await browser.newPage({
        viewport,
        isMobile: viewport.width < 600,
        hasTouch: viewport.width < 1300
      });
      const pageErrors = [];
      const externalScriptRequests = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => {
        if (request.resourceType() === 'script') externalScriptRequests.push(request.url());
      });
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!window.OnePieceWorldSimulation && !!window.OnePieceSystemsReady);
      await page.waitForFunction(async () => await window.OnePieceSystemsReady === true);
      await page.waitForFunction(() => typeof WORLDS !== 'undefined' &&
        WORLDS.op.meets.filter(event => event.id.startsWith('op_eb_')).length === 4);
      assert.equal(await page.locator('button.world').count(), 1, 'only One Piece is offered in the world selector');
      assert.equal(await page.locator('button.world .wt').innerText(), 'วันพีซ');

      const starterMetadata = await page.evaluate(() => WORLDS.op.meets
        .filter(event => event.id.startsWith('op_eb_'))
        .map(event => ({ origin: event.origin, canonStatus: event.canonStatus })));
      assert.equal(starterMetadata.length, 4);
      assert.ok(starterMetadata.every(event => event.origin === 'original' && event.canonStatus === 'sandbox'));
      for (const globalName of [
        'OnePieceCharacterState', 'OnePieceNPCBrain', 'OnePieceEastBlueStarter', 'OnePieceCrewSystem',
        'OnePieceDevilFruitSystem', 'OnePieceHakiSystem', 'OnePieceProgressionSystem',
        'OnePieceMarineSystem', 'OnePieceMarineUI', 'OnePieceCombatAdapter'
      ]) {
        assert.ok(await page.evaluate(name => !!window[name], globalName), globalName + ' failed to load');
      }

      await page.locator('button.world').filter({ hasText: 'วันพีซ' }).click();
      await page.evaluate(() => localStorage.setItem('el-help', '1'));
      await page.locator('#startBtn').click();
      await page.locator('#game:not([hidden])').waitFor({ state: 'visible' });
      await page.locator('#extra-life-progression-tools .el-progression-trigger').waitFor({ state: 'visible' });
      await page.locator('#ptDetails summary').click();
      const beforePlaytest = await page.evaluate(() => ({ hp: S.st.hp, money: S.money, bounty: S.flags.bounty || 0 }));
      await page.locator('[data-pt-key="hp"][data-pt-delta="10"]').click();
      await page.locator('[data-pt-key="money"][data-pt-delta="10"]').click();
      await page.locator('[data-pt-key="bounty"][data-pt-delta="1000000"]').click();
      const afterPlaytest = await page.evaluate(() => ({ hp: S.st.hp, money: S.money, bounty: S.flags.bounty }));
      assert.equal(afterPlaytest.hp, Math.min(100, beforePlaytest.hp + 10));
      assert.equal(afterPlaytest.money, beforePlaytest.money + 10);
      assert.equal(afterPlaytest.bounty, beforePlaytest.bounty + 1000000);
      await page.evaluate(() => { window.__timingMash = miniGame('time', 'ทดสอบกดรัว', 'ทดสอบการเปลี่ยนระบบจับจังหวะ'); });
      await page.locator('#mg .mgb').waitFor({ state: 'visible' });
      assert.match(await page.locator('#mg .mgb').innerText(), /กดรัว/);
      assert.equal(await page.locator('#mg .mgz u').count(), 0, 'timing mode no longer renders a timing needle');
      await page.evaluate(() => { const button = document.querySelector('#mg .mgb'); for (let i = 0; i < 32; i++) button.click(); });
      assert.equal(await page.evaluate(() => window.__timingMash), 1, 'rapid pressing should reach the capped score');


      await page.evaluate(() => {
        S.powers = [...new Set([...(S.powers || []), 'haki_arm', 'df_para'])];
        S.flags = S.flags || {};
        S.flags.df = 'ผลโอโตะโอโตะ';
        S.flags.bounty = 20000000;
        S.job = { id: 'pcapt' };
        save();
      });

      await page.locator('#extra-life-progression-tools .el-progression-trigger').click();
      const progressionPanel = page.locator('#extra-life-progression-tools .el-progression-panel');
      await progressionPanel.waitFor({ state: 'visible' });
      await progressionPanel.getByRole('button', { name: /\+5 ฝึกฝน/ }).first().click();
      await progressionPanel.getByRole('button', { name: /\+5 ฝึกผลปีศาจ/ }).click();
      const progression = await page.evaluate(() => ({
        haki: S.haki.armament.mastery,
        fruit: S.devilFruit.mastery,
        fruitName: S.devilFruit.name
      }));
      assert.equal(progression.haki, 5);
      assert.equal(progression.fruit, 5);
      assert.equal(progression.fruitName, 'ผลโอโตะโอโตะ');
      await progressionPanel.getByRole('button', { name: 'ปิด' }).click();

      const marineWrap = page.locator('#extra-life-marine-tools');
      await marineWrap.waitFor({ state: 'attached' });
      await page.waitForFunction(() => {
        const node = document.getElementById('extra-life-marine-tools');
        return node && !node.hidden;
      });
      await marineWrap.locator('.el-marine-trigger').click();
      const marinePanel = marineWrap.locator('.el-marine-panel');
      await marinePanel.waitFor({ state: 'visible' });
      await marinePanel.getByRole('button', { name: /ตรวจสอบการลาดตระเวน/ }).click();
      assert.ok(await page.evaluate(() => !!S.marineActionAt?.actions?.patrol));

      const bounds = await page.evaluate(() => {
        const rect = selector => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        return {
          progression: rect('#extra-life-progression-tools .el-progression-panel'),
          marine: rect('#extra-life-marine-tools .el-marine-panel'),
          width: window.innerWidth
        };
      });
      for (const key of ['progression', 'marine']) {
        assert.ok(bounds[key].left >= -1, key + ' panel clipped on left');
        assert.ok(bounds[key].right <= bounds.width + 1, key + ' panel clipped on right');
      }

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#resumeBtn').waitFor({ state: 'visible' });
      await page.locator('#resumeBtn').click();
      await page.locator('#game:not([hidden])').waitFor({ state: 'visible' });
      const restored = await page.evaluate(() => ({
        world: S.world,
        haki: S.haki.armament.mastery,
        fruit: S.devilFruit.mastery,
        fruitName: S.devilFruit.name,
        bounty: S.flags.bounty,
        patrolUsed: !!S.marineActionAt?.actions?.patrol
      }));
      assert.equal(restored.world, 'op');
      assert.equal(restored.haki, 5);
      assert.equal(restored.fruit, 5);
      assert.equal(restored.fruitName, 'ผลโอโตะโอโตะ');
      assert.equal(restored.bounty, 20000000);
      assert.equal(restored.patrolUsed, true);

      await page.evaluate(() => {
        const now = S.year * 12 + (S.mo || 0);
        const force = S.marineForce || { wantedRecords: {} };
        const record = force.wantedRecords?.player || {
          targetId: 'player', name: S.name, bounty: S.flags.bounty,
          status: 'wanted', sightings: 1, confidence: 50
        };
        S.marineForce = {
          ...force,
          wantedRecords: {
            ...(force.wantedRecords || {}),
            player: { ...record, status: 'captured', pursuit: { phase: 'captured', progress: 100, pressure: 100 } }
          }
        };
        S.flags.jailUntil = now + 1;
        S.mo = (S.mo || 0) + 1;
        jailMonth();
        save();
      });
      await page.waitForFunction(() => {
        const node = document.getElementById('extra-life-marine-tools');
        return node && !node.hidden;
      });
      await page.locator('#extra-life-marine-tools .el-marine-trigger').click();
      const releasedPanel = page.locator('#extra-life-marine-tools .el-marine-panel');
      await releasedPanel.waitFor({ state: 'visible' });
      assert.match(await releasedPanel.innerText(), /สถานะ: มีประกาศจับ/);
      assert.doesNotMatch(await releasedPanel.innerText(), /สถานะ: ถูกจับกุม/);
      assert.equal(await page.evaluate(() => S.flags.jailUntil), 0);

      const eastBlueCatalog = await page.evaluate(() => {
        return TRAVEL.op.filter(destination => destination.origin === 'original').map(destination => ({
          name: destination.n,
          cost: destination.c,
          minAge: destination.min,
          canonStatus: destination.canonStatus,
          view: tripView({ k: destination.n, w: 'op' })
        }));
      });
      assert.deepEqual(eastBlueCatalog.map(destination => destination.name).sort(), [
        'ออเรนจ์ทาวน์', 'หมู่บ้านไซรัป', 'ภัตตาคารลอยทะเลบาราติเอ', 'หมู่บ้านโคโคยาชิ', 'โรเกทาวน์'
      ].sort());
      assert.ok(eastBlueCatalog.every(destination => destination.minAge === 12 &&
        destination.canonStatus === 'sandbox' && destination.view));
      const eastBlueNPCs = await page.evaluate(() => TRAVEL.op
        .filter(destination => destination.origin === 'original')
        .map(destination => {
          const npc = TNPC[destination.n]?.[0];
          const actions = tnpcActs(destination).acts;
          return {
            destination: destination.n,
            id: npc?.id,
            name: npc?.id ? CAST.op[npc.id] : null,
            origin: npc?.origin,
            canonStatus: npc?.canonStatus,
            talk: actions.some(action => action.l.startsWith('คุยกับ')),
            teach: actions.some(action => action.l.startsWith('ขอให้'))
          };
        }));
      assert.equal(eastBlueNPCs.length, 5);
      assert.ok(eastBlueNPCs.every(npc => npc.id && npc.name && npc.origin === 'original' &&
        npc.canonStatus === 'sandbox' && npc.talk && npc.teach));
      const npcEffect = await page.evaluate(() => {
        const destination = TRAVEL.op.find(item => item.n === 'ออเรนจ์ทาวน์');
        const npc = TNPC[destination.n][0];
        const actions = tnpcActs(destination).acts;
        const talk = actions.find(action => action.l.startsWith('คุยกับ'));
        const teach = actions.find(action => action.l.startsWith('ขอให้'));
        const beforeBond = S.bonds[npc.id] || 0;
        const beforeRide = S.sk.ride || 0;
        talk.f(S);
        teach.f(S);
        return { bond: S.bonds[npc.id] - beforeBond, ride: S.sk.ride - beforeRide };
      });
      assert.equal(npcEffect.bond, 9);
      assert.equal(npcEffect.ride, 3);

      const eastBlueGates = await page.evaluate(async () => {
        const destination = TRAVEL.op.find(item => item.n === 'ออเรนจ์ทาวน์');
        const originalAsk = ask;
        const old = { age: S.age, year: S.year, money: S.money, ft: S.ft, trip: S.trip, busy };
        const readAvailability = async () => {
          let selected;
          ask = async (title, text, choices) => {
            if (title === '✈ ท่องเที่ยว') selected = choices.find(choice => choice.l === destination.n);
          };
          await travelMenu();
          return !!selected?.ok;
        };
        try {
          S.trip = null;
          S.year = 1490;
          S.age = 11;
          S.money = 1000;
          S.ft = 2;
          busy = false;
          const tooYoung = await readAvailability();
          S.age = 12;
          S.money = destination.c - 1;
          const tooPoor = await readAvailability();
          S.money = destination.c;
          S.ft = 0;
          const noFreeTime = await readAvailability();
          S.ft = 1;
          const available = await readAvailability();
          return { tooYoung, tooPoor, noFreeTime, available };
        } finally {
          ask = originalAsk;
          Object.assign(S, old);
          busy = old.busy;
          save();
        }
      });
      assert.deepEqual(eastBlueGates, { tooYoung: false, tooPoor: false, noFreeTime: false, available: true });

      await page.evaluate(async () => {
        S.age = 18;
        S.year = 1550;
        S.mo = 1;
        S.place = 'foosha';
        S.money = 1000;
        S.ft = 2;
        S.ap = 0;
        S.job = null;
        S.partner = null;
        S.kids = [];
        S.trip = null;
        S.alive = true;
        busy = false;
        let sawTravelMenu = false;
        let sawArrival = false;
        const originalAsk = ask;
        ask = async (title, text, choices) => {
          if (title === '✈ ท่องเที่ยว') {
            sawTravelMenu = true;
            const destination = choices.find(choice => choice.l === 'ออเรนจ์ทาวน์');
            if (!destination || !destination.ok) throw new Error('Fish-Man Island travel option unavailable');
            destination.f();
            return;
          }
          if (title.startsWith('✈ ออเรนจ์ทาวน์')) {
            sawArrival = true;
            const photo = choices.find(choice => choice.l === 'ถ่ายรูปเก็บไว้เป็นที่ระลึก');
            if (!photo) throw new Error('Travel arrival choices missing');
            photo.f(S);
            return;
          }
          return originalAsk(title, text, choices);
        };
        try { await travelMenu(); } finally { ask = originalAsk; }
        if (!sawTravelMenu || !sawArrival || !S.trip) {
          throw new Error('Travel flow did not complete: menu=' + sawTravelMenu +
            ', arrival=' + sawArrival + ', alive=' + S.alive + ', busy=' + busy + ', world=' + W.id);
        }
        save();
      });
      const tripStarted = await page.evaluate(() => ({
        destination: S.trip?.k,
        world: S.trip?.w,
        homePlace: S.place,
        money: S.money,
        freeTime: S.ft
      }));
      assert.equal(tripStarted.destination, 'ออเรนจ์ทาวน์');
      assert.equal(tripStarted.world, 'op');
      assert.equal(tripStarted.homePlace, 'foosha', 'trip is stored separately from the home residence');
      assert.equal(tripStarted.money, 975);
      assert.equal(tripStarted.freeTime, 1);
      const travelPolicy = await page.evaluate(() => ({
        homeOnly: pickFrom([{ id: 'smoke-home-only', homeOnly: true, when: () => true }])?.id || null,
        travelSafe: pickFrom([{ id: 'smoke-travel-safe', homeOnly: true, travelOK: true, when: () => true }])?.id || null
      }));
      assert.equal(travelPolicy.homeOnly, null, 'home-only encounters must not fire while away');
      assert.equal(travelPolicy.travelSafe, 'smoke-travel-safe', 'explicit travel-safe encounters remain eligible');
      const persistenceDebug = await page.evaluate(() => {
        const serialized = JSON.stringify(S);
        const encoded = window.OnePieceSaveSystem.encode(S);
        const raw = localStorage.getItem('extra-life-v2');
        const backup = localStorage.getItem('extra-life-v2-backup');
        const parseTrip = value => {
          try { return value ? JSON.parse(value).trip?.k || null : null; } catch (error) { return 'invalid-json'; }
        };
        return {
          stateTrip: JSON.parse(serialized).trip?.k || null,
          encodedTrip: JSON.parse(encoded).trip?.k || null,
          primaryTrip: parseTrip(raw),
          backupTrip: parseTrip(backup),
          primaryDecode: window.OnePieceSaveSystem.decode(raw).reason || 'ok',
          backupDecode: window.OnePieceSaveSystem.decode(backup).reason || 'ok'
        };
      });
      console.log('travel persistence diagnostics', persistenceDebug);
      assert.equal(persistenceDebug.stateTrip, 'ออเรนจ์ทาวน์');
      assert.equal(persistenceDebug.encodedTrip, 'ออเรนจ์ทาวน์');
      assert.equal(persistenceDebug.primaryTrip, 'ออเรนจ์ทาวน์', 'save must persist the active trip before reload');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#resumeBtn').waitFor({ state: 'visible' });
      await page.locator('#resumeBtn').click();
      await page.locator('#game:not([hidden])').waitFor({ state: 'visible' });
      const tripRestored = await page.evaluate(() => ({
        destination: S.trip?.k,
        month: S.mo,
        money: S.money,
        saveMetadata: S._saveMeta
      }));
      assert.equal(tripRestored.saveMetadata, undefined, 'checksum metadata must not remain inside mutable game state');
      assert.equal(tripRestored.destination, 'ออเรนจ์ทาวน์');
      assert.equal(tripRestored.month, 1);
      assert.equal(tripRestored.money, 975);

      await page.evaluate(() => {
        // Test the extracted rent hook without advancing unrelated random story events.
        S.mo = 2;
        S.alive = true;
        S.flags.titan = 0;
        S.flags.jailUntil = 0;
        S.job = null;
        S.kids = [];
        AUTO.on = false;
        applyTravelMonthlyCharge();
        save();
      });
      const monthAdvanced = await page.evaluate(() => ({
        destination: S.trip?.k,
        month: S.mo,
        money: S.money
      }));
      assert.equal(monthAdvanced.destination, 'ออเรนจ์ทาวน์');
      assert.equal(monthAdvanced.month, 2);
      assert.equal(monthAdvanced.money, 972, 'monthly lodging cost is charged while away');

      await page.evaluate(() => { tripEnd(); save(); });
      assert.equal(await page.evaluate(() => S.trip), null);

      await page.evaluate(() => {
        S.alive = true;
        S.age = 18;
        S.job = null;
        setJob('pcapt');
        S.flags = S.flags || {};
        S.flags.bounty = 50000000;
        S.flags.crew = null;
        S.flags.shipName = null;
        S.money = 1000;
        S.own = S.own || { house: null, items: [] };
        S.own.items = [];
        S.crews = [];
        S.playerCrewId = null;
        S.npcs = [
          { id: 'crew-npc-1', n: 'ต้นหนทดสอบ', d: 'นักเดินเรือ', alive: true },
          { id: 'crew-npc-2', n: 'ช่างเรือทดสอบ', d: 'ช่างฝีมือ', alive: true }
        ];
        busy = false;
        save();
      });
      await page.waitForFunction(() => {
        const tools = document.getElementById('extra-life-crew-tools');
        return !!tools && !tools.hidden;
      });
      await page.locator('#extra-life-crew-tools .el-crew-trigger').click();
      await page.locator('#extra-life-crew-tools input[aria-label="ชื่อกลุ่มโจรสลัด"]').fill('กลุ่มทดสอบอีสต์บลู');
      await page.locator('#extra-life-crew-tools .el-crew-form button').click();
      await page.waitForFunction(() => !!S.playerCrewId && S.crews.some(crew => crew.id === S.playerCrewId));
      await page.locator('#extra-life-crew-tools button').filter({ hasText: 'ซื้อเรือใบลำเล็ก' }).click();
      await page.locator('#extra-life-crew-tools input[aria-label="ชื่อเรือ"]').fill('เรือทดสอบ');
      await page.getByRole('button', { name: 'บันทึกเรือ' }).click();
      const candidateRow = page.locator('#extra-life-crew-tools .el-crew-row').filter({ hasText: 'ต้นหนทดสอบ' });
      await candidateRow.locator('select[aria-label="ตำแหน่งของ ต้นหนทดสอบ"]').selectOption('navigator');
      await candidateRow.getByRole('button', { name: 'ชวนเข้ากลุ่ม' }).click();
      await page.locator('#extra-life-crew-tools select[aria-label="เปลี่ยนตำแหน่งของ ต้นหนทดสอบ"]').selectOption('swordsman');
      const crewPanelBox = await page.locator('#extra-life-crew-tools .el-crew-panel').boundingBox();
      assert.ok(crewPanelBox && crewPanelBox.x >= 0 && crewPanelBox.y >= 0 &&
        crewPanelBox.x + crewPanelBox.width <= viewport.width &&
        crewPanelBox.y + crewPanelBox.height <= viewport.height,
        'crew panel must remain inside the phone/tablet viewport');
      await page.evaluate(() => save());
      const crewBeforeReload = await page.evaluate(() => {
        const crew = S.crews.find(item => item.id === S.playerCrewId);
        return {
          name: crew?.name,
          shipName: crew?.shipName,
          ownsBoat: S.own.items.includes('boat'),
          members: crew?.members.map(member => ({ id: member.characterId, role: member.role }))
        };
      });
      assert.equal(crewBeforeReload.name, 'กลุ่มทดสอบอีสต์บลู');
      assert.equal(crewBeforeReload.shipName, 'เรือทดสอบ');
      assert.equal(crewBeforeReload.ownsBoat, true);
      assert.ok(crewBeforeReload.members.some(member => member.id === 'crew-npc-1' && member.role === 'swordsman'));

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#resumeBtn').waitFor({ state: 'visible' });
      await page.locator('#resumeBtn').click();
      await page.locator('#game:not([hidden])').waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const tools = document.getElementById('extra-life-crew-tools');
        return !!tools && !tools.hidden;
      });
      const crewAfterReload = await page.evaluate(() => {
        const crew = S.crews.find(item => item.id === S.playerCrewId);
        return {
          name: crew?.name,
          shipName: crew?.shipName,
          ownsBoat: S.own.items.includes('boat'),
          members: crew?.members.map(member => ({ id: member.characterId, role: member.role }))
        };
      });
      assert.deepEqual(crewAfterReload, crewBeforeReload);
      assert.deepEqual(externalScriptRequests, [], 'single-file HTML must not request external JavaScript');
      assert.deepEqual(pageErrors, [], 'browser page errors: ' + pageErrors.join('; '));
      await page.close();
      process.stdout.write('PASS phone/tablet smoke at ' + viewport.width + 'x' + viewport.height + '\n');
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
