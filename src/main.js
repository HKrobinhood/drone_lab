import { getLevelsByMode } from './levels.js';
import {
  loadProgress,
  isLevelUnlocked,
  isLevelCompleted,
  getBestStars,
  isFirstPlaythrough,
  getModeSummary,
  recordLevelResult,
  getBestPidReference,
  hasSeenPipIntro,
  markPipIntroSeen
} from './storage.js';
import { InputController } from './input.js';
import {
  FlightSimulation,
  DEFAULT_PID_GAINS,
  PID_SLIDER_BOUNDS,
  getSceneInitialGains
} from './simulation.js';
import { FlightRenderer, renderRouteFitPreview, renderTelemetryTimeSeriesPlot } from './renderer.js';
import { getTotalMass } from './physics.js';
import {
  PLAYGROUND_SCENE,
  getSceneById,
  evaluateSceneOutcome
} from './scenes.js';
import {
  evaluatePidCoaching,
  evaluateLiveFlightCoaching
} from './coach.js';
import { generatePipDiagnosticReport } from './feedback.js';
import { scoreFlightRun } from './scoring.js';
import { TutorialGuideEngine, PIP_INTRO_SCRIPT } from './tutorial_guide.js';
import { TutorialSpotlightOverlay } from './guide_overlay.js';
import { renderPipRobotSvg, resolvePipMood, getStemVisualAid } from './visual_aids.js';

