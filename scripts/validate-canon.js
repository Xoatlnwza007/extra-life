#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'canon');
const ALLOWED_TAGS = new Set(['manga_canon', 'cover_story', 'anime_only', 'fan_theory', 'fanon_sandbox', 'needs_review']);

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function validateDatasets(input = {}) {
  const arcs = input.arcs || readJson('arcs.json').arcs;
  const events = input.events || readJson('events.json').events;
  const coverStories = input.coverStories || readJson('cover_stories.json').cover_stories;
  const fanIdeas = input.fanIdeas || readJson('fan_ideas.json').ideas;
  const errors = [];
  const arcById = new Map();

  function uniqueIds(items, label) {
    const seen = new Set();
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !item.id.trim()) {
        errors.push(label + ': record has no stable id');
        continue;
      }
      if (seen.has(item.id)) errors.push(label + ': duplicate id ' + item.id);
      seen.add(item.id);
    }
  }

  function validateSources(item, label) {
    const sources = item.source_urls || (item.source_url ? [item.source_url] : []);
    if (!Array.isArray(sources) || sources.length === 0) {
      errors.push(label + ': missing source URL');
      return;
    }
    for (const source of sources) {
      if (!isHttpUrl(source)) errors.push(label + ': invalid source URL ' + String(source));
    }
  }

  uniqueIds(arcs, 'arcs');
  uniqueIds(events, 'events');
  uniqueIds(coverStories, 'cover_stories');
  uniqueIds(fanIdeas, 'fan_ideas');

  const orderedArcs = [...arcs].sort((a, b) => Number(a.order) - Number(b.order));
  for (let i = 0; i < orderedArcs.length; i++) {
    const arc = orderedArcs[i];
    if (!Number.isInteger(arc.order) || arc.order !== i + 1) errors.push('arcs: order must be sequential at ' + arc.id);
    if (!Number.isInteger(arc.chapter_start) || arc.chapter_start < 1) errors.push('arcs: invalid chapter_start at ' + arc.id);
    if (arc.chapter_end !== null && (!Number.isInteger(arc.chapter_end) || arc.chapter_end < arc.chapter_start)) {
      errors.push('arcs: invalid chapter_end at ' + arc.id);
    }
    if (!ALLOWED_TAGS.has(arc.canon_status)) errors.push('arcs: invalid canon_status at ' + arc.id);
    if (!Array.isArray(arc.locations) || !arc.locations.length) errors.push('arcs: locations missing at ' + arc.id);
    if (typeof arc.player_divergence_allowed !== 'boolean') errors.push('arcs: player_divergence_allowed missing at ' + arc.id);
    validateSources(arc, 'arc ' + arc.id);
    arcById.set(arc.id, arc);
    if (i > 0) {
      const previous = orderedArcs[i - 1];
      if (previous.chapter_end !== null && arc.chapter_start <= previous.chapter_end) {
        errors.push('arcs: overlapping chapter ranges between ' + previous.id + ' and ' + arc.id);
      }
      if (previous.chapter_end !== null && arc.chapter_start !== previous.chapter_end + 1) {
        errors.push('arcs: chapter gap between ' + previous.id + ' and ' + arc.id);
      }
      if (previous.chapter_end === null) errors.push('arcs: an ongoing arc must be last');
    }
  }

  uniqueIds(events, 'events');
  for (const event of events) {
    const arc = arcById.get(event.arc_id);
    if (!arc) errors.push('event ' + event.id + ': unknown arc_id ' + event.arc_id);
    if (!ALLOWED_TAGS.has(event.canon_status)) errors.push('event ' + event.id + ': invalid canon_status');
    if (event.canon_status !== 'manga_canon' && event.canon_status !== 'needs_review') {
      errors.push('event ' + event.id + ': factual timeline events must be manga_canon or needs_review');
    }
    if (!event.chapter_range || !Number.isInteger(event.chapter_range.start)) {
      errors.push('event ' + event.id + ': missing chapter range');
    } else if (arc && event.chapter_range.start < arc.chapter_start) {
      errors.push('event ' + event.id + ': starts before its arc');
    }
    if (event.chapter_range && event.chapter_range.end !== null) {
      if (!Number.isInteger(event.chapter_range.end) || event.chapter_range.end < event.chapter_range.start) {
        errors.push('event ' + event.id + ': invalid chapter range end');
      } else if (arc && arc.chapter_end !== null && event.chapter_range.end > arc.chapter_end) {
        errors.push('event ' + event.id + ': ends after its arc');
      }
    }
    if (!Array.isArray(event.involved_characters) || !Array.isArray(event.baseline_flags)) {
      errors.push('event ' + event.id + ': involved_characters and baseline_flags must be arrays');
    }
    if (event.player_can_override !== true) errors.push('event ' + event.id + ': player_can_override must remain true');
    if (event.timeline_policy === 'force_player') errors.push('event ' + event.id + ': canon cannot force player route');
    validateSources(event, 'event ' + event.id);
  }

  for (const story of coverStories) {
    if (story.canon_status !== 'cover_story') errors.push('cover_story ' + story.id + ': incorrect canon_status');
    if (story.chapter_range && (!Number.isInteger(story.chapter_range.start) ||
      !Number.isInteger(story.chapter_range.end) || story.chapter_range.end < story.chapter_range.start)) {
      errors.push('cover_story ' + story.id + ': invalid chapter range');
    }
    validateSources(story, 'cover_story ' + story.id);
  }

  for (const idea of fanIdeas) {
    if (idea.canon_status !== 'fanon_sandbox') errors.push('fan_idea ' + idea.id + ': must be fanon_sandbox');
    if (idea.play_scope !== 'sandbox_only') errors.push('fan_idea ' + idea.id + ': must be sandbox_only');
    if (!idea.original_game_hook || !idea.design_notes) errors.push('fan_idea ' + idea.id + ': missing adaptation or guardrail');
    if (typeof idea.source_url !== 'string' || !isHttpUrl(idea.source_url)) errors.push('fan_idea ' + idea.id + ': missing/invalid source_url');
  }

  return { ok: errors.length === 0, errors, counts: {
    arcs: arcs.length, events: events.length, cover_stories: coverStories.length, fan_ideas: fanIdeas.length
  }};
}

function loadDatasets() {
  return {
    arcs: readJson('arcs.json').arcs,
    events: readJson('events.json').events,
    coverStories: readJson('cover_stories.json').cover_stories,
    fanIdeas: readJson('fan_ideas.json').ideas
  };
}

if (require.main === module) {
  const result = validateDatasets();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.ok) process.exitCode = 1;
}

module.exports = { validateDatasets, loadDatasets };
