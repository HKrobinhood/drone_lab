/**
 * Standardized PID Test Bench (pure JS, no DOM/Canvas dependency).
 *
 * Runs short, deterministic closed-loop experiments using the exact same
 * FlightSimulation, PIDController, Drone Dynamics, actuator limits, mass,
 * gravity, and wind forces as manual WASD flight—never mutating the active
 * flight simulation instance and never faking animations or fabricated metrics.
 */

import { FlightSimulation, FIXED_DT } from './simulation.js';
import { clamp } from './pid.js';

export const BENCH_DURATION_SEC = 6.5;
export const BENCH_SAMPLE_INTERVAL = 0.05; // 20 Hz plotting resolution

export const TUNING_CHALLENGES = Object.freeze({
  'tutorial-1': {
    testType: 'takeoff_step',
    axis: 'z',
    title: 'Reach the target height.',
    shortGoal: 'Climb cleanly to +3.0 m and stay near target.',
    check: (m) => m.reachedTarget && m.steadyStateError !== null && m.steadyStateError <= 0.45
  },
  'tutorial-2': {
    testType: 'step',
    axis: 'x',
    title: 'Improve response speed.',
    shortGoal: 'Reach target step quickly (settling <= 3.6 s) without wild overshoot.',
    check: (m) =>
      m.reachedTarget &&
      m.settlingTime !== null &&
      m.settlingTime <= 3.6 &&
      (m.overshootPct === null || m.overshootPct <= 28)
  },
  'tutorial-3': {
    testType: 'wind',
    axis: 'x',
    title: 'Reduce steady-state drift.',
    shortGoal: 'Hold steady drift <= 0.28 m against crosswind.',
    check: (m) => m.steadyStateError !== null && m.steadyStateError <= 0.28 && m.maxDeviation <= 1.2
  },
  'tutorial-4': {
    testType: 'step',
    axis: 'x',
    title: 'Reduce overshoot.',
    shortGoal: 'Keep step overshoot <= 12% and settle cleanly.',
    check: (m) =>
      m.reachedTarget &&
      m.settled &&
      m.overshootPct !== null &&
      m.overshootPct <= 12 &&
      m.settlingTime !== null &&
      m.settlingTime <= 4.2
  },
  'level-1': {
    testType: 'step',
    axis: 'z',
    title: 'Fast agile lift & settle.',
    shortGoal: 'Settle <= 2.4 s on altitude step with overshoot <= 20%.',
    check: (m) =>
      m.reachedTarget &&
      m.settlingTime !== null &&
      m.settlingTime <= 2.4 &&
      (m.overshootPct === null || m.overshootPct <= 20)
  },
  'level-2': {
    testType: 'step',
    axis: 'x',
    title: 'Smooth braking with low overshoot.',
    shortGoal: 'Brake with <= 8% overshoot and settle cleanly.',
    check: (m) =>
      m.reachedTarget &&
      m.settled &&
      m.overshootPct !== null &&
      m.overshootPct <= 8 &&
      m.steadyStateError !== null &&
      m.steadyStateError <= 0.2
  },
  'level-3': {
    testType: 'step',
    axis: 'z',
    title: 'Lift heavy cargo smoothly.',
    shortGoal: 'Hold altitude error <= 0.25 m with low power drain.',
    check: (m) =>
      m.reachedTarget &&
      m.steadyStateError !== null &&
      m.steadyStateError <= 0.25 &&
      (m.overshootPct === null || m.overshootPct <= 16) &&
      m.energyUsed <= 1250
  },
  'level-4': {
    testType: 'step',
    axis: 'x',
    title: 'Precision control with tight tracking.',
    shortGoal: 'Keep overshoot <= 10% and settle within 3.4 s.',
    check: (m) =>
      m.reachedTarget &&
      m.settled &&
      m.overshootPct !== null &&
      m.overshootPct <= 10 &&
      m.settlingTime !== null &&
      m.settlingTime <= 3.4
  },
  'level-5': {
    testType: 'wind',
    axis: 'x',
    title: 'Wind resistance & drift control.',
    shortGoal: 'Hold steady drift <= 0.30 m under gusts without oscillation.',
    check: (m) => m.steadyStateError !== null && m.steadyStateError <= 0.30 && m.maxDeviation <= 1.25
  },
  'level-6': {
    testType: 'wind',
    axis: 'x',
    title: 'Final Rescue: cargo + wind balance.',
    shortGoal: 'Keep drift <= 0.32 m and vertical sag <= 0.30 m under load & wind.',
    check: (m) =>
      m.steadyStateError !== null &&
      m.steadyStateError <= 0.32 &&
      m.verticalSag <= 0.30 &&
      m.maxDeviation <= 1.35
  }
});

