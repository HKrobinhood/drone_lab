/**
 * Config-driven interactive Tutorial Guide Engine (pure JS, no DOM dependency).
 *
 * Implements progressive guidance across Tutorial Village:
 * - Tutorial 1: Full 10-step interface + PID + WASD + Results walkthrough
 * - Tutorial 2: Medium guidance (observe low Kp lag -> tune Kp -> reach target)
 * - Tutorial 3: Light guidance (inspect crosswind -> tune Ki -> reach target)
 * - Tutorial 4: Minimal autonomous guidance
 *
 * Supports Highlight -> Explain -> Player Action -> Validate -> Next Step,
 * plus stepping backward safely and replaying tutorials anytime.
 */

export const TUTORIAL_GUIDE_FLOWS = {
  'tutorial-1': [
    {
      stepId: 't1-briefing',
      view: 'preflight',
      targetSelector: '#mission-briefing-panel',
      title: 'Step 1 — Mission Briefing',
      headline: 'Read Your Mission Briefing',
      instruction:
        'This panel tells you what you need to achieve in this mission. Review the Mission Objective and Success Requirements.',
      actionHint: 'Review Mission Objective & Success Requirements, then click Next Step.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-specs',
      view: 'preflight',
      targetSelector: '#drone-specs-panel',
      title: 'Step 2 — Drone Specifications',
      headline: 'Check Drone Mass, Thrust & Wind',
      instruction:
        'These values describe your drone\'s physical capabilities. Mass, thrust and wind affect how it flies.',
      actionHint: 'Notice Drone Mass (1.20 kg), Max Thrust (28.0 N), and Wind (0.0 N). Click Next Step.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-pid-panel',
      view: 'preflight',
      targetSelector: '#preflight-pid-panel',
      title: 'Step 3 — PID Tuning Panel',
      headline: 'Meet Your Flight Controller',
      instruction:
        'This is where you tune your flight controller. Kp, Ki and Kd change how your drone responds.',
      actionHint: 'Inspect the Kp, Ki, Kd sliders and zone bars, then click Next Step.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-pid-sliders',
      view: 'preflight',
      targetSelector: '#preflight-sliders-wrap',
      title: 'Step 4 — Kp, Ki and Kd',
      headline: 'Try Adjusting a PID Slider',
      instruction:
        'Kp responds to position error, Ki corrects accumulated error, and Kd damps motion to brake smoothly. Move at least one slider now!',
      actionHint: 'Drag Kp, Ki, or Kd slightly (keep Kp >= 4.0 for easy takeoff).',
      requiredAction: 'adjust_pid'
    },
    {
      stepId: 't1-pip-assistant',
      view: 'preflight',
      targetSelector: '#pip-coach-card',
      title: 'Step 5 — PIP Assistant',
      headline: 'Meet PIP — Virtual Flight Coach',
      instruction:
        "I'll help you identify risky settings and suggest improvements. My advice is a guide, not the only correct answer.",
      actionHint: 'Read PIP\'s live feedback on your gains, then click Next Step.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      title: 'Step 6 — Start Flight',
      headline: 'Launch Your First Flight',
      instruction:
        "Once you've tuned your controller, press Start Flight to test your settings.",
      actionHint: 'Click the highlighted Start Flight button to enter the arena.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't1-wasd',
      view: 'flight',
      targetSelector: '#flight-wasd-bar',
      title: 'Step 7 — WASD Movement',
      headline: 'Practice WASD Reference Control',
      instruction:
        'Use your keyboard to move the yellow REF target! Complete W (up), S (down), A (left), D (right), then release all keys to hold steady.',
      actionHint: 'Press each key in order as prompted below.',
      requiredAction: 'wasd_sequence'
    },
    {
      stepId: 't1-flight-info',
      view: 'flight',
      targetSelector: '#flight-status-strip',
      title: 'Step 8 — Flight Information',
      headline: 'Read Live Flight Telemetry',
      instruction:
        'Monitor Position, Speed, Thrust, and Flight Time here. When Speed nears zero and Position matches Ref Target, your drone is stable.',
      actionHint: 'Check the telemetry strip values, then click Next Step.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-reach-target',
      view: 'flight',
      targetSelector: '#flight-canvas',
      title: 'Step 9 — Reach the Target',
      headline: 'Fly Into the Blue Target Zone',
      instruction:
        'Use WASD to guide REF into the blue target circle at (4.0 m, 7.5 m) and hold steady until stabilization finishes.',
      actionHint: 'Climb with W into the upper blue circle and hold steady!',
      requiredAction: 'reach_target'
    },
    {
      stepId: 't1-results',
      view: 'result',
      targetSelector: '#result-overview-wrap',
      title: 'Step 10 — Results and Retry',
      headline: 'Great job! You\'ve completed your first flight.',
      instruction:
        'Review your Flight Statistics, Route Fit plot, and PIP Debrief. Use Retry to test new PID tuning or Next Level to continue.',
      actionHint: 'Explore your results, then click Finish Guide or Next Level.',
      requiredAction: 'acknowledge'
    }
  ],

  'tutorial-2': [
    {
      stepId: 't2-briefing',
      view: 'preflight',
      targetSelector: '#preflight-pid-panel',
      title: 'Proportional Gain (Kp) Setup',
      headline: 'Inspect Starting Low Kp = 1.2',
      instruction:
        'Kp starts intentionally low (1.2). Press Start Flight first to feel slow horizontal tracking, or raise Kp in flight.',
      actionHint: 'Click Start Flight to test Kp = 1.2 in the air.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't2-observe-lag',
      view: 'flight',
      targetSelector: '#flight-pid-panel',
      title: 'Observe Lag & Raise Kp',
      headline: 'Feel Low Kp Lag, Then Tune Up',
      instruction:
        'Hold D to fly right and watch Position lag behind REF. Then raise the Kp slider (>= 4.5) to feel crisp acceleration!',
      actionHint: 'Fly right with D and raise Kp to >= 4.5.',
      requiredAction: 'tune_kp_above_4_5'
    },
    {
      stepId: 't2-complete',
      view: 'flight',
      targetSelector: '#flight-canvas',
      title: 'Stabilize in Target Zone',
      headline: 'Complete Proportional Control',
      instruction:
        'Guide REF to (18.0 m, 5.5 m) with your tuned Kp and hold steady for 2.0 s.',
      actionHint: 'Align with the blue target circle and hold steady.',
      requiredAction: 'reach_target'
    }
  ],

  'tutorial-3': [
    {
      stepId: 't3-wind',
      view: 'preflight',
      targetSelector: '#drone-specs-panel',
      title: 'Crosswind Briefing',
      headline: 'Spot the +4.8 N Crosswind',
      instruction:
        'Notice the +4.8 N steady crosswind in Drone Specifications while Ki starts at 0.00. Launch to see steady-state wind error.',
      actionHint: 'Click Start Flight to test flight with Ki = 0.00.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't3-tune-ki',
      view: 'flight',
      targetSelector: '#flight-pid-panel',
      title: 'Eliminate Drift With Ki',
      headline: 'Add Integral Action (Ki)',
      instruction:
        'Watch the wind push your drone away from REF, then raise Ki (>= 0.80) and center inside (16.0 m, 5.5 m).',
      actionHint: 'Raise Ki to eliminate steady-state error and hold in the target.',
      requiredAction: 'reach_target'
    }
  ],

  'tutorial-4': [
    {
      stepId: 't4-autonomous',
      view: 'preflight',
      targetSelector: '#preflight-pid-panel',
      title: 'Autonomous Damping Practice',
      headline: 'Tune Kd Yourself Before or During Flight',
      instruction:
        'Guidance fades out here so you can prepare for Challenge Levels. Notice Kd starts low (0.4)—tune damping and press Start Flight.',
      actionHint: 'Tune Kd as needed and press Start Flight whenever ready.',
      requiredAction: 'start_flight'
    }
  ]
};

