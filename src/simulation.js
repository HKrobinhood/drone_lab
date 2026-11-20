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
import {
  DEFAULT_PHYSICS_CONFIG,
  createDroneState,
  stepDronePhysics,
  circleIntersectsRect
} from './physics.js';

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
  if (windMode === 'strong_breeze') {
    return { x: 4.8, z: 0 };
  }
  if (windMode === 'gust') {
    return {
      x: 3.0 + 2.4 * Math.sin(elapsedTime * 1.6),
      z: 1.1 * Math.cos(elapsedTime * 2.1)
    };
  }
  if (windMode === 'challenge_gust') {
    // Sustained crosswind + periodic gust surges
    const cycle = elapsedTime % 7.0;
    const gustPulse = cycle >= 3.2 && cycle <= 5.6 ? Math.sin(((cycle - 3.2) / 2.4) * Math.PI) : 0;
    return {
      x: 3.5 + 3.1 * gustPulse,
      z: -1.4 * gustPulse
    };
  }
  return { x: 0, z: 0 };
}

export function computeSceneWindForce(scene, windMode, elapsedTime) {
  if (scene && (scene.windForce || scene.windGust)) {
    let wx = Number.isFinite(scene.windForce?.x) ? scene.windForce.x : 0;
    let wz = Number.isFinite(scene.windForce?.z) ? scene.windForce.z : 0;

    if (scene.windGust) {
      const period = Math.max(0.5, scene.windGust.period ?? 6.5);
      const duration = clamp(scene.windGust.duration ?? 2.2, 0.1, period);
      const offset = scene.windGust.phaseOffset ?? 0;
      const cycle = (elapsedTime + offset) % period;
      const pulse = cycle <= duration ? Math.sin((cycle / duration) * Math.PI) : 0;
      wx += (scene.windGust.xAmp ?? 0) * pulse;
      wz += (scene.windGust.zAmp ?? 0) * pulse;
    }

    return { x: wx, z: wz };
  }
  return computeWindForce(windMode, elapsedTime);
}

export class FlightSimulation {
  constructor(options = {}) {
    this.baseConfig = { ...DEFAULT_PHYSICS_CONFIG, ...(options.config || {}) };
    this.config = { ...this.baseConfig };
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
    this.activeScene = null;
    this.obstacles = options.obstacles || [];
    this.landingPad = options.landingPad || null;
    this.ringDefs = options.rings || [];
    this.outOfBoundsMargin = options.outOfBoundsMargin ?? null;
    this.reset(options.autoStart === true);
  }

