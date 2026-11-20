/**
 * Scene definitions and live coaching / outcome evaluators.
 * Covers the M1 Flight Test Playground and M2 Tutorial Village (4 lessons).
 * Challenge level scenes will be added in M3.
 *
 * Pure JS module (no DOM/Canvas dependency).
 */

import { DEFAULT_PID_GAINS } from './simulation.js';

export const PLAYGROUND_SCENE = {
  id: 'playground',
  mode: 'playground',
  name: 'Flight Test Playground',
  objective: 'Take off, fly with WASD, and hover steadily inside the target zone.',
  startPos: { x: 4.0, z: 0.0 },
  initialGains: { ...DEFAULT_PID_GAINS },
  windMode: 'calm',
  allowWindSelect: true,
  targetZone: {
    x: 18.0,
    z: 6.5,
    radius: 1.35,
    holdRequired: 2.0,
    maxSpeed: 0.45
  },
  timeLimit: null,
  tutorialGuide: null
};

export const TUTORIAL_SCENES = {
  'tutorial-1': {
    id: 'tutorial-1',
    mode: 'tutorial',
    nextLevelId: 'tutorial-2',
    name: 'Tutorial 1 — Take Off',
    stemTopic: 'Gravity and Thrust',
    objective: 'Use W/S to climb from the launch pad and hover steadily inside the upper target zone.',
    startPos: { x: 4.0, z: 0.0 },
    initialGains: { kp: 6.5, ki: 0.6, kd: 3.8 },
    windMode: 'calm',
    allowWindSelect: false,
    targetZone: {
      x: 4.0,
      z: 7.5,
      radius: 1.4,
      holdRequired: 1.5,
      maxSpeed: 0.45
    },
    timeLimit: 75,
    tutorialGuide: {
      learningObjective: 'Learn W/S vertical reference control and why thrust must exceed gravity (11.8 N) to lift off.',
      shortExplanation:
        'Gravity pulls the 1.2 kg drone downward with 11.77 N. Pressing W raises the yellow REF target, creating vertical error that commands extra rotor thrust.',
      interactiveExperiment:
        'Hold W to raise REF into the blue zone above. Notice how thrust rises above 11.8 N during climb, then settles back to ~11.8 N when hovering.',
      successConditions: 'Climb into the aerial target zone at (4.0 m, 7.5 m) and hold speed below 0.45 m/s for 1.5 s.',
      suggestedAdjustment: 'Start with Kp = 6.5, Ki = 0.60, Kd = 3.8. Try lowering Kp briefly to feel weak takeoff thrust, then restore Kp.',
      failureFeedbackTimeout: 'Time ran out before stabilizing in the climb zone. Hold W steadily to guide REF to 7.5 m and check that Kp is at least 4.0.',
      failureFeedbackHardLanding: 'Hard touchdown detected! Avoid slamming S downward near the ground; ease off S before landing.'
    }
  },

  'tutorial-2': {
    id: 'tutorial-2',
    mode: 'tutorial',
    nextLevelId: 'tutorial-3',
    name: 'Tutorial 2 — Proportional Control',
    stemTopic: 'Proportional Gain (Kp)',
    objective: 'Tune Kp to eliminate sluggish horizontal lag and fly with A/D into the right target zone.',
    startPos: { x: 4.0, z: 5.5 },
    initialGains: { kp: 1.2, ki: 0.0, kd: 3.5 },
    windMode: 'calm',
    allowWindSelect: false,
    targetZone: {
      x: 18.0,
      z: 5.5,
      radius: 1.35,
      holdRequired: 2.0,
      maxSpeed: 0.45
    },
    timeLimit: 75,
    tutorialGuide: {
      learningObjective: 'Use A/D horizontal control and compare slow vs. responsive Proportional Gain (Kp).',
      shortExplanation:
        'Kp multiplies position error (REF − Drone). Too little Kp creates weak tilt and heavy lag; too much Kp causes aggressive snapping and overshoot.',
      interactiveExperiment:
        'First tap D with the starting low Kp (1.2) to observe slow tracking. Then raise Kp toward 6.0–7.5 and fly cleanly to the right target.',
      successConditions: 'Reach the target zone at (18.0 m, 5.5 m) and hold steady for 2.0 s.',
      suggestedAdjustment: 'Increase Kp from 1.2 into the 5.5–7.5 range while keeping Kd around 3.5 for balanced horizontal tilt.',
      failureFeedbackTimeout: 'You did not stabilize in time. With Kp below 2.0 the drone responds too slowly—try increasing Kp toward 6.5.',
      failureFeedbackHardLanding: 'Descended too fast into the ground! Keep altitude around 5.5 m using W/S while tuning Kp.'
    }
  },

  'tutorial-3': {
    id: 'tutorial-3',
    mode: 'tutorial',
    nextLevelId: 'tutorial-4',
    name: 'Tutorial 3 — Integral Control',
    stemTopic: 'Integral Gain (Ki)',
    objective: 'Overcome steady crosswind drift by tuning Ki to remove persistent steady-state error.',
    startPos: { x: 5.0, z: 5.5 },
    initialGains: { kp: 4.5, ki: 0.0, kd: 3.4 },
    windMode: 'strong_breeze',
    allowWindSelect: false,
    targetZone: {
      x: 16.0,
      z: 5.5,
      radius: 0.8,
      holdRequired: 2.0,
      maxSpeed: 0.4
    },
    timeLimit: 85,
    tutorialGuide: {
      learningObjective: 'Observe steady-state error under constant crosswind, then tune Ki to eliminate it without severe windup.',
      shortExplanation:
        'Under constant wind (+4.8 N), P alone needs persistent position error to fight the wind. Integral action (Ki) accumulates error over time until offset disappears.',
      interactiveExperiment:
        'Fly REF to the target with Ki = 0.00 and watch the drone drift ~0.9 m right of REF. Raise Ki to ~1.4–2.0 to pull it back on center. Avoid Ki > 4.5 (windup overshoot).',
      successConditions: 'Center the drone inside the target zone under crosswind and hold steady for 2.0 s.',
      suggestedAdjustment: 'Increase Ki from 0.00 to 1.40–2.00 so the I term cancels the +4.8 N crosswind.',
      failureFeedbackTimeout: 'Steady crosswind kept the drone off-target or oscillating. Try Kp = 5.5, Ki = 1.60, Kd = 3.6.',
      failureFeedbackHardLanding: 'Hard ground impact! Maintain mid-air altitude with W/S while tuning Ki.'
    }
  },

  'tutorial-4': {
    id: 'tutorial-4',
    mode: 'tutorial',
    nextLevelId: null,
    name: 'Tutorial 4 — Derivative Control',
    stemTopic: 'Derivative Gain (Kd)',
    objective: 'Fly diagonally with WASD and increase Kd damping to brake cleanly inside the target zone.',
    startPos: { x: 4.0, z: 0.0 },
    initialGains: { kp: 7.0, ki: 0.4, kd: 0.4 },
    windMode: 'calm',
    allowWindSelect: false,
    targetZone: {
      x: 18.0,
      z: 7.0,
      radius: 1.25,
      holdRequired: 2.0,
      maxSpeed: 0.42
    },
    timeLimit: 85,
    tutorialGuide: {
      learningObjective: 'Compare underdamped overshoot vs. well-damped braking by tuning Derivative Gain (Kd).',
      shortExplanation:
        'Kd opposes velocity (D = -Kd × v), acting like an aerodynamic brake. Low Kd causes overshoot and oscillation; excessive Kd makes flight sluggish.',
      interactiveExperiment:
        'Start flying with low Kd (0.4) to see bounce and overshoot past REF. Then raise Kd to 3.6–4.5 and feel the drone brake smoothly into the target.',
      successConditions: 'Enter the target zone at (18.0 m, 7.0 m) and remain stabilized for 2.0 s without overshooting out.',
      suggestedAdjustment: 'Raise Kd from 0.4 up to 3.6–4.5 to damp oscillation without making the drone sluggish.',
      failureFeedbackTimeout: 'Time expired before settling. If the drone keeps bouncing past the circle, increase Kd toward 4.0.',
      failureFeedbackHardLanding: 'Hard landing occurred! Low Kd reduces vertical braking—increase Kd to 3.6+ before descending.'
    }
  }
};

