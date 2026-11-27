# PROJECT STATE — Extra Life / One Piece Simulator

> **Read this file first at the start of every new ChatGPT session or AI coding session.**
> This is the persistent project handoff and current source of truth. Update it after every meaningful implementation, test, merge, or plan change.

Last updated: 2026-11-26 (UTC; handoff refreshed after verification)
Repository: https://github.com/Xoatlnwza007/extra-life
Primary branch: `main`
Project goal: make the One Piece life simulator genuinely playable as quickly as possible, prioritizing Android phones and tablets.

## 1. Operating instructions for the next session

1. Read this file completely before planning or editing.
2. Inspect the live GitHub refs and the latest commits on `main`; never assume the SHAs below are still current.
3. Check the current working tree/branch and latest CI before changing code.
4. Work as the **sole engineering owner** unless the repository owner explicitly changes this instruction. The repository owner has authorized direct work on `main`; no AI-agent approval or PR approval is required for ordinary implementation.
5. Preserve user work. Do not force-push, rewrite history, or discard changes. Make small, reviewable commits.
6. Do not claim a test, browser session, or Android/tablet device check unless it was actually run. Record exact commands and outcomes.
7. After every meaningful task, update this file with changed files, commit SHA, tests, known gaps, and the next concrete task.
8. Prefer small isolated modules and existing engine hooks. Avoid editing the large root `index.html` unless no safe integration point exists; if required, make the smallest possible change and test it.
9. Canon accuracy matters: do not invent manga-canon facts. Label original/sandbox scenarios clearly and keep unverified encounters out of canon-guarded progression.
10. AI collaboration notes are supporting history only. They must not override the current owner instructions in this file.

## 2. Ownership and authority

- **Engineering:** ChatGPT is the primary/sole engineering implementer: architecture, gameplay systems, adapters, combat, progression, crew/NPC simulation, save compatibility, UI, mobile/tablet UX, tests, integration and technical documentation.
- **Narrative research:** may use other AI outputs as optional research/content input, but they are not a dependency or approval gate. Verify canon-sensitive claims and preserve citations/source references.
- **Repository owner:** sets product direction and retains final product/release decisions. The owner has explicitly authorized ChatGPT to modify `main` directly.
- **Branch policy:** `main` is an authorized implementation target. Use task branches only when a change is unusually risky or benefits from isolation; do not create process overhead for routine work.

## 3. Product requirements

- Deliver a playable One Piece life-simulation experience, not just standalone helper APIs.
- Prioritize Android phones and tablets; desktop support is secondary.
- Keep the existing multi-world game stable. One Piece-specific changes must not leak into other anime worlds.
- Reuse the current game state, save/load, time, event, combat and UI systems instead of creating parallel engines.
- Make systems visible and usable in gameplay: progression, crew, Marine pursuit, story events, travel/world interactions and consequences.
- Preserve compatibility with existing saves wherever practical; migrations must be deterministic and tested.
- Use touch-friendly controls, safe-area spacing, responsive panels, and layouts that avoid overlap.
- Keep the game fast to load and usable on mobile browsers.

## 4. Repository facts and last verified Git state

These are historical checkpoints from 2026-11-26. Re-fetch before relying on them.

- `main` before this handoff update: `d527b577ae615e5b1aff915a0138b8ebe50deec2`.
- `one-piece-development`: `1868635836b74a31960e948300aea9f76a704c7e`.
- `ai-b/gameplay-integration`: `0fe3aa0a6d23675746f6e4e55e61f7f914fd3226`.
- `ai-collab/message-board`: `2b7c623a5077dc2cd5bd8058e5ceb3b80215c617`.
- PR #1 (`ai-b/gameplay-integration` → `one-piece-development`) was open, draft, mergeable, not merged at last check. It contains the completed systems listed below. Its base is not `main`; do not assume it can be merged cleanly or that its commits are already in `main`.
- GitHub Actions run `45857172789` passed 70 tests on `0fe3aa0a6d23675746f6e4e55e61f7f914fd3226`. This is not evidence that current `main` passes; run CI against the current target after integrating code.

