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
      targetSelector: '#mission-playground-panel',
      pipMood: 'greeting',
      visualId: 'gravity-thrust',
      title: 'Step 1 — Meet Your Mission',
      headline: 'Spot the Blue Target',
      instruction: 'Fly into the blue zone and hold steady.',
      actionHint: 'Look at the drone and blue target, then click Next Step.',
      learnMore:
        'Your drone starts on the launch pad. Rotor thrust must beat downward gravity (m × 9.81 N) to climb into the blue zone.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-knobs-intro',
      view: 'preflight',
      targetSelector: '#preflight-knobs-wrap',
      pipMood: 'explaining',
      visualId: 'pid-loop-steps',
      title: 'Step 2 — Three PID Knobs',
      headline: 'Meet Kp, Ki and Kd',
      instruction: 'Each knob shapes how your drone reacts.',
      actionHint: 'Tap any knob icon to preview its role, then click Next Step.',
      learnMore:
        'Kp controls response strength, Ki corrects persistent drift, and Kd adds smooth braking damping. All three work together.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-adjust-knob',
      view: 'preflight',
      targetSelector: '#preflight-knobs-wrap',
      pipMood: 'thinking',
      visualId: 'kp-response',
      title: 'Step 3 — Tune a Knob',
      headline: 'Try Adjusting Kp',
      instruction: 'Drag a knob or click + to change a gain.',
      actionHint: 'Adjust Kp, Ki, or Kd using the knob, +/-, or number box.',
      learnMore:
        'Changing Kp alters how strongly the controller pushes toward REF. Keep Kp >= 4.0 so the drone can lift off briskly.',
      requiredAction: 'adjust_pid'
    },
    {
      stepId: 't1-test-pid',
      view: 'preflight',
      targetSelector: '#btn-test-pid',
      pipMood: 'explaining',
      visualId: null,
      title: 'Step 4 — Run Test PID',
      headline: 'Test Before Takeoff',
      instruction: 'Click Test PID to run a real response test.',
      actionHint: 'Click Test PID now.',
      learnMore:
        'Test PID runs the exact same 120 Hz drone physics and PID loop for 6.5 seconds so you can inspect response safely before flying.',
      requiredAction: 'run_test_pid'
    },
    {
      stepId: 't1-observe-bench',
      view: 'preflight',
      targetSelector: '#test-bench-panel',
      pipMood: 'thinking',
      visualId: null,
      title: 'Step 5 — Read the Curve',
      headline: 'Target vs. Actual Flight',
      instruction: 'Compare the cyan drone line to the yellow target.',
      actionHint: 'Check Overshoot, Settling, and Error, then click Next Step.',
      learnMore:
        'The dashed yellow line is your Target height, and the cyan curve is the actual drone position from real physics.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-retest-pid',
      view: 'preflight',
      targetSelector: '#preflight-knobs-wrap',
      pipMood: 'explaining',
      visualId: 'kd-damping',
      title: 'Step 6 — Compare Before & After',
      headline: 'Tweak & Test Again',
      instruction: 'Change a knob and click Test PID to compare.',
      actionHint: 'Change one knob and click Test PID (or click Next Step).',
      learnMore:
        'The Test Bench overlays your Previous curve (purple dashed) with your Current curve (cyan) under identical conditions.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 7 — Start Flight',
      headline: 'Launch Your Drone',
      instruction: 'Press Start Flight to enter the arena.',
      actionHint: 'Click Start Flight now.',
      learnMore:
        'Once airborne, your exact Kp, Ki, and Kd settings drive live thrust and pitch at 120 Hz.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't1-wasd',
      view: 'flight',
      targetSelector: '#flight-wasd-bar',
      pipMood: 'greeting',
      visualId: 'wasd-controls',
      title: 'Step 8 — Fly With WASD',
      headline: 'Guide the Ghost Drone',
      instruction: 'Press W, S, A, D to steer Ghost REF.',
      actionHint: 'Tap W, S, A, D, then release to hold.',
      learnMore:
        "I'm PIP! WASD moves the translucent Ghost Drone (REF), and the PID controller chases it while I measure Completion Time & Route Fit.",
      requiredAction: 'wasd_sequence'
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
      headline: 'Review Your Flight',
      instruction: 'Review your stars and telemetry, then tune again!',
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
      actionHint: 'Try Test PID at low Kp, tune Kp up, then Start Flight.',
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
      actionHint: 'Move Kp >= 4.5.',
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
      targetSelector: '#test-bench-panel',
      pipMood: 'thinking',
      visualId: 'ki-integral',
      title: 'Metric Focus: Steady-State Offset',
      headline: 'Pilot, Today I Measure Steady-State Offset!',
      instruction: 'Ki helps correct persistent wind drift.',
      actionHint: 'Click Test PID to see wind drift, raise Ki, then Start Flight.',
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
      actionHint: 'Experiment with Kd on Test PID, then press Start Flight.',
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
    this.benchTestCount = 0;
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
      case 'run_test_pid':
        return this.benchTestCount >= 1;
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

  recordBenchTest() {
    if (!this.active) return false;
    this.benchTestCount += 1;
    const step = this.getCurrentStep();
    if (step?.requiredAction === 'run_test_pid') {
      return this.goNext();
    }
    if (step?.stepId === 't1-retest-pid' && this.benchTestCount >= 2) {
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
