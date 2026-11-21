import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  KNOB_MIN_ANGLE,
  KNOB_MAX_ANGLE,
  quantizePidValue,
  valueToKnobAngle,
  knobAngleToValue,
  stepPidValue
} from '../src/pid_knob.js';
import {
  runPidBenchTest,
  compareBenchTests,
  evaluateTestBenchPipCoaching,
  getTuningChallengeForScene,
  selectBenchTestType
} from '../src/test_bench.js';
import { FlightSimulation, PID_SLIDER_BOUNDS, FIXED_DT } from '../src/simulation.js';
import { TUTORIAL_SCENES, CHALLENGE_SCENES } from '../src/scenes.js';
import { TutorialGuideEngine, TUTORIAL_GUIDE_FLOWS } from '../src/tutorial_guide.js';
import { PID_PARAM_EXPLAINERS, getPidParamExplainer } from '../src/visual_aids.js';
import { scoreFlightRun, buildRatingBreakdown } from '../src/scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M5.4 — Rotary PID Knob Math & Bounds Synchronization', () => {
  it('maps values cleanly across angles, +/- steps, and exact bounds without NaN', () => {
    const { min, max, step } = PID_SLIDER_BOUNDS.kp;
    assert.equal(valueToKnobAngle(min, min, max), KNOB_MIN_ANGLE);
    assert.equal(valueToKnobAngle(max, min, max), KNOB_MAX_ANGLE);
    assert.equal(valueToKnobAngle((min + max) / 2, min, max), 0);

    assert.equal(knobAngleToValue(KNOB_MIN_ANGLE, min, max, step), min);
    assert.equal(knobAngleToValue(KNOB_MAX_ANGLE, min, max, step), max);
    assert.equal(knobAngleToValue(0, min, max, step), 9.0);

    assert.equal(stepPidValue(6.5, 5, min, max, step), 7.0);
    assert.equal(stepPidValue(0.0, -5, min, max, step), 0.0);
    assert.equal(stepPidValue(18.0, 5, min, max, step), 18.0);

    // Ki precision step = 0.05
    assert.equal(stepPidValue(1.0, 2, PID_SLIDER_BOUNDS.ki.min, PID_SLIDER_BOUNDS.ki.max, PID_SLIDER_BOUNDS.ki.step), 1.1);
    assert.equal(quantizePidValue('bad', 0, 18, 0.1), 0);
    assert.equal(quantizePidValue(999, 0, 8, 0.05), 8);
  });
});

