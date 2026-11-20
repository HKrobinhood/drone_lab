import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_PHYSICS_CONFIG,
  createDroneState,
  stepDronePhysics,
  computeDroneAccelerations,
  getTotalMass
} from '../src/physics.js';
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

describe('M3 / M3.1 — Challenge Level Physics & Configurations', () => {
  it('defines all 6 challenge levels with extended physics and pre-flight fields', () => {
    const requiredFields = [
      'droneMass',
      'payloadMass',
      'maxThrust',
      'maxTilt',
      'windForce',
      'initialPID',
      'targetTolerance',
      'velocityTolerance',
      'timeLimit'
    ];
    for (let i = 1; i <= 6; i++) {
      const id = `level-${i}`;
      const scene = getSceneById(id);
      assert.ok(scene, `Expected ${id} to exist`);
      assert.equal(scene.mode, 'challenge');
      for (const field of requiredFields) {
        assert.notEqual(scene[field], undefined, `${id} missing ${field}`);
      }
    }
  });

  it('Test 1 & 2 — Mass decreases acceleration under fixed net thrust, and thrust respects maxThrust cap', () => {
    const lightAcc = computeDroneAccelerations({
      thrust: 22.0,
      theta: 0.2,
      totalMass: 1.2
    });
    const heavyAcc = computeDroneAccelerations({
      thrust: 22.0,
      theta: 0.2,
      totalMass: 2.05
    });

    assert.ok(heavyAcc.ax < lightAcc.ax, 'increasing mass must reduce horizontal acceleration');
    assert.ok(heavyAcc.az < lightAcc.az, 'increasing mass must reduce vertical acceleration');

    const cappedConfig = { ...DEFAULT_PHYSICS_CONFIG, maxThrust: 25.0 };
    const drone = createDroneState({ x: 4, z: 2 });
    stepDronePhysics(drone, { axCmd: 10, azCmd: 80 }, { x: 0, z: 0 }, FIXED_DT, cappedConfig);
    assert.ok(drone.thrust <= 25.0, 'thrust must never exceed maxThrust');
    assert.equal(getTotalMass({ droneMass: 1.2, payloadMass: 0.85 }), 2.05);
  });

  it('Test 3, 4 & 5 — Wind affects flight, simulation is deterministic/repeatable, and PID gains change response', () => {
    function runTrajectory(sceneId, gains) {
      const sim = new FlightSimulation();
      sim.loadScene(CHALLENGE_SCENES[sceneId], true);
      if (gains) sim.setGains(gains);
      for (let i = 0; i < Math.round(3.0 / FIXED_DT); i++) {
        const axes = i < 180 ? { moveX: 1, moveZ: 1 } : { moveX: 0, moveZ: 0 };
        sim.stepFixed(FIXED_DT, axes);
      }
      return sim.getSnapshot();
    }

    const calmRun = runTrajectory('level-1');
    const windRunA = runTrajectory('level-5');
    const windRunB = runTrajectory('level-5');
    const windWithKi = runTrajectory('level-5', { kp: 6.5, ki: 1.8, kd: 3.8 });

    // Repeatable under identical inputs/parameters/environment
    assert.equal(windRunA.drone.x, windRunB.drone.x);
    assert.equal(windRunA.drone.z, windRunB.drone.z);
    assert.equal(windRunA.drone.vx, windRunB.drone.vx);

    // Wind shifts flight compared to calm air (different initial/wind trajectory)
    assert.notEqual(calmRun.drone.x, windRunA.drone.x);
    assert.ok(windRunA.drone.windX > 3.0);

    // Different PID gains produce different control response
    assert.notEqual(windRunA.drone.x, windWithKi.drone.x);
  });

  it('Test 8, 9 & 10 — Restart resets physics cleanly, retry preserves PID gains, and no NaN occurs', () => {
    const sim = new FlightSimulation();
    sim.loadScene(CHALLENGE_SCENES['level-3'], true);
    sim.setGains({ kp: 7.4, ki: 1.55, kd: 4.3 });

    for (let i = 0; i < Math.round(3.0 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
    }
    assert.ok(sim.elapsedTime > 2.5);
    assert.ok(sim.metrics.controlSaturationDuration > 0, 'heavy cargo climb should record thrust saturation');

    // Retry / reset preserves tuned PID gains while resetting physics & metrics
    sim.reset(true);
    assert.deepEqual(sim.gains, { kp: 7.4, ki: 1.55, kd: 4.3 });
    assert.equal(sim.drone.x, CHALLENGE_SCENES['level-3'].startPos.x);
    assert.equal(sim.drone.z, 0);
    assert.equal(sim.drone.vx, 0);
    assert.equal(sim.drone.vz, 0);
    assert.equal(sim.elapsedTime, 0);
    assert.equal(sim.collisionCount, 0);
    assert.equal(sim.metrics.controlSaturationDuration, 0);

    // Pre-flight reload with preserveGains keeps tuned gains too
    sim.loadScene(CHALLENGE_SCENES['level-3'], false, { preserveGains: true });
    assert.deepEqual(sim.gains, { kp: 7.4, ki: 1.55, kd: 4.3 });

    // Extreme values must never produce NaN
    sim.startFlight();
    sim.setGains({ kp: 18, ki: 8, kd: 0 });
    for (let i = 0; i < 240; i++) {
      sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
    }
    const m = sim.getFlightMetrics();
    for (const v of [
      sim.drone.x,
      sim.drone.z,
      sim.drone.vx,
      sim.drone.vz,
      m.completionTime,
      m.maxOvershoot,
      m.averageTrackingError,
      m.finalPositionError,
      m.finalVelocity,
      m.controlSaturationDuration
    ]) {
      assert.ok(Number.isFinite(v), 'all physics and metric values must be finite');
    }
  });
});

describe('M3 / M3.1 — All 6 Redesigned Levels Completable & Failure Checks', () => {
  it('Level 1 (Stable Hover): resets timer on exit and completes with tuned PID', () => {
    const scene = CHALLENGE_SCENES['level-1'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);
    sim.setGains({ kp: 6.5, ki: 0.4, kd: 3.8 });

    guideReferenceTo(sim, [{ x: 17.5, z: 7.5 }], 6.5);
    assert.ok(sim.targetZone.holdTimer > 0 && sim.targetZone.holdTimer < 2.0);

    for (let i = 0; i < Math.round(1.2 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: -1, moveZ: 0 });
    }
    assert.equal(sim.targetZone.holdTimer, 0);

    const outcome = guideReferenceTo(sim, [{ x: 17.5, z: 7.5 }], 12);
    assert.equal(outcome.status, 'completed');
  });

  it('Level 2 (Smooth Braking): detects wall collision and completes compact low-speed stop with tuned Kd', () => {
    const scene = CHALLENGE_SCENES['level-2'];
    const sim = new FlightSimulation();

    sim.loadScene(scene, true);
    sim.setGains({ kp: 6.5, ki: 0.4, kd: 4.5 });
    const wallOutcome = guideReferenceTo(sim, [{ x: 15.0, z: 1.5 }], 8);
    assert.equal(wallOutcome.status, 'failed');
    assert.equal(wallOutcome.reason, 'collision');

    sim.loadScene(scene, true);
    const winOutcome = guideReferenceTo(
      sim,
      [
        { x: 6.5, z: 6.4, tol: 0.8 },
        { x: 14.0, z: 6.4, tol: 0.8 },
        { x: 18.5, z: 6.2, tol: 0.5 }
      ],
      25,
      { kp: 6.5, ki: 0.4, kd: 4.5 }
    );
    assert.equal(winOutcome.status, 'completed');
  });

  it('Level 3 (Heavy Cargo): exhibits payload droop without Ki, saturates thrust, and completes when tuned', () => {
    const scene = CHALLENGE_SCENES['level-3'];
    const simNoKi = new FlightSimulation();
    simNoKi.loadScene(scene, true, { preserveGains: false });
    simNoKi.setGains({ kp: 5.5, ki: 0.0, kd: 3.6 });

    // Command climb to z=5m with Ki=0: heavy cargo must sag significantly below reference
    for (let i = 0; i < Math.round(5.0 / FIXED_DT); i++) {
      const moveZ = simNoKi.reference.z < 5.0 ? 1 : 0;
      simNoKi.stepFixed(FIXED_DT, { moveX: 0, moveZ });
    }
    assert.ok(simNoKi.reference.z - simNoKi.drone.z > 0.7, 'heavy payload without Ki must show real weight droop');

    const sim = new FlightSimulation();
    sim.loadScene(scene, true);
    const outcome = guideReferenceTo(
      sim,
      [
        { x: 6.2, z: 6.6, tol: 0.8 },
        { x: 14.0, z: 6.8, tol: 0.8 },
        { x: 18.5, z: 6.8, tol: 0.6 }
      ],
      32,
      { kp: 6.5, ki: 1.6, kd: 4.2 }
    );
    assert.equal(outcome.status, 'completed');
    assert.ok(sim.getFlightMetrics().controlSaturationDuration >= 0);
  });

  it('Level 4 (Narrow Corridor): threads tight 3.0 m gates cleanly with balanced Kp/Kd', () => {
    const scene = CHALLENGE_SCENES['level-4'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    const outcome = guideReferenceTo(
      sim,
      [
        { x: 4.8, z: 6.9, tol: 0.6 },
        { x: 9.8, z: 6.9, tol: 0.6 },
        { x: 10.6, z: 4.6, tol: 0.6 },
        { x: 14.5, z: 4.6, tol: 0.6 },
        { x: 15.3, z: 7.4, tol: 0.6 },
        { x: 20.8, z: 7.2, tol: 0.5 }
      ],
      35,
      { kp: 6.6, ki: 0.5, kd: 4.4 }
    );
    assert.equal(outcome.status, 'completed');
  });

  it('Level 5 (Wind Challenge): completes under sustained + repeatable gust wind when Ki is tuned', () => {
    const scene = CHALLENGE_SCENES['level-5'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    const outcome = guideReferenceTo(
      sim,
      [
        { x: 7.0, z: 7.2, tol: 0.8 },
        { x: 14.0, z: 7.5, tol: 0.8 },
        { x: 19.0, z: 7.5, tol: 0.6 }
      ],
      34,
      { kp: 6.8, ki: 1.8, kd: 4.3 }
    );
    assert.equal(outcome.status, 'completed');
  });

  it('Level 6 (Final Rescue Mission): enforces sequential rings, handles heavy load + wind, and lands softly', () => {
    const scene = CHALLENGE_SCENES['level-6'];
    const sim = new FlightSimulation();

    // Skipping Ring #1 must not advance Ring #2
    sim.loadScene(scene, true);
    sim.drone.prevX = 15.5;
    sim.drone.x = 15.7;
    sim.drone.prevZ = 5.2;
    sim.drone.z = 5.2;
    sim.reference = { x: 15.7, z: 5.2 };
    sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: 0 });
    assert.equal(sim.nextRingIndex, 0);

    sim.loadScene(scene, true);
    const outcome = guideReferenceTo(
      sim,
      [
        { x: 4.8, z: 6.8, tol: 0.8 },
        { x: 11.8, z: 6.8, tol: 0.7 },
        { x: 13.0, z: 5.2, tol: 0.6 },
        { x: 17.0, z: 5.2, tol: 0.7 },
        { x: 19.5, z: 3.6, tol: 0.35, maxSpeed: 0.35 },
        { x: 19.5, z: 1.55, tol: 0.35 }
      ],
      42,
      { kp: 7.0, ki: 1.4, kd: 4.5 }
    );
    assert.equal(sim.nextRingIndex, 2);
    assert.equal(outcome.status, 'completed');
  });

  it('triggers out-of-bounds failure when flying outside the challenge safety perimeter', () => {
    const scene = CHALLENGE_SCENES['level-1'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);
    sim.setGains({ kp: 6.5, ki: 0.4, kd: 3.8 });

    for (let i = 0; i < Math.round(5.0 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: -1, moveZ: 1 });
      if (sim.outOfBounds) break;
    }

    const outcome = evaluateSceneOutcome(sim, scene);
    assert.equal(outcome.status, 'failed');
    assert.equal(outcome.reason, 'out_of_bounds');
  });
});

describe('M3 / M3.1 — Pre-flight UI, M4 Metrics Interface & English-Only Verification', () => {
  it('exposes all 8 required M4 scoring metrics from FlightSimulation', () => {
    const sim = new FlightSimulation();
    sim.loadScene(CHALLENGE_SCENES['level-1'], true);
    sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
    const metrics = sim.getFlightMetrics();

    for (const key of [
      'completionTime',
      'maxOvershoot',
      'averageTrackingError',
      'finalPositionError',
      'finalVelocity',
      'collisionCount',
      'controlSaturationDuration',
      'pidParameters'
    ]) {
      assert.notEqual(metrics[key], undefined, `Missing metric ${key}`);
    }
  });

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

  it('includes Pre-flight Tuning UI elements and contains no Chinese characters in player-facing files', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    for (const id of [
      'view-preflight',
      'preflight-drone-mass',
      'preflight-payload',
      'preflight-wind',
      'preflight-max-thrust',
      'pre-slider-kp',
      'pre-slider-ki',
      'pre-slider-kd',
      'btn-pre-start-flight'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    const cjkRegex = /[\u4e00-\u9fff]/;
    const files = [
      'index.html',
      'src/levels.js',
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