export function getTuningChallengeForScene(scene) {
  if (!scene) {
    return {
      testType: 'step',
      axis: 'z',
      title: 'Stabilize cleanly on target.',
      shortGoal: 'Reach target and settle with low overshoot.',
      check: (m) => m.reachedTarget && m.settled && (m.overshootPct === null || m.overshootPct <= 15)
    };
  }
  if (TUNING_CHALLENGES[scene.id]) {
    return TUNING_CHALLENGES[scene.id];
  }
  const hasWind =
    Math.abs(scene.windForce?.x || 0) > 0.2 ||
    Math.abs(scene.windGust?.xAmp || 0) > 0.2 ||
    scene.windMode === 'strong_breeze' ||
    scene.windMode === 'challenge_gust';
  return hasWind
    ? {
        testType: 'wind',
        axis: 'x',
        title: 'Hold steady against wind.',
        shortGoal: 'Reduce steady-state wind drift below 0.30 m.',
        check: (m) => m.steadyStateError !== null && m.steadyStateError <= 0.30
      }
    : {
        testType: 'step',
        axis: 'z',
        title: 'Settle smoothly on target.',
        shortGoal: 'Reach target step with overshoot <= 15%.',
        check: (m) => m.reachedTarget && m.settled && (m.overshootPct === null || m.overshootPct <= 15)
      };
}

export function selectBenchTestType(scene) {
  return getTuningChallengeForScene(scene).testType;
}

/**
 * Build a deterministic experiment condition key so Before/After comparisons
 * only happen across identical physical & test configurations.
 */
export function buildExperimentKey(scene, testType, axis, stepSize) {
  const id = scene?.id || 'custom';
  const mass = ((scene?.droneMass ?? 1.2) + (scene?.payloadMass ?? 0)).toFixed(2);
  const thrust = (scene?.maxThrust ?? 28.0).toFixed(1);
  const wx = (scene?.windForce?.x ?? 0).toFixed(1);
  const gx = (scene?.windGust?.xAmp ?? 0).toFixed(1);
  return `${id}|${testType}|${axis}|m=${mass}|t=${thrust}|wx=${wx}|gx=${gx}|s=${stepSize.toFixed(1)}`;
}

/**
 * Run a deterministic, isolated PID Test Bench experiment using the real
 * FlightSimulation engine (120 Hz physics, real PIDController, thrust/tilt limits,
 * gravity, mass, and scene wind).
 */
