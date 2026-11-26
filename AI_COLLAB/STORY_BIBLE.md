# One Piece Life Simulator — Story Bible

- **Owner:** AI A — Narrative / World Content
- **Status:** Draft 0.1 — narrative direction and content rules
- **Scope:** Story, world lore structure, timeline policy, island/faction/event design. This is a content specification, not game implementation.
- **Compatibility target:** Add One Piece as a selectable world in the existing Extra Life game. Preserve other worlds and the existing life-simulation loop.

## 1. Narrative identity

The game is a **life simulator set inside the One Piece world**, not a retelling of the Straw Hat crew's story. The player is an original person whose life can intersect with known events and characters, but does not have to.

The primary story is the player's biography:
- where and into which family they are born;
- what their home island, culture, species, and social class mean for their opportunities;
- which needs, bonds, fears, talents, values, and dreams shape their decisions;
- whether they become a pirate, Marine, bounty hunter, revolutionary, merchant, craftsperson, doctor, sailor, farmer, scholar, ruler, or another civilian;
- how their choices affect family, crew, island, faction, reputation, and the wider world;
- what remains after death: relationships, records, possessions, debts, promises, heirs, and consequences.

Canon characters are part of the living world, not mandatory quest-givers. A player may never meet a major canon character and still have a complete, satisfying life story.

## 2. Player promise and narrative pillars

1. **A life before a plot:** childhood, family, work, friendship, romance, hardship, ambition, aging, and death matter as much as combat.
2. **The sea is vast:** the player can choose a sea or region and is not forced onto the Straw Hats' route.
3. **Actions create history:** meaningful outcomes are recorded and can influence later events, relationships, news, and descendants.
4. **Power is earned and rare:** Devil Fruits, Haki, famous titles, high bounties, and access to elite organizations require credible circumstances and progression.
5. **Canon has boundaries:** canon people and events have dates/windows, locations, allegiances, and prerequisites. The simulator must not teleport them to serve a random encounter.
6. **The world does not wait:** factions, islands, trade, conflicts, and NPC lives continue while the player trains, works, travels, or rests.
7. **Many lives are valid:** a quiet civilian life is not a failed pirate story. A character can become influential without becoming the strongest fighter.

## 3. Timeline and canon policy

### 3.1 Use a relative world clock

The life simulator advances in months. Narrative content should use a world-relative clock instead of assuming a complete official calendar is available.

Recommended fields:
- `timelineId`: selected timeline preset;
- `worldMonth`: integer month since the save's chosen epoch;
- `anchorEventId`: known historical/canon event used as a reference, when applicable;
- `offsetMonths`: months before/after that anchor;
- `datePrecision`: `exact`, `relative`, `window`, or `unknown`;
- `canonStatus`: `canon`, `canon_inspired`, `original`, or `divergent`.

Do not invent exact calendar dates for events whose chronology is not established in the project's verified data. Store an ordering or time window and mark its precision.

### 3.2 Timeline start presets

The character-creation flow should offer era presets. The precise offsets can be data-tuned later; the IDs are stable content contracts.

| ID | Player-facing description | Narrative intent |
|---|---|---|
| `pre_roger_execution` | ก่อนยุคโจรสลัดครั้งใหญ่ | A world shaped by the old pirate age and the approach of a historic turning point |
| `early_great_pirate_age` | ช่วงเริ่มต้นยุคโจรสลัดครั้งใหญ่ | New crews, ambition, migration, and competition after the era-defining execution |
| `pre_romance_dawn` | ก่อนการออกทะเลของกลุ่มหมวกฟาง | A broad sandbox immediately before the familiar main-story journey |
| `romance_dawn` | ช่วงเริ่มต้นการผจญภัยของลูฟี่ | Canon events may begin in their established sequence; the player remains an independent character |
| `post_timeskip` | หลังช่วงเวลาข้ามสองปี | A changed world with changed power balances and opportunities |
| `sandbox` | เส้นเวลาอิสระ | Canon events are optional background material; original history can dominate |

Starting in a later era should not silently erase a character's earlier life. The character can be born before the selected era if the player chooses a custom birth age and the save has a consistent history.

### 3.3 Canon interaction modes

