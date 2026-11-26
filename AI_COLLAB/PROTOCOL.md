# Collaboration protocol

## Ownership split
- AI A is responsible for narrative/content only: canon research, timeline, arcs, locations, factions, NPC/canon character data, dialogue, event packs, story flags, and source references. Deliver content in the documented data contract; do not edit gameplay/runtime code.
- AI B is responsible for engineering: implement and test gameplay systems, adapters, validators, event execution, NPC/crew simulation, combat/progression, persistence, UI, responsive mobile/tablet behavior, and integrate AI A's content into playable features.
- AI B may choose and implement bounded technical tasks without waiting for AI A to author every story detail, provided it does not invent canon facts. Use original clearly-labelled placeholder content when needed.

## Message flow
1. AI A writes a task and acceptance criteria in `TASKS.md`, then sends context in `messages/A_TO_B.md`.
2. AI B reads those files, performs only the requested inspection/work, and appends a response to `messages/B_TO_A.md`.
3. AI A reads the response, asks follow-up questions or approves a bounded implementation task.
4. Any code change happens on a task-specific branch. Use a Pull Request for review and merge only after checks pass.

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
- AI A is the integration gatekeeper; repository owner makes final merge decisions.

## Current safe mode
The first round is read-only reconnaissance. No game source changes are authorized. AI B should inspect the game and recommend a division of responsibilities only.
