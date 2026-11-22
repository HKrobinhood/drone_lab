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
import {
  FlightRenderer,
  renderRouteFitPreview,
  renderTelemetryTimeSeriesPlot,
  renderLivePidResponseChart,
  renderStrategyRadar,
  renderTestBenchChart
} from './renderer.js';
import { getTotalMass } from './physics.js';
import {
  getSceneById,
  evaluateSceneOutcome
} from './scenes.js';
import {
  evaluatePidCoaching,
  evaluateLiveFlightCoaching,
  predictStrategyTradeoffs
} from './coach.js';
import { generatePipDiagnosticReport, buildConcisePipResultFeedback, evaluateLiveControlStatus } from './feedback.js';
import { scoreFlightRun, buildRatingBreakdown, buildNextStarAdvice, computeStrategyDimensions } from './scoring.js';
import { TutorialGuideEngine, PIP_INTRO_SCRIPT } from './tutorial_guide.js';
import { TutorialSpotlightOverlay } from './guide_overlay.js';
import {
  renderPipRobotSvg,
  resolvePipMood,
  getStemVisualAid,
  renderInteractiveVisualAidHtml,
  bindVisualAidInteractions,
  renderResultStarSvg,
  getPidParamExplainer
} from './visual_aids.js';
import { PidKnobControl } from './pid_knob.js';
import {
  runPidBenchTest,
  compareBenchTests,
  evaluateTestBenchPipCoaching,
  getTuningChallengeForScene
} from './test_bench.js';
import {
  STORY_MISSIONS,
  STORY_ENDINGS,
  getStoryMission,
  getRecommendedCurrentNodeId,
  renderMissionMapBackdropSvg,
  renderMissionCardIllustrationSvg,
  renderFlightEngineerBadgeSvg
} from './story.js';

const state = {
  currentView: 'start',
  currentMode: 'tutorial',
  mapFilter: 'all',
  selectedMapLevelId: 'tutorial-1',
  newlyUnlockedLevelId: null,
  pendingMissionCardLevelId: null,
  activeScene: null,
  runFinished: false,
  showGhostDrone: true,
  showFlightTrails: true,
  livePlotAxis: 'z',
  progress: loadProgress(),
  tunedGainsByLevel: {},
  baselineGainsByLevel: {},
  lastAttempts: {},
  benchHistoryByLevel: {},
  activeExplainerParam: null,
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
  missionMapStage: document.getElementById('mission-map-stage'),
  missionMapBackdrop: document.getElementById('mission-map-backdrop'),
  mapEngineerPill: document.getElementById('map-engineer-pill'),
  mapTabButtons: Array.from(document.querySelectorAll('.map-tab-btn[data-map-filter]')),
  mapPreviewCard: document.getElementById('map-preview-card'),
  mapPreviewArt: document.getElementById('map-preview-art'),
  mapPreviewBadge: document.getElementById('map-preview-badge'),
  mapPreviewZone: document.getElementById('map-preview-zone'),
  mapPreviewStars: document.getElementById('map-preview-stars'),
  mapPreviewTitle: document.getElementById('map-preview-title'),
  mapPreviewPip: document.getElementById('map-preview-pip'),
  mapPreviewConditions: document.getElementById('map-preview-conditions'),
  btnMapPlay: document.getElementById('btn-map-play'),
  btnMapQuickTune: document.getElementById('btn-map-quick-tune'),
  btnMeetPip: document.getElementById('btn-meet-pip'),
  pipIntroPanel: document.getElementById('pip-intro-panel'),
  pipIntroAvatar: document.getElementById('pip-intro-avatar'),
  pipIntroMoodBadge: document.getElementById('pip-intro-mood-badge'),
  pipIntroStepCount: document.getElementById('pip-intro-step-count'),
  pipIntroLine: document.getElementById('pip-intro-line'),
  btnPipIntroSkip: document.getElementById('btn-pip-intro-skip'),
  btnPipIntroNext: document.getElementById('btn-pip-intro-next'),

  // Pre-flight Briefing & Tuning Garage elements
  btnPreflightBack: document.getElementById('btn-preflight-back'),
  btnPreflightMeetPip: document.getElementById('btn-preflight-meet-pip'),
  btnPreflightReopenGuide: document.getElementById('btn-preflight-reopen-guide'),
  btnPreStartFlight: document.getElementById('btn-pre-start-flight'),
  btnPreStartFlight2: document.getElementById('btn-pre-start-flight-2'),
  btnPreResetPid: document.getElementById('btn-pre-reset-pid'),
  btnTestPid: document.getElementById('btn-test-pid'),
  preflightModeBadge: document.getElementById('preflight-mode-badge'),
  preflightTitle: document.getElementById('preflight-title'),
  preflightShortGoal: document.getElementById('preflight-short-goal'),
  preflightQuickChips: document.getElementById('preflight-quick-chips'),
  preflightArenaCanvas: document.getElementById('preflight-arena-canvas'),
  benchChallengeTitle: document.getElementById('bench-challenge-title'),
  benchChallengeBadge: document.getElementById('bench-challenge-badge'),
  benchTestLabel: document.getElementById('bench-test-label'),
  benchPrevLegend: document.getElementById('bench-prev-legend'),
  testBenchCanvas: document.getElementById('test-bench-canvas'),
  benchMetricOvershoot: document.getElementById('bench-metric-overshoot'),
  benchMetricSettling: document.getElementById('bench-metric-settling'),
  benchMetricError: document.getElementById('bench-metric-error'),
  benchCompareStrip: document.getElementById('bench-compare-strip'),
  benchCompareBadges: document.getElementById('bench-compare-badges'),
  drawerStrategyPreview: document.getElementById('drawer-strategy-preview'),
  preflightDetailsMission: document.getElementById('preflight-details-mission'),
  preflightDetailsSpecs: document.getElementById('preflight-details-specs'),
  preflightDetailsTradeoffs: document.getElementById('preflight-details-tradeoffs'),
  pidExplainerCard: document.getElementById('pid-explainer-card'),
  pidExplainerTitle: document.getElementById('pid-explainer-title'),
  pidExplainerRole: document.getElementById('pid-explainer-role'),
  pidExplainerVisual: document.getElementById('pid-explainer-visual'),
  pidExplainerBullets: document.getElementById('pid-explainer-bullets'),
  pidExplainerFormula: document.getElementById('pid-explainer-formula'),
  btnCloseExplainer: document.getElementById('btn-close-explainer'),
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
  preflightBatteryBudget: document.getElementById('preflight-battery-budget'),
  preflightStrategyTag: document.getElementById('preflight-strategy-tag'),
  preflightStrategyPills: document.getElementById('preflight-strategy-pills'),
  preflightStrategyHint: document.getElementById('preflight-strategy-hint'),
  tradeoffStrategyLabel: document.getElementById('tradeoff-strategy-label'),
  tradeoffBars: {
    speed: document.getElementById('tradeoff-bar-speed'),
    stability: document.getElementById('tradeoff-bar-stability'),
    precision: document.getElementById('tradeoff-bar-precision'),
    efficiency: document.getElementById('tradeoff-bar-efficiency')
  },
  tradeoffVals: {
    speed: document.getElementById('tradeoff-val-speed'),
    stability: document.getElementById('tradeoff-val-stability'),
    precision: document.getElementById('tradeoff-val-precision'),
    efficiency: document.getElementById('tradeoff-val-efficiency')
  },
  tradeoffSummary: document.getElementById('tradeoff-summary'),
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
    messages: document.getElementById('pip-messages'),
    learnMore: document.getElementById('pre-pip-learn-more'),
    learnMoreText: document.getElementById('pre-pip-learn-more-text')
  },
  flightPipCard: {
    card: document.getElementById('flight-pip-card'),
    avatar: document.querySelector('#flight-pip-card .pip-avatar-wrap'),
    badge: document.getElementById('flight-pip-state-badge'),
    headline: document.getElementById('flight-pip-headline'),
    messages: document.getElementById('flight-pip-messages'),
    learnMore: document.getElementById('flight-pip-learn-more'),
    learnMoreText: document.getElementById('flight-pip-learn-more-text')
  },

  // Flight Screen elements
  flightLevelName: document.getElementById('flight-level-name'),
  flightObjective: document.getElementById('flight-objective'),
  flightCanvas: document.getElementById('flight-canvas'),
  toggleGhostDrone: document.getElementById('toggle-ghost-drone'),
  toggleFlightTrails: document.getElementById('toggle-flight-trails'),
  liveControlBadges: document.getElementById('live-control-badges'),
  flightResponseCanvas: document.getElementById('flight-response-canvas'),
  btnLiveAxisToggle: document.getElementById('btn-live-axis-toggle'),
  flightBatteryPill: document.getElementById('flight-battery-pill'),
  flightBatteryBarWrap: document.getElementById('flight-battery-bar-wrap'),
  flightBatteryBarFill: document.getElementById('flight-battery-bar-fill'),
  flightBatteryText: document.getElementById('flight-battery-text'),
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
  telP: document.getElementById('tel-p'),
  telI: document.getElementById('tel-i'),
  telD: document.getElementById('tel-d'),
  flightStatus: document.getElementById('flight-status'),
  flightPos: document.getElementById('flight-pos'),
  flightSpeed: document.getElementById('flight-speed'),
  flightThrust: document.getElementById('flight-thrust'),
  flightMass: document.getElementById('flight-mass'),
  flightRef: document.getElementById('flight-ref'),
  flightWasdIntroBanner: document.getElementById('flight-wasd-intro-banner'),
  flightWasdIntroAvatar: document.getElementById('flight-wasd-intro-avatar'),
  btnDismissWasdIntro: document.getElementById('btn-dismiss-wasd-intro'),

  // Unified Flight Briefing & Drone Specs Summary
  flightBriefingEyebrow: document.getElementById('flight-briefing-eyebrow'),
  flightBriefingText: document.getElementById('flight-briefing-text'),
  flightSpecSummary: document.getElementById('flight-spec-summary'),
  challengeCheckpointPill: document.getElementById('challenge-checkpoint-pill'),
  btnFlightReopenGuide: document.getElementById('btn-flight-reopen-guide'),

  // Result Screen elements (M4 + M4.1 + M5.1 Animated Star Showcase)
  resultHeroCard: document.getElementById('result-hero-card'),
  resultBadge: document.getElementById('result-badge'),
  resultTitle: document.getElementById('result-title'),
  resultLevelSubtitle: document.getElementById('result-level-subtitle'),
  resultStoryMilestone: document.getElementById('result-story-milestone'),
  resultStoryVisual: document.getElementById('result-story-visual'),
  resultStoryBadge: document.getElementById('result-story-badge'),
  resultStoryHeading: document.getElementById('result-story-heading'),
  resultStoryLine: document.getElementById('result-story-line'),
  resultStarsBox: document.getElementById('result-stars-box'),
  resultStarRow: document.getElementById('result-star-row'),
  resultStarSlots: [
    document.getElementById('result-star-1'),
    document.getElementById('result-star-2'),
    document.getElementById('result-star-3')
  ],
  resultStarParticles: document.getElementById('result-star-particles'),
  resultStarsDisplay: document.getElementById('result-stars-display'),
  resultStarLabel: document.getElementById('result-star-label'),
  resultNextStarTip: document.getElementById('result-next-star-tip'),
  btnResultSkipAnim: document.getElementById('btn-result-skip-anim'),
  resultFailedHero: document.getElementById('result-failed-hero'),
  resultFailedPipAvatar: document.getElementById('result-failed-pip-avatar'),
  resultFailedReason: document.getElementById('result-failed-reason'),
  resultFailedPipTip: document.getElementById('result-failed-pip-tip'),
  resultFailedStats: document.getElementById('result-failed-stats'),
  resultDetailsStage: document.getElementById('result-details-stage'),
  resultSummaryCriteria: document.getElementById('result-summary-criteria'),
  resultTutorialOutcomeBox: document.getElementById('result-tutorial-outcome-box'),
  resultTutorialStatusIcon: document.getElementById('result-tutorial-status-icon'),
  resultTutorialStatusLabel: document.getElementById('result-tutorial-status-label'),
  resultTime: document.getElementById('result-time'),
  resultOvershoot: document.getElementById('result-overshoot'),
  resultSettling: document.getElementById('result-settling'),
  resultRouteFit: document.getElementById('result-route-fit'),
  resultSmoothness: document.getElementById('result-smoothness'),
  resultEnergy: document.getElementById('result-energy'),
  resultAvgError: document.getElementById('result-avg-error'),
  resultSaturation: document.getElementById('result-saturation'),
  resultPid: document.getElementById('result-pid'),
  resultPrevLegend: document.getElementById('result-prev-legend'),
  resultStrategyPrevLegend: document.getElementById('result-strategy-prev-legend'),
  resultStrategyCanvas: document.getElementById('result-strategy-canvas'),
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
  resultPipStrategy: document.getElementById('result-pip-strategy'),
  resultPipLessonNote: document.getElementById('result-pip-lesson-note'),
  resultPipComparison: document.getElementById('result-pip-comparison'),
  resultDiagList: document.getElementById('result-diag-list'),
  resultPipTip: document.getElementById('result-pip-tip'),
  resultPipAdviceList: document.getElementById('result-pip-advice-list'),
  resultBestRef: document.getElementById('result-best-ref'),
  resultPipShortCard: document.getElementById('result-pip-short-card'),
  resultPipShortAvatar: document.getElementById('result-pip-short-avatar'),
  resultPipShortText: document.getElementById('result-pip-short-text'),
  resultActionsBar: document.getElementById('result-actions-bar'),
  resultReportAccordion: document.getElementById('result-report-accordion'),
  btnResultReportToggle: document.getElementById('btn-result-report-toggle'),
  resultReportBody: document.getElementById('result-report-body'),
  btnResultLevels: document.getElementById('btn-result-levels'),
  btnResultPreflight: document.getElementById('btn-result-preflight'),
  btnResultRetry: document.getElementById('btn-result-retry'),
  btnResultChallenges: document.getElementById('btn-result-challenges'),
  btnResultNext: document.getElementById('btn-result-next'),

  appShell: document.querySelector('.app-shell'),
  btnOpenAbout: document.getElementById('btn-open-about'),
  aboutModal: document.getElementById('about-modal'),
  btnCloseAbout: document.getElementById('btn-close-about'),
  btnCloseAboutX: document.getElementById('btn-close-about-x'),

  missionCardModal: document.getElementById('mission-card-modal'),
  missionCardBadge: document.getElementById('mission-card-badge'),
  missionCardTitle: document.getElementById('mission-card-title'),
  missionCardArt: document.getElementById('mission-card-art'),
  missionCardPipAvatar: document.getElementById('mission-card-pip-avatar'),
  missionCardPipLine: document.getElementById('mission-card-pip-line'),
  missionCardObjective: document.getElementById('mission-card-objective'),
  missionCardConditions: document.getElementById('mission-card-conditions'),
  btnMissionCardClose: document.getElementById('btn-mission-card-close'),
  btnMissionCardSkip: document.getElementById('btn-mission-card-skip'),
  btnMissionCardTune: document.getElementById('btn-mission-card-tune'),

  modal: document.getElementById('notice-modal'),
  modalEyebrow: document.getElementById('modal-eyebrow'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  btnCloseModal: document.getElementById('btn-close-modal')
};