Offer three world rules, with `canon_guarded` as the recommended default.

- **Canon guarded (`canon_guarded`):** preserve major canon outcomes unless the player's accumulated actions satisfy an explicit divergence rule. Local events can change freely. A major change forks the timeline.
- **Parallel history (`parallel_history`):** canon characters and locations exist, but event outcomes are allowed to vary more readily.
- **Open sandbox (`open_sandbox`):** use the setting and factions as a foundation; do not require canon milestones to occur.

Never rewrite a past event silently. When the player causes a major divergence, create a branch record with the triggering event, month, actors, and consequences. Future event scheduling must consult the active branch.

### 3.4 Canon event integrity

Every canon event needs:
- a stable ID and a short original description;
- its time rule and confidence/precision;
- required and excluded world-state conditions;
- its valid location or region;
- participating character IDs and faction IDs;
- whether the player can observe, influence, interrupt, or only hear about it;
- possible outcomes and divergence severity;
- consequences for later events.

A canon character must not appear in a place or period without a valid schedule, travel route, or explicit story justification. If the player's location does not match, surface the event through news, rumor, a witness, or later records instead.

## 4. Character-origin story

Character creation should generate a believable social context, not just a stat roll.

### Birth and family
- birthplace and island culture;
- species/race and any locally relevant prejudice or advantage;
- family structure, guardians, siblings, status, occupation, wealth, and stability;
- birth circumstances such as ordinary birth, migration, orphaning, conflict displacement, or adoption;
- family bonds, inherited obligations, traditions, secrets, and rivalries.

Avoid making every rare background a special chosen-one origin. Rare circumstances should remain rare and have understandable effects.

### Childhood and formative experiences
Childhood events should alter traits, needs, bonds, learned skills, fears, dreams, and opportunities. Examples:
- helping in a family shop builds trust and trade familiarity;
- surviving a storm can create a fear of the sea or a desire to master navigation;
- witnessing Marine protection or abuse can shape respect, distrust, or a sense of justice;
- losing a family member can create grief, responsibility, or a long-term goal;
- meeting a traveling performer can inspire music, exploration, or storytelling.

Do not guarantee that every experience changes a numerical stat. Some events should create memories, flags, relationships, or future event hooks.

### Dreams and personal arcs
A dream is a long-term direction, not a fixed win condition. It may evolve after major events.
Examples: find a lost family member, map an uncharted route, become a doctor, protect a home island, build a ship, expose corruption, become a respected Marine, find an All Blue, discover history, or become Pirate King.
The simulator should support both familiar setting-inspired dreams and original personal dreams.

## 5. Seas, islands, and travel narrative

The starting region selector should cover:
- `east_blue`
- `west_blue`
- `north_blue`
- `south_blue`
- `paradise` (first half of the Grand Line)
- `new_world`
- `sky_islands` (special access route; not a normal sea)

An island is a narrative location with social and simulation context, not just a map label. Store:
- climate, terrain, settlement types, local resources, and hazards;
- controlling faction and local authority;
- public order, prosperity, inequality, and conflict;
- legal rules, customs, occupations, services, and prices;
- travel links and access requirements;
- notable original NPCs and canon NPC schedule references;
- event pools, rumors, and news topics;
- region-level consequences when local state changes.

### Starter location pool for content planning

These are examples for a future data pack, not a claim that every place is available at every timeline:
- **East Blue:** Dawn Island, Shells Town, Orange Town, Syrup Village, Baratie (as a sea-based destination).
- **West Blue:** Ohara (with strong timeline restrictions), selected original ports and islands.
- **North Blue:** Flevance (with strong timeline restrictions), Germa-linked locations, original ports.
- **South Blue:** Baterilla (with timeline restrictions), original islands and trade routes.
- **Paradise:** Reverse Mountain, Whiskey Peak, Little Garden, Drum Island, Alabasta, Water 7, Sabaody Archipelago.
- **New World:** Punk Hazard, Dressrosa, Zou, Whole Cake Island, Wano.
- **Sky routes:** Skypiea and other sky-island content should require a discovery/access condition, not appear as an ordinary starting port.

Use original island descriptions and event writing. Do not reproduce long dialogue or prose from the manga/anime.

