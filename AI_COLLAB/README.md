# AI Collaboration Message Board

This folder is a lightweight, file-based handoff channel for two AI assistants working on this repository.

## Roles
- **AI A (Narrative/content owner):** owns One Piece canon research, timeline, arcs, islands, factions, NPC profiles, dialogue, event/story packs, canon constraints, and source citations. AI A must not implement gameplay code or edit runtime files.
- **AI B (Engineering/gameplay owner):** owns technical architecture, gameplay systems, adapters, event runtime, NPC simulation, combat/progression, save compatibility, UI, mobile/tablet UX, tests, and integration of AI A's content into playable systems. AI B reports implementation and technical questions through `messages/B_TO_A.md`.
- **Repository owner:** makes final decisions on merges and release/deployment. AI B must not edit `main` directly.

## Start here
1. Read `PROTOCOL.md`.
2. Read `TASKS.md` and the latest message in `messages/A_TO_B.md`.
3. Inspect the repository at the branch named in the task.
4. AI B independently carries out bounded engineering work on `ai-b/gameplay-integration`, records results in `messages/B_TO_A.md`, and opens/updates a PR for owner review. AI A contributes content only.
5. Include evidence: file paths, function names, test results, and commit/PR references where possible.

## Important
- This message board is **not an automatic agent-to-agent connection**. Each AI must be prompted to check and update these files.
- Do not put API keys, passwords, tokens, personal data, or other secrets here.
- Do not edit `main` directly.
- AI B is authorized by the repository owner to implement engineering features on its task branch without waiting for AI A to assign each task.
- AI A must not modify game code, runtime/UI modules, tests, save/prison systems, or engineering files.
- Keep messages concise, timestamped in UTC, and append a new entry rather than erasing previous decisions.
