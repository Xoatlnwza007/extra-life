# Roger Era Content Pack — Narrative Design Draft

- Owner: AI A — Narrative / World Content
- Status: Draft 0.1; pending engine compatibility and canon schedule review
- Target: Extend the existing One Piece world (OP) in the forked Extra Life project.
- Implementation: Not implemented. No game source changes are authorized by this document.

## 1. Player promise

The Roger era is a playable historical period, not a single cameo. The player may be born into an ordinary family and choose any supported life path: pirate, Marine, bounty hunter, revolutionary, merchant, shipwright, doctor, sailor, or civilian.

A pirate player may hear rumors about Roger, see his crew at a distance, meet a member, earn repeated contact, cooperate on a mission, travel with them temporarily, or in exceptional circumstances receive an invitation to join the Roger Pirates. The player may also refuse, become a rival, oppose them, or never meet them. Selecting the pirate career alone must never guarantee an encounter or recruitment.

## 2. Timeline

Proposed preset ID: roger_era.

Do not invent an absolute year or month. Use the existing game clock and add verified relative anchors only after technical review confirms how the current year/month fields are initialized.

Chronology should distinguish:
- Roger and his crew actively operating.
- Major voyages and encounters, scheduled only in verified time/location windows.
- The final voyage and discovery, treated as rare late-era historical events rather than routine port encounters.
- Roger's surrender/execution as the era-ending transition.
- The Great Pirate Age as a separate later preset.

For each canon anchor, record its stable ID, ordering, date precision, verification status, location/region, participants, player access (witness / influence / hear about / unavailable), and divergence consequences. If age, location, or crew membership is uncertain, do not enable direct encounters until verified.

## 3. Roger Pirates as an autonomous crew

Treat the Roger Pirates as an existing-world faction/crew/NPC group, not a new simulation engine. Where supported, track:
- crew identity and captain;
- members and their individual availability;
- current location/route and voyage phase;
- objectives, reputation, allies, rivals, and conflicts;
- relationship with the player;
- independent decisions to accept, refuse, postpone, or end cooperation.

The player is never inserted into the crew's history by default. If recruited, record when, why, and under which canon/divergence mode they joined.

## 4. Encounter ladder

| Stage | Situation | Requirements |
|---|---|---|
| 0 | Hear rumors or read reports about Roger's crew | Roger-era timeline and credible information source |
| 1 | See the crew or ship from a distance | Valid time, region, and player location |
| 2 | Indirect contact through a port, merchant, repair job, medical help, or delivery | Plausible intermediary and location |
| 3 | Brief encounter with a crew member | Member schedule and location match |
| 4 | Earn trust through help, work, rescue, or shared danger | Prior contact and credible contribution |
| 5 | Temporary alliance or shared voyage | Mutual goal, trust, and compatible faction state |
| 6 | Rare recruitment invitation | Exceptional trust, crew approval, plausible role, open opportunity, and explicit player acceptance |
| R | Rivalry or opposition | Conflicting goals and a valid encounter context |

This is not a required linear quest. The player may remain at any stage, miss the crew, or take a rival route. Repeated encounters need a plausible travel or shared-objective reason.

## 5. Training and mentorship

Possible lessons include seamanship, navigation, ship maintenance, cooking, medicine, discipline, leadership, and combat fundamentals. Training must be earned through contact and effort, not granted as an automatic reward for meeting a famous character.

Use only stats and training effects already supported by the game. If a skill is not represented, create a memory or future event hook rather than adding an unsupported numeric field. Haki and Devil Fruit growth must follow the actual existing One Piece mechanics and remain rare.

## 6. Original event seeds

These are original scenario concepts, not claims about canon events. All trigger/effect values remain pending engine mapping.

1. roger_rumor_at_port — ข่าวลือที่ท่าเรือ: a sailor shares conflicting stories; investigate, dismiss, ask questions, or spread the rumor.
2. roger_ship_on_horizon — เงาเรือกลางเส้นขอบฟ้า: spot the crew at a distance; approach, observe, report, or keep clear.
3. roger_crew_port_crisis — เหตุวุ่นวายที่ท่าเรือ: a local crisis places the player and a crew member in the same location; choices determine who is helped.
4. roger_crew_supply_job — งานส่งเสบียง: accept, negotiate, refuse, or report a supply job connected to a credible intermediary.
5. roger_crew_rescue — ช่วยเหลือกลางทะเล: assist a ship in danger if route, vessel, and timing permit.
6. roger_training_offer — บทฝึกจากลูกเรือ: after trust is earned, a crew member offers instruction; accept, defer, request another lesson, or decline.
7. roger_temporary_alliance — พันธมิตรชั่วคราว: cooperate on a shared objective, negotiate terms, remain neutral, or side with another party.
8. roger_recruitment_invitation — คำชวนร่วมเรือ: an exceptional invitation; join, ask for time, or refuse because of personal obligations.
9. roger_rival_encounter — คู่แข่งกลางเส้นทาง: negotiate, compete, retreat, or fight if the current combat system supports it.

## 7. Other player life paths

- Pirate: build an independent crew, seek Roger's crew, become an ally/rival, or avoid famous pirates.
- Marine: investigate pirate activity, protect civilians, follow orders, or face conflicts of conscience.
- Bounty hunter: pursue only contracts that exist in the selected timeline, or decide the risk is too high.
- Civilian, merchant, shipwright, doctor: supply ships, treat injuries, repair vessels, protect family, or become a trusted port contact.
- Revolutionary/political actor: follow original political stories and intersect with Roger only when a credible shared event exists.

No path is forced into a battle with Roger. A civilian life can still reflect the era through trade, law, family safety, and local politics.

## 8. Canon integrity and divergence

Default to canon-guarded mode. The player may influence local events and personal relationships without automatically rewriting world history. A major intervention must create a recorded timeline branch. Parallel-history and open-sandbox modes may allow greater divergence, but still record what changed.

Do not promise that the player can prevent Roger's execution or rewrite every famous event in the default mode. Such outcomes require a clearly selected divergent sandbox and a separate design.

## 9. Technical compatibility questions

Before implementation, verify:
- whether the existing OP world already has Roger-era events or is mostly later-era content;
- how W.canon, W.lore, W.pool, W.meets, and W.acts can represent staged encounters;
- whether S.year and S.mo can distinguish the era without unsafe save changes;
- how existing relationship fields can track crew members;
- which career/faction transitions and training effects are actually supported;
- how to avoid creating a second crew, combat, event, or relationship engine.

The first implementation must reuse the existing One Piece world and existing life/event systems, with only the smallest necessary additions.