### Travel as a story system

Travel should create time, cost, risk, and opportunities. A journey can generate:
- weather and navigation problems;
- repairs, shortages, sickness, rescue, and shipboard relationships;
- encounters with merchants, pirates, Marines, migrants, or unusual phenomena;
- discoveries, rumors, and detours;
- consequences for missed appointments, work, family, or scheduled events.

Travel risk should depend on route, ship, crew skills, weather, region, bounty/heat, and world state. Do not use random ambushes as the only sea content.

## 6. Factions and social conflicts

Faction membership should shape access, pressure, reputation, and choices. A character can also remain unaffiliated.

Core faction families:
- **World Government / Marines:** law, rank, jurisdiction, orders, justice philosophies, corruption, internal politics, and local protection.
- **Pirates:** crews, captains, alliances, territory, reputation, rivalries, codes, and internal loyalty.
- **Revolutionary movement:** cells, secrecy, ideals, recruitment, intelligence, and the risk to families.
- **Bounty hunters:** contracts, reputation, information, legality, and dangerous targets.
- **Civilians and commerce:** merchants, shipwrights, doctors, scholars, performers, farmers, fishers, port workers, and island leadership.
- **Underworld networks:** smuggling, information brokers, protection rackets, illegal auctions, and black-market supply.

Each faction should define goals, public reputation, internal cohesion, resources, rivals, allies, and methods. Faction reputation and personal relationships must remain separate: a player can be trusted by an individual while disliked by that person's organization.

## 7. Narrative event families

Use a mix of small daily/monthly experiences and infrequent high-impact events.

| Family | Examples | Main consequences |
|---|---|---|
| Family & childhood | birth, care, arguments, illness, inheritance, sibling milestones | bonds, needs, memories, family state |
| Community | festivals, shortages, local disputes, disasters, rebuilding | island stability, reputation, resources |
| Work & ambition | apprenticeship, promotion, failure, contracts, discovery | career, skills, money, contacts |
| Crew & travel | recruitment, loyalty tests, ship trouble, rescue, exploration | crew cohesion, ship state, route access |
| Faction | recruitment, orders, investigation, promotion, betrayal | rank, faction standing, heat |
| Conflict | raids, arrests, sieges, protests, protection, negotiation | injury, control, casualties, political state |
| Mystery & history | ruins, records, rumors, lost routes, forbidden research | knowledge, risk, long-term story hooks |
| Personal | romance, friendship, rivalry, grief, reconciliation, promises | relationships, dreams, family |
| Canon intersection | witness a known event, hear news, meet a canon person under valid conditions | timeline flags, reputation, optional quests |

Every high-impact event should present a meaningful response where reasonable. Outcomes should consider the character's abilities, relationships, personality, resources, and prior memories. The player should be allowed to decline or ignore many opportunities.

## 8. Life paths and story tone

Career labels are not destiny. Each path should have ordinary work, social relationships, setbacks, advancement, and exit options.

- **Pirate:** survival, crew loyalty, ambition, freedom, infamy, and the cost of violence.
- **Marine:** service, discipline, rank, justice, orders, and conflicts of conscience.
- **Bounty hunter:** contracts, research, capture versus lethal force, reputation, and risk.
- **Revolutionary:** secrecy, trust, sacrifice, organizing, and political consequences.
- **Civilian:** trade, craft, medicine, navigation, scholarship, performance, agriculture, local leadership, and family life.

Tone should combine adventure, humor, warmth, danger, and occasional tragedy. Serious events should be handled with weight; do not turn every month into melodrama.

## 9. News, journal, and legacy

### World news
News is generated from events that actually occurred in the active world state. Each item should have a source, publication month, region, involved IDs, reliability, and whether it is rumor or verified reporting.
Do not publish a global newspaper headline about a private event unless an NPC witnessed it, reported it, or the event became publicly visible.

### Life journal
Journal entries should be a readable biography generated from recorded memories and events, not a random flavor-text stream. Prefer a few meaningful entries over one generic entry per month.
Each entry should link to event IDs and preserve the character's point of view where possible.

