const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDatasets, loadDatasets } = require('../scripts/validate-canon.js');

test('first-tranche canon and story data passes structural validation', () => {
  const result = validateDatasets(loadDatasets());
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.counts.arcs, 20);
  assert.equal(result.counts.events, 21);
  assert.equal(result.counts.scenario_hooks, 21);
  assert.equal(result.counts.locations, 21);
  assert.equal(result.counts.factions, 36);
  assert.ok(result.counts.characters >= 40);
});

test('official manga arc ranges are sequential and Elbaph remains open-ended through the latest verified chapter', () => {
  const { arcs } = loadDatasets();
  const arcData = require('../data/canon/arcs.json');
  assert.equal(arcData.last_verified_chapter, 1199);
  assert.equal(arcData.current_arc_id, 'elbaph');
  assert.equal(arcs[0].chapter_start, 1);
  assert.equal(arcs.at(-1).id, 'elbaph');
  assert.equal(arcs.at(-1).chapter_end, null);
  assert.equal(arcs.at(-1).ongoing, true);
});

test('events resolve to existing locations, factions and characters', () => {
  const { events, locations, factions, characters } = loadDatasets();
  const locationIds = new Set(locations.map(item => item.id));
  const factionIds = new Set(factions.map(item => item.id));
  const characterIds = new Set(characters.map(item => item.id));
  for (const event of events) {
    assert.ok(locationIds.has(event.location_id), event.id + ' location');
    assert.equal(event.chapter_range_scope, 'arc_span_not_exact_event_chapters');
    assert.ok(event.involved_faction_ids.length > 0, event.id + ' factions');
    assert.ok(event.involved_faction_ids.every(id => factionIds.has(id)), event.id + ' faction refs');
    assert.ok(event.involved_character_ids.every(id => characterIds.has(id)), event.id + ' character refs');
  }
});


test('verified event chapter milestones stay within their arcs and include sources', () => {
  const { arcs, events } = loadDatasets();
  const arcById = new Map(arcs.map(arc => [arc.id, arc]));
  let milestoneCount = 0;
  let eventCount = 0;
  for (const event of events) {
    if (!event.chapter_milestones) continue;
    eventCount++;
    const arc = arcById.get(event.arc_id);
    for (const milestone of event.chapter_milestones) {
      milestoneCount++;
      assert.ok(Number.isInteger(milestone.chapter), event.id + ' chapter number');
      assert.ok(milestone.chapter >= arc.chapter_start, event.id + ' chapter lower bound');
      if (arc.chapter_end !== null) assert.ok(milestone.chapter <= arc.chapter_end, event.id + ' chapter upper bound');
      assert.ok(milestone.source_url.startsWith('https://'), event.id + ' source');
    }
  }
  assert.equal(eventCount, 7);
  assert.equal(milestoneCount, 11);
});

test('all 19 major cover-story serials and two short follow-ups are catalogued separately from the main timeline', () => {
  const { coverStories, events } = loadDatasets();
  assert.equal(coverStories.length, 21);
  assert.equal(coverStories.filter(story => story.catalogue_group === 'major_serial').length, 19);
  assert.equal(coverStories.filter(story => story.catalogue_group === 'supplemental_short_run').length, 2);
  assert.equal(new Set(coverStories.map(story => story.id)).size, 21);
  assert.ok(coverStories.every(story => story.chapter_range && story.chapter_range.start < story.chapter_range.end));
  assert.ok(coverStories.every(story => story.story_use && story.source_urls.length >= 2));
  assert.ok(coverStories.every(story => story.canon_status === 'cover_story'));
  const fleet = coverStories.find(story => story.id === 'straw_hat_grand_fleet_stories');
  assert.deepEqual(fleet.chapter_range, { start: 864, end: 919 });
  assert.ok(events.every(event => event.canon_status === 'manga_canon'));
});


test('each canon anchor has an optional three-path scenario that cannot force canon outcomes', () => {
  const { events, scenarioHooks } = loadDatasets();
  assert.equal(scenarioHooks.length, events.length);
  const eventIds = new Set(events.map(event => event.id));
  for (const scenario of scenarioHooks) {
    assert.ok(eventIds.has(scenario.event_id), scenario.id + ' event reference');
    assert.equal(scenario.choices.length, 3, scenario.id + ' choice count');
    assert.equal(scenario.canon_effect, 'none', scenario.id + ' canon isolation');
    assert.equal(scenario.outcome_scope, 'local_world_state', scenario.id + ' outcome scope');
    assert.equal(scenario.player_can_override, true, scenario.id + ' player override');
    assert.ok(scenario.fail_forward.length > 0, scenario.id + ' fail forward');
  }
});

test('all community-inspired story ideas remain optional sandbox-only content', () => {
  const { fanIdeas } = loadDatasets();
  assert.equal(fanIdeas.length, 16);
  assert.equal(new Set(fanIdeas.map(idea => idea.id)).size, 16);
  for (const idea of fanIdeas) {
    assert.equal(idea.canon_status, 'fanon_sandbox');
    assert.equal(idea.play_scope, 'sandbox_only');
    assert.ok(idea.source_url.startsWith('https://'));
    assert.ok(idea.design_notes.length > 0);
    assert.ok(idea.source_url.startsWith('https://www.reddit.com/') || idea.source_url.startsWith('https://www.fanfiction.net/'));
  }
});

test('canon story anchors allow the player to diverge from the reference timeline', () => {
  const { arcs, events } = loadDatasets();
  assert.ok(arcs.every(arc => arc.player_divergence_allowed === true));
  assert.ok(events.every(event => event.player_can_override === true));
});


test('cover-story adaptations are original multi-stage sandbox quests, not canon retellings', () => {
  const data = loadDatasets();
  const stories = new Set(data.coverStories.map(story => story.id));
  assert.equal(data.coverStoryQuests.length, 6);
  for (const quest of data.coverStoryQuests) {
    assert.ok(stories.has(quest.inspired_by_cover_story_id));
    assert.equal(quest.canon_status, 'optional_original');
    assert.equal(quest.play_scope, 'sandbox_only');
    assert.equal(quest.canon_effect, 'none');
    assert.equal(quest.player_can_override, true);
    assert.ok(quest.stages.length >= 3);
    assert.ok(quest.stages.every(stage => stage.fail_forward && stage.approaches.length >= 2));
  }
});

test('NPC and settlement rules use bounded local state and cannot rewrite canon', () => {
  const { worldState } = loadDatasets();
  assert.equal(worldState.state_variables.length, 5);
  for (const variable of worldState.state_variables) {
    assert.ok(variable.min <= variable.default && variable.default <= variable.max);
  }
  assert.equal(worldState.rules.length, 7);
  const stateIds = new Set(worldState.state_variables.map(item => item.id));
  for (const rule of worldState.rules) {
    assert.equal(rule.cap_each_tick, true);
    assert.ok(rule.effects.every(effect => stateIds.has(effect.state)));
  }
  assert.ok(worldState.safeguards.length >= 5);
});

test('random events are optional, conditional, spoiler-gated and canon-isolated', () => {
  const { randomEvents } = loadDatasets();
  assert.equal(randomEvents.length, 10);
  for (const event of randomEvents) {
    assert.ok(event.weight > 0);
    assert.ok(event.conditions.length > 0);
    assert.ok(event.choices.length >= 2);
    assert.equal(event.canon_effect, 'none');
    assert.ok(event.spoiler_gate_arc);
    assert.ok(event.fail_forward.length > 0);
  }
});
