/**
 * M4 Scoring System:
 * - Geometric REF-vs-Actual trajectory fitting (pathFitScore & meanPathDeviation)
 * - Flight smoothness & settling evaluation
 * - Per-level 1-3 Star thresholds (Angry Birds style)
 *
 * Pure JS module (no DOM/Canvas dependency).
 */

import { clamp } from './pid.js';

function pointToSegmentDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  if (lenSq <= 1e-9) {
    return Math.hypot(px - ax, pz - az);
  }
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / lenSq, 0, 1);
  const projX = ax + t * vx;
  const projZ = az + t * vz;
  return Math.hypot(px - projX, pz - projZ);
}

function meanDistanceToPolyline(points, polyline) {
  if (!points?.length || !polyline?.length) return 0;
  if (polyline.length === 1) {
    let sum = 0;
    for (const p of points) {
      sum += Math.hypot(p.x - polyline[0].x, p.z - polyline[0].z);
    }
    return sum / points.length;
  }

  let total = 0;
  for (const p of points) {
    let best = Infinity;
    for (let i = 0; i < polyline.length - 1; i++) {
      const d = pointToSegmentDist(
        p.x,
        p.z,
        polyline[i].x,
        polyline[i].z,
        polyline[i + 1].x,
        polyline[i + 1].z
      );
      if (d < best) best = d;
    }
    total += best;
  }
  return total / points.length;
}

/**
 * Compute geometric fit between the commanded REF route and the actual drone route.
 * Uses bidirectional mean point-to-polyline distance (symmetric path deviation in meters)
 * plus a normalized 0-100% fit score.
 *
 * @param {Array<{x:number, z:number}>} refTrail
 * @param {Array<{x:number, z:number}>} actualTrail
 */
