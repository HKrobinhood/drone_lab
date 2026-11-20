/**
 * Level catalog for Tutorial Village and Challenge Levels.
 * Flight scene geometry and physics parameters are attached in M1-M3.
 */

export const TUTORIAL_LEVELS = [
  {
    id: 'tutorial-1',
    mode: 'tutorial',
    order: 1,
    name: 'Tutorial 1 — Take Off',
    difficulty: 'Beginner',
    learningFocus: 'Gravity and Thrust',
    summary: 'Learn W/S vertical reference control and why a drone needs thrust to overcome gravity.',
    milestone: 'M2'
  },
  {
    id: 'tutorial-2',
    mode: 'tutorial',
    order: 2,
    name: 'Tutorial 2 — Proportional Control',
    difficulty: 'Beginner',
    learningFocus: 'Proportional Gain (Kp)',
    summary: 'Use A/D horizontal control and compare slow vs. aggressive Kp responses.',
    milestone: 'M2'
  },
  {
    id: 'tutorial-3',
    mode: 'tutorial',
    order: 3,
    name: 'Tutorial 3 — Integral Control',
    difficulty: 'Easy',
    learningFocus: 'Integral Gain (Ki)',
    summary: 'Eliminate steady-state error under constant disturbance and observe integral windup.',
    milestone: 'M2'
  },
  {
    id: 'tutorial-4',
    mode: 'tutorial',
    order: 4,
    name: 'Tutorial 4 — Derivative Control',
    difficulty: 'Easy',
    learningFocus: 'Derivative Gain (Kd)',
    summary: 'Brake smoothly inside a target zone by tuning damping to suppress overshoot and oscillation.',
    milestone: 'M2'
  }
];

export const CHALLENGE_LEVELS = [
  {
    id: 'level-1',
    mode: 'challenge',
    order: 1,
    name: 'Level 1 — Stable Hover',
    difficulty: 'Easy',
    learningFocus: 'Takeoff & 3s Hover Stability',
    summary: 'Take off, enter the aerial target zone, and maintain a steady hover for 3 seconds.',
    milestone: 'M3'
  },
  {
    id: 'level-2',
    mode: 'challenge',
    order: 2,
    name: 'Level 2 — Precision Landing',
    difficulty: 'Easy',
    learningFocus: 'Controlled Descent & Soft Touchdown',
    summary: 'Pilot the drone onto a compact landing pad without exceeding touchdown speed limits.',
    milestone: 'M3'
  },
  {
    id: 'level-3',
    mode: 'challenge',
    order: 3,
    name: 'Level 3 — Heavy Cargo',
    difficulty: 'Intermediate',
    learningFocus: 'Thrust-to-Weight Ratio & Saturation',
    summary: 'Carry a heavy payload under fixed maximum thrust and manage control saturation.',
    milestone: 'M3.1'
  },
  {
    id: 'level-4',
    mode: 'challenge',
    order: 4,
    name: 'Level 4 — Narrow Corridor',
    difficulty: 'Intermediate',
    learningFocus: 'Low-Overshoot Precision Maneuvering',
    summary: 'Navigate a tight obstacle corridor where overshoot and oscillation risk collision.',
    milestone: 'M3'
  },
  {
    id: 'level-5',
    mode: 'challenge',
    order: 5,
    name: 'Level 5 — Wind Challenge',
    difficulty: 'Advanced',
    learningFocus: 'Disturbance Rejection & Ki Tuning',
    summary: 'Reach the target zone under sustained crosswinds and sudden gusts.',
    milestone: 'M3'
  },
  {
    id: 'level-6',
    mode: 'challenge',
    order: 6,
    name: 'Level 6 — Final Rescue Mission',
    difficulty: 'Expert',
    learningFocus: 'Full PID Mastery',
    summary: 'Combine takeoff, obstacle avoidance, ring navigation, wind rejection, and precision landing.',
    milestone: 'M3'
  }
];

export function getLevelsByMode(mode) {
  return mode === 'tutorial' ? TUTORIAL_LEVELS : CHALLENGE_LEVELS;
}

export function getAllLevels() {
  return [...TUTORIAL_LEVELS, ...CHALLENGE_LEVELS];
}
