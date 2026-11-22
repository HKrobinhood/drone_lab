import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STORY_THEME,
  STORY_ACTS,
  STORY_ENDINGS,
  MAP_ZONES,
  STORY_MISSIONS,
  getStoryMission,
  getAllStoryMissions,
  getRecommendedCurrentNodeId,
  countMissionCardWords,
  getSceneThemeConfig,
  renderMissionMapBackdropSvg,
  renderMissionCardIllustrationSvg,
  renderFlightEngineerBadgeSvg
} from '../src/story.js';
import { getSceneById } from '../src/scenes.js';
import { createDefaultProgress, recordLevelResult } from '../src/storage.js';
import { STORY_PIP_MOODS, renderPipRobotSvg, resolvePipMood } from '../src/visual_aids.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

describe('M7 — SKYGUARD Story Structure, Show-Don\'t-Tell & Level Alignment', () => {
  it('maps all 4 Tutorial Village and 6 Challenge Levels onto Act I, Act II, and Act III cleanly', () => {
    assert.equal(STORY_THEME.brand, 'Project SKYGUARD');
    assert.equal(STORY_ACTS.act1.label, 'Act I — Drone Academy');
    assert.equal(STORY_ACTS.act2.label, 'Act II — Rescue Missions');
    assert.equal(STORY_ACTS.act3.label, 'Act III — Flight Engineer');
    assert.equal(STORY_ENDINGS.act1Complete.line, "Training Complete! You're ready for rescue missions!");
    assert.equal(
      STORY_ENDINGS.act3Complete.line,
      "Mission accomplished! You're now a SKYGUARD Flight Engineer!"
    );

    const missions = getAllStoryMissions();
    assert.equal(missions.length, 10);

    for (const m of missions) {
      const scene = getSceneById(m.id);
      assert.ok(scene, `Story mission ${m.id} must map to an existing real scene`);
      assert.equal(scene.mode, m.mode);
      assert.ok(m.storyTitle.length > 0);
      assert.ok(m.objective.length > 0);
      assert.ok(Array.isArray(m.conditions) && m.conditions.length >= 1 && m.conditions.length <= 3);

      // Show, Don't Tell word budgets: PIP <= 15 words, Mission Card < 40 words
      const pipWords = wordCount(m.pipLine);
      assert.ok(pipWords <= 15, `${m.id} PIP line exceeds 15 words (${pipWords}): "${m.pipLine}"`);
      const cardWords = countMissionCardWords(m);
      assert.ok(cardWords < 40, `${m.id} Mission Card exceeds 40 words (${cardWords})`);
    }
  });

  it('includes all 7 required Cartoon Mission Map zones and non-overlapping node coordinates', () => {
    const requiredZones = [
      'Drone Academy',
      'Rescue Base',
      'City Rooftops',
      'Cargo Station',
      'Narrow Passage',
      'Storm Zone',
      'Final Rescue Site'
    ];
    const zoneNames = MAP_ZONES.map((z) => z.name);
    for (const name of requiredZones) {
      assert.ok(zoneNames.includes(name), `Missing map zone: ${name}`);
    }

    const svg = renderMissionMapBackdropSvg(createDefaultProgress());
    assert.ok(svg.includes('<svg') && svg.includes('</svg>'));
    for (const name of requiredZones) {
      assert.ok(svg.includes(name), `Rendered map SVG missing zone label: ${name}`);
    }

    // Verify all 10 map nodes are generously spaced (>= 95px apart on 1120x520 canvas)
    for (let i = 0; i < STORY_MISSIONS.length; i++) {
      for (let j = i + 1; j < STORY_MISSIONS.length; j++) {
        const a = STORY_MISSIONS[i].mapCoords;
        const b = STORY_MISSIONS[j].mapCoords;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        assert.ok(dist >= 95, `Nodes ${STORY_MISSIONS[i].id} and ${STORY_MISSIONS[j].id} too close (${dist.toFixed(1)}px)`);
      }
    }
  });

  it('tracks active map frontier accurately across new and progressing players', () => {
    let progress = createDefaultProgress();
    assert.equal(getRecommendedCurrentNodeId(progress, 'tutorial'), 'tutorial-1');
    assert.equal(getRecommendedCurrentNodeId(progress, 'challenge'), 'level-1');

    // Clear T1 -> T2 becomes active frontier
    progress = recordLevelResult(progress, 'tutorial-1', { completed: true, stars: 3 }, 'tutorial-2');
    assert.equal(getRecommendedCurrentNodeId(progress, 'tutorial'), 'tutorial-2');

    // Clear L1 -> L2 becomes active frontier
    progress = recordLevelResult(progress, 'level-1', { completed: true, stars: 2 }, 'level-2');
    assert.equal(getRecommendedCurrentNodeId(progress, 'challenge'), 'level-2');
  });
});

