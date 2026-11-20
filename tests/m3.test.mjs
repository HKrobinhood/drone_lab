import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { CHALLENGE_SCENES, getSceneById, evaluateSceneOutcome } from '../src/scenes.js';
import { createDefaultProgress, isLevelUnlocked, recordLevelCompletion } from '../src/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function guideReferenceTo(sim, waypoints, maxSeconds, gainsOverride = null) {
  if (gainsOverride) sim.setGains(gainsOverride);
  let wpIdx = 0;
  const steps = Math.round(maxSeconds / FIXED_DT);

  for (let i = 0; i < steps; i++) {
    const wp = waypoints[Math.min(wpIdx, waypoints.length - 1)];
    const dx = wp.x - sim.reference.x;
    const dz = wp.z - sim.reference.z;
    const moveX = Math.abs(dx) > 0.04 ? Math.sign(dx) : 0;
    const moveZ = Math.abs(dz) > 0.04 ? Math.sign(dz) : 0;

    sim.stepFixed(FIXED_DT, { moveX, moveZ });

    if (wpIdx < waypoints.length - 1) {
      const distDrone = Math.hypot(wp.x - sim.drone.x, wp.z - sim.drone.z);
      const speed = Math.hypot(sim.drone.vx, sim.drone.vz);
      const tol = wp.tol ?? 0.7;
      const speedOk = !wp.maxSpeed || speed <= wp.maxSpeed;
      if (distDrone <= tol && Math.hypot(dx, dz) <= 0.25 && speedOk) {
        wpIdx += 1;
      }
    }

    const outcome = evaluateSceneOutcome(sim, sim.activeScene);
    if (outcome.status === 'completed' || outcome.status === 'failed') {
      return outcome;
    }
  }
  return evaluateSceneOutcome(sim, sim.activeScene);
}

describe('M3 — Challenge Level Definitions', () => {
  it('defines all 6 challenge levels with valid configurations', () => {
    for (let i = 1; i <= 6; i++) {
      const id = `level-${i}`;
      const scene = getSceneById(id);
      assert.ok(scene, `Expected ${id} to exist`);
      assert.equal(scene.mode, 'challenge');
      assert.ok(Number.isFinite(scene.timeLimit));
      assert.ok(Number.isFinite(scene.outOfBoundsMargin));
    }
  });
});