const state = {
  currentView: 'start',
  currentMode: 'tutorial',
  activeScene: PLAYGROUND_SCENE,
  runFinished: false,
  progress: loadProgress(),
  tunedGainsByLevel: {},
  baselineGainsByLevel: {},
  lastAttempts: {},
  pipIntroIndex: 0,
  pipIntroOpen: false
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
  btnMeetPip: document.getElementById('btn-meet-pip'),
  pipIntroPanel: document.getElementById('pip-intro-panel'),
  pipIntroAvatar: document.getElementById('pip-intro-avatar'),
  pipIntroMoodBadge: document.getElementById('pip-intro-mood-badge'),
  pipIntroStepCount: document.getElementById('pip-intro-step-count'),
  pipIntroLine: document.getElementById('pip-intro-line'),
  btnPipIntroSkip: document.getElementById('btn-pip-intro-skip'),
  btnPipIntroNext: document.getElementById('btn-pip-intro-next'),

  // Pre-flight Briefing & Tuning elements
  btnPreflightBack: document.getElementById('btn-preflight-back'),
  btnPreflightMeetPip: document.getElementById('btn-preflight-meet-pip'),
  btnPreflightReopenGuide: document.getElementById('btn-preflight-reopen-guide'),
  btnPreStartFlight: document.getElementById('btn-pre-start-flight'),
  btnPreStartFlight2: document.getElementById('btn-pre-start-flight-2'),
  btnPreResetPid: document.getElementById('btn-pre-reset-pid'),
  preflightModeBadge: document.getElementById('preflight-mode-badge'),
  preflightTitle: document.getElementById('preflight-title'),
  preflightDescription: document.getElementById('preflight-description'),
  preflightLearningFocus: document.getElementById('preflight-learning-focus'),
  preflightObjective: document.getElementById('preflight-objective'),
  preflightSuccessReq: document.getElementById('preflight-success-req'),
  preflightConditions: document.getElementById('preflight-conditions'),
  preflightPrevKnowledge: document.getElementById('preflight-prev-knowledge'),
  preflightNewChallenge: document.getElementById('preflight-new-challenge'),
  preflightLearningObj: document.getElementById('preflight-learning-obj'),
  preflightDroneMass: document.getElementById('preflight-drone-mass'),
  preflightPayload: document.getElementById('preflight-payload'),
  preflightWind: document.getElementById('preflight-wind'),
  preflightMaxThrust: document.getElementById('preflight-max-thrust'),
  preflightMaxTilt: document.getElementById('preflight-max-tilt'),
  preflightTimeLimit: document.getElementById('preflight-time-limit'),
  preflightVisualAid: document.getElementById('preflight-visual-aid'),
  preflightVisualTitle: document.getElementById('preflight-visual-title'),
  preflightVisualSvg: document.getElementById('preflight-visual-svg'),
  preflightLearnMoreText: document.getElementById('preflight-learn-more-text'),
  preflightPrevCard: document.getElementById('preflight-prev-card'),
  preflightPrevStatus: document.getElementById('preflight-prev-status'),
  preflightPrevReason: document.getElementById('preflight-prev-reason'),
  preflightPrevPid: document.getElementById('preflight-prev-pid'),
  preflightPrevTime: document.getElementById('preflight-prev-time'),
  preflightPrevOvershoot: document.getElementById('preflight-prev-overshoot'),
  preflightPrevError: document.getElementById('preflight-prev-error'),
  preflightPrevSat: document.getElementById('preflight-prev-sat'),
  preflightPrevSpeed: document.getElementById('preflight-prev-speed'),
  prePidBadge: document.getElementById('pre-pid-badge'),
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

  // PIP Coach Cards (Pre-flight + Flight unified)
  prePipCard: {
    card: document.getElementById('pip-coach-card'),
    avatar: document.querySelector('#pip-coach-card .pip-avatar-wrap'),
    badge: document.getElementById('pip-state-badge'),
    headline: document.getElementById('pip-headline'),
    messages: document.getElementById('pip-messages')
  },
  flightPipCard: {
    card: document.getElementById('flight-pip-card'),
    avatar: document.querySelector('#flight-pip-card .pip-avatar-wrap'),
    badge: document.getElementById('flight-pip-state-badge'),
    headline: document.getElementById('flight-pip-headline'),
    messages: document.getElementById('flight-pip-messages')
  },

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
  flightPidBadge: document.getElementById('flight-pid-badge'),
  sliderKp: document.getElementById('slider-kp'),
  sliderKi: document.getElementById('slider-ki'),
  sliderKd: document.getElementById('slider-kd'),
  valKp: document.getElementById('val-kp'),
  valKi: document.getElementById('val-ki'),
  valKd: document.getElementById('val-kd'),
  flightZoneKp: document.getElementById('flight-zone-kp'),
  flightZoneKi: document.getElementById('flight-zone-ki'),
  flightZoneKd: document.getElementById('flight-zone-kd'),
  flightTrackKp: document.getElementById('flight-track-kp'),
  flightTrackKi: document.getElementById('flight-track-ki'),
  flightTrackKd: document.getElementById('flight-track-kd'),
  flightWindGroup: document.getElementById('flight-wind-group'),
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

  // Unified Flight Briefing & Drone Specs Summary
  flightBriefingEyebrow: document.getElementById('flight-briefing-eyebrow'),
  flightBriefingText: document.getElementById('flight-briefing-text'),
  flightSpecSummary: document.getElementById('flight-spec-summary'),
  challengeCheckpointPill: document.getElementById('challenge-checkpoint-pill'),
  btnFlightReopenGuide: document.getElementById('btn-flight-reopen-guide'),

  // Result Screen elements (M4 + M4.1 mode config)
  resultBadge: document.getElementById('result-badge'),
  resultTitle: document.getElementById('result-title'),
  resultLevelSubtitle: document.getElementById('result-level-subtitle'),
  resultStarsBox: document.getElementById('result-stars-box'),
  resultStarsDisplay: document.getElementById('result-stars-display'),
  resultStarLabel: document.getElementById('result-star-label'),
  resultTutorialOutcomeBox: document.getElementById('result-tutorial-outcome-box'),
  resultTutorialStatusIcon: document.getElementById('result-tutorial-status-icon'),
  resultTutorialStatusLabel: document.getElementById('result-tutorial-status-label'),
  resultTime: document.getElementById('result-time'),
  resultOvershoot: document.getElementById('result-overshoot'),
  resultSettling: document.getElementById('result-settling'),
  resultRouteFit: document.getElementById('result-route-fit'),
  resultSmoothness: document.getElementById('result-smoothness'),
  resultAvgError: document.getElementById('result-avg-error'),
  resultSaturation: document.getElementById('result-saturation'),
  resultPid: document.getElementById('result-pid'),
  resultPrevLegend: document.getElementById('result-prev-legend'),
  resultRouteCanvas: document.getElementById('result-route-canvas'),
  resultTelemetryCanvas: document.getElementById('result-telemetry-canvas'),
  resultRatingCard: document.getElementById('result-rating-card'),
  resultChecks2Star: document.getElementById('result-checks-2star'),
  resultChecks3Star: document.getElementById('result-checks-3star'),
  resultTutorialCard: document.getElementById('result-tutorial-card'),
  resultTutHeading: document.getElementById('result-tut-heading'),
  resultTutObjective: document.getElementById('result-tut-objective'),
  resultTutPracticeStars: document.getElementById('result-tut-practice-stars'),
  resultPipAvatar: document.getElementById('result-pip-avatar'),
  resultPipTitle: document.getElementById('result-pip-title'),
  resultPipHeadline: document.getElementById('result-pip-headline'),
  resultPipExplanation: document.getElementById('result-pip-explanation'),
  resultPipLessonNote: document.getElementById('result-pip-lesson-note'),
  resultPipComparison: document.getElementById('result-pip-comparison'),
  resultDiagList: document.getElementById('result-diag-list'),
  resultPipTip: document.getElementById('result-pip-tip'),
  resultPipAdviceList: document.getElementById('result-pip-advice-list'),
  resultBestRef: document.getElementById('result-best-ref'),
  btnResultLevels: document.getElementById('btn-result-levels'),
  btnResultPreflight: document.getElementById('btn-result-preflight'),
  btnResultRetry: document.getElementById('btn-result-retry'),
  btnResultChallenges: document.getElementById('btn-result-challenges'),
  btnResultNext: document.getElementById('btn-result-next'),

  modal: document.getElementById('notice-modal'),
  modalEyebrow: document.getElementById('modal-eyebrow'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  btnCloseModal: document.getElementById('btn-close-modal')
};

const sim = new FlightSimulation();
const renderer = new FlightRenderer(els.flightCanvas);
const tutorialGuide = new TutorialGuideEngine();
let tutorialOverlay = null;

let rafId = null;
let lastFrameTime = null;
let pipDebounceTimer = null;
let lastGuideRenderSig = '';
let lastFlightPipSig = '';

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

// ==================== UNIFIED PID PANEL MANAGEMENT ====================
const PID_PANEL_GROUPS = [
  {
    sliders: { kp: els.preSliderKp, ki: els.preSliderKi, kd: els.preSliderKd },
    outputs: { kp: els.preValKp, ki: els.preValKi, kd: els.preValKd },
    zones: { kp: els.preZoneKp, ki: els.preZoneKi, kd: els.preZoneKd },
    tracks: { kp: els.preTrackKp, ki: els.preTrackKi, kd: els.preTrackKd }
  },
  {
    sliders: { kp: els.sliderKp, ki: els.sliderKi, kd: els.sliderKd },
    outputs: { kp: els.valKp, ki: els.valKi, kd: els.valKd },
    zones: { kp: els.flightZoneKp, ki: els.flightZoneKi, kd: els.flightZoneKd },
    tracks: { kp: els.flightTrackKp, ki: els.flightTrackKi, kd: els.flightTrackKd }
  }
];

function applySharedSliderBounds() {
  for (const group of PID_PANEL_GROUPS) {
    for (const axis of ['kp', 'ki', 'kd']) {
      const b = PID_SLIDER_BOUNDS[axis];
      const inputEl = group.sliders[axis];
      if (!inputEl || !b) continue;
      inputEl.min = String(b.min);
      inputEl.max = String(b.max);
      inputEl.step = String(b.step);
    }
  }
}

function renderZoneHint(pillEl, trackEl, zone) {
  if (!pillEl || !trackEl) return;
  const labels = { low: 'Low', recommended: 'Recommended', high: 'High' };
  pillEl.textContent = labels[zone] || 'Low';
  pillEl.className = `zone-pill zone-${zone}`;
  for (const seg of trackEl.querySelectorAll('span')) {
    seg.classList.toggle('is-active', seg.dataset.zone === zone);
  }
}

function syncAllPidPanels(gains, scene = state.activeScene) {
  const analysis = evaluatePidCoaching(gains, scene);
  for (const group of PID_PANEL_GROUPS) {
    group.sliders.kp.value = String(gains.kp);
    group.sliders.ki.value = String(gains.ki);
    group.sliders.kd.value = String(gains.kd);
    group.outputs.kp.textContent = gains.kp.toFixed(1);
    group.outputs.ki.textContent = gains.ki.toFixed(2);
    group.outputs.kd.textContent = gains.kd.toFixed(1);
    renderZoneHint(group.zones.kp, group.tracks.kp, analysis.zones.kp);
    renderZoneHint(group.zones.ki, group.tracks.ki, analysis.zones.ki);
    renderZoneHint(group.zones.kd, group.tracks.kd, analysis.zones.kd);
  }
  return analysis;
}

function renderPipCard(cardEls, coachData) {
  if (!cardEls?.card || !coachData) return;
  const stateLabels = {
    welcome: 'Welcome',
    teaching: 'Teaching',
    warning: 'Warning',
    ready: 'Ready',
    success: 'Complete'
  };
  const mood = coachData.mood || resolvePipMood(coachData.state);
  const baseClass = cardEls === els.flightPipCard ? 'pip-card pip-card-compact' : 'pip-card';
  cardEls.card.className = `${baseClass} pip-${coachData.state || 'teaching'} pip-expr-${mood}`;
  if (cardEls.avatar) {
    cardEls.avatar.innerHTML = renderPipRobotSvg(mood);
  }
  cardEls.badge.textContent = stateLabels[coachData.state] || 'Coach';
  cardEls.headline.textContent = coachData.headline;
  cardEls.messages.innerHTML = '';
  for (const msg of coachData.messages || []) {
    const li = document.createElement('li');
    li.textContent = msg;
    cardEls.messages.appendChild(li);
  }
}

// ==================== PIP INTRODUCTION FLOW ====================
function renderPipIntroSlide() {
  const slide = PIP_INTRO_SCRIPT[state.pipIntroIndex] || PIP_INTRO_SCRIPT[0];
  els.pipIntroAvatar.innerHTML = renderPipRobotSvg(slide.mood, 'pip-intro-svg');
  els.pipIntroMoodBadge.textContent = slide.badge;
  els.pipIntroStepCount.textContent = `${state.pipIntroIndex + 1} / ${PIP_INTRO_SCRIPT.length}`;
  els.pipIntroLine.textContent = slide.text;
  els.btnPipIntroNext.textContent =
    state.pipIntroIndex >= PIP_INTRO_SCRIPT.length - 1 ? "Let's Start!" : 'Next →';
}

function openPipIntro(forceReplay = false) {
  if (!forceReplay && hasSeenPipIntro(state.progress)) {
    closePipIntro(false);
    return;
  }
  state.pipIntroIndex = 0;
  state.pipIntroOpen = true;
  renderPipIntroSlide();
  els.pipIntroPanel.classList.remove('hidden');
}

function closePipIntro(persistSeen = true) {
  state.pipIntroOpen = false;
  els.pipIntroPanel.classList.add('hidden');
  if (persistSeen && !hasSeenPipIntro(state.progress)) {
    state.progress = markPipIntroSeen(state.progress);
  }
}

function applyPidGains(rawGains, scene = state.activeScene) {
  sim.setGains(rawGains);
  const gains = { ...sim.gains };
  if (scene?.id) {
    state.tunedGainsByLevel[scene.id] = { ...gains };
  }
  const analysis = syncAllPidPanels(gains, scene);
  renderPreflightPipWithTutorialBrief(analysis, scene);

  if (scene?.mode === 'tutorial' && tutorialGuide.active) {
    const baseline = state.baselineGainsByLevel[scene.id];
    const advanced = tutorialGuide.recordPidAdjustment(gains, baseline);
    if (advanced) {
      syncTutorialOverlay(true);
    } else if (state.currentView === 'preflight') {
      syncTutorialOverlay(true);
    }
  }
  return gains;
}

function renderPreflightPipWithTutorialBrief(analysis, scene = state.activeScene) {
  if (scene?.mode === 'tutorial' && scene.pipMetricBrief && analysis.state !== 'warning') {
    const metricsBadge = scene.measuredMetrics?.length
      ? `Metrics focus: ${scene.measuredMetrics.join(' · ')}`
      : null;
    renderPipCard(els.prePipCard, {
      ...analysis,
      mood: 'explaining',
      headline: scene.id === 'tutorial-1' ? 'Hi Pilot! WASD & Lesson Metrics' : `Lesson Focus: ${scene.stemTopic}`,
      messages: metricsBadge ? [scene.pipMetricBrief, metricsBadge] : [scene.pipMetricBrief]
    });
    return;
  }
  renderPipCard(els.prePipCard, analysis);
}

function resetScenePid(scene = state.activeScene) {
  const initial = getSceneInitialGains(scene);
  if (scene?.id) {
    state.baselineGainsByLevel[scene.id] = { ...initial };
  }
  const gains = applyPidGains(initial, scene);
  if (state.currentView === 'flight') {
    updateFlightPipCard(true);
  }
  return gains;
}

function schedulePipUpdate(gains, scene) {
  if (pipDebounceTimer) {
    window.clearTimeout(pipDebounceTimer);
  }
  pipDebounceTimer = window.setTimeout(() => {
    pipDebounceTimer = null;
    const analysis = syncAllPidPanels(gains, scene);
    renderPreflightPipWithTutorialBrief(analysis, scene);
  }, 120);
}

// ==================== TUTORIAL SPOTLIGHT SYNC ====================
function getTutorialSafetyWarning(scene, gains) {
  if (scene?.id === 'tutorial-1' && gains.kp < 3.0) {
    return 'Tip: Kp is very low—raise Kp to at least 4.5 before takeoff so your drone can climb!';
  }
  return null;
}

function syncTutorialOverlay(force = false) {
  if (!tutorialOverlay) return;
  if (state.activeScene?.mode !== 'tutorial' || !tutorialGuide.isRunningForView(state.currentView)) {
    tutorialOverlay.hide();
    lastGuideRenderSig = '';
    updateGuideReopenButtons();
    return;
  }

  const step = tutorialGuide.getCurrentStep();
  const prog = tutorialGuide.getProgressInfo();
  const warn = getTutorialSafetyWarning(state.activeScene, sim.gains);
  const sig = JSON.stringify({
    view: state.currentView,
    stepId: step?.stepId,
    sub: step?.wasdSubIndex,
    done: step?.wasdDone,
    cur: prog.current,
    canNext: prog.canNext,
    warn
  });

  if (force || sig !== lastGuideRenderSig) {
    lastGuideRenderSig = sig;
    tutorialOverlay.render(step, prog, warn);
  }
  updateGuideReopenButtons();
}

function updateGuideReopenButtons() {
  const isTutorial = state.activeScene?.mode === 'tutorial';
  const showReopen = isTutorial && tutorialGuide.dismissed && !tutorialGuide.finished;
  els.btnPreflightReopenGuide.classList.toggle('hidden', !isTutorial || !showReopen);
  els.btnFlightReopenGuide.classList.toggle('hidden', !isTutorial);
  els.btnFlightReopenGuide.textContent = showReopen ? 'Reopen Guide' : 'Restart Guide';
}

// ==================== RESULT SCREEN (MODE-CONFIGURED) ====================
function renderCriteriaList(ulEl, checks) {
  ulEl.innerHTML = '';
  for (const c of checks) {
    const li = document.createElement('li');
    li.className = c.passed ? 'is-pass' : 'is-fail';
    li.textContent = `${c.passed ? '✓' : '✗'} ${c.label}`;
    ulEl.appendChild(li);
  }
}

function showResultScreen(outcome, metrics, scoreResult, previousAttempt = null) {
  const isSuccess = outcome.status === 'completed';
  const isChallenge = state.activeScene?.mode === 'challenge';
  const isTutorial = state.activeScene?.mode === 'tutorial';

  els.resultBadge.textContent = isSuccess ? 'Mission Complete' : 'Mission Failed';
  els.resultTitle.textContent = outcome.title;
  els.resultLevelSubtitle.textContent = `${state.activeScene.name} — ${outcome.message}`;

  // Mode-configured hero & rating card
  els.resultStarsBox.classList.toggle('hidden', !isChallenge);
  els.resultTutorialOutcomeBox.classList.toggle('hidden', isChallenge);
  els.resultRatingCard.classList.toggle('hidden', !isChallenge);
  els.resultTutorialCard.classList.toggle('hidden', isChallenge);

  if (isChallenge) {
    els.resultStarsDisplay.textContent = renderStarsText(scoreResult.stars);
    els.resultStarsDisplay.setAttribute('aria-label', `${scoreResult.stars} of 3 stars`);
    els.resultStarLabel.textContent = scoreResult.summaryLabel;
  } else {
    els.resultTutorialStatusIcon.textContent = isSuccess ? '✓' : '!';
    els.resultTutorialStatusIcon.style.color = isSuccess ? '#4ade80' : '#fb923c';
    els.resultTutorialStatusLabel.textContent = isSuccess
      ? 'Learning Objective Completed'
      : 'Experiment Incomplete';
    els.resultTutHeading.textContent = isSuccess
      ? 'Learning Objective Completed'
      : 'Keep Experimenting — Try Retry';
    els.resultTutObjective.textContent =
      state.activeScene.learningObjective || state.activeScene.objective;
    els.resultTutPracticeStars.textContent = `${renderStarsText(scoreResult.stars)} (${scoreResult.stars} / 3 Practice Rating)`;
  }

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

  // M5: Unified conversational PIP Flight Coach Telemetry Report (both Tutorial & Challenge)
  const telemetry = sim.getTelemetrySeries();
  const report = generatePipDiagnosticReport(
    telemetry,
    metrics,
    outcome,
    state.activeScene,
    previousAttempt
  );

  els.resultPipAvatar.innerHTML = renderPipRobotSvg(report.mood);
  els.resultPipTitle.textContent = report.title;
  els.resultPipHeadline.textContent = report.headline;
  els.resultPipExplanation.textContent = report.spokenSummary;
  if (report.metricLessonNote) {
    els.resultPipLessonNote.textContent = report.metricLessonNote;
    els.resultPipLessonNote.classList.remove('hidden');
  } else {
    els.resultPipLessonNote.classList.add('hidden');
  }
  if (report.comparisonNote) {
    els.resultPipComparison.textContent = report.comparisonNote;
    els.resultPipComparison.classList.remove('hidden');
  } else {
    els.resultPipComparison.classList.add('hidden');
  }

  els.resultDiagList.innerHTML = '';
  for (const item of report.diagnostics.findings) {
    const card = document.createElement('div');
    card.className = `diag-pill is-${item.severity}`;
    card.innerHTML = `
      <div class="diag-pill-top">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </div>
      <p>${item.coachLine}</p>
    `;
    els.resultDiagList.appendChild(card);
  }

  els.resultPipTip.textContent = report.primaryTip;
  els.resultPipAdviceList.innerHTML = '';
  for (const extraTip of report.adviceList.slice(1)) {
    const li = document.createElement('li');
    li.textContent = extraTip;
    els.resultPipAdviceList.appendChild(li);
  }

  const bestRef = getBestPidReference(state.progress, state.activeScene?.id);
  if (isChallenge && bestRef) {
    els.resultBestRef.classList.remove('hidden');
    els.resultBestRef.textContent = `Best Recorded PID (reference only): Kp ${bestRef.kp.toFixed(1)} / Ki ${bestRef.ki.toFixed(2)} / Kd ${bestRef.kd.toFixed(1)}`;
  } else {
    els.resultBestRef.classList.add('hidden');
  }

  // Both Tutorial and Challenge support returning to Pre-flight Briefing & Tuning
  els.btnResultPreflight.classList.toggle('hidden', state.activeScene?.mode === 'playground');
  const nextId = isSuccess ? state.activeScene?.nextLevelId : null;
  els.btnResultNext.classList.toggle('hidden', !nextId);
  els.btnResultNext.dataset.nextId = nextId || '';

  const showChallengeShortcut = isTutorial && isSuccess && !nextId;
  els.btnResultChallenges.classList.toggle('hidden', !showChallengeShortcut);

  if (isTutorial && tutorialGuide.active) {
    tutorialGuide.jumpToView('result');
  }

  const prevTrail = previousAttempt?.trail || null;
  els.resultPrevLegend.classList.toggle('hidden', !(prevTrail?.length > 1));

  navigateTo('result');
  renderRouteFitPreview(els.resultRouteCanvas, sim, prevTrail);
  renderTelemetryTimeSeriesPlot(els.resultTelemetryCanvas, telemetry, sim.config.maxThrust);
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
    ? 'Visual-first PID academy with PIP coaching, live demonstrations, and hands-on WASD flight.'
    : 'Each mission starts at zero PID—analyze conditions, tune with PIP, and fly manually with WASD.';
  els.levelsStarSummary.textContent = `${summary.earnedStars} / ${summary.maxStars} ★`;
  els.btnMeetPip.classList.toggle('hidden', !isTutorial);

  if (isTutorial && !hasSeenPipIntro(state.progress)) {
    openPipIntro(false);
  } else if (!isTutorial) {
    closePipIntro(false);
  }

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
        if (state.pipIntroOpen) closePipIntro(true);
        openPreflightTuning(scene, { resetToInitial: true, restartGuide: true });
        return;
      }

      showModal(`Scheduled for ${level.milestone}`, level.name, level.summary);
    });

    els.levelsGrid.appendChild(card);
  }
}

