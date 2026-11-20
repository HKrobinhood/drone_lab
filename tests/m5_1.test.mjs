import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TUTORIAL_GUIDE_FLOWS } from '../src/tutorial_guide.js';
import { TUTORIAL_SCENES } from '../src/scenes.js';
import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { generatePipDiagnosticReport } from '../src/feedback.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M5.1 — Early WASD Intro & Progressive Metric Teaching via PIP', () => {
  it('introduces WASD controls immediately in Tutorial 1 Step 1 with visual diagram and PIP voice', () => {
    const t1Step1 = TUTORIAL_GUIDE_FLOWS['tutorial-1'][0];
    assert.equal(t1Step1.stepId, 't1-briefing');
    assert.equal(t1Step1.visualId, 'wasd-controls');
    assert.ok(t1Step1.instruction.includes('W, S, A, D'));
    assert.ok(t1Step1.headline.includes('WASD'));
    assert.ok(TUTORIAL_SCENES['tutorial-1'].pipMetricBrief.includes('W/S/A/D'));
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
      assert.ok(scene.pipMetricBrief.includes('I') || scene.pipMetricBrief.includes('Pilot'));

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

  it('includes M5.1 UI hooks and keeps all player-visible text 100% English', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const feedbackJs = fs.readFileSync(path.join(rootDir, 'src/feedback.js'), 'utf8');
    const guideJs = fs.readFileSync(path.join(rootDir, 'src/tutorial_guide.js'), 'utf8');
    const scenesJs = fs.readFileSync(path.join(rootDir, 'src/scenes.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

    assert.ok(indexHtml.includes('result-pip-lesson-note'));

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