const sim = new FlightSimulation();
const renderer = new FlightRenderer(els.flightCanvas);
const previewRenderer = els.preflightArenaCanvas ? new FlightRenderer(els.preflightArenaCanvas) : null;
const tutorialGuide = new TutorialGuideEngine();
let tutorialOverlay = null;
const pidKnobs = {};

let rafId = null;
let lastFrameTime = null;
let pipDebounceTimer = null;
let lastGuideRenderSig = '';
let lastFlightPipSig = '';
let lastFlightPipUpdateAt = 0;
let lastControlBadgeSig = '';
let lastControlBadgeUpdateAt = 0;
let starAnimTimers = [];
let starAnimTargetCount = 0;
let resultReportExpanded = false;
let resultChartPayload = null;

function isAnyModalOpen() {
  const noticeOpen = !els.modal.classList.contains('hidden');
  const aboutOpen = Boolean(els.aboutModal && !els.aboutModal.classList.contains('hidden'));
  const missionCardOpen = Boolean(els.missionCardModal && !els.missionCardModal.classList.contains('hidden'));
  return noticeOpen || aboutOpen || missionCardOpen;
}

function openAboutModal() {
  if (!els.aboutModal) return;
  els.aboutModal.classList.remove('hidden');
  els.btnCloseAbout?.focus();
}

