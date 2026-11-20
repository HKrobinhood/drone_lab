import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PIDController } from '../src/pid.js';
import { InputController } from '../src/input.js';
import { FlightSimulation, DEFAULT_PID_GAINS, FIXED_DT } from '../src/simulation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function stepSeconds(sim, seconds, axesFn = () => ({ moveX: 0, moveZ: 0 })) {
  const steps = Math.round(seconds / FIXED_DT);
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < steps; i++) {
    const t = i * FIXED_DT;
    sim.stepFixed(FIXED_DT, axesFn(t));
    if (sim.drone.x > maxX) maxX = sim.drone.x;
    if (sim.drone.z > maxZ) maxZ = sim.drone.z;
  }
  return { maxX, maxZ };
}

describe('M1 — PIDController Core Math & Safety', () => {
  it('computes true P, I, and D terms with persistent integral, anti-windup, output clamping, and reset', () => {
    const pid = new PIDController({
      kp: 2.0,
      ki: 1.0,
      kd: 0.5,
      outputMin: -5,
      outputMax: 5,
      integralLimit: 3
    });

    const r1 = pid.update(2.0, 0.0, 0.1, 0.0);
    assert.equal(r1.error, 2.0);
    assert.equal(r1.pTerm, 4.0);
    assert.ok(r1.iTerm > 0);
    assert.equal(r1.dTerm, 0);

    // Drive into high saturation to verify output clamping & anti-windup
    for (let i = 0; i < 100; i++) {
      pid.update(10.0, 0.0, 0.1, 0.0);
    }
    assert.equal(pid.lastResult.output, 5);
    assert.equal(pid.lastResult.saturated, true);
    assert.ok(pid.integral <= 3, 'integral must respect anti-windup limit');

    // Negative velocity should produce negative D damping term
    const rDamp = pid.update(0.0, 0.0, 0.1, 4.0);
    assert.equal(rDamp.dTerm, -2.0);

    // Reset clears integral & history
    pid.reset();
    assert.equal(pid.integral, 0);
    assert.equal(pid.hasPrev, false);
  });

  it('ignores non-finite inputs without producing NaN', () => {
    const pid = new PIDController();
    const res = pid.update(NaN, 0, 0.01, 0);
    assert.ok(Number.isFinite(res.output));
  });
});

