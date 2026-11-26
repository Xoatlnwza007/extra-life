# Task board

## Current task

### COLLAB-001 — Repository reconnaissance and work split
- **Owner:** AI B
- **Status:** DONE — report received and reviewed by AI A
- **Mode:** Read-only; no game source edits
- **Evidence:** `messages/B_TO_A.md`, section `COLLAB-001 — Repository reconnaissance report`.
- **Key findings:** One Piece is already registered as `OP` / `WORLDS.op`; core runtime is a large `index.html`; save state is `S`; world data is `W`; time uses `S.year` and `S.mo`; event execution uses callback handlers.
- **Next step:** STORY-002 contract compatibility review.

### STORY-001 — Establish One Piece narrative direction and data contract
- **Owner:** AI A
- **Status:** DONE (documentation draft)
- **Mode:** Documentation only; no game source edits
- **Outputs:**
  - `AI_COLLAB/STORY_BIBLE.md`
  - `AI_COLLAB/STORY_DATA_CONTRACT.md`
- **Acceptance criteria:** Narrative direction and proposed interfaces are documented separately from the game engine. Technical assumptions are explicitly marked as proposals pending code review.

### STORY-002 — Validate narrative data contract against the existing engine
- **Owner:** AI B
- **Status:** IN PROGRESS — assigned after COLLAB-001 review
- **Mode:** Read-only technical review; no game source edits
- **Target branch to inspect:** `main`; read story documents from `ai-collab/message-board`.
- **Requested scope:**
  1. Compare `STORY_DATA_CONTRACT.md` with actual world, location, NPC, event, time, save, journal, and news structures.
  2. Identify which proposed fields map directly to existing structures, which need adapters, and which are not currently supported.
  3. Recommend the smallest viable One Piece narrative slice that fits the current engine without restructuring the whole game.
  4. Call out any lore/timeline assumptions that the code cannot enforce.
  5. Append a section titled `STORY-002 — Contract compatibility review` to `messages/B_TO_A.md`.
- **Acceptance criteria:** Evidence-based compatibility report with file/function/line references; no code changes.

### STORY-003 — Review East Blue starter pack against engine capabilities
- **Owner:** AI B
- **Status:** DONE — report submitted; awaiting AI A review
- **Prerequisite:** Complete STORY-002 first.
- **Mode:** Read-only technical review; no game source edits.
- **Documents:** `STORY_BIBLE.md`, `STORY_DATA_CONTRACT.md`, and `EAST_BLUE_STARTER_PACK.md`.
- **Requested scope:**
  1. Map each starter event category to existing event structures and supported effects.
  2. Identify whether original NPCs, age-gated events, family memories, and journal hooks can be data-only.
  3. Flag any proposed field/effect that does not exist in the engine.
  4. Recommend one minimal vertical slice for implementation and list exact files/functions it would touch.
  5. Append a section titled `STORY-003 — East Blue starter pack compatibility` to `messages/B_TO_A.md`.
- **Acceptance criteria:** Evidence-based mapping and a bounded implementation proposal; no game source edits.

## Status definitions
- `BACKLOG`: not started
- `READY FOR REVIEW`: waiting for the other agent
- `IN PROGRESS`: actively being worked on
- `DONE`: acceptance criteria met
- `APPROVED`: coordinator accepted the result


### STORY-004 — Review Roger-era content pack against engine capabilities
- **Owner:** AI B
- **Status:** BACKLOG
- **Prerequisites:** Complete STORY-002 and STORY-003.
- **Mode:** Read-only technical review; no game source edits.
- **Document:** `ROGER_ERA_CONTENT_PACK.md`.
- **Requested scope:**
  1. Check whether the existing OP world contains Roger-era timeline data, crew members, events, and schedule constraints.
  2. Map the encounter ladder (rumor, sighting, brief encounter, trust, alliance, voyage, recruitment, rivalry) to existing event, relationship, faction, and career mechanics.
  3. Identify which steps can be implemented using existing systems and which require minimal engine additions.
  4. Verify what training/combat effects are actually supported; flag unsupported assumptions.
  5. Recommend a minimal Roger-era vertical slice that preserves canon constraints and does not create a second simulation system.
  6. Append `STORY-004 — Roger era compatibility review` to `messages/B_TO_A.md`.
- **Acceptance criteria:** Evidence-based mapping with function names/line references and a bounded implementation recommendation; no source changes.
