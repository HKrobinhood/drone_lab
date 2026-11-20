import { getLevelsByMode } from './levels.js';
import {
  loadProgress,
  isLevelUnlocked,
  isLevelCompleted,
  getBestStars,
  isFirstPlaythrough,
  getModeSummary,
  recordLevelCompletion
} from './storage.js';
import { InputController } from './input.js';
import { FlightSimulation, DEFAULT_PID_GAINS } from './simulation.js';
import { FlightRenderer } from './renderer.js';
import { getTotalMass } from './physics.js';
import {
  PLAYGROUND_SCENE,
  getSceneById,
  evaluateTutorialCoaching,
  evaluateSceneOutcome
} from './scenes.js';

const state = {
  currentView: 'start',
  currentMode: 'tutorial',
  activeScene: PLAYGROUND_SCENE,
  runFinished: false,
  progress: loadProgress(),
  tunedGainsByLevel: {},
  lastAttempts: {}
};

const els = {
  topbar: document.getElementById('global-topbar'),
  topbarStars: document.getElementById('topbar-stars'),
  btnHome: document.getElementById('btn-home'),
  btnStartGame: document.getElementById('btn-start-game'),
  btnEnterTutorials: document.getElementById('btn-enter-tutorials'),
  btnEnterChallenges: document.getElementById('btn-enter-challenges'),
  btnBackModes: document.getElementById('btn-back-modes'),
  btnLaunchPlayground: document.getElementById('btn-launch-playground'),

  views: {
    start: document.getElementById('view-start'),
    modes: document.getElementById('view-modes'),
    levels: document.getElementById('view-levels'),
    preflight: document.getElementById('view-preflight'),
    flight: document.getElementById('view-flight')
  },

  firstPlayBanner: document.getElementById('first-play-banner'),
  tutorialRecommendTag: document.getElementById('tutorial-recommend-tag'),
  tutorialUnlockStat: document.getElementById('tutorial-unlock-stat'),
  tutorialStarStat: document.getElementById('tutorial-star-stat'),
  challengeUnlockStat: document.getElementById('challenge-unlock-stat'),
  challengeStarStat: document.getElementById('challenge-star-stat'),

  levelsBanner: document.getElementById('levels-banner'),
  levelsModeBadge: document.getElementById('levels-mode-badge'),
  levelsHeading: document.getElementById('levels-heading'),
  levelsDescription: document.getElementById('levels-description'),
  levelsStarSummary: document.getElementById('levels-star-summary'),
  levelsGrid: document.getElementById('levels-grid'),

  // Pre-flight Tuning elements
  btnPreflightBack: document.getElementById('btn-preflight-back'),
  btnPreStartFlight: document.getElementById('btn-pre-start-flight'),
  btnPreStartFlight2: document.getElementById('btn-pre-start-flight-2'),
  btnPreResetPid: document.getElementById('btn-pre-reset-pid'),
  preflightTitle: document.getElementById('preflight-title'),
  preflightDescription: document.getElementById('preflight-description'),
  preflightObjective: document.getElementById('preflight-objective'),
  preflightDroneMass: document.getElementById('preflight-drone-mass'),
  preflightPayload: document.getElementById('preflight-payload'),
  preflightWind: document.getElementById('preflight-wind'),
  preflightMaxThrust: document.getElementById('preflight-max-thrust'),
  preflightMaxTilt: document.getElementById('preflight-max-tilt'),
  preflightTimeLimit: document.getElementById('preflight-time-limit'),
  preflightPrevCard: document.getElementById('preflight-prev-card'),
  preflightPrevStatus: document.getElementById('preflight-prev-status'),
  preflightPrevReason: document.getElementById('preflight-prev-reason'),
  preflightPrevPid: document.getElementById('preflight-prev-pid'),
  preflightPrevTime: document.getElementById('preflight-prev-time'),
  preflightPrevOvershoot: document.getElementById('preflight-prev-overshoot'),
  preflightPrevError: document.getElementById('preflight-prev-error'),
  preflightPrevSat: document.getElementById('preflight-prev-sat'),
  preflightPrevSpeed: document.getElementById('preflight-prev-speed'),
  preSliderKp: document.getElementById('pre-slider-kp'),
  preSliderKi: document.getElementById('pre-slider-ki'),
  preSliderKd: document.getElementById('pre-slider-kd'),
  preValKp: document.getElementById('pre-val-kp'),
  preValKi: document.getElementById('pre-val-ki'),
  preValKd: document.getElementById('pre-val-kd'),

  // Flight Screen elements
  flightLevelName: document.getElementById('flight-level-name'),
  flightObjective: document.getElementById('flight-objective'),
  flightCanvas: document.getElementById('flight-canvas'),
  flightTimer: document.getElementById('flight-timer'),
  btnFlightBack: document.getElementById('btn-flight-back'),
  btnFlightPause: document.getElementById('btn-flight-pause'),
  btnFlightRestart: document.getElementById('btn-flight-restart'),
  btnStartFlight: document.getElementById('btn-start-flight'),
  btnResetPid: document.getElementById('btn-reset-pid'),
  btnOpenPreflight: document.getElementById('btn-open-preflight'),
  sliderKp: document.getElementById('slider-kp'),
  sliderKi: document.getElementById('slider-ki'),
  sliderKd: document.getElementById('slider-kd'),
  valKp: document.getElementById('val-kp'),
  valKi: document.getElementById('val-ki'),
  valKd: document.getElementById('val-kd'),
  selectWind: document.getElementById('select-wind'),
  telP: document.getElementById('tel-p'),
  telI: document.getElementById('tel-i'),
  telD: document.getElementById('tel-d'),
  flightStatus: document.getElementById('flight-status'),
  flightPos: document.getElementById('flight-pos'),
  flightSpeed: document.getElementById('flight-speed'),
  flightThrust: document.getElementById('flight-thrust'),
  flightMass: document.getElementById('flight-mass'),
  flightRef: document.getElementById('flight-ref'),

  // Challenge Briefing Panel
  challengeBriefingPanel: document.getElementById('challenge-briefing-panel'),
  challengeBriefingText: document.getElementById('challenge-briefing-text'),
  challengeCheckpointPill: document.getElementById('challenge-checkpoint-pill'),

  // Tutorial Guide Panel
  tutorialGuidePanel: document.getElementById('tutorial-guide-panel'),
  tutorialCoachBar: document.getElementById('tutorial-coach-bar'),
  guideStemTopic: document.getElementById('guide-stem-topic'),
  guideObjective: document.getElementById('guide-objective'),
  guideExplanation: document.getElementById('guide-explanation'),
  guideExperiment: document.getElementById('guide-experiment'),
  guideSuccess: document.getElementById('guide-success'),
  guideSuggestion: document.getElementById('guide-suggestion'),

  // Outcome Modal
  outcomeModal: document.getElementById('outcome-modal'),
  outcomeBadge: document.getElementById('outcome-badge'),
  outcomeTitle: document.getElementById('outcome-title'),
  outcomeMessage: document.getElementById('outcome-message'),
  outcomeTime: document.getElementById('outcome-time'),
  outcomePid: document.getElementById('outcome-pid'),
  outcomeOvershoot: document.getElementById('outcome-overshoot'),
  outcomeAvgError: document.getElementById('outcome-avg-error'),
  outcomeSaturation: document.getElementById('outcome-saturation'),
  outcomeFinalSpeed: document.getElementById('outcome-final-speed'),
  outcomeSuggestionBox: document.getElementById('outcome-suggestion-box'),
  outcomeSuggestion: document.getElementById('outcome-suggestion'),
  btnOutcomeLevels: document.getElementById('btn-outcome-levels'),
  btnOutcomePreflight: document.getElementById('btn-outcome-preflight'),
  btnOutcomeRetry: document.getElementById('btn-outcome-retry'),
  btnOutcomeNext: document.getElementById('btn-outcome-next'),

  modal: document.getElementById('notice-modal'),
  modalEyebrow: document.getElementById('modal-eyebrow'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  btnCloseModal: document.getElementById('btn-close-modal')
};

const sim = new FlightSimulation();
const renderer = new FlightRenderer(els.flightCanvas);
let rafId = null;
let lastFrameTime = null;

function isAnyModalOpen() {
  return !els.modal.classList.contains('hidden') || !els.outcomeModal.classList.contains('hidden');
}

const input = new InputController({
  isActive: () => state.currentView === 'flight' && !isAnyModalOpen() && !state.runFinished,
  onMovementPress: () => {
    if (!sim.started && !state.runFinished) {
      sim.startFlight();
      syncFlightControlsUi();
    }
  },
  onRestart: () => restartFlight(),
  onPauseToggle: () => togglePauseFlight()
});

function renderStarsText(stars) {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function showModal(eyebrow, title, body) {
  els.modalEyebrow.textContent = eyebrow;
  els.modalTitle.textContent = title;
  els.modalBody.textContent = body;
  els.modal.classList.remove('hidden');
  els.btnCloseModal.focus();
}

function hideModal() {
  els.modal.classList.add('hidden');
}

function hideOutcomeModal() {
  els.outcomeModal.classList.add('hidden');
}

function formatGainsText(gains) {
  return `${gains.kp.toFixed(1)} / ${gains.ki.toFixed(2)} / ${gains.kd.toFixed(1)}`;
}

function showOutcomeModal(outcome, metrics) {
  const isSuccess = outcome.status === 'completed';
  const isChallenge = state.activeScene?.mode === 'challenge';
  els.outcomeBadge.textContent = isSuccess
    ? isChallenge
      ? 'Mission Complete'
      : 'Tutorial Complete'
    : 'Mission Failed';
  els.outcomeTitle.textContent = outcome.title;
  els.outcomeMessage.textContent = outcome.message;
  els.outcomeTime.textContent = `${metrics.completionTime.toFixed(1)} s`;
  els.outcomePid.textContent = formatGainsText(metrics.pidParameters);
  els.outcomeOvershoot.textContent = `${metrics.maxOvershoot.toFixed(2)} m`;
  els.outcomeAvgError.textContent = `${metrics.averageTrackingError.toFixed(2)} m`;
  els.outcomeSaturation.textContent = `${metrics.controlSaturationDuration.toFixed(2)} s`;
  els.outcomeFinalSpeed.textContent = `${metrics.finalVelocity.toFixed(2)} m/s`;

  if (outcome.suggestedAdjustment) {
    els.outcomeSuggestionBox.classList.remove('hidden');
    els.outcomeSuggestion.textContent = outcome.suggestedAdjustment;
  } else {
    els.outcomeSuggestionBox.classList.add('hidden');
  }

  els.btnOutcomePreflight.classList.toggle('hidden', !isChallenge);

  const nextId = isSuccess ? state.activeScene?.nextLevelId : null;
  els.btnOutcomeNext.classList.toggle('hidden', !nextId);
  els.btnOutcomeNext.dataset.nextId = nextId || '';

  els.outcomeModal.classList.remove('hidden');
}

function updateProgressSummaries() {
  const tut = getModeSummary(state.progress, 'tutorial');
  const chal = getModeSummary(state.progress, 'challenge');
  const totalEarned = tut.earnedStars + chal.earnedStars;
  const totalMax = tut.maxStars + chal.maxStars;

  els.topbarStars.textContent = `${totalEarned} / ${totalMax} Stars`;
  els.tutorialUnlockStat.textContent = `${tut.unlockedCount} / ${tut.totalLevels}`;
  els.tutorialStarStat.textContent = `${tut.earnedStars} / ${tut.maxStars} ★`;
  els.challengeUnlockStat.textContent = `${chal.unlockedCount} / ${chal.totalLevels}`;
  els.challengeStarStat.textContent = `${chal.earnedStars} / ${chal.maxStars} ★`;

  const firstRun = isFirstPlaythrough(state.progress);
  els.firstPlayBanner.classList.toggle('hidden', !firstRun);
  els.tutorialRecommendTag.classList.toggle('hidden', !firstRun);
}

function renderLevelSelection(mode) {
  state.currentMode = mode;
  const levels = getLevelsByMode(mode);
  const summary = getModeSummary(state.progress, mode);
  const isTutorial = mode === 'tutorial';

  els.levelsBanner.classList.toggle('is-tutorial', isTutorial);
  els.levelsBanner.classList.toggle('is-challenge', !isTutorial);
  els.levelsModeBadge.textContent = isTutorial ? 'Tutorial Village' : 'Challenge Levels';
  els.levelsHeading.textContent = isTutorial ? 'Tutorial Village — PID Basics' : 'Challenge Levels — Flight Missions';
  els.levelsDescription.textContent = isTutorial
    ? 'Complete guided flight experiments to understand gravity, thrust, Kp, Ki, and Kd.'
    : 'Analyze mission payload, thrust, and wind conditions, tune Kp/Ki/Kd pre-flight, and fly with WASD.';
  els.levelsStarSummary.textContent = `${summary.earnedStars} / ${summary.maxStars} ★`;

  els.levelsGrid.innerHTML = '';

  for (const level of levels) {
    const unlocked = isLevelUnlocked(state.progress, level.id);
    const completed = isLevelCompleted(state.progress, level.id);
    const stars = getBestStars(state.progress, level.id);

    const statusClass = !unlocked ? 'locked' : completed ? 'completed' : 'unlocked';
    const statusText = !unlocked ? 'Locked' : completed ? 'Completed' : 'Unlocked';
    const actionHint = !unlocked
      ? 'Complete Previous'
      : isTutorial
        ? 'Start Lesson'
        : 'Pre-flight Setup';

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `level-card ${unlocked ? '' : 'is-locked'}`;
    card.dataset.levelId = level.id;

    card.innerHTML = `
      <div>
        <div class="level-card-top">
          <span class="level-difficulty">${level.difficulty}</span>
          <span class="lock-status ${statusClass}">${statusText}</span>
        </div>
        <h3>${level.name}</h3>
        <p class="level-focus"><strong>Focus:</strong> ${level.learningFocus}</p>
      </div>
      <div class="level-card-footer">
        <span class="stars-display" aria-label="${stars} of 3 stars">${renderStarsText(stars)}</span>
        <span class="level-action-hint">${actionHint}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      if (!unlocked) {
        showModal(
          'Level Locked',
          level.name,
          'Complete the previous mission in this mode to unlock this flight challenge.'
        );
        return;
      }

      const scene = getSceneById(level.id);
      if (scene) {
        if (scene.mode === 'challenge') {
          openPreflightTuning(scene);
        } else {
          launchScene(scene);
        }
        return;
      }

      showModal(
        `Scheduled for ${level.milestone}`,
        level.name,
        level.summary
      );
    });

    els.levelsGrid.appendChild(card);
  }
}

function syncSlidersFromGains(gains) {
  els.sliderKp.value = String(gains.kp);
  els.sliderKi.value = String(gains.ki);
  els.sliderKd.value = String(gains.kd);
  els.valKp.textContent = gains.kp.toFixed(1);
  els.valKi.textContent = gains.ki.toFixed(2);
  els.valKd.textContent = gains.kd.toFixed(1);

  els.preSliderKp.value = String(gains.kp);
  els.preSliderKi.value = String(gains.ki);
  els.preSliderKd.value = String(gains.kd);
  els.preValKp.textContent = gains.kp.toFixed(1);
  els.preValKi.textContent = gains.ki.toFixed(2);
  els.preValKd.textContent = gains.kd.toFixed(1);
}

function openPreflightTuning(scene) {
  hideOutcomeModal();
  state.activeScene = scene;

  const droneMass = scene.droneMass ?? 1.2;
  const payloadMass = scene.payloadMass ?? 0.0;
  const totalMass = droneMass + payloadMass;
  const maxThrust = scene.maxThrust ?? 28.0;
  const twr = maxThrust / (totalMass * 9.81);

  els.preflightTitle.textContent = scene.name;
  els.preflightDescription.textContent = scene.description || scene.objective;
  els.preflightObjective.textContent = scene.objective;
  els.preflightDroneMass.textContent = `${droneMass.toFixed(2)} kg`;
  els.preflightPayload.textContent =
    payloadMass > 0 ? `+${payloadMass.toFixed(2)} kg (${totalMass.toFixed(2)} kg total)` : '0.00 kg (Unladen)';
  els.preflightWind.textContent = scene.windLabel || 'Calm Air (0.0 N)';
  els.preflightMaxThrust.textContent = `${maxThrust.toFixed(1)} N (TWR ${twr.toFixed(2)})`;
  els.preflightMaxTilt.textContent = `${scene.maxTilt ?? 32} deg`;
  els.preflightTimeLimit.textContent = `${scene.timeLimit ?? 60} s`;

  const savedGains = state.tunedGainsByLevel[scene.id] || scene.initialPID || DEFAULT_PID_GAINS;
  state.tunedGainsByLevel[scene.id] = { ...savedGains };
  syncSlidersFromGains(savedGains);

  const prev = state.lastAttempts[scene.id];
  if (prev) {
    els.preflightPrevCard.classList.remove('hidden');
    els.preflightPrevStatus.textContent = prev.outcome.title;
    els.preflightPrevReason.textContent = prev.outcome.message;
    els.preflightPrevPid.textContent = formatGainsText(prev.metrics.pidParameters);
    els.preflightPrevTime.textContent = `${prev.metrics.completionTime.toFixed(1)} s`;
    els.preflightPrevOvershoot.textContent = `${prev.metrics.maxOvershoot.toFixed(2)} m`;
    els.preflightPrevError.textContent = `${prev.metrics.averageTrackingError.toFixed(2)} m`;
    els.preflightPrevSat.textContent = `${prev.metrics.controlSaturationDuration.toFixed(2)} s`;
    els.preflightPrevSpeed.textContent = `${prev.metrics.finalVelocity.toFixed(2)} m/s`;
  } else {
    els.preflightPrevCard.classList.add('hidden');
  }

  navigateTo('preflight');
}

function syncFlightControlsUi() {
  const isChallenge = state.activeScene?.mode === 'challenge';
  els.btnFlightPause.textContent = sim.paused ? 'Resume' : 'Pause';
  els.btnFlightPause.disabled = !sim.started || state.runFinished;

  els.sliderKp.disabled = isChallenge;
  els.sliderKi.disabled = isChallenge;
  els.sliderKd.disabled = isChallenge;
  els.btnResetPid.classList.toggle('hidden', isChallenge);
  els.btnOpenPreflight.classList.toggle('hidden', !isChallenge);

  if (!sim.started) {
    els.btnStartFlight.disabled = false;
    els.btnStartFlight.textContent = 'Start Flight';
  } else if (sim.paused) {
    els.btnStartFlight.disabled = false;
    els.btnStartFlight.textContent = 'Resume Flight';
  } else {
    els.btnStartFlight.disabled = true;
    els.btnStartFlight.textContent = 'In Flight';
  }
}

function renderTutorialGuide(scene) {
  const guide = scene?.tutorialGuide;
  if (!guide) {
    els.tutorialGuidePanel.classList.add('hidden');
    return;
  }

  els.tutorialGuidePanel.classList.remove('hidden');
  els.guideStemTopic.textContent = `STEM Topic: ${scene.stemTopic}`;
  els.guideObjective.textContent = guide.learningObjective;
  els.guideExplanation.textContent = guide.shortExplanation;
  els.guideExperiment.textContent = guide.interactiveExperiment;
  els.guideSuccess.textContent = guide.successConditions;
  els.guideSuggestion.textContent = `Tip: ${guide.suggestedAdjustment}`;
}

function renderMissionBriefing(scene) {
  if (scene?.mode === 'challenge') {
    els.challengeBriefingPanel.classList.remove('hidden');
    els.challengeBriefingText.textContent = scene.briefing || scene.objective;
    const totalRings = scene.rings?.length || 0;
    els.challengeCheckpointPill.classList.toggle('hidden', totalRings === 0);
    if (totalRings > 0) {
      els.challengeCheckpointPill.textContent = `Rings Cleared: 0 / ${totalRings}`;
    }
  } else {
    els.challengeBriefingPanel.classList.add('hidden');
  }
}

function updateFlightHud() {
  const snap = sim.getSnapshot();
  const limit = state.activeScene?.timeLimit;
  els.flightTimer.textContent = Number.isFinite(limit)
    ? `${snap.elapsedTime.toFixed(1)} / ${limit} s`
    : `${snap.elapsedTime.toFixed(1)} s`;

  const totalMass = getTotalMass(sim.config);
  const satFlag = snap.drone.thrust >= sim.config.maxThrust - 0.05 ? ' (SAT)' : '';
  els.flightPos.textContent = `${snap.drone.x.toFixed(2)} m, ${snap.drone.z.toFixed(2)} m`;
  els.flightSpeed.textContent = `${snap.drone.vx.toFixed(2)} m/s, ${snap.drone.vz.toFixed(2)} m/s`;
  els.flightThrust.textContent = `${snap.drone.thrust.toFixed(1)} / ${sim.config.maxThrust.toFixed(1)} N${satFlag}`;
  els.flightMass.textContent = `${totalMass.toFixed(2)} kg`;
  els.flightRef.textContent = `${snap.reference.x.toFixed(2)} m, ${snap.reference.z.toFixed(2)} m`;

  els.telP.textContent = `${snap.pid.x.pTerm.toFixed(1)} / ${snap.pid.z.pTerm.toFixed(1)}`;
  els.telI.textContent = `${snap.pid.x.iTerm.toFixed(1)} / ${snap.pid.z.iTerm.toFixed(1)}`;
  els.telD.textContent = `${snap.pid.x.dTerm.toFixed(1)} / ${snap.pid.z.dTerm.toFixed(1)}`;

  let statusLabel = 'Ready (Press Start or WASD)';
  els.flightStatus.className = 'status-pill';
  if (snap.paused) {
    statusLabel = 'Paused';
    els.flightStatus.classList.add('is-paused');
  } else if (snap.targetZone?.stabilized || snap.landingPad?.landedSafely) {
    statusLabel = 'Mission Complete!';
    els.flightStatus.classList.add('is-stabilized');
  } else if (snap.landingPad?.inside) {
    statusLabel = `On Helipad (${snap.landingPad.holdTimer.toFixed(1)}s)`;
  } else if (snap.targetZone?.inside) {
    statusLabel = `Inside Target (${snap.targetZone.holdTimer.toFixed(1)}s)`;
  } else if (satFlag) {
    statusLabel = 'Thrust Saturated!';
    els.flightStatus.classList.add('is-saturated');
  } else if (snap.started) {
    statusLabel = snap.drone.onGround ? 'Armed (On Ground)' : 'In Flight';
  }
  els.flightStatus.textContent = statusLabel;

  if (state.activeScene?.mode === 'tutorial') {
    const hint = evaluateTutorialCoaching(sim, state.activeScene);
    if (hint) {
      els.tutorialCoachBar.textContent = hint;
    }
  } else if (state.activeScene?.mode === 'challenge' && snap.rings.length > 0) {
    els.challengeCheckpointPill.textContent = `Rings Cleared: ${snap.nextRingIndex} / ${snap.rings.length}`;
  }
}

function handleSceneOutcomeIfNeeded() {
  const mode = state.activeScene?.mode;
  if (state.runFinished || (mode !== 'tutorial' && mode !== 'challenge')) return;

  const outcome = evaluateSceneOutcome(sim, state.activeScene);
  if (outcome.status === 'completed' || outcome.status === 'failed') {
    state.runFinished = true;
    sim.setPaused(true);
    input.clearMovementKeys();
    syncFlightControlsUi();

    const metrics = sim.getFlightMetrics();
    state.lastAttempts[state.activeScene.id] = { outcome, metrics };
    state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };

    if (outcome.status === 'completed') {
      state.progress = recordLevelCompletion(
        state.progress,
        state.activeScene.id,
        state.activeScene.nextLevelId
      );
      updateProgressSummaries();
    }

    showOutcomeModal(outcome, metrics);
  }
}

function flightLoop(timestamp) {
  if (state.currentView !== 'flight') {
    rafId = null;
    lastFrameTime = null;
    return;
  }

  if (lastFrameTime === null) {
    lastFrameTime = timestamp;
  }
  const rawDt = Math.max(0, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;

  if (!state.runFinished) {
    sim.stepFrame(rawDt, input.getAxes());
    handleSceneOutcomeIfNeeded();
  }
  renderer.render(sim, rawDt);
  updateFlightHud();

  rafId = window.requestAnimationFrame(flightLoop);
}

function startFlightLoop() {
  if (rafId !== null) return;
  lastFrameTime = null;
  rafId = window.requestAnimationFrame(flightLoop);
}

function stopFlightLoop() {
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastFrameTime = null;
}

function startPlaygroundFlight() {
  if (state.runFinished) return;
  if (!sim.started) {
    sim.startFlight();
  } else if (sim.paused) {
    sim.setPaused(false);
  }
  syncFlightControlsUi();
  updateFlightHud();
}

function restartFlight() {
  hideOutcomeModal();
  state.runFinished = false;
  input.clearMovementKeys();
  // Preserve player's current tuned PID gains on Restart so iterative tuning works naturally
  sim.reset(true);
  syncFlightControlsUi();
  updateFlightHud();
}

function togglePauseFlight() {
  if (!sim.started || state.runFinished) return;
  sim.togglePause();
  input.clearMovementKeys();
  syncFlightControlsUi();
  updateFlightHud();
}

function launchScene(scene, options = {}) {
  hideOutcomeModal();
  state.activeScene = scene;
  state.runFinished = false;

  if (options.gains) {
    sim.setGains(options.gains);
    sim.loadScene(scene, Boolean(options.autoStart), { preserveGains: true });
  } else {
    sim.loadScene(scene, Boolean(options.autoStart), { preserveGains: Boolean(options.preserveGains) });
  }

  els.flightLevelName.textContent = scene.name;
  els.flightObjective.textContent = scene.objective;
  els.btnFlightBack.innerHTML =
    scene.mode === 'tutorial'
      ? '&larr; Tutorials'
      : scene.mode === 'challenge'
        ? '&larr; Pre-flight'
        : '&larr; Modes';

  els.selectWind.value = sim.windMode;
  els.selectWind.disabled = scene.allowWindSelect === false;

  syncSlidersFromGains(sim.gains);
  renderTutorialGuide(scene);
  renderMissionBriefing(scene);
  syncFlightControlsUi();
  navigateTo('flight');
}

export function navigateTo(viewName, options = {}) {
  state.currentView = viewName;

  for (const [name, el] of Object.entries(els.views)) {
    el.classList.toggle('active', name === viewName);
  }

  els.topbar.classList.toggle('hidden', viewName === 'start' || viewName === 'flight');
  updateProgressSummaries();

  if (viewName === 'levels') {
    renderLevelSelection(options.mode || state.currentMode);
  }

  if (viewName === 'flight') {
    input.attach();
    renderer.render(sim, 0);
    updateFlightHud();
    startFlightLoop();
  } else {
    stopFlightLoop();
    input.detach();
  }
}

function bindEvents() {
  els.btnStartGame.addEventListener('click', () => navigateTo('modes'));
  els.btnHome.addEventListener('click', () => navigateTo('start'));
  els.btnEnterTutorials.addEventListener('click', () => navigateTo('levels', { mode: 'tutorial' }));
  els.btnEnterChallenges.addEventListener('click', () => navigateTo('levels', { mode: 'challenge' }));
  els.btnBackModes.addEventListener('click', () => navigateTo('modes'));
  els.btnLaunchPlayground.addEventListener('click', () => launchScene(PLAYGROUND_SCENE));

  els.btnPreflightBack.addEventListener('click', () => navigateTo('levels', { mode: 'challenge' }));

  const startFromPreflight = () => {
    const gains = state.tunedGainsByLevel[state.activeScene.id] || state.activeScene.initialPID || DEFAULT_PID_GAINS;
    launchScene(state.activeScene, { gains, autoStart: true });
  };
  els.btnPreStartFlight.addEventListener('click', startFromPreflight);
  els.btnPreStartFlight2.addEventListener('click', startFromPreflight);

  els.btnPreResetPid.addEventListener('click', () => {
    const defaults = { ...(state.activeScene?.initialPID || DEFAULT_PID_GAINS) };
    state.tunedGainsByLevel[state.activeScene.id] = defaults;
    syncSlidersFromGains(defaults);
  });

  const handlePreflightSliderInput = () => {
    const gains = {
      kp: Number(els.preSliderKp.value),
      ki: Number(els.preSliderKi.value),
      kd: Number(els.preSliderKd.value)
    };
    state.tunedGainsByLevel[state.activeScene.id] = gains;
    syncSlidersFromGains(gains);
  };
  els.preSliderKp.addEventListener('input', handlePreflightSliderInput);
  els.preSliderKi.addEventListener('input', handlePreflightSliderInput);
  els.preSliderKd.addEventListener('input', handlePreflightSliderInput);

  els.btnFlightBack.addEventListener('click', () => {
    hideOutcomeModal();
    if (state.activeScene?.mode === 'challenge') {
      state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };
      openPreflightTuning(state.activeScene);
    } else if (state.activeScene?.mode === 'tutorial') {
      navigateTo('levels', { mode: 'tutorial' });
    } else {
      navigateTo('modes');
    }
  });

  els.btnOpenPreflight.addEventListener('click', () => {
    hideOutcomeModal();
    state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };
    openPreflightTuning(state.activeScene);
  });

  els.btnStartFlight.addEventListener('click', startPlaygroundFlight);
  els.btnFlightPause.addEventListener('click', togglePauseFlight);
  els.btnFlightRestart.addEventListener('click', restartFlight);

  els.btnResetPid.addEventListener('click', () => {
    const defaults = sim.resetGains();
    syncSlidersFromGains(defaults);
  });

  const handleSliderInput = () => {
    const kp = Number(els.sliderKp.value);
    const ki = Number(els.sliderKi.value);
    const kd = Number(els.sliderKd.value);
    sim.setGains({ kp, ki, kd });
    syncSlidersFromGains(sim.gains);
  };

  els.sliderKp.addEventListener('input', handleSliderInput);
  els.sliderKi.addEventListener('input', handleSliderInput);
  els.sliderKd.addEventListener('input', handleSliderInput);

  els.selectWind.addEventListener('change', () => {
    sim.setWindMode(els.selectWind.value);
  });

  els.btnOutcomeRetry.addEventListener('click', restartFlight);
  els.btnOutcomePreflight.addEventListener('click', () => {
    hideOutcomeModal();
    openPreflightTuning(state.activeScene);
  });
  els.btnOutcomeLevels.addEventListener('click', () => {
    hideOutcomeModal();
    const backMode = state.activeScene?.mode === 'challenge' ? 'challenge' : 'tutorial';
    navigateTo('levels', { mode: backMode });
  });
  els.btnOutcomeNext.addEventListener('click', () => {
    const nextId = els.btnOutcomeNext.dataset.nextId;
    const nextScene = getSceneById(nextId);
    if (nextScene) {
      if (nextScene.mode === 'challenge') {
        openPreflightTuning(nextScene);
      } else {
        launchScene(nextScene);
      }
    }
  });

  els.btnCloseModal.addEventListener('click', hideModal);
  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) hideModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.modal.classList.contains('hidden')) {
      hideModal();
    }
  });
}

bindEvents();
syncSlidersFromGains(DEFAULT_PID_GAINS);
navigateTo('start');
