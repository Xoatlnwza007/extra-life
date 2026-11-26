# One Piece Narrative Data Contract

- **Owner:** AI A — Narrative / World Content
- **Status:** Draft 0.1 — proposed content interface for review by AI B
- **Related:** `STORY_BIBLE.md`
- **Goal:** Keep narrative content data-driven and separate from the existing simulation engine. This document proposes stable content shapes; it does not assert that the current game already implements them.

## 1. Integration boundaries

The current game is an existing large HTML application. Until the technical reconnaissance is complete:
- do not rewrite the current world switcher or the monthly simulation loop;
- do not rename or reshape existing global state objects;
- do not insert narrative data directly into the large root `index.html`;
- treat all shapes below as proposed adapters / future content data;
- let the technical owner map these fields to the current engine and report mismatches before implementation.

One Piece should be represented as an additional selectable world, with a world-specific content registry. Existing non-One-Piece worlds must continue to load unchanged.

## 2. Stable identifiers and shared conventions

- IDs are lowercase `snake_case` or lowercase namespaced strings, stable after release.
- Use IDs for cross-references; do not use display names as keys.
- Player-facing text is Thai-first. Store text separately from logic wherever the engine permits.
- Month values are integers. Use `worldMonth` for the active save's relative world clock.
- Unknown facts remain null/unknown; do not invent dates, locations, affiliations, or outcomes.
- Data records should be versioned at pack level and validated before loading.

Suggested top-level pack:

```js
const ONE_PIECE_CONTENT = {
  schemaVersion: 1,
  worldId: "one_piece",
  displayName: "One Piece",
  timelinePresets: [],
  regions: [],
  islands: [],
  factions: [],
  characters: [],
  canonEvents: [],
  eventPools: [],
  dreams: [],
  originTemplates: []
};
```

## 3. Timeline record

```js
{
  id: "pre_romance_dawn",
  label: "ก่อนการออกทะเลของกลุ่มหมวกฟาง",
  description: "ช่วงเวลาก่อนเหตุการณ์หลักเริ่มต้น",
  anchorEventId: "romance_dawn",
  offsetMonths: -12,
  datePrecision: "relative",
  canonModeDefault: "canon_guarded"
}
```

Rules:
- The example offset is a configuration placeholder, not a verified canon date. Do not ship it as factual until reviewed.
- Supported `datePrecision`: `exact | relative | window | unknown`.
- Supported `canonModeDefault`: `canon_guarded | parallel_history | open_sandbox`.
- Timeline presets should be data, not hard-coded conditional branches in the monthly loop.

## 4. Region and island records

```js
{
  id: "east_blue",
  label: "ทะเลอีสต์บลู",
  regionType: "sea",
  accessRule: { type: "starting_region" },
  islandIds: ["dawn_island", "shells_town", "orange_town"]
}
```

```js
{
  id: "dawn_island",
  label: "เกาะรุ่งอรุณ",
  regionId: "east_blue",
  locationType: "island",
  description: "เกาะบ้านเกิดที่มีทั้งชุมชนชนบท เมืองท่า และอำนาจท้องถิ่น",
  climateTags: ["temperate"],
  settlementTags: ["village", "port", "town"],
  resourceTags: ["food", "timber"],
  access: {
    startingEligible: true,
    requiredFlags: [],
    blockedFlags: []
  },
  authorityFactionIds: [],
  localFactionIds: [],
  routeIds: [],
  eventPoolIds: ["dawn_island_life", "east_blue_travel"],
  canonPresenceRules: []
}
```

The text above is an illustrative content example, not a fully verified database entry. The content pack should only add supported factual details and should distinguish original settlements from canon locations.

## 5. Faction record

```js
{
  id: "marines",
  label: "กองทัพเรือ",
  factionType: "government_military",
  goals: ["maintain_order", "protect_civilians"],
  publicReputation: "mixed",
  relationships: {
    alliedFactionIds: [],
    rivalFactionIds: []
  },
  ranks: [],
  recruitmentRules: [],
  eventPoolIds: ["marine_career", "marine_local_duties"]
}
```

Faction types should be extensible. A character's personal relationship with an NPC is distinct from their standing with that NPC's faction.

## 6. Character and canon schedule records

Use the existing character/NPC engine if it can store these fields. Do not create a parallel identity system without the technical owner's approval.

```js
{
  id: "canon_character_id",
  label: "Display name",
  canonStatus: "canon",
  factionIds: [],
  roleTags: [],
  schedule: [
    {
      id: "schedule_segment_id",
      timeRule: {
        type: "after_event",
        eventId: "known_anchor_event",
        offsetMonths: 0,
        datePrecision: "relative"
      },
      regionId: "east_blue",
      islandId: "dawn_island",
      presenceRule: "required_condition",
      requiredFlags: [],
      excludedFlags: []
    }
  ]
}
```

Rules:
- This is a shape proposal, not a claim about the current NPC model.
- Canon characters must have schedule/location constraints. If a reliable schedule is unavailable, use a restricted appearance window or keep them out of direct encounters.
- The engine should be able to report that an NPC is unavailable, traveling, unknown, or dead.
- Player-created NPCs and original named NPCs should use the same identity mechanism, but carry `canonStatus: "original"`.

## 7. Canon event record

```js
{
  id: "canon_event_id",
  title: "เหตุการณ์สำคัญ",
  summary: "คำอธิบายสั้นที่เขียนขึ้นใหม่",
  canonStatus: "canon",
  timeRule: {
    type: "within_window",
    anchorEventId: "known_anchor_event",
    earliestOffsetMonths: -1,
    latestOffsetMonths: 1,
    datePrecision: "window"
  },
  location: {
    regionId: "east_blue",
    islandId: "dawn_island"
  },
  participantIds: [],
  requiredFlags: [],
  excludedFlags: [],
  playerInteraction: "observe",
  divergenceLevel: "local",
  outcomeIds: [],
  newsVisibility: "public"
}
```

