/**
 * M5 — PID Diagnostics & Conversational PIP Flight Coach Analysis.
 *
 * Analyzes full time-series telemetry recorded during flight
 * (reference vs. actual position, velocity, tracking error, P/I/D terms,
 * control output, thrust saturation, and previous-vs-current comparison)
 * and formats a conversational first-person PIP Flight Coach debrief
 * shared by both Tutorial Village and Challenge Levels.
 *
 * Pure JS module (no DOM/Canvas dependency).
 */

import { evaluatePostFlightFeedback, predictStrategyTradeoffs } from './coach.js';
import { computeStrategyDimensions } from './scoring.js';

function countOscillationReversals(values, deadband = 0.22) {
  if (!values || values.length < 4) return 0;
  let lastSign = 0;
  let reversals = 0;
  for (const v of values) {
    if (Math.abs(v) < deadband) continue;
    const sign = v > 0 ? 1 : -1;
    if (lastSign !== 0 && sign !== lastSign) {
      reversals += 1;
    }
    lastSign = sign;
  }
  return reversals;
}

/**
 * Compute quantitative PID telemetry diagnostics from recorded time-series data.
 *
 * @param {Array<object>} telemetry Time-series samples from `FlightSimulation.telemetry`
 * @param {object} metrics Summary metrics from `FlightSimulation.getFlightMetrics()`
 * @param {object|null} scene Active scene configuration
 */
