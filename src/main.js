import { getLevelsByMode } from './levels.js';
import {
  loadProgress,
  isLevelUnlocked,
  isLevelCompleted,
  getBestStars,
  isFirstPlaythrough,
  getModeSummary,
  recordLevelResult,
  getBestPidReference
} from './storage.js';
import { InputController } from './input.js';
import { FlightSimulation, DEFAULT_PID_GAINS } from './simulation.js';
import { FlightRenderer, renderRouteFitPreview } from './renderer.js';
import { getTotalMass } from './physics.js';
import {
  PLAYGROUND_SCENE,
  getSceneById,
  evaluateTutorialCoaching,
  evaluateSceneOutcome
} from './scenes.js';
import { evaluatePidCoaching, evaluatePostFlightFeedback } from './coach.js';
import { scoreFlightRun } from './scoring.js';

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
    flight: document.getElementById('view-flight'),
    result: document.getElementById('view-result')
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
  preflightPrevKnowledge: document.getElementById('preflight-prev-knowledge'),
  preflightNewChallenge: document.getElementById('preflight-new-challenge'),
  preflightLearningObj: document.getElementById('preflight-learning-obj'),
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
  preZoneKp: document.getElementById('pre-zone-kp'),
  preZoneKi: document.getElementById('pre-zone-ki'),
  preZoneKd: document.getElementById('pre-zone-kd'),
  preTrackKp: document.getElementById('pre-track-kp'),
  preTrackKi: document.getElementById('pre-track-ki'),
  preTrackKd: document.getElementById('pre-track-kd'),

  // PIP Coach Card
  pipCoachCard: document.getElementById('pip-coach-card'),
  pipStateBadge: document.getElementById('pip-state-badge'),
  pipHeadline: document.getElementById('pip-headline'),
  pipMessages: document.getElementById('pip-messages'),

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

  // Result Screen elements (M4)
  resultBadge: document.getElementById('result-badge'),
  resultTitle: document.getElementById('result-title'),
  resultLevelSubtitle: document.getElementById('result-level-subtitle'),
  resultStarsDisplay: document.getElementById('result-stars-display'),
  resultStarLabel: document.getElementById('result-star-label'),
  resultTime: document.getElementById('result-time'),
  resultOvershoot: document.getElementById('result-overshoot'),
  resultSettling: document.getElementById('result-settling'),
  resultRouteFit: document.getElementById('result-route-fit'),
  resultSmoothness: document.getElementById('result-smoothness'),
  resultAvgError: document.getElementById('result-avg-error'),
  resultSaturation: document.getElementById('result-saturation'),
  resultPid: document.getElementById('result-pid'),
  resultRouteCanvas: document.getElementById('result-route-canvas'),
  resultChecks2Star: document.getElementById('result-checks-2star'),
  resultChecks3Star: document.getElementById('result-checks-3star'),
  resultPipTitle: document.getElementById('result-pip-title'),
  resultPipExplanation: document.getElementById('result-pip-explanation'),
  resultPipTip: document.getElementById('result-pip-tip'),
  resultBestRef: document.getElementById('result-best-ref'),
  btnResultLevels: document.getElementById('btn-result-levels'),
  btnResultPreflight: document.getElementById('btn-result-preflight'),
  btnResultRetry: document.getElementById('btn-result-retry'),
  btnResultNext: document.getElementById('btn-result-next'),

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
let pipDebounceTimer = null;

