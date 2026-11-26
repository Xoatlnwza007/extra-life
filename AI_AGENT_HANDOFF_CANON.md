# Parallel AI Agent Handoff — Canon & Story Content

**Project:** One Piece Life Simulator  
**Repository:** `Xoatlnwza007/extra-life`  
**Development branch:** `one-piece-development`  
**Task owner:** The second AI agent  
**Do not edit:** `main`

## Mission

Build the canonical One Piece world-content layer that the simulator does not yet have: a structured, source-backed timeline of canon arcs, major events, locations, factions, characters, and story-state triggers. This is a content/data task, not a rewrite of the game engine.

## Research source

Use the **One Piece Wiki** as the research index:
- https://onepiece.fandom.com/wiki/One_Piece_Wiki

For every event or factual record, retain a source URL to the relevant wiki page and, where possible, the manga chapter reference. Prefer manga-canon facts. Keep anime-only material explicitly tagged as `anime_only`; do not silently mix it into manga canon. If a fact is disputed, uncertain, or its chronology is unclear, mark it `needs_review` rather than inventing an answer.

Do not copy long passages from the wiki. Summarize facts in original wording and store source references.

## Deliverables

1. **Canon arc catalogue** — saga, arc, order, island/region, chapter range when known, status and prerequisites.
2. **Canon event timeline** — key events in chronological order, including event ID, arc ID, approximate in-world time/order, location, involved characters/factions, prerequisites, outcomes, and source URL(s).
3. **Story flags and consequences** — machine-readable flags for major outcomes (e.g. character alive/dead/escaped, island liberated/occupied, faction reputation changes, bounty/news changes). Avoid assuming the player's actions always match canon.
4. **Character and faction references** — IDs and concise structured facts needed by events; avoid duplicating a full character database if one already exists.
5. **Playable scenario hooks** — define where a player can enter/branch from canon without forcing the player to follow Luffy's exact path.
6. **Validation** — schema checks for missing IDs, broken references, duplicate event IDs, invalid ordering, missing source URLs, and invalid canon tags.
7. **Documentation** — explain the data schema, source policy, known gaps, and how new canon events can be added.

## Suggested file layout

Inspect the existing repository first and adapt to its conventions. Prefer a clean data-only area, for example:

- `data/canon/arcs.json`
- `data/canon/events.json`
- `data/canon/locations.json`
- `data/canon/factions.json`
- `data/canon/README.md`
- validation script and tests under the existing test conventions

Do not create duplicate systems if equivalent files already exist. Keep data separate from engine logic.

## Canon data quality rules

- Stable machine-readable IDs; use lowercase snake_case.
- Every event must have `canon_status` such as `manga_canon`, `anime_only`, `cover_story`, or `needs_review`.
- Record chapter references and wiki source URLs for each event.
- Separate confirmed facts from interpretation and simulator design choices.
- Do not invent dates or exact durations where the source does not establish them.
- Preserve branching possibilities: canon is the reference timeline, not a mandatory player script.
- Use concise original summaries; no long verbatim wiki text.
- Start with a complete high-level arc/saga index, then add the most important events per arc. Do not claim exhaustive coverage until it has been verified.

## Integration contract

The primary engine work is being handled separately. Keep this task data-first and expose a documented, stable schema. Do not edit `ai/world-simulation.js`, `ai/marine-system.js`, the mobile UI, or shared engine files unless absolutely required; if required, open a separate PR and explain the dependency instead of committing overlapping edits.

The main implementation agent will review the data and connect it to the simulator after delivery.

## Workflow and handoff

- Work on a separate branch, e.g. `canon-content`, based on the latest `one-piece-development`.
- Commit in small logical units.
- Open a pull request targeting `one-piece-development`, not `main`.
- Include a summary, files changed, validation/test results, known gaps, and source policy in the PR description.
- Do not merge into `main`.
- If the task cannot be completed in one pass, deliver a working, validated first tranche (arc catalogue + representative key events) and clearly list remaining arcs/events.

## Acceptance criteria

- Data is valid JSON and passes automated schema/reference validation.
- No duplicate IDs or broken cross-references.
- Every factual event has traceable source URL(s) and a canon classification.
- Manga-canon and anime-only content are not conflated.
- No engine/mobile code conflicts with the primary implementation stream.
- A PR is opened against `one-piece-development` with tests and a clear coverage report.
