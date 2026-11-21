/**
 * Scene definitions and live coaching / outcome evaluators.
 * Covers the M2 Tutorial Village (4 lessons) and M3 Challenge Levels (6 missions).
 *
 * Pure JS module (no DOM/Canvas dependency).
 */

import { DEFAULT_PID_GAINS } from './simulation.js';

export const TUTORIAL_SCENES = {
  'tutorial-1': {
    id: 'tutorial-1',
    mode: 'tutorial',
    nextLevelId: 'tutorial-2',
    name: 'Tutorial 1 — Flight Control Basics',
    stemTopic: 'Flight UI, WASD & Gravity/Thrust',
    visualId: 'gravity-thrust',
    measuredMetrics: ['WASD -> REF Control', 'Completion Time', 'Route Fit (REF vs Actual)', 'Rotor Power & Energy'],
    pipMetricBrief:
      "Hi pilot! Once we launch, I'll introduce WASD controls and show how thrust affects Completion Time, Route Fit, and Battery Power.",
    strategyProfile: {
      focusTag: 'Control Basics',
      priorities: { speed: 1, stability: 2, precision: 2, efficiency: 1 },
      tradeoffHint: 'Smooth climb uses steady thrust—harsh surges spike rotor power.',
      hideRecommendedZone: false
    },
    energyBudget: null,
    failOnBatteryEmpty: false,
    description: 'Guided tour of Mission Briefing, Drone Specs, PID Tuning, WASD flight, and Flight Metrics.',
    objective: 'Explore the cockpit controls, test WASD movement, and hover in the blue zone.',
    whatYouLearnedBefore: 'First flight! Follow PIP step by step.',
    newChallenge: 'Learn every panel and lift a 1.20 kg drone with vertical thrust.',
    learningObjective: 'Master the Drone Lab UI and see why thrust must exceed weight (11.8 N) to climb.',
    flightConditions: 'Calm air (0.0 N), 1.20 kg drone, 28.0 N max thrust.',
    missionGoal: 'Climb into (4.0 m, 7.5 m) and hold <= 0.45 m/s for 1.5 s.',
    startPos: { x: 4.0, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    requiresIntegral: false,
    initialPID: { kp: 6.5, ki: 0.6, kd: 3.8 },
    initialGains: { kp: 6.5, ki: 0.6, kd: 3.8 },
    recommendedPID: {
      kpMin: 4.5,
      kpMax: 9.0,
      kiMin: 0.0,
      kiMax: 1.5,
      kdMin: 2.5,
      kdMax: 6.0,
      minDampingRatio: 0.48,
      maxKpToKdRatio: 2.8
    },
    targetTolerance: 1.4,
    velocityTolerance: 0.45,
    windMode: 'calm',
    allowWindSelect: false,
    allowLivePidTuning: true,
    guidanceLevel: 'full',
    targetZone: {
      x: 4.0,
      z: 7.5,
      radius: 1.4,
      holdRequired: 1.5,
      maxSpeed: 0.45
    },
    timeLimit: 120,
    briefing: 'Guided Lesson 1: Inspect the panels, try a PID slider, press Start Flight, practice WASD, and hold in the blue target.',
    suggestedAdjustment: 'Keep Kp near 6.5, Ki around 0.60, and Kd near 3.8 for responsive and steady takeoff.',
    tutorialGuide: {
      learningObjective: 'Learn W/S vertical reference control and why thrust must exceed gravity (11.8 N) to lift off.',
      shortExplanation:
        'Gravity pulls the 1.2 kg drone downward with 11.77 N. Pressing W raises the yellow REF target, creating vertical error that commands extra rotor thrust.',
      interactiveExperiment:
        'Hold W to raise REF into the blue zone above. Notice how thrust rises above 11.8 N during climb, then settles back to ~11.8 N when hovering.',
      successConditions: 'Climb into the aerial target zone at (4.0 m, 7.5 m) and hold speed below 0.45 m/s for 1.5 s.',
      suggestedAdjustment: 'Start with Kp = 6.5, Ki = 0.60, Kd = 3.8. Try adjusting a slider gently, then restore Kp >= 4.5 for clean takeoff.',
      failureFeedbackTimeout: 'Time ran out before stabilizing in the climb zone. Hold W steadily to guide REF to 7.5 m and check that Kp is at least 4.0.',
      failureFeedbackHardLanding: 'Hard touchdown detected! Avoid slamming S downward near the ground; ease off S before landing.'
    }
  },

  'tutorial-2': {
    id: 'tutorial-2',
    mode: 'tutorial',
    nextLevelId: 'tutorial-3',
    name: 'Tutorial 2 — Proportional Control',
    stemTopic: 'Proportional Gain (Kp) & Tracking Lag',
    visualId: 'kp-response',
    measuredMetrics: ['Response Speed / Tracking Lag', 'Route Fit (REF vs Actual)', 'Speed vs. Energy'],
    pipMetricBrief:
      "Pilot, today I'm measuring Response Speed vs. Energy! Low Kp drags time out, while extreme Kp spikes power and overshoot.",
    strategyProfile: {
      focusTag: 'Speed vs. Overshoot',
      priorities: { speed: 3, stability: 2, precision: 2, efficiency: 2 },
      tradeoffHint: 'Raising Kp boosts Speed, but too much Kp adds overshoot and power spikes.',
      hideRecommendedZone: false
    },
    energyBudget: null,
    failOnBatteryEmpty: false,
    description: 'Kp starts at 1.2 so you can feel Tracking Lag, then raise Kp for responsive Route Fit.',
    objective: 'Raise Kp to remove horizontal lag and hold inside the right target zone.',
    whatYouLearnedBefore: 'WASD moves the yellow REF target and PID commands thrust and tilt.',
    newChallenge: 'Kp controls how strongly your drone reacts to position errors.',
    learningObjective: 'Compare slow low-Kp response against crisp proportional tracking.',
    flightConditions: 'Calm air (0.0 N), 1.20 kg drone, airborne start at (4.0 m, 5.5 m).',
    missionGoal: 'Reach (18.0 m, 5.5 m) and hold <= 0.45 m/s for 2.0 s.',
    startPos: { x: 4.0, z: 5.5 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    requiresIntegral: false,
    initialPID: { kp: 1.2, ki: 0.0, kd: 3.5 },
    initialGains: { kp: 1.2, ki: 0.0, kd: 3.5 },
    recommendedPID: {
      kpMin: 4.8,
      kpMax: 8.8,
      kiMin: 0.0,
      kiMax: 1.2,
      kdMin: 2.8,
      kdMax: 5.5,
      minDampingRatio: 0.5,
      maxKpToKdRatio: 2.6
    },
    targetTolerance: 1.35,
    velocityTolerance: 0.45,
    windMode: 'calm',
    allowWindSelect: false,
    allowLivePidTuning: true,
    guidanceLevel: 'medium',
    targetZone: {
      x: 18.0,
      z: 5.5,
      radius: 1.35,
      holdRequired: 2.0,
      maxSpeed: 0.45
    },
    timeLimit: 75,
    briefing: 'Medium Guidance: Start with Kp = 1.2 to see sluggish tracking error, then raise Kp into the Recommended zone.',
    suggestedAdjustment: 'Increase Kp from 1.2 into the 5.5–7.5 range while keeping Kd around 3.5 for balanced horizontal tilt.',
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
    stemTopic: 'Integral Gain (Ki) & Steady-State Offset',
    visualId: 'ki-integral',
    measuredMetrics: ['Steady-State Offset (m)', 'Thrust Saturation & Windup', 'Wind Energy Drain'],
    pipMetricBrief:
      "Pilot, today I'm measuring Steady-State Offset vs. Energy! Under +4.8 N crosswind, raise Ki to hold precision without wasting power in saturation.",
    strategyProfile: {
      focusTag: 'Precision vs. Stability',
      priorities: { speed: 1, stability: 2, precision: 3, efficiency: 2 },
      tradeoffHint: 'Moderate Ki locks Precision in wind; excessive Ki causes windup and battery waste.',
      hideRecommendedZone: false
    },
    energyBudget: null,
    failOnBatteryEmpty: false,
    description: '+4.8 N crosswind drifts the drone off REF when Ki = 0. Tune Ki to cancel Steady-State Offset.',
    objective: 'Raise Ki to cancel steady crosswind error and hold in the target zone.',
    whatYouLearnedBefore: 'Kp drives speed toward REF, but leaves offset under constant wind.',
    newChallenge: 'Accumulate persistent error with Ki to offset the +4.8 N wind.',
    learningObjective: 'Use Integral Gain (Ki) to eliminate steady-state wind error without windup.',
    flightConditions: '+4.8 N steady crosswind, 1.20 kg drone, 0.80 m target zone.',
    missionGoal: 'Center inside (16.0 m, 5.5 m) at <= 0.40 m/s for 2.0 s.',
    startPos: { x: 5.0, z: 5.5 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 4.8, z: 0 },
    windGust: null,
    windLabel: '+4.8 N Steady Crosswind',
    requiresIntegral: true,
    initialPID: { kp: 4.5, ki: 0.0, kd: 3.4 },
    initialGains: { kp: 4.5, ki: 0.0, kd: 3.4 },
    recommendedPID: {
      kpMin: 4.5,
      kpMax: 8.8,
      kiMin: 1.0,
      kiMax: 2.5,
      kdMin: 3.0,
      kdMax: 5.8,
      minDampingRatio: 0.55,
      maxKpToKdRatio: 2.4
    },
    targetTolerance: 0.8,
    velocityTolerance: 0.4,
    windMode: 'strong_breeze',
    allowWindSelect: false,
    allowLivePidTuning: true,
    guidanceLevel: 'light',
    targetZone: {
      x: 16.0,
      z: 5.5,
      radius: 0.8,
      holdRequired: 2.0,
      maxSpeed: 0.4
    },
    timeLimit: 85,
    briefing: 'Light Guidance: Fly with Ki = 0.00 to observe wind drift, then increase Ki to bring the drone onto REF.',
    suggestedAdjustment: 'Increase Ki from 0.00 to 1.40–2.00 so the I term cancels the +4.8 N crosswind.',
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
    stemTopic: 'Derivative Gain (Kd) & Settling Stability',
    visualId: 'kd-damping',
    measuredMetrics: ['Overshoot (m)', 'Oscillation Reversals', 'Settling Time & Flight Stability', 'Energy Efficiency'],
    pipMetricBrief:
      "Pilot, today I grade Overshoot, Settling Time, Stability, and Energy! Oscillation burns battery fast—raise Kd to brake smoothly.",
    strategyProfile: {
      focusTag: 'Stability & Efficiency',
      priorities: { speed: 2, stability: 3, precision: 3, efficiency: 3 },
      tradeoffHint: 'Good Kd damps oscillation to save battery and sharpen braking; extreme Kd slows speed.',
      hideRecommendedZone: false
    },
    energyBudget: null,
    failOnBatteryEmpty: false,
    description: 'Kd starts at 0.4, causing Overshoot and Oscillation unless you add damping.',
    objective: 'Increase Kd to reduce overshoot and brake smoothly inside the target zone.',
    whatYouLearnedBefore: 'Tutorials 1–3 covered thrust, Kp responsiveness, and Ki wind trim.',
    newChallenge: 'Try increasing Kd to reduce overshoot and improve braking.',
    learningObjective: 'Tune Derivative Gain (Kd) for smooth stopping without sluggish flight.',
    flightConditions: 'Calm air (0.0 N), 1.20 kg drone, diagonal climb to (18.0 m, 7.0 m).',
    missionGoal: 'Hold inside (18.0 m, 7.0 m) at <= 0.42 m/s for 2.0 s.',
    startPos: { x: 4.0, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    requiresIntegral: false,
    initialPID: { kp: 7.0, ki: 0.4, kd: 0.4 },
    initialGains: { kp: 7.0, ki: 0.4, kd: 0.4 },
    recommendedPID: {
      kpMin: 4.8,
      kpMax: 8.6,
      kiMin: 0.0,
      kiMax: 1.2,
      kdMin: 3.2,
      kdMax: 6.0,
      minDampingRatio: 0.58,
      maxKpToKdRatio: 2.3
    },
    targetTolerance: 1.25,
    velocityTolerance: 0.42,
    windMode: 'calm',
    allowWindSelect: false,
    allowLivePidTuning: true,
    guidanceLevel: 'minimal',
    targetZone: {
      x: 18.0,
      z: 7.0,
      radius: 1.25,
      holdRequired: 2.0,
      maxSpeed: 0.42
    },
    timeLimit: 85,
    briefing: 'Autonomous Practice: Tune PID yourself with PIP feedback, stabilize smoothly, and unlock readiness for Challenge Levels.',
    suggestedAdjustment: 'Raise Kd from 0.4 up to 3.6–4.5 to damp oscillation without making the drone sluggish.',
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
    name: 'Level 1 — Express Hover',
    description: 'Speed-First mission in calm air with a wide hover zone. Choose an Agile strategy (strong Kp, light-moderate Kd) to hit the fast 3-star target.',
    objective: 'Take off briskly with WASD and stabilize inside the wide target zone for 2.0 seconds (<= 0.50 m/s).',
    newChallenge: 'Your PID gains start at zero! The wide target forgives minor overshoot, so prioritize fast agile response to beat the 3-star speed target.',
    whatYouLearnedBefore: 'WASD moves the yellow REF target, and Kp/Kd balance speed against damping.',
    learningObjective: 'Apply an Agile (Speed-First) strategy by pairing responsive Kp with moderate Kd when precision margins are wide.',
    flightConditions: 'Calm air (0.0 N), base airframe (1.20 kg), wide 1.75 m target zone, generous power.',
    missionGoal: 'Climb quickly to (17.5 m, 7.5 m) and stay <= 0.50 m/s for 2.0 s (3★ requires fast settling).',
    strategyProfile: {
      focusTag: 'Speed-First',
      priorities: { speed: 3, stability: 1, precision: 1, efficiency: 1 },
      tradeoffHint: 'Wide target allows an Agile high-Kp strategy; overly conservative Kd will miss the 3-star time & settling goal.',
      hideRecommendedZone: false
    },
    energyBudget: null,
    failOnBatteryEmpty: false,
    startPos: { x: 3.5, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    requiresIntegral: false,
    initialPID: { kp: 0, ki: 0, kd: 0 },
    recommendedPID: {
      kpMin: 6.5,
      kpMax: 11.2,
      kiMin: 0.0,
      kiMax: 0.8,
      kdMin: 2.4,
      kdMax: 4.4,
      minDampingRatio: 0.42,
      maxKpToKdRatio: 3.4
    },
    targetTolerance: 1.75,
    velocityTolerance: 0.5,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    targetZone: {
      x: 17.5,
      z: 7.5,
      radius: 1.75,
      holdRequired: 2.0,
      maxSpeed: 0.5
    },
    timeLimit: 70,
    briefing: 'Focus on Kp! Start with moderate Kp and gentle Kd damping. Overshooting out of the circle resets the 2.0 s timer.',
    suggestedAdjustment: 'Raise Kp into a responsive middle range (avoid extremes) and add moderate Kd so the drone settles instead of bouncing.'
  },

  'level-2': {
    id: 'level-2',
    mode: 'challenge',
    nextLevelId: 'level-3',
    name: 'Level 2 — Surgical Braking',
    description: 'Precision-First mission with a compact target and strict stopping threshold. Switch from L1 Agile tuning to a heavily damped Precision strategy.',
    objective: 'Fly over the mid-field wall and stop with minimal overshoot inside the compact zone (<= 0.25 m/s) for 2.2 seconds.',
    newChallenge: 'Tighter 0.98 m target zone and strict <= 0.25 m/s stopping limit—L1 aggressive Kp will overshoot and forfeit 3-star precision.',
    whatYouLearnedBefore: 'Level 1 Agile tuning was fast, but carried noticeable overshoot when braking.',
    learningObjective: 'Switch to a Precision-First strategy: lower Kp slightly and raise Kd damping to achieve near-zero overshoot.',
    flightConditions: 'Calm air (0.0 N), base airframe (1.20 kg), 4.4 m barrier, compact 0.98 m target zone.',
    missionGoal: 'Clear the barrier, enter (18.5 m, 6.2 m), and hold <= 0.25 m/s for 2.2 s with minimal overshoot.',
    strategyProfile: {
      focusTag: 'Precision-First',
      priorities: { speed: 1, stability: 3, precision: 3, efficiency: 2 },
      tradeoffHint: 'Trade raw top speed for high Kd damping and restrained Kp so you brake with near-zero overshoot.',
      hideRecommendedZone: false
    },
    energyBudget: null,
    failOnBatteryEmpty: false,
    startPos: { x: 3.5, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.0,
    maxThrust: 28.0,
    maxTilt: 30,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    requiresIntegral: false,
    initialPID: { kp: 0, ki: 0, kd: 0 },
    recommendedPID: {
      kpMin: 4.4,
      kpMax: 7.0,
      kiMin: 0.0,
      kiMax: 0.8,
      kdMin: 4.2,
      kdMax: 7.2,
      minDampingRatio: 0.72,
      maxKpToKdRatio: 1.85
    },
    targetTolerance: 0.98,
    velocityTolerance: 0.25,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    obstacles: [
      { x: 10.2, z: 0.0, width: 1.2, height: 4.4 }
    ],
    targetZone: {
      x: 18.5,
      z: 6.2,
      radius: 0.98,
      holdRequired: 2.2,
      maxSpeed: 0.25
    },
    timeLimit: 70,
    briefing: 'Smooth braking test! Coordinate Kp and Kd so the drone settles below 0.28 m/s inside the smaller 1.05 m target.',
    suggestedAdjustment: 'Increase Kd damping relative to Kp to eliminate overshoot, without pushing Kd so high that flight feels sluggish.'
  },

  'level-3': {
    id: 'level-3',
    mode: 'challenge',
    nextLevelId: 'level-4',
    name: 'Level 3 — Eco Cargo Run',
    description: 'Energy-First heavy transport (+0.90 kg cargo, 2.10 kg total) on a finite 3200 J battery. Aggressive thrust spikes or slow sagging flight will drain the battery.',
    objective: 'Carry heavy cargo over the ridge and stabilize in the delivery zone before battery runs out.',
    newChallenge: 'Finite 3200 J battery + 2.10 kg mass! Zero Ki causes slow sag and battery depletion; overly aggressive Kp spikes power. Recommended slider guides are now hidden—use the 4-Axis Strategy Meter.',
    whatYouLearnedBefore: 'Level 1 Agile speed and Level 2 Precision damping.',
    learningObjective: 'Design an Eco strategy under heavy load: moderate Kp, steady Ki lift trim, and smooth Kd to minimize peak rotor power.',
    flightConditions: 'Heavy cargo (+0.90 kg -> 2.10 kg total), max thrust 26.5 N, 3200 J battery limit, calm air.',
    missionGoal: 'Clear the 4.5 m ridge and stabilize inside (18.5 m, 6.8 m) <= 0.35 m/s for 2.0 s with >= 35% battery for 3★.',
    strategyProfile: {
      focusTag: 'Energy-First',
      priorities: { speed: 1, stability: 2, precision: 2, efficiency: 3 },
      tradeoffHint: 'Rotor power scales steeply with thrust spikes (T^1.5). Use moderate Kp, solid Ki trim, and smooth Kd to conserve battery.',
      hideRecommendedZone: true
    },
    energyBudget: 3200,
    failOnBatteryEmpty: true,
    startPos: { x: 3.2, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.9,
    maxThrust: 26.5,
    maxTilt: 26,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    requiresIntegral: true,
    initialPID: { kp: 0, ki: 0, kd: 0 },
    recommendedPID: {
      kpMin: 4.8,
      kpMax: 7.4,
      kiMin: 0.8,
      kiMax: 2.0,
      kdMin: 3.6,
      kdMax: 5.8,
      minDampingRatio: 0.6,
      maxKpToKdRatio: 2.2
    },
    targetTolerance: 1.25,
    velocityTolerance: 0.35,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    obstacles: [
      { x: 10.5, z: 0.0, width: 1.3, height: 4.5 }
    ],
    targetZone: {
      x: 18.5,
      z: 6.8,
      radius: 1.25,
      holdRequired: 2.0,
      maxSpeed: 0.35
    },
    timeLimit: 80,
    briefing: 'Heavy 2.10 kg load saturates thrust if Kp/Ki are too aggressive, while zero Ki causes ~1 m vertical droop below REF.',
    suggestedAdjustment: 'Add moderate Ki (1.0–2.0) to lift payload sag, keep Kp moderate so thrust does not stay saturated, and retain solid Kd braking.'
  },

  'level-4': {
    id: 'level-4',
    mode: 'challenge',
    nextLevelId: 'level-5',
    name: 'Level 4 — Corridor Sprint',
    description: 'Speed vs. Precision trade-off through three 2.9 m vertical gates where overshoot causes immediate collision while sluggish gains lose time.',
    objective: 'Thread all three corridor gates cleanly and stabilize inside the exit zone for 1.5 seconds.',
    newChallenge: 'Tighter 2.9 m gates and crisp 3-star time demand balancing speed and zero-overshoot damping without slider zone hints.',
    whatYouLearnedBefore: 'Agile speed (L1), surgical damping (L2), and avoiding energy-wasting saturation (L3).',
    learningObjective: 'Resolve the Speed vs. Precision conflict by tuning crisp Kp paired with high Kd and low Ki.',
    flightConditions: 'Sensor pod (+0.20 kg -> 1.40 kg total), max thrust 28.0 N, 28 deg max tilt, 3 tight corridor gates.',
    missionGoal: 'Fly through all three gates with zero hits and stabilize at (20.8 m, 7.2 m) <= 0.32 m/s for 1.5 s.',
    strategyProfile: {
      focusTag: 'Speed vs. Precision',
      priorities: { speed: 2, stability: 3, precision: 3, efficiency: 1 },
      tradeoffHint: 'Too agile risks wall collisions; too sluggish misses the 3-star corridor pace. Keep Ki low here.',
      hideRecommendedZone: true
    },
    energyBudget: null,
    failOnBatteryEmpty: false,
    startPos: { x: 2.8, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.2,
    maxThrust: 28.0,
    maxTilt: 28,
    windForce: { x: 0, z: 0 },
    windGust: null,
    windLabel: 'Calm Air (0.0 N)',
    requiresIntegral: false,
    initialPID: { kp: 0, ki: 0, kd: 0 },
    recommendedPID: {
      kpMin: 5.0,
      kpMax: 7.8,
      kiMin: 0.0,
      kiMax: 1.0,
      kdMin: 3.8,
      kdMax: 6.4,
      minDampingRatio: 0.68,
      maxKpToKdRatio: 2.0
    },
    targetTolerance: 1.0,
    velocityTolerance: 0.32,
    windMode: 'calm',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    obstacles: [
      { x: 7.2, z: 0.0, width: 1.1, height: 5.4 },
      { x: 7.2, z: 8.3, width: 1.1, height: 5.7 },
      { x: 12.2, z: 0.0, width: 1.1, height: 3.1 },
      { x: 12.2, z: 6.0, width: 1.1, height: 8.0 },
      { x: 16.8, z: 0.0, width: 1.1, height: 5.9 },
      { x: 16.8, z: 8.8, width: 1.1, height: 5.2 }
    ],
    targetZone: {
      x: 20.8,
      z: 7.2,
      radius: 1.0,
      holdRequired: 1.5,
      maxSpeed: 0.32
    },
    timeLimit: 80,
    briefing: 'Zero-margin corridor! Favor well-damped Kd and disciplined Kp so vertical steps never bounce into beams.',
    suggestedAdjustment: 'Pair moderate Kp with strong Kd damping; keep Ki low or zero here to avoid cruise windup overshoot.'
  },

  'level-5': {
    id: 'level-5',
    mode: 'challenge',
    nextLevelId: 'level-6',
    name: 'Level 5 — Storm Hold',
    description: 'Sustained +3.8 N crosswind plus periodic gusts on a 2800 J battery. Balance integral wind rejection against gust oscillation and energy drain.',
    objective: 'Clear the barrier and hold steady inside the 1.0 m zone for 2.5 seconds under gusts before battery runs out.',
    newChallenge: 'Crosswind + gusts + 2800 J battery! Weak Ki drifts off target, while excessive Ki/Kp winds up during gusts and burns energy.',
    whatYouLearnedBefore: 'Speed (L1), Precision (L2), Eco battery budgeting (L3), and corridor trade-offs (L4).',
    learningObjective: 'Use a Wind-Lock strategy: steady Ki disturbance rejection paired with strong Kd so gusts do not drain battery.',
    flightConditions: '1.40 kg total mass, +3.8 N wind + gusts (+6.8 N / -1.3 N), 2800 J battery budget.',
    missionGoal: 'Cross the barrier and stabilize inside (19.0 m, 7.5 m) <= 0.35 m/s for 2.5 s with >= 30% battery for 3★.',
    strategyProfile: {
      focusTag: 'Wind Stability',
      priorities: { speed: 1, stability: 3, precision: 3, efficiency: 2 },
      tradeoffHint: 'Strong Ki cancels crosswind drift, while high Kd absorbs gusts without draining the 2800 J battery.',
      hideRecommendedZone: true
    },
    energyBudget: 2800,
    failOnBatteryEmpty: true,
    startPos: { x: 3.2, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.2,
    maxThrust: 28.0,
    maxTilt: 32,
    windForce: { x: 3.8, z: 0 },
    windGust: { xAmp: 3.0, zAmp: -1.3, period: 6.5, duration: 2.2, phaseOffset: 2.8 },
    windLabel: '+3.8 N Crosswind + Repeatable Gusts (+6.8 N / -1.3 N)',
    requiresIntegral: true,
    initialPID: { kp: 0, ki: 0, kd: 0 },
    recommendedPID: {
      kpMin: 5.5,
      kpMax: 8.6,
      kiMin: 1.2,
      kiMax: 2.5,
      kdMin: 3.8,
      kdMax: 6.2,
      minDampingRatio: 0.6,
      maxKpToKdRatio: 2.2
    },
    targetTolerance: 0.82,
    velocityTolerance: 0.35,
    windMode: 'scene_wind',
    allowWindSelect: false,
    outOfBoundsMargin: 0.7,
    obstacles: [
      { x: 11.0, z: 0.0, width: 1.2, height: 4.8 }
    ],
    targetZone: {
      x: 19.0,
      z: 7.5,
      radius: 0.82,
      holdRequired: 2.5,
      maxSpeed: 0.35
    },
    timeLimit: 85,
    briefing: 'Ki is essential here to eliminate crosswind drift, but excessive Ki winds up during flight and overshoots the target.',
    suggestedAdjustment: 'Set Ki cleanly in the middle disturbance-rejection range alongside balanced Kp and solid Kd damping.'
  },

  'level-6': {
    id: 'level-6',
    mode: 'challenge',
    nextLevelId: null,
    name: 'Level 6 — Final Rescue',
    description: 'Full 4-way trade-off exam combining rescue payload, obstacles, sequential rings, wind gusts, narrow helipad, and a 4400 J battery.',
    objective: 'Pass both rescue rings in order under gusty wind and land softly (<= 1.6 m/s) before battery or time runs out.',
    newChallenge: 'All 4 strategy dimensions compete: Speed, Stability, Precision, and Energy (4400 J battery) with zero slider hints.',
    whatYouLearnedBefore: 'Agile speed (L1), Precision braking (L2), Eco cargo (L3), Corridor precision (L4), and Wind-Lock (L5).',
    learningObjective: 'Synthesize a custom Pareto-balanced PID strategy satisfying competing speed, stability, precision, and battery budgets.',
    flightConditions: '1.75 kg rescue load, 27.5 N max thrust, 4400 J battery, +2.6 N wind + gusts, 2 rings, narrow helipad.',
    missionGoal: 'Clear Ring #1 → Ring #2 and land softly on (19.5 m, 1.6 m) for 1.5 s with >= 28% battery for 3★.',
    strategyProfile: {
      focusTag: 'Full 4-Way Trade-off',
      priorities: { speed: 2, stability: 3, precision: 3, efficiency: 3 },
      tradeoffHint: 'Pure Agile crashes on landing; pure Precision runs out of battery. Synthesize balanced Kp, steady Ki, and firm Kd.',
      hideRecommendedZone: true
    },
    energyBudget: 4400,
    failOnBatteryEmpty: true,
    startPos: { x: 2.6, z: 0.0 },
    droneMass: 1.2,
    payloadMass: 0.55,
    maxThrust: 27.5,
    maxTilt: 30,
    windForce: { x: 2.6, z: 0 },
    windGust: { xAmp: 2.4, zAmp: -1.0, period: 7.0, duration: 2.2, phaseOffset: 3.0 },
    windLabel: '+2.6 N Crosswind + Gusts (+5.0 N / -1.0 N)',
    requiresIntegral: true,
    initialPID: { kp: 0, ki: 0, kd: 0 },
    recommendedPID: {
      kpMin: 5.6,
      kpMax: 8.4,
      kiMin: 1.0,
      kiMax: 2.2,
      kdMin: 4.0,
      kdMax: 6.0,
      minDampingRatio: 0.62,
      maxKpToKdRatio: 2.15
    },
    targetTolerance: 1.0,
    velocityTolerance: 1.6,
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
      halfWidth: 1.0,
      maxTouchdownSpeed: 1.6,
      holdRequired: 1.5
    },
    targetZone: null,
    timeLimit: 90,
    briefing: 'Final Rescue! Balance Kp for ring tracking, Ki for payload + wind trim, and Kd for zero-bounce soft landing.',
    suggestedAdjustment: 'Avoid extremes: pair solid Kd damping with moderate Kp and steady Ki to hold altitude through rings and land gently.'
  }
};

export function getSceneById(id) {
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
      return 'Pilot, Kp is very low—raise Kp toward 6.5 so thrust can lift off and follow REF!';
    }
    if (drone.onGround && reference.z <= 0.1) {
      return 'Welcome in the cockpit, pilot! Press W/S/A/D to steer yellow REF, and watch your Completion Time & Route Fit!';
    }
    return `Pilot, thrust is ${drone.thrust.toFixed(1)} N (hover ~11.8 N). Keep REF near Z = ${targetZone.z.toFixed(1)} m for high Route Fit!`;
  }

  if (scene.id === 'tutorial-2') {
    if (gains.kp < 2.2) {
      return `I see a ${Math.abs(errX).toFixed(2)} m tracking lag! Increase Kp toward 5.5–7.5 to speed up response and improve Route Fit.`;
    }
    if (gains.kp > 13.0) {
      return 'Whoa, pilot—Kp is very aggressive! Watch your Overshoot metric; try 6.0–8.0 for crisp control.';
    }
    return `Nice Kp (${gains.kp.toFixed(1)})! Use A/D to steer REF (${distToTarget.toFixed(1)} m left) and keep Tracking Lag small.`;
  }

  if (scene.id === 'tutorial-3') {
    if (gains.ki < 0.25 && Math.abs(errX) > 0.25) {
      return `I measure a ${Math.abs(errX).toFixed(2)} m steady-state offset from wind (I = ${lastPid.x.iTerm.toFixed(1)}). Raise Ki toward 1.2–1.8!`;
    }
    if (gains.ki > 4.2) {
      return 'Careful, pilot—Ki is very high, risking Integral Windup and Overshoot! Try 1.2–1.8.';
    }
    return `My integral term I_x = ${lastPid.x.iTerm.toFixed(2)} is canceling the +4.8 N wind. Keep Steady-State Offset near zero!`;
  }

  if (scene.id === 'tutorial-4') {
    if (gains.kd < 1.5) {
      return 'Low damping (Kd)! Expect extra Overshoot, Oscillation, and slow Settling Time—raise Kd to 3.6–4.5.';
    }
    if (gains.kd > 10.5) {
      return 'Kd is very high, slowing Response Speed and adding Completion Time. Try 3.5–5.0.';
    }
    return `Great damping (Kd = ${gains.kd.toFixed(1)})! Fly smoothly in and release WASD for high Stability and fast Settling Time.`;
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
    !(sim.failOnBatteryEmpty && sim.batteryDepleted) &&
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

  if (sim.failOnBatteryEmpty && sim.batteryDepleted) {
    return {
      status: 'failed',
      reason: 'battery_depleted',
      title: 'Mission Failed — Battery Depleted',
      message: `Battery exhausted (${Math.round(sim.energyUsed)} / ${Math.round(sim.energyBudget)} J) before mission completion. High thrust spikes, oscillation, or slow hovering drain power rapidly.`,
      suggestedAdjustment:
        scene.suggestedAdjustment ||
        'Use smoother moderate Kp, steady Ki trim, and firm Kd damping to cut power spikes and finish with battery to spare.'
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
