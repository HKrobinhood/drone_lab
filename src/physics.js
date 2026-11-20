/**
 * 2D Drone Rigid-Body Dynamics Model.
 *
 * Coordinate system (meters, seconds, kg, Newtons, radians):
 * - x: horizontal position [0, worldWidth]
 * - z: altitude above ground [0, worldHeight] (positive upward)
 * - theta: pitch angle in radians (positive = nose tilted right -> +x thrust)
 *
 * Equations of motion:
 *   m * x_dd = T * sin(theta) + F_wind_x - drag_x * vx
 *   m * z_dd = T * cos(theta) - m * g + F_wind_z - drag_z * vz
 *
 * Pure JS module (no DOM/Canvas dependency).
 */

import { clamp } from './pid.js';

export const DEFAULT_PHYSICS_CONFIG = Object.freeze({
  mass: 1.2,
  gravity: 9.81,
  minThrust: 0,
  maxThrust: 28.0,
  maxTiltRad: (32 * Math.PI) / 180,
  tiltTimeConstant: 0.08,
  linearDragX: 0.16,
  linearDragZ: 0.16,
  droneRadius: 0.45,
  worldWidth: 24.0,
  worldHeight: 14.0,
  hardLandingSpeed: 3.5
});

export function createDroneState(startPos = {}) {
  const x = Number.isFinite(startPos.x) ? startPos.x : 4.0;
  const z = Number.isFinite(startPos.z) ? startPos.z : 0.0;
  return {
    x,
    z,
    prevX: x,
    prevZ: z,
    vx: 0,
    vz: 0,
    ax: 0,
    az: 0,
    theta: 0,
    thrust: 0,
    onGround: z <= 0.001,
    onPad: false,
    landedHard: false,
    maxImpactSpeed: 0,
    windX: 0,
    windZ: 0
  };
}

export function circleIntersectsRect(cx, cz, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestZ = clamp(cz, rect.z, rect.z + rect.height);
  const dx = cx - closestX;
  const dz = cz - closestZ;
  return dx * dx + dz * dz <= radius * radius;
}

/**
 * Advance the 2D drone physics by one fixed timestep `dt`.
 *
 * @param {object} state Drone state object (mutated in place and returned)
 * @param {object} accelCmd Desired corrective accelerations `{ axCmd, azCmd }` (m/s^2)
 * @param {object} [windForce] External wind disturbance `{ x, z }` (N)
 * @param {number} dt Fixed timestep (s)
 * @param {object} [config] Physics constants
 */
export function stepDronePhysics(
  state,
  accelCmd,
  windForce = { x: 0, z: 0 },
  dt = 1 / 120,
  config = DEFAULT_PHYSICS_CONFIG,
  landingPad = null
) {
  if (!Number.isFinite(dt) || dt <= 0) return state;

  state.prevX = state.x;
  state.prevZ = state.z;

  const axCmd = Number.isFinite(accelCmd?.axCmd) ? accelCmd.axCmd : 0;
  const azCmd = Number.isFinite(accelCmd?.azCmd) ? accelCmd.azCmd : 0;
  const windX = Number.isFinite(windForce?.x) ? windForce.x : 0;
  const windZ = Number.isFinite(windForce?.z) ? windForce.z : 0;

  // Nominal hover lift compensation plus PID vertical acceleration command.
  // When resting on ground/pad with non-positive upward command, motors remain idle.
  const desiredLiftAccel = config.gravity + azCmd;
  const restingSurface = state.z <= 0.002 || state.onPad;
  const restingIdle =
    restingSurface &&
    azCmd <= 0.05 &&
    Math.abs(axCmd) <= 0.05 &&
    Math.abs(state.vz) <= 0.05;

  let targetTheta = 0;
  let thrust = 0;

  if (!restingIdle) {
    const effectiveVerticalLift = Math.max(0.5, desiredLiftAccel);
    const rawTheta = Math.atan2(axCmd, effectiveVerticalLift);
    targetTheta = clamp(rawTheta, -config.maxTiltRad, config.maxTiltRad);

    // Maintain requested vertical lift without injecting parasitic upward thrust when tilt saturates.
    const rawThrust = (config.mass * Math.max(0, desiredLiftAccel)) / Math.cos(targetTheta);
    thrust = clamp(rawThrust, config.minThrust, config.maxThrust);
  }

  // 1st-order attitude actuator lag models rotational inertia
  const tiltAlpha = clamp(dt / config.tiltTimeConstant, 0, 1);
  let theta = state.theta + (targetTheta - state.theta) * tiltAlpha;

  const fx = thrust * Math.sin(theta) + windX - config.linearDragX * state.vx;
  const fz = thrust * Math.cos(theta) - config.mass * config.gravity + windZ - config.linearDragZ * state.vz;

  let ax = fx / config.mass;
  let az = fz / config.mass;

  let vx = state.vx + ax * dt;
  let vz = state.vz + az * dt;

  let x = state.x + vx * dt;
  let z = state.z + vz * dt;

  let onGround = false;
  let onPad = false;

  // Elevated landing pad surface support (when descending onto top deck)
  if (landingPad) {
    const overDeck = Math.abs(x - landingPad.x) <= landingPad.halfWidth - 0.12;
    const crossedTop = state.prevZ >= landingPad.topZ - 0.12 && z <= landingPad.topZ;
    if (overDeck && crossedTop && vz <= 0) {
      const impactSpeed = Math.abs(state.vz);
      if (impactSpeed > state.maxImpactSpeed) {
        state.maxImpactSpeed = impactSpeed;
      }
      const padLimit = landingPad.maxTouchdownSpeed ?? config.hardLandingSpeed;
      if (impactSpeed > padLimit) {
        state.landedHard = true;
      }
      z = landingPad.topZ;
      vz = 0;
      vx *= 0.85;
      if (Math.abs(vx) < 0.01) vx = 0;
      theta *= 0.85;
      onPad = true;
    }
  }

  if (z <= 0) {
    const impactSpeed = state.vz < 0 ? Math.abs(state.vz) : 0;
    if (impactSpeed > state.maxImpactSpeed) {
      state.maxImpactSpeed = impactSpeed;
    }
    if (impactSpeed > config.hardLandingSpeed) {
      state.landedHard = true;
    }

    z = 0;
    if (vz < 0) vz = 0;
    // Ground skid damping prevents sliding endlessly when resting on landing pad
    vx *= 0.85;
    if (Math.abs(vx) < 0.01) vx = 0;
    theta *= 0.85;
    onGround = true;
  }

  const maxZ = config.worldHeight - config.droneRadius;
  if (z >= maxZ) {
    z = maxZ;
    if (vz > 0) vz = 0;
  }

  const minX = config.droneRadius;
  const maxX = config.worldWidth - config.droneRadius;
  if (x <= minX) {
    x = minX;
    if (vx < 0) vx = 0;
  } else if (x >= maxX) {
    x = maxX;
    if (vx > 0) vx = 0;
  }

  state.x = Number.isFinite(x) ? x : config.worldWidth * 0.5;
  state.z = Number.isFinite(z) ? z : 0;
  state.vx = Number.isFinite(vx) ? vx : 0;
  state.vz = Number.isFinite(vz) ? vz : 0;
  state.ax = Number.isFinite(ax) ? ax : 0;
  state.az = Number.isFinite(az) ? az : 0;
  state.theta = Number.isFinite(theta) ? theta : 0;
  state.thrust = Number.isFinite(thrust) ? thrust : 0;
  state.onGround = onGround;
  state.onPad = onPad;
  state.windX = windX;
  state.windZ = windZ;

  return state;
}
