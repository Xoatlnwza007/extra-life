# East Blue Starter Pack — Narrative Content Draft

- **Owner:** AI A — Narrative / World Content
- **Status:** Draft 0.1 — content design only; pending engine compatibility review
- **Related:** `STORY_BIBLE.md`, `STORY_DATA_CONTRACT.md`
- **Implementation status:** Not implemented. No game source files are changed by this document.

## 1. Design target

Create the smallest convincing One Piece life-simulation start: a character is born into a local community, grows through a few formative experiences, develops a personal ambition, enters work or travel, forms relationships, and records meaningful events in a life journal.

The first slice must be enjoyable without:
- meeting a canon character;
- eating a Devil Fruit;
- possessing Haki;
- becoming a pirate or fighter;
- participating in a major canon event.

A peaceful civilian life is a complete valid playthrough.

## 2. Scope and content boundaries

### Included locations

| ID | Location | Use in the starter slice | Canon confidence |
|---|---|---|---|
| `dawn_island` | Dawn Island | Main birthplace region; rural settlements, Goa Kingdom social contrast, forest/mountain routes | Established setting location; local details must remain conservative |
| `foosha_village` | Foosha Village | Small coastal community; fishing, tavern, boats, family life | Established location on Dawn Island |
| `goa_kingdom` | Goa Kingdom | Social hierarchy, administration, trade, inequality, town services | Established setting; do not assume player has access to elite spaces |
| `shells_town` | Shells Town | Marine-influenced port town; jobs, repairs, legal pressure, recruitment rumors | Established East Blue location; exact authority and canon character presence are timeline-dependent |
| `orange_town` | Orange Town | Merchant community and recovery after local disruption | Established East Blue location; avoid assuming a specific event has occurred |
| `baratie` | Baratie | Optional sea-based destination and hospitality/work opportunity | Established floating restaurant in East Blue; access depends on route and means |

### Explicitly out of scope for the first slice

- Full Grand Line / New World map simulation.
- Canon-character schedules beyond a placeholder interface.
- Major canon battle reenactments.
- Devil Fruit acquisition and awakening content.
- Detailed Haki progression.
- Global political divergence simulation.

## 3. Timeline handling

Use the save's relative month counter. Do not assign fabricated absolute calendar dates.

Suggested starting presets:
- `before_main_story`: broad period before the familiar main journey; exact offset remains unverified.
- `early_main_story`: events may be scheduled only when verified time and location conditions are available.
- `open_east_blue_sandbox`: original local stories take priority; canon events are optional background.

Every location or event that depends on canon chronology must carry a time-confidence label:
- `verified`: supported by an approved project reference;
- `relative`: ordering is known, exact date is not;
- `window`: only a broad period is safe;
- `unknown`: do not schedule a direct appearance.

Until the canon schedule dataset is reviewed, starter events below are original local events and do not require canon character appearances.

## 4. Character origins

Origins are tendencies, not destiny. Apply only effects the engine can support; otherwise store as narrative tags/memories for later mapping.

| ID | Thai label | Starting situation | Story hooks |
|---|---|---|---|
| `origin_fishing_family` | ครอบครัวชาวประมง | Family relies on fishing, weather, and local trade | sea skills, family duty, storm memory |
| `origin_port_workers` | ครอบครัวแรงงานท่าเรือ | Family loads cargo, repairs nets, or maintains boats | contacts, physical work, labor disputes |
| `origin_small_shop` | ครอบครัวร้านค้าชุมชน | Family runs a modest shop or food stall | trade, debt, trust, customer relationships |
| `origin_goa_service` | ครอบครัวคนทำงานในอาณาจักร | Family works in domestic service, administration, or supply | class barriers, education access, divided loyalties |
| `origin_orphan_guardian` | เด็กที่เติบโตกับผู้ปกครอง | Raised by a guardian or community household | belonging, gratitude, searching for roots |
| `origin_traveling_family` | ครอบครัวเดินทางค้าขาย | Childhood includes movement between ports | adaptability, navigation interest, weak local roots |

Birth circumstances should be generated separately from origin: ordinary birth, adoption, migration, displacement, or orphaned childhood. Do not make hardship the default.

## 5. Original local NPC templates

These are original characters for the game, not canon characters. Names can be localized or randomized from a name pool.

| ID | Role | Personality / purpose | Relationship hooks |
|---|---|---|---|
| `npc_mara_net_mender` | ช่างซ่อมอวนสูงวัย | Patient, practical, remembers local families | mentor, neighbor, source of small work |
| `npc_toma_boat_runner` | เด็กส่งของท่าเรือ | Curious, impulsive, wants to see the world | childhood friend, rival, travel contact |
| `npc_ena_tavern_keeper` | เจ้าของร้านอาหารเล็ก | Warm but cautious, hears local rumors | employer, trusted adult, rumor source |
| `npc_bram_retired_sailor` | กะลาสีเกษียณ | Blunt, superstitious, knowledgeable about routes | navigation mentor, warning source |
| `npc_seli_market_vendor` | พ่อค้าแม่ค้าในตลาด | Sociable, observant, values fair dealing | trade contact, friend, debt dispute |
| `npc_rin_clinic_helper` | ผู้ช่วยสถานพยาบาล | Compassionate, overworked, dislikes violence | first-aid mentor, community bond |

NPCs should have stable IDs, homes, schedules or availability windows, relationships, and memories if supported by the engine. Do not spawn a new identity every time an event references the same person.

## 6. Starter event catalogue

All events below are original narrative proposals. Trigger values and effect types are placeholders until the technical review confirms supported engine mechanics. The engine must not execute unsupported effect types.

