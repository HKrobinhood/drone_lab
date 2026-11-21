import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TUTORIAL_GUIDE_FLOWS } from '../src/tutorial_guide.js';
import { TUTORIAL_SCENES, CHALLENGE_SCENES } from '../src/scenes.js';
import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { generatePipDiagnosticReport, evaluateLiveControlStatus } from '../src/feedback.js';
import { scoreFlightRun, buildRatingBreakdown, buildNextStarAdvice, getThresholdsForLevel } from '../src/scoring.js';
import {
  PIP_COACH_STATES,
  STEM_VISUAL_AIDS,
  renderInteractiveVisualAidHtml,
  renderResultStarSvg,
  resolvePipMood
} from '../src/visual_aids.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M5.1 — Flight Screen WASD Intro & Progressive Metric Coaching via PIP', () => {
  it('keeps Tutorial 1 pre-flight Mission Playground & Gravity visual intact and puts WASD intro right at Flight Screen start', () => {
    const t1 = TUTORIAL_GUIDE_FLOWS['tutorial-1'];
    assert.equal(t1[0].stepId, 't1-briefing');
    assert.equal(t1[0].visualId, 'gravity-thrust');

    const flightStartStep = t1.find((s) => s.view === 'flight');
    assert.equal(flightStartStep.stepId, 't1-wasd');
    assert.equal(flightStartStep.visualId, 'wasd-controls');
    assert.ok(flightStartStep.title.includes('WASD'));
    assert.ok(flightStartStep.instruction.includes('W, S, A, D'));
  });

  it('progressively teaches all evaluation metrics across Tutorials 1-4 in PIP first-person voice', () => {
    const t1 = TUTORIAL_SCENES['tutorial-1'];
    const t2 = TUTORIAL_SCENES['tutorial-2'];
    const t3 = TUTORIAL_SCENES['tutorial-3'];
    const t4 = TUTORIAL_SCENES['tutorial-4'];

    assert.ok(t1.measuredMetrics.some((m) => m.includes('Route Fit')));
    assert.ok(t2.measuredMetrics.some((m) => m.includes('Tracking Lag')));
    assert.ok(t3.measuredMetrics.some((m) => m.includes('Steady-State Offset')));
    assert.ok(t4.measuredMetrics.some((m) => m.includes('Overshoot')));
    assert.ok(t4.measuredMetrics.some((m) => m.includes('Settling Time')));

    for (const scene of [t1, t2, t3, t4]) {
      assert.ok(/\bI('m|'ll)?\b/.test(scene.pipMetricBrief));

      const sim = new FlightSimulation();
      sim.loadScene(scene, true);
      for (let i = 0; i < Math.round(3.0 / FIXED_DT); i++) {
        sim.stepFixed(FIXED_DT, { moveX: 1, moveZ: 1 });
      }
      const report = generatePipDiagnosticReport(
        sim.getTelemetrySeries(),
        sim.getFlightMetrics(),
        { status: 'completed' },
        scene
      );
      assert.ok(report.metricLessonNote, `Expected metricLessonNote for ${scene.id}`);
      assert.ok(report.metricLessonNote.includes('Metrics') || report.metricLessonNote.includes('metric'));
    }

    assert.ok(TUTORIAL_GUIDE_FLOWS['tutorial-2'][0].headline.includes('Tracking Lag'));
    assert.ok(TUTORIAL_GUIDE_FLOWS['tutorial-3'][0].headline.includes('Steady-State Offset'));
    assert.ok(TUTORIAL_GUIDE_FLOWS['tutorial-4'][0].headline.includes('Overshoot'));
  });

  it('includes Flight Screen WASD intro banner & PIP metric debrief hooks in English only', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const feedbackJs = fs.readFileSync(path.join(rootDir, 'src/feedback.js'), 'utf8');
    const guideJs = fs.readFileSync(path.join(rootDir, 'src/tutorial_guide.js'), 'utf8');
    const scenesJs = fs.readFileSync(path.join(rootDir, 'src/scenes.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

    for (const id of [
      'flight-wasd-intro-banner',
      'flight-wasd-intro-avatar',
      'btn-dismiss-wasd-intro',
      'result-pip-lesson-note'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['index.html', indexHtml],
      ['src/feedback.js', feedbackJs],
      ['src/tutorial_guide.js', guideJs],
      ['src/scenes.js', scenesJs],
      ['src/main.js', mainJs]
    ]) {
      assert.equal(cjkRegex.test(content), false, `${name} must contain zero Chinese characters`);
    }
  });
});