function isAnyModalOpen() {
  return !els.modal.classList.contains('hidden');
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

function formatGainsText(gains) {
  return `${gains.kp.toFixed(1)} / ${gains.ki.toFixed(2)} / ${gains.kd.toFixed(1)}`;
}

function renderZoneHint(pillEl, trackEl, zone) {
  const labels = { low: 'Low', recommended: 'Recommended', high: 'High' };
  pillEl.textContent = labels[zone] || 'Low';
  pillEl.className = `zone-pill zone-${zone}`;
  for (const seg of trackEl.querySelectorAll('span')) {
    seg.classList.toggle('is-active', seg.dataset.zone === zone);
  }
}

function renderPipCoaching(gains, scene) {
  const analysis = evaluatePidCoaching(gains, scene);

  renderZoneHint(els.preZoneKp, els.preTrackKp, analysis.zones.kp);
  renderZoneHint(els.preZoneKi, els.preTrackKi, analysis.zones.ki);
  renderZoneHint(els.preZoneKd, els.preTrackKd, analysis.zones.kd);

  const stateLabels = {
    welcome: 'Welcome',
    teaching: 'Teaching',
    warning: 'Warning',
    ready: 'Ready'
  };

  els.pipCoachCard.className = `pip-card pip-${analysis.state}`;
  els.pipStateBadge.textContent = stateLabels[analysis.state] || 'Coach';
  els.pipHeadline.textContent = analysis.headline;
  els.pipMessages.innerHTML = '';
  for (const msg of analysis.messages) {
    const li = document.createElement('li');
    li.textContent = msg;
    els.pipMessages.appendChild(li);
  }
}

function schedulePipUpdate(gains, scene) {
  if (pipDebounceTimer) {
    window.clearTimeout(pipDebounceTimer);
  }
  pipDebounceTimer = window.setTimeout(() => {
    pipDebounceTimer = null;
    renderPipCoaching(gains, scene);
  }, 140);
}

function renderCriteriaList(ulEl, checks) {
  ulEl.innerHTML = '';
  for (const c of checks) {
    const li = document.createElement('li');
    li.className = c.passed ? 'is-pass' : 'is-fail';
    li.textContent = `${c.passed ? '✓' : '✗'} ${c.label}`;
    ulEl.appendChild(li);
  }
}

function showResultScreen(outcome, metrics, scoreResult) {
  const isSuccess = outcome.status === 'completed';
  const isChallenge = state.activeScene?.mode === 'challenge';

  els.resultBadge.textContent = isSuccess ? 'Mission Complete' : 'Mission Failed';
  els.resultTitle.textContent = outcome.title;
  els.resultLevelSubtitle.textContent = `${state.activeScene.name} — ${outcome.message}`;

  els.resultStarsDisplay.textContent = renderStarsText(scoreResult.stars);
  els.resultStarsDisplay.setAttribute('aria-label', `${scoreResult.stars} of 3 stars`);
  els.resultStarLabel.textContent = scoreResult.summaryLabel;

  els.resultTime.textContent = `${metrics.completionTime.toFixed(1)} s`;
  els.resultOvershoot.textContent = `${metrics.maxOvershoot.toFixed(2)} m`;
  els.resultSettling.textContent = `${metrics.settlingTime.toFixed(1)} s`;
  els.resultRouteFit.textContent = `${metrics.pathFitScore.toFixed(0)}% (${metrics.pathDeviation.toFixed(2)} m dev)`;
  els.resultSmoothness.textContent = `${metrics.flightSmoothness.toFixed(0)}%`;
  els.resultAvgError.textContent = `${metrics.averageTrackingError.toFixed(2)} m`;
  els.resultSaturation.textContent = `${metrics.controlSaturationDuration.toFixed(2)} s`;
  els.resultPid.textContent = formatGainsText(metrics.pidParameters);

  renderCriteriaList(els.resultChecks2Star, scoreResult.checks2Star);
  renderCriteriaList(els.resultChecks3Star, scoreResult.checks3Star);

  const debrief = evaluatePostFlightFeedback(outcome, metrics, state.activeScene);
  els.resultPipTitle.textContent = debrief.title;
  els.resultPipExplanation.textContent = debrief.explanation;
  els.resultPipTip.textContent = debrief.tip;

  const bestRef = getBestPidReference(state.progress, state.activeScene?.id);
  if (isChallenge && bestRef) {
    els.resultBestRef.classList.remove('hidden');
    els.resultBestRef.textContent = `Best Recorded PID (reference only): Kp ${bestRef.kp.toFixed(1)} / Ki ${bestRef.ki.toFixed(2)} / Kd ${bestRef.kd.toFixed(1)}`;
  } else {
    els.resultBestRef.classList.add('hidden');
  }

  els.btnResultPreflight.classList.toggle('hidden', !isChallenge);
  const nextId = isSuccess ? state.activeScene?.nextLevelId : null;
  els.btnResultNext.classList.toggle('hidden', !nextId);
  els.btnResultNext.dataset.nextId = nextId || '';

  navigateTo('result');
  renderRouteFitPreview(els.resultRouteCanvas, sim);
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
  els.levelsHeading.textContent = isTutorial ? 'Tutorial Village — PID Basics' : 'Challenge Levels — Progressive Missions';
  els.levelsDescription.textContent = isTutorial
    ? 'Complete guided flight experiments to understand gravity, thrust, Kp, Ki, and Kd.'
    : 'Each mission starts at zero PID—analyze conditions, tune with PIP, and fly manually with WASD.';
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
        : 'Tune & Fly';

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
          openPreflightTuning(scene, { resetToZero: true });
        } else {
          launchScene(scene);
        }
        return;
      }

      showModal(`Scheduled for ${level.milestone}`, level.name, level.summary);
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

