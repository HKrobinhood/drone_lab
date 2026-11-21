import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('M5.2 — Homepage UI Redesign & About Course Modal', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const mainCss = fs.readFileSync(path.join(rootDir, 'styles/main.css'), 'utf8');
  const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

  it('includes redesigned Hero centerpiece, Start Game CTA, PIP & Drone visuals, and 4 How-to-Play icon steps', () => {
    for (const snippet of [
      'class="home-stage"',
      'id="game-title"',
      'Drone Lab',
      'PID Flight Challenge',
      'Tune PID · Fly with WASD · Earn Stars',
      'id="btn-start-game"',
      'Start Game',
      'home-pip-svg',
      'home-drone-svg',
      'Tune PID',
      'Kp · Ki · Kd',
      'WASD Controls',
      'Flight Challenges',
      'Up to 3 Stars'
    ]) {
      assert.ok(indexHtml.includes(snippet), `Missing redesigned homepage snippet: ${snippet}`);
    }
  });

  it('presents all 4 compact About the Course cards with Engineering, Technology, Overview, and 4 Objectives', () => {
    for (const snippet of [
      'STEM Topic',
      'PID Control',
      'Proportional · Integral · Derivative',
      'Tune PID to control a drone.',
      'Branches of STEM',
      'Engineering (Primary)',
      'PID controller design, tuning and optimisation.',
      'Technology',
      'Drone flight control systems.',
      'Game Overview',
      'Adjust Kp, Ki and Kd.',
      'Fly with WASD.',
      'Handle overshoot and oscillation.',
      'Complete missions and earn stars.',
      'Learning Objectives',
      'Understand PID control.',
      'Apply PID tuning.',
      'Analyse flight behaviour.',
      'Develop problem-solving skills.'
    ]) {
      assert.ok(indexHtml.includes(snippet), `Missing homepage course card content: ${snippet}`);
    }
  });

  it('provides the full STEM course assignment details inside the accessible About modal', () => {
    for (const snippet of [
      'id="btn-open-about"',
      'id="about-modal"',
      'Proportional–Integral–Derivative (PID) Control',
      'Tuning a PID controller to control a drone.',
      'Engineering (Primary Focus):',
      'Drone Lab — PID Flight Challenge is an interactive STEM game',
      'Explain how Kp, Ki and Kd affect drone stability and responsiveness.',
      'Adjust PID parameters to improve flight control.',
      'Identify overshoot, oscillation and slow response.',
      'Apply experimentation and feedback to solve flight-control problems.'
    ]) {
      assert.ok(indexHtml.includes(snippet), `Missing About modal content: ${snippet}`);
    }

    assert.ok(mainJs.includes('openAboutModal'));
    assert.ok(mainJs.includes('closeAboutModal'));
    assert.ok(mainCss.includes('.home-stage'));
    assert.ok(mainCss.includes('.btn-start-hero'));
    assert.ok(mainCss.includes('.home-course-grid'));
    assert.ok(mainCss.includes('prefers-reduced-motion'));

    const cjkRegex = /[\u4e00-\u9fff]/;
    assert.equal(cjkRegex.test(indexHtml), false, 'index.html must contain zero Chinese characters');
    assert.equal(cjkRegex.test(mainJs), false, 'src/main.js must contain zero Chinese characters');
  });
});
