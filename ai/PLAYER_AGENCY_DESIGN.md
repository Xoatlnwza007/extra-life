# Player Agency and Living-World Design

## Product direction

The target is a browser-based One Piece life simulator with the breadth of choice associated with a tabletop role-playing campaign, without copying tabletop rules. The player is not required to follow Luffy, complete a prescribed quest chain, or choose a predefined heroic/pirate path. The world should continue to have its own motives and activity when the player ignores the main story.

The primary design test is: **Can a player set an unusual goal, pursue it through several valid approaches, and see the world and its NPCs react without the game forcing them back onto a single route?**

## Core principles

1. **Player-defined goals:** allow exploration, trade, training, relationships, crew building, settlement support, conflict, or simply living in the world.
2. **NPCs are agents, not inventory:** they have needs, careers, beliefs, goals, schedules, risk tolerance and the right to refuse offers or disagree with the player.
3. **Consequences, not rails:** choices alter local relationships, resources, reputation and opportunities. Failure should create new complications or leads rather than dead-end the campaign.
4. **Canon is reference, not destiny:** manga facts describe the reference timeline. The player's local story and optional sandbox outcomes must not silently rewrite canon.
5. **Fanon is opt-in sandbox material:** community-inspired ideas remain clearly classified and never presented as manga facts.
6. **Persistent continuity:** memories, relationships, crew state, location and world consequences survive save/load.
7. **Mobile-first interaction:** all eventual controls must remain usable on phones and tablets; no desktop-only management workflow.

## System boundaries

### A. Character and decision layer
- Stable character identity, personality traits, needs, skills, inventory, goals and risk tolerance.
- Candidate actions are generated from the character's context.
- Utility scoring considers needs, goals, personality, remembered outcomes, opportunity, relationships, risk and resource cost.
- The decision engine chooses only among valid actions supplied by the world layer.

### B. Crew layer (task 2)
- A crew has a captain, roster, roles, ship, supplies, treasury, reputation and history.
- Recruitment is a consent-based offer. Relationship, shared goals, role fit, personality and perceived risk influence willingness.
- Crew members have their own morale, loyalty, fatigue, skill and autonomy directive.
- Crew upkeep creates consequences, not arbitrary punishment. Shortages can reduce morale and loyalty; they do not silently delete members.
- Later social/NPC systems determine whether a member argues, requests change, takes leave or departs. A low score alone must not trigger an unexplained removal.

### C. NPC life layer (task 3)
- Career archetypes, daily schedule blocks, survival/social/purpose needs, money, inventory, location, skills and personal goals.
- Candidate actions are constrained by context: routes must exist, destinations must be reachable, required resources must be available, and inactive characters cannot act.
- The chosen action produces an explicit local outcome/world-effect record. The game layer decides how to apply it to settlements, markets and nearby actors.
- High-detail simulation should focus on nearby and story-relevant actors; distant populations can be advanced in coarse-grained batches to protect browser performance.

### D. Memory and relationship layer (task 4)
- Episodic memory records actor, target, witnesses, place, tags, emotion, salience, polarity, confidence and expiry.
- Recall is relevance-based (people, tags, place, importance and recency), not simply “read the last memory”.
- Relationships are multidimensional: trust, affection, respect, fear, rivalry and familiarity. Legacy scalar scores remain readable for old saves.
- Social reactions are decision inputs, not hard-coded dialogue or guaranteed outcomes. Personality and goals still matter.

### E. World and story layer (task 6)
- Canon arcs/events are reference data with source and spoiler gates.
- Player-created local outcomes are stored separately from canon facts.
- Optional story hooks, cover-story-inspired quests and random events are sandbox-only and can be ignored.
- A local consequence must not imply a global canon character outcome without an explicit, validated story rule.

## Time and simulation cadence: open integration decision

The existing game advances the player using a yearly action, while the current NPC population layer performs twelve logical monthly passes inside that yearly boundary. The new life-profile module defines daily schedule blocks. These are not yet unified.

Before integration, choose one coherent clock. Preferred direction: **event-driven world time**. Player actions consume a meaningful duration; the clock advances, NPCs perform due schedule/activity updates, and the world resolves relevant events. Waiting should be an explicit player choice. Do not run a full detailed simulation every browser frame.

Potential performance model:
- Nearby actors: detailed action/interaction simulation.
- Known but distant actors: lightweight scheduled state updates.
- Unobserved distant population: aggregate economy/faction changes.
- Deterministic seeded randomness in tests and reproducible event logs.

## Integration contracts

- Keep pure simulation helpers independent of DOM and storage.
- The game runtime owns authoritative state, UI, persistence and rendering.
- Each action returns a proposed result/world delta; validate preconditions before committing it.
- Apply state changes once per resolved action, never once per frame or page refresh.
- Keep actor IDs stable across saves; never identify characters by display name alone.
- Version new persisted structures and migrate legacy saves without discarding unknown fields.
- Avoid a second copy of the same crew, memory, relationship or NPC state in parallel objects.
- No runtime/HTML integration until the schemas and time cadence are reviewed together.

## Acceptance scenarios for the combined playtest

1. Start a pirate life, ignore the manga main story, and build a crew through conversation and consent-based offers.
2. Offer recruitment to an NPC with conflicting goals or low trust; they can decline and explain why through the interaction layer.
3. Maintain a crew over several in-world periods; food and wages affect morale, but do not force an unexplained departure.
4. Assign roles while allowing members to pursue personal goals and autonomous activities.
5. Let two NPCs form a friendship or rivalry without player involvement; both retain distinct memories of shared events.
6. Betray an NPC, leave the island, return later, and observe a context-sensitive reaction based on remembered events.
7. Attempt travel without a valid route; the action is rejected without teleporting or corrupting location.
8. Resolve an optional event in an unexpected way; local consequences appear without rewriting manga canon.
9. Save, reload, and continue with crew, NPC goals, memories, relationships, and local world state intact.
10. Run on phone and tablet layouts without tiny controls, clipped panels or forced horizontal scrolling.

## Current preparation status

- Task 2: consent-based crew recruitment, member condition, autonomy directives, supplies and upkeep helpers added.
- Task 3: separate career/schedule/needs/goals/action-planning module added; not connected to the monthly population loop.
- Task 4: separate episodic recall and multidimensional bond module added; legacy scalar relationships remain compatible.
- Task 6: canon and optional story data are in a separate open PR; not merged or connected to runtime.
- No new module in this branch is wired into the main HTML game yet.

## Recommended integration order after review

1. Reconcile the canon data schema and the player-agency data schemas; agree on stable IDs and spoiler gates.
2. Choose and document one world clock, replacing the current annual/monthly mismatch only with regression coverage.
3. Integrate memory and relationships as shared character-state services (avoid duplicate profile stores).
4. Integrate NPC life actions through validated world-effect transactions.
5. Extend crew UI and monthly/event-driven upkeep to use consent, morale, loyalty, skills and autonomy.
6. Add save migration and browser-level tests, then playtest the acceptance scenarios on phone and tablet.