export function runPidBenchTest(gains, scene, options = {}) {
  const challenge = getTuningChallengeForScene(scene);
  const testType = options.testType || challenge.testType;
  const axis = options.axis || challenge.axis || (testType === 'wind' ? 'x' : 'z');
  const duration = Number.isFinite(options.duration) ? clamp(options.duration, 2, 12) : BENCH_DURATION_SEC;

  // Create an isolated simulation instance — NEVER touches live flight sim
  const benchSim = new FlightSimulation();
  const safeScene = scene
    ? {
        ...scene,
        // Disable unrelated level-specific collision walls/bounds for clean bench characterization
        obstacles: [],
        rings: [],
        landingPad: null,
        outOfBoundsMargin: null,
        failOnBatteryEmpty: false
      }
    : null;

  benchSim.loadScene(safeScene, true);
  const cleanGains = {
    kp: Number.isFinite(gains?.kp) ? gains.kp : 0,
    ki: Number.isFinite(gains?.ki) ? gains.ki : 0,
    kd: Number.isFinite(gains?.kd) ? gains.kd : 0
  };
  benchSim.setGains(cleanGains);

  // Standardized initial & target states
  const stepSize = testType === 'wind' ? 0.0 : 3.0;
  let startX = 8.0;
  let startZ = 4.5;
  let targetX = 8.0;
  let targetZ = 4.5;

  if (testType === 'takeoff_step') {
    startX = 8.0;
    startZ = 0.0;
    targetX = 8.0;
    targetZ = 3.0;
  } else if (testType === 'step') {
    if (axis === 'x') {
      startX = 6.0;
      startZ = 5.5;
      targetX = 9.0;
      targetZ = 5.5;
    } else {
      startX = 8.0;
      startZ = 3.5;
      targetX = 8.0;
      targetZ = 6.5;
    }
  } else if (testType === 'wind') {
    startX = 9.0;
    startZ = 5.5;
    targetX = 9.0;
    targetZ = 5.5;
  }

  // Place drone at clean starting equilibrium for mid-air step/wind tests
  benchSim.drone.x = startX;
  benchSim.drone.z = startZ;
  benchSim.drone.vx = 0;
  benchSim.drone.vz = 0;
  benchSim.drone.theta = 0;
  benchSim.drone.omega = 0;
  benchSim.drone.onGround = startZ <= 0.001;
  const hoverThrust = (benchSim.config.droneMass + benchSim.config.payloadMass) * benchSim.config.gravity;
  benchSim.drone.thrust = startZ > 0.1 ? Math.min(benchSim.config.maxThrust, hoverThrust) : 0;
  benchSim.drone.prevThrust = benchSim.drone.thrust;

  // Set fixed reference step target
  benchSim.reference.x = targetX;
  benchSim.reference.z = targetZ;

  const refAxisVal = axis === 'x' ? targetX : targetZ;
  const startAxisVal = axis === 'x' ? startX : startZ;

  const samples = [
    {
      t: 0,
      ref: refAxisVal,
      actual: startAxisVal,
      error: refAxisVal - startAxisVal,
      x: benchSim.drone.x,
      z: benchSim.drone.z,
      thrust: benchSim.drone.thrust,
      saturated: false
    }
  ];

  const totalSteps = Math.round(duration / FIXED_DT);
  let sampleAccum = 0;

  let peakActual = startAxisVal;
  let maxDeviation = 0;
  let verticalSag = 0;
  let riseTime = null;
  let crossedTarget = false;
  let settledTimeCandidate = null;
  let lastOutsideBandTime = 0;
  let lateErrSum = 0;
  let lateErrCount = 0;
  let satDuration = 0;

  const settleBand = testType === 'wind' ? 0.25 : Math.max(0.22, stepSize * 0.075);
  const riseThreshold = startAxisVal + stepSize * 0.9;
  const reachedThreshold = startAxisVal + stepSize * 0.78;
  let reachedTarget = testType === 'wind';

  for (let i = 1; i <= totalSteps; i++) {
    benchSim.stepFixed(FIXED_DT, { moveX: 0, moveZ: 0 });
    const t = benchSim.elapsedTime;
    const actual = axis === 'x' ? benchSim.drone.x : benchSim.drone.z;
    const err = refAxisVal - actual;
    const absErr = Math.abs(err);
    const speedAxis = Math.abs(axis === 'x' ? benchSim.drone.vx : benchSim.drone.vz);

    if (actual > peakActual) peakActual = actual;
    if (absErr > maxDeviation) maxDeviation = absErr;

    const zErr = Math.abs(targetZ - benchSim.drone.z);
    if (t >= duration - 1.5 && zErr > verticalSag) {
      verticalSag = zErr;
    }

    if (testType !== 'wind') {
      if (actual >= reachedThreshold) reachedTarget = true;
      if (riseTime === null && actual >= riseThreshold) {
        riseTime = t;
      }
      if (actual > refAxisVal) crossedTarget = true;
    }

    const inBand = absErr <= settleBand && speedAxis <= 0.38;
    if (!inBand) {
      lastOutsideBandTime = t;
      settledTimeCandidate = null;
    } else if (settledTimeCandidate === null) {
      settledTimeCandidate = t;
    }

    if (t >= duration - 1.0) {
      lateErrSum += absErr;
      lateErrCount += 1;
    }

    const saturated =
      benchSim.drone.thrust >= benchSim.config.maxThrust - 0.05 ||
      Boolean(benchSim.lastPid?.x?.saturated) ||
      Boolean(benchSim.lastPid?.z?.saturated);
    if (saturated) satDuration += FIXED_DT;

    sampleAccum += FIXED_DT;
    if (sampleAccum >= BENCH_SAMPLE_INTERVAL - 1e-6 || i === totalSteps) {
      sampleAccum = 0;
      samples.push({
        t: Number(t.toFixed(3)),
        ref: Number(refAxisVal.toFixed(3)),
        actual: Number(actual.toFixed(3)),
        error: Number(err.toFixed(3)),
        x: Number(benchSim.drone.x.toFixed(3)),
        z: Number(benchSim.drone.z.toFixed(3)),
        thrust: Number(benchSim.drone.thrust.toFixed(2)),
        saturated
      });
    }
  }

  // Honest settling computation: must remain inside tolerance band through end of test for >= 0.45 s
  const finalSample = samples[samples.length - 1];
  const stayedSettled =
    settledTimeCandidate !== null &&
    duration - settledTimeCandidate >= 0.45 &&
    Math.abs(finalSample.error) <= settleBand;
  const settlingTime = stayedSettled ? Number(lastOutsideBandTime.toFixed(2)) : null;

  // Honest overshoot computation: N/A when drone never moved meaningfully toward step target
  let overshootMeters = null;
  let overshootPct = null;
  if (testType !== 'wind') {
    const movedDist = peakActual - startAxisVal;
    if (movedDist >= stepSize * 0.25) {
      overshootMeters = Number(Math.max(0, peakActual - refAxisVal).toFixed(2));
      overshootPct = Number(((overshootMeters / stepSize) * 100).toFixed(1));
    } else {
      overshootMeters = null;
      overshootPct = null;
    }
  } else {
    // Wind disturbance test reports peak excursion instead of step overshoot %
    overshootMeters = Number(maxDeviation.toFixed(2));
    overshootPct = null;
  }

  const steadyStateError =
    lateErrCount > 0 ? Number((lateErrSum / lateErrCount).toFixed(2)) : null;

  // Count oscillation reversals around target during last 5 seconds
  let reversals = 0;
  let prevSign = 0;
  for (const s of samples) {
    if (s.t < 0.8) continue;
    const sign = Math.abs(s.error) < 0.08 ? 0 : Math.sign(s.error);
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) {
      reversals += 1;
    }
    if (sign !== 0) prevSign = sign;
  }

  const metrics = {
    overshootPct,
    overshootMeters,
    settlingTime,
    settled: stayedSettled,
    steadyStateError,
    riseTime: riseTime !== null ? Number(riseTime.toFixed(2)) : null,
    reachedTarget,
    crossedTarget,
    maxDeviation: Number(maxDeviation.toFixed(2)),
    verticalSag: Number(verticalSag.toFixed(2)),
    oscillationReversals: reversals,
    saturationTime: Number(satDuration.toFixed(2)),
    energyUsed: Math.round(benchSim.energyUsed),
    peakPower: Math.round(benchSim.peakPower)
  };

  const challengePassed = Boolean(challenge.check(metrics));
  const experimentKey = buildExperimentKey(scene, testType, axis, stepSize);

  return {
    sceneId: scene?.id || 'custom',
    testType,
    testLabel:
      testType === 'wind'
        ? 'Wind Disturbance Test'
        : testType === 'takeoff_step'
          ? 'Takeoff Height Step (+3.0 m)'
          : `Position Step Test (${axis.toUpperCase()} +3.0 m)`,
    axis,
    duration,
    startVal: startAxisVal,
    refVal: refAxisVal,
    stepSize,
    gains: { ...cleanGains },
    experimentKey,
    samples,
    metrics,
    challenge: {
      title: challenge.title,
      shortGoal: challenge.shortGoal,
      passed: challengePassed
    }
  };
}