## 5. Existing engineering work on the feature branch (not yet confirmed on main)

The following was implemented on `ai-b/gameplay-integration` and verified by the 70-test run above. Before reusing or porting it, inspect the current `main` source and compare each module; do not blindly merge the divergent branch.

- Haki / Devil Fruit progression UI: syncs Haki unlocks from existing flags; +5 yearly training per unlocked discipline; fruit mastery training and awakening at 80; state persists through existing save flow.
- Legacy Devil Fruit migration: converts old `S.flags.df` and `df_para/df_zoan/df_logia` flags into a deterministic `S.devilFruit` record without granting a fruit to characters who do not already have one.
- Roger-era content integration: deferred, idempotent loader registers eight event IDs from `ai/roger-era-content.js` into the existing OP event collection and includes a 1475-era preset. Canon status/schedule review remains necessary; direct meetings/alliance/recruitment must be marked original/sandbox or needs-review unless verified.
- Marine wanted/pursuit UI: patrol detection, evasion, confrontation and capture connected to existing prison state; monthly action locks; location privacy until confirmed sighting.
- Active player-crew combat support: up to four living non-player members add +1% outgoing damage and +0.5% incoming-damage reduction each, only for the selected active crew that contains the player.
- Mobile floating panel layout: Crew, progression and Marine controls use distinct anchors, touch targets and safe-area spacing.
- Automated tests cover these features, but no real Android/iPad device test has been reported.

## 6. Known gaps and risks

Treat these as open until verified against current `main`.

- The completed feature branch is based on `one-piece-development`, while `main` is a separate historical line. First determine whether the modules and their dependencies are already present on `main`; selectively port/reimplement compatible changes rather than merging blindly.
- No real Android phone or tablet verification has been performed.
- East Blue civilian starter content pack was still outstanding at the last collaboration-board check.
- Roger-era content needs explicit canon/original/sandbox metadata and sourced schedule constraints.
- Crew diplomacy and crew-vs-crew encounters are helper-level capabilities; they are not yet a complete player-facing rival-crew gameplay loop.
- Roger recruitment currently sets story flags; it does not safely create actual membership in Roger's crew. Do not add the player to Roger's roster without designing correct player-crew ownership and state-sync semantics.
- Marine location-specific patrol rosters, trial/court flow and richer faction simulation remain unimplemented.
- Devil Fruit sea weakness helper exists, but do not penalize merely because `S.place === 'sea'`; a character aboard a ship is not necessarily immersed/exposed to seawater.
- Avoid claiming full end-to-end gameplay based only on isolated unit tests.

## 7. Roadmap — execute in this order

### P0 — Establish a safe playable baseline on main
- [x] Inspect `main` tree, game bootstrap, One Piece world registration, save/load, time progression, event execution and test setup.
- [x] Compare feature-branch modules against `main`; identify missing files, API mismatches and dependencies.
- [x] Establish a Node test harness on `main` (no prior test suite existed there) and record the passing baseline.
- [x] Port and wire the core low-risk modules: NPC state/brain, event adapter, crew, Devil Fruit, Haki, progression, Marine intelligence/UI and combat adapter.
- [x] Add CI so One Piece module tests run for `main` pushes and pull requests.
- [x] Update this file after each completed slice.

### P1 — Make a coherent One Piece playable loop
- [ ] Verify character creation / era selection / birth year / age progression for One Piece.
- [ ] Connect story events to the actual world clock, place prerequisites, age gates, once-only flags, choices and consequences.
- [ ] Ensure journal/memory/news hooks use existing game systems.
- [ ] Deliver a small East Blue civilian starter sequence first; use sourced canon facts and clearly labelled original NPCs/events.
- [ ] Connect travel/island visits to actual location and time state, not decorative UI only.
- [ ] Verify save → reload → continue for all newly introduced state.

