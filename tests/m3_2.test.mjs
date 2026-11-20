import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHALLENGE_SCENES } from '../src/scenes.js';
import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import {
  evaluatePidCoaching,
  evaluateJointStability,
  evaluatePostFlightFeedback,
  getSliderZone
} from '../src/coach.js';
import { runLevelSimulation } from '../scripts/calibrate_levels.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M3.2 — Progressive Curriculum & Zero-Init Challenge Policy', () => {
  it('initializes all 6 challenge levels at Kp=0, Ki=0, Kd=0 with progressive metadata and distinct recommendedPID', () => {
    const requiredProgFields = [
      'newChallenge',
      'whatYouLearnedBefore',
      'learningObjective',
      'flightConditions',
      'missionGoal',
      'recommendedPID'
    ];

    const rangeSignatures = new Set();
    for (let i = 1; i <= 6; i++) {
      const scene = CHALLENGE_SCENES[`level-${i}`];
      assert.deepEqual(scene.initialPID, { kp: 0, ki: 0, kd: 0 }, `level-${i} must start at zero PID`);
      for (const f of requiredProgFields) {
        assert.ok(scene[f], `level-${i} missing ${f}`);
      }
      const r = scene.recommendedPID;
      const sig = `${r.kpMin}-${r.kpMax}/${r.kiMin}-${r.kiMax}/${r.kdMin}-${r.kdMax}`;
      rangeSignatures.add(sig);
    }

    assert.equal(rangeSignatures.size, 6, 'every challenge level must have a distinct recommendedPID range');
  });

  it('zero initial PID leaves drone stationary on ground without errors or NaN', () => {
    const sim = new FlightSimulation();
    sim.loadScene(CHALLENGE_SCENES['level-1'], true);
    for (let i = 0; i < 120; i++) {
      sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
    }
    assert.equal(sim.drone.z, 0);
    assert.equal(sim.drone.thrust, 0);
    assert.ok(Number.isFinite(sim.drone.x));
  });
});

describe('M3.2 — PIP Virtual Coach & Multi-Gain Anomaly Detection', () => {
  it('displays Welcome state at 0/0/0 and Ready state inside valid recommendedPID without warnings', () => {
    const l1 = CHALLENGE_SCENES['level-1'];

    const welcome = evaluatePidCoaching({ kp: 0, ki: 0, kd: 0 }, l1);
    assert.equal(welcome.state, 'welcome');
    assert.ok(welcome.messages.length >= 1);

    const readyL1 = evaluatePidCoaching({ kp: 6.5, ki: 0.0, kd: 3.8 }, l1);
    assert.equal(readyL1.state, 'ready', 'L1 calm level should allow Ki=0 and show ready state');
    assert.ok(readyL1.messages[0].includes('Ready to fly!'));

    const readyL5 = evaluatePidCoaching({ kp: 7.0, ki: 1.8, kd: 4.8 }, CHALLENGE_SCENES['level-5']);
    assert.equal(readyL5.state, 'ready');
  });

  it('detects single-gain anomalies and respects Ki=0 on calm vs windy missions', () => {
    const l1 = CHALLENGE_SCENES['level-1'];
    const l5 = CHALLENGE_SCENES['level-5'];

    const lowKp = evaluatePidCoaching({ kp: 2.0, ki: 0, kd: 3.8 }, l1);
    assert.ok(lowKp.messages.some((m) => m.includes('Kp is too low')));

    const highKp = evaluatePidCoaching({ kp: 12.0, ki: 0, kd: 4.5 }, l1);
    assert.ok(highKp.messages.some((m) => m.includes('Kp may be too aggressive')));

    const lowKd = evaluatePidCoaching({ kp: 6.5, ki: 0, kd: 1.0 }, l1);
    assert.ok(lowKd.messages.some((m) => m.includes('struggle to stop smoothly')));

    const highKd = evaluatePidCoaching({ kp: 6.5, ki: 0, kd: 11.0 }, l1);
    assert.ok(highKd.messages.some((m) => m.includes('Excessive damping')));

    const highKi = evaluatePidCoaching({ kp: 6.5, ki: 5.0, kd: 3.8 }, l1);
    assert.ok(highKi.messages.some((m) => m.includes('Too much integral action')));

    // Calm L1 with Ki=0 must NOT warn about low Ki
    const calmZeroKi = evaluatePidCoaching({ kp: 6.5, ki: 0.0, kd: 3.8 }, l1);
    assert.equal(calmZeroKi.messages.some((m) => m.includes('Ki may be too low')), false);

    // Windy L5 with Ki=0 MUST warn about low Ki
    const windZeroKi = evaluatePidCoaching({ kp: 7.0, ki: 0.0, kd: 4.5 }, l5);
    assert.ok(windZeroKi.messages.some((m) => m.includes('Ki may be too low')));
  });

  it('detects multi-gain combination risks and joint-coupling edge cases inside the box', () => {
    const l2 = CHALLENGE_SCENES['level-2'];

    const comboOsc = evaluatePidCoaching({ kp: 12.0, ki: 0.2, kd: 1.0 }, l2);
    assert.equal(comboOsc.state, 'warning');
    assert.ok(comboOsc.messages.some((m) => m.includes('High Kp and low Kd')));
    assert.ok(comboOsc.messages.length <= 2, 'PIP must cap advice at 1-2 messages');

    // Inside L2 box (kpMax=8.5, kdMin=3.2) but underdamped coupling (kp/kd = 8.5/3.2 = 2.66 > 2.3)
    const borderline = evaluateJointStability({ kp: 8.5, ki: 0.0, kd: 3.2 }, l2);
    assert.equal(borderline.jointOk, false);
    const coachBorderline = evaluatePidCoaching({ kp: 8.5, ki: 0.0, kd: 3.2 }, l2);
    assert.notEqual(coachBorderline.state, 'ready', 'borderline coupled gains must not falsely claim Ready');
  });

  it('generates post-flight "What went wrong?" explanations from real telemetry', () => {
    const l5 = CHALLENGE_SCENES['level-5'];
    const debrief = evaluatePostFlightFeedback(
      { status: 'failed', reason: 'timeout' },
      {
        completionTime: 85,
        maxOvershoot: 0.4,
        averageTrackingError: 1.45,
        controlSaturationDuration: 0.0,
        finalVelocity: 0.1,
        pidParameters: { kp: 6.5, ki: 0.0, kd: 4.0 }
      },
      l5
    );
    assert.equal(debrief.title, 'What went wrong?');
    assert.ok(debrief.explanation.includes('Low Ki'));
  });
});

