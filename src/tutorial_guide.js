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
      visualId: 'pid-loop-steps',
      title: 'Step 1 — Mission Briefing',
      headline: 'Read Your Goal',
      instruction: 'Check your mission goal and flight rules.',
      actionHint: 'Read the goal card, then click Next Step.',
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
      headline: 'Check Lift vs Gravity',
      instruction: 'Thrust must beat gravity to lift off.',
      actionHint: 'Compare 28.0 N thrust vs 11.8 N weight, then click Next Step.',
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
      instruction: 'Tune PID gains, fly, observe, and refine.',
      actionHint: 'Review the 5-step loop diagram, then click Next Step.',
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
      headline: 'Test Kp Response',
      instruction: 'Kp changes how strongly your drone reacts.',
      actionHint: 'Move the Kp slider (keep Kp >= 4.0 to climb).',
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
      headline: 'Read PIP Alerts',
      instruction: 'PIP flags risky gains before you take off.',
      actionHint: 'Check PIP status, then click Next Step.',
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
      instruction: 'Press Start Flight to enter the arena.',
      actionHint: 'Click Start Flight now.',
      learnMore:
        'Once airborne, your active Kp, Ki, and Kd gains drive real-time thrust and tilt at 120 Hz physics.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't1-wasd',
      view: 'flight',
      targetSelector: '#flight-wasd-bar',
      pipMood: 'greeting',
      visualId: 'wasd-controls',
      title: 'Step 7 — Meet WASD Controls',
      headline: 'Guide the Ghost Drone',
      instruction: 'Press W, S, A, D to steer Ghost REF.',
      actionHint: 'Tap W, S, A, D, then release to hold.',
      learnMore:
        "I'm PIP! WASD moves the translucent Ghost Drone (REF), and the PID controller chases it while I measure Completion Time & Route Fit.",
      requiredAction: 'wasd_sequence'
    },
    {
      stepId: 't1-flight-info',
      view: 'flight',
      targetSelector: '#flight-status-strip',
      pipMood: 'thinking',
      visualId: null,
      title: 'Step 8 — Live Telemetry',
      headline: 'Watch Speed & Error',
      instruction: 'Watch live response curves and status badges.',
      actionHint: 'Check Position, Speed, and Thrust, then click Next Step.',
      learnMore:
        'I track how quickly Speed settles near zero (Settling Time), motor saturation (SAT), and how closely Position matches Ref Target (Route Fit).',
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
      instruction: 'Climb with W and hover in the blue zone.',
      actionHint: 'Hold REF at (4.0 m, 7.5 m) for 1.5 s.',
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
      headline: 'Review Your Telemetry',
      instruction: 'Review my score breakdown and tune again!',
      actionHint: 'Check your metrics below, then click Finish Guide.',
      learnMore:
        'In later lessons, I will teach you every metric I grade: Tracking Lag, Steady-State Offset, Overshoot, Settling Time, and Stability.',
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
      title: 'Metric Focus: Tracking Lag & Route Fit',
      headline: 'Pilot, Today I Measure Tracking Lag!',
      instruction: 'Kp changes how strongly your drone reacts.',
      actionHint: 'Press Start Flight to feel low Kp = 1.2 lag.',
      learnMore:
        'I measure Average Tracking Error (lag behind REF) and Route Fit (% overlap with REF). Watch how raising Kp cuts lag.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't2-observe-lag',
      view: 'flight',
      targetSelector: '#flight-pid-panel',
      pipMood: 'explaining',
      visualId: 'kp-response',
      title: 'Spot Tracking Lag & Raise Kp',
      headline: 'Feel Lag, Then Boost Kp',
      instruction: 'Tap D to feel lag, then raise Kp.',
      actionHint: 'Move the Kp slider (>= 4.5).',
      learnMore:
        'Watch Position lag behind Ref Target at Kp = 1.2—raising Kp boosts acceleration, shortening Completion Time and improving Route Fit.',
      requiredAction: 'tune_kp_above_4_5'
    },
    {
      stepId: 't2-complete',
      view: 'flight',
      targetSelector: '#flight-canvas',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Hold Inside Target',
      headline: 'Lock In Your Route Fit',
      instruction: 'Fly into the right zone and hold steady.',
      actionHint: 'Hold inside (18.0 m, 5.5 m) for 2.0 s.',
      learnMore:
        'When we reach the Result Screen, I will show you your exact Average Tracking Error, Completion Time, and Route Fit score.',
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
      title: 'Metric Focus: Steady-State Offset',
      headline: 'Pilot, Today I Measure Steady-State Offset!',
      instruction: 'Ki helps correct persistent errors.',
      actionHint: 'Press Start Flight to see wind drift at Ki = 0.',
      learnMore:
        'I measure late-flight Steady-State Offset (remaining distance from REF) plus Saturation Time / Windup when Ki is pushed too high.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't3-tune-ki',
      view: 'flight',
      targetSelector: '#flight-pid-panel',
      pipMood: 'explaining',
      visualId: 'ki-integral',
      title: 'Cancel Drift With Ki',
      headline: 'Shrink Offset With Ki',
      instruction: 'Adjust Ki and observe the wind drift.',
      actionHint: 'Raise Ki (>= 0.80) and hold inside (16.0 m, 5.5 m).',
      learnMore:
        'On the Result Screen, I will check whether your Steady-State Offset dropped near zero without causing integral windup overshoot.',
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
      title: 'Metric Focus: Overshoot & Stability',
      headline: 'Pilot, Watch Overshoot, Settling & Stability!',
      instruction: 'Kd helps your drone brake smoothly.',
      actionHint: 'Try a higher Kd, then press Start Flight.',
      learnMore:
        'In this final lesson, I grade every metric you will face in Challenge Levels: Max Overshoot, Oscillation Reversals, Settling Time, Stability %, and Route Fit!',
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
