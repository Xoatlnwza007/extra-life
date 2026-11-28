# One Piece Canon & Story Data — Content Catalogue

This folder is a **data-only content layer**. It does not yet change the browser runtime or force the player to follow the Straw Hats' route.

## Contents

- `arcs.json`: the story-section index, with manga chapter ranges and major locations.
- `events.json`: representative manga-canon timeline anchors, linked to locations, factions, characters, and baseline reference flags. Seven anchors now include 11 source-verified key chapter milestones; broad arc spans remain clearly labelled and are not exact event triggers.
- `scenario_hooks.json`: 21 optional player-facing scenario seeds with three approaches each, fail-forward outcomes, spoiler gates, and explicit canon isolation.
- `locations.json`: source-backed locations used by the event anchors.
- `factions.json`: pirate crews, communities, government bodies, and alliances referenced by the events.
- `characters.json`: concise references for named characters directly involved in the event anchors.
- `cover_stories.json`: all 19 major manga cover-story serials plus two short `Where They Are Now` follow-ups, kept separate from the main event timeline.
- `fan_ideas.json`: 16 community theories, what-if prompts, and fan worldbuilding formats transformed into original, optional sandbox hooks.

This is a curated game-content catalogue, not an exhaustive encyclopedia. The arc index was last checked through manga Chapter 1199 on 2026-11-28. The Elbaph story is ongoing and remains open-ended. The catalogue contains 21 records: 19 major serials and two supplemental short follow-ups. The 19-item major-serial count groups the eight separated Straw Hat mini-stories into one serial.

## Classification policy

- `manga_canon`: events, characters, factions, or locations grounded in the manga.
- `cover_story`: serialized manga cover-page side stories. They are official story material, but are kept separate from the main arc timeline.
- `anime_only`: anime-original material. It is not silently added to manga canon.
- `fan_theory`: a community hypothesis, not a confirmed fact.
- `fanon_sandbox`: an original optional scenario inspired by a fan discussion, fan work, or community prompt.
- `needs_review`: a disputed or insufficiently sourced claim.

Fan ideas are always tagged `fanon_sandbox` and `play_scope: sandbox_only`. They must never populate canon flags, rewrite canon outcomes, or appear as factual news. When a fan idea discusses a late-series mystery, its `spoiler_gate_arc` must prevent it from appearing in an earlier-stage playthrough.

## Runtime contract

- Canon is a **reference timeline**, not a mandatory player script.
- Events use `trigger_mode: scenario_anchor_only` or `world_news_anchor`; they are not meant to auto-fire simply because a date or location matches.
- A player's actions may replace the reference outcome. Future integration must store player outcomes separately from canon reference outcomes.
- The current HTML single-file runtime remains the source of truth for playable code. These files are not loaded by the browser in this tranche.

## Sources and adaptation

Use the official ONE PIECE.com story index for the main arc index and the VIZ chapter listing to verify the latest published chapter. The cover-story catalogue uses a cross-checked chapter-range index from One Piece Breaks and the One Piece Wiki as secondary research references. The One Piece Wiki is also a secondary research index for event, character, faction, and location references. Community sources are inspiration only. Their ideas are re-authored into original hooks; named canon characters and unresolved mysteries are not assigned speculative outcomes.

No long passages are copied. Community theories and prompts are paraphrased and transformed into new scenario hooks. Keep source URLs and author/community attribution with each item.

## Validation

Run:

```sh
node --test tests/*.test.js
node scripts/validate-canon.js
```

The validator checks unique IDs, arc order and chapter bounds, event-to-arc/location/faction/character references, source-backed milestone chapter bounds, scenario-to-event links, three-path player choices, fail-forward rules, canon isolation, canon tags, source URLs, all 21 cover-story ranges and their catalogue groups, and sandbox isolation for fan ideas.

## Next content pass

1. Add more verified key events and expand the timeline beyond this representative first tranche.
2. Expand cover-story entries with structured aftermath, NPC/world-state consequences, and optional quest chains.
3. Refine the broad event chapter spans into individually verified chapter beats before using them as exact gameplay triggers.
3. Add source-backed scenario entry points and branching choices without assuming the player repeats Luffy's choices.
4. Integrate the data into the active HTML runtime only after the branch/runtime contract has been reconciled.