describe('M7 — PIP Story Expressions, Cartoon Art & Decoupled Scene Themes', () => {
  it('supports all 5 story PIP moods and generates lightweight inline SVG assets', () => {
    assert.deepEqual(STORY_PIP_MOODS, ['happy', 'curious', 'worried', 'encouraging', 'celebrating']);
    for (const mood of STORY_PIP_MOODS) {
      assert.equal(resolvePipMood(mood), mood);
      const svg = renderPipRobotSvg(mood);
      assert.ok(svg.includes(`pip-mood-${mood}`), `Missing mood class for ${mood}`);
    }

    for (const m of STORY_MISSIONS) {
      const art = renderMissionCardIllustrationSvg(m.id);
      assert.ok(art.includes('<svg') && art.includes('</svg>'));
      assert.ok(art.length < 6000, `Illustration for ${m.id} should remain lightweight (${art.length} bytes)`);

      const theme = getSceneThemeConfig(m.id);
      assert.ok(theme.skyTop && theme.skyBottom && theme.groundFill);
    }

    // Storm & Final Rescue include weather visual flags; Academy stays sunny
    assert.equal(getSceneThemeConfig('tutorial-1').rain, false);
    assert.equal(getSceneThemeConfig('level-5').rain, true);
    assert.equal(getSceneThemeConfig('level-6').rain, true);
    assert.equal(getSceneThemeConfig('level-6').searchlight, true);

    const badge = renderFlightEngineerBadgeSvg();
    assert.ok(badge.includes('SKYGUARD PRO') && badge.includes('<svg'));
  });

  it('integrates Mission Map, Mission Card, and Story Milestone DOM hooks in 100% English', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'styles/main.css'), 'utf8');
    const storyJs = fs.readFileSync(path.join(ROOT, 'src/story.js'), 'utf8');
    const rendererJs = fs.readFileSync(path.join(ROOT, 'src/renderer.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');

    for (const hook of [
      'id="mission-map-stage"',
      'id="mission-map-backdrop"',
      'id="map-preview-card"',
      'id="btn-map-play"',
      'id="mission-card-modal"',
      'id="btn-mission-card-tune"',
      'id="btn-mission-card-skip"',
      'id="result-story-milestone"',
      'id="map-engineer-pill"'
    ]) {
      assert.ok(html.includes(hook), `Missing Story Mode DOM hook: ${hook}`);
    }

    assert.ok(css.includes('.mission-map-stage'));
    assert.ok(css.includes('.map-node.is-newly-unlocked'));
    assert.ok(css.includes('.mission-card-dialog'));
    assert.ok(css.includes('.result-story-milestone.is-final-cert'));

    const cjk = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['index.html', html],
      ['src/story.js', storyJs],
      ['src/renderer.js', rendererJs],
      ['src/main.js', mainJs]
    ]) {
      assert.equal(cjk.test(content), false, `${name} must contain zero Chinese characters`);
    }
  });
});
