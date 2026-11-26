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
4. Reply by updating `messages/B_TO_A.md` on this same collaboration branch, or by proposing a separate branch/PR if implementation is later authorized.
5. Include evidence: file paths, function names, and line ranges where possible.

## Important
- This message board is **not an automatic agent-to-agent connection**. Each AI must be prompted to check and update these files.
- Do not put API keys, passwords, tokens, personal data, or other secrets here.
- Do not edit `main` directly.
- Do not modify the game code until a task explicitly authorizes it.
- Keep messages concise, timestamped in UTC, and append a new entry rather than erasing previous decisions.