export function analyzeFlightTelemetry(telemetry = [], metrics = {}, scene = null) {
  const series = Array.isArray(telemetry) ? telemetry : [];
  const sampleCount = series.length;
  const maxOvershoot = Number(metrics?.maxOvershoot ?? 0);
  const avgError = Number(metrics?.averageTrackingError ?? 0);
  const satDuration = Number(metrics?.controlSaturationDuration ?? 0);
  const duration = Math.max(0.05, Number(metrics?.completionTime ?? 0));
  const pathFit = Number(metrics?.pathFitScore ?? 100);
  const smoothness = Number(metrics?.flightSmoothness ?? 100);

  // Measure late-flight steady-state error (last 20% of recorded samples)
  let steadyStateError = avgError;
  let peakAbsIntegral = 0;
  let peakError = 0;
  const errXSeries = [];
  const errZSeries = [];

  if (sampleCount > 0) {
    const tailStart = Math.max(0, Math.floor(sampleCount * 0.8));
    let tailSum = 0;
    let tailCount = 0;
    for (let i = 0; i < sampleCount; i++) {
      const s = series[i];
      const ex = Number(s.errX ?? 0);
      const ez = Number(s.errZ ?? 0);
      const mag = Math.hypot(ex, ez);
      if (mag > peakError) peakError = mag;
      errXSeries.push(ex);
      errZSeries.push(ez);

      const maxI = Math.max(Math.abs(Number(s.iX ?? 0)), Math.abs(Number(s.iZ ?? 0)));
      if (maxI > peakAbsIntegral) peakAbsIntegral = maxI;

      if (i >= tailStart) {
        tailSum += mag;
        tailCount += 1;
      }
    }
    steadyStateError = tailCount > 0 ? tailSum / tailCount : avgError;
  }

  const revX = countOscillationReversals(errXSeries, 0.2);
  const revZ = countOscillationReversals(errZSeries, 0.2);
  const oscillationReversals = revX + revZ;
  const oscillationDetected = oscillationReversals >= 4 || (oscillationReversals >= 2 && smoothness < 60);
  const choppyControl = !oscillationDetected && smoothness < 60;
  const overshootSeverity = maxOvershoot > 1.8 ? 'high' : maxOvershoot > 0.9 ? 'mild' : 'low';
  const lagDetected = avgError > 1.25 && maxOvershoot < 0.7;
  const steadyStateDetected =
    Boolean(scene?.requiresIntegral) && steadyStateError > 0.45 && Number(metrics?.pidParameters?.ki ?? 0) < 0.5;
  const saturationRatio = satDuration / duration;
  const windupRisk =
    (satDuration > 1.8 || saturationRatio > 0.2) &&
    (peakAbsIntegral > 4.0 || maxOvershoot > 1.4);

  const responseSpeed = lagDetected ? 'slow' : maxOvershoot > 1.6 ? 'aggressive' : 'balanced';

  const findings = [];

  if (oscillationDetected) {
    findings.push({
      key: 'oscillation',
      label: 'Oscillation',
      severity: oscillationReversals >= 6 ? 'warning' : 'caution',
      value: `${oscillationReversals} reversals`,
      coachLine: `I noticed ${oscillationReversals} error reversals along the flight path—the drone was hunting back and forth around REF.`
    });
  } else if (choppyControl) {
    findings.push({
      key: 'oscillation',
      label: 'Control Smoothness',
      severity: 'caution',
      value: `${smoothness.toFixed(0)}% smooth`,
      coachLine: `Thrust and acceleration shifted rapidly (${smoothness.toFixed(0)}% stability); smoother step commands or slightly higher Kd can help.`
    });
  } else {
    findings.push({
      key: 'oscillation',
      label: 'Damping',
      severity: 'good',
      value: `${smoothness.toFixed(0)}% smooth`,
      coachLine: `Damping kept the flight calm (${smoothness.toFixed(0)}% stability) without sustained hunting.`
    });
  }

  if (overshootSeverity !== 'low') {
    findings.push({
      key: 'overshoot',
      label: 'Overshoot',
      severity: overshootSeverity === 'high' ? 'warning' : 'caution',
      value: `${maxOvershoot.toFixed(2)} m`,
      coachLine: `Your drone overshot REF by up to ${maxOvershoot.toFixed(2)} m before pulling back.`
    });
  } else {
    findings.push({
      key: 'overshoot',
      label: 'Overshoot',
      severity: 'good',
      value: `${maxOvershoot.toFixed(2)} m`,
      coachLine: `Overshoot stayed minimal (${maxOvershoot.toFixed(2)} m), so braking near targets felt crisp.`
    });
  }

  if (lagDetected) {
    findings.push({
      key: 'response',
      label: 'Response Speed',
      severity: 'caution',
      value: 'Sluggish',
      coachLine: `I saw ${avgError.toFixed(2)} m average lag behind REF, meaning horizontal/vertical acceleration was slow.`
    });
  } else {
    findings.push({
      key: 'response',
      label: 'Route Tracking',
      severity: pathFit >= 72 ? 'good' : 'caution',
      value: `${pathFit.toFixed(0)}% fit`,
      coachLine: `Your actual path matched the REF route at ${pathFit.toFixed(0)}% accuracy.`
    });
  }

  if (steadyStateDetected || (steadyStateError > 0.6 && sampleCount > 10)) {
    findings.push({
      key: 'steady_state',
      label: 'Steady-State Offset',
      severity: 'warning',
      value: `${steadyStateError.toFixed(2)} m`,
      coachLine: `Late in the flight, a ${steadyStateError.toFixed(2)} m persistent offset stayed uncancelled against wind or payload.`
    });
  }

  if (windupRisk || satDuration > 1.2) {
    findings.push({
      key: 'windup',
      label: windupRisk ? 'Saturation & Windup' : 'Thrust Saturation',
      severity: windupRisk ? 'warning' : 'caution',
      value: `${satDuration.toFixed(2)} s`,
      coachLine: `Motors hit maximum thrust for ${satDuration.toFixed(2)} s${windupRisk ? ', letting integral error wind up.' : '.'}`
    });
  }

  if (Number.isFinite(metrics?.energyUsed) && metrics.energyUsed > 0) {
    const remPct = metrics?.energyRemainingPct;
    const energyVal = Number.isFinite(remPct)
      ? `${remPct.toFixed(0)}% left`
      : `${Math.round(metrics.energyUsed)} J`;
    const lowBatt = Number.isFinite(remPct) && remPct < 25;
    findings.push({
      key: 'energy',
      label: 'Energy Efficiency',
      severity: lowBatt ? 'warning' : Number.isFinite(remPct) && remPct < 40 ? 'caution' : 'good',
      value: energyVal,
      coachLine: Number.isFinite(remPct)
        ? `Used ${Math.round(metrics.energyUsed)} J (peak ${Math.round(metrics.peakPower ?? 0)} W), leaving ${remPct.toFixed(0)}% battery.`
        : `Total electrical draw was ${Math.round(metrics.energyUsed)} J with ${Math.round(metrics.peakPower ?? 0)} W peak rotor power.`
    });
  }

  return {
    sampleCount,
    maxOvershoot,
    avgError,
    steadyStateError,
    peakError,
    peakAbsIntegral,
    oscillationReversals,
    oscillationDetected,
    overshootSeverity,
    lagDetected,
    steadyStateDetected,
    satDuration,
    saturationRatio,
    windupRisk,
    responseSpeed,
    findings
  };
}