  loadScene(scene, startRunning = false, options = {}) {
    this.activeScene = scene || null;
    if (scene) {
      const maxTiltRad = Number.isFinite(scene.maxTilt)
        ? (scene.maxTilt * Math.PI) / 180
        : this.baseConfig.maxTiltRad;
      const droneMass = Number.isFinite(scene.droneMass)
        ? scene.droneMass
        : this.baseConfig.droneMass;

      this.config = {
        ...this.baseConfig,
        mass: droneMass,
        droneMass,
        payloadMass: Number.isFinite(scene.payloadMass) ? scene.payloadMass : 0,
        maxThrust: Number.isFinite(scene.maxThrust) ? scene.maxThrust : this.baseConfig.maxThrust,
        maxTiltRad
      };

      this.startPos = {
        x: scene.startPos?.x ?? 4.0,
        z: scene.startPos?.z ?? 0.0
      };
      this.defaultTarget = scene.targetZone
        ? {
            x: scene.targetZone.x,
            z: scene.targetZone.z,
            radius: scene.targetTolerance ?? scene.targetZone.radius ?? 1.35,
            holdRequired: scene.targetZone.holdRequired ?? 2.0,
            maxSpeed: scene.velocityTolerance ?? scene.targetZone.maxSpeed ?? 0.45
          }
        : null;
      this.windMode = scene.windMode || (scene.windForce || scene.windGust ? 'scene_wind' : 'calm');
      this.obstacles = scene.obstacles || [];
      this.landingPad = scene.landingPad
        ? {
            ...scene.landingPad,
            maxTouchdownSpeed: scene.velocityTolerance ?? scene.landingPad.maxTouchdownSpeed
          }
        : null;
      this.ringDefs = scene.rings || [];
      this.outOfBoundsMargin = scene.outOfBoundsMargin ?? null;

      if (!options.preserveGains) {
        this.setGains(scene.initialPID || scene.initialGains || DEFAULT_PID_GAINS);
      }
    } else {
      this.config = { ...this.baseConfig };
    }
    this.reset(startRunning);
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

    this.targetZone = this.defaultTarget
      ? {
          ...this.defaultTarget,
          inside: false,
          holdTimer: 0,
          stabilized: false
        }
      : null;

    this.rings = this.ringDefs.map((ring, idx) => ({
      ...ring,
      index: idx,
      passed: false
    }));
    this.nextRingIndex = 0;

    this.padStatus = {
      inside: false,
      holdTimer: 0,
      landedSafely: false
    };

    this.collided = false;
    this.collisionCount = 0;
    this.outOfBounds = false;
    this.landedOffPad = false;
    this.hasBeenAirborne = this.startPos.z > 0.25;

    // Telemetry metrics accumulators (M3.1 -> M4 scoring interface)
    this.metrics = {
      maxOvershoot: 0,
      trackingErrorSum: 0,
      sampleCount: 0,
      controlSaturationDuration: 0
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

    const marginX = 0.35;
    const maxRefZ = this.config.worldHeight - 0.35;

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

    const wind = computeSceneWindForce(this.activeScene, this.windMode, this.elapsedTime);
    const resX = this.pidX.update(this.reference.x, this.drone.x, dt, this.drone.vx);
    const resZ = this.pidZ.update(this.reference.z, this.drone.z, dt, this.drone.vz);

    stepDronePhysics(
      this.drone,
      { axCmd: resX.output, azCmd: resZ.output },
      wind,
      dt,
      this.config,
      this.landingPad
    );

    this.lastPid = { x: resX, z: resZ };
    this.elapsedTime += dt;
    if (this.drone.z > 0.35) {
      this.hasBeenAirborne = true;
    }

    // Record M4 scoring telemetry metrics
    const errX = this.reference.x - this.drone.x;
    const errZ = this.reference.z - this.drone.z;
    const trackingErr = Math.hypot(errX, errZ);
    this.metrics.trackingErrorSum += trackingErr;
    this.metrics.sampleCount += 1;

    // Overshoot: excursion past reference while velocity carries drone away from reference
    const movingPastRef = this.drone.vx * -errX + this.drone.vz * -errZ > 0.05;
    if (movingPastRef && trackingErr > this.metrics.maxOvershoot) {
      this.metrics.maxOvershoot = trackingErr;
    }

    const thrustSaturated = this.drone.thrust >= this.config.maxThrust - 0.05;
    if (thrustSaturated || resX.saturated || resZ.saturated) {
      this.metrics.controlSaturationDuration += dt;
    }

    // Sample trail at ~20 Hz
    this.trailSampleTimer += dt;
    if (this.trailSampleTimer >= 0.05) {
      this.trailSampleTimer = 0;
      this.trail.push({ x: this.drone.x, z: this.drone.z });
      if (this.trail.length > 320) {
        this.trail.shift();
      }
    }

    this.#updateSceneChecks(dt);
  }

  #updateSceneChecks(dt) {
    const hitRadius = this.config.droneRadius * 0.82;
    const speed = Math.hypot(this.drone.vx, this.drone.vz);

    // 1. Out-of-bounds safety perimeter check
    if (Number.isFinite(this.outOfBoundsMargin)) {
      const m = this.outOfBoundsMargin;
      if (
        this.drone.x < m ||
        this.drone.x > this.config.worldWidth - m ||
        this.drone.z > this.config.worldHeight - m
      ) {
        this.outOfBounds = true;
      }
    }

    // 2. Obstacle collisions
    for (const obs of this.obstacles) {
      if (circleIntersectsRect(this.drone.x, this.drone.z, hitRadius, obs)) {
        this.collided = true;
        this.collisionCount += 1;
        break;
      }
    }

    // 3. Landing pad pedestal side collision & precision landing state
    if (this.landingPad) {
      const pad = this.landingPad;
      const pedestalRect = {
        x: pad.x - pad.halfWidth,
        z: 0,
        width: pad.halfWidth * 2,
        height: Math.max(0, pad.topZ - 0.14)
      };
      // Only collide with the pedestal if the drone drops below deck height and strikes its side
      if (
        pedestalRect.height > 0 &&
        this.drone.z < pad.topZ - 0.05 &&
        circleIntersectsRect(this.drone.x, this.drone.z, hitRadius, pedestalRect)
      ) {
        this.collided = true;
        this.collisionCount += 1;
      }

      const onDeck = this.drone.onPad && Math.abs(this.drone.x - pad.x) <= pad.halfWidth - 0.12;
      this.padStatus.inside = onDeck;
      const ringsCleared = this.nextRingIndex >= this.rings.length;

      if (onDeck && speed <= 0.25 && !this.drone.landedHard && ringsCleared) {
        this.padStatus.holdTimer = Math.min(pad.holdRequired, this.padStatus.holdTimer + dt);
        if (this.padStatus.holdTimer >= pad.holdRequired) {
          this.padStatus.landedSafely = true;
        }
      } else if (!this.padStatus.landedSafely) {
        this.padStatus.holdTimer = 0;
      }

      if (
        this.activeScene?.forbidGroundOutsidePad &&
        this.hasBeenAirborne &&
        this.drone.onGround &&
        !this.drone.onPad &&
        Math.abs(this.drone.x - this.startPos.x) > 2.4
      ) {
        this.landedOffPad = true;
      }
    }

    // 4. Sequential ring traversal (actual plane-crossing + aperture clearance + rim collision)
    if (this.rings.length > 0) {
      for (const ring of this.rings) {
        const rimHalfW = 0.16;
        const rimHeight = 0.42;
        const topRim = {
          x: ring.x - rimHalfW,
          z: ring.z + ring.apertureHalfH,
          width: rimHalfW * 2,
          height: rimHeight
        };
        const bottomRim = {
          x: ring.x - rimHalfW,
          z: ring.z - ring.apertureHalfH - rimHeight,
          width: rimHalfW * 2,
          height: rimHeight
        };

        if (
          circleIntersectsRect(this.drone.x, this.drone.z, hitRadius, topRim) ||
          circleIntersectsRect(this.drone.x, this.drone.z, hitRadius, bottomRim)
        ) {
          this.collided = true;
          this.collisionCount += 1;
          break;
        }
      }

      if (this.nextRingIndex < this.rings.length) {
        const activeRing = this.rings[this.nextRingIndex];
        const crossedForward = this.drone.prevX < activeRing.x && this.drone.x >= activeRing.x;
        if (crossedForward) {
          const dx = this.drone.x - this.drone.prevX;
          const t = dx !== 0 ? (activeRing.x - this.drone.prevX) / dx : 0.5;
          const zAtCross = this.drone.prevZ + (this.drone.z - this.drone.prevZ) * t;
          const clearance = activeRing.apertureHalfH - hitRadius * 0.4;
          if (Math.abs(zAtCross - activeRing.z) <= clearance) {
            activeRing.passed = true;
            this.nextRingIndex += 1;
          }
        }
      }
    }

    // 5. Target zone stability check (requires all rings cleared first if rings exist)
    if (this.targetZone) {
      const dist = Math.hypot(this.drone.x - this.targetZone.x, this.drone.z - this.targetZone.z);
      const inside = dist <= this.targetZone.radius;
      this.targetZone.inside = inside;

      const ringsCleared = this.nextRingIndex >= this.rings.length;
      if (inside && speed <= this.targetZone.maxSpeed && ringsCleared) {
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

  getFlightMetrics() {
    const goalX = this.landingPad?.x ?? this.targetZone?.x ?? this.reference.x;
    const goalZ = this.landingPad?.topZ ?? this.targetZone?.z ?? this.reference.z;
    const finalPositionError = Math.hypot(goalX - this.drone.x, goalZ - this.drone.z);
    const finalVelocity = Math.hypot(this.drone.vx, this.drone.vz);
    const averageTrackingError =
      this.metrics.sampleCount > 0 ? this.metrics.trackingErrorSum / this.metrics.sampleCount : 0;

    return {
      completionTime: this.elapsedTime,
      maxOvershoot: this.metrics.maxOvershoot,
      averageTrackingError,
      finalPositionError,
      finalVelocity,
      collisionCount: this.collisionCount,
      controlSaturationDuration: this.metrics.controlSaturationDuration,
      pidParameters: { ...this.gains }
    };
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
      targetZone: this.targetZone ? { ...this.targetZone } : null,
      landingPad: this.landingPad ? { ...this.landingPad, ...this.padStatus } : null,
      rings: this.rings.map((r) => ({ ...r })),
      nextRingIndex: this.nextRingIndex,
      collided: this.collided,
      collisionCount: this.collisionCount,
      outOfBounds: this.outOfBounds,
      landedOffPad: this.landedOffPad,
      windMode: this.windMode,
      metrics: this.getFlightMetrics()
    };
  }
}