/**
 * Compare two Test Bench runs ONLY when they share the exact same experiment condition key.
 * Reports improvements and regressions honestly without fabricating gains.
 */
export function compareBenchTests(prevResult, currResult) {
  if (!prevResult || !currResult) {
    return { comparable: false, highlights: [], primarySummary: null };
  }
  if (prevResult.experimentKey !== currResult.experimentKey) {
    return {
      comparable: false,
      highlights: [],
      primarySummary: 'Different test conditions — run again to compare directly.'
    };
  }

  const pm = prevResult.metrics;
  const cm = currResult.metrics;
  const highlights = [];

  // 1. Overshoot % (for step tests)
  if (pm.overshootPct !== null && cm.overshootPct !== null) {
    const diff = cm.overshootPct - pm.overshootPct;
    const status = diff <= -1.5 ? 'improved' : diff >= 1.5 ? 'regressed' : 'unchanged';
    highlights.push({
      key: 'overshoot',
      label: 'Overshoot',
      beforeText: `${Math.round(pm.overshootPct)}%`,
      afterText: `${Math.round(cm.overshootPct)}%`,
      delta: diff,
      status
    });
  } else if (prevResult.testType === 'wind' && pm.maxDeviation !== null && cm.maxDeviation !== null) {
    const diff = cm.maxDeviation - pm.maxDeviation;
    const status = diff <= -0.06 ? 'improved' : diff >= 0.06 ? 'regressed' : 'unchanged';
    highlights.push({
      key: 'deviation',
      label: 'Peak Drift',
      beforeText: `${pm.maxDeviation.toFixed(2)} m`,
      afterText: `${cm.maxDeviation.toFixed(2)} m`,
      delta: diff,
      status
    });
  }

  // 2. Settling Time
  if (pm.settlingTime !== null || cm.settlingTime !== null) {
    let status = 'unchanged';
    if (pm.settlingTime === null && cm.settlingTime !== null) status = 'improved';
    else if (pm.settlingTime !== null && cm.settlingTime === null) status = 'regressed';
    else if (pm.settlingTime !== null && cm.settlingTime !== null) {
      const diff = cm.settlingTime - pm.settlingTime;
      status = diff <= -0.15 ? 'improved' : diff >= 0.15 ? 'regressed' : 'unchanged';
    }
    highlights.push({
      key: 'settling',
      label: 'Settling',
      beforeText: pm.settlingTime !== null ? `${pm.settlingTime.toFixed(1)} s` : 'Not Settled',
      afterText: cm.settlingTime !== null ? `${cm.settlingTime.toFixed(1)} s` : 'Not Settled',
      status
    });
  }

  // 3. Steady-State Error
  if (pm.steadyStateError !== null && cm.steadyStateError !== null) {
    const diff = cm.steadyStateError - pm.steadyStateError;
    const status = diff <= -0.05 ? 'improved' : diff >= 0.05 ? 'regressed' : 'unchanged';
    highlights.push({
      key: 'steady_error',
      label: 'Steady Error',
      beforeText: `${pm.steadyStateError.toFixed(2)} m`,
      afterText: `${cm.steadyStateError.toFixed(2)} m`,
      delta: diff,
      status
    });
  }

  // Pick the single most meaningful change to headline
  const bestChange =
    highlights.find((h) => h.status === 'improved') ||
    highlights.find((h) => h.status === 'regressed') ||
    highlights[0] ||
    null;

  const primarySummary = bestChange
    ? `${bestChange.label} ${bestChange.beforeText} → ${bestChange.afterText}`
    : 'Same test result as previous run.';

  const anyImproved = highlights.some((h) => h.status === 'improved');
  const anyRegressed = highlights.some((h) => h.status === 'regressed');
  const overallStatus =
    anyImproved && !anyRegressed
      ? 'improved'
      : anyRegressed && !anyImproved
        ? 'regressed'
        : anyImproved && anyRegressed
          ? 'mixed'
          : 'unchanged';

  return {
    comparable: true,
    highlights,
    primarySummary,
    overallStatus
  };
}