/**
 * Generate a conversational, direct-to-player PIP Flight Coach diagnostic report
 * used uniformly on the Result Screen for both Tutorial Village and Challenge Levels.
 */
export function generatePipDiagnosticReport(
  telemetry = [],
  metrics = {},
  outcome = { status: 'completed' },
  scene = null,
  previousAttempt = null
) {
  const diag = analyzeFlightTelemetry(telemetry, metrics, scene);
  const baseDebrief = evaluatePostFlightFeedback(outcome, metrics, scene);
  const isSuccess = outcome?.status === 'completed';
  const isTutorial = scene?.mode === 'tutorial';
  const { kp = 0, ki = 0, kd = 0 } = metrics?.pidParameters || {};

  // Build personalized conversational opening & mood
  let mood = isSuccess ? 'celebrating' : 'warning';
  if (isSuccess && (diag.overshootSeverity === 'high' || diag.oscillationDetected)) {
    mood = 'explaining';
  }

  const headline = isSuccess
    ? isTutorial
      ? "Nice flying, pilot! Here's what I saw in your lesson telemetry."
      : "Mission cleared, pilot! Let's break down how your PID handled it."
    : "Tough run, pilot—I analyzed your telemetry and spotted what happened.";

  // Conversational narrative directly from PIP ("I noticed...", "You kept...")
  const narrativeParts = [];
  if (isSuccess) {
    narrativeParts.push(
      `You finished ${scene?.name || 'this flight'} in ${Number(metrics.completionTime ?? 0).toFixed(1)} s with a ${Number(metrics.pathFitScore ?? 0).toFixed(0)}% REF route fit.`
    );
  } else {
    narrativeParts.push(baseDebrief.explanation);
  }

  if (diag.oscillationDetected) {
    narrativeParts.push(
      `I tracked ${diag.oscillationReversals} error reversals along the way, showing your drone bounced past REF.`
    );
  } else if (diag.lagDetected) {
    narrativeParts.push(
      `Your drone trailed ${diag.avgError.toFixed(2)} m behind REF on average, so movement felt sluggish.`
    );
  } else if (diag.steadyStateDetected) {
    narrativeParts.push(
      `A ${diag.steadyStateError.toFixed(2)} m steady offset lingered because constant load or wind needed stronger Ki trim.`
    );
  } else if (Number(metrics.flightSmoothness ?? 100) < 60 && !isSuccess) {
    narrativeParts.push(
      `Control effort surged aggressively (${Number(metrics.flightSmoothness ?? 0).toFixed(0)}% smoothness) before the flight ended.`
    );
  } else if (isSuccess) {
    narrativeParts.push(
      `With Kp ${kp.toFixed(1)}, Ki ${ki.toFixed(2)}, and Kd ${kd.toFixed(1)}, tracking stayed composed (max overshoot ${diag.maxOvershoot.toFixed(2)} m).`
    );
  }

  // Delta comparison if retrying on the same level
  let comparisonNote = null;
  if (previousAttempt?.metrics) {
    const prevFit = Number(previousAttempt.metrics.pathFitScore ?? 0);
    const curFit = Number(metrics.pathFitScore ?? 0);
    const diffFit = curFit - prevFit;
    const prevOver = Number(previousAttempt.metrics.maxOvershoot ?? 0);
    const diffOver = Number(metrics.maxOvershoot ?? 0) - prevOver;
    if (Math.abs(diffFit) >= 2 || Math.abs(diffOver) >= 0.15) {
      comparisonNote =
        diffFit >= 0
          ? `Compared to your last attempt, I saw Route Fit improve by +${diffFit.toFixed(0)}% (${curFit.toFixed(0)}% vs ${prevFit.toFixed(0)}%).`
          : `Compared to your previous run, Route Fit shifted by ${diffFit.toFixed(0)}%—check the purple vs cyan paths below!`;
    }
  }

  // Actionable PIP tuning advice in direct second-person voice
  const tips = [];
  if (kp < 0.8) {
    tips.push('Raise Kp first (around 5–7) so I can lift your drone and follow WASD.');
  } else if (diag.lagDetected) {
    tips.push('Increase Kp slightly so your drone chases REF faster with less lag.');
  }

  if (diag.oscillationDetected || diag.overshootSeverity === 'high') {
    tips.push('Raise Kd damping (or trim excessive Kp) so your drone brakes before overshooting REF.');
  }

  if (diag.steadyStateDetected || (scene?.requiresIntegral && ki < (scene.recommendedPID?.kiMin ?? 0.6))) {
    tips.push('Add moderate Ki so accumulated error lifts payload droop and fights steady wind.');
  }

  if (diag.windupRisk) {
    tips.push('Ease back aggressive Kp/Ki or step REF smoothly so motors stay out of saturation and avoid integral windup.');
  }

  if (tips.length === 0) {
    tips.push(baseDebrief.tip);
  }

  let metricLessonNote = null;
  if (isTutorial && scene?.id) {
    const pathFitVal = Number(metrics.pathFitScore ?? 0).toFixed(0);
    const compTimeVal = Number(metrics.completionTime ?? 0).toFixed(1);
    const settlingVal = Number(metrics.settlingTime ?? 0).toFixed(1);
    const smoothVal = Number(metrics.flightSmoothness ?? 100).toFixed(0);

    if (scene.id === 'tutorial-1') {
      metricLessonNote = `Metrics I taught you today: W/S/A/D moves REF, Completion Time (${compTimeVal} s) tracks speed, and Route Fit (${pathFitVal}%) measures how closely your drone followed REF.`;
    } else if (scene.id === 'tutorial-2') {
      metricLessonNote = `Metrics I measured for Kp: Average Tracking Lag (${diag.avgError.toFixed(2)} m) and Route Fit (${pathFitVal}%). Higher responsive Kp cuts lag so your drone hugs the REF route.`;
    } else if (scene.id === 'tutorial-3') {
      metricLessonNote = `Metrics I measured for Ki: Steady-State Offset (${diag.steadyStateError.toFixed(2)} m) and Thrust Saturation (${diag.satDuration.toFixed(2)} s). Moderate Ki trims constant drift without windup.`;
    } else if (scene.id === 'tutorial-4') {
      metricLessonNote = `Full metric check: Max Overshoot (${diag.maxOvershoot.toFixed(2)} m), Oscillation (${diag.oscillationReversals} reversals), Settling Time (${settlingVal} s), Stability (${smoothVal}%), and Route Fit (${pathFitVal}%). You're ready for Challenge Levels!`;
    }
  }

  const strategyProfile = computeStrategyDimensions(metrics, scene);
  const predictedStrategy = predictStrategyTradeoffs(metrics?.pidParameters, scene);
  const missionFocus = scene?.strategyProfile?.focusTag || 'Balanced Control';
  const strategyVerdict = `Strategy Profile (${predictedStrategy.strategyLabel}) vs. ${missionFocus}: Speed ${strategyProfile.speed} · Stability ${strategyProfile.stability} · Precision ${strategyProfile.precision} · Efficiency ${strategyProfile.efficiency}.`;

  return {
    mood,
    title: 'PIP Flight Coach — Telemetry Analysis',
    headline,
    spokenSummary: narrativeParts.join(' '),
    strategyVerdict,
    strategyProfile,
    metricLessonNote,
    comparisonNote,
    diagnostics: diag,
    adviceList: tips.slice(0, 3),
    primaryTip: tips[0]
  };
}

