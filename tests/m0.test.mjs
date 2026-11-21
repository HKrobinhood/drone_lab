import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TUTORIAL_LEVELS, CHALLENGE_LEVELS, getLevelsByMode, getAllLevels } from '../src/levels.js';
import {
  STORAGE_KEY,
  createDefaultProgress,
  loadProgress,
  saveProgress,
  isLevelUnlocked,
  getBestStars,
  isFirstPlaythrough,
  getModeSummary
} from '../src/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key)
  };
}

describe('M0 — Level Catalog & Metadata', () => {
  it('defines 4 Tutorial Village levels and 6 Challenge levels with required fields', () => {
    assert.equal(TUTORIAL_LEVELS.length, 4);
    assert.equal(CHALLENGE_LEVELS.length, 6);
    assert.equal(getAllLevels().length, 10);
    assert.deepEqual(getLevelsByMode('tutorial'), TUTORIAL_LEVELS);
    assert.deepEqual(getLevelsByMode('challenge'), CHALLENGE_LEVELS);

    for (const lvl of getAllLevels()) {
      assert.ok(lvl.id && typeof lvl.id === 'string');
      assert.ok(lvl.name && typeof lvl.name === 'string');
      assert.ok(lvl.difficulty && typeof lvl.difficulty === 'string');
      assert.ok(lvl.learningFocus && typeof lvl.learningFocus === 'string');
    }
  });
});

describe('M0 — Storage & Progress Persistence', () => {
  it('initializes first tutorial and first challenge level as unlocked with 0 stars', () => {
    const mockStorage = createMockStorage();
    const progress = loadProgress(mockStorage);

    assert.equal(isLevelUnlocked(progress, 'tutorial-1'), true);
    assert.equal(isLevelUnlocked(progress, 'tutorial-2'), false);
    assert.equal(isLevelUnlocked(progress, 'level-1'), true);
    assert.equal(isLevelUnlocked(progress, 'level-2'), false);
    assert.equal(getBestStars(progress, 'tutorial-1'), 0);
    assert.equal(isFirstPlaythrough(progress), true);
  });

  it('persists progress and computes mode summaries accurately', () => {
    const mockStorage = createMockStorage();
    const progress = createDefaultProgress();
    progress.stars['tutorial-1'] = 3;
    progress.unlocked['tutorial-2'] = true;
    progress.stars['level-1'] = 2;

    assert.equal(saveProgress(progress, mockStorage), true);
    assert.ok(mockStorage.getItem(STORAGE_KEY));

    const reloaded = loadProgress(mockStorage);
    assert.equal(isFirstPlaythrough(reloaded), false);
    assert.deepEqual(getModeSummary(reloaded, 'tutorial'), {
      totalLevels: 4,
      unlockedCount: 2,
      earnedStars: 3,
      maxStars: 12
    });
    assert.deepEqual(getModeSummary(reloaded, 'challenge'), {
      totalLevels: 6,
      unlockedCount: 1,
      earnedStars: 2,
      maxStars: 18
    });
  });

  it('falls back safely when localStorage contains malformed JSON', () => {
    const mockStorage = createMockStorage();
    mockStorage.setItem(STORAGE_KEY, '{bad-json');
    const progress = loadProgress(mockStorage);
    assert.equal(isLevelUnlocked(progress, 'tutorial-1'), true);
    assert.equal(isFirstPlaythrough(progress), true);
  });
});

describe('M0 — Start Screen & Player-Facing English UI Verification', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');
  const levelsJs = fs.readFileSync(path.join(rootDir, 'src/levels.js'), 'utf8');

  it('includes all required STEM sections, objectives, steps, and mode entry controls', () => {
    const requiredSnippets = [
      'Drone Lab',
      'PID Flight Challenge',
      'STEM Topic',
      'PID Control',
      'STEM Activity',
      'Tune PID to control a drone.',
      'Branches of STEM',
      'Engineering (Primary)',
      'Technology',
      'Game Overview',
      'Learning Objectives',
      'Understand PID control.',
      'Apply PID tuning.',
      'Analyse flight behaviour.',
      'Develop problem-solving skills.',
      'Start Game',
      'Tutorial Village',
      'Challenge Levels',
      'btn-start-game',
      'btn-enter-tutorials',
      'btn-enter-challenges'
    ];

    for (const snippet of requiredSnippets) {
      assert.ok(indexHtml.includes(snippet), `Expected index.html to include: ${snippet}`);
    }
  });

  it('contains no Chinese characters in player-visible HTML/JS files', () => {
    const cjkRegex = /[\u4e00-\u9fff]/;
    assert.equal(cjkRegex.test(indexHtml), false, 'index.html must be 100% English');
    assert.equal(cjkRegex.test(mainJs), false, 'src/main.js must be 100% English');
    assert.equal(cjkRegex.test(levelsJs), false, 'src/levels.js must be 100% English');
  });
});