Supported `timeRule.type`:
- `fixed_offset`: exact offset from an anchor;
- `after_event`: happens after another event, optionally with an offset;
- `within_window`: can occur in a bounded window;
- `condition_only`: no fixed date; conditions determine when it occurs.

Supported `playerInteraction`:
- `observe`, `hear_about`, `influence`, `interrupt`, `unavailable`.

Supported `divergenceLevel`:
- `none`, `local`, `regional`, `global`.

The engine should only mark a canon event completed when its trigger conditions are satisfied. A news mention is not the same as direct player participation.

## 8. Dynamic life event record

```js
{
  id: "east_blue_fishing_work_offer",
  title: "ข้อเสนองานจากท่าเรือ",
  category: "career",
  canonStatus: "original",
  weight: 10,
  cooldownMonths: 18,
  trigger: {
    minAge: 12,
    maxAge: 70,
    regionIds: ["east_blue"],
    requiredFlags: [],
    excludedFlags: [],
    requiredTags: ["near_port"]
  },
  visibility: "local",
  choices: [
    {
      id: "accept",
      label: "รับงาน",
      requirements: [],
      effects: [
        { type: "career_progress", value: 1 },
        { type: "money_delta", value: 20 },
        { type: "memory_add", value: "worked_at_harbor" }
      ]
    },
    {
      id: "decline",
      label: "ปฏิเสธอย่างสุภาพ",
      requirements: [],
      effects: [
        { type: "relationship_delta", target: "offer_source", value: 1 }
      ]
    }
  ]
}
```

Effects above are illustrative only. The technical owner must map them onto real supported engine actions; never silently add an effect type that the engine cannot process. Separate trigger evaluation, choice presentation, and effect execution.

## 9. Dream and origin templates

Dream template:

```js
{
  id: "dream_map_the_sea",
  label: "ทำแผนที่ทะเลให้ครบ",
  description: "อยากบันทึกเส้นทางและเกาะที่ยังไม่มีใครทำแผนที่",
  motivationTags: ["exploration", "knowledge", "freedom"],
  suggestedSkills: ["navigation", "cartography"],
  milestoneIds: ["learn_navigation", "complete_first_route", "record_unknown_island"]
}
```

Origin template:

```js
{
  id: "origin_port_family",
  label: "ครอบครัวคนท่าเรือ",
  description: "เติบโตในครอบครัวที่ทำงานเกี่ยวข้องกับท่าเรือ",
  eligibleRegionIds: ["east_blue", "west_blue", "north_blue", "south_blue"],
  modifiers: [],
  startingMemoryIds: ["childhood_port_life"],
  suggestedDreamIds: ["dream_map_the_sea"]
}
```

Origin and dream templates should provide tendencies and hooks, not deterministic destinies or guaranteed rare powers.

## 10. News and journal records

News item:

```js
{
  id: "news_item_id",
  worldMonth: 120,
  title: "ข่าวจากเกาะใกล้เคียง",
  summary: "สรุปเหตุการณ์ที่เกิดขึ้นจริงในโลกบันทึก",
  sourceType: "newspaper",
  sourceId: null,
  reliability: "verified",
  visibilityRegionIds: ["east_blue"],
  linkedEventIds: ["east_blue_event_id"],
  subjectIds: [],
  branchId: "main"
}
```

Journal entry:

```js
{
  id: "journal_entry_id",
  characterId: "player_character_id",
  worldMonth: 120,
  entryType: "life_event",
  title: "วันแรกที่เริ่มทำงาน",
  body: "บันทึกภาษาไทยที่สรุปสิ่งที่ตัวละครประสบ",
  linkedEventIds: ["east_blue_fishing_work_offer"],
  memoryIds: ["worked_at_harbor"]
}
```

News visibility must follow witnesses, reports, and geography. Journal content must be derived from events/memories already recorded in the save.

## 11. Save compatibility and validation

Any One Piece-specific state added to a save should be nested under a namespaced key such as `worldData.one_piece` if that fits the current save architecture. This is a proposal pending code review.

Minimum validation:
- unique IDs within each record collection;
- every referenced island, region, faction, character, event, and pool exists;
- time rules reference valid anchors;
- no negative or inverted time windows;
- unsupported effect types are rejected;
- canon events with direct character participation have schedule/location constraints;
- the world can load when optional content packs are missing;
- existing worlds can still load old saves without One Piece data.

## 12. First content slice acceptance criteria

The first narrative content pack can be considered ready when:
1. one timeline preset and the relative clock are defined without fabricated exact dates;
2. East Blue is selectable as a starting region;
3. a small starter set of island/community records is internally consistent;
4. a player birth/family origin can be generated from data;
5. at least three childhood/community/work events have valid triggers and choices;
6. event outcomes create memories and journal entries using supported engine effects;
7. no canon character encounter occurs unless schedule and location rules permit it;
8. a quiet civilian life remains playable and produces a meaningful biography.

## 13. Questions for the technical owner

Please inspect the current code and confirm:
- What is the actual world registry shape and where are worlds selected?
- Can the current save state safely hold a namespaced world data object?
- What event effect types exist today, and which of the illustrative effects are not supported?
- How are regions/locations and NPC presence represented?
- Is there a place to attach a month-relative world clock and timeline branch without changing the existing time loop?
- Which existing functions own journal, news, family, death, and save migration?

Until these are answered, this contract must be treated as a proposal rather than an implementation-ready schema.