### Death and inheritance
Death closes a life, not the save. Generate a factual life summary from recorded data: family, relationships, career, major choices, accomplishments, failures, known discoveries, cause/place/time of death, and unresolved goals.
A successor may inherit appropriate possessions, money, obligations, reputation, enemies, relationships, and memories through family records. Do not transfer skills or personal relationships automatically as if they belonged to the successor.

## 10. Content quality and safety rails

- Do not make the player the center of every canon event.
- Do not make every random NPC secretly important.
- Do not spawn a Devil Fruit, advanced Haki, rare species, or a famous title merely to create excitement.
- Do not force combat into civilian or family events.
- Avoid deterministic moral labels; show competing motives and consequences.
- Keep named canon characters recognizable in role and constraints, but write original summaries and dialogue.
- Maintain continuity: death, injuries, promises, faction changes, travel time, and family events must be respected later.
- Allow a player to live, age, retire, fail, and die without completing a grand quest.
- Keep the interface and all player-facing narrative text in Thai first; stable IDs and developer-facing keys may remain English.

## 11. Narrative production order

1. Establish the relative timeline and the canon event integrity rules.
2. Create a small East Blue starter content pack with a few islands, local NPCs, event pools, and news.
3. Define original character origins, family templates, childhood events, and dream templates.
4. Add faction and career event pools.
5. Add travel and regional simulation content.
6. Expand to Paradise, other Blues, New World, and special regions.
7. Add canon character schedules and carefully gated canon intersections.
8. Add post-death biography and successor-specific legacy events.

**First playable narrative target:** a character can be born in an East Blue island community, experience a short childhood, choose a personal ambition, enter an ordinary career or begin a sea journey, form at least one meaningful relationship, encounter a locally grounded event, and have those experiences appear in their journal. No Devil Fruit or canon-character encounter is required for this slice.


## Roger Era — additional playable historical period

The Roger era is a full playable period, not a cameo. Add the stable proposed timeline preset ID "roger_era". Do not invent an absolute start year or month: use the existing game clock and verified relative anchors once technical review confirms how the current year/month fields are initialized. The era ends at Roger's surrender/execution; the Great Pirate Age is a separate later preset.

A player may live as a pirate, Marine, bounty hunter, revolutionary, merchant, shipwright, doctor, sailor, or ordinary civilian. Roger and his crew remain autonomous characters with their own goals, route, schedule, and decisions. The player is not automatically present at every famous voyage or historical milestone.

### Roger-era encounter ladder

1. Rumors and news about Roger's crew, from credible sources.
2. Distant sightings when the crew's location and the player's location match.
3. Indirect contact through a port, delivery, repair, medical help, trade, or intermediary.
4. Brief personal encounters with a crew member under a valid time/location window.
5. Repeated contact and earned trust through meaningful choices.
6. Temporary cooperation, shared travel, rescue, or fighting beside the crew.
7. Rare invitation to join the Roger Pirates, requiring trust, a credible contribution, crew approval, a plausible role, and the player's explicit acceptance.
8. Rivalry or opposition, including refusal, competing goals, faction conflict, or combat when the existing combat system supports it.

This is not a mandatory linear quest. A pirate career does not guarantee meeting or joining Roger. The player can miss the crew entirely and still have a complete life story. Crew members may refuse, depart, or continue their voyage without the player.

### Training and relationships

Training or mentorship can emerge after repeated contact and demonstrated effort. Use the existing relationship and training mechanics where possible. Grant only effects already supported by the engine; otherwise record a memory or future story hook rather than inventing new stats. Crew recruitment must preserve the player's prior family, career, memories, and obligations.

### Canon integrity

Roger must never spawn as a random encounter anywhere. Direct appearances require verified time, location, and character availability. If the player is elsewhere, use rumors, witnesses, or news. In canon-guarded mode, preserve major historical outcomes unless an explicit divergence rule is met. Record any major divergence as a timeline branch. Do not promise that the player can prevent Roger's execution in the default mode.

### Roger-era event family

Add event concepts for port rumors, distant ship sightings, a port crisis, supply work, a sea rescue, a training offer, temporary alliance, recruitment invitation, and rivalry. These are narrative proposals only; map their triggers, choices, and effects to the existing event callback system before implementation.
