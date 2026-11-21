import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { TUTORIAL_SCENES, CHALLENGE_SCENES } from '../src/scenes.js';
import { scoreFlightRun } from '../src/scoring.js';
import { generatePipDiagnosticReport, buildConcisePipResultFeedback } from '../src/feedback.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

describe('M5.5 — Concise PIP Result Feedback Grounded in Real Diagnostics', () => {
  it('produces <= 20 word feedback matched to real telemetry diagnostics across outcomes & star tiers', () => {
    // 1. Clean 3-star Tutorial 1 run
    const simClean = new FlightSimulation();
    const t1 = TUTORIAL_SCENES['tutorial-1'];
    simClean.loadScene(t1, true);
    simClean.setGains({ kp: 6.5, ki: 0.6, kd: 3.8 });
    for (let i = 0; i < Math.round(6.0 / FIXED_DT); i++) {
      const moveZ = simClean.reference.z < 7.5 ? 1 : 0;
      simClean.stepFixed(FIXED_DT, { moveX: 0, moveZ });
    }
    const cleanMetrics = simClean.getFlightMetrics();
    const cleanOutcome = { status: 'completed', message: 'Cleared' };
    const cleanScore = scoreFlightRun(cleanOutcome, cleanMetrics, 'tutorial-1');
    const cleanReport = generatePipDiagnosticReport(simClean.getTelemetrySeries(), cleanMetrics, cleanOutcome, t1);
    const cleanPip = buildConcisePipResultFeedback(cleanReport, cleanScore, cleanOutcome, t1);

    assert.equal(cleanScore.stars, 3);
    assert.equal(cleanPip.mood, 'celebrating');
    assert.ok(wordCount(cleanPip.text) <= 20, `Too many words (${wordCount(cleanPip.text)}): ${cleanPip.text}`);

    // 2. Real low-Kd oscillating run (1-2 star) -> flags oscillation/overshoot
    const simOsc = new FlightSimulation();
    const l2 = CHALLENGE_SCENES['level-2'];
    simOsc.loadScene(l2, true);
    simOsc.setGains({ kp: 14.0, ki: 0.0, kd: 0.3 });
    for (let i = 0; i < Math.round(6.5 / FIXED_DT); i++) {
      const moveX = simOsc.reference.x < 14.0 ? 1 : 0;
      simOsc.stepFixed(FIXED_DT, { moveX, moveZ: 0 });
    }
    const oscMetrics = simOsc.getFlightMetrics();
    const oscOutcome = { status: 'completed', message: 'Cleared' };
    const oscScore = scoreFlightRun(oscOutcome, oscMetrics, 'level-2');
    const oscReport = generatePipDiagnosticReport(simOsc.getTelemetrySeries(), oscMetrics, oscOutcome, l2);
    const oscPip = buildConcisePipResultFeedback(oscReport, oscScore, oscOutcome, l2);

    assert.ok(oscScore.stars <= 2);
    assert.ok(wordCount(oscPip.text) <= 20, `Too many words: ${oscPip.text}`);
    assert.match(oscPip.text, /oscillat|overshoot|Kd|damping|braking/i);

    // 3. Real sluggish low-Kp run -> flags slow response / Kp
    const simLag = new FlightSimulation();
    const t2 = TUTORIAL_SCENES['tutorial-2'];
    simLag.loadScene(t2, true);
    simLag.setGains({ kp: 1.0, ki: 0.0, kd: 3.5 });
    for (let i = 0; i < Math.round(6.0 / FIXED_DT); i++) {
      const moveX = simLag.reference.x < 18.0 ? 1 : 0;
      simLag.stepFixed(FIXED_DT, { moveX, moveZ: 0 });
    }
    const lagMetrics = simLag.getFlightMetrics();
    const lagOutcome = { status: 'completed', message: 'Cleared' };
    const lagScore = scoreFlightRun(lagOutcome, lagMetrics, 'tutorial-2');
    const lagReport = generatePipDiagnosticReport(simLag.getTelemetrySeries(), lagMetrics, lagOutcome, t2);
    const lagPip = buildConcisePipResultFeedback(lagReport, lagScore, lagOutcome, t2);

    assert.ok(wordCount(lagPip.text) <= 20, `Too many words: ${lagPip.text}`);
    assert.match(lagPip.text, /slow|Kp/i);

    // 4. Failure reasons (collision, battery_depleted, hard_landing, out_of_bounds, off_pad, timeout)
    for (const reason of ['collision', 'battery_depleted', 'hard_landing', 'out_of_bounds', 'off_pad', 'timeout']) {
      const failOutcome = { status: 'failed', reason, message: 'Failed' };
      const failPip = buildConcisePipResultFeedback({ diagnostics: {} }, { stars: 0 }, failOutcome, l2);
      assert.equal(failPip.mood, 'warning');
      assert.ok(wordCount(failPip.text) >= 6 && wordCount(failPip.text) <= 20, `Unexpected length for ${reason}: ${failPip.text}`);
    }
  });
});