describe('M5.4 — Real-Physics PID Test Bench, Repeatability & Isolation', () => {
  it('runs deterministic real simulation tests without mutating active flight state', () => {
    const t1 = TUTORIAL_SCENES['tutorial-1'];
    const liveSim = new FlightSimulation();
    liveSim.loadScene(t1, true);
    liveSim.setGains({ kp: 6.5, ki: 0.4, kd: 3.8 });
    for (let i = 0; i < 60; i++) liveSim.stepFixed(FIXED_DT, { moveX: 0, moveZ: 1 });
    const snapshotBefore = {
      x: liveSim.drone.x,
      z: liveSim.drone.z,
      t: liveSim.elapsedTime,
      energy: liveSim.energyUsed
    };

    const runA = runPidBenchTest({ kp: 6.5, ki: 0.4, kd: 3.8 }, t1);
    const runB = runPidBenchTest({ kp: 6.5, ki: 0.4, kd: 3.8 }, t1);

    // Bit-identical repeatability
    assert.deepEqual(runA.metrics, runB.metrics);
    assert.deepEqual(runA.samples, runB.samples);

    // Live flight simulation was completely untouched
    assert.equal(liveSim.drone.x, snapshotBefore.x);
    assert.equal(liveSim.drone.z, snapshotBefore.z);
    assert.equal(liveSim.elapsedTime, snapshotBefore.t);
    assert.equal(liveSim.energyUsed, snapshotBefore.energy);
  });

  it('produces genuinely distinct physical curves & honest failure metrics across PID settings', () => {
    // 1. Zero Kp fails cleanly with honest null/Not Settled metrics (no fabricated values)
    const zeroRun = runPidBenchTest({ kp: 0, ki: 0, kd: 0 }, CHALLENGE_SCENES['level-1']);
    assert.equal(zeroRun.metrics.reachedTarget, false);
    assert.equal(zeroRun.metrics.settlingTime, null);
    assert.equal(zeroRun.metrics.overshootPct, null);
    assert.equal(zeroRun.challenge.passed, false);

    // 2. Underdamped (high Kp, low Kd) causes real overshoot vs well-damped tuning
    const t4 = TUTORIAL_SCENES['tutorial-4'];
    const bouncy = runPidBenchTest({ kp: 11.5, ki: 0.2, kd: 0.5 }, t4);
    const damped = runPidBenchTest({ kp: 6.4, ki: 0.2, kd: 4.8 }, t4);
    assert.ok(bouncy.metrics.overshootPct > 15, `Expected high overshoot, got ${bouncy.metrics.overshootPct}`);
    assert.ok(damped.metrics.overshootPct < bouncy.metrics.overshootPct, 'Damped gains must reduce real overshoot');
    assert.equal(damped.challenge.passed, true);

    // 3. Wind disturbance test: Ki=0 leaves steady-state drift; Ki>0 corrects it
    const t3 = TUTORIAL_SCENES['tutorial-3'];
    assert.equal(selectBenchTestType(t3), 'wind');
    const windNoKi = runPidBenchTest({ kp: 5.5, ki: 0.0, kd: 3.6 }, t3);
    const windWithKi = runPidBenchTest({ kp: 5.5, ki: 1.6, kd: 3.6 }, t3);
    assert.ok(windNoKi.metrics.steadyStateError > 0.5, `Expected wind drift > 0.5 m, got ${windNoKi.metrics.steadyStateError}`);
    assert.ok(
      windWithKi.metrics.steadyStateError < windNoKi.metrics.steadyStateError * 0.4,
      'Integral action must substantially cut steady-state wind error'
    );
    assert.equal(windWithKi.challenge.passed, true);
  });

  it('compares Before/After honestly under identical conditions and blocks mismatched conditions', () => {
    const t4 = TUTORIAL_SCENES['tutorial-4'];
    const bouncy = runPidBenchTest({ kp: 11.5, ki: 0.2, kd: 0.5 }, t4);
    const damped = runPidBenchTest({ kp: 6.4, ki: 0.2, kd: 4.8 }, t4);

    const improved = compareBenchTests(bouncy, damped);
    assert.equal(improved.comparable, true);
    assert.equal(improved.overallStatus, 'improved');
    assert.ok(improved.highlights.some((h) => h.key === 'overshoot' && h.status === 'improved'));

    // Reversing order must report regression honestly
    const regressed = compareBenchTests(damped, bouncy);
    assert.equal(regressed.comparable, true);
    assert.equal(regressed.overallStatus, 'regressed');

    // Different scene / experiment condition must NOT compare directly
    const l5Wind = runPidBenchTest({ kp: 6.4, ki: 1.8, kd: 4.8 }, CHALLENGE_SCENES['level-5']);
    const mismatched = compareBenchTests(damped, l5Wind);
    assert.equal(mismatched.comparable, false);
  });

  it('generates concise single-message PIP coaching from real bench results without spoiling exact numbers', () => {
    const t4 = TUTORIAL_SCENES['tutorial-4'];
    const bouncy = runPidBenchTest({ kp: 11.5, ki: 0.2, kd: 0.5 }, t4);
    const damped = runPidBenchTest({ kp: 6.4, ki: 0.2, kd: 4.8 }, t4);

    const pipWarn = evaluateTestBenchPipCoaching(bouncy, null, { kp: 11.5, ki: 0.2, kd: 0.5 }, t4);
    assert.equal(pipWarn.messages.length, 1);
    assert.ok(pipWarn.messages[0].toLowerCase().includes('overshoot'));
    assert.ok(pipWarn.messages[0].includes('Kd'));

    const pipWin = evaluateTestBenchPipCoaching(damped, compareBenchTests(bouncy, damped), { kp: 6.4, ki: 0.2, kd: 4.8 }, t4);
    assert.equal(pipWin.messages.length, 1);
    assert.equal(pipWin.state, 'ready');

    // Every Tutorial & Challenge level has a tuning challenge defined
    for (const id of ['tutorial-1', 'tutorial-2', 'tutorial-3', 'tutorial-4', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6']) {
      const scene = TUTORIAL_SCENES[id] || CHALLENGE_SCENES[id];
      const ch = getTuningChallengeForScene(scene);
      assert.ok(ch && ch.title.length > 5 && typeof ch.check === 'function');
    }
  });
});

describe('M5.4 — Beginner Onboarding, Visual Explainers & English-Only UI', () => {
  it('supports the interactive Test PID step in Tutorial 1 onboarding and concise instructions', () => {
    const t1 = TUTORIAL_SCENES['tutorial-1'];
    const engine = new TutorialGuideEngine();
    engine.start(t1);

    assert.equal(engine.getCurrentStep().stepId, 't1-briefing');
    assert.equal(engine.isLaunchLocked(), true);
    assert.equal(engine.canSkipCurrentStep(), false);
    engine.goNext(); // t1-knobs-intro
    engine.goNext(); // t1-adjust-knob (Step 3)
    assert.equal(engine.getCurrentStep().stepId, 't1-adjust-knob');
    assert.equal(engine.getCurrentStep().targetSelector, '#knob-card-kp');
    assert.equal(engine.canGoNext(), false);
    assert.equal(engine.canSkipCurrentStep(), false);
    assert.equal(engine.isLaunchLocked(), true);

    // Step 3: must explore Low (0) -> High (>9.0) -> Recommended (4.5-9.0) before unlocking Next Step
    engine.recordPidAdjustment({ kp: 11.5, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 });
    assert.equal(engine.canGoNext(), false);
    assert.ok(engine.getCurrentStep().statusFeedback.includes('Low'));

    engine.recordPidAdjustment({ kp: 0.0, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 });
    assert.equal(engine.kpZoneDone.low, true);
    assert.equal(engine.canGoNext(), false);
    assert.ok(engine.getCurrentStep().statusFeedback.includes('High'));

    engine.recordPidAdjustment({ kp: 11.5, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 });
    assert.equal(engine.kpZoneDone.high, true);
    assert.equal(engine.canGoNext(), false);
    assert.ok(engine.getCurrentStep().statusFeedback.includes('Recommended'));

    engine.recordPidAdjustment({ kp: 6.8, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 });
    assert.equal(engine.canGoNext(), true);
    assert.equal(engine.canSkipCurrentStep(), false);
    assert.equal(engine.isLaunchLocked(), true);
    engine.goNext();
    assert.equal(engine.getCurrentStep().stepId, 't1-test-pid');
    assert.equal(engine.canGoNext(), false);
    assert.equal(engine.isLaunchLocked(), true);

    // Clicking Test PID unlocks Next Step to read the waveform (Step 5)
    engine.recordBenchTest({ gains: { kp: 6.8, ki: 0.6, kd: 3.8 } });
    assert.equal(engine.canGoNext(), true);
    engine.goNext();
    assert.equal(engine.getCurrentStep().stepId, 't1-observe-bench');
    assert.equal(engine.isLaunchLocked(), true);

    // Step 5 -> Step 6 (Start Flight) finally unlocks takeoff and highlights Start Flight!
    engine.goNext();
    assert.equal(engine.getCurrentStep().stepId, 't1-start-flight');
    assert.equal(engine.getCurrentStep().targetSelector, '#btn-pre-start-flight-2');
    assert.equal(engine.isLaunchLocked(), false);
    engine.recordFlightStarted();
    assert.equal(engine.getCurrentStep().stepId, 't1-wasd');

    // Tutorials 2, 3, 4: exactly 1 step highlighting ONLY the target knob (Kp/Ki/Kd), advising Test PID waveform before flight, launch unlocked
    for (const [id, focusParam, selector] of [
      ['tutorial-2', 'kp', '#knob-card-kp'],
      ['tutorial-3', 'ki', '#knob-card-ki'],
      ['tutorial-4', 'kd', '#knob-card-kd']
    ]) {
      const flow = TUTORIAL_GUIDE_FLOWS[id];
      assert.equal(flow.length, 1);
      assert.equal(flow[0].spotlight, true);
      assert.equal(flow[0].focusParam, focusParam);
      assert.equal(flow[0].targetSelector, selector);
      assert.ok(flow[0].actionHint.includes('Test PID') && flow[0].actionHint.includes('Start Flight'));
      const eng = new TutorialGuideEngine();
      eng.start(TUTORIAL_SCENES[id]);
      assert.equal(eng.isLaunchLocked(), false);
      assert.equal(eng.canSkipCurrentStep(), true);
    }

    // PIP Test Bench coaching on T2-T4 always informs player they can Start Flight whenever ready
    const t2Slow = runPidBenchTest({ kp: 1.2, ki: 0.0, kd: 3.5 }, TUTORIAL_SCENES['tutorial-2']);
    const t2Pip = evaluateTestBenchPipCoaching(t2Slow, null, { kp: 1.2, ki: 0.0, kd: 3.5 }, TUTORIAL_SCENES['tutorial-2']);
    assert.ok(t2Pip.messages[0].includes('Start Flight'));

    // Tutorial 1 awards 3 stars on any successful completion without requiring precision
    const sloppyT1 = scoreFlightRun(
      { status: 'completed' },
      { completionTime: 95, maxOvershoot: 4.5, settlingTime: 18, pathFitScore: 18, flightSmoothness: 25, collisionCount: 0 },
      'tutorial-1'
    );
    assert.equal(sloppyT1.stars, 3);
    const t1Breakdown = buildRatingBreakdown(sloppyT1, { completionTime: 95, maxOvershoot: 4.5, pathFitScore: 18 }, { status: 'completed' });
    assert.equal(t1Breakdown.summaryRows.some((r) => r.label === 'Precision Target'), false);

    const failedT1 = scoreFlightRun({ status: 'failed' }, { completionTime: 15 }, 'tutorial-1');
    assert.equal(failedT1.stars, 0);

    for (const [sceneId, steps] of Object.entries(TUTORIAL_GUIDE_FLOWS)) {
      for (const step of steps) {
        assert.ok(
          step.instruction.trim().split(/\s+/).length <= 15,
          `${sceneId}/${step.stepId} exceeds 15 words: "${step.instruction}"`
        );
      }
    }
  });

  it('exposes scientifically accurate Kp/Ki/Kd explainers and 100% English DOM hooks', () => {
    for (const key of ['kp', 'ki', 'kd']) {
      const exp = getPidParamExplainer(key);
      assert.ok(exp && exp.bullets.length === 2 && exp.formulaLearnMore.length > 20);
      assert.equal(PID_PARAM_EXPLAINERS[key].key, key);
    }

    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const testBenchJs = fs.readFileSync(path.join(rootDir, 'src/test_bench.js'), 'utf8');
    const pidKnobJs = fs.readFileSync(path.join(rootDir, 'src/pid_knob.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

    for (const id of [
      'mission-playground-panel',
      'preflight-arena-canvas',
      'test-bench-panel',
      'test-bench-canvas',
      'btn-test-pid',
      'preflight-knobs-wrap',
      'knob-dial-kp',
      'knob-dial-ki',
      'knob-dial-kd',
      'input-kp',
      'input-ki',
      'input-kd',
      'pid-explainer-card',
      'bench-compare-strip',
      'preflight-details-mission',
      'preflight-details-specs'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['index.html', indexHtml],
      ['src/test_bench.js', testBenchJs],
      ['src/pid_knob.js', pidKnobJs],
      ['src/main.js', mainJs]
    ]) {
      assert.equal(cjkRegex.test(content), false, `${name} must contain zero Chinese characters`);
    }
  });
});
