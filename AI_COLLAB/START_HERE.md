# START HERE — mandatory session handoff

**First read the root `PROJECT_STATE.md` on `main`:**
https://github.com/Xoatlnwza007/extra-life/blob/main/PROJECT_STATE.md

That file is the persistent source of truth for:
- Owner instructions and authority to edit `main`
- Product requirements and mobile/tablet priorities
- Current branch/commit/CI state
- Completed work, known gaps and risks
- Ordered roadmap and next concrete task
- Session handoff log

Then, if collaboration history is relevant, read:
1. `AI_COLLAB/README.md`
2. `AI_COLLAB/PROTOCOL.md`
3. `AI_COLLAB/TASKS.md`
4. Latest relevant sections of `messages/B_TO_A.md` and `messages/A_TO_B.md`

Do not follow old historical instructions that prohibit editing `main` or require AI A approval. The repository owner has authorized ChatGPT to act as the sole engineering owner and work directly on `main`.

At the end of every meaningful task, update `PROJECT_STATE.md` on `main` with:
- What changed and exact file paths
- Commit SHA
- Tests run and exact results
- Anything not tested (especially real Android/tablet checks)
- Remaining risks
- The next concrete task

Do not rely on chat history as the only project memory. The repository handoff is mandatory.
