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
      title: 'Step 3 — Tune Your PID Knobs',
      headline: 'Adjust Kp & Kd Into Range',
      instruction: 'Drag a knob or click + to tune Kp (5.0–9.0).',
      actionHint: 'Tune Kp into 5.0–9.0 and keep Kd >= 3.0 to unlock Next Step.',
      learnMore:
        'Practice moving a knob intentionally into a safe flight range (Kp 5.0–9.0, Kd >= 3.0). Once in position, Next Step unlocks so you can test the curve.',
      requiredAction: 'tune_pid_valid'
    },
    {
      stepId: 't1-test-pid',
      view: 'preflight',
      targetSelector: '#btn-test-pid',
      pipMood: 'explaining',
      visualId: null,
      title: 'Step 4 — Run Test PID',
      headline: 'Plot Your Real Response Wave',
      instruction: 'Click Test PID, then press Next Step to inspect.',
      actionHint: 'Click Test PID to generate the real 6.5 s response curve.',
      learnMore:
        'Test PID runs the exact same 120 Hz physics and PID controller for 6.5 s so you can inspect the waveform safely before takeoff.',
      requiredAction: 'run_test_pid'
    },
    {
      stepId: 't1-observe-bench',
      view: 'preflight',
      targetSelector: '#test-bench-panel',
      pipMood: 'thinking',
      visualId: 'kd-damping',
      title: 'Step 5 — Read the Waveform',
      headline: 'Inspect Target vs. Drone Wave',
      instruction: 'Check the cyan wave against the yellow target line.',
      actionHint: 'Review Overshoot, Settling Time, and Error, then click Next Step.',
      learnMore:
        'Check rise speed, overshoot past the yellow target, and steady error. You can tweak a knob and click Test PID again anytime to compare Before vs. After waves.',
      requiredAction: 'acknowledge'
    },
    {
      stepId: 't1-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 6 — Start Flight!',
      headline: 'All Preflight Steps Done — Launch!',
      instruction: 'Click the highlighted Start Flight button to take off.',
      actionHint: 'Takeoff is now unlocked! Click Start Flight to launch your drone.',
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
      title: 'Step 7 — Fly With WASD',
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
      title: 'Step 8 — Complete the Climb',
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
      title: 'Step 9 — Review Flight Telemetry',
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
      targetSelector: '#preflight-pid-panel',
      pipMood: 'explaining',
      visualId: 'kp-response',
      title: 'Step 2 — Raise Kp & Compare Waves',
      headline: 'Speed Up the Response Curve',
      instruction: 'Raise Kp above 4.5, then click Test PID again.',
      actionHint: '1) Raise Kp >= 4.5  2) Click Test PID to compare Before vs. After.',
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
      targetSelector: '#preflight-pid-panel',
      pipMood: 'explaining',
      visualId: 'ki-integral',
      title: 'Step 2 — Raise Ki & Compare Waves',
      headline: 'Pull the Wave Back on Target',
      instruction: 'Raise Ki above 0.80, then click Test PID again.',
      actionHint: '1) Raise Ki >= 0.80  2) Click Test PID to watch drift vanish.',
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
    this.pidInTargetRange = false;
    this.pidFeedback = null;
    this.benchTestCount = 0;
    this.tunedAfterFirstBench = false;
    this.retestSatisfied = false;
    this.lastBenchGains = null;
    this.currentGains = null;
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
    const satisfied = this.isStepSatisfied(base);
    const dynamicFeedback = this.getStepStatusFeedback(base, satisfied);

    if (base.requiredAction === 'wasd_sequence') {
      const sub = WASD_SUBSTEPS[Math.min(this.wasdSubIndex, WASD_SUBSTEPS.length - 1)];
      return {
        ...base,
        satisfied,
        statusFeedback: dynamicFeedback,
        wasdSubIndex: this.wasdSubIndex,
        wasdSubsteps: WASD_SUBSTEPS,
        wasdDone: { ...this.wasdDone },
        activeSubPrompt: sub.prompt
      };
    }
    return {
      ...base,
      satisfied,
      statusFeedback: dynamicFeedback
    };
  }

  getStepStatusFeedback(step, satisfied) {
    if (!step) return null;
    switch (step.requiredAction) {
      case 'tune_pid_valid': {
        if (satisfied) {
          return '✓ Great! Gains are in the target range — click Next Step to test the curve.';
        }
        return this.pidFeedback || 'Adjust Kp into 5.0–9.0 and keep Kd >= 3.0 to unlock Next Step.';
      }
      case 'run_test_pid':
        return satisfied
          ? '✓ Response wave plotted! Click Next Step to read the curve.'
          : 'Click the blue Test PID button to plot your real response wave.';
      case 'retest_pid': {
        if (satisfied) {
          return '✓ Before vs. After waves compared! Click Next Step to launch flight.';
        }
        const t1 = this.tunedAfterFirstBench ? '✓ 1. Knob adjusted' : '○ 1. Adjust Kp or Kd';
        const t2 = this.benchTestCount >= 2 ? '✓ 2. Re-tested' : '○ 2. Click Test PID again';
        return `${t1}  ·  ${t2}`;
      }
      case 'tune_kp_and_retest': {
        if (satisfied) {
          return '✓ Faster Kp curve verified! Click Next Step to fly.';
        }
        const kpOk = Number(this.currentGains?.kp ?? 0) >= 4.5;
        const t1 = kpOk ? '✓ 1. Kp >= 4.5' : '○ 1. Raise Kp >= 4.5';
        const t2 = this.retestSatisfied ? '✓ 2. Re-tested' : '○ 2. Click Test PID again';
        return `${t1}  ·  ${t2}`;
      }
      case 'tune_ki_and_retest': {
        if (satisfied) {
          return '✓ Wind drift corrected on curve! Click Next Step to fly.';
        }
        const kiOk = Number(this.currentGains?.ki ?? 0) >= 0.8;
        const t1 = kiOk ? '✓ 1. Ki >= 0.80' : '○ 1. Raise Ki >= 0.80';
        const t2 = this.retestSatisfied ? '✓ 2. Re-tested' : '○ 2. Click Test PID again';
        return `${t1}  ·  ${t2}`;
      }
      case 'start_flight':
        return 'Click Start Flight to launch your tuned drone into the arena.';
      default:
        return null;
    }
  }

  getProgressInfo() {
    return {
      current: this.stepIndex + 1,
      total: this.steps.length,
      canBack: this.canGoBack(),
      canNext: this.canGoNext(),
      canSkip: false,
      launchLocked: this.isLaunchLocked(),
      finished: this.finished
    };
  }

  /**
   * Prevent takeoff until all pre-flight procedural learning steps are completed
   * and the player reaches the dedicated Start Flight step.
   */
  isLaunchLocked() {
    if (!this.active || this.finished) return false;
    const step = this.steps[this.stepIndex];
    if (!step || step.view !== 'preflight') return false;
    return step.requiredAction !== 'start_flight';
  }

  canSkipCurrentStep() {
    return false;
  }

  isStepSatisfied(step = this.getCurrentStep()) {
    if (!step) return false;
    switch (step.requiredAction) {
      case 'acknowledge':
        return true;
      case 'adjust_pid':
        return this.pidAdjusted;
      case 'tune_pid_valid':
        return this.pidAdjusted && this.pidInTargetRange;
      case 'run_test_pid':
        return this.benchTestCount >= 1;
      case 'retest_pid':
        return this.retestSatisfied;
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
    if (!this.active || !gains) return false;
    this.currentGains = { ...gains };

    let changedFromBase = true;
    if (baselineGains) {
      changedFromBase =
        Math.abs(gains.kp - baselineGains.kp) >= 0.05 ||
        Math.abs(gains.ki - baselineGains.ki) >= 0.02 ||
        Math.abs(gains.kd - baselineGains.kd) >= 0.05;
    }
    if (changedFromBase) {
      this.pidAdjusted = true;
    }

    // Track whether player tweaked a knob after their first bench test (for Step 6 re-test comparison)
    if (this.benchTestCount >= 1 && this.lastBenchGains) {
      const changedSinceBench =
        Math.abs(gains.kp - this.lastBenchGains.kp) >= 0.1 ||
        Math.abs(gains.ki - this.lastBenchGains.ki) >= 0.05 ||
        Math.abs(gains.kd - this.lastBenchGains.kd) >= 0.1;
      if (changedSinceBench) {
        this.tunedAfterFirstBench = true;
      }
    }

    // Validate safe, meaningful target range for Step 3 procedural tuning
    const kp = Number(gains.kp ?? 0);
    const kd = Number(gains.kd ?? 0);
    const inKp = kp >= 5.0 && kp <= 9.0;
    const inKd = kd >= 3.0 && kd <= 6.5;
    this.pidInTargetRange = inKp && inKd;

    if (!this.pidAdjusted) {
      this.pidFeedback = 'Turn Kp or Kd slightly (keep Kp 5.0–9.0, Kd >= 3.0) to unlock Next Step.';
    } else if (kp < 5.0) {
      this.pidFeedback = `Kp is too low (${kp.toFixed(1)}). Raise Kp into 5.0–9.0 so the drone climbs well.`;
    } else if (kp > 9.0) {
      this.pidFeedback = `Kp is too high (${kp.toFixed(1)}). Trim Kp back into 5.0–9.0 to avoid overshoot.`;
    } else if (kd < 3.0) {
      this.pidFeedback = `Kd is too low (${kd.toFixed(1)}). Raise Kd to at least 3.0 for smooth braking.`;
    } else if (kd > 6.5) {
      this.pidFeedback = `Kd is very high (${kd.toFixed(1)}). Keep Kd <= 6.5 so flight stays crisp.`;
    } else {
      this.pidFeedback = null;
    }

    const step = this.getCurrentStep();
    if (step?.requiredAction === 'adjust_pid' && this.pidAdjusted) {
      return true;
    }
    if (step?.requiredAction === 'tune_pid_valid') {
      // Unlock Next Step without auto-jumping away so player intentionally clicks Next Step to connect to Test PID
      return this.pidAdjusted && this.pidInTargetRange;
    }
    if (step?.requiredAction === 'tune_kp_above_4_5' && kp >= 4.5) {
      return this.goNext();
    }
    return false;
  }

  recordBenchTest(result = null) {
    if (!this.active) return false;
    this.benchTestCount += 1;
    const gains = result?.gains || this.currentGains || null;
    if (gains) {
      this.currentGains = { ...gains };
    }

    const step = this.getCurrentStep();
    if (step?.requiredAction === 'run_test_pid') {
      this.lastBenchGains = gains ? { ...gains } : this.lastBenchGains;
      // Unlock Next Step so player actively clicks Next Step -> Step 5 (Read the Waveform)
      return true;
    }
    if (step?.requiredAction === 'retest_pid' && this.benchTestCount >= 2) {
      const changed =
        this.tunedAfterFirstBench ||
        !this.lastBenchGains ||
        !gains ||
        Math.abs(gains.kp - this.lastBenchGains.kp) >= 0.1 ||
        Math.abs(gains.ki - this.lastBenchGains.ki) >= 0.05 ||
        Math.abs(gains.kd - this.lastBenchGains.kd) >= 0.1;
      const safe = !gains || (Number(gains.kp) >= 4.5 && Number(gains.kd) >= 2.5);
      if (changed && safe) {
        this.tunedAfterFirstBench = true;
        this.retestSatisfied = true;
      }
      this.lastBenchGains = gains ? { ...gains } : this.lastBenchGains;
      return this.retestSatisfied;
    }
    if (step?.requiredAction === 'tune_kp_and_retest' && this.benchTestCount >= 2) {
      if (!gains || Number(gains.kp) >= 4.5) {
        this.retestSatisfied = true;
      }
      this.lastBenchGains = gains ? { ...gains } : this.lastBenchGains;
      return this.retestSatisfied;
    }
    if (step?.requiredAction === 'tune_ki_and_retest' && this.benchTestCount >= 2) {
      if (!gains || Number(gains.ki) >= 0.8) {
        this.retestSatisfied = true;
      }
      this.lastBenchGains = gains ? { ...gains } : this.lastBenchGains;
      return this.retestSatisfied;
    }
    this.lastBenchGains = gains ? { ...gains } : this.lastBenchGains;
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
