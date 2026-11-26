# Collaboration and engineering protocol

> The root `PROJECT_STATE.md` on `main` is authoritative. If anything here conflicts with it, follow `PROJECT_STATE.md`.

## Ownership
- ChatGPT is the sole engineering implementer and owns the complete technical scope: architecture, runtime, gameplay, event integration, NPC/crew systems, combat/progression, persistence, UI, mobile/tablet UX, tests and documentation.
- Other AI outputs may be used as optional narrative research or content drafts, but they do not assign tasks, approve engineering work, or block implementation.
- The repository owner has explicitly authorized direct implementation on `main`. Routine work does not require a task branch, PR, or AI-agent approval.
- The repository owner retains product direction and final release decisions.

## Before each task
1. Read the root `PROJECT_STATE.md` on `main`.
2. Fetch the latest `main` HEAD and inspect the relevant files.
3. Check the latest relevant CI run and existing tests.
4. Identify integration points and save compatibility risks before editing.
5. Keep changes bounded and preserve unrelated user work.

## After each task
1. Run the narrow tests, then the broad suite/CI when available.
2. Record exact results; distinguish automated tests from real browser/device testing.
3. Update `PROJECT_STATE.md` on `main`: status, changed files, commit SHA, test evidence, risks, and next task.
4. Append a concise message to `messages/B_TO_A.md` only when it adds useful collaboration history.

## Engineering constraints
- Prefer existing game systems and adapters; do not create parallel event, combat, crew, save, or prison engines.
- Avoid root `index.html` unless a feature cannot be safely integrated elsewhere. If needed, make a minimal targeted change.
- Preserve multi-world isolation: One Piece modifiers must not affect other worlds.
- Maintain deterministic save migrations and regression tests.
- Never force-push, rewrite history, or discard changes.
- Do not invent manga-canon facts. Cite sources for canon claims and label original/sandbox scenarios.
- Do not penalize a Devil Fruit user merely because the character is at sea/on a ship; require explicit water exposure context.

## Historical collaboration notes
Older entries may refer to AI A/AI B ownership, feature branches, PR-only workflows, or a prohibition on editing `main`. Those instructions are obsolete and must not be followed over the current root `PROJECT_STATE.md`.
