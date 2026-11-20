import { getLevelsByMode } from './levels.js';
import {
  loadProgress,
  isLevelUnlocked,
  getBestStars,
  isFirstPlaythrough,
  getModeSummary
} from './storage.js';
import { InputController } from './input.js';
import { FlightSimulation, DEFAULT_PID_GAINS } from './simulation.js';
import { FlightRenderer } from './renderer.js';

const state = {
  currentView: 'start',
  currentMode: 'tutorial',
  progress: loadProgress()
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

  // Flight Screen elements
  flightCanvas: document.getElementById('flight-canvas'),
  flightTimer: document.getElementById('flight-timer'),
  btnFlightBack: document.getElementById('btn-flight-back'),
  btnFlightPause: document.getElementById('btn-flight-pause'),
  btnFlightRestart: document.getElementById('btn-flight-restart'),
  btnStartFlight: document.getElementById('btn-start-flight'),
  btnResetPid: document.getElementById('btn-reset-pid'),
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
  flightRef: document.getElementById('flight-ref'),

  modal: document.getElementById('notice-modal'),
  modalEyebrow: document.getElementById('modal-eyebrow'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  btnCloseModal: document.getElementById('btn-close-modal')
};

// M1 Flight Simulation, Input & Renderer
const sim = new FlightSimulation();
const renderer = new FlightRenderer(els.flightCanvas);
let rafId = null;
let lastFrameTime = null;

const input = new InputController({
  isActive: () => state.currentView === 'flight' && els.modal.classList.contains('hidden'),
  onMovementPress: () => {
    if (!sim.started) {
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
    : 'Fly manually with WASD and apply your PID tuning across six flight missions.';
  els.levelsStarSummary.textContent = `${summary.earnedStars} / ${summary.maxStars} ★`;

  els.levelsGrid.innerHTML = '';

  for (const level of levels) {
    const unlocked = isLevelUnlocked(state.progress, level.id);
    const stars = getBestStars(state.progress, level.id);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `level-card ${unlocked ? '' : 'is-locked'}`;
    card.dataset.levelId = level.id;

    card.innerHTML = `
      <div>
        <div class="level-card-top">
          <span class="level-difficulty">${level.difficulty}</span>
          <span class="lock-status ${unlocked ? 'unlocked' : 'locked'}">
            ${unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
        <h3>${level.name}</h3>
        <p class="level-focus"><strong>Focus:</strong> ${level.learningFocus}</p>
      </div>
      <div class="level-card-footer">
        <span class="stars-display" aria-label="${stars} of 3 stars">${renderStarsText(stars)}</span>
        <span class="level-action-hint">${unlocked ? 'Coming Next' : 'Complete Previous'}</span>
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

      showModal(
        `Scheduled for ${level.milestone}`,
        level.name,
        `${level.summary} You can test the live 2D PID physics engine right now in the Flight Test Playground from Mode Selection.`
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
}

function syncFlightControlsUi() {
  els.btnFlightPause.textContent = sim.paused ? 'Resume' : 'Pause';
  els.btnFlightPause.disabled = !sim.started;
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

function updateFlightHud() {
  const snap = sim.getSnapshot();
  els.flightTimer.textContent = `${snap.elapsedTime.toFixed(1)} s`;
  els.flightPos.textContent = `${snap.drone.x.toFixed(2)} m, ${snap.drone.z.toFixed(2)} m`;
  els.flightSpeed.textContent = `${snap.drone.vx.toFixed(2)} m/s, ${snap.drone.vz.toFixed(2)} m/s`;
  els.flightRef.textContent = `${snap.reference.x.toFixed(2)} m, ${snap.reference.z.toFixed(2)} m`;

  els.telP.textContent = `${snap.pid.x.pTerm.toFixed(1)} / ${snap.pid.z.pTerm.toFixed(1)}`;
  els.telI.textContent = `${snap.pid.x.iTerm.toFixed(1)} / ${snap.pid.z.iTerm.toFixed(1)}`;
  els.telD.textContent = `${snap.pid.x.dTerm.toFixed(1)} / ${snap.pid.z.dTerm.toFixed(1)}`;

  let statusLabel = 'Ready (Press Start or WASD)';
  els.flightStatus.className = 'status-pill';
  if (snap.paused) {
    statusLabel = 'Paused';
    els.flightStatus.classList.add('is-paused');
  } else if (snap.targetZone.stabilized) {
    statusLabel = 'Target Stabilized!';
    els.flightStatus.classList.add('is-stabilized');
  } else if (snap.targetZone.inside) {
    statusLabel = `Inside Target (${snap.targetZone.holdTimer.toFixed(1)}s)`;
  } else if (snap.started) {
    statusLabel = snap.drone.onGround ? 'Armed (On Ground)' : 'In Flight';
  }
  els.flightStatus.textContent = statusLabel;
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

  sim.stepFrame(rawDt, input.getAxes());
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
  if (!sim.started) {
    sim.startFlight();
  } else if (sim.paused) {
    sim.setPaused(false);
  }
  syncFlightControlsUi();
  updateFlightHud();
}

function restartFlight() {
  input.clearMovementKeys();
  sim.reset(true);
  syncFlightControlsUi();
  updateFlightHud();
}

function togglePauseFlight() {
  if (!sim.started) return;
  sim.togglePause();
  input.clearMovementKeys();
  syncFlightControlsUi();
  updateFlightHud();
}

function enterFlightPlayground() {
  sim.reset(false);
  syncSlidersFromGains(sim.gains);
  els.selectWind.value = sim.windMode;
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
  els.btnLaunchPlayground.addEventListener('click', enterFlightPlayground);

  els.btnFlightBack.addEventListener('click', () => navigateTo('modes'));
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
