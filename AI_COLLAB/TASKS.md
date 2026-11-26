# Task board

## Current task

### COLLAB-001 — Repository reconnaissance and work split
- **Owner:** AI B
- **Status:** READY FOR REVIEW
- **Mode:** Read-only; no game source edits
- **Target branch to inspect:** `main`
- **Requested scope:**
  1. Inspect the game entry point `index.html` and any relevant supporting assets/files.
  2. Summarize the current architecture and major systems. Cite concrete function names, selectors, or line ranges when possible.
  3. Recommend a safe division of work between AI A and AI B.
  4. Identify shared contracts/data structures and files that must have a single owner.
  5. Propose one small, low-risk first implementation task, but do not implement it.
- **Acceptance criteria:** A concise, evidence-based report is appended to `messages/B_TO_A.md`; no game files are changed.

### STORY-001 — Establish One Piece narrative direction and data contract
- **Owner:** AI A
- **Status:** DONE (documentation draft)
- **Mode:** Documentation only; no game source edits
- **Outputs:**
  - `AI_COLLAB/STORY_BIBLE.md` — narrative pillars, timeline/canon policy, origins, regions, factions, event families, journal/news/legacy, and content-production order.
  - `AI_COLLAB/STORY_DATA_CONTRACT.md` — proposed data shapes for timelines, regions, islands, factions, canon schedules/events, dynamic events, dreams, news, journals, and validation.
- **Acceptance criteria:** Narrative direction and proposed interfaces are documented separately from the game engine. Technical assumptions are explicitly marked as proposals pending code review.

### STORY-002 — Validate narrative data contract against the existing engine
- **Owner:** AI B
- **Status:** BACKLOG
- **Prerequisite:** Complete COLLAB-001 first.
- **Mode:** Read-only technical review; no game source edits.
- **Target branch to inspect:** `main`; read the story documents from `ai-collab/message-board`.
- **Requested scope:**
  1. Compare `STORY_DATA_CONTRACT.md` with actual world, location, NPC, event, time, save, journal, and news structures.
  2. Identify which proposed fields map directly to existing structures, which need adapters, and which are not currently supported.
  3. Recommend the smallest viable One Piece narrative slice that fits the current engine without restructuring the whole game.
  4. Call out any lore/timeline assumptions that the code cannot enforce.
  5. Append a section titled `STORY-002 — Contract compatibility review` to `messages/B_TO_A.md`.
- **Acceptance criteria:** Evidence-based compatibility report with file/function/line references; no code changes.

## Status definitions
- `BACKLOG`: not started
- `READY FOR REVIEW`: waiting for the other agent
- `IN PROGRESS`: actively being worked on
- `BLOCKED`: cannot proceed; explain why
- `DONE`: acceptance criteria met
- `APPROVED`: coordinator accepted the result
