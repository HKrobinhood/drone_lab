/**
 * Fixed-timestep simulation loop, reference position generator,
 * and closed-loop PID-X / PID-Z coordination.
 *
 * Control Pipeline:
 *   WASD Input -> Reference Position Generator -> PID-X & PID-Z
 *   -> Drone Dynamics -> Actual Position / Velocity -> Sensor Feedback
 *
 * Pure JS module (no DOM/Canvas dependency).
 */

import { PIDController, clamp } from './pid.js';
import { DEFAULT_PHYSICS_CONFIG, createDroneState, stepDronePhysics } from './physics.js';

export const FIXED_DT = 1 / 120;
export const MAX_FRAME_DT = 0.05;

export const DEFAULT_PID_GAINS = Object.freeze({
  kp: 6.5,
  ki: 0.6,
  kd: 3.8
});

export const PID_SLIDER_BOUNDS = Object.freeze({
  kp: { min: 0, max: 18, step: 0.1 },
  ki: { min: 0, max: 8, step: 0.05 },
  kd: { min: 0, max: 16, step: 0.1 }
});

/**
 * Shared player Kp/Ki/Kd gains map through explicit per-axis scaling factors.
 * Z uses slightly higher P/D scaling to keep vertical climb crisp against gravity,
 * while X remains slightly gentler to reflect pitch-coupled horizontal dynamics.
 */
export const AXIS_GAIN_SCALES = Object.freeze({
  x: 1.0,
  z: 1.15
});

export const REF_SPEED = Object.freeze({
  x: 3.2,
  z: 2.8
});

export function computeWindForce(windMode, elapsedTime) {
  if (windMode === 'breeze') {
    return { x: 3.6, z: 0 };
  }
  if (windMode === 'gust') {
    return {
      x: 3.0 + 2.4 * Math.sin(elapsedTime * 1.6),
      z: 1.1 * Math.cos(elapsedTime * 2.1)
    };
  }
  return { x: 0, z: 0 };
}

