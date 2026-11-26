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
    for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
      const page = await browser.newPage({
        viewport,
        isMobile: viewport.width < 600,
        hasTouch: viewport.width < 600
      });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!window.OnePieceWorldSimulation && !!window.OnePieceSystemsReady);
      await page.waitForFunction(async () => await window.OnePieceSystemsReady === true);
      for (const globalName of [
        'OnePieceCharacterState', 'OnePieceNPCBrain', 'OnePieceCrewSystem',
        'OnePieceDevilFruitSystem', 'OnePieceHakiSystem', 'OnePieceProgressionSystem',
        'OnePieceMarineSystem', 'OnePieceMarineUI', 'OnePieceCombatAdapter'
      ]) {
        assert.ok(await page.evaluate(name => !!window[name], globalName), globalName + ' failed to load');
      }

      await page.locator('button.world').filter({ hasText: 'วันพีซ' }).click();
      await page.locator('#startBtn').click();
      await page.locator('#game:not([hidden])').waitFor({ state: 'visible' });
      await page.locator('#extra-life-progression-tools .el-progression-trigger').waitFor({ state: 'visible' });

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
