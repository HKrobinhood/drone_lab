import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PIP_INTRO_SCRIPT, TUTORIAL_GUIDE_FLOWS } from '../src/tutorial_guide.js';
import {
  PIP_MOODS,
  STEM_VISUAL_AIDS,
  renderPipRobotSvg,
  resolvePipMood,
  getStemVisualAid
} from '../src/visual_aids.js';
import {
  createDefaultProgress,
  loadProgress,
  hasSeenPipIntro,
  markPipIntroSeen
} from '../src/storage.js';
import { evaluatePidCoaching } from '../src/coach.js';
import { CHALLENGE_SCENES } from '../src/scenes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M4.2 — PIP Introduction & Mood Expressions', () => {
  it('defines the exact 3 short PIP introduction sentences and 5 expression moods', () => {
    assert.equal(PIP_INTRO_SCRIPT.length, 3);
    assert.equal(PIP_INTRO_SCRIPT[0].text, "Hi, pilot! I'm PIP, your flight coach!");
    assert.equal(PIP_INTRO_SCRIPT[1].text, "I'll help you tune your PID controller and master your drone.");
    assert.equal(PIP_INTRO_SCRIPT[2].text, "Let's learn, test, and fly!");

    assert.deepEqual(PIP_MOODS, ['greeting', 'explaining', 'thinking', 'warning', 'celebrating']);
    for (const mood of PIP_MOODS) {
      const svg = renderPipRobotSvg(mood);
      assert.ok(svg.includes(`pip-mood-${mood}`), `Expected SVG mood class for ${mood}`);
      assert.ok(svg.includes('pip-float'));
    }

    assert.equal(resolvePipMood('welcome'), 'greeting');
    assert.equal(resolvePipMood('warning'), 'warning');
    assert.equal(resolvePipMood('ready'), 'celebrating');
  });

  it('persists pipIntroSeen in localStorage and preserves PIP PID risk analysis', () => {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v))
    };

    let progress = createDefaultProgress();
    assert.equal(hasSeenPipIntro(progress), false);

    progress = markPipIntroSeen(progress, mockStorage);
    assert.equal(hasSeenPipIntro(progress), true);

    const reloaded = loadProgress(mockStorage);
    assert.equal(hasSeenPipIntro(reloaded), true);

    // Existing PID risk analysis still outputs mood + risk messages intact
    const risky = evaluatePidCoaching({ kp: 12.0, ki: 0.2, kd: 1.0 }, CHALLENGE_SCENES['level-2']);
    assert.equal(risky.state, 'warning');
    assert.equal(risky.mood, 'warning');
    assert.ok(risky.messages.some((m) => m.includes('High Kp and low Kd')));
  });
});

describe('M4.2 — Concise Visual-First Tutorial Curriculum & Diagrams', () => {
  it('provides all 6 required inline STEM vector diagrams and links them to tutorial steps', () => {
    const requiredDiagrams = [
      'gravity-thrust',
      'wasd-controls',
      'kp-response',
      'ki-integral',
      'kd-damping',
      'pid-loop-steps'
    ];
    for (const id of requiredDiagrams) {
      const aid = getStemVisualAid(id);
      assert.ok(aid, `Missing visual aid ${id}`);
      const svg = aid.renderSvg();
      assert.ok(svg.includes('<svg') && svg.includes('</svg>'));
    }

    // Verify Kp diagram does not claim high Kp *always* overshoots
    const kpSvg = STEM_VISUAL_AIDS['kp-response'].renderSvg();
    assert.ok(kpSvg.includes('Low Kp: Slow Response'));
    assert.ok(kpSvg.includes('Possible Overshoot'));

    // Verify Ki and Kd diagram key concepts
    const kiSvg = STEM_VISUAL_AIDS['ki-integral'].renderSvg();
    assert.ok(kiSvg.includes('Persistent') && kiSvg.includes('Accumulation') && kiSvg.includes('Correction'));

    const kdSvg = STEM_VISUAL_AIDS['kd-damping'].renderSvg();
    assert.ok(kdSvg.includes('Overshoot') && kdSvg.includes('Damping') && kdSvg.includes('Smooth Stopping'));

    const loopSvg = STEM_VISUAL_AIDS['pid-loop-steps'].renderSvg();
    for (const label of ['1. Tune PID', '2. Test Curve', '3. Read Wave', '4. Start Flight', '5. Fly &amp; Review']) {
      assert.ok(loopSvg.includes(label), `Missing loop step ${label}`);
    }
  });

  it('keeps main tutorial step instructions concise (<= 25 words) with Learn More details', () => {
    for (const [sceneId, steps] of Object.entries(TUTORIAL_GUIDE_FLOWS)) {
      for (const step of steps) {
        const words = step.instruction.trim().split(/\s+/).length;
        assert.ok(
          words <= 25,
          `${sceneId}/${step.stepId} instruction too long (${words} words): "${step.instruction}"`
        );
        assert.ok(step.learnMore && step.learnMore.length > 10, `Missing learnMore on ${step.stepId}`);
      }
    }
  });

  it('includes M4.2 DOM controls, reduced-motion CSS support, and 100% English copy', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const mainCss = fs.readFileSync(path.join(rootDir, 'styles/main.css'), 'utf8');
    const visualJs = fs.readFileSync(path.join(rootDir, 'src/visual_aids.js'), 'utf8');
    const guideJs = fs.readFileSync(path.join(rootDir, 'src/tutorial_guide.js'), 'utf8');
    const overlayJs = fs.readFileSync(path.join(rootDir, 'src/guide_overlay.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

    for (const id of [
      'btn-meet-pip',
      'pip-intro-panel',
      'btn-pip-intro-skip',
      'btn-pip-intro-next',
      'btn-preflight-meet-pip',
      'preflight-visual-aid',
      'tut-guide-avatar',
      'tut-visual-slot',
      'tut-learn-more'
    ]) {
      assert.ok(indexHtml.includes(id), `Expected index.html to include ${id}`);
    }

    assert.ok(mainCss.includes('prefers-reduced-motion'));

    const cjkRegex = /[\u4e00-\u9fff]/;
    for (const [name, content] of [
      ['index.html', indexHtml],
      ['src/visual_aids.js', visualJs],
      ['src/tutorial_guide.js', guideJs],
      ['src/guide_overlay.js', overlayJs],
      ['src/main.js', mainJs]
    ]) {
      assert.equal(cjkRegex.test(content), false, `${name} must contain zero Chinese characters`);
    }
  });
});
