/**
 * Position-form PID controller with persistent integral state,
 * clamping anti-windup, output limiting, and measurement-velocity derivative.
 *
 * Pure JS module (no DOM/Canvas dependency) so it can be unit-tested in Node.js.
 */

export function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export class PIDController {
  /**
   * @param {object} [options]
   * @param {number} [options.kp=5.5] Proportional gain
   * @param {number} [options.ki=0.5] Integral gain
   * @param {number} [options.kd=3.2] Derivative gain
   * @param {number} [options.outputMin=-18] Minimum control output (m/s^2)
   * @param {number} [options.outputMax=18] Maximum control output (m/s^2)
   * @param {number} [options.integralLimit=12] Clamping limit on integral state (m*s)
   * @param {number} [options.axisScale=1.0] Internal per-axis physical scaling factor
   */
  constructor(options = {}) {
    this.kp = Number.isFinite(options.kp) ? Math.max(0, options.kp) : 6.5;
    this.ki = Number.isFinite(options.ki) ? Math.max(0, options.ki) : 0.6;
    this.kd = Number.isFinite(options.kd) ? Math.max(0, options.kd) : 3.8;
    this.outputMin = Number.isFinite(options.outputMin) ? options.outputMin : -18;
    this.outputMax = Number.isFinite(options.outputMax) ? options.outputMax : 18;
    this.integralLimit = Number.isFinite(options.integralLimit) ? Math.max(0, options.integralLimit) : 12;
    this.axisScale = Number.isFinite(options.axisScale) ? options.axisScale : 1.0;

    this.integral = 0;
    this.prevError = 0;
    this.prevMeasurement = 0;
    this.hasPrev = false;
    this.lastResult = this.#emptyResult();
  }

  #emptyResult() {
    return {
      output: 0,
      unclampedOutput: 0,
      error: 0,
      pTerm: 0,
      iTerm: 0,
      dTerm: 0,
      integral: 0,
      saturated: false
    };
  }

  setGains({ kp, ki, kd }) {
    if (Number.isFinite(kp)) this.kp = Math.max(0, kp);
    if (Number.isFinite(ki)) this.ki = Math.max(0, ki);
    if (Number.isFinite(kd)) this.kd = Math.max(0, kd);

    // Clear accumulated integral when Ki is turned off so re-enabling Ki starts clean.
    if (this.ki === 0) {
      this.integral = 0;
    }
  }

  reset() {
    this.integral = 0;
    this.prevError = 0;
    this.prevMeasurement = 0;
    this.hasPrev = false;
    this.lastResult = this.#emptyResult();
  }

  /**
   * Compute one fixed-step PID update.
   *
   * Note on Derivative Term:
   * Uses derivative-on-measurement (D = -Kd * measured_velocity) rather than full
   * d(error)/dt = d(reference - measurement)/dt. This eliminates derivative kick
   * when reference changes abruptly and ensures high Kd directly creates strong
   * physical damping. When WASD moves the reference position smoothly at constant
   * velocity, D = -Kd * v introduces a small velocity-proportional tracking lag
   * between the target reticle and drone, which is physically authentic and visually
   * observable to students.
   *
   * @param {number} reference Desired position (m)
   * @param {number} measurement Actual position (m)
   * @param {number} dt Fixed simulation timestep (s)
   * @param {number|null} [measuredVelocity=null] Optional velocity sensor reading (m/s)
   */
  update(reference, measurement, dt, measuredVelocity = null) {
    if (!Number.isFinite(reference) || !Number.isFinite(measurement) || !Number.isFinite(dt) || dt <= 0) {
      return this.lastResult;
    }

    const error = reference - measurement;
    const effKp = this.kp * this.axisScale;
    const effKi = this.ki * this.axisScale;
    const effKd = this.kd * this.axisScale;

    const pTerm = effKp * error;

    let velocity = 0;
    if (Number.isFinite(measuredVelocity)) {
      velocity = measuredVelocity;
    } else if (this.hasPrev) {
      velocity = (measurement - this.prevMeasurement) / dt;
    }
    const dTerm = -effKd * velocity || 0;

    // Candidate integral update with clamping + conditional anti-windup
    let nextIntegral = this.integral;
    if (effKi > 0) {
      const candidateIntegral = clamp(
        this.integral + error * dt,
        -this.integralLimit,
        this.integralLimit
      );
      const provisionalOutput = pTerm + effKi * this.integral + dTerm;
      const saturatedHigh = provisionalOutput >= this.outputMax && error > 0;
      const saturatedLow = provisionalOutput <= this.outputMin && error < 0;

      if (!saturatedHigh && !saturatedLow) {
        nextIntegral = candidateIntegral;
      }
    } else {
      nextIntegral = 0;
    }

    this.integral = nextIntegral;
    const iTerm = effKi * this.integral;

    const unclampedOutput = pTerm + iTerm + dTerm;
    const output = clamp(unclampedOutput, this.outputMin, this.outputMax);
    const saturated = output !== unclampedOutput;

    this.prevError = error;
    this.prevMeasurement = measurement;
    this.hasPrev = true;

    this.lastResult = {
      output,
      unclampedOutput,
      error,
      pTerm,
      iTerm,
      dTerm,
      integral: this.integral,
      saturated
    };

    return this.lastResult;
  }
}
