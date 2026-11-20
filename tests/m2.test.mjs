import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import {
  TUTORIAL_SCENES,
  getSceneById,
  evaluateTutorialCoaching,
  evaluateSceneOutcome
} from '../src/scenes.js';
import {
  createDefaultProgress,
  isLevelUnlocked,
  isLevelCompleted,
  recordLevelCompletion
} from '../src/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function runAutoPilotToTarget(sim, maxSeconds) {
  const steps = Math.round(maxSeconds / FIXED_DT);
  for (let i = 0; i < steps; i++) {
    const moveX = sim.reference.x < sim.targetZone.x - 0.04 ? 1 : sim.reference.x > sim.targetZone.x + 0.04 ? -1 : 0;
    const moveZ = sim.reference.z < sim.targetZone.z - 0.04 ? 1 : sim.reference.z > sim.targetZone.z + 0.04 ? -1 : 0;
    sim.stepFixed(FIXED_DT, { moveX, moveZ });
    if (sim.targetZone.stabilized) break;
  }
}

describe('M2 — Tutorial Village Metadata & Instructional Requirements', () => {
  it('defines all 4 tutorial scenes with complete English STEM guidance fields', () => {
    const ids = ['tutorial-1', 'tutorial-2', 'tutorial-3', 'tutorial-4'];
    for (const id of ids) {
      const scene = getSceneById(id);
      assert.ok(scene, `Expected scene ${id} to exist`);
      assert.equal(scene.mode, 'tutorial');
      assert.ok(scene.stemTopic);
      assert.ok(scene.tutorialGuide.learningObjective);
      assert.ok(scene.tutorialGuide.shortExplanation);
      assert.ok(scene.tutorialGuide.interactiveExperiment);
      assert.ok(scene.tutorialGuide.successConditions);
      assert.ok(scene.tutorialGuide.suggestedAdjustment);
      assert.ok(scene.tutorialGuide.failureFeedbackTimeout);
      assert.ok(scene.tutorialGuide.failureFeedbackHardLanding);
    }
  });
});

describe('M2 — Interactive Tutorial Physics & Outcomes', () => {
  it('Tutorial 1 (Take Off): climbs with W, exceeds hover thrust, and completes', () => {
    const scene = TUTORIAL_SCENES['tutorial-1'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    let peakThrust = 0;
    const steps = Math.round(12 / FIXED_DT);
    for (let i = 0; i < steps; i++) {
      const moveZ = sim.reference.z < scene.targetZone.z - 0.03 ? 1 : 0;
      sim.stepFixed(FIXED_DT, { moveX: 0, moveZ });
      if (sim.drone.thrust > peakThrust) peakThrust = sim.drone.thrust;
      if (sim.targetZone.stabilized) break;
    }

    assert.ok(peakThrust > 12.5, 'takeoff thrust must exceed gravity (~11.77 N)');
    assert.equal(evaluateSceneOutcome(sim, scene).status, 'completed');
  });

  it('Tutorial 2 (Proportional Control): shows slow-Kp coaching hint, then succeeds when Kp is tuned', () => {
    const scene = TUTORIAL_SCENES['tutorial-2'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    // Fly briefly with default low kp (1.2)
    for (let i = 0; i < Math.round(1.5 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 0 });
    }
    const lowHint = evaluateTutorialCoaching(sim, scene);
    assert.ok(lowHint.includes('Increase Kp'), `Expected Kp hint, got: ${lowHint}`);

    // Tune Kp to 6.5 and complete
    sim.setGains({ kp: 6.5, ki: 0.0, kd: 3.5 });
    runAutoPilotToTarget(sim, 14);
    assert.equal(evaluateSceneOutcome(sim, scene).status, 'completed');
  });

  it('Tutorial 3 (Integral Control): shows crosswind steady-state error with Ki=0, then succeeds with Ki tuned', () => {
    const scene = TUTORIAL_SCENES['tutorial-3'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    // Move reference to target with Ki=0 under steady crosswind
    runAutoPilotToTarget(sim, 10);
    assert.ok(Math.abs(sim.reference.x - sim.drone.x) > 0.35, 'Ki=0 should leave steady-state wind error');
    const windHint = evaluateTutorialCoaching(sim, scene);
    assert.ok(windHint.includes('Raise Ki'), `Expected Ki hint, got: ${windHint}`);

    // Enable Ki and stabilize
    sim.setGains({ kp: 6.0, ki: 1.5, kd: 3.6 });
    runAutoPilotToTarget(sim, 12);
    assert.equal(evaluateSceneOutcome(sim, scene).status, 'completed');
  });

  it('Tutorial 4 (Derivative Control): flags low Kd, then brakes cleanly inside target when Kd is raised', () => {
    const scene = TUTORIAL_SCENES['tutorial-4'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
    const dampHint = evaluateTutorialCoaching(sim, scene);
    assert.ok(dampHint.includes('Low damping'), `Expected Kd hint, got: ${dampHint}`);

    sim.setGains({ kp: 7.0, ki: 0.4, kd: 4.0 });
    runAutoPilotToTarget(sim, 14);
    assert.equal(evaluateSceneOutcome(sim, scene).status, 'completed');
  });

  it('evaluates timeout and hard landing failure feedback cleanly', () => {
    const scene = TUTORIAL_SCENES['tutorial-1'];
    const sim = new FlightSimulation();
    sim.loadScene(scene, true);

    sim.elapsedTime = scene.timeLimit;
    const timeoutOutcome = evaluateSceneOutcome(sim, scene);
    assert.equal(timeoutOutcome.status, 'failed');
    assert.equal(timeoutOutcome.reason, 'timeout');
    assert.ok(timeoutOutcome.suggestedAdjustment);

    sim.loadScene(scene, true);
    sim.drone.landedHard = true;
    sim.drone.maxImpactSpeed = 5.2;
    const crashOutcome = evaluateSceneOutcome(sim, scene);
    assert.equal(crashOutcome.status, 'failed');
    assert.equal(crashOutcome.reason, 'hard_landing');
  });
});

describe('M2 — Tutorial Progression & English-Only Verification', () => {
  it('unlocks subsequent tutorials sequentially upon completion', () => {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v))
    };

    let progress = createDefaultProgress();
    assert.equal(isLevelUnlocked(progress, 'tutorial-2'), false);

    progress = recordLevelCompletion(progress, 'tutorial-1', 'tutorial-2', mockStorage);
    assert.equal(isLevelCompleted(progress, 'tutorial-1'), true);
    assert.equal(isLevelUnlocked(progress, 'tutorial-2'), true);
  });

  it('contains no Chinese characters in M2 scenes or UI modules', () => {
    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const rel of ['src/scenes.js', 'src/storage.js', 'src/main.js', 'index.html']) {
      const content = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.equal(cjkRegex.test(content), false, `${rel} must be 100% English`);
    }
  });
});