const WASD_SUBSTEPS = [
  { key: 'w', label: 'W', prompt: 'Press and hold W to climb upward.' },
  { key: 's', label: 'S', prompt: 'Press and hold S to descend gently.' },
  { key: 'a', label: 'A', prompt: 'Press and hold A to move REF left.' },
  { key: 'd', label: 'D', prompt: 'Press and hold D to move REF right.' },
  { key: 'release', label: 'Hold', prompt: 'Release all WASD keys to slow down and hold position.' }
];

export class TutorialGuideEngine {
  constructor() {
    this.resetState();
  }

  resetState() {
    this.active = false;
    this.dismissed = false;
    this.finished = false;
    this.sceneId = null;
    this.steps = [];
    this.stepIndex = 0;
    this.pidAdjusted = false;
    this.initialGainsAtStep = null;
    this.flightStarted = false;
    this.wasdSubIndex = 0;
    this.wasdDone = { w: false, s: false, a: false, d: false, release: false };
    this.wasdHoldSamples = 0;
    this.targetReached = false;
    this.kpObservedLag = false;
  }

  start(scene) {
    this.resetState();
    if (!scene || scene.mode !== 'tutorial') return;
    const flow = TUTORIAL_GUIDE_FLOWS[scene.id];
    if (!flow || flow.length === 0) return;

    this.active = true;
    this.sceneId = scene.id;
    this.steps = flow;
    this.stepIndex = 0;
  }