### P2 — Core pirate gameplay
- [ ] Complete crew gameplay: recruit, roles, ship ownership, crew growth, rival crews, diplomacy and encounters; ensure only the player's selected crew receives player synchronization.
- [ ] Complete combat loop: player stats, Haki, Devil Fruit mastery, crew support, enemy scaling, defeat/injury/death consequences and rewards.
- [ ] Ensure Devil Fruit water/Seastone weakness triggers only from explicit exposure context.
- [ ] Make bounty, fame, reputation and Marine pursuit respond to player actions and persist coherently.

### P3 — World simulation and narrative depth
- [ ] Build region-specific Marine patrols, faction relations, intelligence, pursuit escalation and court/prison outcomes.
- [ ] Expand East Blue into a sequence of islands, NPCs, events, jobs, shops and meaningful choices.
- [ ] Integrate Roger-era and other timeline packs with canon status, date windows and source references.
- [ ] Add rival pirate crews, world news and consequences that continue while the player ages/travels.

### P4 — Mobile/tablet release quality
- [ ] Test at representative phone and tablet viewport sizes, portrait and landscape.
- [ ] Test touch targets, safe areas, keyboard behavior, scrolling, panel collisions, dialogs and long text.
- [ ] Profile startup, event tick and rendering performance on mobile browsers.
- [ ] Run a real Android browser test when an actual device/browser session is available; record device/browser/viewport and findings.
- [ ] Add regression tests for every bug found.

## 8. Definition of playable

Do not call the project playable-complete until a new/existing player can:
1. Start a One Piece life in a selectable, valid era.
2. Age and advance time without breaking save state.
3. Visit/experience locations and trigger meaningful events.
4. Make choices that persist and change skills, relationships, resources, crew or story flags.
5. Progress through pirate/Marine/civilian paths with coherent consequences.
6. Fight using supported stats/powers and receive consistent outcomes.
7. Save, reload and continue without losing or duplicating progress.
8. Use the main gameplay flows on a phone and tablet without blocked controls or overlapping panels.

## 9. Session handoff log

### 2026-11-26 — Initial persistent handoff
- Owner authorized direct edits to `main` and asked that plans/progress survive new chats.
- Existing feature branch and PR #1 inspected; PR remains draft and targets `one-piece-development`, not `main`.
- Prior feature branch CI evidence: 70 passed, 0 failed.
- Next action: inspect current `main` code and tests, then establish baseline and selectively port the safest completed feature slice.


## 10. Verified main baseline after handoff setup

- Current `main` HEAD after documentation commits and baseline update: `519cb3046b71e987f2b4a8333706ea4ac8fd3c52`.
- Root listing at that checkpoint: `README.md`, `PROJECT_STATE.md`, `about/`, `ai/`, and `index.html`.
- The `ai/` directory on `main` contains only `ai/world-simulation.js` (blob `ad9d8ab28d1d53cde5838aaa1944f561079656ca`) at the time inspected.
- `package.json`, `tests/`, `.github/workflows/test-ai.yml`, and `AI_COLLAB/` were not present on `main` at the time inspected. Do not assume the 70-test feature-branch suite exists or runs on main.
- The main world-simulation module contains existing One Piece NPC profile and population simulation logic. Its yearly game boundary internally advances 12 logical monthly population ticks; it writes `npcSimulationCalendar` onto the live state for persistence.
- **Baseline test status:** not yet run. No root package manifest or test directory was found in the inspected main tree. Before porting features, inspect the rest of `index.html` for script loading and existing game hooks, then establish the smallest reproducible test harness without destabilizing the game.
- **Immediate next task refined:** inspect `index.html` bootstrap and relevant One Piece state/save/event/combat/UI hooks; map the feature-branch modules to those actual main hooks. Then add a minimal automated test setup for isolated modules and begin selective porting. No gameplay code has been changed on main in this handoff setup.

