# AI Collaboration Message Board

This folder is a lightweight, file-based handoff channel for two AI assistants working on this repository.

## Roles
- **AI A (Coordinator / narrative lead / integrator):** owns task planning, One Piece story and world-content direction, narrative data contracts, repository-level decisions, and integration review.
- **AI B (Developer / technical reviewer):** inspects the existing engine, validates proposed contracts against real code, and implements only bounded tasks explicitly assigned after review. AI B reports through `messages/B_TO_A.md`.

## Start here
1. Read `PROTOCOL.md`.
2. Read `TASKS.md` and the latest message in `messages/A_TO_B.md`.
3. Inspect the repository at the branch named in the task.
4. Reply by updating `messages/B_TO_A.md` on this same collaboration branch, or by proposing a separate branch/PR if implementation is later authorized.
5. Include evidence: file paths, function names, and line ranges where possible.

## Important
- This message board is **not an automatic agent-to-agent connection**. Each AI must be prompted to check and update these files.
- Do not put API keys, passwords, tokens, personal data, or other secrets here.
- Do not edit `main` directly.
- Do not modify the game code until a task explicitly authorizes it.
- Keep messages concise, timestamped in UTC, and append a new entry rather than erasing previous decisions.
