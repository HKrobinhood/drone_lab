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
      title: 'Step 1 — Inspect the Mission',
      headline: 'Spot the Blue Target',
      instruction: 'Check the drone, blue target, and flight conditions.',
      actionHint: 'See where the drone must climb, then click Next Step.',
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
      title: 'Step 2 — The PID Workflow',
      headline: 'Tune → Test Curve → Fly!',
      instruction: 'Always tune knobs, read the test wave, then fly.',
      actionHint: 'Tap any knob icon to preview Kp, Ki, Kd, then click Next Step.',
      learnMore:
        'Professional engineers rarely guess in flight: Tune PID knobs → Click Test PID → Read the response wave → Refine & compare → Start Flight.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-adjust-knob',
      view: 'preflight',
      targetSelector: '#preflight-knobs-wrap',
      pipMood: 'thinking',
      visualId: 'kp-response',
      title: 'Step 3 — Tune a PID Knob',
      headline: 'Adjust Kp First',
      instruction: 'Drag the Kp knob or click + to tune.',
      actionHint: 'Change Kp, Ki, or Kd using the knob, +/-, or number box.',
      learnMore:
        'Kp sets how strongly the controller reacts to position error. Keep Kp >= 4.0 so the drone can climb briskly.',
      requiredAction: 'adjust_pid'
    },
    {
      stepId: 't1-test-pid',
      view: 'preflight',
      targetSelector: '#btn-test-pid',
      pipMood: 'explaining',
      visualId: null,
      title: 'Step 4 — Run Test PID',
      headline: 'Generate Your First Curve',
      instruction: 'Click Test PID to plot a real response wave.',
      actionHint: 'Click Test PID now.',
      learnMore:
        'Test PID runs the exact same 120 Hz physics and PID controller for 6.5 s so you can inspect the waveform safely before takeoff.',
      requiredAction: 'run_test_pid'
    },
    {
      stepId: 't1-observe-bench',
      view: 'preflight',
      targetSelector: '#test-bench-panel',
      pipMood: 'thinking',
      visualId: null,
      title: 'Step 5 — Read the Waveform',
      headline: 'Target Line vs. Drone Wave',
      instruction: 'Check how fast the cyan wave reaches yellow target.',
      actionHint: 'Inspect Overshoot, Settling Time, and Steady Error, then click Next Step.',
      learnMore:
        'Read three things on every waveform: Rise speed (how fast it climbs), Overshoot (does it spike past yellow?), and Steady Error (does it settle on the line?).',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-retest-pid',
      view: 'preflight',
      targetSelector: '#preflight-knobs-wrap',
      pipMood: 'explaining',
      visualId: 'kd-damping',
      title: 'Step 6 — Refine & Compare Waves',
      headline: 'Adjust & Watch Before/After',
      instruction: 'Tweak a knob and click Test PID to compare.',
      actionHint: 'Adjust any knob and click Test PID to see purple vs. cyan waves.',
      learnMore:
        'Every re-test overlays your Previous wave (purple dashed) with your Current wave (cyan) under identical conditions so you can verify improvements before flying.',
      requiredAction: 'retest_pid'
    },
    {
      stepId: 't1-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 7 — Fly Your Tuned Drone',
      headline: 'Waveform Ready — Launch!',
      instruction: 'Happy with your curve? Press Start Flight now.',
      actionHint: 'Click Start Flight to test your tuned controller in the arena.',
      learnMore:
        'Your exact Kp, Ki, and Kd settings from the Test Bench now drive live 120 Hz flight.',
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
      title: 'Step 9 — Complete the Climb',
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
      title: 'Step 10 — Review Flight Telemetry',
      headline: 'Close the Learning Loop',
      instruction: 'Compare your flight metrics and tune again anytime!',
      actionHint: 'Review your stars and curves below, then click Finish Guide.',
      learnMore:
        'In Tutorials 2–4, you will apply this exact Tune → Test Curve → Compare → Fly method to master Kp speed, Ki wind correction, and Kd damping.',
      requiredAction: 'acknowledge'
    }
  ],

  'tutorial-2': [
    {
      stepId: 't2-baseline-test',
      view: 'preflight',
      targetSelector: '#btn-test-pid',
      pipMood: 'thinking',
      visualId: 'kp-response',
      title: 'Step 1 — Test Slow Kp Curve',
      headline: 'Pilot, Today I Measure Tracking Lag!',
      instruction: 'Click Test PID first to see slow Kp lag.',
      actionHint: 'Click Test PID at Kp = 1.2 to observe the sluggish wave.',
      learnMore:
        'Always inspect the baseline waveform first. With low Kp = 1.2, the cyan curve climbs very slowly toward the yellow target line.',
      requiredAction: 'run_test_pid'
    },
    {
      stepId: 't2-tune-retest',
      view: 'preflight',
      targetSelector: '#preflight-knobs-wrap',
      pipMood: 'explaining',
      visualId: 'kp-response',
      title: 'Step 2 — Raise Kp & Compare Waves',
      headline: 'Speed Up the Response Curve',
      instruction: 'Raise Kp above 4.5, then click Test PID again.',
      actionHint: 'Turn Kp >= 4.5 and click Test PID to compare Before vs. After.',
      learnMore:
        'Compare the new steep cyan curve against the slow purple baseline—higher Kp cuts Tracking Lag and Settling Time.',
      requiredAction: 'tune_kp_and_retest'
    },
    {
      stepId: 't2-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 3 — Fly Your Tuned Kp',
      headline: 'Validate Crisp Tracking In Flight',
      instruction: 'Curve looks fast and clean? Press Start Flight!',
      actionHint: 'Click Start Flight to fly with your improved Kp.',
      learnMore:
        'Now test how that sharper step curve feels during real WASD horizontal flight and Route Fit scoring.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't2-complete',
      view: 'flight',
      targetSelector: '#flight-canvas',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 4 — Hold Inside Target',
      headline: 'Lock In Your Route Fit',
      instruction: 'Fly into the right zone and hold steady.',
      actionHint: 'Hold inside (18.0 m, 5.5 m) for 2.0 s.',
      learnMore:
        'On the Result Screen, I will show your Average Tracking Error, Completion Time, and Route Fit score.',
      requiredAction: 'reach_target'
    }
  ],

  'tutorial-3': [
    {
      stepId: 't3-baseline-test',
      view: 'preflight',
      targetSelector: '#btn-test-pid',
      pipMood: 'thinking',
      visualId: 'ki-integral',
      title: 'Step 1 — Test Wind Drift Curve',
      headline: 'Pilot, Today I Measure Steady-State Offset!',
      instruction: 'Click Test PID to spot steady wind drift.',
      actionHint: 'Click Test PID at Ki = 0.00 to see the wave stall off-target.',
      learnMore:
        'Under +4.8 N crosswind with Ki = 0, the cyan waveform stays stuck away from the yellow target line—this gap is Steady-State Error.',
      requiredAction: 'run_test_pid'
    },
    {
      stepId: 't3-tune-retest',
      view: 'preflight',
      targetSelector: '#preflight-knobs-wrap',
      pipMood: 'explaining',
      visualId: 'ki-integral',
      title: 'Step 2 — Raise Ki & Compare Waves',
      headline: 'Pull the Wave Back on Target',
      instruction: 'Raise Ki above 0.80, then click Test PID again.',
      actionHint: 'Turn Ki >= 0.80 and click Test PID to watch drift vanish.',
      learnMore:
        'Compare the purple drifted curve with your new cyan curve—Ki accumulates persistent error to pull the drone back onto Target.',
      requiredAction: 'tune_ki_and_retest'
    },
    {
      stepId: 't3-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 3 — Launch Into Crosswind',
      headline: 'Fly Your Wind-Trimmed Setup',
      instruction: 'Drift fixed on the graph? Press Start Flight!',
      actionHint: 'Click Start Flight to fly into the crosswind arena.',
      learnMore:
        'Avoid pushing Ki too high—watch for overshoot or saturation spikes on the curve before takeoff.',
      requiredAction: 'start_flight'
    },
    {
      stepId: 't3-complete',
      view: 'flight',
      targetSelector: '#flight-canvas',
      pipMood: 'explaining',
      visualId: 'ki-integral',
      title: 'Step 4 — Hold Center In Wind',
      headline: 'Verify Zero Drift In Flight',
      instruction: 'Fly into the target and hold steady.',
      actionHint: 'Hold centered inside (16.0 m, 5.5 m) for 2.0 s.',
      learnMore:
        'On the Result Screen, check whether your Steady-State Offset stayed small without windup overshoot.',
      requiredAction: 'reach_target'
    }
  ],

  'tutorial-4': [
    {
      stepId: 't4-autonomous',
      view: 'preflight',
      targetSelector: '#test-bench-panel',
      pipMood: 'thinking',
      visualId: 'kd-damping',
      title: 'Autonomous Method: Test → Tune Kd → Fly',
      headline: 'Pilot, Watch Overshoot, Settling & Stability!',
      instruction: 'Test the bouncy wave, raise Kd, re-test, then fly.',
      actionHint: 'Run Test PID, damp overshoot with Kd, compare curves, then Start Flight.',
      learnMore:
        'You now know the full method! Run Test PID to see low-Kd oscillation, raise Kd and re-test until the wave brakes smoothly, then Start Flight.',
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
    this.retestSatisfied = false;
    this.lastBenchGains = null;
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
      case 'retest_pid':
        return this.benchTestCount >= 2;
      case 'tune_kp_and_retest':
        return this.retestSatisfied;
      case 'tune_ki_and_retest':
        return this.retestSatisfied;
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

  recordBenchTest(result = null) {
    if (!this.active) return false;
    this.benchTestCount += 1;
    const gains = result?.gains || null;
    this.lastBenchGains = gains ? { ...gains } : this.lastBenchGains;

    const step = this.getCurrentStep();
    if (step?.requiredAction === 'run_test_pid') {
      return this.goNext();
    }
    if (step?.requiredAction === 'retest_pid' && this.benchTestCount >= 2) {
      return this.goNext();
    }
    if (step?.requiredAction === 'tune_kp_and_retest' && this.benchTestCount >= 2) {
      if (!gains || Number(gains.kp) >= 4.5) {
        this.retestSatisfied = true;
        return this.goNext();
      }
    }
    if (step?.requiredAction === 'tune_ki_and_retest' && this.benchTestCount >= 2) {
      if (!gains || Number(gains.ki) >= 0.8) {
        this.retestSatisfied = true;
        return this.goNext();
      }
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
