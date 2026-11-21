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
      targetSelector: '#knob-card-kp',
      pipMood: 'thinking',
      visualId: 'kp-response',
      title: 'Step 3 — Tune the Kp Knob',
      headline: 'Turn Kp Into 7.5–9.0',
      instruction: 'Turn the highlighted Kp knob into 7.5–9.0.',
      actionHint: 'Turn Kp up to 7.5–9.0 (keep Kd >= 3.0) to unlock Next Step.',
      learnMore:
        'Kp starts at 6.5. Practice turning the Kp knob intentionally into 7.5–9.0 (keeping Kd >= 3.0). Once in position, Next Step unlocks so you can test the curve.',
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
      title: 'Step 8 — Fly Into the Blue Circle',
      headline: 'Guide Your Drone Into the Ring!',
      instruction: 'Fly your drone into the blue circle and hold steady!',
      actionHint: 'Hold W to lift REF into the blue target circle above, then release WASD and hold 1.5 s.',
      learnMore:
        'Move the yellow REF target inside the dashed blue circle using W/A/S/D. Your PID controller will steer the drone into the circle—release keys so speed drops below 0.45 m/s for 1.5 s to finish!',
      requiredAction: 'reach_target'
    }
  ],

  'tutorial-2': [
    {
      stepId: 't2-tune-kp',
      view: 'preflight',
      targetSelector: '#knob-card-kp',
      pipMood: 'thinking',
      visualId: 'kp-response',
      title: 'Step 1 — Tune Kp & Watch Curves',
      headline: 'Pilot, Today I Measure Tracking Lag!',
      instruction: 'Adjust Kp and run Test PID multiple times to compare waves.',
      actionHint: 'Experiment freely with Test PID, then set Kp >= 4.5 to unlock Next Step.',
      learnMore:
        'Try Test PID at low Kp = 1.2 first, then raise Kp and test again as many times as you like to compare Tracking Lag and Settling Time.',
      requiredAction: 'tune_kp_ready'
    },
    {
      stepId: 't2-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 2 — Fly Your Tuned Kp',
      headline: 'Launch & Fly Directly!',
      instruction: 'Happy with your Kp curve? Press Start Flight now!',
      actionHint: 'Click Start Flight and fly directly into the right target zone.',
      learnMore:
        'You can still tweak Kp live or re-test anytime. After launch, fly directly into (18.0 m, 5.5 m) and hold 2.0 s.',
      requiredAction: 'start_flight'
    }
  ],

  'tutorial-3': [
    {
      stepId: 't3-tune-ki',
      view: 'preflight',
      targetSelector: '#knob-card-ki',
      pipMood: 'thinking',
      visualId: 'ki-integral',
      title: 'Step 1 — Tune Ki & Watch Wind Drift',
      headline: 'Pilot, Today I Measure Steady-State Offset!',
      instruction: 'Adjust Ki and run Test PID multiple times to fix drift.',
      actionHint: 'Experiment freely with Test PID, then set Ki >= 0.80 to unlock Next Step.',
      learnMore:
        'Try Test PID at Ki = 0.00 to see wind drift, then raise Ki and re-test as many times as you like until the wave pulls back onto Target.',
      requiredAction: 'tune_ki_ready'
    },
    {
      stepId: 't3-start-flight',
      view: 'preflight',
      targetSelector: '#btn-pre-start-flight-2',
      pipMood: 'celebrating',
      visualId: null,
      title: 'Step 2 — Launch Into Crosswind',
      headline: 'Fly Directly Into Crosswind!',
      instruction: 'Drift looks fixed? Press Start Flight to fly!',
      actionHint: 'Click Start Flight and hold centered inside (16.0 m, 5.5 m).',
      learnMore:
        'Avoid pushing Ki too high—check the curve for overshoot before takeoff, then fly directly into the target zone.',
      requiredAction: 'start_flight'
    }
  ],

  'tutorial-4': [
    {
      stepId: 't4-autonomous',
      view: 'preflight',
      targetSelector: '#knob-card-kd',
      pipMood: 'thinking',
      visualId: 'kd-damping',
      title: 'Autonomous Practice — Tune Kd & Fly',
      headline: 'Pilot, Watch Overshoot, Settling & Stability!',
      instruction: 'Adjust Kd and test curves freely, then Start Flight!',
      actionHint: 'Experiment with Kd and Test PID as often as you like, then click Start Flight.',
      learnMore:
        'Run Test PID at low Kd = 0.4 to see oscillations, adjust Kd and re-test multiple times until braking is smooth, then fly directly.',
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
        const kpVal = Number(this.currentGains?.kp ?? 6.5).toFixed(1);
        if (satisfied) {
          return `✓ Kp = ${kpVal} is in position! Click Next Step to test the curve.`;
        }
        return this.pidFeedback || `Turn Kp into 7.5–9.0 (Current: ${kpVal}) to unlock Next Step.`;
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
      case 'tune_kp_ready': {
        const kpVal = Number(this.currentGains?.kp ?? 1.2).toFixed(1);
        const testNote = this.benchTestCount > 0 ? ` (${this.benchTestCount} curve test${this.benchTestCount > 1 ? 's' : ''} run)` : '';
        return satisfied
          ? `✓ Kp = ${kpVal} ready${testNote}! Test PID again anytime, or click Next Step to fly.`
          : `Current Kp is ${kpVal}. Raise Kp >= 4.5 and run Test PID as often as you like to compare curves.`;
      }
      case 'tune_ki_ready': {
        const kiVal = Number(this.currentGains?.ki ?? 0.0).toFixed(2);
        const testNote = this.benchTestCount > 0 ? ` (${this.benchTestCount} curve test${this.benchTestCount > 1 ? 's' : ''} run)` : '';
        return satisfied
          ? `✓ Ki = ${kiVal} ready${testNote}! Test PID again anytime, or click Next Step to fly.`
          : `Current Ki is ${kiVal}. Raise Ki >= 0.80 and run Test PID as often as you like to watch drift shrink.`;
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
      canSkip: this.canSkipCurrentStep(),
      launchLocked: this.isLaunchLocked(),
      finished: this.finished
    };
  }

  /**
   * Prevent takeoff until all pre-flight procedural learning steps are completed
   * and the player reaches the dedicated Start Flight step (or hides guide in T2+).
   */
  isLaunchLocked() {
    if (!this.active || this.finished || this.dismissed) return false;
    const step = this.steps[this.stepIndex];
    if (!step || step.view !== 'preflight') return false;
    return step.requiredAction !== 'start_flight';
  }

  canSkipCurrentStep() {
    if (!this.active) return true;
    // Tutorial 1 never shows Hide Guide; Tutorial 2+ allow hiding the guide anytime
    return this.sceneId !== 'tutorial-1';
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
      case 'tune_kp_ready':
        return Number(this.currentGains?.kp ?? 0) >= 4.5;
      case 'tune_ki_ready':
        return Number(this.currentGains?.ki ?? 0) >= 0.8;
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

    // Validate intentional target position for Step 3 procedural tuning (Kp 7.5–9.0, Kd 3.0–6.5)
    const kp = Number(gains.kp ?? 0);
    const kd = Number(gains.kd ?? 0);
    const inKp = kp >= 7.5 && kp <= 9.0;
    const inKd = kd >= 3.0 && kd <= 6.5;
    this.pidInTargetRange = inKp && inKd;

    if (kp < 7.5) {
      this.pidFeedback = `Current Kp is ${kp.toFixed(1)}. Turn the highlighted Kp knob up into 7.5–9.0.`;
    } else if (kp > 9.0) {
      this.pidFeedback = `Kp is too high (${kp.toFixed(1)}). Turn Kp back down into 7.5–9.0.`;
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
    if (step?.requiredAction === 'tune_kp_ready') {
      return kp >= 4.5;
    }
    if (step?.requiredAction === 'tune_ki_ready') {
      return Number(gains.ki ?? 0) >= 0.8;
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
