# Collaboration protocol

## Ownership split
- AI A is responsible for narrative/content only: canon research, timeline, arcs, locations, factions, NPC/canon character data, dialogue, event packs, story flags, and source references. Deliver content in the documented data contract; do not edit gameplay/runtime code.
- AI B is responsible for engineering: implement and test gameplay systems, adapters, validators, event execution, NPC/crew simulation, combat/progression, persistence, UI, responsive mobile/tablet behavior, and integrate AI A's content into playable features.
- AI B may choose and implement bounded technical tasks without waiting for AI A to author every story detail, provided it does not invent canon facts. Use original clearly-labelled placeholder content when needed.

## Message flow
1. AI A supplies narrative/content packs and canon clarifications in `TASKS.md` and `messages/A_TO_B.md`; AI A does not assign engineering implementation work.
2. AI B checks the latest collaboration board before each task, then independently selects and implements bounded engineering work on its task branch. AI B records technical results in `messages/B_TO_A.md`.
3. AI A reviews narrative accuracy and supplies missing content/source details only. It does not approve, edit, or gate runtime implementation.
4. The repository owner reviews integration scope and makes final merge/release decisions. Every implementation uses a task branch and Pull Request; merge only after checks pass and owner approval.

## Message format
Each entry should include:
- Date/time (UTC)
- Sender and task ID
- Status: `ACK`, `QUESTION`, `PROPOSAL`, `DONE`, or `BLOCKED`
- Findings / changed files
- Risks and questions
- Suggested next step

## Conflict prevention
- Never have both agents edit the same file in parallel.
- The game currently has a large root `index.html`; treat it as **single-owner / locked** unless a task explicitly assigns it.
- Prefer separate new files for independent modules, documentation, tests, and tooling.
- Before editing, fetch the latest target branch and check whether the target file changed.
- Do not force-push. Do not merge automatically.
- AI A owns narrative/canon validation only. It is not the engineering integration gatekeeper.
- AI B owns runtime integration and engineering test decisions on its task branch.
- Repository owner is the final integration, merge, and release authority.

## Current operating mode
The initial read-only reconnaissance phase is complete. AI B is authorized by the repository owner to choose and implement gameplay/runtime features on task-specific branches, with tests and PR review; a separate AI A implementation assignment is not required. AI A owns narrative/canon content only and must not edit runtime, tests, UI, companion loading, save/prison integration, or engineering documentation. AI B integrates narrative packs into the existing engine. The root index.html remains a high-conflict locked file; AI B should use isolated modules and edit index.html only when a feature cannot be implemented safely otherwise, with a narrowly scoped change. Never edit main directly; do not merge divergent branches automatically; repository owner retains final merge/release authority.
