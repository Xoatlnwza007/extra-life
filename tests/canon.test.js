const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDatasets, loadDatasets } = require('../scripts/validate-canon.js');

test('first-tranche canon and story data passes structural validation', () => {
  const result = validateDatasets(loadDatasets());
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.counts.arcs, 20);
  assert.equal(result.counts.events, 21);
  assert.equal(result.counts.locations, 21);
  assert.equal(result.counts.factions, 36);
  assert.ok(result.counts.characters >= 40);
});

test('official manga arc ranges are sequential and Elbaph remains open-ended', () => {
  const { arcs } = loadDatasets();
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

test('cover stories remain separate from the main manga event timeline', () => {
  const { coverStories, events } = loadDatasets();
  assert.ok(coverStories.length >= 5);
  assert.ok(coverStories.every(story => story.canon_status === 'cover_story'));
  const fleet = coverStories.find(story => story.id === 'straw_hat_grand_fleet_stories');
  assert.deepEqual(fleet.chapter_range, { start: 864, end: 919 });
  assert.ok(events.every(event => event.canon_status === 'manga_canon'));
});

test('community-derived ideas are sandbox-only and cannot alter canon', () => {
  const { fanIdeas } = loadDatasets();
  assert.ok(fanIdeas.length >= 5);
  for (const idea of fanIdeas) {
    assert.equal(idea.canon_status, 'fanon_sandbox');
    assert.equal(idea.play_scope, 'sandbox_only');
    assert.ok(idea.source_url.startsWith('https://'));
    assert.ok(idea.design_notes.length > 0);
  }
});

test('canon story anchors allow the player to diverge from the reference timeline', () => {
  const { arcs, events } = loadDatasets();
  assert.ok(arcs.every(arc => arc.player_divergence_allowed === true));
  assert.ok(events.every(event => event.player_can_override === true));
});
