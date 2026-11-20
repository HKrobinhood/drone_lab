/**
 * PIP — Your PID Flight Coach (Virtual STEM Flight Instructor).
 *
 * Unified coaching engine shared across Tutorial Village and Challenge Levels.
 * Performs pre-flight PID checks, live in-flight coaching,
 * and post-flight telemetry debriefing.
 *
 * Pure JS module (no DOM/Canvas dependency).
 */

import { evaluateTutorialCoaching } from './scenes.js';
import { resolvePipMood } from './visual_aids.js';

export function getSliderZone(value, min, max) {
  if (!Number.isFinite(value)) return 'low';
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'recommended';
}

/**
 * Evaluate joint stability and coupling across (Kp, Ki, Kd) relative to plant mass.
 */
export function evaluateJointStability(gains, scene) {
  const rec = scene?.recommendedPID;
  if (!rec) return { jointOk: true, reason: null };

  const totalMass = (scene.droneMass ?? 1.2) + (scene.payloadMass ?? 0);
  const massFactor = 1.2 / Math.max(0.5, totalMass);
  const kp = Math.max(0.01, gains.kp);
  const kd = Math.max(0, gains.kd);
  const ki = Math.max(0, gains.ki);

  // Effective 2nd-order damping ratio approximation scaled by mass inertia
  const dampingRatio = (kd * Math.sqrt(massFactor)) / (2 * Math.sqrt(kp));
  const kpToKdRatio = kp / Math.max(0.1, kd);
  const kiToKpRatio = ki / kp;

  if (dampingRatio < (rec.minDampingRatio ?? 0.5) || kpToKdRatio > (rec.maxKpToKdRatio ?? 2.5)) {
    return {
      jointOk: false,
      reason: 'underdamped_coupling',
      message:
        'Even near the suggested range, your Kp is high relative to Kd. Consider raising Kd slightly or trimming Kp to avoid overshoot.'
    };
  }

  if (ki > 0 && kiToKpRatio > 0.52) {
    return {
      jointOk: false,
      reason: 'integral_coupling',
      message:
        'Your Ki is fairly high compared to Kp, which can cause slow integral recovery and extra overshoot.'
    };
  }

  return { jointOk: true, reason: null };
}

/**
 * Analyze current PID settings for a Challenge Level and produce prioritized PIP coaching.
 * Returns at most 1-2 messages, sorted by safety and control priority.
 */