describe('M5.5 — Minimal Results Screen DOM Hierarchy, Accordion & English-Only Verification', () => {
  it('places Action Buttons directly below Stars, shows concise PIP strip, and defaults Detailed Flight Report to collapsed', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'styles/main.css'), 'utf8');

    const resultStart = html.indexOf('<section id="view-result"');
    const resultEnd = html.indexOf('</section>', resultStart);
    assert.ok(resultStart > 0 && resultEnd > resultStart);
    const resultHtml = html.slice(resultStart, resultEnd);

    // Verify visual order inside Result Screen: Title -> Stars -> Action Buttons -> PIP Short Card -> Collapsible Report
    const idxTitle = resultHtml.indexOf('id="result-title"');
    const idxStars = resultHtml.indexOf('id="result-stars-box"');
    const idxActions = resultHtml.indexOf('id="result-actions-bar"');
    const idxShortPip = resultHtml.indexOf('id="result-pip-short-card"');
    const idxAccordion = resultHtml.indexOf('id="result-report-accordion"');
    const idxToggle = resultHtml.indexOf('id="btn-result-report-toggle"');
    const idxReportBody = resultHtml.indexOf('id="result-report-body"');
    const idxRating = resultHtml.indexOf('id="result-rating-card"');
    const idxCharts = resultHtml.indexOf('id="result-strategy-canvas"');
    const idxFullPip = resultHtml.indexOf('id="result-pip-report-card"');

    assert.ok(idxTitle < idxStars, 'Title must precede Stars');
    assert.ok(idxStars < idxActions, 'Stars must precede Action Buttons');
    assert.ok(idxActions < idxShortPip, 'Action Buttons must sit directly under Stars before PIP card');
    assert.ok(idxShortPip < idxAccordion, 'PIP Short Feedback must precede Detailed Flight Report accordion');
    assert.ok(idxToggle < idxReportBody, 'Accordion toggle button must precede report body');
    assert.ok(idxReportBody < idxRating && idxReportBody < idxCharts && idxReportBody < idxFullPip,
      'Rating breakdown, charts, and full PIP report must live inside the collapsed Detailed Flight Report');

    // Verify accessibility & default collapsed attributes
    assert.ok(resultHtml.includes('aria-expanded="false"'), 'Detailed Flight Report toggle must default to aria-expanded="false"');
    assert.ok(resultHtml.includes('aria-controls="result-report-body"'));
    assert.ok(resultHtml.includes('Detailed Flight Report'));
    assert.ok(css.includes('.result-report-accordion.is-expanded .result-report-body'));
    assert.ok(css.includes('prefers-reduced-motion'));

    // Zero Chinese characters in player-visible files
    const cjk = /[\u4e00-\u9fff]/;
    for (const rel of ['index.html', 'src/feedback.js', 'src/main.js']) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.equal(cjk.test(content), false, `${rel} must remain 100% English`);
    }
  });
});
