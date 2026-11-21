import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeRotorPower } from '../src/physics.js';
import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { TUTORIAL_SCENES, CHALLENGE_SCENES, evaluateSceneOutcome } from '../src/scenes.js';
import { scoreFlightRun, buildRatingBreakdown, buildNextStarAdvice, computeStrategyDimensions } from '../src/scoring.js';
import { predictStrategyTradeoffs } from '../src/coach.js';
import { generatePipDiagnosticReport } from '../src/feedback.js';
import { runLevelSimulation } from '../scripts/calibrate_levels.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M5.3 — Nonlinear Rotor Power & Battery Depletion Model', () => {
  it('computes convex T^1.5 + |dT/dt| rotor power without NaN and penalizes oscillation & heavy load', () => {
    const pIdle = computeRotorPower(0, 0, FIXED_DT);
    const pHover = computeRotorPower(11.8, 11.8, FIXED_DT);
    const pHeavy = computeRotorPower(20.6, 20.6, FIXED_DT);
    const pSpike = computeRotorPower(20.6, 12.0, FIXED_DT);

    assert.ok(pHover > pIdle * 5);
    assert.ok(pHeavy > pHover * 1.8, 'Heavy payload thrust must consume significantly more power');
    assert.ok(pSpike > pHeavy, 'Rapid thrust slew must incur additional dynamic power cost');
    assert.ok(Number.isFinite(computeRotorPower(NaN, Infinity, 0)));

    // Real simulation: oscillating gains drain much more energy than smooth damped gains
    const smoothSim = runLevelSimulation('level-1', { kp: 6.6, ki: 0.4, kd: 4.2 });
    const oscSim = runLevelSimulation('level-1', { kp: 12.5, ki: 1.5, kd: 1.6 });
    assert.ok(
      oscSim.energyUsed > smoothSim.energyUsed * 1.5,
      `Expected oscillatory flight (${oscSim.energyUsed.toFixed(0)} J) to drain far more energy than smooth flight (${smoothSim.energyUsed.toFixed(0)} J)`
    );
  });

  it('triggers battery_depleted failure on budgeted missions when energy runs out', () => {
    const l3 = CHALLENGE_SCENES['level-3'];
    assert.ok(l3.energyBudget > 0 && l3.failOnBatteryEmpty === true);

    // Zero Ki heavy cargo sags and burns through battery
    const sim = new FlightSimulation();
    sim.loadScene(l3, true);
    sim.setGains({ kp: 5.2, ki: 0.0, kd: 5.6 });
    let outcome = { status: 'running' };
    for (let i = 0; i < Math.round(40 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: sim.reference.z < 6.8 ? 1 : 0 });
      outcome = evaluateSceneOutcome(sim, l3);
      if (outcome.status !== 'running') break;
    }
    assert.equal(outcome.status, 'failed');
    assert.equal(outcome.reason, 'battery_depleted');
  });
});