export function evaluatePidCoaching(gains, scene) {
  const kp = Number(gains?.kp ?? 0);
  const ki = Number(gains?.ki ?? 0);
  const kd = Number(gains?.kd ?? 0);
  const rec = scene?.recommendedPID || {
    kpMin: 4.5,
    kpMax: 8.5,
    kiMin: 0.0,
    kiMax: 1.5,
    kdMin: 2.5,
    kdMax: 6.0
  };

  const zones = {
    kp: getSliderZone(kp, rec.kpMin, rec.kpMax),
    ki: getSliderZone(ki, rec.kiMin, rec.kiMax),
    kd: getSliderZone(kd, rec.kdMin, rec.kdMax)
  };

  // Initial zero-PID state
  if (kp === 0 && ki === 0 && kd === 0) {
    return {
      state: 'welcome',
      mood: 'greeting',
      headline: 'Hi! I am PIP, your PID Flight Coach.',
      messages: [
        'All three gains start at zero, so your drone cannot respond or take off yet. Begin by raising Kp, then add Kd damping!'
      ],
      zones,
      jointOk: false
    };
  }

  const totalMass = (scene?.droneMass ?? 1.2) + (scene?.payloadMass ?? 0);
  const isHeavy = (scene?.payloadMass ?? 0) >= 0.5 || (scene?.maxThrust ?? 28) <= 27.0;
  const messages = [];
  let severity = 'teaching';

  // Priority 1: Unfeasible / unable to lift off
  if (kp < 0.8) {
    severity = 'warning';
    messages.push(
      'Kp is near zero—the drone cannot generate enough response to lift off or follow WASD commands. Raise Kp first.'
    );
  } else if (isHeavy && kp < 2.4) {
    severity = 'warning';
    messages.push(
      `With heavy payload (${totalMass.toFixed(2)} kg), very low Kp will struggle to climb or clear obstacles.`
    );
  }

  // Priority 2: Severe multi-parameter instability risks
  const highKpLowKd = (kp > rec.kpMax && kd < rec.kdMin) || (kp >= 8.5 && kd < 2.2);
  const highKiLowKd = (ki > rec.kiMax && kd < rec.kdMin) || (ki > 3.5 && kd < 2.2);

  if (highKpLowKd && messages.length < 2) {
    severity = 'warning';
    messages.push(
      'High Kp and low Kd may cause strong oscillation. Consider reducing Kp or increasing Kd.'
    );
  }
  if (highKiLowKd && messages.length < 2) {
    severity = 'warning';
    messages.push(
      'High Ki combined with low Kd risks severe integral windup and sustained oscillation.'
    );
  }

  // Priority 3: Control saturation & integral windup risks
  if (isHeavy && (kp > rec.kpMax || ki > rec.kiMax) && messages.length < 2) {
    severity = 'warning';
    messages.push(
      'With heavy load and fixed thrust limits, aggressive Kp or Ki easily saturates thrust and triggers integral windup.'
    );
  } else if (ki > rec.kiMax && messages.length < 2) {
    severity = 'warning';
    messages.push('Too much integral action may lead to overshoot and slow recovery.');
  }

  // Priority 4: Overshoot & oscillation (single gain)
  if (!highKpLowKd && kp > rec.kpMax && messages.length < 2) {
    severity = 'warning';
    messages.push('Your Kp may be too aggressive. Expect overshoot and possible oscillation.');
  }
  if (!highKpLowKd && !highKiLowKd && kd < rec.kdMin && messages.length < 2) {
    severity = 'warning';
    messages.push('Your drone may struggle to stop smoothly. Try increasing damping.');
  }

  // Priority 5: Sluggish response
  if (kp >= 0.8 && kp < rec.kpMin && messages.length < 2) {
    severity = 'teaching';
    messages.push('Your Kp is too low for this mission. The drone may respond slowly to your controls.');
  }
  if (kd > rec.kdMax && messages.length < 2) {
    severity = 'teaching';
    messages.push('Excessive damping may make your drone feel sluggish.');
  }

  // Priority 6: Disturbance integral guidance (ONLY when mission requires steady-state compensation)
  if (scene?.requiresIntegral && ki < rec.kiMin && messages.length < 2) {
    severity = 'teaching';
    messages.push('Your Ki may be too low to correct persistent position errors.');
  }

  // If all individual gains lie inside recommendedPID, verify joint coupling
  const allInBox = zones.kp === 'recommended' && zones.ki === 'recommended' && zones.kd === 'recommended';
  if (messages.length === 0 && allInBox) {
    const joint = evaluateJointStability({ kp, ki, kd }, scene);
    if (!joint.jointOk) {
      return {
        state: 'teaching',
        mood: 'thinking',
        headline: 'Check Parameter Balance',
        messages: [joint.message],
        zones,
        jointOk: false
      };
    }

    return {
      state: 'ready',
      mood: 'celebrating',
      headline: 'Ready for Takeoff!',
      messages: ['Your PID settings look suitable for this mission. Ready to fly!'],
      zones,
      jointOk: true
    };
  }

  if (messages.length === 0) {
    return {
      state: 'teaching',
      mood: 'thinking',
      headline: 'Keep Tuning',
      messages: ['Adjust Kp, Ki, and Kd to balance speed, damping, and steady-state accuracy.'],
      zones,
      jointOk: false
    };
  }

  return {
    state: severity,
    mood: resolvePipMood(severity),
    headline: severity === 'warning' ? 'Flight Risk Detected' : 'Coach Suggestion',
    messages: messages.slice(0, 2),
    zones,
    jointOk: false
  };
}

/**
 * Post-flight telemetry debrief ("What went wrong?" on failure, summary on success).
 */