function openPreflightTuning(scene, options = {}) {
  state.activeScene = scene;

  const droneMass = scene.droneMass ?? 1.2;
  const payloadMass = scene.payloadMass ?? 0.0;
  const totalMass = droneMass + payloadMass;
  const maxThrust = scene.maxThrust ?? 28.0;
  const twr = maxThrust / (totalMass * 9.81);

  els.preflightTitle.textContent = scene.name;
  els.preflightDescription.textContent = scene.flightConditions || scene.description || scene.objective;
  els.preflightObjective.textContent = scene.missionGoal || scene.objective;
  els.preflightPrevKnowledge.textContent = scene.whatYouLearnedBefore || 'Standard WASD closed-loop control.';
  els.preflightNewChallenge.textContent = scene.newChallenge || scene.description;
  els.preflightLearningObj.textContent = scene.learningObjective ? `Objective: ${scene.learningObjective}` : '';

  els.preflightDroneMass.textContent = `${droneMass.toFixed(2)} kg`;
  els.preflightPayload.textContent =
    payloadMass > 0 ? `+${payloadMass.toFixed(2)} kg (${totalMass.toFixed(2)} kg total)` : '0.00 kg (Unladen)';
  els.preflightWind.textContent = scene.windLabel || 'Calm Air (0.0 N)';
  els.preflightMaxThrust.textContent = `${maxThrust.toFixed(1)} N (TWR ${twr.toFixed(2)})`;
  els.preflightMaxTilt.textContent = `${scene.maxTilt ?? 32} deg`;
  els.preflightTimeLimit.textContent = `${scene.timeLimit ?? 60} s`;

  let gainsToUse;
  if (options.resetToZero) {
    gainsToUse = { kp: 0, ki: 0, kd: 0 };
    delete state.lastAttempts[scene.id];
  } else {
    gainsToUse = state.tunedGainsByLevel[scene.id] || { kp: 0, ki: 0, kd: 0 };
  }

  state.tunedGainsByLevel[scene.id] = { ...gainsToUse };
  syncSlidersFromGains(gainsToUse);
  renderPipCoaching(gainsToUse, scene);

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
    const scoreResult = scoreFlightRun(outcome, metrics, state.activeScene.id);

    state.lastAttempts[state.activeScene.id] = { outcome, metrics, scoreResult };
    state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };

    if (outcome.status === 'completed') {
      state.progress = recordLevelResult(
        state.progress,
        state.activeScene.id,
        {
          completed: true,
          stars: scoreResult.stars,
          pidParameters: metrics.pidParameters,
          metrics
        },
        state.activeScene.nextLevelId
      );
      updateProgressSummaries();
    }

    showResultScreen(outcome, metrics, scoreResult);
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
  if (state.currentView === 'flight') {
    renderer.render(sim, rawDt);
    updateFlightHud();
    rafId = window.requestAnimationFrame(flightLoop);
  }
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
  state.runFinished = false;
  input.clearMovementKeys();
  // Preserve player's current tuned PID gains on Retry within the same level
  sim.reset(true);
  syncFlightControlsUi();
  if (state.currentView !== 'flight') {
    navigateTo('flight');
  } else {
    updateFlightHud();
  }
}

function togglePauseFlight() {
  if (!sim.started || state.runFinished) return;
  sim.togglePause();
  input.clearMovementKeys();
  syncFlightControlsUi();
  updateFlightHud();
}

function launchScene(scene, options = {}) {
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
    const gains = state.tunedGainsByLevel[state.activeScene.id] || { kp: 0, ki: 0, kd: 0 };
    launchScene(state.activeScene, { gains, autoStart: true });
  };
  els.btnPreStartFlight.addEventListener('click', startFromPreflight);
  els.btnPreStartFlight2.addEventListener('click', startFromPreflight);

  els.btnPreResetPid.addEventListener('click', () => {
    const zeroGains = { kp: 0, ki: 0, kd: 0 };
    state.tunedGainsByLevel[state.activeScene.id] = zeroGains;
    syncSlidersFromGains(zeroGains);
    renderPipCoaching(zeroGains, state.activeScene);
  });

  const handlePreflightSliderInput = () => {
    const gains = {
      kp: Number(els.preSliderKp.value),
      ki: Number(els.preSliderKi.value),
      kd: Number(els.preSliderKd.value)
    };
    state.tunedGainsByLevel[state.activeScene.id] = gains;
    syncSlidersFromGains(gains);
    schedulePipUpdate(gains, state.activeScene);
  };
  els.preSliderKp.addEventListener('input', handlePreflightSliderInput);
  els.preSliderKi.addEventListener('input', handlePreflightSliderInput);
  els.preSliderKd.addEventListener('input', handlePreflightSliderInput);

  els.btnFlightBack.addEventListener('click', () => {
    if (state.activeScene?.mode === 'challenge') {
      state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };
      openPreflightTuning(state.activeScene, { resetToZero: false });
    } else if (state.activeScene?.mode === 'tutorial') {
      navigateTo('levels', { mode: 'tutorial' });
    } else {
      navigateTo('modes');
    }
  });

  els.btnOpenPreflight.addEventListener('click', () => {
    state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };
    openPreflightTuning(state.activeScene, { resetToZero: false });
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

  // Result Screen actions
  els.btnResultRetry.addEventListener('click', restartFlight);
  els.btnResultPreflight.addEventListener('click', () => {
    openPreflightTuning(state.activeScene, { resetToZero: false });
  });
  els.btnResultLevels.addEventListener('click', () => {
    const backMode = state.activeScene?.mode === 'challenge' ? 'challenge' : 'tutorial';
    navigateTo('levels', { mode: backMode });
  });
  els.btnResultNext.addEventListener('click', () => {
    const nextId = els.btnResultNext.dataset.nextId;
    const nextScene = getSceneById(nextId);
    if (nextScene) {
      if (nextScene.mode === 'challenge') {
        openPreflightTuning(nextScene, { resetToZero: true });
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
