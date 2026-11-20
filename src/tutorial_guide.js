/**
 * Config-driven interactive Tutorial Guide Engine & PIP Intro Script
 * (pure JS, no DOM dependency).
 *
 * Implements concise, visual-first guidance across Tutorial Village:
 * - PIP Intro: 3 short greeting slides shown on first entry (re-playable anytime)
 * - Tutorial 1: Full 10-step interface + PID + WASD + Results walkthrough
 * - Tutorial 2: Medium guidance (Kp response curve + live tuning)
 * - Tutorial 3: Light guidance (Ki steady-state drift correction)
 * - Tutorial 4: Minimal autonomous guidance (Kd damping & smooth stopping)
 */

export const PIP_INTRO_SCRIPT = Object.freeze([
  {
    id: 'intro-1',
    mood: 'greeting',
    badge: 'Greeting',
    text: "Hi, pilot! I'm PIP, your flight coach!"
  },
  {
    id: 'intro-2',
    mood: 'explaining',
    badge: 'Explaining',
    text: "I'll help you tune your PID controller and master your drone."
  },
  {
    id: 'intro-3',
    mood: 'celebrating',
    badge: 'Ready!',
    text: "Let's learn, test, and fly!"
  }
]);

export const TUTORIAL_GUIDE_FLOWS = {
  'tutorial-1': [
    {
      stepId: 't1-briefing',
      view: 'preflight',
      targetSelector: '#mission-briefing-panel',
      pipMood: 'explaining',
      visualId: null,
      title: 'Step 1 — Mission Briefing',
      headline: 'Read Your Mission Goal',
      instruction: 'Check Mission Objective and Success Requirements before takeoff.',
      actionHint: 'Review the highlighted card, then click Next Step.',
      learnMore:
        'Mission Briefing summarizes target coordinates, hold duration, speed limits, and what changed from previous lessons.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-specs',
      view: 'preflight',
      targetSelector: '#drone-specs-panel',
      pipMood: 'explaining',
      visualId: 'gravity-thrust',
      title: 'Step 2 — Drone Specifications',
      headline: 'Check Mass, Thrust & Wind',
      instruction: 'Inspect Mass, Max Thrust, and Wind—they set lift and drift.',
      actionHint: 'Compare Thrust (28.0 N) vs. weight (11.8 N), then click Next Step.',
      learnMore:
        'Heavier mass slows acceleration under equal force. Rotor thrust must exceed weight (m × 9.81 N) to climb.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-pid-panel',
      view: 'preflight',
      targetSelector: '#preflight-pid-panel',
      pipMood: 'explaining',
      visualId: 'pid-loop-steps',
      title: 'Step 3 — PID Tuning Panel',
      headline: 'Learn the Tuning Loop',
      instruction: 'Tune PID gains here, fly with WASD, check results, and refine.',
      actionHint: 'Look over the 5-step tuning loop, then click Next Step.',
      learnMore:
        'Your sliders set Kp, Ki, and Kd gains used by both horizontal (X) and vertical (Z) PID controllers.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-pid-sliders',
      view: 'preflight',
      targetSelector: '#preflight-sliders-wrap',
      pipMood: 'thinking',
      visualId: 'kp-response',
      title: 'Step 4 — Kp, Ki and Kd',
      headline: 'Try Adjusting a Slider',
      instruction: 'Drag Kp, Ki, or Kd slightly to test controller tuning.',
      actionHint: 'Move any slider now (keep Kp >= 4.0 for easy climb).',
      learnMore:
        'Kp controls how strongly your drone reacts to position errors. Ki removes steady offset, and Kd adds braking damping.',
      requiredAction: 'adjust_pid'
    },
    {
      stepId: 't1-pip-assistant',
      view: 'preflight',
      targetSelector: '#pip-coach-card',
      pipMood: 'explaining',
      visualId: null,
      title: 'Step 5 — PIP Assistant',
      headline: 'Read PIP Risk Feedback',
      instruction: 'Watch PIP here for risky gain alerts and helpful tips.',
      actionHint: 'PIP guides your choices without locking controls. Click Next Step.',
      learnMore:
        'PIP checks single-gain extremes and multi-gain coupling (such as high Kp with low Kd) relative to drone mass.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 6 — Start Flight',
      headline: 'Launch Your Drone',
      instruction: 'Press Start Flight to enter the 2D arena with your gains.',
      actionHint: 'Click Start Flight now.',
      learnMore:
        'Once airborne, your active Kp, Ki, and Kd gains drive real-time thrust and tilt at 120 Hz physics.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't1-wasd',
      view: 'flight',
      targetSelector: '#flight-wasd-bar',
      pipMood: 'explaining',
      visualId: 'wasd-controls',
      title: 'Step 7 — WASD Movement',
      headline: 'Move Yellow REF With WASD',
      instruction: 'Press W, S, A, D in order, then release keys to hover.',
      actionHint: 'Follow each key prompt below.',
      learnMore:
        'WASD moves the yellow REF target, not the drone directly—the PID loop steers your drone to follow REF.',
      requiredAction: 'wasd_sequence'
    },
    {
      stepId: 't1-flight-info',
      view: 'flight',
      targetSelector: '#flight-status-strip',
      pipMood: 'thinking',
      visualId: null,
      title: 'Step 8 — Flight Information',
      headline: 'Read Live Telemetry',
      instruction: 'Watch Speed and Position—low speed at REF means steady hover.',
      actionHint: 'Check Position, Speed, and Thrust, then click Next Step.',
      learnMore:
        'Look for (SAT) near Thrust if motors hit max output, and verify Speed drops near 0.00 m/s inside target zones.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-reach-target',
      view: 'flight',
      targetSelector: '#flight-canvas',
      pipMood: 'explaining',
      visualId: 'gravity-thrust',
      title: 'Step 9 — Reach the Target',
      headline: 'Hover in the Blue Target',
      instruction: 'Climb with W into the blue zone and hold steady!',
      actionHint: 'Guide REF to (4.0 m, 7.5 m) and wait 1.5 s.',
      learnMore:
        'During steady hover on a 1.20 kg drone, thrust settles around 11.8 N to balance downward gravity.',
      requiredAction: 'reach_target'
    },
    {
      stepId: 't1-results',
      view: 'result',
      targetSelector: '#result-overview-wrap',
      pipMood: 'celebrating',
      visualId: 'pid-loop-steps',
      title: 'Step 10 — Results and Retry',
      headline: "Great job! You've completed your first flight.",
      instruction: 'Review Route Fit and metrics, then Retry or pick Next Level.',
      actionHint: 'Click Finish Guide when ready.',
      learnMore:
        'Use Pre-flight Tuning or Retry to test faster Kp or cleaner Kd damping and watch Route Fit improve.',
      requiredAction: 'acknowledge'
    }
  ],

  'tutorial-2': [
    {
      stepId: 't2-briefing',
      view: 'preflight',
      targetSelector: '#preflight-pid-panel',
      pipMood: 'thinking',
      visualId: 'kp-response',
      title: 'Proportional Gain (Kp)',
      headline: 'Test Low Kp = 1.2 First',
      instruction: 'Kp controls how strongly your drone reacts to position errors.',
      actionHint: 'Press Start Flight to feel slow lag with Kp = 1.2.',
      learnMore:
        'Low Kp produces gentle, slow tracking. Higher Kp speeds up response, though very high Kp relative to damping can cause overshoot.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't2-observe-lag',
      view: 'flight',
      targetSelector: '#flight-pid-panel',
      pipMood: 'explaining',
      visualId: 'kp-response',
      title: 'Observe Lag & Raise Kp',
      headline: 'Fly Right, Then Raise Kp',
      instruction: 'Hold D to spot lag, then drag Kp up (>= 4.5).',
      actionHint: 'Tap D, then raise Kp into the Recommended zone.',
      learnMore:
        'Notice how larger Kp multiplies horizontal error into a sharper pitch angle and faster acceleration.',
      requiredAction: 'tune_kp_above_4_5'
    },
    {
      stepId: 't2-complete',
      view: 'flight',
      targetSelector: '#flight-canvas',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Hold Inside Target',
      headline: 'Finish Proportional Control',
      instruction: 'Guide REF into the right target zone and hold steady.',
      actionHint: 'Hold inside (18.0 m, 5.5 m) for 2.0 s.',
      learnMore:
        'Balanced Kp reaches the zone quickly without overshooting past its boundary.',
      requiredAction: 'reach_target'
    }
  ],

  'tutorial-3': [
    {
      stepId: 't3-wind',
      view: 'preflight',
      targetSelector: '#drone-specs-panel',
      pipMood: 'thinking',
      visualId: 'ki-integral',
      title: 'Integral Gain (Ki)',
      headline: 'Spot the +4.8 N Crosswind',
      instruction: 'Steady wind causes persistent error when Ki is zero.',
      actionHint: 'Press Start Flight to observe wind drift first.',
      learnMore:
        'P control alone needs a remaining error to keep leaning against steady wind. Ki sums error over time until offset drops to zero.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't3-tune-ki',
      view: 'flight',
      targetSelector: '#flight-pid-panel',
      pipMood: 'explaining',
      visualId: 'ki-integral',
      title: 'Cancel Drift With Ki',
      headline: 'Raise Ki to Center Drone',
      instruction: 'Raise Ki (>= 0.80) so integral action fights the crosswind.',
      actionHint: 'Tune Ki smoothly and hold inside (16.0 m, 5.5 m).',
      learnMore:
        'Avoid excessive Ki—too much integral windup builds up during travel and causes overshoot past the target.',
      requiredAction: 'reach_target'
    }
  ],

  'tutorial-4': [
    {
      stepId: 't4-autonomous',
      view: 'preflight',
      targetSelector: '#preflight-pid-panel',
      pipMood: 'thinking',
      visualId: 'kd-damping',
      title: 'Derivative Gain (Kd)',
      headline: 'Tune Damping Before Takeoff',
      instruction: 'Try increasing Kd to reduce overshoot and improve braking.',
      actionHint: 'Adjust Kd from 0.4 as needed, then press Start Flight.',
      learnMore:
        'Kd opposes velocity (D = -Kd × v) like an aerodynamic brake. Too little Kd bounces; too much Kd slows motion.',
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