export function evaluatePostFlightFeedback(outcome, metrics, scene) {
  const { kp, ki, kd } = metrics?.pidParameters || { kp: 0, ki: 0, kd: 0 };
  const maxOver = metrics?.maxOvershoot ?? 0;
  const avgErr = metrics?.averageTrackingError ?? 0;
  const satSec = metrics?.controlSaturationDuration ?? 0;
  const finalSpeed = metrics?.finalVelocity ?? 0;
  const rec = scene?.recommendedPID;

  if (outcome?.status === 'completed') {
    const baseExplanation = `Completed in ${metrics.completionTime.toFixed(1)} s with max overshoot ${maxOver.toFixed(2)} m and ${satSec.toFixed(2)} s of thrust saturation.`;
    if (scene?.mode === 'tutorial') {
      return {
        state: 'success',
        title: 'PIP Lesson Debrief — Objective Mastered!',
        explanation: `${baseExplanation} ${scene.learningObjective || ''}`.trim(),
        tip:
          scene.nextLevelId
            ? 'Great work! Advance to the next Tutorial lesson or experiment with Retry to compare PID curves.'
            : 'Tutorial Village complete! You are ready to tackle Challenge Levels using everything you practiced.'
      };
    }
    return {
      state: 'success',
      title: 'PIP Flight Debrief — Nice Flying!',
      explanation: baseExplanation,
      tip:
        maxOver > 1.2
          ? 'You passed! For an even cleaner run, try adding a bit more Kd or trimming Ki to cut overshoot.'
          : 'Clean control! Feel free to advance to the next mission or refine your gains for faster settling.'
    };
  }

  const reason = outcome?.reason || 'timeout';

  if (kp < 0.8) {
    return {
      state: 'flight_feedback',
      title: 'What went wrong?',
      explanation: `Kp was ${kp.toFixed(1)}, leaving almost no proportional restoring force to climb or follow your WASD target.`,
      tip: 'Raise Kp first so the drone lifts off and tracks REF before fine-tuning Kd and Ki.'
    };
  }

  if (reason === 'collision') {
    if (rec && (kd < rec.kdMin || kp > rec.kpMax || maxOver > 1.3)) {
      return {
        state: 'flight_feedback',
        title: 'What went wrong?',
        explanation: `Peak overshoot reached ${maxOver.toFixed(2)} m before impact. Aggressive Kp or insufficient Kd damping carried the drone into an obstacle.`,
        tip: 'Increase Kd to brake earlier before turns, or reduce Kp slightly for tighter precision.'
      };
    }
    return {
      state: 'flight_feedback',
      title: 'What went wrong?',
      explanation: `Drone struck an obstacle (avg tracking lag ${avgErr.toFixed(2)} m). Slow tracking or late steering caused the collision.`,
      tip: 'Ensure Kp is responsive enough to follow REF cleanly through gaps without overshooting.'
    };
  }

  if (reason === 'hard_landing') {
    return {
      state: 'flight_feedback',
      title: 'What went wrong?',
      explanation: `Touchdown speed was too fast (final speed ${finalSpeed.toFixed(2)} m/s). Low vertical damping or fast S descent prevented soft braking.`,
      tip: 'Raise Kd to cushion vertical descent and tap S gently when approaching the helipad.'
    };
  }

  if (reason === 'off_pad') {
    return {
      state: 'flight_feedback',
      title: 'What went wrong?',
      explanation: `The drone landed on the ground instead of the helipad (avg error ${avgErr.toFixed(2)} m).`,
      tip: scene?.requiresIntegral
        ? 'Center REF directly above the pad and check Ki so crosswind does not push you off during descent.'
        : 'Hover steadily over the helipad center before stepping REF down with S.'
    };
  }

  if (reason === 'out_of_bounds') {
    return {
      state: 'flight_feedback',
      title: 'What went wrong?',
      explanation: `The drone crossed the safety perimeter (max overshoot ${maxOver.toFixed(2)} m).`,
      tip: 'Lower excessive Kp or increase Kd damping so the drone stops well before the arena edges.'
    };
  }

  // Timeout
  if (satSec > 2.5) {
    return {
      state: 'flight_feedback',
      title: 'What went wrong?',
      explanation: `Time expired while thrust stayed saturated for ${satSec.toFixed(1)} s—heavy load or aggressive gains hit motor limits.`,
      tip: 'Use balanced Kp and moderate Ki so the drone climbs smoothly without exhausting thrust authority.'
    };
  }

  if (scene?.requiresIntegral && rec && ki < rec.kiMin) {
    return {
      state: 'flight_feedback',
      title: 'What went wrong?',
      explanation: `Time expired with avg tracking error ${avgErr.toFixed(2)} m. Low Ki (${ki.toFixed(2)}) allowed persistent offset under load or wind.`,
      tip: 'Increase Ki so the integral term trims out constant wind drift or payload sag.'
    };
  }

  return {
    state: 'flight_feedback',
    title: 'What went wrong?',
    explanation: `Time ran out (avg tracking error ${avgErr.toFixed(2)} m, max overshoot ${maxOver.toFixed(2)} m).`,
    tip:
      rec && kp < rec.kpMin
        ? 'Increase Kp for faster response toward the target.'
        : rec && kd > rec.kdMax
          ? 'Lower excessive Kd so the drone does not feel sluggish.'
          : 'Try balancing Kp and Kd so the drone enters and settles inside the target zone sooner.'
  };
}