function closeAboutModal() {
  if (!els.aboutModal) return;
  els.aboutModal.classList.add('hidden');
  els.btnOpenAbout?.focus();
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

function renderZoneHint(pillEl, trackEl, zone, hideRecommended = false) {
  if (!pillEl || !trackEl) return;
  pillEl.classList.toggle('hidden', hideRecommended);
  trackEl.classList.toggle('hidden', hideRecommended);
  if (hideRecommended) return;
  const labels = { low: 'Low', recommended: 'Recommended', high: 'High' };
  pillEl.textContent = labels[zone] || 'Low';
  pillEl.className = `zone-pill zone-${zone}`;
  for (const seg of trackEl.querySelectorAll('span')) {
    seg.classList.toggle('is-active', seg.dataset.zone === zone);
  }
}

function renderStrategyTradeoffMeter(gains, scene) {
  const pred = predictStrategyTradeoffs(gains, scene);
  if (els.tradeoffStrategyLabel) els.tradeoffStrategyLabel.textContent = pred.strategyLabel;
  if (els.drawerStrategyPreview) els.drawerStrategyPreview.textContent = pred.strategyLabel;
  if (els.tradeoffSummary) els.tradeoffSummary.textContent = pred.summary;
  for (const axis of ['speed', 'stability', 'precision', 'efficiency']) {
    const val = Math.round(pred[axis] ?? 0);
    if (els.tradeoffBars[axis]) els.tradeoffBars[axis].style.width = `${val}%`;
    if (els.tradeoffVals[axis]) els.tradeoffVals[axis].textContent = String(val);
  }
}

function syncAllPidPanels(gains, scene = state.activeScene) {
  const analysis = evaluatePidCoaching(gains, scene);
  const hideZones = Boolean(scene?.strategyProfile?.hideRecommendedZone);
  for (const group of PID_PANEL_GROUPS) {
    group.sliders.kp.value = String(gains.kp);
    group.sliders.ki.value = String(gains.ki);
    group.sliders.kd.value = String(gains.kd);
    group.outputs.kp.textContent = gains.kp.toFixed(1);
    group.outputs.ki.textContent = gains.ki.toFixed(2);
    group.outputs.kd.textContent = gains.kd.toFixed(1);
    renderZoneHint(group.zones.kp, group.tracks.kp, analysis.zones.kp, hideZones);
    renderZoneHint(group.zones.ki, group.tracks.ki, analysis.zones.ki, hideZones);
    renderZoneHint(group.zones.kd, group.tracks.kd, analysis.zones.kd, hideZones);
  }
  for (const axis of ['kp', 'ki', 'kd']) {
    pidKnobs[axis]?.setValue(gains[axis], false);
  }
  renderStrategyTradeoffMeter(gains, scene);
  return analysis;
}

// ==================== PID VISUAL EXPLAINERS & TEST BENCH (M5.4) ====================
function closeParamExplainer() {
  state.activeExplainerParam = null;
  els.pidExplainerCard?.classList.add('hidden');
  for (const btn of document.querySelectorAll('.knob-icon-btn[data-explain]')) {
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('is-open');
  }
  tutorialOverlay?.reposition();
}

function toggleParamExplainer(paramKey) {
  if (state.activeExplainerParam === paramKey) {
    closeParamExplainer();
    return;
  }
  const exp = getPidParamExplainer(paramKey);
  if (!exp || !els.pidExplainerCard) return;

  state.activeExplainerParam = paramKey;
  els.pidExplainerTitle.textContent = exp.title;
  els.pidExplainerRole.textContent = exp.shortRole;
  els.pidExplainerVisual.innerHTML = renderInteractiveVisualAidHtml(exp.visualId);
  bindVisualAidInteractions(els.pidExplainerVisual);
  els.pidExplainerBullets.innerHTML = exp.bullets.map((b) => `<li>${b}</li>`).join('');
  els.pidExplainerFormula.textContent = exp.formulaLearnMore;
  els.pidExplainerCard.classList.remove('hidden');

  for (const btn of document.querySelectorAll('.knob-icon-btn[data-explain]')) {
    const active = btn.dataset.explain === paramKey;
    btn.setAttribute('aria-expanded', String(active));
    btn.classList.toggle('is-open', active);
  }
  tutorialOverlay?.reposition();
}

function renderMissionQuickChips(scene) {
  if (!els.preflightQuickChips || !scene) return;
  const totalMass = (scene.droneMass ?? 1.2) + (scene.payloadMass ?? 0);
  const maxThrust = scene.maxThrust ?? 28.0;
  const chips = [];

  if (scene.targetZone) {
    chips.push({ icon: '⏱', label: `Hold ${scene.targetZone.holdRequired.toFixed(1)} s` });
    chips.push({ icon: '🎯', label: `Speed <= ${(scene.velocityTolerance ?? scene.targetZone.maxSpeed).toFixed(2)} m/s` });
  } else if (scene.landingPad) {
    chips.push({ icon: '🛬', label: `Touchdown <= ${(scene.velocityTolerance ?? scene.landingPad.maxTouchdownSpeed).toFixed(2)} m/s` });
  }
  if (scene.rings?.length) {
    chips.push({ icon: '⭕', label: `${scene.rings.length} Rings` });
  }
  chips.push({
    icon: '⚖',
    label: scene.payloadMass > 0 ? `${totalMass.toFixed(1)} kg (+Cargo)` : `${totalMass.toFixed(1)} kg`
  });
  const windX = scene.windForce?.x ?? 0;
  const hasGust = Boolean(scene.windGust && (scene.windGust.xAmp || scene.windGust.zAmp));
  chips.push({
    icon: '💨',
    label: hasGust
      ? `Gusts +${windX.toFixed(1)} N`
      : Math.abs(windX) > 0.1
        ? `Wind +${windX.toFixed(1)} N`
        : 'Calm Air'
  });
  chips.push({ icon: '⚡', label: `Max ${maxThrust.toFixed(0)} N` });
  if (Number.isFinite(scene.energyBudget)) {
    chips.push({ icon: '🔋', label: `Battery ${Math.round(scene.energyBudget)} J`, highlight: true });
  }

  els.preflightQuickChips.innerHTML = chips
    .map(
      (c) =>
        `<span class="playground-chip ${c.highlight ? 'is-highlight' : ''}"><span class="chip-ico" aria-hidden="true">${c.icon}</span>${c.label}</span>`
    )
    .join('');
}

function renderBenchPanel(scene = state.activeScene) {
  if (!scene) return;
  const challenge = getTuningChallengeForScene(scene);
  const history = state.benchHistoryByLevel[scene.id] || { previous: null, current: null };
  const curr = history.current;
  const prev = history.previous;

  if (els.benchChallengeTitle) els.benchChallengeTitle.textContent = challenge.title;
  if (els.benchTestLabel) {
    els.benchTestLabel.textContent = curr
      ? curr.testLabel
      : challenge.testType === 'wind'
        ? 'Wind Disturbance Test'
        : challenge.testType === 'takeoff_step'
          ? 'Takeoff Height Test'
          : 'Position Step Test';
  }

  const hasComparablePrev = Boolean(prev && curr && prev.experimentKey === curr.experimentKey);
  els.benchPrevLegend?.classList.toggle('hidden', !hasComparablePrev);

  if (!curr) {
    if (els.benchChallengeBadge) {
      els.benchChallengeBadge.textContent = 'Try Test PID';
      els.benchChallengeBadge.className = 'bench-status-pill is-idle';
    }
    if (els.benchMetricOvershoot) els.benchMetricOvershoot.textContent = '--';
    if (els.benchMetricSettling) els.benchMetricSettling.textContent = '--';
    if (els.benchMetricError) els.benchMetricError.textContent = '--';
    els.benchCompareStrip?.classList.add('hidden');
  } else {
    const m = curr.metrics;
    if (els.benchChallengeBadge) {
      if (curr.challenge.passed) {
        els.benchChallengeBadge.textContent = '✓ Goal Met!';
        els.benchChallengeBadge.className = 'bench-status-pill is-passed';
      } else {
        els.benchChallengeBadge.textContent = 'Keep Tuning';
        els.benchChallengeBadge.className = 'bench-status-pill is-working';
      }
    }

    if (els.benchMetricOvershoot) {
      if (curr.testType === 'wind') {
        els.benchMetricOvershoot.textContent = m.maxDeviation !== null ? `${m.maxDeviation.toFixed(2)} m drift` : 'N/A';
      } else {
        els.benchMetricOvershoot.textContent = m.overshootPct !== null ? `${Math.round(m.overshootPct)}%` : 'N/A';
      }
    }
    if (els.benchMetricSettling) {
      els.benchMetricSettling.textContent = m.settlingTime !== null ? `${m.settlingTime.toFixed(1)} s` : 'Not Settled';
    }
    if (els.benchMetricError) {
      els.benchMetricError.textContent = m.steadyStateError !== null ? `${m.steadyStateError.toFixed(2)} m` : 'N/A';
    }

    const comp = compareBenchTests(prev, curr);
    if (comp.comparable && comp.highlights.length > 0 && els.benchCompareStrip && els.benchCompareBadges) {
      els.benchCompareStrip.classList.remove('hidden');
      els.benchCompareBadges.innerHTML = comp.highlights
        .map(
          (h) =>
            `<span class="compare-badge is-${h.status}">${h.label} ${h.beforeText} &rarr; ${h.afterText}</span>`
        )
        .join('');
    } else {
      els.benchCompareStrip?.classList.add('hidden');
    }
  }

  renderTestBenchChart(els.testBenchCanvas, curr, prev);
}

function runCurrentBenchTest() {
  const scene = state.activeScene;
  if (!scene) return null;

  if (pipDebounceTimer) {
    window.clearTimeout(pipDebounceTimer);
    pipDebounceTimer = null;
  }

  const currentGains = state.tunedGainsByLevel[scene.id] || { ...sim.gains };
  const result = runPidBenchTest(currentGains, scene);
  const existing = state.benchHistoryByLevel[scene.id] || { previous: null, current: null };
  const previous = existing.current || null;
  state.benchHistoryByLevel[scene.id] = { previous, current: result };

  const comparison = compareBenchTests(previous, result);
  renderBenchPanel(scene);

  // Brief pulse feedback on Test Bench when challenge met or improved
  if (els.benchChallengeBadge && (result.challenge.passed || comparison.overallStatus === 'improved')) {
    els.benchChallengeBadge.classList.remove('bench-pop');
    void els.benchChallengeBadge.offsetWidth;
    els.benchChallengeBadge.classList.add('bench-pop');
  }

  // Update PIP speech bubble with real Test Bench evidence + gentle pop highlight (no blocking overlay)
  const pipData = evaluateTestBenchPipCoaching(result, comparison, currentGains, scene);
  renderPipCard(els.prePipCard, pipData);
  if (els.prePipCard?.card) {
    els.prePipCard.card.classList.remove('pip-coach-pop');
    void els.prePipCard.card.offsetWidth;
    els.prePipCard.card.classList.add('pip-coach-pop');
  }

  if (scene.mode === 'tutorial' && tutorialGuide.active) {
    tutorialGuide.recordBenchTest(result);
    syncTutorialOverlay(true);
  }
  return result;
}

function renderPreflightArenaPreview() {
  if (!previewRenderer || state.currentView !== 'preflight' || !state.activeScene) return;
  previewRenderer.render(sim, 0, {
    showGhostDrone: false,
    showTrails: false
  });
}

function renderPipCard(cardEls, coachData) {
  if (!cardEls?.card || !coachData) return;
  const stateLabels = {
    welcome: 'Greeting',
    greeting: 'Greeting',
    teaching: 'Teaching',
    warning: 'Warning',
    ready: 'Ready',
    success: 'Success',
    failure: 'Failure'
  };
  const mood = coachData.mood || resolvePipMood(coachData.state);
  const baseClass = cardEls === els.flightPipCard ? 'pip-card pip-card-compact' : 'pip-card';
  const nextClass = `${baseClass} pip-${coachData.state || 'teaching'} pip-expr-${mood}`;
  if (cardEls.card.className !== nextClass) {
    cardEls.card.className = nextClass;
  }
  if (cardEls.avatar && cardEls.card.dataset.pipMood !== mood) {
    cardEls.card.dataset.pipMood = mood;
    cardEls.avatar.innerHTML = renderPipRobotSvg(mood);
  }
  const nextBadge = stateLabels[coachData.state] || 'Coach';
  if (cardEls.badge.textContent !== nextBadge) {
    cardEls.badge.textContent = nextBadge;
  }
  if (cardEls.headline.textContent !== coachData.headline) {
    cardEls.headline.textContent = coachData.headline;
  }

  const nextMsg = (coachData.messages || [])[0] || '';
  let firstLi = cardEls.messages.firstElementChild;
  if (!firstLi || cardEls.messages.childElementCount !== 1) {
    cardEls.messages.innerHTML = '';
    firstLi = document.createElement('li');
    cardEls.messages.appendChild(firstLi);
  }
  if (firstLi.textContent !== nextMsg) {
    firstLi.textContent = nextMsg;
  }

  if (cardEls.learnMore && cardEls.learnMoreText) {
    const extra = coachData.learnMore || ((coachData.messages || []).length > 1 ? coachData.messages[1] : null);
    if (extra) {
      cardEls.learnMore.classList.remove('hidden');
      if (cardEls.learnMoreText.textContent !== extra) {
        cardEls.learnMoreText.textContent = extra;
        cardEls.learnMore.open = false;
      }
    } else {
      cardEls.learnMore.classList.add('hidden');
      if (cardEls.learnMoreText.textContent) {
        cardEls.learnMoreText.textContent = '';
      }
    }
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

function applyPidGains(rawGains, scene = state.activeScene, options = {}) {
  sim.setGains(rawGains);
  const gains = { ...sim.gains };
  if (scene?.id) {
    state.tunedGainsByLevel[scene.id] = { ...gains };
  }
  const analysis = syncAllPidPanels(gains, scene);
  renderPreflightPipWithTutorialBrief(analysis, scene, options);

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

const FREE_TUTORIAL_FOCUS = Object.freeze({
  'tutorial-2': { param: 'kp', label: 'Kp', decimals: 1, prompt: 'Adjust Kp, click Test PID to observe the curve, and click Start Flight whenever you feel ready!' },
  'tutorial-3': { param: 'ki', label: 'Ki', decimals: 2, prompt: 'Adjust Ki, click Test PID to watch wind drift on the curve, and click Start Flight whenever you feel ready!' },
  'tutorial-4': { param: 'kd', label: 'Kd', decimals: 1, prompt: 'Adjust Kd, click Test PID to check overshoot on the curve, and click Start Flight whenever you feel ready!' }
});

function renderPreflightPipWithTutorialBrief(analysis, scene = state.activeScene, options = {}) {
  if (!scene) {
    renderPipCard(els.prePipCard, analysis);
    return;
  }

  // Tutorials 2, 3, 4: No spotlight overlay — PIP coaches each parameter tweak toward Test PID -> observe curve -> fly when ready
  const freeFocus = FREE_TUTORIAL_FOCUS[scene.id];
  if (freeFocus) {
    const val = Number(sim.gains?.[freeFocus.param] ?? 0).toFixed(freeFocus.decimals);
    const headline = options.fromUserAdjust
      ? `${freeFocus.label} updated to ${val} — Click Test PID!`
      : `Experiment with ${freeFocus.label} & Test PID`;
    const msg = options.fromUserAdjust
      ? `Click Test PID to watch how ${freeFocus.label} = ${val} shapes the curve. When it looks right to you, click Start Flight!`
      : freeFocus.prompt;
    renderPipCard(els.prePipCard, {
      state: analysis.state === 'warning' ? 'warning' : options.fromUserAdjust ? 'teaching' : 'explaining',
      mood: options.fromUserAdjust ? 'thinking' : 'explaining',
      headline,
      messages: [msg],
      learnMore: scene.pipMetricBrief || null
    });
    return;
  }

  // Keep PIP speech bubble concise (1 primary suggestion) and grounded
  const compactMsg = analysis?.messages?.[0] || "Let's tune your drone and try Test PID!";
  if (scene.mode === 'tutorial' && analysis.state !== 'warning') {
    const challenge = getTuningChallengeForScene(scene);
    renderPipCard(els.prePipCard, {
      ...analysis,
      mood: analysis.state === 'ready' ? 'celebrating' : 'explaining',
      headline: analysis.state === 'ready' ? 'Ready to Test or Fly!' : challenge.title,
      messages: [analysis.state === 'ready' ? 'Click Test PID to verify, or press Start Flight!' : compactMsg],
      learnMore: scene.pipMetricBrief || null
    });
    return;
  }
  renderPipCard(els.prePipCard, {
    ...analysis,
    messages: [compactMsg]
  });
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

function schedulePipUpdate(gains, scene, options = {}) {
  if (pipDebounceTimer) {
    window.clearTimeout(pipDebounceTimer);
  }
  pipDebounceTimer = window.setTimeout(() => {
    pipDebounceTimer = null;
    const analysis = syncAllPidPanels(gains, scene);
    renderPreflightPipWithTutorialBrief(analysis, scene, options);
  }, 120);
}

// ==================== TUTORIAL SPOTLIGHT SYNC ====================
function getTutorialSafetyWarning(scene, gains) {
  if (scene?.id === 'tutorial-1' && gains.kp < 3.0) {
    return 'Tip: Kp is very low—raise Kp to at least 4.5 before takeoff so your drone can climb!';
  }
  return null;
}

function updatePreflightLaunchLock() {
  const locked = state.activeScene?.mode === 'tutorial' && tutorialGuide.isLaunchLocked();
  for (const btn of [els.btnPreStartFlight, els.btnPreStartFlight2]) {
    if (!btn) continue;
    btn.disabled = locked;
    btn.classList.toggle('is-launch-locked', locked);
    btn.textContent = locked ? 'Finish Steps to Fly' : 'Start Flight →';
    btn.title = locked
      ? 'Complete all guided steps before takeoff.'
      : 'Launch your drone into the mission arena';
  }
}

function syncTutorialOverlay(force = false) {
  updatePreflightLaunchLock();
  if (!tutorialOverlay) return;
  const step = tutorialGuide.getCurrentStep();
  if (
    state.activeScene?.mode !== 'tutorial' ||
    !tutorialGuide.isRunningForView(state.currentView) ||
    step?.spotlight === false
  ) {
    tutorialOverlay.hide();
    lastGuideRenderSig = '';
    updateGuideReopenButtons();
    return;
  }

  const prog = tutorialGuide.getProgressInfo();
  const warn = getTutorialSafetyWarning(state.activeScene, sim.gains);
  const sig = JSON.stringify({
    view: state.currentView,
    stepId: step?.stepId,
    sub: step?.wasdSubIndex,
    done: step?.wasdDone,
    zSub: step?.zoneSubIndex,
    zDone: step?.zoneDone,
    cur: prog.current,
    canNext: prog.canNext,
    canSkip: prog.canSkip,
    feedback: step?.statusFeedback,
    warn
  });

  if (force || sig !== lastGuideRenderSig) {
    lastGuideRenderSig = sig;
    tutorialOverlay.render(step, prog, warn);
  }
  updateGuideReopenButtons();
}

function updateGuideReopenButtons() {
  const hasSpotlightFlow = state.activeScene?.id === 'tutorial-1';
  const showReopen = hasSpotlightFlow && tutorialGuide.dismissed && !tutorialGuide.finished;
  els.btnPreflightReopenGuide.classList.toggle('hidden', !hasSpotlightFlow || !showReopen);
  els.btnFlightReopenGuide.classList.toggle('hidden', !hasSpotlightFlow);
  els.btnFlightReopenGuide.textContent = showReopen ? 'Reopen Guide' : 'Restart Guide';
}

// ==================== RESULT SCREEN (ANIMATED 3-STAR REVEAL & BREAKDOWN) ====================
function prefersReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function clearStarAnimationTimers() {
  for (const timerId of starAnimTimers) {
    window.clearTimeout(timerId);
  }
  starAnimTimers = [];
}

function spawnStarCelebrationParticles() {
  if (!els.resultStarParticles || prefersReducedMotion()) return;
  els.resultStarParticles.innerHTML = '';
  const count = 16;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.className = 'star-particle';
    const angle = (Math.PI * 2 * i) / count;
    const dist = 58 + (i % 3) * 28;
    dot.style.setProperty('--tx', `${Math.round(Math.cos(angle) * dist)}px`);
    dot.style.setProperty('--ty', `${Math.round(Math.sin(angle) * dist - 14)}px`);
    dot.style.animationDelay = `${(i % 4) * 35}ms`;
    els.resultStarParticles.appendChild(dot);
  }
}

function setResultStarSlotsInstant(stars) {
  starAnimTargetCount = stars;
  els.resultStarSlots.forEach((slot, idx) => {
    if (!slot) return;
    if (!slot.innerHTML) {
      slot.innerHTML = renderResultStarSvg(idx + 1);
    }
    const earned = idx + 1 <= stars;
    slot.classList.remove('is-revealing', 'is-earned-burst');
    slot.classList.toggle('is-earned', earned);
    slot.classList.toggle('is-locked', !earned);
  });
  els.resultHeroCard?.classList.toggle('is-three-star-celebration', stars === 3);
  els.resultDetailsStage?.classList.remove('is-pending-reveal');
  els.btnResultSkipAnim?.classList.add('hidden');
}

function skipStarAnimation() {
  clearStarAnimationTimers();
  setResultStarSlotsInstant(starAnimTargetCount);
}

function playStarRevealAnimation(stars) {
  clearStarAnimationTimers();
  starAnimTargetCount = stars;

  if (els.resultStarParticles) {
    els.resultStarParticles.innerHTML = '';
  }
  els.resultHeroCard?.classList.remove('is-three-star-celebration');

  els.resultStarSlots.forEach((slot, idx) => {
    if (!slot) return;
    slot.innerHTML = renderResultStarSvg(idx + 1);
    slot.classList.remove('is-earned', 'is-revealing', 'is-earned-burst');
    slot.classList.add('is-locked');
  });

  if (stars <= 0 || prefersReducedMotion()) {
    setResultStarSlotsInstant(stars);
    return;
  }

  // Trigger clean reflow so repeated attempts replay keyframes cleanly
  void els.resultStarRow?.offsetWidth;

  els.resultDetailsStage?.classList.add('is-pending-reveal');
  els.btnResultSkipAnim?.classList.remove('hidden');

  const stepDelays = [300, 700, 1100];
  for (let i = 0; i < stars; i++) {
    const slot = els.resultStarSlots[i];
    const delay = stepDelays[i] ?? 300 + i * 400;
    const tId = window.setTimeout(() => {
      if (!slot) return;
      slot.classList.remove('is-locked');
      slot.classList.add('is-earned', 'is-revealing', 'is-earned-burst');
      if (i === 2 && stars === 3) {
        els.resultHeroCard?.classList.add('is-three-star-celebration');
        spawnStarCelebrationParticles();
      }
    }, delay);
    starAnimTimers.push(tId);
  }

  const finishDelay = stars === 1 ? 750 : stars === 2 ? 1150 : 1580;
  starAnimTimers.push(
    window.setTimeout(() => {
      els.resultDetailsStage?.classList.remove('is-pending-reveal');
      els.btnResultSkipAnim?.classList.add('hidden');
    }, finishDelay)
  );
}

function renderSummaryCriteriaRows(breakdown) {
  if (!els.resultSummaryCriteria || !breakdown?.summaryRows) return;
  els.resultSummaryCriteria.innerHTML = '';
  for (const row of breakdown.summaryRows) {
    const div = document.createElement('div');
    div.className = `summary-criterion-row ${row.passed ? 'is-pass' : 'is-fail'}`;
    div.innerHTML = `
      <span class="summary-criterion-title">${row.passed ? '✓' : '✕'} ${row.label}</span>
      <div class="summary-criterion-vals">
        <strong>${row.actualText}</strong>
        <span>Target: ${row.targetText}</span>
      </div>
    `;
    els.resultSummaryCriteria.appendChild(div);
  }
}

function renderCriteriaList(ulEl, checks) {
  ulEl.innerHTML = '';
  for (const c of checks) {
    const li = document.createElement('li');
    li.className = c.passed ? 'is-pass' : 'is-fail';
    const meta = c.actualText ? `<span class="criteria-meta-val">${c.actualText}</span>` : '';
    li.innerHTML = `<span>${c.passed ? '✓' : '✕'} ${c.label}</span>${meta}`;
    ulEl.appendChild(li);
  }
}

function renderResultReportCharts() {
  if (!resultReportExpanded || !resultChartPayload || state.currentView !== 'result') return;
  const { strategyProfile, prevStrat, priorities, prevTrail, telemetry, maxThrust } = resultChartPayload;
  renderStrategyRadar(els.resultStrategyCanvas, strategyProfile, prevStrat, priorities);
  renderRouteFitPreview(els.resultRouteCanvas, sim, prevTrail);
  renderTelemetryTimeSeriesPlot(els.resultTelemetryCanvas, telemetry, maxThrust);
}

function setResultReportExpanded(expanded) {
  resultReportExpanded = Boolean(expanded);
  els.resultReportAccordion?.classList.toggle('is-expanded', resultReportExpanded);
  els.btnResultReportToggle?.setAttribute('aria-expanded', String(resultReportExpanded));
  els.resultReportBody?.setAttribute('aria-hidden', String(!resultReportExpanded));

  if (resultReportExpanded) {
    // Render charts once visible so Canvas measures real layout dimensions cleanly
    window.requestAnimationFrame(() => {
      renderResultReportCharts();
      window.setTimeout(() => renderResultReportCharts(), 240);
    });
  }
}

function configureResultActions({ isSuccess, nextId, showChallengeShortcut }) {
  const primaryRow = els.resultActionsBar?.querySelector('.result-actions-primary-row');
  const secondaryRow = els.resultActionsBar?.querySelector('.result-actions-secondary-row');
  if (!primaryRow || !secondaryRow) return;

  const setBtn = (btn, row, className, visible) => {
    if (!btn) return;
    btn.className = className;
    btn.classList.toggle('hidden', !visible);
    if (visible && btn.parentElement !== row) {
      row.appendChild(btn);
    }
  };

  if (isSuccess) {
    if (nextId) {
      setBtn(els.btnResultNext, primaryRow, 'btn btn-primary btn-lg', true);
      setBtn(els.btnResultChallenges, primaryRow, 'btn btn-challenge btn-lg', false);
      setBtn(els.btnResultRetry, primaryRow, 'btn btn-result-secondary btn-lg', true);
      setBtn(els.btnResultPreflight, secondaryRow, 'btn btn-result-subtle btn-sm', true);
      setBtn(els.btnResultLevels, secondaryRow, 'btn btn-result-subtle btn-sm', true);
    } else if (showChallengeShortcut) {
      setBtn(els.btnResultNext, primaryRow, 'btn btn-primary btn-lg', false);
      setBtn(els.btnResultChallenges, primaryRow, 'btn btn-challenge btn-lg', true);
      setBtn(els.btnResultRetry, primaryRow, 'btn btn-result-secondary btn-lg', true);
      setBtn(els.btnResultPreflight, secondaryRow, 'btn btn-result-subtle btn-sm', true);
      setBtn(els.btnResultLevels, secondaryRow, 'btn btn-result-subtle btn-sm', true);
    } else {
      // Last challenge mission (no next level): Back to Levels becomes primary
      setBtn(els.btnResultNext, primaryRow, 'btn btn-primary btn-lg', false);
      setBtn(els.btnResultChallenges, primaryRow, 'btn btn-challenge btn-lg', false);
      setBtn(els.btnResultLevels, primaryRow, 'btn btn-primary btn-lg', true);
      setBtn(els.btnResultRetry, primaryRow, 'btn btn-result-secondary btn-lg', true);
      setBtn(els.btnResultPreflight, secondaryRow, 'btn btn-result-subtle btn-sm', true);
    }
  } else {
    // Failure: Retry primary, Pre-flight Tuning secondary, Back to Levels subtle
    setBtn(els.btnResultNext, primaryRow, 'btn btn-primary btn-lg', false);
    setBtn(els.btnResultChallenges, primaryRow, 'btn btn-challenge btn-lg', false);
    setBtn(els.btnResultRetry, primaryRow, 'btn btn-primary btn-lg', true);
    setBtn(els.btnResultPreflight, primaryRow, 'btn btn-result-secondary btn-lg', true);
    setBtn(els.btnResultLevels, secondaryRow, 'btn btn-result-subtle btn-sm', true);
  }
}

function showResultScreen(outcome, metrics, scoreResult, previousAttempt = null) {
  const isSuccess = outcome.status === 'completed';
  const isTutorial = state.activeScene?.mode === 'tutorial';

  clearStarAnimationTimers();
  setResultReportExpanded(false);
  els.resultHeroCard?.classList.toggle('is-failed', !isSuccess);
  els.resultHeroCard?.classList.remove('is-three-star-celebration');

  els.resultBadge.textContent = isSuccess ? 'Mission Complete' : 'Mission Failed';
  els.resultTitle.textContent = isSuccess ? 'Mission Complete!' : 'Mission Failed';
  const storyMission = getStoryMission(state.activeScene?.id);
  els.resultLevelSubtitle.textContent = storyMission?.storyTitle || state.activeScene?.name || '';

  // Act I Completion Banner (T4) & Act III SKYGUARD Flight Engineer Certificate (L6)
  if (els.resultStoryMilestone) {
    const isAct1Done = isSuccess && state.activeScene?.id === 'tutorial-4';
    const isAct3Done = isSuccess && state.activeScene?.id === 'level-6';
    els.resultStoryMilestone.classList.toggle('hidden', !isAct1Done && !isAct3Done);
    els.resultStoryMilestone.classList.toggle('is-final-cert', isAct3Done);
    if (isAct3Done) {
      const end = STORY_ENDINGS.act3Complete;
      els.resultStoryVisual.innerHTML = `
        <div class="story-final-duo">
          ${renderPipRobotSvg('celebrating', 'pip-cert-avatar')}
          ${renderFlightEngineerBadgeSvg()}
        </div>
      `;
      els.resultStoryBadge.textContent = end.badge;
      els.resultStoryHeading.textContent = end.title;
      els.resultStoryLine.textContent = end.line;
    } else if (isAct1Done) {
      const end = STORY_ENDINGS.act1Complete;
      els.resultStoryVisual.innerHTML = renderPipRobotSvg('celebrating', 'pip-avatar-mini');
      els.resultStoryBadge.textContent = end.badge;
      els.resultStoryHeading.textContent = end.title;
      els.resultStoryLine.textContent = end.line;
    }
  }

  // M5: Unified conversational PIP Flight Coach Telemetry Report (both Tutorial & Challenge)
  const telemetry = sim.getTelemetrySeries();
  const report = generatePipDiagnosticReport(
    telemetry,
    metrics,
    outcome,
    state.activeScene,
    previousAttempt
  );

  // Unified Minimal Showcase: Stars + Actions always centered; Failure details tucked into Detailed Report
  els.resultStarsBox.classList.remove('hidden');
  els.resultTutorialOutcomeBox.classList.add('hidden');
  els.resultFailedHero.classList.toggle('hidden', isSuccess);
  els.resultRatingCard.classList.remove('hidden');
  els.resultTutorialCard.classList.add('hidden');

  const breakdown = buildRatingBreakdown(scoreResult, metrics, outcome);
  renderSummaryCriteriaRows(breakdown);
  renderCriteriaList(els.resultChecks2Star, scoreResult.checks2Star);
  renderCriteriaList(els.resultChecks3Star, scoreResult.checks3Star);

  if (!isSuccess) {
    els.resultStarsDisplay.textContent = renderStarsText(0);
    els.resultStarsDisplay.setAttribute('aria-label', '0 of 3 stars');
    els.resultStarRow?.setAttribute('aria-label', '0 of 3 stars');
    els.resultStarLabel.textContent = '0 / 3 Stars';
    els.resultNextStarTip.classList.add('hidden');
    setResultStarSlotsInstant(0);
    els.resultFailedPipAvatar.innerHTML = renderPipRobotSvg('warning', 'pip-avatar-mini');
    els.resultFailedReason.textContent = outcome.message || 'Mission failed before reaching the target.';
    els.resultFailedPipTip.textContent = `PIP Tip: ${report.primaryTip}`;
    els.resultFailedStats.innerHTML = `
      <span class="result-failed-stat-pill">Time<strong>${metrics.completionTime.toFixed(1)} s</strong></span>
      <span class="result-failed-stat-pill">Max Overshoot<strong>${metrics.maxOvershoot.toFixed(2)} m</strong></span>
      <span class="result-failed-stat-pill">Avg Error<strong>${metrics.averageTrackingError.toFixed(2)} m</strong></span>
      <span class="result-failed-stat-pill">PID<strong>${formatGainsText(metrics.pidParameters)}</strong></span>
    `;
  } else {
    els.resultStarsDisplay.textContent = renderStarsText(scoreResult.stars);
    els.resultStarsDisplay.setAttribute('aria-label', `${scoreResult.stars} of 3 stars`);
    els.resultStarRow?.setAttribute('aria-label', `${scoreResult.stars} of 3 stars`);
    els.resultStarLabel.textContent = `${scoreResult.stars} / 3 Stars`;
    const nextStarTip = buildNextStarAdvice(scoreResult, metrics, report.diagnostics, state.activeScene);
    if (nextStarTip) {
      els.resultNextStarTip.textContent = nextStarTip;
      els.resultNextStarTip.classList.remove('hidden');
    } else {
      els.resultNextStarTip.classList.add('hidden');
    }
    playStarRevealAnimation(scoreResult.stars);
  }

  // Concise single-sentence PIP quick feedback directly grounded in real telemetry & scoring
  const concisePip = buildConcisePipResultFeedback(report, scoreResult, outcome, state.activeScene);
  if (els.resultPipShortAvatar) {
    els.resultPipShortAvatar.innerHTML = renderPipRobotSvg(concisePip.mood, 'pip-avatar-mini');
  }
  if (els.resultPipShortText) {
    els.resultPipShortText.textContent = concisePip.text;
  }
  if (els.resultPipShortCard) {
    els.resultPipShortCard.classList.toggle('is-failed', !isSuccess);
    els.resultPipShortCard.classList.toggle('is-three-star', isSuccess && scoreResult.stars === 3);
  }

  const fmtMetric = (val, fmt) => (Number.isFinite(val) ? fmt(val) : 'N/A');
  els.resultTime.textContent = fmtMetric(metrics.completionTime, (v) => `${v.toFixed(1)} s`);
  els.resultOvershoot.textContent = fmtMetric(metrics.maxOvershoot, (v) => `${v.toFixed(2)} m`);
  els.resultSettling.textContent = fmtMetric(metrics.settlingTime, (v) => `${v.toFixed(1)} s`);
  els.resultRouteFit.textContent =
    Number.isFinite(metrics.pathFitScore) && Number.isFinite(metrics.pathDeviation)
      ? `${metrics.pathFitScore.toFixed(0)}% (${metrics.pathDeviation.toFixed(2)} m dev)`
      : 'N/A';
  els.resultSmoothness.textContent = fmtMetric(metrics.flightSmoothness, (v) => `${v.toFixed(0)}%`);
  if (els.resultEnergy) {
    els.resultEnergy.textContent = Number.isFinite(metrics.energyRemainingPct)
      ? `${metrics.energyRemainingPct.toFixed(0)}% left (${Math.round(metrics.energyUsed ?? 0)} J)`
      : Number.isFinite(metrics.energyUsed)
        ? `${Math.round(metrics.energyUsed)} J (${Math.round(metrics.peakPower ?? 0)} W pk)`
        : 'N/A';
  }
  els.resultAvgError.textContent = fmtMetric(metrics.averageTrackingError, (v) => `${v.toFixed(2)} m`);
  els.resultSaturation.textContent = fmtMetric(metrics.controlSaturationDuration, (v) => `${v.toFixed(2)} s`);
  els.resultPid.textContent = metrics.pidParameters ? formatGainsText(metrics.pidParameters) : 'N/A';

  els.resultPipAvatar.innerHTML = renderPipRobotSvg(report.mood);
  els.resultPipTitle.textContent = report.title;
  els.resultPipHeadline.textContent = report.headline;
  els.resultPipExplanation.textContent = report.spokenSummary;
  if (els.resultPipStrategy && report.strategyVerdict) {
    els.resultPipStrategy.textContent = report.strategyVerdict;
    els.resultPipStrategy.classList.remove('hidden');
  } else if (els.resultPipStrategy) {
    els.resultPipStrategy.classList.add('hidden');
  }
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
  if (bestRef) {
    els.resultBestRef.classList.remove('hidden');
    els.resultBestRef.textContent = `Best Recorded PID (reference only): Kp ${bestRef.kp.toFixed(1)} / Ki ${bestRef.ki.toFixed(2)} / Kd ${bestRef.kd.toFixed(1)}`;
  } else {
    els.resultBestRef.classList.add('hidden');
  }

  const nextId = isSuccess ? state.activeScene?.nextLevelId : null;
  els.btnResultNext.dataset.nextId = nextId || '';
  const showChallengeShortcut = isTutorial && isSuccess && !nextId;
  configureResultActions({ isSuccess, nextId, showChallengeShortcut });

  if (isTutorial && tutorialGuide.active) {
    tutorialGuide.jumpToView('result');
  }

  const prevTrail = previousAttempt?.trail || null;
  const prevStrat = previousAttempt?.strategyProfile || null;
  els.resultPrevLegend.classList.toggle('hidden', !(prevTrail?.length > 1));
  els.resultStrategyPrevLegend?.classList.toggle('hidden', !prevStrat);

  resultChartPayload = {
    strategyProfile: report.strategyProfile,
    prevStrat,
    priorities: state.activeScene?.strategyProfile?.priorities || null,
    prevTrail,
    telemetry,
    maxThrust: sim.config.maxThrust
  };

  navigateTo('result');
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

// ==================== SKYGUARD MISSION CARD & CARTOON MAP ====================
function openMissionCard(levelId) {
  const mission = getStoryMission(levelId);
  const scene = getSceneById(levelId);
  if (!scene) return;
  if (!mission || !els.missionCardModal) {
    openPreflightTuning(scene, { resetToInitial: true, restartGuide: true });
    return;
  }

  state.pendingMissionCardLevelId = levelId;
  els.missionCardBadge.textContent = mission.badgeLabel;
  els.missionCardTitle.textContent = mission.storyTitle;
  els.missionCardArt.innerHTML = renderMissionCardIllustrationSvg(levelId);
  els.missionCardPipAvatar.innerHTML = renderPipRobotSvg(mission.pipMood, 'pip-avatar-mini');
  els.missionCardPipLine.textContent = `"${mission.pipLine}"`;
  els.missionCardObjective.textContent = mission.objective;
  els.missionCardConditions.innerHTML = (mission.conditions || [])
    .slice(0, 3)
    .map(
      (c) => `<span class="mission-cond-chip"><span aria-hidden="true">${c.icon}</span>${c.label}</span>`
    )
    .join('');

  const completed = isLevelCompleted(state.progress, levelId);
  if (els.btnMissionCardSkip) {
    els.btnMissionCardSkip.textContent = completed ? 'Skip (Cleared)' : 'Skip';
  }
  els.missionCardModal.classList.remove('hidden');
  els.btnMissionCardTune?.focus();
}

function closeMissionCard() {
  state.pendingMissionCardLevelId = null;
  els.missionCardModal?.classList.add('hidden');
}

function proceedFromMissionCard() {
  const levelId = state.pendingMissionCardLevelId;
  closeMissionCard();
  const scene = getSceneById(levelId);
  if (scene) {
    if (state.pipIntroOpen) closePipIntro(true);
    openPreflightTuning(scene, { resetToInitial: true, restartGuide: true });
  }
}

function renderMapPreview(levelId) {
  const mission = getStoryMission(levelId) || STORY_MISSIONS[0];
  if (!mission || !els.mapPreviewCard) return;

  state.selectedMapLevelId = mission.id;
  const unlocked = isLevelUnlocked(state.progress, mission.id);
  const completed = isLevelCompleted(state.progress, mission.id);
  const stars = getBestStars(state.progress, mission.id);

  els.mapPreviewCard.classList.toggle('is-locked', !unlocked);
  els.mapPreviewCard.classList.toggle('is-act-1', mission.act === 1);
  els.mapPreviewCard.classList.toggle('is-act-2', mission.act === 2);

  if (els.mapPreviewArt) {
    els.mapPreviewArt.innerHTML = renderMissionCardIllustrationSvg(mission.id);
  }
  if (els.mapPreviewBadge) {
    els.mapPreviewBadge.textContent = mission.badgeLabel;
  }
  if (els.mapPreviewZone) {
    els.mapPreviewZone.textContent = mission.zoneName;
  }
  if (els.mapPreviewStars) {
    els.mapPreviewStars.textContent = renderStarsText(stars);
    els.mapPreviewStars.setAttribute('aria-label', `${stars} of 3 stars`);
  }
  if (els.mapPreviewTitle) {
    els.mapPreviewTitle.textContent = mission.storyTitle;
  }
  if (els.mapPreviewPip) {
    els.mapPreviewPip.textContent = unlocked
      ? `PIP: "${mission.pipLine}"`
      : 'Complete the previous mission to unlock this SKYGUARD site.';
  }
  if (els.mapPreviewConditions) {
    els.mapPreviewConditions.innerHTML = (mission.conditions || [])
      .slice(0, 3)
      .map((c) => `<span class="mission-cond-chip"><span aria-hidden="true">${c.icon}</span>${c.label}</span>`)
      .join('');
  }
  if (els.btnMapPlay) {
    els.btnMapPlay.disabled = !unlocked;
    els.btnMapPlay.className = !unlocked
      ? 'btn btn-ghost btn-lg'
      : mission.act === 1
        ? 'btn btn-tutorial btn-lg'
        : 'btn btn-challenge btn-lg';
    els.btnMapPlay.textContent = !unlocked ? '🔒 Locked' : completed ? 'Replay Mission →' : 'Play →';
  }
  if (els.btnMapQuickTune) {
    els.btnMapQuickTune.classList.toggle('hidden', !(unlocked && completed));
  }

  for (const nodeEl of els.levelsGrid?.querySelectorAll('.map-node') || []) {
    const isSel = nodeEl.dataset.levelId === mission.id;
    nodeEl.classList.toggle('is-selected', isSel);
    nodeEl.setAttribute('aria-pressed', String(isSel));
  }
}

function renderLevelSelection(mode) {
  const normalizedMode = mode === 'challenge' ? 'challenge' : mode === 'tutorial' ? 'tutorial' : state.currentMode;
  state.currentMode = normalizedMode;
  const activeFilter = mode === 'all' ? 'all' : mode === 'tutorial' || mode === 'challenge' ? mode : state.mapFilter;
  state.mapFilter = activeFilter;

  const tutSummary = getModeSummary(state.progress, 'tutorial');
  const chalSummary = getModeSummary(state.progress, 'challenge');
  const isTutorialFocus = activeFilter === 'tutorial';
  const isChallengeFocus = activeFilter === 'challenge';

  els.levelsBanner.classList.toggle('is-tutorial', isTutorialFocus);
  els.levelsBanner.classList.toggle('is-challenge', isChallengeFocus);
  els.levelsModeBadge.textContent = isTutorialFocus
    ? 'Act I · Drone Academy'
    : isChallengeFocus
      ? 'Act II · Rescue Missions'
      : 'Project SKYGUARD';
  els.levelsHeading.textContent = isTutorialFocus
    ? 'Act I — Drone Academy Map'
    : isChallengeFocus
      ? 'Act II — Rescue Mission Map'
      : 'SKYGUARD Adventure Map';
  els.levelsDescription.textContent = isTutorialFocus
    ? 'Train with PIP at Drone Academy, then cross the bridge into Rescue City!'
    : isChallengeFocus
      ? 'Follow the storm rescue route from Rescue Base to the Final Rescue Site.'
      : 'Drone Academy → Rescue Missions → Final Rescue → Flight Engineer Certificate';

  const totalEarned = tutSummary.earnedStars + chalSummary.earnedStars;
  const totalMax = tutSummary.maxStars + chalSummary.maxStars;
  els.levelsStarSummary.textContent = isTutorialFocus
    ? `${tutSummary.earnedStars} / ${tutSummary.maxStars} ★`
    : isChallengeFocus
      ? `${chalSummary.earnedStars} / ${chalSummary.maxStars} ★`
      : `${totalEarned} / ${totalMax} ★`;

  els.btnMeetPip.classList.toggle('hidden', isChallengeFocus);
  els.mapEngineerPill?.classList.toggle('hidden', !isLevelCompleted(state.progress, 'level-6'));

  for (const tabBtn of els.mapTabButtons || []) {
    const active = tabBtn.dataset.mapFilter === activeFilter;
    tabBtn.classList.toggle('is-active', active);
    tabBtn.setAttribute('aria-selected', String(active));
  }

  if (isTutorialFocus && !hasSeenPipIntro(state.progress)) {
    openPipIntro(false);
  } else if (isChallengeFocus) {
    closePipIntro(false);
  }

  // Render colorful low-poly cartoon island & city map backdrop
  if (els.missionMapBackdrop) {
    els.missionMapBackdrop.innerHTML = renderMissionMapBackdropSvg(state.progress);
  }

  const currentRecommendedId = getRecommendedCurrentNodeId(state.progress, activeFilter);
  const newlyUnlockedId = state.newlyUnlockedLevelId;
  els.levelsGrid.innerHTML = '';

  for (const mission of STORY_MISSIONS) {
    const unlocked = isLevelUnlocked(state.progress, mission.id);
    const completed = isLevelCompleted(state.progress, mission.id);
    const stars = getBestStars(state.progress, mission.id);
    const isCurrent = unlocked && mission.id === currentRecommendedId;
    const isDimmed = activeFilter !== 'all' && mission.mode !== activeFilter;
    const isNewlyUnlocked = unlocked && newlyUnlockedId === mission.id;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = [
      'map-node',
      mission.act === 1 ? 'is-act-1' : 'is-act-2',
      unlocked ? 'is-unlocked' : 'is-locked',
      completed ? 'is-completed' : '',
      isCurrent ? 'is-current' : '',
      isDimmed ? 'is-dimmed' : '',
      isNewlyUnlocked ? 'is-newly-unlocked' : ''
    ]
      .filter(Boolean)
      .join(' ');
    node.dataset.levelId = mission.id;
    node.style.left = `${((mission.mapCoords.x / 1120) * 100).toFixed(2)}%`;
    node.style.top = `${((mission.mapCoords.y / 520) * 100).toFixed(2)}%`;
    node.setAttribute(
      'aria-label',
      `${mission.storyTitle} (${mission.zoneName}) — ${!unlocked ? 'Locked' : completed ? `${stars} of 3 stars` : 'Unlocked'}`
    );

    const badgeInner = !unlocked
      ? `<svg class="map-lock-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" /><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>`
      : `<span class="map-node-code">${mission.code}</span>`;

    const checkMarkup = completed ? '<span class="map-node-check" aria-hidden="true">✓</span>' : '';
    const starsMarkup = unlocked
      ? `<span class="map-node-stars" aria-hidden="true">${renderStarsText(stars)}</span>`
      : '<span class="map-node-stars is-locked-lbl" aria-hidden="true">Locked</span>';

    node.innerHTML = `
      <span class="map-node-pin">
        ${badgeInner}
        ${checkMarkup}
      </span>
      ${starsMarkup}
      <span class="map-node-label">${mission.shortLabel}</span>
    `;

    node.addEventListener('click', () => {
      const wasSelected = state.selectedMapLevelId === mission.id;
      renderMapPreview(mission.id);
      if (!unlocked) return;
      if (wasSelected) {
        openMissionCard(mission.id);
      }
    });

    els.levelsGrid.appendChild(node);
  }

  // Pick initial selected node: newly unlocked > active frontier in current filter > current selected
  const initialSelected =
    (newlyUnlockedId && isLevelUnlocked(state.progress, newlyUnlockedId) ? newlyUnlockedId : null) ||
    currentRecommendedId ||
    STORY_MISSIONS[0].id;
  renderMapPreview(initialSelected);

  if (newlyUnlockedId) {
    state.newlyUnlockedLevelId = null;
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

  const storyMission = getStoryMission(scene.id);
  els.preflightModeBadge.textContent = isTutorial ? 'Act I · Drone Academy' : 'Act II · Rescue Mission';
  els.preflightTitle.textContent = storyMission?.storyTitle || scene.name;
  if (els.preflightShortGoal) {
    els.preflightShortGoal.textContent = scene.objective || scene.missionGoal || '';
  }
  els.preflightDescription.textContent = scene.description || scene.flightConditions || scene.objective;
  els.preflightLearningFocus.textContent = scene.stemTopic || scene.learningObjective || 'PID Control';
  els.preflightObjective.textContent = scene.objective;
  els.preflightSuccessReq.textContent = scene.missionGoal || scene.objective;
  els.preflightConditions.textContent = scene.flightConditions || scene.windLabel || 'Standard Arena';
  els.preflightPrevKnowledge.textContent = scene.whatYouLearnedBefore || 'Standard WASD closed-loop control.';
  els.preflightNewChallenge.textContent = scene.newChallenge || scene.description || scene.objective;
  els.preflightLearningObj.textContent = scene.learningObjective ? `Objective: ${scene.learningObjective}` : '';

  renderMissionQuickChips(scene);
  closeParamExplainer();
  if (els.preflightDetailsMission) els.preflightDetailsMission.open = false;
  if (els.preflightDetailsSpecs) els.preflightDetailsSpecs.open = false;
  if (els.preflightDetailsTradeoffs) els.preflightDetailsTradeoffs.open = false;

  els.preflightDroneMass.textContent = `${droneMass.toFixed(2)} kg`;
  els.preflightPayload.textContent =
    payloadMass > 0 ? `+${payloadMass.toFixed(2)} kg (${totalMass.toFixed(2)} kg total)` : '0.00 kg (Unladen)';
  els.preflightWind.textContent = scene.windLabel || 'Calm Air (0.0 N)';
  els.preflightMaxThrust.textContent = `${maxThrust.toFixed(1)} N (TWR ${twr.toFixed(2)})`;
  els.preflightMaxTilt.textContent = `${scene.maxTilt ?? 32} deg`;
  els.preflightTimeLimit.textContent = Number.isFinite(scene.timeLimit) ? `${scene.timeLimit} s` : 'No Limit';
  if (els.preflightBatteryBudget) {
    els.preflightBatteryBudget.textContent = Number.isFinite(scene.energyBudget)
      ? `${Math.round(scene.energyBudget)} J (Strict Limit)`
      : 'Unlimited (Monitored)';
  }
  if (els.preflightStrategyTag && els.preflightStrategyPills) {
    const sp = scene.strategyProfile || {
      focusTag: 'Balanced Control',
      priorities: { speed: 2, stability: 2, precision: 2, efficiency: 2 },
      tradeoffHint: 'Balance responsiveness, stability, precision, and battery efficiency.'
    };
    els.preflightStrategyTag.textContent = sp.focusTag;
    els.preflightStrategyHint.textContent = sp.tradeoffHint;
    const labels = [
      ['speed', 'Speed'],
      ['stability', 'Stability'],
      ['precision', 'Precision'],
      ['efficiency', 'Energy']
    ];
    els.preflightStrategyPills.innerHTML = labels
      .map(([k, lbl]) => {
        const lvl = sp.priorities?.[k] ?? 2;
        return `<div class="strategy-prio-pill ${lvl >= 3 ? 'is-high' : ''}"><span>${lbl}</span><strong>${'★'.repeat(lvl)}${'☆'.repeat(3 - lvl)}</strong></div>`;
      })
      .join('');
  }
  els.btnPreflightMeetPip.classList.toggle('hidden', !isTutorial);

  const aid = isTutorial && scene.visualId ? getStemVisualAid(scene.visualId) : null;
  if (aid) {
    els.preflightVisualAid.classList.remove('hidden');
    els.preflightVisualTitle.textContent = aid.title;
    els.preflightVisualSvg.innerHTML = renderInteractiveVisualAidHtml(scene.visualId);
    bindVisualAidInteractions(els.preflightVisualSvg);
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
    delete state.benchHistoryByLevel[scene.id];
  } else {
    gainsToUse = state.tunedGainsByLevel[scene.id] || { ...initialGains };
  }

  els.prePidBadge.textContent = scene?.strategyProfile?.hideRecommendedZone
    ? 'Autonomous Strategy'
    : initialGains.kp === 0 && initialGains.ki === 0 && initialGains.kd === 0
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

  updatePreflightLaunchLock();
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
  els.btnOpenPreflight.classList.remove('hidden');
  els.flightPidBadge.textContent = allowLiveTuning ? 'Live Gains' : 'Pre-flight Locked';

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
  const now = performance.now();
  if (!force && now - lastFlightPipUpdateAt < 220) return;

  const step = tutorialGuide.isRunningForView('flight') ? tutorialGuide.getCurrentStep() : null;
  const coachData = evaluateLiveFlightCoaching(sim, state.activeScene, step);
  const sig = `${coachData.state}|${coachData.headline}|${coachData.messages.join(';')}`;
  if (force || sig !== lastFlightPipSig) {
    lastFlightPipSig = sig;
    lastFlightPipUpdateAt = now;
    renderPipCard(els.flightPipCard, coachData);
  }
}

function updateFlightHud() {
  const snap = sim.getSnapshot();
  const limit = state.activeScene?.timeLimit;
  els.flightTimer.textContent = Number.isFinite(limit)
    ? `${snap.elapsedTime.toFixed(1)} / ${limit} s`
    : `${snap.elapsedTime.toFixed(1)} s`;

  if (els.flightBatteryPill && els.flightBatteryText) {
    const powerW = Math.round(snap.drone.instantPower ?? 0);
    if (Number.isFinite(snap.energyRemainingPct)) {
      const pct = Math.max(0, Math.min(100, snap.energyRemainingPct));
      els.flightBatteryBarWrap?.classList.remove('hidden');
      if (els.flightBatteryBarFill) els.flightBatteryBarFill.style.width = `${pct.toFixed(0)}%`;
      els.flightBatteryText.textContent = `${pct.toFixed(0)}% · ${powerW} W`;
      els.flightBatteryPill.classList.toggle('is-low', pct < 20);
      els.flightBatteryPill.classList.toggle('is-warn', pct >= 20 && pct < 40);
    } else {
      els.flightBatteryBarWrap?.classList.add('hidden');
      els.flightBatteryText.textContent = `${Math.round(snap.energyUsed ?? 0)} J · ${powerW} W`;
      els.flightBatteryPill.classList.remove('is-low', 'is-warn');
    }
  }

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
  let statusClass = 'status-pill';
  if (snap.paused) {
    statusLabel = 'Paused';
    statusClass = 'status-pill is-paused';
  } else if (snap.targetZone?.stabilized || snap.landingPad?.landedSafely) {
    statusLabel = 'Mission Complete!';
    statusClass = 'status-pill is-stabilized';
  } else if (snap.landingPad?.inside) {
    statusLabel = `On Helipad (${snap.landingPad.holdTimer.toFixed(1)}s)`;
  } else if (snap.targetZone?.inside) {
    statusLabel = `Inside Target (${snap.targetZone.holdTimer.toFixed(1)}s)`;
  } else if (satFlag) {
    statusLabel = 'Thrust Saturated!';
    statusClass = 'status-pill is-saturated';
  } else if (snap.started) {
    statusLabel = snap.drone.onGround ? 'Armed (On Ground)' : 'In Flight';
  }
  if (els.flightStatus.className !== statusClass) {
    els.flightStatus.className = statusClass;
  }
  if (els.flightStatus.textContent !== statusLabel) {
    els.flightStatus.textContent = statusLabel;
  }

  if (snap.rings.length > 0) {
    const ringText = `Rings Cleared: ${snap.nextRingIndex} / ${snap.rings.length}`;
    if (els.challengeCheckpointPill.textContent !== ringText) {
      els.challengeCheckpointPill.textContent = ringText;
    }
  }

  updateFlightPipCard(false);
  updateLiveControlBadges(false);
  const axisSpan = state.livePlotAxis === 'x' ? sim.config.worldWidth : sim.config.worldHeight;
  renderLivePidResponseChart(els.flightResponseCanvas, sim.telemetry, state.livePlotAxis, axisSpan);
}

function updateLiveControlBadges(force = false) {
  if (!els.liveControlBadges) return;
  const now = performance.now();
  if (!force && now - lastControlBadgeUpdateAt < 240) return;
  const badges = evaluateLiveControlStatus(sim.telemetry, sim, state.activeScene);
  const sig = badges.map((b) => `${b.key}:${b.tone}`).join('|');
  if (!force && sig === lastControlBadgeSig) return;
  lastControlBadgeSig = sig;
  lastControlBadgeUpdateAt = now;
  els.liveControlBadges.innerHTML = '';
  for (const badge of badges) {
    const span = document.createElement('span');
    span.className = `control-state-badge is-${badge.tone}`;
    span.textContent = `${badge.icon} ${badge.label}`;
    els.liveControlBadges.appendChild(span);
  }
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

    const strategyProfile = computeStrategyDimensions(metrics, state.activeScene);
    state.lastAttempts[state.activeScene.id] = {
      outcome,
      metrics,
      scoreResult,
      strategyProfile,
      trail: sim.trail.slice()
    };
    state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };

    if (mode === 'tutorial' && tutorialGuide.active) {
      tutorialGuide.evaluateTelemetry(sim, input.getAxes(), outcome, state.currentView);
    }

    if (outcome.status === 'completed') {
      const nextId = state.activeScene.nextLevelId;
      const wasNextLocked = Boolean(nextId && !isLevelUnlocked(state.progress, nextId));
      state.progress = recordLevelResult(
        state.progress,
        state.activeScene.id,
        {
          completed: true,
          stars: scoreResult.stars,
          pidParameters: metrics.pidParameters,
          metrics
        },
        nextId
      );
      if (wasNextLocked && isLevelUnlocked(state.progress, nextId)) {
        state.newlyUnlockedLevelId = nextId;
      }
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
    if (!state.runFinished && state.activeScene?.mode === 'tutorial' && tutorialGuide.active) {
      tutorialGuide.evaluateTelemetry(sim, axes, outcome, state.currentView);
      syncTutorialOverlay(false);
    }
  }
  if (state.currentView === 'flight') {
    renderer.render(sim, rawDt, {
      showGhostDrone: state.showGhostDrone,
      showTrails: state.showFlightTrails
    });
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

function startOrResumeFlight() {
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
  const storyMission = getStoryMission(scene.id);
  els.flightLevelName.textContent = storyMission?.storyTitle || scene.name;
  els.flightObjective.textContent = scene.objective;
  els.btnFlightBack.innerHTML = '&larr; Briefing';

  syncAllPidPanels(sim.gains, scene);
  renderFlightBriefingSummary(scene);
  syncFlightControlsUi();

  const showT1WasdIntro = scene.id === 'tutorial-1';
  els.flightWasdIntroBanner.classList.toggle('hidden', !showT1WasdIntro);
  if (showT1WasdIntro) {
    els.flightWasdIntroAvatar.innerHTML = renderPipRobotSvg('greeting', 'pip-avatar-mini');
  }

  if (scene.id === 'tutorial-1') {
    if (tutorialGuide.sceneId !== scene.id) {
      tutorialGuide.start(scene);
    }
    tutorialGuide.recordFlightStarted();
    tutorialGuide.jumpToView('flight');
  } else {
    // Tutorials 2-4 and Challenges fly directly without flight-screen spotlight overlays
    tutorialGuide.resetState();
    tutorialOverlay?.hide();
  }

  navigateTo('flight');
}

export function navigateTo(viewName, options = {}) {
  state.currentView = viewName;

  for (const [name, el] of Object.entries(els.views)) {
    el.classList.toggle('active', name === viewName);
  }

  els.topbar.classList.toggle('hidden', viewName === 'start' || viewName === 'flight');
  els.appShell?.classList.toggle('is-home-view', viewName === 'start');
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

  if (viewName !== 'result') {
    clearStarAnimationTimers();
  }

  if (viewName === 'flight') {
    input.attach();
    renderer.render(sim, 0, {
      showGhostDrone: state.showGhostDrone,
      showTrails: state.showFlightTrails
    });
    lastFlightPipSig = '';
    lastFlightPipUpdateAt = 0;
    lastControlBadgeSig = '';
    lastControlBadgeUpdateAt = 0;
    updateFlightHud();
    updateLiveControlBadges(true);
    startFlightLoop();
  } else {
    stopFlightLoop();
    input.detach();
  }

  if (viewName === 'preflight') {
    window.requestAnimationFrame(() => {
      renderPreflightArenaPreview();
      renderBenchPanel(state.activeScene);
      syncTutorialOverlay(true);
    });
  } else {
    window.requestAnimationFrame(() => syncTutorialOverlay(true));
  }
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
      if (!tutorialGuide.canSkipCurrentStep()) return;
      tutorialGuide.dismiss();
      tutorialOverlay?.hide();
      updatePreflightLaunchLock();
      updateGuideReopenButtons();
    }
  });

  els.btnStartGame.addEventListener('click', () => navigateTo('modes'));
  els.btnHome.addEventListener('click', () => navigateTo('start'));
  els.btnEnterTutorials.addEventListener('click', () => navigateTo('levels', { mode: 'tutorial' }));
  els.btnEnterChallenges.addEventListener('click', () => navigateTo('levels', { mode: 'challenge' }));
  els.btnBackModes.addEventListener('click', () => navigateTo('modes'));

  // Cartoon Mission Map chapter tabs & preview actions
  for (const tabBtn of els.mapTabButtons || []) {
    tabBtn.addEventListener('click', () => {
      renderLevelSelection(tabBtn.dataset.mapFilter || 'all');
    });
  }
  els.btnMapPlay?.addEventListener('click', () => {
    const id = state.selectedMapLevelId;
    if (!id || !isLevelUnlocked(state.progress, id)) return;
    openMissionCard(id);
  });
  els.btnMapQuickTune?.addEventListener('click', () => {
    const id = state.selectedMapLevelId;
    if (!id || !isLevelUnlocked(state.progress, id)) return;
    const scene = getSceneById(id);
    if (scene) {
      if (state.pipIntroOpen) closePipIntro(true);
      openPreflightTuning(scene, { resetToInitial: true, restartGuide: true });
    }
  });

  // Concise Mission Start Card modal actions
  els.btnMissionCardTune?.addEventListener('click', proceedFromMissionCard);
  els.btnMissionCardSkip?.addEventListener('click', proceedFromMissionCard);
  els.btnMissionCardClose?.addEventListener('click', closeMissionCard);
  els.missionCardModal?.addEventListener('click', (event) => {
    if (event.target === els.missionCardModal) closeMissionCard();
  });

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
    if (state.activeScene?.mode === 'tutorial' && tutorialGuide.isLaunchLocked()) {
      return;
    }
    const gains = state.tunedGainsByLevel[state.activeScene.id] || getSceneInitialGains(state.activeScene);
    launchScene(state.activeScene, { gains, autoStart: true });
  };
  els.btnPreStartFlight.addEventListener('click', startFromPreflight);
  els.btnPreStartFlight2.addEventListener('click', startFromPreflight);

  els.btnPreResetPid.addEventListener('click', () => resetScenePid(state.activeScene));
  els.btnResetPid.addEventListener('click', () => resetScenePid(state.activeScene));
  els.btnTestPid?.addEventListener('click', () => runCurrentBenchTest());
  els.btnCloseExplainer?.addEventListener('click', () => closeParamExplainer());

  for (const btn of document.querySelectorAll('.knob-icon-btn[data-explain]')) {
    btn.addEventListener('click', () => toggleParamExplainer(btn.dataset.explain));
  }

  // Initialize game-like rotary PID knobs synchronized to real PID bounds
  const knobColors = { kp: '#0284c7', ki: '#10b981', kd: '#8b5cf6' };
  for (const param of ['kp', 'ki', 'kd']) {
    const b = PID_SLIDER_BOUNDS[param];
    pidKnobs[param] = new PidKnobControl({
      param,
      min: b.min,
      max: b.max,
      step: b.step,
      color: knobColors[param],
      cardEl: document.getElementById(`knob-card-${param}`),
      dialEl: document.getElementById(`knob-dial-${param}`),
      arcFillEl: document.getElementById(`knob-arc-${param}`),
      pointerEl: document.getElementById(`knob-pointer-${param}`),
      numberInputEl: document.getElementById(`input-${param}`),
      btnMinusEl: document.getElementById(`btn-${param}-minus`),
      btnPlusEl: document.getElementById(`btn-${param}-plus`),
      onChange: (axis, nextVal) => {
        const nextGains = { ...sim.gains, [axis]: nextVal };
        applyPidGains(nextGains, state.activeScene, { fromUserAdjust: true });
        schedulePipUpdate(nextGains, state.activeScene, { fromUserAdjust: true });
      }
    });
  }

  window.addEventListener('resize', () => {
    if (state.currentView === 'preflight') {
      renderPreflightArenaPreview();
      renderBenchPanel(state.activeScene);
    } else if (state.currentView === 'result' && resultReportExpanded) {
      renderResultReportCharts();
    }
  });

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
    if (state.activeScene) {
      state.tunedGainsByLevel[state.activeScene.id] = { ...sim.gains };
      openPreflightTuning(state.activeScene, { resetToInitial: false, restartGuide: false });
    } else {
      navigateTo('modes');
    }
  };

  els.btnFlightBack.addEventListener('click', returnToBriefing);
  els.btnOpenPreflight.addEventListener('click', returnToBriefing);
  els.btnDismissWasdIntro.addEventListener('click', () => {
    els.flightWasdIntroBanner.classList.add('hidden');
    tutorialOverlay?.reposition();
  });

  els.btnStartFlight.addEventListener('click', startOrResumeFlight);
  els.btnFlightPause.addEventListener('click', togglePauseFlight);
  els.btnFlightRestart.addEventListener('click', restartFlight);

  els.toggleGhostDrone?.addEventListener('click', () => {
    state.showGhostDrone = !state.showGhostDrone;
    els.toggleGhostDrone.classList.toggle('is-active', state.showGhostDrone);
    els.toggleGhostDrone.setAttribute('aria-pressed', String(state.showGhostDrone));
    renderer.render(sim, 0, {
      showGhostDrone: state.showGhostDrone,
      showTrails: state.showFlightTrails
    });
  });
  els.toggleFlightTrails?.addEventListener('click', () => {
    state.showFlightTrails = !state.showFlightTrails;
    els.toggleFlightTrails.classList.toggle('is-active', state.showFlightTrails);
    els.toggleFlightTrails.setAttribute('aria-pressed', String(state.showFlightTrails));
    renderer.render(sim, 0, {
      showGhostDrone: state.showGhostDrone,
      showTrails: state.showFlightTrails
    });
  });
  els.btnLiveAxisToggle?.addEventListener('click', () => {
    state.livePlotAxis = state.livePlotAxis === 'z' ? 'x' : 'z';
    els.btnLiveAxisToggle.textContent = state.livePlotAxis === 'z' ? 'Axis: Z (Alt)' : 'Axis: X (Horiz)';
    const axisSpan = state.livePlotAxis === 'x' ? sim.config.worldWidth : sim.config.worldHeight;
    renderLivePidResponseChart(els.flightResponseCanvas, sim.telemetry, state.livePlotAxis, axisSpan);
  });
  els.btnResultSkipAnim?.addEventListener('click', skipStarAnimation);
  els.btnResultReportToggle?.addEventListener('click', () => {
    setResultReportExpanded(!resultReportExpanded);
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
      openMissionCard(nextScene.id);
    }
  });

  els.btnOpenAbout?.addEventListener('click', openAboutModal);
  els.btnCloseAbout?.addEventListener('click', closeAboutModal);
  els.btnCloseAboutX?.addEventListener('click', closeAboutModal);
  els.aboutModal?.addEventListener('click', (event) => {
    if (event.target === els.aboutModal) closeAboutModal();
  });

  els.btnCloseModal.addEventListener('click', hideModal);
  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) hideModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (els.missionCardModal && !els.missionCardModal.classList.contains('hidden')) {
        closeMissionCard();
      } else if (els.aboutModal && !els.aboutModal.classList.contains('hidden')) {
        closeAboutModal();
      } else if (!els.modal.classList.contains('hidden')) {
        hideModal();
      }
    }
  });
}

bindEvents();
syncAllPidPanels(DEFAULT_PID_GAINS, null);
navigateTo('start');