  reopen() {
    if (!this.sceneId || this.steps.length === 0) return;
    this.dismissed = false;
    this.active = true;
    this.finished = false;
  }

  dismiss() {
    this.dismissed = true;
  }

  isRunningForView(viewName) {
    if (!this.active || this.dismissed || this.finished) return false;
    const step = this.getCurrentStep();
    return Boolean(step && step.view === viewName);
  }

  getCurrentStep() {
    if (!this.active || this.stepIndex < 0 || this.stepIndex >= this.steps.length) {
      return null;
    }
    const base = this.steps[this.stepIndex];
    if (base.requiredAction === 'wasd_sequence') {
      const sub = WASD_SUBSTEPS[Math.min(this.wasdSubIndex, WASD_SUBSTEPS.length - 1)];
      return {
        ...base,
        wasdSubIndex: this.wasdSubIndex,
        wasdSubsteps: WASD_SUBSTEPS,
        wasdDone: { ...this.wasdDone },
        activeSubPrompt: sub.prompt
      };
    }
    return base;
  }

  getProgressInfo() {
    return {
      current: this.stepIndex + 1,
      total: this.steps.length,
      canBack: this.canGoBack(),
      canNext: this.canGoNext(),
      finished: this.finished
    };
  }

  isStepSatisfied(step = this.getCurrentStep()) {
    if (!step) return false;
    switch (step.requiredAction) {
      case 'acknowledge':
        return true;
      case 'adjust_pid':
        return this.pidAdjusted;
      case 'start_flight':
        return this.flightStarted;
      case 'wasd_sequence':
        return this.wasdDone.release;
      case 'tune_kp_above_4_5':
        return this.pidAdjusted;
      case 'reach_target':
        return this.targetReached;
      default:
        return true;
    }
  }

  canGoBack() {
    if (!this.active || this.stepIndex <= 0) return false;
    const prev = this.steps[this.stepIndex - 1];
    const curr = this.steps[this.stepIndex];
    // Allow going back within the same view so players are never blocked across screen transitions
    return prev.view === curr.view;
  }

  canGoNext() {
    if (!this.active) return false;
    const step = this.getCurrentStep();
    if (!step) return false;
    return this.isStepSatisfied(step);
  }

  goBack() {
    if (!this.canGoBack()) return false;
    this.stepIndex -= 1;
    return true;
  }

  goNext() {
    if (!this.canGoNext()) return false;
    if (this.stepIndex >= this.steps.length - 1) {
      this.finished = true;
      this.active = false;
      return true;
    }
    this.stepIndex += 1;
    return true;
  }