/**
 * Build a concise, single-sentence PIP coaching line (<= 20 English words)
 * strictly grounded in real M5 telemetry diagnostics, M4 star results, and outcome.
 */
export function buildConcisePipResultFeedback(report, scoreResult = null, outcome = { status: 'completed' }, scene = null) {
  const isSuccess = outcome?.status === 'completed';
  const diag = report?.diagnostics || {};
  const stars = Number(scoreResult?.stars ?? 0);

  if (!isSuccess) {
    const reason = outcome?.reason || 'failed';
    if (reason === 'collision') {
      return {
        mood: 'warning',
        text: 'Your drone hit an obstacle. Try increasing Kd for tighter braking.'
      };
    }
    if (reason === 'out_of_bounds') {
      return {
        mood: 'warning',
        text: 'Your drone crossed the boundary. Lower Kp or add Kd damping.'
      };
    }
    if (reason === 'off_pad') {
      return {
        mood: 'warning',
        text: 'Missed the helipad. Center REF above the pad before descending.'
      };
    }
    if (reason === 'hard_landing') {
      return {
        mood: 'warning',
        text: 'Touchdown was too hard. Descend gently or raise Kd damping.'
      };
    }
    if (reason === 'battery_depleted') {
      return {
        mood: 'warning',
        text: 'Battery ran out. Smooth thrust spikes with balanced Kp and Kd.'
      };
    }
    if (diag.oscillationDetected) {
      return {
        mood: 'warning',
        text: 'Your drone oscillated around REF. Try balancing Kp and Kd.'
      };
    }
    if (diag.steadyStateDetected) {
      return {
        mood: 'warning',
        text: 'Steady drift held you back. Try raising Ki slightly.'
      };
    }
    if (diag.lagDetected) {
      return {
        mood: 'warning',
        text: 'Your drone responded slowly. Explore a higher Kp and retry.'
      };
    }
    return {
      mood: 'warning',
      text: 'Your drone missed the target. Adjust PID and try again.'
    };
  }

  // Success — 3 Stars
  if (stars >= 3) {
    if (diag.oscillationDetected) {
      return {
        mood: 'celebrating',
        text: 'Three stars! Slightly higher Kd could make braking even calmer.'
      };
    }
    if (diag.overshootSeverity === 'high') {
      return {
        mood: 'celebrating',
        text: 'Three stars! A touch more Kd will trim that overshoot.'
      };
    }
    if (diag.lagDetected) {
      return {
        mood: 'celebrating',
        text: 'Three stars! A higher Kp would make response even faster.'
      };
    }
    return {
      mood: 'celebrating',
      text: 'Excellent flight! Your drone was fast, accurate, and stable.'
    };
  }

  // Success — 1 or 2 Stars: pick the single most impactful real diagnostic issue
  const nextChecks = stars >= 2 ? scoreResult?.checks3Star || [] : scoreResult?.checks2Star || [];
  const failedKeys = new Set(nextChecks.filter((c) => !c.passed).map((c) => c.criterionKey));

  if (diag.oscillationDetected || failedKeys.has('oscillation')) {
    return {
      mood: 'thinking',
      text: 'Your drone oscillates. Try balancing Kp and Kd for calmer control.'
    };
  }
  if (diag.steadyStateDetected) {
    return {
      mood: 'thinking',
      text: 'Steady drift stayed near the target. Try raising Ki slightly.'
    };
  }
  if (diag.windupRisk) {
    return {
      mood: 'thinking',
      text: 'Motors hit max thrust often. Try smoother moves or lower Ki.'
    };
  }
  if (diag.overshootSeverity === 'high' || (diag.overshootSeverity === 'mild' && failedKeys.has('overshoot'))) {
    return {
      mood: 'thinking',
      text: 'Too much overshoot near the target. Try increasing Kd damping.'
    };
  }
  if (diag.lagDetected) {
    return {
      mood: 'thinking',
      text: 'Your drone responds slowly. Explore a higher Kp for faster tracking.'
    };
  }
  if (failedKeys.has('energy')) {
    return {
      mood: 'explaining',
      text: 'Battery drain was high. Smoother thrust saves power for the next star.'
    };
  }
  if (failedKeys.has('time')) {
    return {
      mood: 'explaining',
      text: 'Nice control! Fly a bit faster to earn the next star.'
    };
  }
  if (failedKeys.has('collisions')) {
    return {
      mood: 'explaining',
      text: 'Avoid obstacle bumps with smoother Kd braking for the final star.'
    };
  }
  if (failedKeys.has('settling') || failedKeys.has('smoothness') || failedKeys.has('pathFit')) {
    return {
      mood: 'explaining',
      text: 'Nice work! Try smoother braking to earn the next star.'
    };
  }

  return {
    mood: stars >= 2 ? 'explaining' : 'thinking',
    text:
      stars >= 2
        ? 'Nice work! Fine-tune your PID slightly to earn the final star.'
        : 'Mission complete! Refine your PID for smoother, faster flight.'
  };
}