describe('M5.1 — Visual-First UI, Interactive Diagrams & Animated Star Breakdown', () => {
  it('keeps all tutorial instructions concise (<= 15 words) with matched interactive STEM diagrams', () => {
    for (const [sceneId, steps] of Object.entries(TUTORIAL_GUIDE_FLOWS)) {
      for (const step of steps) {
        const words = step.instruction.trim().split(/\s+/).length;
        assert.ok(
          words <= 15,
          `${sceneId}/${step.stepId} exceeds 15 words (${words}): "${step.instruction}"`
        );
      }
    }

    for (const id of Object.keys(STEM_VISUAL_AIDS)) {
      const html = renderInteractiveVisualAidHtml(id);
      assert.ok(html.includes('<svg') && html.includes('visual-toggle-btn'), `Expected interactive toggles for ${id}`);
    }

    assert.deepEqual(PIP_COACH_STATES, ['greeting', 'teaching', 'warning', 'ready', 'success', 'failure']);
    assert.equal(resolvePipMood('failure'), 'warning');
    assert.ok(renderResultStarSvg(1).includes('star-gold-grad-1'));
  });

  it('derives live control status badges strictly from real simulation telemetry', () => {
    const sim = new FlightSimulation();
    sim.loadScene(CHALLENGE_SCENES['level-1'], false);
    assert.equal(evaluateLiveControlStatus(sim.telemetry, sim, CHALLENGE_SCENES['level-1'])[0].key, 'standby');

    sim.startFlight();
    assert.equal(evaluateLiveControlStatus(sim.telemetry, sim, CHALLENGE_SCENES['level-1'])[0].key, 'calibrating');

    // Run calm hover -> Stable badge
    sim.setGains({ kp: 6.5, ki: 0.4, kd: 4.0 });
    for (let i = 0; i < Math.round(3.0 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: 0 });
    }
    const stableBadges = evaluateLiveControlStatus(sim.telemetry, sim, CHALLENGE_SCENES['level-1']);
    assert.ok(stableBadges.some((b) => b.key === 'stable'));

    // Run high Kp / very low Kd step -> Oscillation or Overshoot badge from real physics
    const simOsc = new FlightSimulation();
    simOsc.loadScene(CHALLENGE_SCENES['level-2'], true);
    simOsc.setGains({ kp: 14.0, ki: 0.2, kd: 0.5 });
    for (let i = 0; i < Math.round(6.0 / FIXED_DT); i++) {
      simOsc.stepFixed(FIXED_DT, i < 240 ? { moveX: 1, moveZ: 1 } : { moveX: 0, moveZ: 0 });
    }
    const oscBadges = evaluateLiveControlStatus(simOsc.telemetry, simOsc, CHALLENGE_SCENES['level-2']);
    assert.ok(oscBadges.some((b) => b.key === 'oscillation' || b.key === 'overshoot'));
  });

  it('produces consistent rating breakdown & next-star suggestions for 0, 1, 2, and 3 stars', () => {
    const th = getThresholdsForLevel('level-1');

    const failScore = scoreFlightRun({ status: 'failed' }, { completionTime: 12, maxOvershoot: 2.1, pathFitScore: 40 }, 'level-1');
    assert.equal(failScore.stars, 0);
    assert.equal(buildNextStarAdvice(failScore, { completionTime: 12 }), null);
    const failBreakdown = buildRatingBreakdown(failScore, { completionTime: 12, maxOvershoot: 2.1, pathFitScore: 40 }, { status: 'failed' });
    assert.equal(failBreakdown.summaryRows[0].passed, false);

    const oneMetrics = { completionTime: th.twoStar.maxTime + 8, maxOvershoot: 2.8, settlingTime: 7, pathFitScore: 45, flightSmoothness: 50, collisionCount: 0, pidParameters: { kp: 3.2, ki: 0, kd: 2.5 } };
    const oneScore = scoreFlightRun({ status: 'completed' }, oneMetrics, 'level-1');
    assert.equal(oneScore.stars, 1);
    const oneTip = buildNextStarAdvice(oneScore, oneMetrics, null, CHALLENGE_SCENES['level-1']);
    assert.ok(oneTip && oneTip.includes('faster'));

    const twoMetrics = { completionTime: th.twoStar.maxTime - 4, maxOvershoot: th.twoStar.maxOvershoot - 0.1, settlingTime: th.threeStar.maxSettling + 3, pathFitScore: th.twoStar.minPathFit + 5, flightSmoothness: 55, collisionCount: 0, pidParameters: { kp: 6.5, ki: 0.4, kd: 3.5 } };
    const twoScore = scoreFlightRun({ status: 'completed' }, twoMetrics, 'level-1');
    assert.equal(twoScore.stars, 2);
    const twoTip = buildNextStarAdvice(twoScore, twoMetrics, null, CHALLENGE_SCENES['level-1']);
    assert.ok(twoTip && (twoTip.includes('faster') || twoTip.includes('overshoot') || twoTip.includes('braking')));

    const threeMetrics = { completionTime: th.threeStar.maxTime - 4, maxOvershoot: th.threeStar.maxOvershoot - 0.3, settlingTime: th.threeStar.maxSettling - 1, pathFitScore: th.threeStar.minPathFit + 10, flightSmoothness: th.threeStar.minSmoothness + 10, collisionCount: 0, pidParameters: { kp: 6.5, ki: 0.4, kd: 3.8 } };
    const threeScore = scoreFlightRun({ status: 'completed' }, threeMetrics, 'level-1');
    assert.equal(threeScore.stars, 3);
    assert.equal(buildNextStarAdvice(threeScore, threeMetrics), 'Perfect flight! You mastered this challenge!');
  });

  it('includes Ghost Drone, Live PID Response, Animated Star Showcase & English-only UI hooks', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const mainCss = fs.readFileSync(path.join(rootDir, 'styles/main.css'), 'utf8');
    const visualJs = fs.readFileSync(path.join(rootDir, 'src/visual_aids.js'), 'utf8');
    const scoringJs = fs.readFileSync(path.join(rootDir, 'src/scoring.js'), 'utf8');
    const rendererJs = fs.readFileSync(path.join(rootDir, 'src/renderer.js'), 'utf8');

    for (const id of [
      'toggle-ghost-drone',
      'toggle-flight-trails',
      'live-control-badges',
      'flight-response-canvas',
      'btn-live-axis-toggle',
      'result-star-1',
      'result-star-2',
      'result-star-3',
      'btn-result-skip-anim',
      'result-failed-hero',
      'result-summary-criteria',
      'result-next-star-tip'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    assert.ok(mainCss.includes('starPopBounce'));
    assert.ok(mainCss.includes('prefers-reduced-motion'));

    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');
    // Tutorial and Challenge share the exact same star display & breakdown UI
    assert.equal(mainJs.includes('!isChallenge || !isSuccess'), false);
    assert.equal(mainJs.includes("els.resultRatingCard.classList.toggle('hidden', !isChallenge)"), false);

    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['src/visual_aids.js', visualJs],
      ['src/scoring.js', scoringJs],
      ['src/renderer.js', rendererJs]
    ]) {
      assert.equal(cjkRegex.test(content), false, `${name} must contain zero Chinese characters`);
    }
  });
});
