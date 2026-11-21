import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computePathFit, scoreFlightRun, getThresholdsForLevel } from '../src/scoring.js';
import { runLevelSimulation } from '../scripts/calibrate_levels.mjs';
import {
  createDefaultProgress,
  loadProgress,
  recordLevelResult,
  getBestStars,
  getBestPidReference,
  getModeSummary
} from '../src/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M4 — REF vs Actual Route Fitting Metric', () => {
  it('scores identical routes at 100% and penalizes spatial deviation cleanly', () => {
    const ref = [
      { x: 3, z: 0 },
      { x: 3, z: 6 },
      { x: 18, z: 6 }
    ];
    const exact = computePathFit(ref, ref);
    assert.equal(exact.pathDeviation, 0);
    assert.equal(exact.pathFitScore, 100);

    const closeActual = [
      { x: 3.1, z: 0 },
      { x: 3.2, z: 5.8 },
      { x: 18.0, z: 5.9 }
    ];
    const closeFit = computePathFit(ref, closeActual);
    assert.ok(closeFit.pathFitScore > 85 && closeFit.pathFitScore < 100);

    const wildActual = [
      { x: 3, z: 0 },
      { x: 8, z: 11 },
      { x: 14, z: 2 },
      { x: 21, z: 10 }
    ];
    const wildFit = computePathFit(ref, wildActual);
    assert.ok(wildFit.pathDeviation > closeFit.pathDeviation + 1.5);
    assert.ok(wildFit.pathFitScore < 45);
  });

  it('produces higher route fit and smoothness for well-tuned PID than flawed PID in real flight', () => {
    const rec = runLevelSimulation('level-1', { kp: 6.5, ki: 0.4, kd: 3.8 });
    const osc = runLevelSimulation('level-1', { kp: 13.0, ki: 0.4, kd: 0.8 });

    assert.equal(rec.feasible, true);
    assert.ok(rec.pathFitScore > 75, `Expected high pathFitScore, got ${rec.pathFitScore}`);
    assert.ok(rec.pathFitScore > osc.pathFitScore + 15, 'tuned PID must fit REF route far better than oscillating PID');
    assert.ok(rec.flightSmoothness > osc.flightSmoothness, 'tuned PID must be smoother than oscillating PID');
  });
});

describe('M4 — 1 to 3 Star Scoring & Calibration', () => {
  it('awards 0, 1, 2, or 3 stars accurately according to level thresholds', () => {
    const th = getThresholdsForLevel('level-1');

    const fail = scoreFlightRun({ status: 'failed' }, { completionTime: 10 }, 'level-1');
    assert.equal(fail.stars, 0);

    const oneStar = scoreFlightRun(
      { status: 'completed' },
      {
        completionTime: th.twoStar.maxTime + 10,
        maxOvershoot: 3.5,
        settlingTime: 8,
        pathFitScore: 40,
        flightSmoothness: 50,
        collisionCount: 0
      },
      'level-1'
    );
    assert.equal(oneStar.stars, 1);

    const twoStar = scoreFlightRun(
      { status: 'completed' },
      {
        completionTime: th.twoStar.maxTime - 5,
        maxOvershoot: th.twoStar.maxOvershoot - 0.1,
        settlingTime: th.threeStar.maxSettling + 2,
        pathFitScore: th.twoStar.minPathFit + 5,
        flightSmoothness: 55,
        collisionCount: 0
      },
      'level-1'
    );
    assert.equal(twoStar.stars, 2);

    const threeStar = scoreFlightRun(
      { status: 'completed' },
      {
        completionTime: th.threeStar.maxTime - 4,
        maxOvershoot: th.threeStar.maxOvershoot - 0.2,
        settlingTime: th.threeStar.maxSettling - 1,
        pathFitScore: th.threeStar.minPathFit + 8,
        flightSmoothness: th.threeStar.minSmoothness + 10,
        collisionCount: 0
      },
      'level-1'
    );
    assert.equal(threeStar.stars, 3);
  });

  it('earns 3 stars on real well-tuned runs across L1-L6', () => {
    const tunedByLevel = {
      'level-1': { kp: 9.8, ki: 0.3, kd: 3.1 },
      'level-2': { kp: 5.2, ki: 0.2, kd: 5.6 },
      'level-3': { kp: 6.4, ki: 1.4, kd: 4.6 },
      'level-4': { kp: 5.2, ki: 0.2, kd: 5.6 },
      'level-5': { kp: 6.8, ki: 1.9, kd: 5.0 },
      'level-6': { kp: 6.8, ki: 1.9, kd: 5.0 }
    };

    for (const [levelId, gains] of Object.entries(tunedByLevel)) {
      const simRes = runLevelSimulation(levelId, gains);
      assert.equal(simRes.feasible, true, `${levelId} must complete`);
      const scored = scoreFlightRun({ status: 'completed' }, simRes, levelId);
      assert.equal(scored.stars, 3, `Expected 3 stars for ${levelId}, got ${scored.stars} (${JSON.stringify(scored.checks3Star)})`);
    }
  });
});

describe('M4 — High Star Persistence & Result UI Verification', () => {
  it('persists highest star record without downgrading on lower-star replays', () => {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v))
    };

    let progress = createDefaultProgress();
    progress = recordLevelResult(
      progress,
      'level-1',
      {
        completed: true,
        stars: 3,
        pidParameters: { kp: 6.5, ki: 0.4, kd: 3.8 },
        metrics: { completionTime: 10, pathFitScore: 90, maxOvershoot: 0.4 }
      },
      'level-2',
      mockStorage
    );
    assert.equal(getBestStars(progress, 'level-1'), 3);
    assert.deepEqual(getBestPidReference(progress, 'level-1'), { kp: 6.5, ki: 0.4, kd: 3.8 });

    // Replaying and getting 1 star must NOT overwrite historical 3 stars or 3-star PID
    progress = recordLevelResult(
      progress,
      'level-1',
      {
        completed: true,
        stars: 1,
        pidParameters: { kp: 3.0, ki: 0.0, kd: 2.0 },
        metrics: { completionTime: 55, pathFitScore: 42, maxOvershoot: 3.1 }
      },
      'level-2',
      mockStorage
    );
    const reloaded = loadProgress(mockStorage);
    assert.equal(getBestStars(reloaded, 'level-1'), 3);
    assert.deepEqual(getBestPidReference(reloaded, 'level-1'), { kp: 6.5, ki: 0.4, kd: 3.8 });
    assert.equal(getModeSummary(reloaded, 'challenge').earnedStars, 3);
  });

  it('includes Result Screen elements & Route Fit UI in English only', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const scoringJs = fs.readFileSync(path.join(rootDir, 'src/scoring.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

    for (const id of [
      'view-result',
      'result-stars-display',
      'result-route-fit',
      'result-route-canvas',
      'result-checks-2star',
      'result-checks-3star',
      'btn-result-retry',
      'btn-result-next',
      'btn-result-levels'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    const cjkRegex = /[\u4e00-\u9fff]/;
    assert.equal(cjkRegex.test(indexHtml), false);
    assert.equal(cjkRegex.test(scoringJs), false);
    assert.equal(cjkRegex.test(mainJs), false);
  });
});