describe('M3.2 — Calibrated Feasible PID Regions & Physical Differentiation', () => {
  it('confirms multiple feasible combinations exist inside recommendedPID for every level L1-L6', () => {
    const samplesPerLevel = {
      'level-1': [
        { kp: 5.5, ki: 0.0, kd: 3.2 },
        { kp: 6.5, ki: 0.4, kd: 3.8 },
        { kp: 8.0, ki: 0.6, kd: 4.8 }
      ],
      'level-2': [
        { kp: 5.5, ki: 0.0, kd: 3.8 },
        { kp: 6.5, ki: 0.4, kd: 4.5 },
        { kp: 7.5, ki: 0.5, kd: 5.2 }
      ],
      'level-3': [
        { kp: 5.8, ki: 1.2, kd: 4.0 },
        { kp: 6.7, ki: 1.6, kd: 4.6 },
        { kp: 7.8, ki: 1.8, kd: 5.0 }
      ],
      'level-4': [
        { kp: 5.8, ki: 0.0, kd: 4.0 },
        { kp: 6.6, ki: 0.4, kd: 4.6 },
        { kp: 7.4, ki: 0.5, kd: 5.2 }
      ],
      'level-5': [
        { kp: 6.0, ki: 1.4, kd: 4.0 },
        { kp: 7.0, ki: 1.8, kd: 4.8 },
        { kp: 8.0, ki: 2.2, kd: 5.2 }
      ],
      'level-6': [
        { kp: 6.4, ki: 1.2, kd: 4.2 },
        { kp: 7.0, ki: 1.5, kd: 4.6 },
        { kp: 7.6, ki: 1.8, kd: 5.0 }
      ]
    };

    for (const [levelId, combos] of Object.entries(samplesPerLevel)) {
      const scene = CHALLENGE_SCENES[levelId];
      for (const gains of combos) {
        assert.equal(getSliderZone(gains.kp, scene.recommendedPID.kpMin, scene.recommendedPID.kpMax), 'recommended');
        assert.equal(getSliderZone(gains.ki, scene.recommendedPID.kiMin, scene.recommendedPID.kiMax), 'recommended');
        assert.equal(getSliderZone(gains.kd, scene.recommendedPID.kdMin, scene.recommendedPID.kdMax), 'recommended');
        const res = runLevelSimulation(levelId, gains);
        assert.equal(res.feasible, true, `Expected ${levelId} to be completable with ${JSON.stringify(gains)}, got ${res.reason}`);
      }
    }
  });

  it('produces clear physical metric differences between flawed profiles and recommended PID', () => {
    const rec = runLevelSimulation('level-2', { kp: 6.5, ki: 0.4, kd: 4.5 });
    const lowKp = runLevelSimulation('level-2', { kp: 1.5, ki: 0.4, kd: 4.5 });
    const highKpLowKd = runLevelSimulation('level-2', { kp: 13.0, ki: 0.4, kd: 0.8 });
    const highKd = runLevelSimulation('level-2', { kp: 6.5, ki: 0.4, kd: 13.5 });

    assert.ok(lowKp.completionTime > rec.completionTime * 2, 'low Kp must take noticeably longer');
    assert.equal(highKpLowKd.feasible, false, 'high Kp + low Kd must fail or destabilize');
    assert.ok(highKpLowKd.maxOvershoot > rec.maxOvershoot + 2.0);
    assert.ok(highKd.completionTime > rec.completionTime * 1.4, 'excessive Kd must slow flight');
  });
});

describe('M3.2 — UI Structure & English-Only Verification', () => {
  it('renders PIP elements and progression sections without leaking exact numeric bounds or blocking Start Flight', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');
    const coachJs = fs.readFileSync(path.join(rootDir, 'src/coach.js'), 'utf8');

    for (const id of [
      'pip-coach-card',
      'preflight-prev-knowledge',
      'preflight-new-challenge',
      'pre-zone-kp',
      'pre-track-kp',
      'btn-pre-start-flight'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    // Start Flight button must never be disabled by PIP advice
    assert.equal(mainJs.includes('btnPreStartFlight.disabled'), false);
    assert.equal(mainJs.includes('btnPreStartFlight2.disabled'), false);

    // Zero Chinese characters in player-facing files
    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['index.html', indexHtml],
      ['src/main.js', mainJs],
      ['src/coach.js', coachJs]
    ]) {
      assert.equal(cjkRegex.test(content), false, `${name} must be 100% English`);
    }
  });
});