describe('M5.3 — Cross-Level Strategy Differentiation & Scaffolding Fade-out', () => {
  it('requires genuinely distinct strategies across L1-L6 so no single preset 3-stars every level', () => {
    const agile = { kp: 9.8, ki: 0.3, kd: 3.1 };
    const precision = { kp: 5.2, ki: 0.2, kd: 5.6 };
    const ecoCargo = { kp: 6.4, ki: 1.4, kd: 4.6 };
    const windLock = { kp: 6.8, ki: 1.9, kd: 5.0 };

    const evalStars = (lvl, gains) => {
      const r = runLevelSimulation(lvl, gains);
      const sc = scoreFlightRun({ status: r.feasible ? 'completed' : 'failed', reason: r.reason }, r, lvl);
      return { ...r, stars: sc.stars };
    };

    // L1 (Speed-First): Agile earns 3★, Precision only 2★
    assert.equal(evalStars('level-1', agile).stars, 3);
    assert.ok(evalStars('level-1', precision).stars < 3);

    // L2 (Precision-First): Precision earns 3★, Agile only 2★
    assert.equal(evalStars('level-2', precision).stars, 3);
    assert.ok(evalStars('level-2', agile).stars < 3);

    // L3 (Energy-First): EcoCargo earns 3★, Precision depletes battery, Agile < 3★
    assert.equal(evalStars('level-3', ecoCargo).stars, 3);
    assert.equal(evalStars('level-3', precision).reason, 'battery_depleted');
    assert.ok(evalStars('level-3', agile).stars < 3);

    // L4 (Corridor Sprint): Precision earns 3★, Agile <= 2★
    assert.equal(evalStars('level-4', precision).stars, 3);
    assert.ok(evalStars('level-4', agile).stars <= 2);

    // L5 (Storm Hold): WindLock earns 3★, Agile < 3★
    assert.equal(evalStars('level-5', windLock).stars, 3);
    assert.ok(evalStars('level-5', agile).stars < 3);

    // L6 (Full 4-Way Trade-off): WindLock earns 3★, Agile hard-lands, Precision depletes battery
    assert.equal(evalStars('level-6', windLock).stars, 3);
    assert.equal(evalStars('level-6', agile).feasible, false);
    assert.equal(evalStars('level-6', precision).feasible, false);
  });

  it('keeps recommended slider zones on T1-T4 & L1-L2 and fades them out on L3-L6', () => {
    for (const id of ['tutorial-1', 'tutorial-2', 'tutorial-3', 'tutorial-4']) {
      assert.equal(TUTORIAL_SCENES[id].strategyProfile.hideRecommendedZone, false);
    }
    assert.equal(CHALLENGE_SCENES['level-1'].strategyProfile.hideRecommendedZone, false);
    assert.equal(CHALLENGE_SCENES['level-2'].strategyProfile.hideRecommendedZone, false);
    for (const id of ['level-3', 'level-4', 'level-5', 'level-6']) {
      assert.equal(CHALLENGE_SCENES[id].strategyProfile.hideRecommendedZone, true);
    }
  });

  it('produces 4-axis strategy predictions, energy breakdown rows, PIP strategy verdicts, and English-only UI', () => {
    const agilePred = predictStrategyTradeoffs({ kp: 9.8, ki: 0.3, kd: 3.1 }, CHALLENGE_SCENES['level-1']);
    const precPred = predictStrategyTradeoffs({ kp: 5.2, ki: 0.2, kd: 5.6 }, CHALLENGE_SCENES['level-2']);
    assert.ok(agilePred.speed > precPred.speed);
    assert.ok(precPred.stability >= agilePred.stability);

    const lowBattMetrics = {
      completionTime: 22,
      maxOvershoot: 0.9,
      settlingTime: 3.5,
      pathFitScore: 68,
      flightSmoothness: 78,
      collisionCount: 0,
      energyUsed: 2600,
      energyBudget: 3200,
      energyRemainingPct: 18.75,
      peakPower: 215,
      pidParameters: { kp: 8.2, ki: 1.4, kd: 4.0 }
    };
    const sc = scoreFlightRun({ status: 'completed' }, lowBattMetrics, 'level-3');
    assert.equal(sc.stars, 2);
    const breakdown = buildRatingBreakdown(sc, lowBattMetrics, { status: 'completed' });
    assert.ok(breakdown.summaryRows.some((r) => r.label === 'Energy Target' && r.passed === false));
    const tip = buildNextStarAdvice(sc, lowBattMetrics, null, CHALLENGE_SCENES['level-3']);
    assert.ok(tip.includes('battery'));

    const dims = computeStrategyDimensions(lowBattMetrics, CHALLENGE_SCENES['level-3']);
    for (const k of ['speed', 'stability', 'precision', 'efficiency']) {
      assert.ok(dims[k] >= 0 && dims[k] <= 100);
    }

    const report = generatePipDiagnosticReport([], lowBattMetrics, { status: 'completed' }, CHALLENGE_SCENES['level-3']);
    assert.ok(report.strategyVerdict && report.strategyVerdict.includes('Strategy Profile'));

    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');
    for (const id of [
      'preflight-strategy-box',
      'preflight-battery-budget',
      'preflight-tradeoff-panel',
      'flight-battery-pill',
      'result-strategy-canvas',
      'result-energy',
      'result-pip-strategy'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }
    const cjkRegex = /[\u4e00-\u9fff]/;
    assert.equal(cjkRegex.test(indexHtml), false);
    assert.equal(cjkRegex.test(mainJs), false);
  });
});
