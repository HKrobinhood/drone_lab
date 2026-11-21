/**
 * Offline PID Parameter Sweep & Calibration Script for Challenge Levels (L1-L6).
 *
 * Evaluates stability, response time, overshoot, settling time, steady-state error,
 * control saturation, and mission feasibility across PID parameter grids and canonical
 * diagnostic profiles.
 *
 * Run with: node scripts/calibrate_levels.mjs
 */

import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { CHALLENGE_SCENES, evaluateSceneOutcome } from '../src/scenes.js';
import { scoreFlightRun } from '../src/scoring.js';

const LEVEL_WAYPOINTS = {
  'level-1': [{ x: 17.5, z: 7.5, tol: 0.8 }],
  'level-2': [
    { x: 6.5, z: 6.4, tol: 0.8 },
    { x: 14.0, z: 6.4, tol: 0.8 },
    { x: 18.5, z: 6.2, tol: 0.5 }
  ],
  'level-3': [
    { x: 6.2, z: 6.6, tol: 0.8 },
    { x: 14.0, z: 6.8, tol: 0.8 },
    { x: 18.5, z: 6.8, tol: 0.5 }
  ],
  'level-4': [
    { x: 4.8, z: 6.8, tol: 0.6 },
    { x: 9.8, z: 6.8, tol: 0.6 },
    { x: 10.6, z: 4.5, tol: 0.6 },
    { x: 14.5, z: 4.5, tol: 0.6 },
    { x: 15.3, z: 7.4, tol: 0.6 },
    { x: 20.8, z: 7.2, tol: 0.5 }
  ],
  'level-5': [
    { x: 7.0, z: 7.2, tol: 0.8 },
    { x: 14.0, z: 7.5, tol: 0.8 },
    { x: 19.0, z: 7.5, tol: 0.5 }
  ],
  'level-6': [
    { x: 4.8, z: 6.8, tol: 0.8 },
    { x: 11.8, z: 6.8, tol: 0.7 },
    { x: 13.0, z: 5.2, tol: 0.6 },
    { x: 17.0, z: 5.2, tol: 0.7 },
    { x: 19.5, z: 3.6, tol: 0.35, maxSpeed: 0.35 },
    { x: 19.5, z: 1.55, tol: 0.35 }
  ]
};

export function runLevelSimulation(levelId, gains) {
  const scene = CHALLENGE_SCENES[levelId];
  const waypoints = LEVEL_WAYPOINTS[levelId];
  const sim = new FlightSimulation();
  sim.loadScene(scene, true);
  sim.setGains(gains);

  let wpIdx = 0;
  let responseTime = null;
  let settlingTime = null;
  const maxSteps = Math.round((scene.timeLimit + 1) / FIXED_DT);

  for (let i = 0; i < maxSteps; i++) {
    const wp = waypoints[Math.min(wpIdx, waypoints.length - 1)];
    const dx = wp.x - sim.reference.x;
    const dz = wp.z - sim.reference.z;
    const moveX = Math.abs(dx) > 0.04 ? Math.sign(dx) : 0;
    const moveZ = Math.abs(dz) > 0.04 ? Math.sign(dz) : 0;

    sim.stepFixed(FIXED_DT, { moveX, moveZ });

    if (responseTime === null && sim.drone.z >= 1.5) {
      responseTime = sim.elapsedTime;
    }
    if (sim.targetZone?.inside || sim.padStatus?.inside) {
      if (settlingTime === null && Math.hypot(sim.drone.vx, sim.drone.vz) <= 0.35) {
        settlingTime = sim.elapsedTime;
      }
    }

    if (wpIdx < waypoints.length - 1) {
      const distDrone = Math.hypot(wp.x - sim.drone.x, wp.z - sim.drone.z);
      const speed = Math.hypot(sim.drone.vx, sim.drone.vz);
      const speedOk = !wp.maxSpeed || speed <= wp.maxSpeed;
      if (distDrone <= wp.tol && Math.hypot(dx, dz) <= 0.25 && speedOk) {
        wpIdx += 1;
      }
    }

    const outcome = evaluateSceneOutcome(sim, scene);
    if (outcome.status === 'completed' || outcome.status === 'failed') {
      const metrics = sim.getFlightMetrics();
      return {
        feasible: outcome.status === 'completed',
        status: outcome.status,
        reason: outcome.reason || 'completed',
        responseTime: responseTime ?? metrics.completionTime,
        settlingTime: settlingTime ?? metrics.completionTime,
        ...metrics,
        integralX: sim.pidX.integral,
        integralZ: sim.pidZ.integral
      };
    }
  }

  return {
    feasible: false,
    status: 'failed',
    reason: 'timeout',
    ...sim.getFlightMetrics()
  };
}

