/**
 * Level catalog for Tutorial Village and Challenge Levels.
 * Flight scene geometry and physics parameters are attached in M1-M3.
 */

export const TUTORIAL_LEVELS = [
  {
    id: 'tutorial-1',
    mode: 'tutorial',
    order: 1,
    name: 'Tutorial 1 — Flight Control Basics',
    difficulty: 'Beginner',
    learningFocus: 'Flight UI, Gravity & Thrust',
    summary: 'Learn the game interface, tune PID sliders, practice WASD movement, and hover in the target zone.',
    milestone: 'M4.1'
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
    name: 'Level 1 — Basic Hover',
    difficulty: 'Easy',
    learningFocus: 'Proportional Gain (Kp)',
    summary: 'Take off with WASD and tune Kp to hover steadily inside a wide aerial target zone.',
    milestone: 'M3.2'
  },
  {
    id: 'level-2',
    mode: 'challenge',
    order: 2,
    name: 'Level 2 — Smooth Braking',
    difficulty: 'Easy',
    learningFocus: 'Derivative Damping (Kd)',
    summary: 'Coordinate Kp and Kd to brake smoothly and stop inside a tighter target zone.',
    milestone: 'M3.2'
  },
  {
    id: 'level-3',
    mode: 'challenge',
    order: 3,
    name: 'Level 3 — Heavy Cargo',
    difficulty: 'Intermediate',
    learningFocus: 'Mass, Thrust & Saturation',
    summary: 'Carry a heavy cargo payload under fixed maximum thrust with increased inertia and saturation risk.',
    milestone: 'M3.2'
  },
  {
    id: 'level-4',
    mode: 'challenge',
    order: 4,
    name: 'Level 4 — Precision Corridor',
    difficulty: 'Intermediate',
    learningFocus: 'Precision vs. Stability Trade-off',
    summary: 'Thread a tight obstacle corridor where overshoot and oscillation cause collisions.',
    milestone: 'M3.2'
  },
  {
    id: 'level-5',
    mode: 'challenge',
    order: 5,
    name: 'Level 5 — Wind Disturbance',
    difficulty: 'Advanced',
    learningFocus: 'Integral Control (Ki) & Gust Rejection',
    summary: 'Reject sustained crosswind and repeatable gusts while avoiding integral windup.',
    milestone: 'M3.2'
  },
  {
    id: 'level-6',
    mode: 'challenge',
    order: 6,
    name: 'Level 6 — Final Rescue',
    difficulty: 'Expert',
    learningFocus: 'Comprehensive PID Synthesis',
    summary: 'Combine heavy payload, narrow obstacles, crosswind, rings, and precision landing under time pressure.',
    milestone: 'M3.2'
  }
];

export function getLevelsByMode(mode) {
  return mode === 'tutorial' ? TUTORIAL_LEVELS : CHALLENGE_LEVELS;
}

export function getAllLevels() {
  return [...TUTORIAL_LEVELS, ...CHALLENGE_LEVELS];
}
