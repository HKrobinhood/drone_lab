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

export const CHALLENGE_SCENES = {
  'level-1': {
    id: 'level-1',
    mode: 'challenge',
    nextLevelId: 'level-2',
    name: 'Level 1 — Stable Hover',
    description: 'Baseline airframe in calm air with a generous hover zone. Focus on understanding how Kp, Ki, and Kd govern takeoff and steady hover.',
    objective: 'Take off, enter the aerial target zone, and maintain a steady hover for 2.5 seconds.',
    startPos: { x: 3.5, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    initialPID: { kp: 6.5, ki: 0.6, kd: 3.8 },
    targetTolerance: 1.65,
    velocityTolerance: 0.45,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    targetZone: {
      x: 17.5,
      z: 7.5,
      radius: 1.65,
      holdRequired: 2.5,
      maxSpeed: 0.45
    },
    timeLimit: 65,
    briefing: 'Understand your baseline PID gains. Overshooting outside the target zone resets the 2.5 s stabilization timer.',
    suggestedAdjustment: 'Keep Kp balanced (~6.5) and Kd around 3.8–4.5 so the drone brakes smoothly inside the zone.'
  },

  'level-2': {
    id: 'level-2',
    mode: 'challenge',
    nextLevelId: 'level-3',
    name: 'Level 2 — Precision Landing',
    description: 'Standard airframe with a mid-field wall and a narrow elevated helipad. Control overshoot and vertical descent speed.',
    objective: 'Clear the barrier and land softly on the narrow helipad (<= 1.5 m/s touchdown speed).',
    startPos: { x: 3.5, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 30,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    initialPID: { kp: 7.5, ki: 0.5, kd: 2.2 },
    targetTolerance: 0.9,
    velocityTolerance: 1.5,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    forbidGroundOutsidePad: true,
    obstacles: [
      { x: 10.2, z: 0.0, width: 1.2, height: 4.6 }
    ],
    landingPad: {
      x: 19.0,
      topZ: 1.6,
      halfWidth: 0.9,
      maxTouchdownSpeed: 1.5,
      holdRequired: 1.2
    },
    targetZone: null,
    timeLimit: 70,
    briefing: 'Narrow 1.8 m helipad! Starting Kd (2.2) is underdamped—raise Kd to suppress horizontal overshoot and soften touchdown.',
    suggestedAdjustment: 'Increase Kd to 4.0–5.0 and moderate Kp around 6.0–7.0 for crisp braking above the pad.'
  },

  'level-3': {
    id: 'level-3',
    mode: 'challenge',
    nextLevelId: 'level-4',
    name: 'Level 3 — Heavy Cargo',
    description: 'Carrying a 0.85 kg cargo pod (2.05 kg total mass) under fixed 26.0 N max thrust. Manage lower thrust-to-weight ratio and actuator saturation.',
    objective: 'Lift the heavy cargo over the ridge and hold steady inside the delivery zone for 2.0 s.',
    startPos: { x: 3.2, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.85,
    maxThrust: 26.0,
    maxTilt: 26,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    initialPID: { kp: 5.5, ki: 0.2, kd: 3.4 },
    targetTolerance: 1.3,
    velocityTolerance: 0.4,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    obstacles: [
      { x: 10.5, z: 0.0, width: 1.3, height: 4.5 }
    ],
    targetZone: {
      x: 18.5,
      z: 6.8,
      radius: 1.3,
      holdRequired: 2.0,
      maxSpeed: 0.4
    },
    timeLimit: 80,
    briefing: 'Heavy payload lowers TWR to 1.29 and adds 8.3 N uncompensated weight. Tune Ki to eliminate vertical sag without saturating thrust.',
    suggestedAdjustment: 'Raise Ki (1.2–2.0) to trim out cargo weight droop, and keep Kp moderate (5.5–7.5) with Kd ~3.8–4.4.'
  },

  'level-4': {
    id: 'level-4',
    mode: 'challenge',
    nextLevelId: 'level-5',
    name: 'Level 4 — Narrow Corridor',
    description: 'Light sensor payload (1.35 kg total) navigating tight 3.0 m vertical gates. Balance responsiveness against overshoot.',
    objective: 'Thread all three corridor gates without touching the beams and stabilize at the exit.',
    startPos: { x: 2.8, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.15,
    maxThrust: 28.0,
    maxTilt: 28,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    initialPID: { kp: 8.5, ki: 0.4, kd: 2.4 },
    targetTolerance: 1.05,
    velocityTolerance: 0.35,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    obstacles: [
      { x: 7.2, z: 0.0, width: 1.1, height: 5.4 },
      { x: 7.2, z: 8.4, width: 1.1, height: 5.6 },
      { x: 12.2, z: 0.0, width: 1.1, height: 3.1 },
      { x: 12.2, z: 6.1, width: 1.1, height: 7.9 },
      { x: 16.8, z: 0.0, width: 1.1, height: 5.9 },
      { x: 16.8, z: 8.9, width: 1.1, height: 5.1 }
    ],
    targetZone: {
      x: 20.8,
      z: 7.2,
      radius: 1.05,
      holdRequired: 1.5,
      maxSpeed: 0.35
    },
    timeLimit: 80,
    briefing: 'Tight 3.0 m gates leave little margin for bounce. Default gains are too twitchy—tune Kp/Kd for zero-overshoot precision.',
    suggestedAdjustment: 'Increase Kd (4.0–5.0) and moderate Kp (6.0–7.2) to eliminate vertical oscillation inside the corridor.'
  },

  'level-5': {
    id: 'level-5',
    mode: 'challenge',
    nextLevelId: 'level-6',
    name: 'Level 5 — Wind Challenge',
    description: 'Sustained +3.8 N crosswind plus repeatable gusts up to +6.8 N horizontal / -1.3 N downdraft. Requires integral disturbance rejection.',
    objective: 'Clear the barrier and hold steady inside the target zone for 2.5 s under gusting wind.',
    startPos: { x: 3.2, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.2,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 3.8, z: 0 },
    windGust: { xAmp: 3.0, zAmp: -1.3, period: 6.5, duration: 2.2, phaseOffset: 2.8 },
    windLabel: '+3.8 N Crosswind + Repeatable Gusts (+6.8 N / -1.3 N)',
    initialPID: { kp: 6.5, ki: 0.0, kd: 3.8 },
    targetTolerance: 1.1,
    velocityTolerance: 0.4,
    windMode: 'scene_wind',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    obstacles: [
      { x: 11.0, z: 0.0, width: 1.2, height: 4.8 }
    ],
    targetZone: {
      x: 19.0,
      z: 7.5,
      radius: 1.1,
      holdRequired: 2.5,
      maxSpeed: 0.4
    },
    timeLimit: 85,
    briefing: 'Starting Ki is 0.00! Without integral action, steady crosswind will push you off target. Tune Ki to cancel drift without windup.',
    suggestedAdjustment: 'Raise Ki into 1.20–2.20 and pair with Kp ~6.5–7.5, Kd ~4.0–4.5 to absorb gust pulses.'
  },

  'level-6': {
    id: 'level-6',
    mode: 'challenge',
    nextLevelId: null,
    name: 'Level 6 — Final Rescue Mission',
    description: 'Combined heavy rescue pod (+0.55 kg), sustained wind & gusts, obstacles, aerial rings, and precision helipad touchdown.',
    objective: 'Pass both rescue rings in order, avoid obstacles in gusty wind, and land softly on the rescue helipad (<= 1.7 m/s).',
    startPos: { x: 2.6, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.55,
    maxThrust: 27.5,
    maxTilt: 30,
    windForce: { x: 2.6, z: 0 },
    windGust: { xAmp: 2.4, zAmp: -1.0, period: 7.0, duration: 2.2, phaseOffset: 3.0 },
    windLabel: '+2.6 N Crosswind + Gusts (+5.0 N / -1.0 N)',
    initialPID: { kp: 6.2, ki: 0.3, kd: 3.4 },
    targetTolerance: 1.05,
    velocityTolerance: 1.7,
    windMode: 'scene_wind',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    forbidGroundOutsidePad: true,
    obstacles: [
      { x: 6.8, z: 0.0, width: 1.0, height: 4.4 },
      { x: 13.8, z: 8.4, width: 1.1, height: 5.6 }
    ],
    rings: [
      { x: 10.4, z: 6.8, apertureHalfH: 1.35 },
      { x: 15.6, z: 5.2, apertureHalfH: 1.3 }
    ],
    landingPad: {
      x: 19.5,
      topZ: 1.6,
      halfWidth: 1.05,
      maxTouchdownSpeed: 1.7,
      holdRequired: 1.5
    },
    targetZone: null,
    timeLimit: 95,
    briefing: 'Final exam: Heavy rescue load + gusty wind + Ring #1 → Ring #2 + narrow soft helipad landing (<= 1.7 m/s).',
    suggestedAdjustment: 'Tune Kp ~6.8–7.6 for crisp ring tracking, Ki ~1.1–1.6 for payload & wind trim, and Kd ~4.2–4.8 for soft touchdown.'
  }
};

export function getSceneById(id) {
  if (id === 'playground') return PLAYGROUND_SCENE;
  return TUTORIAL_SCENES[id] || CHALLENGE_SCENES[id] || null;
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

  const targetComplete = scene.targetZone ? sim.targetZone?.stabilized : true;
  const padComplete = scene.landingPad ? sim.padStatus?.landedSafely : true;
  const ringsComplete = (scene.rings?.length || 0) === 0 || sim.nextRingIndex >= scene.rings.length;

  if (
    !sim.collided &&
    !sim.outOfBounds &&
    !sim.landedOffPad &&
    !sim.drone.landedHard &&
    ringsComplete &&
    targetComplete &&
    padComplete &&
    (scene.targetZone || scene.landingPad)
  ) {
    return {
      status: 'completed',
      title: 'Mission Complete!',
      message: `You completed ${scene.name} in ${sim.elapsedTime.toFixed(1)} s.`,
      suggestedAdjustment: scene.suggestedAdjustment || scene.tutorialGuide?.suggestedAdjustment || null
    };
  }

  if (sim.collided) {
    return {
      status: 'failed',
      reason: 'collision',
      title: 'Mission Failed — Collision',
      message: 'Your drone struck an obstacle or ring rim. Reduce overshoot and approach tight gaps smoothly.',
      suggestedAdjustment:
        scene.suggestedAdjustment || 'Try increasing Kd (3.8–4.6) to reduce overshoot and improve braking precision.'
    };
  }

  if (sim.outOfBounds) {
    return {
      status: 'failed',
      reason: 'out_of_bounds',
      title: 'Mission Failed — Out of Bounds',
      message: 'Your drone crossed the arena safety boundary. Keep flight trajectories inside the marked perimeter.',
      suggestedAdjustment:
        scene.suggestedAdjustment || 'Lower excessive Kp or increase Kd so your drone brakes before reaching the walls.'
    };
  }

  if (sim.landedOffPad) {
    return {
      status: 'failed',
      reason: 'off_pad',
      title: 'Mission Failed — Missed Landing Pad',
      message: `Your drone touched down on the ground instead of the helipad at X = ${scene.landingPad?.x?.toFixed(1)} m.`,
      suggestedAdjustment:
        scene.suggestedAdjustment || 'Align the REF crosshair directly above the helipad before descending with S.'
    };
  }

  if ((scene.mode === 'tutorial' || scene.mode === 'challenge') && sim.drone.landedHard) {
    return {
      status: 'failed',
      reason: 'hard_landing',
      title: 'Mission Failed — Hard Landing',
      message:
        scene.tutorialGuide?.failureFeedbackHardLanding ||
        `Touchdown speed (${sim.drone.maxImpactSpeed.toFixed(1)} m/s) exceeded safe landing limits.`,
      suggestedAdjustment:
        scene.suggestedAdjustment || scene.tutorialGuide?.suggestedAdjustment || 'Increase Kd slightly and descend gradually with S.'
    };
  }

  if (Number.isFinite(scene.timeLimit) && sim.elapsedTime >= scene.timeLimit) {
    return {
      status: 'failed',
      reason: 'timeout',
      title: 'Mission Failed — Time Expired',
      message:
        scene.tutorialGuide?.failureFeedbackTimeout ||
        `Time limit (${scene.timeLimit} s) reached before completing all mission objectives.`,
      suggestedAdjustment: scene.suggestedAdjustment || scene.tutorialGuide?.suggestedAdjustment || null
    };
  }

  return { status: 'running' };
}