/**
 * Unified live Flight Screen PIP coaching shared by Tutorial and Challenge modes.
 */
export function evaluateLiveFlightCoaching(sim, scene, guideStep = null) {
  if (!sim || !scene) {
    return {
      state: 'teaching',
      headline: 'PIP Ready',
      messages: ['Use WASD to move the yellow REF target and monitor live telemetry.']
    };
  }

  if (scene.mode === 'tutorial') {
    const tutHint = evaluateTutorialCoaching(sim, scene);
    const pidCheck = evaluatePidCoaching(sim.gains, scene);
    const msgs = [];
    if (guideStep?.instruction) {
      msgs.push(guideStep.instruction);
    }
    if (tutHint && !msgs.includes(tutHint)) {
      msgs.push(tutHint);
    }
    const liveState = pidCheck.state === 'warning' ? 'warning' : sim.targetZone?.stabilized ? 'success' : 'teaching';
    return {
      state: liveState,
      mood: guideStep?.pipMood && liveState !== 'warning' ? guideStep.pipMood : resolvePipMood(liveState),
      headline: guideStep?.title || scene.stemTopic || 'Tutorial Coach',
      messages: msgs.slice(0, 2)
    };
  }

  // Challenge live telemetry coaching
  if (sim.paused) {
    return {
      state: 'teaching',
      headline: 'Flight Paused',
      messages: ['Press Resume (P) to continue flying, or Restart (R) to reset cleanly.']
    };
  }

  const speed = Math.hypot(sim.drone.vx, sim.drone.vz);
  const thrustSat = sim.drone.thrust >= sim.config.maxThrust - 0.05;
  if (thrustSat) {
    return {
      state: 'warning',
      headline: 'Thrust Limit Reached',
      messages: ['Motors are at max thrust! Smooth step commands with WASD help prevent saturation lag.']
    };
  }
  if (sim.targetZone?.inside) {
    return {
      state: speed <= sim.targetZone.maxSpeed ? 'ready' : 'teaching',
      headline: speed <= sim.targetZone.maxSpeed ? 'Hold Steady!' : 'Brake Inside Target',
      messages: [
        speed <= sim.targetZone.maxSpeed
          ? `Stabilizing in target (${sim.targetZone.holdTimer.toFixed(1)} / ${sim.targetZone.holdRequired.toFixed(1)} s).`
          : `Speed ${speed.toFixed(2)} m/s is above ${sim.targetZone.maxSpeed.toFixed(2)} m/s—release WASD to settle.`
      ]
    };
  }
  if (sim.padStatus?.inside) {
    return {
      state: 'ready',
      headline: 'On Helipad',
      messages: [`Hold steady to complete landing (${sim.padStatus.holdTimer.toFixed(1)} s).`]
    };
  }

  const livePid = evaluatePidCoaching(sim.gains, scene);
  return {
    state: livePid.state === 'warning' ? 'warning' : 'teaching',
    headline: 'In Flight',
    messages: [
      scene.briefing || 'Guide the yellow REF marker smoothly with WASD toward your mission goal.'
    ]
  };
}
