import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TUTORIAL_SCENES, CHALLENGE_SCENES, getSceneById } from '../src/scenes.js';
import { FlightSimulation, FIXED_DT, getSceneInitialGains } from '../src/simulation.js';
import { evaluatePidCoaching, evaluateLiveFlightCoaching, evaluatePostFlightFeedback } from '../src/coach.js';
import { TUTORIAL_GUIDE_FLOWS, TutorialGuideEngine } from '../src/tutorial_guide.js';
import { scoreFlightRun } from '../src/scoring.js';
import { createDefaultProgress, recordLevelResult, isLevelUnlocked, isLevelCompleted, getBestStars } from '../src/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M4.1 — Unified Tutorial & Challenge Scene Contracts', () => {
  it('equips all Tutorial and Challenge scenes with unified physics, briefing, and coaching metadata', () => {
    const unifiedFields = [
      'name',
      'description',
      'objective',
      'missionGoal',
      'flightConditions',
      'whatYouLearnedBefore',
      'newChallenge',
      'learningObjective',
      'droneMass',
      'payloadMass',
      'maxThrust',
      'maxTilt',
      'windLabel',
      'initialPID',
      'recommendedPID',
      'timeLimit',
      'briefing'
    ];

    for (const id of ['tutorial-1', 'tutorial-2', 'tutorial-3', 'tutorial-4', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6']) {
      const scene = getSceneById(id);
      assert.ok(scene, `Expected ${id} to exist`);
      for (const field of unifiedFields) {
        assert.notEqual(scene[field], undefined, `${id} missing unified field ${field}`);
      }
      assert.ok(Number.isFinite(scene.droneMass) && scene.droneMass > 0);
      assert.ok(Number.isFinite(scene.maxThrust) && scene.maxThrust > 0);
    }

    // Check explicit live-tuning & guidance-level differentiation via config
    assert.equal(TUTORIAL_SCENES['tutorial-1'].allowLivePidTuning, true);
    assert.equal(TUTORIAL_SCENES['tutorial-1'].guidanceLevel, 'full');
    assert.equal(TUTORIAL_SCENES['tutorial-2'].guidanceLevel, 'medium');
    assert.equal(TUTORIAL_SCENES['tutorial-3'].guidanceLevel, 'light');
    assert.equal(TUTORIAL_SCENES['tutorial-4'].guidanceLevel, 'minimal');
    assert.equal(getSceneById('playground'), null);
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    assert.equal(html.includes('btn-launch-playground'), false);
    assert.equal(html.includes('Flight Test Playground'), false);
  });

  it('uses identical PID controller, simulation engine, and initial-gain reset across Tutorial and Challenge', () => {
    const simTut = new FlightSimulation();
    const simChal = new FlightSimulation();

    // Load identical physical parameters and gains in both modes -> identical motion
    const testGains = { kp: 6.5, ki: 0.4, kd: 3.8 };
    simTut.loadScene(TUTORIAL_SCENES['tutorial-1'], true);
    simTut.setGains(testGains);

    simChal.loadScene(CHALLENGE_SCENES['level-1'], true);
    simChal.setGains(testGains);

    assert.equal(simTut.pidX.constructor, simChal.pidX.constructor);
    for (let i = 0; i < 240; i++) {
      simTut.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
      simChal.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
    }
    assert.equal(simTut.drone.x - simTut.startPos.x, simChal.drone.x - simChal.startPos.x);
    assert.equal(simTut.drone.z - simTut.startPos.z, simChal.drone.z - simChal.startPos.z);
    assert.equal(simTut.drone.thrust, simChal.drone.thrust);

    // Unified resetGains returns each scene's configured initialPID
    assert.deepEqual(simTut.resetGains(), getSceneInitialGains(TUTORIAL_SCENES['tutorial-1']));
    assert.deepEqual(simChal.resetGains(), { kp: 0, ki: 0, kd: 0 });
  });
});