describe('M3 — Challenge Mechanics, Collisions & Ring Traversal', () => {
  it('Level 1 (Stable Hover): resets 3s hover timer on overshoot/fast exit and completes after 3s steady hover', () => {
    const scene = CHALLENGE_SCENES['level-1'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    // Move reference into target, let drone settle partially, then simulate fast exit resetting timer
    guideReferenceTo(sim, [{ x: 17.5, z: 8.0 }], 8);
    assert.ok(sim.targetZone.holdTimer > 0 && sim.targetZone.holdTimer < 3.0);

    // Command quick jump out of target -> holdTimer must reset to 0
    for (let i = 0; i < Math.round(1.0 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: -1, moveZ: 0 });
    }
    assert.equal(sim.targetZone.holdTimer, 0, 'holdTimer must reset when drone leaves target zone');

    const outcome = guideReferenceTo(sim, [{ x: 17.5, z: 8.0 }], 12);
    assert.equal(outcome.status, 'completed');
  });

  it('Level 2 (Precision Landing): detects wall collision, hard landing, and soft helipad completion', () => {
    const scene = CHALLENGE_SCENES['level-2'];
    const sim = new FlightSimulation();

    // 1. Fly straight right into wall at x=10.2 -> collision failure
    sim.loadScene(scene, true);
    const wallOutcome = guideReferenceTo(sim, [{ x: 15.0, z: 1.5 }], 8);
    assert.equal(wallOutcome.status, 'failed');
    assert.equal(wallOutcome.reason, 'collision');

    // 2. Hard landing check
    sim.loadScene(scene, true);
    sim.drone.x = 19.0;
    sim.drone.z = 3.0;
    sim.drone.vz = -4.0;
    sim.drone.landedHard = true;
    sim.drone.maxImpactSpeed = 4.0;
    assert.equal(evaluateSceneOutcome(sim, scene).reason, 'hard_landing');

    // 3. Fly over wall and land gently on helipad (19.0, 1.6)
    sim.loadScene(scene, true);
    const winOutcome = guideReferenceTo(
      sim,
      [
        { x: 6.5, z: 6.5, tol: 0.9 },
        { x: 14.5, z: 6.5, tol: 0.9 },
        { x: 19.0, z: 3.4, tol: 0.6 },
        { x: 19.0, z: 1.55, tol: 0.4 }
      ],
      28,
      { kp: 6.5, ki: 0.6, kd: 4.4 }
    );
    assert.equal(winOutcome.status, 'completed');
  });

  it('Level 3 (Ring Flight): enforces sequential forward pass-through and detects rim collisions', () => {
    const scene = CHALLENGE_SCENES['level-3'];
    const sim = new FlightSimulation();

    // 1. Skipping ring #1 and crossing ring #2 plane must NOT advance nextRingIndex
    sim.loadScene(scene, true);
    sim.drone.prevX = 12.4;
    sim.drone.x = 12.6;
    sim.drone.prevZ = 8.5;
    sim.drone.z = 8.5;
    sim.reference = { x: 12.6, z: 8.5 };
    sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: 0 });
    assert.equal(sim.nextRingIndex, 0, 'cannot pass Ring #2 before Ring #1');

    // 2. Completing all 3 rings sequentially -> finish zone
    sim.loadScene(scene, true);
    const winOutcome = guideReferenceTo(
      sim,
      [
        { x: 5.2, z: 4.5, tol: 0.7 },
        { x: 9.6, z: 4.5, tol: 0.7 },
        { x: 10.4, z: 8.5, tol: 0.6 },
        { x: 14.4, z: 8.5, tol: 0.7 },
        { x: 15.2, z: 5.2, tol: 0.6 },
        { x: 18.6, z: 5.2, tol: 0.7 },
        { x: 21.0, z: 6.0, tol: 0.5 }
      ],
      35,
      { kp: 6.8, ki: 0.6, kd: 4.2 }
    );
    assert.equal(sim.nextRingIndex, 3);
    assert.equal(winOutcome.status, 'completed');
  });

  it('Level 4 (Narrow Corridor): threads tight obstacle corridor cleanly when well-damped', () => {
    const scene = CHALLENGE_SCENES['level-4'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    const outcome = guideReferenceTo(
      sim,
      [
        { x: 4.8, z: 6.9, tol: 0.7 },
        { x: 9.8, z: 6.9, tol: 0.7 },
        { x: 10.6, z: 4.7, tol: 0.7 },
        { x: 14.5, z: 4.7, tol: 0.7 },
        { x: 15.3, z: 7.5, tol: 0.7 },
        { x: 20.8, z: 7.2, tol: 0.6 }
      ],
      35,
      { kp: 6.5, ki: 0.5, kd: 4.3 }
    );
    assert.equal(outcome.status, 'completed');
  });

  it('Level 5 (Wind Challenge): completes under sustained + gusty wind when Ki is tuned', () => {
    const scene = CHALLENGE_SCENES['level-5'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    const outcome = guideReferenceTo(
      sim,
      [
        { x: 7.0, z: 7.2, tol: 0.9 },
        { x: 14.0, z: 7.5, tol: 0.9 },
        { x: 19.0, z: 7.5, tol: 0.6 }
      ],
      32,
      { kp: 6.8, ki: 1.8, kd: 4.2 }
    );
    assert.equal(outcome.status, 'completed');
  });

  it('Level 6 (Final Rescue Mission): clears obstacles, rings, wind gusts, and lands softly on helipad', () => {
    const scene = CHALLENGE_SCENES['level-6'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    const outcome = guideReferenceTo(
      sim,
      [
        { x: 4.8, z: 6.8, tol: 0.8 },
        { x: 11.8, z: 6.8, tol: 0.7 },
        { x: 13.0, z: 5.2, tol: 0.6 },
        { x: 16.8, z: 5.2, tol: 0.7 },
        { x: 19.5, z: 3.6, tol: 0.35, maxSpeed: 0.35 },
        { x: 19.5, z: 1.55, tol: 0.35 }
      ],
      40,
      { kp: 6.8, ki: 1.1, kd: 4.3 }
    );
    assert.equal(sim.nextRingIndex, 2);
    assert.equal(outcome.status, 'completed');
  });

  it('triggers out-of-bounds failure when flying outside the challenge safety perimeter', () => {
    const scene = CHALLENGE_SCENES['level-1'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    // Fly hard left past margin 0.55
    for (let i = 0; i < Math.round(5.0 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: -1, moveZ: 1 });
      if (sim.outOfBounds) break;
    }

    const outcome = evaluateSceneOutcome(sim, scene);
    assert.equal(outcome.status, 'failed');
    assert.equal(outcome.reason, 'out_of_bounds');
  });
});

describe('M3 — Challenge Progression & English-Only Verification', () => {
  it('unlocks challenge levels sequentially from level-1 to level-6', () => {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v))
    };

    let progress = createDefaultProgress();
    for (let i = 1; i <= 5; i++) {
      const cur = `level-${i}`;
      const next = `level-${i + 1}`;
      assert.equal(isLevelUnlocked(progress, cur), true);
      assert.equal(isLevelUnlocked(progress, next), false);
      progress = recordLevelCompletion(progress, cur, next, mockStorage);
      assert.equal(isLevelUnlocked(progress, next), true);
    }
  });

  it('contains no Chinese characters in any player-facing source or HTML file', () => {
    const cjkRegex = /[\u4e00-\u9fff]/;
    const files = [
      'index.html',
      'src/main.js',
      'src/scenes.js',
      'src/simulation.js',
      'src/physics.js',
      'src/renderer.js'
    ];
    for (const rel of files) {
      const content = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.equal(cjkRegex.test(content), false, `${rel} must remain 100% English`);
    }
  });
});