- Collaboration board HEAD after replacing obsolete ownership instructions: `12d4ebf9ca3e918083eb5ab952301117bc600f0c`.
- Handoff verification: root `PROJECT_STATE.md` exists on `main`; `AI_COLLAB/START_HERE.md` points every future session to it first. The branch refs were re-fetched after writes and matched these SHAs.


## 11. Development log — 2026-11-26 (main integration slice)

### Repository changes
- Added the missing modular runtime files under `ai/`: `decision-engine.js`, `character-state.js`, `npc-brain.js`, `event-adapter.js`, `crew-system.js`, `devil-fruit-system.js`, `haki-system.js`, `progression-system.js`, `marine-system.js`, `combat-adapter.js`, and `marine-ui.js`. Sources were selectively ported from the previously tested engineering branch after inspecting the main runtime's expected globals.
- Updated `ai/world-simulation.js` to load all 11 companion modules in dependency order: decision engine → character state → NPC brain → event adapter → crew → Devil Fruit → Haki → progression → Marine rules → combat adapter → Marine UI.
- Added Marine UI scheduling after the companion load completes.
- Ported the full player-facing progression panel: yearly +5 training actions for unlocked Haki and existing Devil Fruit users, awakening at 80 mastery, and deterministic migration of legacy Devil Fruit flags into a progression record. Training actions are limited once per game year and saved through the existing game save function.
- Separated the floating progression panel from the crew panel using mobile-safe offsets.
- Added `<script src="./ai/world-simulation.js"></script>` after the game's existing inline script in `index.html`.
- Connected One Piece NPC population simulation to the existing `nextYear()` flow. Each yearly advance simulates nearby living canon cast entries from `castNear(S)`, persists NPC profiles/calendar on `S`, and adds at most one background activity line to the current log. Sea-danger context is true only when `S.place === 'sea'`.
- Connected the existing battle damage hooks to `OnePieceCombatAdapter` for One Piece only. Other anime worlds retain their existing modifiers.
- Added `tests/ai.test.js` with 15 tests and `.github/workflows/test-ai.yml` targeting `main` pushes and PRs.

### Verification
- Latest verified `main` HEAD at this checkpoint: `c7546054efc008a31d03bb89466d43445bd66402`.
- GitHub Actions run: `45862044639` — **15 passed, 0 failed, 0 skipped**.
- Automated tests cover companion load order, NPC state/decisions, crew membership, fruit constraints and explicit water exposure, Haki progression, progression coordinator, Marine detection, One Piece-only combat modifiers, versioned save round-trip, twelve-month NPC calendar, mobile panel offsets, runtime script insertion, combat/NPC loop wiring, legacy fruit migration, and once-per-year training.
- The first attempt to transplant the progression UI omitted the existing crew scheduler; CI caught the missing function. The scheduler was restored and the latest run is green.
- No browser runtime session, real Android phone, or tablet has been tested. The CI tests execute under Node.js and inspect the HTML wiring; they are not a substitute for a browser/device test.

### Remaining limitations / next work
- The One Piece event adapter is loaded but not yet connected to a concrete in-game NPC/event choice flow.
- Marine UI and capture logic are loaded; verify the full panel interactions in a browser and test jail/sentence expiry against the existing game functions.
- Verify end-to-end save/reload in a real browser, including backup recovery and the timing of the runtime script relative to the game's initial resume check.
- Verify that nearby cast selection and background NPC simulation produce sensible volume and do not create excessive log noise over long saves.
- Next concrete engineering task: build a browser-level smoke test for the actual bootstrap and progression/Marine panels; then tighten the event adapter integration and verify save/reload behavior.


## 12. Browser verification — 2026-11-26