describe('M4.1 — Unified PIP Coach & Config-Driven Interactive Tutorial Guide', () => {
  it('covers all 8 onboarding steps in Tutorial 1 including Mission, Knobs, Tune, Test PID, Waveform, Start Flight, WASD, and Target', () => {
    const flow = TUTORIAL_GUIDE_FLOWS['tutorial-1'];
    assert.equal(flow.length, 8);

    const stepIds = flow.map((s) => s.stepId);
    assert.deepEqual(stepIds, [
      't1-briefing',
      't1-knobs-intro',
      't1-adjust-knob',
      't1-test-pid',
      't1-observe-bench',
      't1-start-flight',
      't1-wasd',
      't1-reach-target'
    ]);

    // Step 1-2 -> acknowledge & back navigation works; launch is locked and skip disabled
    const engine = new TutorialGuideEngine();
    engine.start(TUTORIAL_SCENES['tutorial-1']);
    assert.equal(engine.getCurrentStep().stepId, 't1-briefing');
    assert.equal(engine.canGoBack(), false);
    assert.equal(engine.isLaunchLocked(), true);
    assert.equal(engine.canSkipCurrentStep(), false);

    assert.equal(engine.goNext(), true);
    assert.equal(engine.getCurrentStep().stepId, 't1-knobs-intro');
    assert.equal(engine.canGoBack(), true);
    assert.equal(engine.isLaunchLocked(), true);

    assert.equal(engine.goBack(), true);
    assert.equal(engine.getCurrentStep().stepId, 't1-briefing');

    engine.goNext(); // knobs-intro
    engine.goNext(); // adjust-knob (Step 3)
    assert.equal(engine.getCurrentStep().stepId, 't1-adjust-knob');

    // Step 3 cannot advance without real tuning into valid range, and launch remains locked
    assert.equal(engine.canGoNext(), false);
    assert.equal(engine.canSkipCurrentStep(), false);
    assert.equal(engine.isLaunchLocked(), true);
    assert.equal(engine.goNext(), false);

    // Same gain values (6.5) or out-of-range Kp=2.0/7.0 do NOT unlock Next Step
    assert.equal(engine.recordPidAdjustment({ kp: 6.5, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 }), false);
    assert.equal(engine.recordPidAdjustment({ kp: 2.0, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 }), false);
    assert.equal(engine.recordPidAdjustment({ kp: 7.0, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 }), false);
    assert.equal(engine.canGoNext(), false);

    // Tuning Kp into valid target range (7.5-9.0) unlocks Next Step (no sudden jump; launch still locked until Step 6)
    assert.equal(engine.recordPidAdjustment({ kp: 7.8, ki: 0.6, kd: 3.8 }, { kp: 6.5, ki: 0.6, kd: 3.8 }), true);
    assert.equal(engine.canGoNext(), true);
    assert.equal(engine.isLaunchLocked(), true);
    assert.equal(engine.goNext(), true);
    assert.equal(engine.getCurrentStep().stepId, 't1-test-pid');

    assert.equal(engine.canGoNext(), false);
    assert.equal(engine.isLaunchLocked(), true);
    engine.recordBenchTest({ gains: { kp: 7.8, ki: 0.6, kd: 3.8 } });
    assert.equal(engine.canGoNext(), true);
    assert.equal(engine.goNext(), true);
    assert.equal(engine.getCurrentStep().stepId, 't1-observe-bench');
    assert.equal(engine.isLaunchLocked(), true);

    // Completing Step 5 unlocks Step 6 (Start Flight) where takeoff is finally unlocked!
    assert.equal(engine.goNext(), true);
    assert.equal(engine.getCurrentStep().stepId, 't1-start-flight');
    assert.equal(engine.isLaunchLocked(), false);
    assert.equal(engine.canGoNext(), false);

    engine.recordFlightStarted();
    assert.equal(engine.getCurrentStep().stepId, 't1-wasd');
  });

  it('validates real WASD movement & release using simulation physics before advancing Tutorial 1', () => {
    const engine = new TutorialGuideEngine();
    const t1 = TUTORIAL_SCENES['tutorial-1'];
    engine.start(t1);
    engine.jumpToView('flight');
    assert.equal(engine.getCurrentStep().stepId, 't1-wasd');

    const sim = new FlightSimulation();
    sim.loadScene(t1, true);

    // Fake call with zero movement does NOT pass 'W'
    engine.evaluateTelemetry(sim, { moveX: 0, moveZ: 0 }, { status: 'running' }, 'flight');
    assert.equal(engine.wasdDone.w, false);

    // Real W key steps advance reference.z and pass W
    for (let i = 0; i < 15; i++) {
      sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: 1 });
      engine.evaluateTelemetry(sim, { moveX: 0, moveZ: 1 }, { status: 'running' }, 'flight');
    }
    assert.equal(engine.wasdDone.w, true);

    // Real S, A, D sequence
    sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: -1 });
    engine.evaluateTelemetry(sim, { moveX: 0, moveZ: -1 }, { status: 'running' }, 'flight');
    assert.equal(engine.wasdDone.s, true);

    sim.stepFixed(FIXED_DT, { moveX: -1, moveZ: 0 });
    engine.evaluateTelemetry(sim, { moveX: -1, moveZ: 0 }, { status: 'running' }, 'flight');
    assert.equal(engine.wasdDone.a, true);

    sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 0 });
    engine.evaluateTelemetry(sim, { moveX: 1, moveZ: 0 }, { status: 'running' }, 'flight');
    assert.equal(engine.wasdDone.d, true);

    // Release keys & settle -> advances to Step 9 (t1-reach-target)
    for (let i = 0; i < 60; i++) {
      sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: 0 });
      engine.evaluateTelemetry(sim, { moveX: 0, moveZ: 0 }, { status: 'running' }, 'flight');
    }
    assert.equal(engine.wasdDone.release, true);
    assert.equal(engine.getCurrentStep().stepId, 't1-reach-target');
    assert.equal(engine.canGoNext(), false);

    // Target stabilized -> completes Step 8 and finishes Tutorial 1 guide cleanly (no Step 9 overlay)
    sim.targetZone.stabilized = true;
    engine.evaluateTelemetry(sim, { moveX: 0, moveZ: 0 }, { status: 'completed' }, 'flight');
    assert.equal(engine.targetReached, true);
    assert.equal(engine.finished, true);
    assert.equal(engine.getCurrentStep(), null);
  });

  it('uses unified PIP coach across Tutorial and Challenge pre-flight, flight, and debrief', () => {
    const t3 = TUTORIAL_SCENES['tutorial-3'];
    const preCoach = evaluatePidCoaching({ kp: 4.5, ki: 0.0, kd: 3.4 }, t3);
    assert.ok(preCoach.messages.some((m) => m.includes('Ki may be too low')));

    const sim = new FlightSimulation();
    sim.loadScene(t3, true);
    const liveTut = evaluateLiveFlightCoaching(sim, t3, TUTORIAL_GUIDE_FLOWS['tutorial-3'][0]);
    assert.ok(liveTut.headline);
    assert.ok(liveTut.messages.length >= 1);

    const debriefTut = evaluatePostFlightFeedback(
      { status: 'completed' },
      {
        completionTime: 18.2,
        maxOvershoot: 0.4,
        controlSaturationDuration: 0,
        pidParameters: { kp: 5.5, ki: 1.6, kd: 3.6 }
      },
      t3
    );
    assert.equal(debriefTut.state, 'success');
    assert.ok(debriefTut.title.includes('Objective Mastered'));

    // M4 scoring & storage progression still work for both modes
    const score = scoreFlightRun(
      { status: 'completed' },
      { completionTime: 18, maxOvershoot: 0.5, settlingTime: 2.0, pathFitScore: 88, flightSmoothness: 85, collisionCount: 0 },
      'tutorial-1'
    );
    assert.equal(score.stars, 3);

    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v))
    };
    let progress = createDefaultProgress();
    progress = recordLevelResult(progress, 'tutorial-1', { completed: true, stars: score.stars }, 'tutorial-2', mockStorage);
    assert.equal(isLevelCompleted(progress, 'tutorial-1'), true);
    assert.equal(isLevelUnlocked(progress, 'tutorial-2'), true);
    assert.equal(getBestStars(progress, 'tutorial-1'), 3);
  });
});

describe('M4.1 — Unified DOM & English-Only Verification', () => {
  it('contains shared Briefing, Drone Specs, PIP, PID, Guide Spotlight, and mode-configured Result UI in English only', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const guideJs = fs.readFileSync(path.join(rootDir, 'src/tutorial_guide.js'), 'utf8');
    const overlayJs = fs.readFileSync(path.join(rootDir, 'src/guide_overlay.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

    for (const id of [
      'mission-briefing-panel',
      'drone-specs-panel',
      'preflight-visual-aid',
      'preflight-pid-panel',
      'flight-pip-card',
      'flight-pid-panel',
      'flight-zone-kp',
      'flight-track-kp',
      'flight-briefing-panel',
      'result-tutorial-card',
      'result-rating-card',
      'btn-result-challenges',
      'tutorial-spotlight-layer',
      'tut-guide-card'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['index.html', indexHtml],
      ['src/tutorial_guide.js', guideJs],
      ['src/guide_overlay.js', overlayJs],
      ['src/main.js', mainJs]
    ]) {
      assert.equal(cjkRegex.test(content), false, `${name} must contain zero Chinese characters`);
    }
  });
});