// ==================== SHARED PRE-FLIGHT BRIEFING & TUNING ====================
function openPreflightTuning(scene, options = {}) {
  state.activeScene = scene;
  const isTutorial = scene.mode === 'tutorial';

  const droneMass = scene.droneMass ?? 1.2;
  const payloadMass = scene.payloadMass ?? 0.0;
  const totalMass = droneMass + payloadMass;
  const maxThrust = scene.maxThrust ?? 28.0;
  const twr = maxThrust / (totalMass * 9.81);

  els.preflightModeBadge.textContent = isTutorial ? 'Tutorial Village — Briefing' : 'Challenge Mission — Briefing';
  els.preflightTitle.textContent = scene.name;
  els.preflightDescription.textContent = scene.description || scene.flightConditions || scene.objective;
  els.preflightLearningFocus.textContent = scene.stemTopic || scene.learningObjective || 'PID Control';
  els.preflightObjective.textContent = scene.objective;
  els.preflightSuccessReq.textContent = scene.missionGoal || scene.objective;
  els.preflightConditions.textContent = scene.flightConditions || scene.windLabel || 'Standard Arena';
  els.preflightPrevKnowledge.textContent = scene.whatYouLearnedBefore || 'Standard WASD closed-loop control.';
  els.preflightNewChallenge.textContent = scene.newChallenge || scene.description || scene.objective;
  els.preflightLearningObj.textContent = scene.learningObjective ? `Objective: ${scene.learningObjective}` : '';

  els.preflightDroneMass.textContent = `${droneMass.toFixed(2)} kg`;
  els.preflightPayload.textContent =
    payloadMass > 0 ? `+${payloadMass.toFixed(2)} kg (${totalMass.toFixed(2)} kg total)` : '0.00 kg (Unladen)';
  els.preflightWind.textContent = scene.windLabel || 'Calm Air (0.0 N)';
  els.preflightMaxThrust.textContent = `${maxThrust.toFixed(1)} N (TWR ${twr.toFixed(2)})`;
  els.preflightMaxTilt.textContent = `${scene.maxTilt ?? 32} deg`;
  els.preflightTimeLimit.textContent = Number.isFinite(scene.timeLimit) ? `${scene.timeLimit} s` : 'No Limit';
  els.btnPreflightMeetPip.classList.toggle('hidden', !isTutorial);

  const aid = isTutorial && scene.visualId ? getStemVisualAid(scene.visualId) : null;
  if (aid) {
    els.preflightVisualAid.classList.remove('hidden');
    els.preflightVisualTitle.textContent = aid.title;
    els.preflightVisualSvg.innerHTML = aid.renderSvg();
    els.preflightLearnMoreText.textContent =
      scene.tutorialGuide?.shortExplanation || scene.learningObjective || '';
  } else {
    els.preflightVisualAid.classList.add('hidden');
    els.preflightVisualSvg.innerHTML = '';
  }

  const initialGains = getSceneInitialGains(scene);
  let gainsToUse;
  if (options.resetToInitial || options.resetToZero) {
    gainsToUse = { ...initialGains };
    delete state.lastAttempts[scene.id];
  } else {
    gainsToUse = state.tunedGainsByLevel[scene.id] || { ...initialGains };
  }

  els.prePidBadge.textContent =
    initialGains.kp === 0 && initialGains.ki === 0 && initialGains.kd === 0
      ? 'Starts at Zero'
      : 'Lesson Preset';

  state.baselineGainsByLevel[scene.id] = { ...gainsToUse };
  state.tunedGainsByLevel[scene.id] = { ...gainsToUse };
  sim.loadScene(scene, false);
  sim.setGains(gainsToUse);

  const analysis = syncAllPidPanels(gainsToUse, scene);
  renderPreflightPipWithTutorialBrief(analysis, scene);

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

  if (isTutorial) {
    if (options.restartGuide || tutorialGuide.sceneId !== scene.id) {
      tutorialGuide.start(scene);
    } else {
      tutorialGuide.jumpToView('preflight');
    }
  } else {
    tutorialGuide.resetState();
  }

  navigateTo('preflight');
}