### Childhood and community

1. `event_help_repair_nets` — ช่วยซ่อมอวน
   - Trigger idea: childhood or early adolescence; coastal community; available family/community contact.
   - Choice: help after school / decline to play with friends / ask to be paid.
   - Story consequence: memory of responsibility, friendship or trust with the net mender, possible work familiarity.

2. `event_storm_shelter` — คืนที่พายุเข้า
   - Trigger idea: coastal home during a storm window.
   - Choice: help secure the house / assist a neighbor / stay safely indoors.
   - Story consequence: family bond, community reputation, or a remembered fear/respect for the sea. Injury is possible only if the engine has a fair risk and recovery model.

3. `event_market_missing_parcel` — พัสดุที่หายไปในตลาด
   - Trigger idea: character has access to the market and a vendor contact.
   - Choice: search carefully / ask witnesses / avoid getting involved.
   - Story consequence: small trust changes, a local contact, or a rumor; no forced combat.

### Adolescence and early work

4. `event_first_harbor_shift` — กะงานแรกที่ท่าเรือ
   - Trigger idea: age and local work eligibility; port access.
   - Choice: accept a safe beginner task / negotiate hours / refuse to protect study time.
   - Story consequence: first work memory, modest income if supported, and a career direction hint.

5. `event_old_sailor_route_lesson` — บทเรียนเส้นทางเดินเรือ
   - Trigger idea: meet the retired sailor; interest in travel or navigation.
   - Choice: listen and take notes / ask about a dangerous route / focus on another skill.
   - Story consequence: navigation-learning hook and a relationship memory; no automatic mastery.

6. `event_marine_recruitment_notice` — ประกาศรับสมัครทหารเรือ
   - Trigger idea: notice is publicly posted in a town with a Marine presence; age eligibility must be checked.
   - Choice: consider applying / ask about service conditions / ignore the notice.
   - Story consequence: career interest or faction-awareness memory; no forced recruitment.

### Young adult and travel

7. `event_baratie_work_offer` — ข้อเสนองานบนภัตตาคารลอยทะเล
   - Trigger idea: character reaches Baratie through a valid route and has a plausible introduction.
   - Choice: apply for kitchen or service work / ask for passage / decline.
   - Story consequence: work opportunity and travel-based relationships; no assumed meeting with named canon staff.

8. `event_family_departure_promise` — คำสัญญาก่อนออกเดินทาง
   - Trigger idea: character plans to leave their home community and has a close family bond.
   - Choice: promise to write / explain the risks honestly / postpone departure.
   - Story consequence: persistent promise memory that can be referenced by later family or journal events.

## 7. Dream templates

| ID | Thai label | Possible milestones |
|---|---|---|
| `dream_protect_home` | ปกป้องบ้านเกิด | help community; resolve a local threat; improve island resilience |
| `dream_map_the_sea` | ทำแผนที่ทะเล | learn navigation; complete a safe route; record an unfamiliar location |
| `dream_become_doctor` | เป็นหมอที่ช่วยคนได้ | assist at a clinic; study; provide care during a local crisis |
| `dream_build_a_ship` | สร้างเรือด้วยมือตัวเอง | learn repair; gather materials; complete a small boat project |
| `dream_open_a_shop` | เปิดกิจการของตัวเอง | learn trade; build contacts; save capital; serve a community |
| `dream_find_family` | ตามหาครอบครัวหรือรากเหง้า | collect credible clues; contact witnesses; choose whether to pursue the past |

Milestones should not all be mandatory. A dream can change after grief, discovery, friendship, or a major life choice.

## 8. First playable narrative sequence

This is an example flow, not a forced linear quest:

1. Create a character and select an East Blue origin.
2. Generate a household, guardian/family bonds, and one or two childhood memories.
3. During childhood, offer one community event when its trigger is valid.
4. During adolescence, surface one learning or work opportunity based on the character's interests and circumstances.
5. Let the player choose a dream, revise it, or have no grand dream.
6. At adulthood, offer local work, further study, faction application, or travel if affordable and plausible.
7. Record meaningful outcomes in a journal, not every routine action.
8. Allow the character to remain home, build a family, and continue a civilian career indefinitely.

## 9. News and journal rules for this pack

- A local rumor is not a verified newspaper report.
- Private family events remain private unless witnessed or reported.
- A journey can generate a travel note without implying a world-famous discovery.
- Journal entries should reference the actual event and the character's choice.
- If the character was absent, news can report an event only if a credible source exists.
- Never create a headline about a canon event until its timeline and location conditions are satisfied.

## 10. Acceptance checklist for narrative readiness

- [ ] At least three origins can be combined with multiple birth circumstances.
- [ ] At least four original local NPCs have stable identities and plausible roles.
- [ ] At least six events cover childhood, work, community, and personal relationships.
- [ ] Each event has a trigger concept, choices, and consequences.
- [ ] Unsupported effects are clearly marked as pending engine mapping.
- [ ] No event requires a Devil Fruit, Haki, combat, or canon-character encounter.
- [ ] A peaceful civilian path is supported.
- [ ] Journal and news are based only on recorded events and credible visibility.
- [ ] All direct canon appearances remain disabled until schedule data is validated.

## 11. Technical review requests

AI B / technical owner: please map this content to the actual engine and identify:
1. Which existing event fields can represent triggers, choices, and outcomes.
2. Whether original NPC identities, schedules, and relationships can be represented without new global systems.
3. How family/childhood memories and journal entries are stored today.
4. Whether age-gated events can be expressed safely.
5. Which of these events can be implemented as data-only content and which require engine work.

Do not implement the proposed effect names until they are matched to actual supported operations.
