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
- [ ] Inspect `main` tree, game bootstrap, One Piece world registration, save/load, time progression, event execution and test setup.
- [ ] Compare feature-branch modules against `main`; identify missing files, API mismatches and dependencies.
- [ ] Run the existing test suite on the current main baseline and record the exact result.
- [ ] Port the highest-value, low-risk modules in small steps, starting with progression, Marine UI and crew combat adapter only after validating their integration points.
- [ ] Add/adjust CI so One Piece module tests run for main pushes and pull requests.
- [ ] Update this file after each completed slice.

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