- Added `tests/browser-smoke.js` and a second GitHub Actions job that installs Playwright/Chromium on Ubuntu 24.04 (pinned because the then-current `ubuntu-latest` image was Ubuntu 26.04, unsupported by the pinned Playwright version).
- The smoke test serves the real repository files over HTTP, launches Chromium, starts a One Piece life, waits for all companion modules, exercises Haki and legacy Devil Fruit migration/training, opens the Marine panel and checks patrol action persistence, and verifies panel bounds at two touch-oriented viewports.
- First browser attempt found a test-server root mapping bug (fixed by mapping `/` to `index.html`). Second attempt found the progression panel intercepts the Marine trigger while left open; the smoke flow now closes the first panel before opening the second, reflecting one-panel-at-a-time use.
- Latest browser workflow run: `45863621411`.
  - Node module tests: success.
  - Chromium browser smoke: success.
  - Verified viewports: **390×844 phone** and **820×1180 tablet**.
  - No browser page errors were reported by the smoke test.
- This is automated headless Chromium verification at phone/tablet viewport sizes, not a physical Android/iPad device test.
- Current `main` HEAD at this checkpoint: `6255909a6f5ddc034ace0a2378cf28284c77357e`.
- Next: strengthen save/reload and jail-expiry integration tests, then build the first coherent East Blue story loop with original content clearly labelled and canon-sensitive facts sourced.


## 13. Save/reload browser regression — 2026-11-26

- Extended `tests/browser-smoke.js` to reload the actual game after training Haki/Devil Fruit and performing a Marine patrol action.
- The test resumes the saved life using the existing `เล่นต่อ` flow and verifies the following state survives: One Piece world ID, Haki mastery 5, Devil Fruit mastery 5 and name, 20,000,000 bounty, and the monthly Marine patrol action lock.
- Latest workflow run: `45863928103` — Node tests passed and Chromium smoke tests passed at **390×844** and **820×1180**.
- This verifies browser localStorage save/reload for these state fields. Backup recovery from a corrupted primary save and prison sentence expiry remain separate follow-up tests.
- Main HEAD before this handoff update: `74a59bbf0148edb79b1b12658186f62cd1e7637c`.


## 14. Save recovery and Marine prison-expiry regression — 2026-11-26

- Added a Node regression test that writes two saves, corrupts the primary key, and verifies the save manager restores the previous known-good backup.
- Extended the real Chromium browser smoke test to force a captured Marine record, advance the existing prison clock to sentence expiry through the game's `jailMonth()`, and verify the Marine UI returns the player to wanted status after release.
- Latest workflow run: `45864365769`.
  - Node tests: **16 passed, 0 failed**.
  - Browser smoke: success at **390×844** and **820×1180**.
  - Browser test covers start game, all companion module loads, Haki/fruit migration and yearly training, Marine patrol, save/reload/resume, and prison sentence expiry returning wanted status.
- Current `main` HEAD before this update: `55ee57fb4a3697024c240f16e611521371f92f8a`.
- Remaining test gap: browser smoke verifies valid save/reload and manager-level backup recovery, but does not yet simulate a corrupted localStorage primary through a full browser reload. This is a known timing limitation because the legacy inline game's initial resume check runs before the external runtime script installs its Storage hook.


## 15. CI stabilization and bootstrap-order verification — 2026-11-27

