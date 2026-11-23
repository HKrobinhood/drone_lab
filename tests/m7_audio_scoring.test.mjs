import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeMotorAudioParams,
  computeWindAudioParams,
  DroneAudioEngine,
  loadAudioPrefs,
  saveAudioPrefs
} from '../src/audio.js';
import { scoreFlightRun, buildNextStarAdvice } from '../src/scoring.js';
import { FlightSimulation, FIXED_DT } from '../src/simulation.js';
import { CHALLENGE_SCENES } from '../src/scenes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('Oscillation-Focused Easy 3-Star Evaluation', () => {
  it('awards 3 stars easily for calm manual flights without obvious oscillation, and penalizes obvious oscillation', () => {
    // Relaxed human-paced 34s flight with calm non-oscillating control on L1 -> earns 3 stars
    const calmHumanMetrics = {
      completionTime: 34.0,
      maxOvershoot: 1.6,
      settlingTime: 5.5,
      pathFitScore: 48,
      flightSmoothness: 72,
      oscillationReversals: 2,
      collisionCount: 0,
      pidParameters: { kp: 6.5, ki: 0.4, kd: 4.2 }
    };
    const calmScore = scoreFlightRun({ status: 'completed' }, calmHumanMetrics, 'level-1');
    assert.equal(calmScore.stars, 3);

    // Same completion time & route fit, but with obvious oscillation (10 reversals) -> drops to 2 stars
    const oscillatingMetrics = {
      ...calmHumanMetrics,
      oscillationReversals: 10
    };
    const oscScore = scoreFlightRun({ status: 'completed' }, oscillatingMetrics, 'level-1');
    assert.equal(oscScore.stars, 2);
    const tip = buildNextStarAdvice(oscScore, oscillatingMetrics, null, CHALLENGE_SCENES['level-1']);
    assert.match(tip, /oscillation|Kd/i);

    // Real simulation exposes oscillationReversals cleanly in getFlightMetrics()
    const sim = new FlightSimulation();
    sim.loadScene(CHALLENGE_SCENES['level-1'], true);
    sim.setGains({ kp: 6.5, ki: 0.4, kd: 4.0 });
    for (let i = 0; i < Math.round(3.0 / FIXED_DT); i++) {
      sim.stepFixed(FIXED_DT, { moveX: 0, moveZ: i < 120 ? 1 : 0 });
    }
    const m = sim.getFlightMetrics();
    assert.ok(Number.isFinite(m.oscillationReversals) && m.oscillationReversals >= 0);
  });
});

describe('Procedural Web Audio Engine (Motor, Wind, Collision, BGM)', () => {
  it('maps drone thrust and wind forces to bounded, click-free audio parameters', () => {
    // Stopped / paused / out-of-flight motor is completely silent
    assert.equal(computeMotorAudioParams({ thrust: 15, maxThrust: 28, started: false, inFlightView: true }).gain, 0);
    assert.equal(computeMotorAudioParams({ thrust: 15, maxThrust: 28, started: true, paused: true, inFlightView: true }).gain, 0);
    assert.equal(computeMotorAudioParams({ thrust: 15, maxThrust: 28, started: true, inFlightView: false }).gain, 0);

    // Active flight: higher thrust increases rotor pitch and gain smoothly
    const lowThrust = computeMotorAudioParams({ thrust: 6, maxThrust: 28, started: true, onGround: false, inFlightView: true });
    const highThrust = computeMotorAudioParams({ thrust: 24, maxThrust: 28, started: true, onGround: false, inFlightView: true });
    assert.ok(highThrust.baseFreq > lowThrust.baseFreq + 50);
    assert.ok(highThrust.gain > lowThrust.gain);
    assert.ok(highThrust.washGain > lowThrust.washGain);

    // Wind ambience: silent in calm air, increases pitch & volume in strong gusts
    assert.equal(computeWindAudioParams({ windX: 0.1, windZ: 0, inFlightView: true }).gain, 0);
    const breeze = computeWindAudioParams({ windX: 2.5, windZ: 0, inFlightView: true });
    const storm = computeWindAudioParams({ windX: 6.8, windZ: -1.3, inFlightView: true });
    assert.ok(breeze.active && breeze.gain > 0);
    assert.ok(storm.centerFreq > breeze.centerFreq + 150);
    assert.ok(storm.gain > breeze.gain);
  });

  it('persists Sound & BGM preferences and safely no-ops SFX calls in Node.js', () => {
    const map = new Map();
    const mockStorage = {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v))
    };

    const audio = new DroneAudioEngine(mockStorage);
    assert.equal(audio.soundEnabled, true);
    assert.equal(audio.bgmEnabled, true);

    assert.equal(audio.toggleBgm(), false);
    assert.equal(audio.toggleSound(), false);
    const reloaded = loadAudioPrefs(mockStorage);
    assert.deepEqual(reloaded, { soundEnabled: false, bgmEnabled: false });

    saveAudioPrefs({ soundEnabled: true, bgmEnabled: true }, mockStorage);
    assert.deepEqual(loadAudioPrefs(mockStorage), { soundEnabled: true, bgmEnabled: true });

    // Safe no-op calls without AudioContext
    audio.setSoundEnabled(true);
    audio.playTakeoff();
    audio.playCollision();
    audio.playFailure('battery_depleted');
    audio.playRingPass(0);
    audio.playStarReveal(3);
    audio.playMissionComplete(3);
    audio.playUiClick();
    audio.updateFlightAudio({ thrust: 14, maxThrust: 28, windX: 4, windZ: 0, started: true, inFlightView: true });
    audio.silenceFlightLoops();
  });

  it('exposes English-only Sound & BGM controls in DOM and zero Chinese characters in src/audio.js', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const audioJs = fs.readFileSync(path.join(ROOT, 'src/audio.js'), 'utf8');
    for (const id of ['btn-toggle-sfx', 'btn-toggle-bgm', 'btn-flight-sfx', 'btn-flight-bgm']) {
      assert.ok(html.includes(id), `Expected index.html to include ${id}`);
    }
    const cjk = /[\u4e00-\u9fff]/;
    assert.equal(cjk.test(audioJs), false, 'src/audio.js must contain zero Chinese characters');
    assert.equal(cjk.test(html), false, 'index.html must contain zero Chinese characters');
  });
});