function sweepLevel(levelId) {
  const scene = CHALLENGE_SCENES[levelId];
  const kpGrid = [3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 10.5];
  const kiGrid = scene.requiresIntegral ? [0.0, 0.8, 1.2, 1.6, 2.2, 3.5] : [0.0, 0.4, 0.8, 1.5];
  const kdGrid = [1.5, 2.5, 3.5, 4.2, 5.0, 6.0, 8.0];

  const passing = [];
  let totalRuns = 0;

  for (const kp of kpGrid) {
    for (const ki of kiGrid) {
      for (const kd of kdGrid) {
        totalRuns += 1;
        const res = runLevelSimulation(levelId, { kp, ki, kd });
        if (res.feasible) {
          passing.push({ kp, ki, kd, ...res });
        }
      }
    }
  }

  passing.sort((a, b) => a.completionTime + a.maxOvershoot * 2 - (b.completionTime + b.maxOvershoot * 2));
  const insideRec = passing.filter((p) => {
    const r = scene.recommendedPID;
    return p.kp >= r.kpMin && p.kp <= r.kpMax && p.ki >= r.kiMin && p.ki <= r.kiMax && p.kd >= r.kdMin && p.kd <= r.kdMax;
  });

  console.log(`\n=== ${scene.name} ===`);
  console.log(`Grid runs: ${totalRuns}, Feasible combos: ${passing.length}, Feasible inside recommendedPID: ${insideRec.length}`);
  if (insideRec.length > 0) {
    const best = insideRec[0];
    console.log('Best in recommendedPID:', {
      kp: best.kp,
      ki: best.ki,
      kd: best.kd,
      time: best.completionTime.toFixed(2),
      overshoot: best.maxOvershoot.toFixed(2),
      avgErr: best.averageTrackingError.toFixed(2),
      satSec: best.controlSaturationDuration.toFixed(2)
    });
  }

  // Diagnostic profiles comparison
  const midRec = {
    kp: Number(((scene.recommendedPID.kpMin + scene.recommendedPID.kpMax) / 2).toFixed(1)),
    ki: Number(((scene.recommendedPID.kiMin + scene.recommendedPID.kiMax) / 2).toFixed(2)),
    kd: Number(((scene.recommendedPID.kdMin + scene.recommendedPID.kdMax) / 2).toFixed(1))
  };

  const profiles = {
    LowKp: { kp: 1.5, ki: midRec.ki, kd: midRec.kd },
    HighKpLowKd: { kp: 13.0, ki: midRec.ki, kd: 0.8 },
    HighKi: { kp: midRec.kp, ki: 6.0, kd: midRec.kd },
    HighKd: { kp: midRec.kp, ki: midRec.ki, kd: 13.5 },
    Recommended: midRec
  };

  for (const [label, g] of Object.entries(profiles)) {
    const r = runLevelSimulation(levelId, g);
    console.log(`  [${label}]`, {
      gains: g,
      feasible: r.feasible,
      reason: r.reason,
      time: r.completionTime?.toFixed(1),
      overshoot: r.maxOvershoot?.toFixed(2),
      sat: r.controlSaturationDuration?.toFixed(2)
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const id of Object.keys(CHALLENGE_SCENES)) {
    sweepLevel(id);
  }

  console.log('\n=== M5.3 Cross-Level Strategy Differentiation Matrix ===');
  const strategyPresets = {
    Agile: { kp: 9.8, ki: 0.3, kd: 3.1 },
    Precision: { kp: 5.2, ki: 0.2, kd: 5.6 },
    EcoCargo: { kp: 6.4, ki: 1.4, kd: 4.6 },
    WindLock: { kp: 6.8, ki: 1.9, kd: 5.0 }
  };
  for (const [lvl, scene] of Object.entries(CHALLENGE_SCENES)) {
    const row = {};
    for (const [sName, g] of Object.entries(strategyPresets)) {
      const r = runLevelSimulation(lvl, g);
      const sc = scoreFlightRun({ status: r.feasible ? 'completed' : 'failed', reason: r.reason }, r, lvl);
      row[sName] = r.feasible ? `${sc.stars}★ (${r.completionTime.toFixed(1)}s${r.energyRemainingPct != null ? `, ${r.energyRemainingPct.toFixed(0)}%E` : ''})` : `FAIL(${r.reason})`;
    }
    console.log(scene.name.padEnd(28), row);
  }
}