- Latest verified implementation HEAD before this log update: `42d0d3f2a0566614102bc6ef25eb5dd809f14cca`.
- Investigated failing run `45864815576`: all module behavior checks except one passed; the failure was a brittle assertion that required the external runtime script to appear at the end of `index.html`. The runtime was intentionally moved into the document head so save protection is installed before the legacy game's first resume check.
- Updated `tests/ai.test.js` to assert the actual contract: the modular runtime script exists and appears before `window.claude?.hot?.ready` (the game's bootstrap/resume entry point). Fixed a quote syntax issue caught by the next CI run.
- Updated `.github/workflows/test-ai.yml` to use `npx playwright install chromium` without `--with-deps`. The previous command failed before browser tests because the runner's Microsoft apt repository returned HTTP 403; this was an environment provisioning issue, not a game/browser assertion.
- Latest GitHub Actions run: `45920315317` on `42d0d3f2a0566614102bc6ef25eb5dd809f14cca` — **SUCCESS**.
  - Node unit tests: success (16 tests in the current suite).
  - Playwright Chromium smoke test: success at **390×844** and **820×1180**.
  - Chromium installation and browser execution both completed without the external apt repository dependency.
- This is still headless Chromium viewport testing, not a physical Android phone/tablet test.
- Next concrete task: begin P1 event-loop integration. Inspect the legacy game's event scheduling/choice resolution and connect `OnePieceEventAdapter` to a real, bounded One Piece event decision path without changing the legacy engine's choice/result contract. Add tests proving unavailable choices are never selected and original effects are applied exactly once; then continue the East Blue starter loop.

## 16. One Piece event decision integration — 2026-11-27

- Latest verified main HEAD before this log update: 78953f05db8bfb4a45024bd5aa25d320ba757eb4.
- Updated ai/event-adapter.js to understand the legacy event-choice schema:
  - Reads legacy g personality tags.
  - Treats ok:false, skip:true, available:false, and disabled:true as unavailable.
  - Never executes a choice's legacy f(S) callback; returns the original choice object for the existing game flow to apply.
  - Returns choice:null when no valid choice exists instead of accidentally choosing a disabled first option.
- Connected the adapter to the actual One Piece runEv() automatic-choice path in index.html. Manual player choice popups remain unchanged. For automatic choices after the existing one-popup-per-year limit, the game waits for companion modules, supplies existing trait preferences to the decision engine, selects a valid choice, and lets the existing techAuto(c) apply the original effect callback once.
- Added tests for legacy tag mapping, unavailable-choice exclusion, callback preservation/exactly-once invocation, and runtime wiring.
- Latest GitHub Actions run: 45920584795 on 78953f05db8bfb4a45024bd5aa25d320ba757eb4 — success.
  - Node tests: 18 passed, 0 failed, 0 skipped.
  - Chromium smoke job: success.
  - Browser smoke retains phone 390×844 and tablet 820×1180 checks.
- No real Android device test has been performed.
- Next concrete task: build the first small East Blue starter event chain using clearly labelled original/sandbox events and stable IDs. First inspect the existing OP world configuration, event date/place/age gates, and runEv choice consequences; then add the chain without presenting invented scenes as manga canon.

## 17. East Blue original starter chain — 2026-11-27

- Latest verified main HEAD before this log update: 1f9d2ba140a3b1447126f17da3000ea5aa096a78.
- Added ai/east-blue-starter.js with four stable-ID events for an original Foosha village side-story:
  1. op_eb_toma_net — meet fisherman Toma and recover missing nets/supplies.
  2. op_eb_dock_repair — repair the village dock/boat after the first event.
  3. op_eb_delivery_chart — receive and study a hand-drawn coastal route.
  4. op_eb_harbor_storm — choose how to protect the harbor before a storm.
- Every event is explicitly marked origin=original and canonStatus=sandbox, with titles prefixed as supplementary/original story. No invented event is represented as manga canon.
- Added the story module to the companion loader and registered its events into WORLDS.op.meets after the loader resolves. runYearEvents now waits for the companion load so the starter content is registered before the first game event pass.
- Added the fictional NPC name Toma to the One Piece cast-name lookup so existing relationship/bond messages resolve correctly.
- The event chain uses existing choice callbacks, stats, skills, relationship, money, flags, and save state. Each stage is gated by the prior outcome and is once-only.
- Added Node tests for stable IDs, sandbox metadata, four-step prerequisites, and choice effects; browser smoke now verifies all four events are registered in the actual runtime.
- Corrected the rescue outcome to modify the fitness stat rather than create an invalid fitness skill.
- Latest GitHub Actions run: 45921049133 on 1f9d2ba140a3b1447126f17da3000ea5aa096a78 — success.
  - Node tests: **19 passed, 0 failed, 0 skipped**.
  - Chromium browser smoke: **success** at 390×844 and 820×1180, including registration of all four original East Blue events.
- No physical Android/tablet device test has been performed.
- Next concrete task: audit the existing One Piece travel destinations and action handler to verify that island travel updates S.place, advances the intended amount of time, checks affordability/age/path prerequisites, and persists after reload. Fix any mismatch using the existing travel flow before expanding the starter chain beyond Foosha.

## 18. Travel persistence audit and stale-checksum fix — 2026-11-27

- Latest verified main HEAD before this log update: 4ce492e87cf0df7eb748c0199b97423bbfccc337.
- Audited the existing TRAVEL / travelMenu / travelGo / tripMenu / monthPass flow.
- Confirmed the game intentionally represents a temporary trip in S.trip (destination, world, ticket cost, start month, previous stop, companion flag). S.place remains the home/residence. The trip changes the rendered destination view through TRIPV/tripView and does not permanently relocate the player's home.
- Confirmed travel availability checks destination era/when condition, minimum age, ticket affordability, and monthly free-time availability. Starting a trip consumes one free-time action and the ticket; remaining away incurs a monthly lodging cost through the monthPass wrapper.
- Added a real browser smoke flow: start a trip to Fish-Man Island, verify ticket and free-time costs, reload/resume, advance one in-game month, verify the trip remains active and lodging cost is charged, then return home.
- The new test exposed a genuine save bug: loaded states retained stale _saveMeta checksum metadata. When the game changed and saved the state again, the Storage protection layer rejected the stale checksum, so changes made after loading could fail to persist.
- Fixed the root cause in index.html migrate(s) by removing _saveMeta from mutable gameplay state. The save layer now computes fresh metadata each time it writes the state.
- Added a browser assertion that _saveMeta is absent after resume and confirmed the active trip is persisted before reload.
- Latest GitHub Actions run: 45921972197 on 4ce492e87cf0df7eb748c0199b97423bbfccc337 — success.
  - Node tests: **19 passed, 0 failed, 0 skipped**.
  - Chromium smoke: **success** at 390×844 and 820×1180, including trip start, save/reload, one-month time progression, lodging cost, and trip termination.
- No physical Android device test has been performed.
- Known travel-location semantics: S.trip is the temporary destination context; S.place intentionally remains the home residence. Continue auditing which local story events should be suppressed or explicitly allowed while away.
- Next concrete task: prevent home-only random encounters from firing while S.trip is active, while preserving world-wide canon/lore news and explicitly travel-safe events. Add a regression test for a Foosha-only meet while the player is visiting another destination.

## 19. Home-only encounter guard while traveling — 2026-11-27

- Latest verified main HEAD before this log update: ea12fa0adb06d7e4dbfcef6efa1bd0075aea35ee.
- Added travelEventOK(e): while S.trip is active for the current world, events marked homeOnly are excluded unless explicitly marked travelOK.
- Applied the guard to annual random-life events, annual meetings, power-event selection, and monthly pickFrom() pools.
- Suppressed home-residence CASTMEETS while away; explicitly travel-safe cast meetings may opt in through travelOK.
- Marked the Foosha-only Luffy-childhood encounter, Makino encounter, Koby base encounter, and all four original East Blue starter events as homeOnly.
- Canon/lore timeline events remain active while traveling; this guard targets random local encounters rather than world-wide history/news.
- Added browser regression coverage while the player is on Fish-Man Island: a homeOnly event is rejected and an otherwise identical travelOK event remains eligible.
- Latest GitHub Actions run: 45922292377 on ea12fa0adb06d7e4dbfcef6efa1bd0075aea35ee — success.
  - Node tests: **19 passed, 0 failed, 0 skipped**.
  - Chromium smoke: **success** at 390×844 and 820×1180, including travel persistence and encounter filtering.
- No physical Android/tablet device test has been performed.
- Next concrete task: expand One Piece travel to the East Blue with a small set of age/era-gated destinations (Orange Town, Syrup Village, Baratie, Cocoyashi, and Loguetown). Keep temporary travel in S.trip, add matching destination view mappings, clearly label original side activities, and test affordability/age/era gates plus save/reload.