export function getSceneById(id) {
  if (id === 'playground') return PLAYGROUND_SCENE;
  return TUTORIAL_SCENES[id] || null;
}

/**
 * Generate real-time English coaching hints from live simulation telemetry.
 */
export function evaluateTutorialCoaching(sim, scene) {
  if (!scene || scene.mode !== 'tutorial') return null;

  const { gains, drone, reference, targetZone, lastPid } = sim;
  const errX = reference.x - drone.x;
  const errZ = reference.z - drone.z;
  const distToTarget = Math.hypot(drone.x - targetZone.x, drone.z - targetZone.z);

  if (!sim.started) {
    return 'Press Start Flight or WASD to begin the experiment.';
  }

  if (targetZone.stabilized) {
    return 'Great job! Target stabilized — mission criteria met.';
  }

  if (targetZone.inside) {
    const speed = Math.hypot(drone.vx, drone.vz);
    if (speed > targetZone.maxSpeed) {
      return `Inside target zone, but speed is ${speed.toFixed(2)} m/s. Release WASD or raise Kd slightly to brake below ${targetZone.maxSpeed.toFixed(2)} m/s.`;
    }
    return `Hold steady! Stabilizing (${targetZone.holdTimer.toFixed(1)} / ${targetZone.holdRequired.toFixed(1)} s)...`;
  }

  if (scene.id === 'tutorial-1') {
    if (gains.kp < 2.0) {
      return 'Kp is very low—thrust responds weakly to vertical error. Try raising Kp toward 6.5.';
    }
    if (drone.onGround && reference.z <= 0.1) {
      return 'Hold W to raise the yellow REF target upward and generate takeoff thrust (> 11.8 N).';
    }
    return `Thrust: ${drone.thrust.toFixed(1)} N (hover ~11.8 N). Guide REF into the target circle at Z = ${targetZone.z.toFixed(1)} m.`;
  }

  if (scene.id === 'tutorial-2') {
    if (gains.kp < 2.2) {
      return `Notice the lag (X error ${errX.toFixed(2)} m)? Increase Kp toward 5.5–7.5 to speed up horizontal tracking.`;
    }
    if (gains.kp > 13.0) {
      return 'Kp is very aggressive—watch for overshoot or twitchy tilt! Try 6.0–8.0 for crisp control.';
    }
    return `Good Kp (${gains.kp.toFixed(1)}). Use A/D to align REF with the target (${distToTarget.toFixed(1)} m away).`;
  }

  if (scene.id === 'tutorial-3') {
    if (gains.ki < 0.25 && Math.abs(errX) > 0.25) {
      return `Steady crosswind is creating a ${Math.abs(errX).toFixed(2)} m offset (I = ${lastPid.x.iTerm.toFixed(1)}). Raise Ki toward 1.2–1.8!`;
    }
    if (gains.ki > 4.2) {
      return 'Ki is very high—watch out for integral windup and overshoot! Try 1.2–1.8.';
    }
    return `Integral term I_x = ${lastPid.x.iTerm.toFixed(2)} is actively fighting the +4.8 N wind. Center the drone in the zone.`;
  }

  if (scene.id === 'tutorial-4') {
    if (gains.kd < 1.5) {
      return 'Low damping (Kd)! Expect overshoot when releasing WASD—try raising Kd to 3.6–4.5.';
    }
    if (gains.kd > 10.5) {
      return 'Kd is very high—heavy damping makes movement sluggish. Try 3.5–5.0.';
    }
    return `Damping is well balanced (Kd = ${gains.kd.toFixed(1)}). Fly smoothly into the target zone and release WASD to brake.`;
  }

  return null;
}