// ==================== SHARED FLIGHT SCREEN ====================
function syncFlightControlsUi() {
  const scene = state.activeScene;
  const allowLiveTuning = scene?.allowLivePidTuning ?? scene?.mode !== 'challenge';

  els.btnFlightPause.textContent = sim.paused ? 'Resume' : 'Pause';
  els.btnFlightPause.disabled = !sim.started || state.runFinished;

  els.sliderKp.disabled = !allowLiveTuning;
  els.sliderKi.disabled = !allowLiveTuning;
  els.sliderKd.disabled = !allowLiveTuning;
  els.btnResetPid.classList.toggle('hidden', !allowLiveTuning);
  els.btnOpenPreflight.classList.toggle('hidden', scene?.mode === 'playground');
  els.flightPidBadge.textContent = allowLiveTuning ? 'Live Gains' : 'Pre-flight Locked';
  els.flightWindGroup.classList.toggle('hidden', scene?.allowWindSelect === false);

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

function renderFlightBriefingSummary(scene) {
  const totalMass = getTotalMass(sim.config);
  const maxThrust = sim.config.maxThrust;
  const windLabel = scene?.windLabel || 'Calm Air (0.0 N)';
  const maxTilt = scene?.maxTilt ?? 32;

  els.flightBriefingEyebrow.textContent =
    scene?.mode === 'tutorial'
      ? `Tutorial Briefing & Drone Specs — ${scene.stemTopic || 'PID'}`
      : scene?.mode === 'challenge'
        ? 'Challenge Briefing & Drone Specs'
        : 'Sandbox Briefing & Drone Specs';
  els.flightBriefingText.textContent = scene?.briefing || scene?.objective || '';

  els.flightSpecSummary.innerHTML = `
    <span>Mass: ${totalMass.toFixed(2)} kg</span>
    <span>Max Thrust: ${maxThrust.toFixed(1)} N</span>
    <span>Wind: ${windLabel}</span>
    <span>Max Tilt: ${maxTilt} deg</span>
  `;

  const totalRings = scene?.rings?.length || 0;
  els.challengeCheckpointPill.classList.toggle('hidden', totalRings === 0);
  if (totalRings > 0) {
    els.challengeCheckpointPill.textContent = `Rings Cleared: ${sim.nextRingIndex} / ${totalRings}`;
  }
  updateGuideReopenButtons();
}

function updateFlightPipCard(force = false) {
  const step = tutorialGuide.isRunningForView('flight') ? tutorialGuide.getCurrentStep() : null;
  const coachData = evaluateLiveFlightCoaching(sim, state.activeScene, step);
  const sig = `${coachData.state}|${coachData.headline}|${coachData.messages.join(';')}`;
  if (force || sig !== lastFlightPipSig) {
    lastFlightPipSig = sig;
    renderPipCard(els.flightPipCard, coachData);
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

  if (snap.rings.length > 0) {
    els.challengeCheckpointPill.textContent = `Rings Cleared: ${snap.nextRingIndex} / ${snap.rings.length}`;
  }

  updateFlightPipCard(false);
}

function handleSceneOutcomeIfNeeded() {
  const mode = state.activeScene?.mode;
  if (state.runFinished || (mode !== 'tutorial' && mode !== 'challenge')) return null;

  const outcome = evaluateSceneOutcome(sim, state.activeScene);
  if (outcome.status === 'completed' || outcome.status === 'failed') {
    state.runFinished = true;
    sim.setPaused(true);
    input.clearMovementKeys();
    syncFlightControlsUi();

    const metrics = sim.getFlightMetrics();
    const scoreResult = scoreFlightRun(outcome, metrics, state.activeScene.id);
    const previousAttempt = state.lastAttempts[state.activeScene.id] || null;

    state.lastAttempts[state.activeScene.id] = {
      outcome,
      metrics,
      scoreResult,
      trail: sim.trail.slice()
    };
    state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };

    if (mode === 'tutorial' && tutorialGuide.active) {
      tutorialGuide.evaluateTelemetry(sim, input.getAxes(), outcome, state.currentView);
    }

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

    showResultScreen(outcome, metrics, scoreResult, previousAttempt);
  }
  return outcome;
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
    const axes = input.getAxes();
    sim.stepFrame(rawDt, axes);
    const outcome = handleSceneOutcomeIfNeeded();
    if (!state.runFinished && state.activeScene?.mode === 'tutorial') {
      tutorialGuide.evaluateTelemetry(sim, axes, outcome, state.currentView);
      syncTutorialOverlay(false);
    }
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
  const prevTrail = state.lastAttempts[state.activeScene?.id]?.trail || sim.trail.slice();
  // Preserve player's current tuned PID gains on Retry within the same level
  sim.reset(true);
  if (prevTrail.length > 1) {
    sim.setPreviousTrail(prevTrail);
  }
  if (state.activeScene?.mode === 'tutorial' && tutorialGuide.active) {
    tutorialGuide.wasdSubIndex = 0;
    tutorialGuide.wasdDone = { w: false, s: false, a: false, d: false, release: false };
    tutorialGuide.targetReached = false;
    tutorialGuide.jumpToView('flight');
  }
  syncFlightControlsUi();
  if (state.currentView !== 'flight') {
    navigateTo('flight');
  } else {
    updateFlightHud();
    syncTutorialOverlay(true);
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

  state.tunedGainsByLevel[scene.id] = { ...sim.gains };
  sim.setPreviousTrail(state.lastAttempts[scene.id]?.trail || []);
  els.flightLevelName.textContent = scene.name;
  els.flightObjective.textContent = scene.objective;
  els.btnFlightBack.innerHTML =
    scene.mode === 'playground' ? '&larr; Modes' : '&larr; Briefing';

  els.selectWind.value = sim.windMode;
  els.selectWind.disabled = scene.allowWindSelect === false;

  syncAllPidPanels(sim.gains, scene);
  renderFlightBriefingSummary(scene);
  syncFlightControlsUi();

  if (scene.mode === 'tutorial') {
    if (tutorialGuide.sceneId !== scene.id) {
      tutorialGuide.start(scene);
    }
    tutorialGuide.recordFlightStarted();
    tutorialGuide.jumpToView('flight');
  } else {
    tutorialGuide.resetState();
  }

  navigateTo('flight');
}

export function navigateTo(viewName, options = {}) {
  state.currentView = viewName;

  for (const [name, el] of Object.entries(els.views)) {
    el.classList.toggle('active', name === viewName);
  }

  els.topbar.classList.toggle('hidden', viewName === 'start' || viewName === 'flight');
  updateProgressSummaries();

  if (viewName !== 'levels' && state.pipIntroOpen) {
    closePipIntro(false);
  }

  if (viewName === 'start' || viewName === 'modes' || viewName === 'levels') {
    tutorialGuide.resetState();
    tutorialOverlay?.hide();
  }

  if (viewName === 'levels') {
    renderLevelSelection(options.mode || state.currentMode);
  }

  if (viewName === 'flight') {
    input.attach();
    renderer.render(sim, 0);
    lastFlightPipSig = '';
    updateFlightHud();
    startFlightLoop();
  } else {
    stopFlightLoop();
    input.detach();
  }

  window.requestAnimationFrame(() => syncTutorialOverlay(true));
}

function bindEvents() {
  applySharedSliderBounds();

  tutorialOverlay = new TutorialSpotlightOverlay({
    onBack: () => {
      if (tutorialGuide.goBack()) {
        syncTutorialOverlay(true);
      }
    },
    onNext: () => {
      const wasLast = tutorialGuide.getProgressInfo().current === tutorialGuide.steps.length;
      if (tutorialGuide.goNext()) {
        syncTutorialOverlay(true);
        if (wasLast) {
          tutorialOverlay?.hide();
        }
      }
    },
    onDismiss: () => {
      tutorialGuide.dismiss();
      tutorialOverlay?.hide();
      updateGuideReopenButtons();
    }
  });

  els.btnStartGame.addEventListener('click', () => navigateTo('modes'));
  els.btnHome.addEventListener('click', () => navigateTo('start'));
  els.btnEnterTutorials.addEventListener('click', () => navigateTo('levels', { mode: 'tutorial' }));
  els.btnEnterChallenges.addEventListener('click', () => navigateTo('levels', { mode: 'challenge' }));
  els.btnBackModes.addEventListener('click', () => navigateTo('modes'));
  els.btnLaunchPlayground.addEventListener('click', () => launchScene(PLAYGROUND_SCENE));

  els.btnMeetPip.addEventListener('click', () => openPipIntro(true));
  els.btnPreflightMeetPip.addEventListener('click', () => {
    navigateTo('levels', { mode: 'tutorial' });
    openPipIntro(true);
  });
  els.btnPipIntroSkip.addEventListener('click', () => closePipIntro(true));
  els.btnPipIntroNext.addEventListener('click', () => {
    if (state.pipIntroIndex >= PIP_INTRO_SCRIPT.length - 1) {
      closePipIntro(true);
    } else {
      state.pipIntroIndex += 1;
      renderPipIntroSlide();
    }
  });

  els.btnPreflightBack.addEventListener('click', () => {
    const mode = state.activeScene?.mode === 'challenge' ? 'challenge' : 'tutorial';
    navigateTo('levels', { mode });
  });

  const reopenGuideHandler = () => {
    if (state.activeScene?.mode === 'tutorial') {
      tutorialGuide.start(state.activeScene);
      tutorialGuide.jumpToView(state.currentView);
      syncTutorialOverlay(true);
    }
  };
  els.btnPreflightReopenGuide.addEventListener('click', reopenGuideHandler);
  els.btnFlightReopenGuide.addEventListener('click', reopenGuideHandler);

  const startFromPreflight = () => {
    const gains = state.tunedGainsByLevel[state.activeScene.id] || getSceneInitialGains(state.activeScene);
    launchScene(state.activeScene, { gains, autoStart: true });
  };
  els.btnPreStartFlight.addEventListener('click', startFromPreflight);
  els.btnPreStartFlight2.addEventListener('click', startFromPreflight);

  els.btnPreResetPid.addEventListener('click', () => resetScenePid(state.activeScene));
  els.btnResetPid.addEventListener('click', () => resetScenePid(state.activeScene));

  const handlePreflightSliderInput = () => {
    const gains = {
      kp: Number(els.preSliderKp.value),
      ki: Number(els.preSliderKi.value),
      kd: Number(els.preSliderKd.value)
    };
    applyPidGains(gains, state.activeScene);
    schedulePipUpdate(gains, state.activeScene);
  };
  els.preSliderKp.addEventListener('input', handlePreflightSliderInput);
  els.preSliderKi.addEventListener('input', handlePreflightSliderInput);
  els.preSliderKd.addEventListener('input', handlePreflightSliderInput);

  const handleFlightSliderInput = () => {
    const gains = {
      kp: Number(els.sliderKp.value),
      ki: Number(els.sliderKi.value),
      kd: Number(els.sliderKd.value)
    };
    applyPidGains(gains, state.activeScene);
    updateFlightPipCard(true);
  };
  els.sliderKp.addEventListener('input', handleFlightSliderInput);
  els.sliderKi.addEventListener('input', handleFlightSliderInput);
  els.sliderKd.addEventListener('input', handleFlightSliderInput);

  const returnToBriefing = () => {
    if (state.activeScene?.mode === 'challenge' || state.activeScene?.mode === 'tutorial') {
      state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };
      openPreflightTuning(state.activeScene, { resetToInitial: false, restartGuide: false });
    } else {
      navigateTo('modes');
    }
  };

  els.btnFlightBack.addEventListener('click', returnToBriefing);
  els.btnOpenPreflight.addEventListener('click', returnToBriefing);

  els.btnStartFlight.addEventListener('click', startPlaygroundFlight);
  els.btnFlightPause.addEventListener('click', togglePauseFlight);
  els.btnFlightRestart.addEventListener('click', restartFlight);

  els.selectWind.addEventListener('change', () => {
    sim.setWindMode(els.selectWind.value);
  });

  // Result Screen actions (shared by Tutorial & Challenge)
  els.btnResultRetry.addEventListener('click', restartFlight);
  els.btnResultPreflight.addEventListener('click', () => {
    openPreflightTuning(state.activeScene, { resetToInitial: false, restartGuide: false });
  });
  els.btnResultLevels.addEventListener('click', () => {
    const backMode = state.activeScene?.mode === 'challenge' ? 'challenge' : 'tutorial';
    navigateTo('levels', { mode: backMode });
  });
  els.btnResultChallenges.addEventListener('click', () => {
    navigateTo('levels', { mode: 'challenge' });
  });
  els.btnResultNext.addEventListener('click', () => {
    const nextId = els.btnResultNext.dataset.nextId;
    const nextScene = getSceneById(nextId);
    if (nextScene) {
      openPreflightTuning(nextScene, { resetToInitial: true, restartGuide: true });
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
syncAllPidPanels(DEFAULT_PID_GAINS, PLAYGROUND_SCENE);
navigateTo('start');