/**
 * Evaluate live in-flight control status badges strictly from real simulation telemetry.
 * Avoids deterministic claims when insufficient telemetry samples exist.
 */
export function evaluateLiveControlStatus(telemetry = [], sim = null, scene = null) {
  if (!sim?.started) {
    return [{ key: 'standby', label: 'Ready', tone: 'neutral', icon: '○' }];
  }

  const series = Array.isArray(telemetry) ? telemetry : [];
  if (series.length < 12) {
    return [{ key: 'calibrating', label: 'Calibrating', tone: 'neutral', icon: '◔' }];
  }

  const recent = series.slice(-40);
  const errX = recent.map((s) => Number(s.errX ?? 0));
  const errZ = recent.map((s) => Number(s.errZ ?? 0));
  const recentReversals =
    countOscillationReversals(errX, 0.18) + countOscillationReversals(errZ, 0.18);

  const satCount = recent.filter((s) => Boolean(s.saturated)).length;
  const last = recent[recent.length - 1];
  const speed = Math.hypot(Number(last.vx ?? 0), Number(last.vz ?? 0));
  const curErr = Math.hypot(Number(last.errX ?? 0), Number(last.errZ ?? 0));

  let recentErrSum = 0;
  for (const s of recent) {
    recentErrSum += Math.hypot(Number(s.errX ?? 0), Number(s.errZ ?? 0));
  }
  const recentAvgErr = recentErrSum / recent.length;

  const movingAwayFromRef =
    Number(last.vx ?? 0) * -Number(last.errX ?? 0) +
      Number(last.vz ?? 0) * -Number(last.errZ ?? 0) >
    0.15;

  const badges = [];

  if (last.saturated || satCount >= 6) {
    badges.push({ key: 'saturated', label: 'Saturated', tone: 'danger', icon: '⚡' });
  }
  const avgRecentPower =
    recent.reduce((sum, s) => sum + Number(s.power ?? 0), 0) / recent.length;
  const totalMass = (scene?.droneMass ?? 1.2) + (scene?.payloadMass ?? 0);
  const highPowerLimit = totalMass > 1.7 ? 195 : 135;
  const lowBattery = Number.isFinite(last.energyPct) && last.energyPct < 20;
  if (lowBattery || avgRecentPower > highPowerLimit) {
    badges.push({
      key: 'high_drain',
      label: lowBattery ? 'Low Battery' : 'High Drain',
      tone: lowBattery ? 'danger' : 'warning',
      icon: '🔋'
    });
  }
  if (recentReversals >= 3) {
    badges.push({ key: 'oscillation', label: 'Oscillation', tone: 'warning', icon: '〰' });
  }
  if (movingAwayFromRef && curErr > 0.75) {
    badges.push({ key: 'overshoot', label: 'Overshoot', tone: 'caution', icon: '↗' });
  }

  const lowKpHint = (sim?.gains?.kp ?? 5) < (scene?.recommendedPID?.kpMin ?? 3.5);
  if (!movingAwayFromRef && recentAvgErr > 1.15 && speed < 1.25 && (lowKpHint || curErr > 1.35)) {
    badges.push({ key: 'slow', label: 'Slow Response', tone: 'info', icon: '◔' });
  }

  if (badges.length === 0) {
    if (recentAvgErr <= 0.65 && speed <= 0.65) {
      badges.push({ key: 'stable', label: 'Stable', tone: 'good', icon: '✓' });
    } else {
      badges.push({ key: 'tracking', label: 'Tracking', tone: 'info', icon: '◎' });
    }
  }

  return badges.slice(0, 3);
}