/**
 * Evaluate completion or failure of the active scene.
 */
export function evaluateSceneOutcome(sim, scene) {
  if (!scene || !sim.started) {
    return { status: 'ready' };
  }

  if (sim.targetZone.stabilized) {
    return {
      status: 'completed',
      title: 'Mission Complete!',
      message: `You stabilized inside ${scene.name} in ${sim.elapsedTime.toFixed(1)} s.`,
      suggestedAdjustment: scene.tutorialGuide?.suggestedAdjustment || null
    };
  }

  if (scene.mode === 'tutorial' && sim.drone.landedHard) {
    return {
      status: 'failed',
      reason: 'hard_landing',
      title: 'Mission Failed — Hard Landing',
      message:
        scene.tutorialGuide?.failureFeedbackHardLanding ||
        `Touchdown speed (${sim.drone.maxImpactSpeed.toFixed(1)} m/s) exceeded safe limits.`,
      suggestedAdjustment: scene.tutorialGuide?.suggestedAdjustment || null
    };
  }

  if (Number.isFinite(scene.timeLimit) && sim.elapsedTime >= scene.timeLimit) {
    return {
      status: 'failed',
      reason: 'timeout',
      title: 'Mission Failed — Time Expired',
      message:
        scene.tutorialGuide?.failureFeedbackTimeout ||
        `Time limit (${scene.timeLimit} s) reached before stabilizing in the target zone.`,
      suggestedAdjustment: scene.tutorialGuide?.suggestedAdjustment || null
    };
  }

  return { status: 'running' };
}
