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
    twoStar: { maxTime: 45, maxOvershoot: 2.4, minPathFit: 50 },
    threeStar: { maxTime: 24, maxOvershoot: 1.3, maxSettling: 4.5, minPathFit: 68, minSmoothness: 65 }
  },
  'tutorial-2': {
    twoStar: { maxTime: 45, maxOvershoot: 2.5, minPathFit: 50 },
    threeStar: { maxTime: 25, maxOvershoot: 1.3, maxSettling: 4.5, minPathFit: 68, minSmoothness: 65 }
  },
  'tutorial-3': {
    twoStar: { maxTime: 55, maxOvershoot: 2.5, minPathFit: 50 },
    threeStar: { maxTime: 30, maxOvershoot: 1.5, maxSettling: 5.5, minPathFit: 64, minSmoothness: 65 }
  },
  'tutorial-4': {
    twoStar: { maxTime: 55, maxOvershoot: 2.2, minPathFit: 52 },
    threeStar: { maxTime: 28, maxOvershoot: 1.2, maxSettling: 4.5, minPathFit: 68, minSmoothness: 68 }
  },

  'level-1': {
    twoStar: { maxTime: 42, maxOvershoot: 2.4, minPathFit: 50 },
    threeStar: { maxTime: 22, maxOvershoot: 1.25, maxSettling: 4.2, minPathFit: 72, minSmoothness: 68 }
  },
  'level-2': {
    twoStar: { maxTime: 44, maxOvershoot: 2.0, minPathFit: 52 },
    threeStar: { maxTime: 24, maxOvershoot: 1.15, maxSettling: 4.5, minPathFit: 74, minSmoothness: 70 }
  },
  'level-3': {
    twoStar: { maxTime: 52, maxOvershoot: 2.8, minPathFit: 40 },
    threeStar: { maxTime: 28, maxOvershoot: 1.9, maxSettling: 6.0, minPathFit: 54, minSmoothness: 65 }
  },
  'level-4': {
    twoStar: { maxTime: 52, maxOvershoot: 1.9, minPathFit: 55 },
    threeStar: { maxTime: 30, maxOvershoot: 1.1, maxSettling: 4.2, minPathFit: 76, minSmoothness: 70 }
  },
  'level-5': {
    twoStar: { maxTime: 55, maxOvershoot: 2.6, minPathFit: 40 },
    threeStar: { maxTime: 32, maxOvershoot: 1.75, maxSettling: 5.5, minPathFit: 52, minSmoothness: 66 }
  },
  'level-6': {
    twoStar: { maxTime: 65, maxOvershoot: 2.6, minPathFit: 44 },
    threeStar: { maxTime: 38, maxOvershoot: 1.7, maxSettling: 5.0, minPathFit: 58, minSmoothness: 66 }
  }
});

const DEFAULT_THRESHOLDS = {
  twoStar: { maxTime: 50, maxOvershoot: 2.5, minPathFit: 55 },
  threeStar: { maxTime: 28, maxOvershoot: 1.5, maxSettling: 4.0, minPathFit: 72, minSmoothness: 65 }
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
  const collisions = Number(metrics?.collisionCount ?? 0);

  const checks2Star = [
    { label: `Completion Time <= ${thresholds.twoStar.maxTime} s`, passed: completed && time <= thresholds.twoStar.maxTime },
    { label: `Max Overshoot <= ${thresholds.twoStar.maxOvershoot.toFixed(1)} m`, passed: completed && overshoot <= thresholds.twoStar.maxOvershoot },
    { label: `Route Fit >= ${thresholds.twoStar.minPathFit}%`, passed: completed && pathFit >= thresholds.twoStar.minPathFit }
  ];

  const checks3Star = [
    { label: `Completion Time <= ${thresholds.threeStar.maxTime} s`, passed: completed && time <= thresholds.threeStar.maxTime },
    { label: `Max Overshoot <= ${thresholds.threeStar.maxOvershoot.toFixed(1)} m`, passed: completed && overshoot <= thresholds.threeStar.maxOvershoot },
    { label: `Settling Time <= ${thresholds.threeStar.maxSettling.toFixed(1)} s`, passed: completed && settling <= thresholds.threeStar.maxSettling },
    { label: `Route Fit >= ${thresholds.threeStar.minPathFit}%`, passed: completed && pathFit >= thresholds.threeStar.minPathFit },
    { label: `Smoothness >= ${thresholds.threeStar.minSmoothness}%`, passed: completed && smoothness >= thresholds.threeStar.minSmoothness },
    { label: 'Zero Collisions', passed: completed && collisions === 0 }
  ];

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
