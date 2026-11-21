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
    name: 'Level 1 — Express Hover',
    difficulty: 'Easy',
    learningFocus: 'Speed-First Strategy (Agile Kp)',
    summary: 'Wide hover zone with a crisp 3-star speed & settling target—choose an agile Kp strategy.',
    milestone: 'M5.3'
  },
  {
    id: 'level-2',
    mode: 'challenge',
    order: 2,
    name: 'Level 2 — Surgical Braking',
    difficulty: 'Easy',
    learningFocus: 'Precision-First Strategy (High Kd)',
    summary: 'Compact target and tight stopping limit—trade top speed for near-zero overshoot damping.',
    milestone: 'M5.3'
  },
  {
    id: 'level-3',
    mode: 'challenge',
    order: 3,
    name: 'Level 3 — Eco Cargo Run',
    difficulty: 'Intermediate',
    learningFocus: 'Energy-First Strategy (3200 J Battery)',
    summary: 'Carry heavy cargo on a finite battery—avoid thrust spikes and oscillation to finish efficiently.',
    milestone: 'M5.3'
  },
  {
    id: 'level-4',
    mode: 'challenge',
    order: 4,
    name: 'Level 4 — Corridor Sprint',
    difficulty: 'Intermediate',
    learningFocus: 'Speed vs. Precision Trade-off',
    summary: 'Thread tight obstacle gates briskly without triggering oscillatory wall collisions.',
    milestone: 'M5.3'
  },
  {
    id: 'level-5',
    mode: 'challenge',
    order: 5,
    name: 'Level 5 — Storm Hold',
    difficulty: 'Advanced',
    learningFocus: 'Wind Stability vs. Energy (2800 J)',
    summary: 'Hold precision under crosswind and gusts using Wind-Lock Ki/Kd without draining battery.',
    milestone: 'M5.3'
  },
  {
    id: 'level-6',
    mode: 'challenge',
    order: 6,
    name: 'Level 6 — Final Rescue',
    difficulty: 'Expert',
    learningFocus: 'Full 4-Way Strategy Synthesis (4400 J)',
    summary: 'Balance Speed, Stability, Precision, and Battery across payload, gusts, rings, and soft landing.',
    milestone: 'M5.3'
  }
];

export function getLevelsByMode(mode) {
  return mode === 'tutorial' ? TUTORIAL_LEVELS : CHALLENGE_LEVELS;
}

export function getAllLevels() {
  return [...TUTORIAL_LEVELS, ...CHALLENGE_LEVELS];
}