/**
 * Produce concise, single-suggestion PIP Flight Coach dialogue grounded in
 * real Test Bench telemetry (prioritized over static gain heuristics).
 * Never gives away a single magic optimal gain value.
 */
export function evaluateTestBenchPipCoaching(result, comparison, gains, scene) {
  if (!result) {
    const kp = Number(gains?.kp ?? 0);
    if (kp <= 0.1) {
      return {
        state: 'greeting',
        mood: 'greeting',
        headline: "Let's tune your drone!",
        messages: ['Turn up Kp first, then click Test PID to see how it responds.']
      };
    }
    return {
      state: 'teaching',
      mood: 'explaining',
      headline: 'Ready to test?',
      messages: ['Click Test PID to watch your real drone response, or Start Flight anytime.']
    };
  }

  const m = result.metrics;
  const kp = Number(gains?.kp ?? 0);
  const ki = Number(gains?.ki ?? 0);
  const kd = Number(gains?.kd ?? 0);

  const isFreeTutorial =
    scene?.id === 'tutorial-2' || scene?.id === 'tutorial-3' || scene?.id === 'tutorial-4';
  const readyTail = isFreeTutorial ? ' Click Start Flight whenever you think it looks ready!' : '';

  // 1. Unable to lift or barely moved
  if (!m.reachedTarget && result.testType !== 'wind') {
    if (kp < 1.5) {
      return {
        state: 'warning',
        mood: 'warning',
        headline: 'Too weak to reach target',
        messages: [`Try raising Kp to improve response and lift toward the target.${readyTail}`]
      };
    }
    if (kd > kp * 1.4 && kd > 6.0) {
      return {
        state: 'teaching',
        mood: 'thinking',
        headline: 'Braking is too heavy',
        messages: [`High Kd is slowing movement. Try lowering Kd or raising Kp slightly.${readyTail}`]
      };
    }
    return {
      state: 'warning',
      mood: 'warning',
      headline: 'Drone fell short',
      messages: [`Raise Kp or add a little Ki if heavy cargo is sagging below target.${readyTail}`]
    };
  }

  // 2. Strong oscillation or large overshoot
  if (m.oscillationReversals >= 3 || (m.overshootPct !== null && m.overshootPct > 18)) {
    return {
      state: 'warning',
      mood: 'warning',
      headline: 'Too much overshoot!',
      messages: [`Too much overshoot! Explore higher Kd to brake smoother, or trim Kp.${readyTail}`]
    };
  }

  // 3. Persistent steady-state drift (wind or heavy payload sag)
  if (m.steadyStateError !== null && m.steadyStateError > 0.32) {
    if (ki < 0.6) {
      return {
        state: 'teaching',
        mood: 'explaining',
        headline: 'Steady drift detected',
        messages: [`Your drone stays off-target. Explore raising Ki to cancel steady drift.${readyTail}`]
      };
    }
    return {
      state: 'warning',
      mood: 'thinking',
      headline: 'Still drifting off target',
      messages: [`Check both Ki and Kp—thrust limits or low damping may be delaying recovery.${readyTail}`]
    };
  }

  // 4. Thrust saturation warning
  if (m.saturationTime > 2.2) {
    return {
      state: 'warning',
      mood: 'warning',
      headline: 'Motors maxed out',
      messages: [`Thrust hit its limit often. Try smoother gains to avoid windup and power drain.${readyTail}`]
    };
  }

  // 5. Slow / not settled yet
  if (!m.settled || (m.settlingTime !== null && m.settlingTime > 4.2)) {
    const slowHint =
      scene?.id === 'tutorial-2'
        ? 'Response is still sluggish on the curve—try raising Kp and run Test PID again.'
        : 'Try tuning Kp and Kd together so your drone reaches and settles sooner.';
    return {
      state: 'teaching',
      mood: 'thinking',
      headline: 'Slow to settle',
      messages: [`${slowHint}${readyTail}`]
    };
  }

  // 6. Challenge passed or noticeable improvement
  if (result.challenge?.passed) {
    const improvedText =
      comparison?.comparable && comparison.overallStatus === 'improved'
        ? `Nice! ${comparison.primarySummary}. Whenever you think it looks good, click Start Flight!`
        : 'Nice! Your response curve looks smooth — click Start Flight whenever you feel ready!';
    return {
      state: 'ready',
      mood: 'celebrating',
      headline: 'Curve Looks Great!',
      messages: [improvedText]
    };
  }

  if (comparison?.comparable && comparison.overallStatus === 'improved') {
    return {
      state: 'ready',
      mood: 'celebrating',
      headline: 'Nice improvement!',
      messages: [`Nice! Your flight is smoother (${comparison.primarySummary}).${readyTail}`]
    };
  }

  return {
    state: 'teaching',
    mood: 'explaining',
    headline: 'Keep experimenting!',
    messages: [`Adjust a knob and click Test PID again to compare curves.${readyTail}`]
  };
}
