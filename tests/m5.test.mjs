import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { TUTORIAL_SCENES, CHALLENGE_SCENES } from '../src/scenes.js';
import { analyzeFlightTelemetry, generatePipDiagnosticReport } from '../src/feedback.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function runFlight(scene, gains, axesFn, seconds) {
  const sim = new FlightSimulation();
  sim.loadScene(scene, true);
  sim.setGains(gains);
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) {
    sim.stepFixed(FIXED_DT, axesFn(sim, i * FIXED_DT));
  }
  return sim;
}

describe('M5 — Time-Series Telemetry Recording & Previous Trajectory Retention', () => {
  it('records full time-series telemetry (ref, pos, vel, err, P/I/D terms, output, thrust, saturation)', () => {
    const sim = runFlight(
      CHALLENGE_SCENES['level-1'],
      { kp: 6.5, ki: 0.4, kd: 3.8 },
      () => ({ moveX: 1, moveZ: 1 }),
      4.0
    );

    const series = sim.getTelemetrySeries();
    assert.ok(series.length >= 60, 'Expected ~20Hz telemetry series');
    const sample = series[Math.floor(series.length / 2)];
    for (const key of [
      't', 'refX', 'refZ', 'x', 'z', 'vx', 'vz',
      'errX', 'errZ', 'pX', 'iX', 'dX', 'outX',
      'pZ', 'iZ', 'dZ', 'outZ', 'thrust', 'saturated'
    ]) {
      assert.notEqual(sample[key], undefined, `Missing telemetry field ${key}`);
      if (key !== 'saturated') {
        assert.ok(Number.isFinite(sample[key]), `Non-finite telemetry value for ${key}`);
      }
    }

    // Previous trail retention across reset & level isolation
    sim.setPreviousTrail(sim.trail);
    assert.ok(sim.previousTrail.length > 5);
    sim.reset(true);
    assert.ok(sim.previousTrail.length > 5, 'reset on same level keeps previousTrail for overlay');
    sim.loadScene(CHALLENGE_SCENES['level-2'], false);
    assert.equal(sim.previousTrail.length, 0, 'switching levels clears previousTrail');
  });
});

describe('M5 — PID Control Diagnostics & Conversational PIP Coach Report', () => {
  it('detects oscillation, overshoot, sluggish lag, steady-state error, and saturation/windup accurately', () => {
    // 1. Underdamped oscillation (High Kp, very low Kd)
    const simOsc = runFlight(
      CHALLENGE_SCENES['level-2'],
      { kp: 14.0, ki: 0.2, kd: 0.5 },
      (_s, t) => (t < 2.2 ? { moveX: 1, moveZ: 1 } : { moveX: 0, moveZ: 0 }),
      8.0
    );
    const diagOsc = analyzeFlightTelemetry(simOsc.getTelemetrySeries(), simOsc.getFlightMetrics(), CHALLENGE_SCENES['level-2']);
    assert.equal(diagOsc.oscillationDetected, true);
    assert.ok(diagOsc.oscillationReversals >= 4);
    assert.ok(['mild', 'high'].includes(diagOsc.overshootSeverity));

    // 2. Sluggish lag (Low Kp)
    const simLag = runFlight(
      TUTORIAL_SCENES['tutorial-2'],
      { kp: 1.0, ki: 0.0, kd: 3.5 },
      () => ({ moveX: 1, moveZ: 0 }),
      5.0
    );
    const diagLag = analyzeFlightTelemetry(simLag.getTelemetrySeries(), simLag.getFlightMetrics(), TUTORIAL_SCENES['tutorial-2']);
    assert.equal(diagLag.lagDetected, true);
    assert.equal(diagLag.responseSpeed, 'slow');

    // 3. Steady-state error under crosswind with Ki=0
    const simWind = runFlight(
      TUTORIAL_SCENES['tutorial-3'],
      { kp: 4.5, ki: 0.0, kd: 3.4 },
      () => ({ moveX: 0, moveZ: 0 }),
      6.0
    );
    const diagWind = analyzeFlightTelemetry(simWind.getTelemetrySeries(), simWind.getFlightMetrics(), TUTORIAL_SCENES['tutorial-3']);
    assert.equal(diagWind.steadyStateDetected, true);
    assert.ok(diagWind.steadyStateError > 0.45);
  });

  it('produces conversational first-person PIP Coach analysis for both Tutorial and Challenge outcomes', () => {
    const simTut = runFlight(
      TUTORIAL_SCENES['tutorial-1'],
      { kp: 6.5, ki: 0.6, kd: 3.8 },
      (s) => ({ moveX: 0, moveZ: s.reference.z < 7.5 ? 1 : 0 }),
      6.0
    );
    const tutReport = generatePipDiagnosticReport(
      simTut.getTelemetrySeries(),
      simTut.getFlightMetrics(),
      { status: 'completed' },
      TUTORIAL_SCENES['tutorial-1']
    );
    assert.equal(tutReport.title, 'PIP Flight Coach — Telemetry Analysis');
    assert.ok(tutReport.headline.includes('pilot'));
    assert.ok(tutReport.spokenSummary.includes('route fit') || tutReport.spokenSummary.includes('Route'));
    assert.ok(tutReport.diagnostics.findings.length >= 3);
    assert.ok(tutReport.adviceList.length >= 1);

    // Failed Challenge run with Retry comparison note
    const simChal = runFlight(
      CHALLENGE_SCENES['level-5'],
      { kp: 5.5, ki: 0.0, kd: 3.5 },
      () => ({ moveX: 1, moveZ: 1 }),
      6.0
    );
    const chalReport = generatePipDiagnosticReport(
      simChal.getTelemetrySeries(),
      simChal.getFlightMetrics(),
      { status: 'failed', reason: 'timeout' },
      CHALLENGE_SCENES['level-5'],
      { metrics: { pathFitScore: 40, maxOvershoot: 1.5 } }
    );
    assert.equal(chalReport.mood, 'warning');
    assert.ok(chalReport.headline.includes('pilot'));
    assert.ok(chalReport.comparisonNote && chalReport.comparisonNote.includes('Compared to'));
    assert.ok(chalReport.adviceList.some((tip) => tip.includes('Ki')));
  });
});

describe('M5 — UI Elements & English-Only Verification', () => {
  it('includes PIP conversational diagnostic result elements and telemetry plot in English only', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const feedbackJs = fs.readFileSync(path.join(rootDir, 'src/feedback.js'), 'utf8');
    const rendererJs = fs.readFileSync(path.join(rootDir, 'src/renderer.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

    for (const id of [
      'result-pip-report-card',
      'result-pip-avatar',
      'result-pip-headline',
      'result-pip-comparison',
      'result-diag-list',
      'result-pip-advice-list',
      'result-telemetry-canvas',
      'result-prev-legend'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['index.html', indexHtml],
      ['src/feedback.js', feedbackJs],
      ['src/renderer.js', rendererJs],
      ['src/main.js', mainJs]
    ]) {
      assert.equal(cjkRegex.test(content), false, `${name} must contain zero Chinese characters`);
    }
  });
});