function polylineLength(points) {
  if (!points || points.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return len;
}

export function computePathFit(refTrail, actualTrail) {
  if (!refTrail?.length || !actualTrail?.length) {
    return { pathDeviation: 0, pathFitScore: 100 };
  }

  const dActualToRef = meanDistanceToPolyline(actualTrail, refTrail);
  const dRefToActual = meanDistanceToPolyline(refTrail, actualTrail);
  const spatialDev = (dActualToRef + dRefToActual) * 0.5;

  // Penalize extra oscillatory back-and-forth travel beyond the commanded REF path length
  const refLen = polylineLength(refTrail);
  const actualLen = polylineLength(actualTrail);
  const excessLengthRatio = refLen > 0.5 ? Math.max(0, actualLen - refLen) / refLen : 0;

  const pathDeviation = spatialDev + 2.2 * excessLengthRatio;
  const pathFitScore = clamp(100 * Math.exp(-pathDeviation / 1.4), 0, 100);

  return {
    pathDeviation,
    pathFitScore
  };
}

export const LEVEL_STAR_THRESHOLDS = Object.freeze({
  'tutorial-1': {
    completionGrantsThreeStars: true,
    twoStar: { maxTime: 120, maxOvershoot: 99, minPathFit: 0 },
    threeStar: { maxTime: 120, maxOvershoot: 99, maxSettling: 120, minPathFit: 0, minSmoothness: 0, maxOscillations: 99 }
  },
  'tutorial-2': {
    twoStar: { maxTime: 65, maxOvershoot: 3.6, minPathFit: 25 },
    threeStar: { maxTime: 50, maxOvershoot: 2.6, maxSettling: 8.5, minPathFit: 35, minSmoothness: 52, maxOscillations: 6 }
  },
  'tutorial-3': {
    twoStar: { maxTime: 75, maxOvershoot: 3.8, minPathFit: 20 },
    threeStar: { maxTime: 60, maxOvershoot: 2.8, maxSettling: 9.0, minPathFit: 28, minSmoothness: 50, maxOscillations: 8 }
  },
  'tutorial-4': {
    twoStar: { maxTime: 75, maxOvershoot: 3.6, minPathFit: 25 },
    threeStar: { maxTime: 58, maxOvershoot: 2.4, maxSettling: 8.5, minPathFit: 35, minSmoothness: 54, maxOscillations: 6 }
  },

  'level-1': {
    twoStar: { maxTime: 60, maxOvershoot: 3.6, minPathFit: 25 },
    threeStar: { maxTime: 45, maxOvershoot: 2.6, maxSettling: 8.0, minPathFit: 35, minSmoothness: 52, maxOscillations: 6 }
  },
  'level-2': {
    twoStar: { maxTime: 62, maxOvershoot: 3.4, minPathFit: 25 },
    threeStar: { maxTime: 48, maxOvershoot: 2.2, maxSettling: 8.0, minPathFit: 38, minSmoothness: 54, maxOscillations: 6 }
  },
  'level-3': {
    twoStar: { maxTime: 70, maxOvershoot: 3.8, minPathFit: 20, minEnergyPct: 0 },
    threeStar: { maxTime: 55, maxOvershoot: 2.8, maxSettling: 9.0, minPathFit: 30, minSmoothness: 50, maxOscillations: 7, minEnergyPct: 12 }
  },
  'level-4': {
    twoStar: { maxTime: 70, maxOvershoot: 3.4, minPathFit: 25 },
    threeStar: { maxTime: 55, maxOvershoot: 2.2, maxSettling: 8.5, minPathFit: 38, minSmoothness: 54, maxOscillations: 6 }
  },
  'level-5': {
    twoStar: { maxTime: 75, maxOvershoot: 3.8, minPathFit: 20, minEnergyPct: 0 },
    threeStar: { maxTime: 60, maxOvershoot: 2.8, maxSettling: 9.0, minPathFit: 28, minSmoothness: 50, maxOscillations: 8, minEnergyPct: 10 }
  },
  'level-6': {
    twoStar: { maxTime: 82, maxOvershoot: 3.8, minPathFit: 20, minEnergyPct: 0 },
    threeStar: { maxTime: 68, maxOvershoot: 2.8, maxSettling: 9.5, minPathFit: 30, minSmoothness: 50, maxOscillations: 8, minEnergyPct: 10 }
  }
});

const DEFAULT_THRESHOLDS = {
  twoStar: { maxTime: 65, maxOvershoot: 3.6, minPathFit: 25 },
  threeStar: { maxTime: 52, maxOvershoot: 2.6, maxSettling: 8.5, minPathFit: 35, minSmoothness: 52, maxOscillations: 6 }
};

export function getThresholdsForLevel(levelId) {
  return LEVEL_STAR_THRESHOLDS[levelId] || DEFAULT_THRESHOLDS;
}

/**
 * Evaluate 0-3 star score and transparent per-criterion breakdown for a completed or failed flight.
 *
 * @param {object} outcome `{ status: 'completed' | 'failed', ... }`
 * @param {object} metrics Output of `FlightSimulation.getFlightMetrics()`
 * @param {string} levelId Scene/level ID
 */
export function scoreFlightRun(outcome, metrics, levelId) {
  const thresholds = getThresholdsForLevel(levelId);
  const completed = outcome?.status === 'completed';

  const time = Number(metrics?.completionTime ?? 0);
  const overshoot = Number(metrics?.maxOvershoot ?? 0);
  const settling = Number(metrics?.settlingTime ?? time);
  const pathFit = Number(metrics?.pathFitScore ?? 0);
  const smoothness = Number(metrics?.flightSmoothness ?? 0);
  const oscillationReversals = Number.isFinite(metrics?.oscillationReversals)
    ? Number(metrics.oscillationReversals)
    : 0;
  const maxOsc = Number.isFinite(thresholds.threeStar.maxOscillations)
    ? thresholds.threeStar.maxOscillations
    : 6;
  const collisions = Number(metrics?.collisionCount ?? 0);
  const hasEnergyMetric = Number.isFinite(metrics?.energyRemainingPct);
  const energyPct = hasEnergyMetric ? Number(metrics.energyRemainingPct) : null;

  // Onboarding starter rule (Tutorial 1): any successful completion earns 3 stars without precision limits
  if (thresholds.completionGrantsThreeStars) {
    const checks2Star = [
      {
        criterionKey: 'completion',
        tier: 2,
        shortLabel: 'Mission Completed',
        actualText: completed ? 'Cleared' : 'Failed',
        targetText: 'Reach blue circle',
        label: 'Fly into the blue target circle and hold steady',
        passed: completed
      }
    ];
    const checks3Star = [
      {
        criterionKey: 'completion',
        tier: 3,
        shortLabel: 'Starter Mastery',
        actualText: completed ? '3 Stars Awarded' : 'Not Cleared',
        targetText: 'Complete lesson',
        label: 'Complete Tutorial 1 (no precision requirement)',
        passed: completed
      }
    ];
    return {
      stars: completed ? 3 : 0,
      maxStars: 3,
      summaryLabel: completed ? 'Tutorial Complete (3 Stars)' : 'Mission Failed',
      thresholds,
      checks2Star,
      checks3Star
    };
  }

  const checks2Star = [
    {
      criterionKey: 'time',
      tier: 2,
      shortLabel: 'Completion Time',
      actualText: `${time.toFixed(1)} s`,
      targetText: `<= ${thresholds.twoStar.maxTime} s`,
      label: `Completion Time <= ${thresholds.twoStar.maxTime} s`,
      passed: completed && time <= thresholds.twoStar.maxTime
    },
    {
      criterionKey: 'overshoot',
      tier: 2,
      shortLabel: 'Max Overshoot',
      actualText: `${overshoot.toFixed(2)} m`,
      targetText: `<= ${thresholds.twoStar.maxOvershoot.toFixed(1)} m`,
      label: `Max Overshoot <= ${thresholds.twoStar.maxOvershoot.toFixed(1)} m`,
      passed: completed && overshoot <= thresholds.twoStar.maxOvershoot
    },
    {
      criterionKey: 'pathFit',
      tier: 2,
      shortLabel: 'Route Fit',
      actualText: `${pathFit.toFixed(0)}%`,
      targetText: `>= ${thresholds.twoStar.minPathFit}%`,
      label: `Route Fit >= ${thresholds.twoStar.minPathFit}%`,
      passed: completed && pathFit >= thresholds.twoStar.minPathFit
    }
  ];

  if (Number.isFinite(thresholds.twoStar.minEnergyPct) && hasEnergyMetric) {
    checks2Star.push({
      criterionKey: 'energy',
      tier: 2,
      shortLabel: 'Battery Left',
      actualText: `${energyPct.toFixed(0)}%`,
      targetText: `>= ${thresholds.twoStar.minEnergyPct}%`,
      label: `Battery Left >= ${thresholds.twoStar.minEnergyPct}%`,
      passed: completed && energyPct >= thresholds.twoStar.minEnergyPct
    });
  }

  const checks3Star = [
    {
      criterionKey: 'oscillation',
      tier: 3,
      shortLabel: 'No Obvious Oscillation',
      actualText: `${oscillationReversals} reversals`,
      targetText: `<= ${maxOsc}`,
      label: `No Obvious Oscillation (<= ${maxOsc} reversals)`,
      passed: completed && oscillationReversals <= maxOsc
    },
    {
      criterionKey: 'smoothness',
      tier: 3,
      shortLabel: 'Flight Stability',
      actualText: `${smoothness.toFixed(0)}%`,
      targetText: `>= ${thresholds.threeStar.minSmoothness}%`,
      label: `Flight Stability >= ${thresholds.threeStar.minSmoothness}%`,
      passed: completed && smoothness >= thresholds.threeStar.minSmoothness
    },
    {
      criterionKey: 'time',
      tier: 3,
      shortLabel: 'Completion Time',
      actualText: `${time.toFixed(1)} s`,
      targetText: `<= ${thresholds.threeStar.maxTime} s`,
      label: `Completion Time <= ${thresholds.threeStar.maxTime} s`,
      passed: completed && time <= thresholds.threeStar.maxTime
    },
    {
      criterionKey: 'overshoot',
      tier: 3,
      shortLabel: 'Max Overshoot',
      actualText: `${overshoot.toFixed(2)} m`,
      targetText: `<= ${thresholds.threeStar.maxOvershoot.toFixed(2)} m`,
      label: `Max Overshoot <= ${thresholds.threeStar.maxOvershoot.toFixed(2)} m`,
      passed: completed && overshoot <= thresholds.threeStar.maxOvershoot
    },
    {
      criterionKey: 'settling',
      tier: 3,
      shortLabel: 'Settling Time',
      actualText: `${settling.toFixed(1)} s`,
      targetText: `<= ${thresholds.threeStar.maxSettling.toFixed(1)} s`,
      label: `Settling Time <= ${thresholds.threeStar.maxSettling.toFixed(1)} s`,
      passed: completed && settling <= thresholds.threeStar.maxSettling
    },
    {
      criterionKey: 'pathFit',
      tier: 3,
      shortLabel: 'Route Fit',
      actualText: `${pathFit.toFixed(0)}%`,
      targetText: `>= ${thresholds.threeStar.minPathFit}%`,
      label: `Route Fit >= ${thresholds.threeStar.minPathFit}%`,
      passed: completed && pathFit >= thresholds.threeStar.minPathFit
    },
    {
      criterionKey: 'collisions',
      tier: 3,
      shortLabel: 'Zero Collisions',
      actualText: `${collisions}`,
      targetText: '0 hits',
      label: 'Zero Collisions',
      passed: completed && collisions === 0
    }
  ];

  if (Number.isFinite(thresholds.threeStar.minEnergyPct) && hasEnergyMetric) {
    checks3Star.push({
      criterionKey: 'energy',
      tier: 3,
      shortLabel: 'Battery Left',
      actualText: `${energyPct.toFixed(0)}%`,
      targetText: `>= ${thresholds.threeStar.minEnergyPct}%`,
      label: `Battery Left >= ${thresholds.threeStar.minEnergyPct}%`,
      passed: completed && energyPct >= thresholds.threeStar.minEnergyPct
    });
  }

  const passedTwoStar = completed && checks2Star.every((c) => c.passed);
  const passedThreeStar = passedTwoStar && checks3Star.every((c) => c.passed);

  let stars = 0;
  let summaryLabel = 'Mission Failed';
  if (completed) {
    if (passedThreeStar) {
      stars = 3;
      summaryLabel = 'Outstanding Control (3 Stars)';
    } else if (passedTwoStar) {
      stars = 2;
      summaryLabel = 'Solid Flight (2 Stars)';
    } else {
      stars = 1;
      summaryLabel = 'Mission Cleared (1 Star)';
    }
  }

  return {
    stars,
    maxStars: 3,
    summaryLabel,
    thresholds,
    checks2Star,
    checks3Star
  };
}

/**
 * Build concise visual rating summary rows directly from real M4 scoring criteria.
 */
export function buildRatingBreakdown(scoreResult, metrics, outcome) {
  const completed = outcome?.status === 'completed';
  const tier = scoreResult?.stars >= 2 ? scoreResult.thresholds.threeStar : scoreResult?.thresholds?.twoStar;
  const time = Number(metrics?.completionTime ?? 0);
  const overshoot = Number(metrics?.maxOvershoot ?? 0);
  const pathFit = Number(metrics?.pathFitScore ?? 0);
  const settling = Number(metrics?.settlingTime ?? time);
  const smoothness = Number(metrics?.flightSmoothness ?? 0);
  const collisions = Number(metrics?.collisionCount ?? 0);

  if (scoreResult?.thresholds?.completionGrantsThreeStars) {
    return {
      summaryRows: [
        {
          label: 'Mission Completed',
          passed: completed,
          actualText: completed ? 'Cleared' : 'Failed',
          targetText: 'Goal Reached'
        },
        {
          label: 'Tutorial 1 Reward',
          passed: completed,
          actualText: completed ? '3 Stars Earned' : '0 Stars',
          targetText: 'Complete flight (no precision limit)'
        }
      ],
      checks2Star: scoreResult?.checks2Star || [],
      checks3Star: scoreResult?.checks3Star || [],
      metricsSnapshot: {
        time,
        overshoot,
        settling,
        pathFit,
        smoothness,
        collisions,
        energyUsed: Number(metrics?.energyUsed ?? 0),
        energyRemainingPct: Number.isFinite(metrics?.energyRemainingPct) ? Number(metrics.energyRemainingPct) : null
      }
    };
  }

  const timeTarget = tier?.maxTime ?? 45;
  const timePassed = completed && time <= timeTarget;
  const precisionChecks = scoreResult?.stars >= 2 ? scoreResult.checks3Star : scoreResult?.checks2Star;
  const precisionPassed =
    completed &&
    (precisionChecks || [])
      .filter((c) => c.criterionKey !== 'time' && c.criterionKey !== 'energy')
      .every((c) => c.passed);

  const summaryRows = [
    {
      label: 'Mission Completed',
      passed: completed,
      actualText: completed ? 'Cleared' : 'Failed',
      targetText: 'Goal Reached'
    },
    {
      label: 'Time Target',
      passed: timePassed,
      actualText: `${time.toFixed(1)} s`,
      targetText: `<= ${timeTarget.toFixed(1)} s`
    },
    {
      label: 'Precision Target',
      passed: precisionPassed,
      actualText: `Fit ${pathFit.toFixed(0)}% · Over ${overshoot.toFixed(2)} m · Settle ${settling.toFixed(1)} s`,
      targetText: `Fit >= ${tier?.minPathFit ?? 50}% · Over <= ${(tier?.maxOvershoot ?? 2.4).toFixed(2)} m`
    }
  ];

  if (Number.isFinite(tier?.minEnergyPct) && Number.isFinite(metrics?.energyRemainingPct)) {
    const energyPct = Number(metrics.energyRemainingPct);
    summaryRows.push({
      label: 'Energy Target',
      passed: completed && energyPct >= tier.minEnergyPct,
      actualText: `${energyPct.toFixed(0)}% left (${Math.round(metrics.energyUsed ?? 0)} J)`,
      targetText: `>= ${tier.minEnergyPct}% battery`
    });
  }

  return {
    summaryRows,
    checks2Star: scoreResult?.checks2Star || [],
    checks3Star: scoreResult?.checks3Star || [],
    metricsSnapshot: {
      time,
      overshoot,
      settling,
      pathFit,
      smoothness,
      collisions,
      energyUsed: Number(metrics?.energyUsed ?? 0),
      energyRemainingPct: Number.isFinite(metrics?.energyRemainingPct) ? Number(metrics.energyRemainingPct) : null
    }
  };
}

/**
 * Compute 0-100 four-axis strategy performance scores strictly from real flight metrics:
 * Speed, Stability, Precision, and Efficiency.
 */
export function computeStrategyDimensions(metrics = {}, scene = null) {
  const th = getThresholdsForLevel(scene?.id);
  const time = Math.max(0.1, Number(metrics?.completionTime ?? 0));
  const overshoot = Math.max(0, Number(metrics?.maxOvershoot ?? 0));
  const settling = Math.max(0, Number(metrics?.settlingTime ?? time));
  const pathFit = clamp(Number(metrics?.pathFitScore ?? 0), 0, 100);
  const smoothness = clamp(Number(metrics?.flightSmoothness ?? 0), 0, 100);
  const satSec = Math.max(0, Number(metrics?.controlSaturationDuration ?? 0));

  // Speed: benchmarked against 3-star time & settling targets
  const timeRatio = time / Math.max(8, th.threeStar.maxTime);
  const speed = Math.round(clamp(112 - timeRatio * 42 - Math.max(0, settling - 1.5) * 4.5, 8, 100));

  // Stability: smoothness minus overshoot & saturation penalty
  const stability = Math.round(clamp(smoothness * 0.72 + Math.max(0, 100 - overshoot * 34) * 0.28 - satSec * 5, 8, 100));

  // Precision: route fit + low overshoot + low average error
  const avgErr = Math.max(0, Number(metrics?.averageTrackingError ?? 0));
  const precision = Math.round(clamp(pathFit * 0.62 + Math.max(0, 100 - overshoot * 42) * 0.25 + Math.max(0, 100 - avgErr * 35) * 0.13, 8, 100));

  // Efficiency: real remaining battery % (when budgeted) or normalized energy per second / peak power
  let efficiency;
  if (Number.isFinite(metrics?.energyRemainingPct)) {
    efficiency = Math.round(clamp(Number(metrics.energyRemainingPct) * 1.45, 5, 100));
  } else {
    const energyUsed = Math.max(0, Number(metrics?.energyUsed ?? 0));
    const avgPower = energyUsed / Math.max(1, time);
    const totalMass = (scene?.droneMass ?? 1.2) + (scene?.payloadMass ?? 0);
    const hoverPowerRef = 8 + 1.45 * Math.pow(totalMass * 9.81, 1.5);
    const powerExcessRatio = avgPower / Math.max(40, hoverPowerRef);
    efficiency = Math.round(clamp(122 - powerExcessRatio * 34 - satSec * 6, 8, 100));
  }

  return { speed, stability, precision, efficiency };
}

/**
 * Generate a truthful single-focus suggestion for earning the next star,
 * strictly derived from the failing M4 scoring checks.
 */
export function buildNextStarAdvice(scoreResult, metrics, diagnostics = null, scene = null) {
  if (!scoreResult || scoreResult.stars === 0) {
    return null;
  }
  if (scoreResult.stars >= 3) {
    return 'Perfect flight! You mastered this challenge!';
  }

  const nextChecks =
    scoreResult.stars === 1 ? scoreResult.checks2Star : scoreResult.checks3Star;
  const failing = (nextChecks || []).find((c) => !c.passed);
  if (!failing) {
    return 'Refine your PID balance to unlock the next star!';
  }

  const targetTierLabel = scoreResult.stars === 1 ? 'another star' : 'the final star';
  const th = scoreResult.stars === 1 ? scoreResult.thresholds.twoStar : scoreResult.thresholds.threeStar;
  const time = Number(metrics?.completionTime ?? 0);
  const overshoot = Number(metrics?.maxOvershoot ?? 0);
  const settling = Number(metrics?.settlingTime ?? time);
  const pathFit = Number(metrics?.pathFitScore ?? 0);
  const smoothness = Number(metrics?.flightSmoothness ?? 0);

  switch (failing.criterionKey) {
    case 'oscillation': {
      const osc = Number(metrics?.oscillationReversals ?? 0);
      const maxOsc = th.maxOscillations ?? 6;
      return `Reduce oscillation (${osc} reversals vs <= ${maxOsc}) by raising Kd damping for ${targetTierLabel}!`;
    }
    case 'time': {
      const delta = Math.max(0.5, time - th.maxTime);
      const kpHint = (metrics?.pidParameters?.kp ?? 0) < (scene?.recommendedPID?.kpMin ?? 5) ? ' (try higher Kp)' : '';
      return `Finish ${delta.toFixed(1)} s faster${kpHint} to earn ${targetTierLabel}!`;
    }
    case 'overshoot':
      return `Cut overshoot from ${overshoot.toFixed(2)} m to <= ${th.maxOvershoot.toFixed(1)} m (raise Kd) for ${targetTierLabel}!`;
    case 'settling':
      return `Improve your braking (Settling ${settling.toFixed(1)} s vs <= ${th.maxSettling.toFixed(1)} s) to earn ${targetTierLabel}!`;
    case 'pathFit':
      return `Raise Route Fit from ${pathFit.toFixed(0)}% to >= ${th.minPathFit}% for ${targetTierLabel}!`;
    case 'smoothness':
      return `Smooth out flight control (${smoothness.toFixed(0)}% vs >= ${th.minSmoothness}%) with steady WASD and balanced Kd for ${targetTierLabel}!`;
    case 'collisions':
      return `Complete the route with zero wall bumps to earn ${targetTierLabel}!`;
    case 'energy': {
      const pct = Number(metrics?.energyRemainingPct ?? 0);
      const need = Math.max(1, (th.minEnergyPct ?? 30) - pct);
      return `Save ${need.toFixed(0)}% more battery (trim Kp power spikes and oscillation) for ${targetTierLabel}!`;
    }
    default:
      if (diagnostics?.overshootSeverity === 'high') {
        return `Too much overshoot—try raising Kd to earn ${targetTierLabel}!`;
      }
      return `Meet ${failing.label} to earn ${targetTierLabel}!`;
  }
}