describe('M1 — Flight Feel & Physics Acceptance Suite (Tests 1–8)', () => {
  it('Test 1 — Default PID: takes off, translates horizontally, stops, and hovers steadily', () => {
    const sim = new FlightSimulation({ autoStart: true, gains: DEFAULT_PID_GAINS });

    // Hold W + D for 2.0s, then release and settle for 5.0s
    stepSeconds(sim, 2.0, () => ({ moveX: 1, moveZ: 1 }));
    stepSeconds(sim, 5.0, () => ({ moveX: 0, moveZ: 0 }));

    assert.ok(sim.drone.z > 5.0, 'drone should climb cleanly above ground');
    assert.ok(sim.drone.x > 9.5, 'drone should translate horizontally');
    assert.ok(Math.abs(sim.reference.x - sim.drone.x) < 0.35, 'X hover error should settle small');
    assert.ok(Math.abs(sim.reference.z - sim.drone.z) < 0.35, 'Z hover error should settle small');
    assert.ok(Math.hypot(sim.drone.vx, sim.drone.vz) < 0.15, 'drone should come to a steady hover');
  });

  it('Test 2 — Low Kp: noticeably slower response compared to default Kp', () => {
    const simDefault = new FlightSimulation({ autoStart: true, gains: DEFAULT_PID_GAINS });
    const simLowKp = new FlightSimulation({ autoStart: true, gains: { ...DEFAULT_PID_GAINS, kp: 0.8 } });

    stepSeconds(simDefault, 1.5, () => ({ moveX: 1, moveZ: 1 }));
    stepSeconds(simLowKp, 1.5, () => ({ moveX: 1, moveZ: 1 }));

    assert.ok(simLowKp.drone.z < simDefault.drone.z - 0.8, 'low Kp should climb noticeably slower');
    assert.ok(simLowKp.drone.x < simDefault.drone.x - 0.8, 'low Kp should accelerate horizontally slower');
  });

  it('Test 3 — Low Kd: causes large overshoot and oscillation', () => {
    const simDefault = new FlightSimulation({ autoStart: true, gains: DEFAULT_PID_GAINS });
    const simLowKd = new FlightSimulation({
      autoStart: true,
      gains: { kp: DEFAULT_PID_GAINS.kp, ki: 0, kd: 0.25 }
    });

    const defClimb = stepSeconds(simDefault, 2.0, () => ({ moveX: 1, moveZ: 1 }));
    const defSettle = stepSeconds(simDefault, 3.0, () => ({ moveX: 0, moveZ: 0 }));

    const lowClimb = stepSeconds(simLowKd, 2.0, () => ({ moveX: 1, moveZ: 1 }));
    const lowSettle = stepSeconds(simLowKd, 3.0, () => ({ moveX: 0, moveZ: 0 }));

    const defOvershoot = Math.max(defClimb.maxX, defSettle.maxX) - simDefault.reference.x;
    const lowOvershoot = Math.max(lowClimb.maxX, lowSettle.maxX) - simLowKd.reference.x;

    assert.ok(lowOvershoot > defOvershoot + 0.8, 'low Kd must produce substantially larger overshoot');
    assert.ok(Math.hypot(simLowKd.drone.vx, simLowKd.drone.vz) > 0.5, 'low Kd should keep oscillating in mid-air');
  });

  it('Test 4 — High Kd: increases damping and extreme Kd produces sluggish movement', () => {
    const simDefault = new FlightSimulation({ autoStart: true, gains: DEFAULT_PID_GAINS });
    const simHighKd = new FlightSimulation({
      autoStart: true,
      gains: { kp: DEFAULT_PID_GAINS.kp, ki: DEFAULT_PID_GAINS.ki, kd: 15.0 }
    });

    stepSeconds(simDefault, 1.5, () => ({ moveX: 1, moveZ: 1 }));
    stepSeconds(simHighKd, 1.5, () => ({ moveX: 1, moveZ: 1 }));

    assert.ok(simHighKd.drone.x < simDefault.drone.x - 1.0, 'extreme Kd should make horizontal response sluggish');
    assert.ok(simHighKd.drone.z < simDefault.drone.z - 0.8, 'extreme Kd should make vertical response sluggish');
  });

  it('Test 5 — Integral Effect: reduces steady-state error under constant wind disturbance', () => {
    const simNoKi = new FlightSimulation({
      autoStart: true,
      gains: { kp: 6.0, ki: 0.0, kd: 3.6 },
      windMode: 'breeze'
    });
    const simWithKi = new FlightSimulation({
      autoStart: true,
      gains: { kp: 6.0, ki: 1.5, kd: 3.6 },
      windMode: 'breeze'
    });

    // Hover at altitude under sustained +3.6N crosswind
    stepSeconds(simNoKi, 1.0, () => ({ moveX: 0, moveZ: 1 }));
    stepSeconds(simNoKi, 8.0, () => ({ moveX: 0, moveZ: 0 }));

    stepSeconds(simWithKi, 1.0, () => ({ moveX: 0, moveZ: 1 }));
    stepSeconds(simWithKi, 8.0, () => ({ moveX: 0, moveZ: 0 }));

    const errNoKi = Math.abs(simNoKi.reference.x - simNoKi.drone.x);
    const errWithKi = Math.abs(simWithKi.reference.x - simWithKi.drone.x);

    assert.ok(errNoKi > 0.35, 'without Ki, constant wind should leave clear steady-state error');
    assert.ok(errWithKi < 0.08, 'with Ki enabled, steady-state error should shrink near zero');
    assert.ok(Math.abs(simWithKi.lastPid.x.iTerm) > 1.5, 'integral term must actively counteract wind');
  });

  it('Test 6 — Flight Accuracy: pilot can guide drone smoothly into target zone and stabilize', () => {
    const sim = new FlightSimulation({ autoStart: true, gains: DEFAULT_PID_GAINS });

    // Target zone is at (18.0, 6.5). Start is (4.0, 0.0).
    // Drive reference using simple pilot feedback (WASD) until ref reaches target, then release.
    for (let i = 0; i < Math.round(14 / FIXED_DT); i++) {
      const moveX = sim.reference.x < sim.targetZone.x - 0.03 ? 1 : 0;
      const moveZ = sim.reference.z < sim.targetZone.z - 0.03 ? 1 : 0;
      sim.stepFixed(FIXED_DT, { moveX, moveZ });
    }

    assert.equal(sim.targetZone.stabilized, true, 'drone should reach and stabilize inside the target zone');
  });

  it('Test 7 — Numerical Stability: consistent across 60Hz/120Hz/144Hz frame steps with no NaN', () => {
    function runAtFps(fps) {
      const sim = new FlightSimulation({ autoStart: true, gains: DEFAULT_PID_GAINS });
      const frameDt = 1 / fps;
      const totalFrames = Math.round(3.0 * fps);
      for (let f = 0; f < totalFrames; f++) {
        const axes = f * frameDt < 1.5 ? { moveX: 1, moveZ: 1 } : { moveX: 0, moveZ: 0 };
        sim.stepFrame(frameDt, axes);
      }
      return sim.drone;
    }

    const d60 = runAtFps(60);
    const d120 = runAtFps(120);
    const d144 = runAtFps(144);

    for (const d of [d60, d120, d144]) {
      assert.ok(Number.isFinite(d.x) && Number.isFinite(d.z));
      assert.ok(Number.isFinite(d.vx) && Number.isFinite(d.vz));
      assert.ok(d.z >= 0);
    }

    // Fixed-step accumulator keeps positions within one substep tolerance
    assert.ok(Math.abs(d60.x - d120.x) < 0.05);
    assert.ok(Math.abs(d144.x - d120.x) < 0.05);
    assert.ok(Math.abs(d60.z - d120.z) < 0.05);
  });

  it('Test 8 — Input Handling: key release, pause, restart, and clearMovementKeys prevent stuck keys', () => {
    let restarts = 0;
    let pauses = 0;
    const input = new InputController({
      onRestart: () => { restarts += 1; },
      onPauseToggle: () => { pauses += 1; }
    });

    input.handleKeyDown('KeyW');
    input.handleKeyDown('KeyD');
    assert.deepEqual(input.getAxes(), { moveX: 1, moveZ: 1 });

    input.handleKeyUp('KeyW');
    assert.deepEqual(input.getAxes(), { moveX: 1, moveZ: 0 });

    // Simulate blur / tab switch clearing held keys
    input.clearMovementKeys();
    assert.deepEqual(input.getAxes(), { moveX: 0, moveZ: 0 });

    input.handleKeyDown('KeyR', false);
    input.handleKeyDown('KeyR', true); // key repeat must not retrigger restart
    input.handleKeyDown('KeyP', false);
    assert.equal(restarts, 1);
    assert.equal(pauses, 1);
  });
});

describe('M1 — Player-Facing English UI Verification', () => {
  it('contains no Chinese characters in M1 source modules or updated index.html', () => {
    const cjkRegex = /[\u4e00-\u9fff]/;
    const files = [
      'index.html',
      'src/main.js',
      'src/pid.js',
      'src/physics.js',
      'src/input.js',
      'src/simulation.js',
      'src/renderer.js'
    ];
    for (const rel of files) {
      const content = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.equal(cjkRegex.test(content), false, `${rel} must contain no Chinese characters`);
    }
  });
});