export class FlightSimulation {
  constructor(options = {}) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...(options.config || {}) };
    this.startPos = {
      x: options.startPos?.x ?? 4.0,
      z: options.startPos?.z ?? 0.0
    };
    this.defaultTarget = {
      x: options.targetZone?.x ?? 18.0,
      z: options.targetZone?.z ?? 6.5,
      radius: options.targetZone?.radius ?? 1.35,
      holdRequired: options.targetZone?.holdRequired ?? 2.0,
      maxSpeed: options.targetZone?.maxSpeed ?? 0.45
    };

    this.gains = { ...DEFAULT_PID_GAINS, ...(options.gains || {}) };

    this.pidX = new PIDController({
      ...this.gains,
      outputMin: -14,
      outputMax: 14,
      integralLimit: 10,
      axisScale: AXIS_GAIN_SCALES.x
    });

    this.pidZ = new PIDController({
      ...this.gains,
      outputMin: -14,
      outputMax: 16,
      integralLimit: 10,
      axisScale: AXIS_GAIN_SCALES.z
    });

    this.trail = [];
    this.trailSampleTimer = 0;
    this.windMode = options.windMode || 'calm';
    this.reset(options.autoStart === true);
  }

  reset(startRunning = false) {
    this.drone = createDroneState(this.startPos);
    this.reference = {
      x: this.startPos.x,
      z: this.startPos.z
    };
    this.pidX.setGains(this.gains);
    this.pidZ.setGains(this.gains);
    this.pidX.reset();
    this.pidZ.reset();

    this.elapsedTime = 0;
    this.accumulator = 0;
    this.started = startRunning;
    this.paused = false;
    this.trail = [{ x: this.drone.x, z: this.drone.z }];
    this.trailSampleTimer = 0;

    this.targetZone = {
      ...this.defaultTarget,
      inside: false,
      holdTimer: 0,
      stabilized: false
    };

    this.lastPid = {
      x: this.pidX.lastResult,
      z: this.pidZ.lastResult
    };
  }

  startFlight() {
    this.started = true;
    this.paused = false;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
  }

  togglePause() {
    if (!this.started) return this.paused;
    this.paused = !this.paused;
    return this.paused;
  }

  setWindMode(mode) {
    this.windMode = mode;
  }

  setGains(nextGains) {
    if (Number.isFinite(nextGains.kp)) this.gains.kp = clamp(nextGains.kp, PID_SLIDER_BOUNDS.kp.min, PID_SLIDER_BOUNDS.kp.max);
    if (Number.isFinite(nextGains.ki)) this.gains.ki = clamp(nextGains.ki, PID_SLIDER_BOUNDS.ki.min, PID_SLIDER_BOUNDS.ki.max);
    if (Number.isFinite(nextGains.kd)) this.gains.kd = clamp(nextGains.kd, PID_SLIDER_BOUNDS.kd.min, PID_SLIDER_BOUNDS.kd.max);
    this.pidX.setGains(this.gains);
    this.pidZ.setGains(this.gains);
  }

  resetGains() {
    this.setGains(DEFAULT_PID_GAINS);
    return { ...this.gains };
  }

  /**
   * Update reference position from player WASD axes (never modifies drone coordinates directly).
   */
  updateReference(axes, dt) {
    const moveX = Number.isFinite(axes?.moveX) ? clamp(axes.moveX, -1, 1) : 0;
    const moveZ = Number.isFinite(axes?.moveZ) ? clamp(axes.moveZ, -1, 1) : 0;

    const marginX = 0.9;
    const maxRefZ = this.config.worldHeight - 1.0;

    this.reference.x = clamp(
      this.reference.x + moveX * REF_SPEED.x * dt,
      marginX,
      this.config.worldWidth - marginX
    );
    this.reference.z = clamp(
      this.reference.z + moveZ * REF_SPEED.z * dt,
      0,
      maxRefZ
    );
  }

  stepFixed(dt = FIXED_DT, axes = { moveX: 0, moveZ: 0 }) {
    if (!this.started || this.paused) return;

    this.updateReference(axes, dt);

    const wind = computeWindForce(this.windMode, this.elapsedTime);
    const resX = this.pidX.update(this.reference.x, this.drone.x, dt, this.drone.vx);
    const resZ = this.pidZ.update(this.reference.z, this.drone.z, dt, this.drone.vz);

    stepDronePhysics(
      this.drone,
      { axCmd: resX.output, azCmd: resZ.output },
      wind,
      dt,
      this.config
    );

    this.lastPid = { x: resX, z: resZ };
    this.elapsedTime += dt;

    // Sample trail at ~20 Hz
    this.trailSampleTimer += dt;
    if (this.trailSampleTimer >= 0.05) {
      this.trailSampleTimer = 0;
      this.trail.push({ x: this.drone.x, z: this.drone.z });
      if (this.trail.length > 320) {
        this.trail.shift();
      }
    }

    // Playground target zone stability check
    const dist = Math.hypot(this.drone.x - this.targetZone.x, this.drone.z - this.targetZone.z);
    const speed = Math.hypot(this.drone.vx, this.drone.vz);
    const inside = dist <= this.targetZone.radius;
    this.targetZone.inside = inside;

    if (inside && speed <= this.targetZone.maxSpeed) {
      this.targetZone.holdTimer = Math.min(
        this.targetZone.holdRequired,
        this.targetZone.holdTimer + dt
      );
      if (this.targetZone.holdTimer >= this.targetZone.holdRequired) {
        this.targetZone.stabilized = true;
      }
    } else if (!this.targetZone.stabilized) {
      // Reset timer if drone overshoots out of target zone or moves too fast
      this.targetZone.holdTimer = 0;
    }
  }

  /**
   * Frame-rate independent step using a fixed physics accumulator.
   */
  stepFrame(rawFrameDt, axes = { moveX: 0, moveZ: 0 }) {
    if (!this.started || this.paused) return 0;
    const clampedDt = Number.isFinite(rawFrameDt) ? clamp(rawFrameDt, 0, MAX_FRAME_DT) : 0;
    this.accumulator += clampedDt;

    let substeps = 0;
    while (this.accumulator >= FIXED_DT) {
      this.stepFixed(FIXED_DT, axes);
      this.accumulator -= FIXED_DT;
      substeps += 1;
    }
    return substeps;
  }

  getSnapshot() {
    const speed = Math.hypot(this.drone.vx, this.drone.vz);
    return {
      started: this.started,
      paused: this.paused,
      elapsedTime: this.elapsedTime,
      gains: { ...this.gains },
      reference: { ...this.reference },
      drone: { ...this.drone, speed },
      pid: this.lastPid,
      targetZone: { ...this.targetZone },
      windMode: this.windMode
    };
  }
}