  jumpToView(viewName) {
    if (!this.active || this.steps.length === 0) return;
    const curr = this.getCurrentStep();
    if (curr && curr.view === viewName) return;
    const targetIdx = this.steps.findIndex((s, idx) => idx >= this.stepIndex && s.view === viewName);
    if (targetIdx !== -1) {
      this.stepIndex = targetIdx;
    } else {
      const anyIdx = this.steps.findIndex((s) => s.view === viewName);
      if (anyIdx !== -1) this.stepIndex = anyIdx;
    }
  }

  recordPidAdjustment(gains, baselineGains = null) {
    if (!this.active) return false;
    if (baselineGains && gains) {
      const changed =
        Math.abs(gains.kp - baselineGains.kp) >= 0.05 ||
        Math.abs(gains.ki - baselineGains.ki) >= 0.02 ||
        Math.abs(gains.kd - baselineGains.kd) >= 0.05;
      if (!changed) return false;
    }
    this.pidAdjusted = true;
    const step = this.getCurrentStep();
    if (step?.requiredAction === 'adjust_pid') {
      return this.goNext();
    }
    if (step?.requiredAction === 'tune_kp_above_4_5' && Number(gains?.kp) >= 4.5) {
      return this.goNext();
    }
    return false;
  }

  recordFlightStarted() {
    if (!this.active) return false;
    this.flightStarted = true;
    const step = this.getCurrentStep();
    if (step?.requiredAction === 'start_flight') {
      return this.goNext();
    }
    return false;
  }

  /**
   * Real keyboard input + physical telemetry evaluator (no fake state bypassing).
   */
  evaluateTelemetry(sim, axes, outcome, currentView) {
    if (!this.active || this.dismissed || !sim) return false;
    const step = this.getCurrentStep();
    if (!step || step.view !== currentView) return false;

    let changed = false;

    if (step.requiredAction === 'wasd_sequence') {
      const mx = Number(axes?.moveX || 0);
      const mz = Number(axes?.moveZ || 0);
      const sub = WASD_SUBSTEPS[this.wasdSubIndex]?.key;

      if (sub === 'w' && mz > 0 && sim.reference.z > sim.startPos.z + 0.15) {
        this.wasdDone.w = true;
        this.wasdSubIndex = 1;
        changed = true;
      } else if (sub === 's' && mz < 0) {
        this.wasdDone.s = true;
        this.wasdSubIndex = 2;
        changed = true;
      } else if (sub === 'a' && mx < 0) {
        this.wasdDone.a = true;
        this.wasdSubIndex = 3;
        changed = true;
      } else if (sub === 'd' && mx > 0) {
        this.wasdDone.d = true;
        this.wasdSubIndex = 4;
        this.wasdHoldSamples = 0;
        changed = true;
      } else if (sub === 'release') {
        if (mx === 0 && mz === 0) {
          this.wasdHoldSamples += 1;
          const speed = Math.hypot(sim.drone.vx, sim.drone.vz);
          if (this.wasdHoldSamples >= 12 || speed <= 0.65) {
            this.wasdDone.release = true;
            this.goNext();
            changed = true;
          }
        } else {
          this.wasdHoldSamples = 0;
        }
      }
    } else if (step.requiredAction === 'tune_kp_above_4_5') {
      if (sim.gains.kp >= 4.5 && (this.kpObservedLag || Math.abs(sim.reference.x - sim.startPos.x) > 0.3)) {
        this.pidAdjusted = true;
        this.goNext();
        changed = true;
      } else if (Math.abs(sim.reference.x - sim.drone.x) > 0.25) {
        this.kpObservedLag = true;
      }
    } else if (step.requiredAction === 'reach_target') {
      if (outcome?.status === 'completed' || sim.targetZone?.stabilized) {
        this.targetReached = true;
        this.goNext();
        changed = true;
      }
    }

    return changed;
  }
}
