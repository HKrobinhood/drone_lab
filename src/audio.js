/**
 * Procedural Web Audio API Sound & BGM Engine for Drone Lab — PID Flight Challenge.
 *
 * Zero external audio file dependencies; works offline & on GitHub Pages,
 * degrades cleanly to a safe no-op in Node.js automated tests.
 *
 * Includes:
 * - Real-time thrust-modulated drone motor/rotor hum + takeoff arming chirp
 * - Real-time wind & gust ambience modulated by physics wind force
 * - Tactile collision / hard-landing impact SFX & alert cues
 * - Ring pass chimes, animated 1-3 star reveal tones, and UI clicks
 * - Light, cheerful procedural STEM background music (BGM) with flight auto-ducking
 */

import { clamp } from './pid.js';

export const AUDIO_PREFS_KEY = 'drone_lab_audio_prefs_v1';

/**
 * Pure mapping from real drone physics state to rotor audio synthesis targets.
 */
export function computeMotorAudioParams({
  thrust = 0,
  maxThrust = 28,
  started = false,
  paused = false,
  onGround = true,
  inFlightView = false
} = {}) {
  if (!inFlightView || !started || paused) {
    return { active: false, baseFreq: 80, harmonicFreq: 162, filterFreq: 320, gain: 0, washGain: 0 };
  }

  const ratio = clamp(Number(thrust) / Math.max(1, Number(maxThrust)), 0, 1);
  const idleFactor = onGround && ratio < 0.08 ? 0.35 : 1.0;
  const baseFreq = 78 + ratio * 138;
  const harmonicFreq = baseFreq * 2.02;
  const filterFreq = 340 + ratio * 1180;
  const gain = (0.028 + ratio * 0.105) * idleFactor;
  const washGain = (0.008 + Math.pow(ratio, 1.3) * 0.055) * idleFactor;

  return {
    active: true,
    baseFreq,
    harmonicFreq,
    filterFreq,
    gain,
    washGain
  };
}

/**
 * Pure mapping from real aerodynamic wind vector to wind ambience synthesis targets.
 */
export function computeWindAudioParams({ windX = 0, windZ = 0, inFlightView = false, paused = false } = {}) {
  if (!inFlightView || paused) {
    return { active: false, centerFreq: 320, q: 2.2, gain: 0 };
  }

  const mag = Math.hypot(Number(windX) || 0, Number(windZ) || 0);
  if (mag < 0.35) {
    return { active: false, centerFreq: 320, q: 2.2, gain: 0 };
  }

  const norm = clamp((mag - 0.35) / 7.5, 0, 1);
  return {
    active: true,
    centerFreq: 260 + norm * 560,
    q: 2.2 + norm * 1.9,
    gain: 0.02 + Math.pow(norm, 1.15) * 0.12
  };
}

export function loadAudioPrefs(customStorage) {
  const backend = customStorage || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  const defaults = { soundEnabled: true, bgmEnabled: true };
  if (!backend) return defaults;
  try {
    const raw = backend.getItem(AUDIO_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: parsed?.soundEnabled !== false,
      bgmEnabled: parsed?.bgmEnabled !== false
    };
  } catch {
    return defaults;
  }
}

export function saveAudioPrefs(prefs, customStorage) {
  const backend = customStorage || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  if (!backend) return false;
  try {
    backend.setItem(
      AUDIO_PREFS_KEY,
      JSON.stringify({
        soundEnabled: prefs?.soundEnabled !== false,
        bgmEnabled: prefs?.bgmEnabled !== false
      })
    );
    return true;
  } catch {
    return false;
  }
}

// Cheerful upbeat C-major pentatonic / lab-adventure loop (16 steps @ ~118 BPM)
const BGM_MELODY_HZ = [
  523.25, 0, 659.25, 587.33,
  783.99, 0, 659.25, 523.25,
  587.33, 659.25, 783.99, 0,
  880.0, 783.99, 659.25, 0
];

const BGM_BASS_HZ = [
  130.81, 0, 196.0, 0,
  174.61, 0, 196.0, 0,
  146.83, 0, 196.0, 0,
  130.81, 0, 196.0, 164.81
];

export class DroneAudioEngine {
  constructor(customStorage) {
    const prefs = loadAudioPrefs(customStorage);
    this.storage = customStorage || null;
    this.soundEnabled = prefs.soundEnabled;
    this.bgmEnabled = prefs.bgmEnabled;

    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;

    // Continuous flight audio nodes
    this.motorOsc1 = null;
    this.motorOsc2 = null;
    this.motorFilter = null;
    this.motorGain = null;
    this.washSource = null;
    this.washFilter = null;
    this.washGain = null;
    this.windSource = null;
    this.windFilter = null;
    this.windGain = null;

    this.bgmTimer = null;
    this.bgmStep = 0;
    this.inFlightDuck = false;
    this.tabHidden = false;
  }

  #getAudioContextCtor() {
    if (typeof globalThis === 'undefined') return null;
    return globalThis.AudioContext || globalThis.webkitAudioContext || null;
  }

  ensureUnlocked() {
    if (!this.soundEnabled) return false;
    const Ctor = this.#getAudioContextCtor();
    if (!Ctor) return false;

    if (!this.ctx) {
      try {
        this.ctx = new Ctor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.soundEnabled ? 0.85 : 0;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 1.0;
        this.sfxGain.connect(this.masterGain);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmEnabled ? 0.05 : 0;
        this.bgmGain.connect(this.masterGain);

        this.noiseBuffer = this.#createNoiseBuffer(2.0);
        this.#initContinuousNodes();
      } catch {
        this.ctx = null;
        return false;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.bgmEnabled && this.soundEnabled && !this.tabHidden) {
      this.#startBgmLoop();
    }
    return true;
  }

  #createNoiseBuffer(seconds = 2.0) {
    const sampleRate = this.ctx.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    // Warm pink-tinted noise for smooth rotor airwash & wind ambience
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = clamp((b0 + b1 + b2 + white * 0.18) * 1.4, -1, 1);
    }
    return buffer;
  }

  #initContinuousNodes() {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    // 1. Rotor Motor Oscillators -> Lowpass -> Gain
    this.motorFilter = ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.value = 340;
    this.motorFilter.Q.value = 1.4;

    this.motorGain = ctx.createGain();
    this.motorGain.gain.value = 0;

    this.motorOsc1 = ctx.createOscillator();
    this.motorOsc1.type = 'triangle';
    this.motorOsc1.frequency.value = 82;

    this.motorOsc2 = ctx.createOscillator();
    this.motorOsc2.type = 'sawtooth';
    this.motorOsc2.frequency.value = 165;

    const osc2SubGain = ctx.createGain();
    osc2SubGain.gain.value = 0.24;

    this.motorOsc1.connect(this.motorFilter);
    this.motorOsc2.connect(osc2SubGain);
    osc2SubGain.connect(this.motorFilter);
    this.motorFilter.connect(this.motorGain);
    this.motorGain.connect(this.sfxGain);
    this.motorOsc1.start();
    this.motorOsc2.start();

    // 2. Rotor Airwash Noise -> Bandpass -> Gain
    this.washSource = ctx.createBufferSource();
    this.washSource.buffer = this.noiseBuffer;
    this.washSource.loop = true;

    this.washFilter = ctx.createBiquadFilter();
    this.washFilter.type = 'bandpass';
    this.washFilter.frequency.value = 520;
    this.washFilter.Q.value = 0.9;

    this.washGain = ctx.createGain();
    this.washGain.gain.value = 0;

    this.washSource.connect(this.washFilter);
    this.washFilter.connect(this.washGain);
    this.washGain.connect(this.sfxGain);
    this.washSource.start();

    // 3. Wind & Gust Ambience -> Sweeping Resonant Bandpass -> Gain
    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = this.noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 340;
    this.windFilter.Q.value = 2.6;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);
    this.windSource.start();
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
    saveAudioPrefs({ soundEnabled: this.soundEnabled, bgmEnabled: this.bgmEnabled }, this.storage);
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.soundEnabled ? 0.85 : 0, now, 0.04);
    }
    if (!this.soundEnabled) {
      this.#stopBgmLoop();
      this.silenceFlightLoops();
    } else {
      this.ensureUnlocked();
    }
    return this.soundEnabled;
  }

  toggleSound() {
    return this.setSoundEnabled(!this.soundEnabled);
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = Boolean(enabled);
    saveAudioPrefs({ soundEnabled: this.soundEnabled, bgmEnabled: this.bgmEnabled }, this.storage);
    if (this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime;
      const target = this.bgmEnabled && this.soundEnabled ? (this.inFlightDuck ? 0.032 : 0.052) : 0;
      this.bgmGain.gain.setTargetAtTime(target, now, 0.08);
    }
    if (this.bgmEnabled && this.soundEnabled && !this.tabHidden) {
      this.ensureUnlocked();
    } else {
      this.#stopBgmLoop();
    }
    return this.bgmEnabled;
  }

  toggleBgm() {
    return this.setBgmEnabled(!this.bgmEnabled);
  }

  setTabHidden(hidden) {
    this.tabHidden = Boolean(hidden);
    if (this.tabHidden) {
      this.#stopBgmLoop();
      this.silenceFlightLoops();
    } else if (this.soundEnabled && this.bgmEnabled && this.ctx) {
      this.#startBgmLoop();
    }
  }

  setFlightDuck(inFlight) {
    this.inFlightDuck = Boolean(inFlight);
    if (this.ctx && this.bgmGain && this.bgmEnabled && this.soundEnabled) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.setTargetAtTime(this.inFlightDuck ? 0.032 : 0.052, now, 0.12);
    }
  }

  silenceFlightLoops() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.motorGain?.gain.setTargetAtTime(0, now, 0.06);
    this.washGain?.gain.setTargetAtTime(0, now, 0.06);
    this.windGain?.gain.setTargetAtTime(0, now, 0.08);
  }

  updateFlightAudio(params = {}) {
    if (!this.ctx || !this.soundEnabled || this.tabHidden) return;
    const now = this.ctx.currentTime;

    const motor = computeMotorAudioParams(params);
    if (this.motorOsc1 && this.motorOsc2 && this.motorFilter && this.motorGain && this.washFilter && this.washGain) {
      this.motorOsc1.frequency.setTargetAtTime(motor.baseFreq, now, 0.05);
      this.motorOsc2.frequency.setTargetAtTime(motor.harmonicFreq, now, 0.05);
      this.motorFilter.frequency.setTargetAtTime(motor.filterFreq, now, 0.06);
      this.motorGain.gain.setTargetAtTime(motor.gain, now, 0.06);
      this.washFilter.frequency.setTargetAtTime(motor.filterFreq * 0.9, now, 0.06);
      this.washGain.gain.setTargetAtTime(motor.washGain, now, 0.06);
    }

    const wind = computeWindAudioParams(params);
    if (this.windFilter && this.windGain) {
      this.windFilter.frequency.setTargetAtTime(wind.centerFreq, now, 0.12);
      this.windFilter.Q.setTargetAtTime(wind.q, now, 0.12);
      this.windGain.gain.setTargetAtTime(wind.gain, now, 0.12);
    }
  }

  #playTone(freq, { type = 'sine', startOffset = 0, duration = 0.14, gain = 0.12, endFreq = null, target = null } = {}) {
    if (!this.ctx || !this.soundEnabled) return;
    const now = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + Math.min(0.015, duration * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env);
    env.connect(target || this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playTakeoff() {
    if (!this.ensureUnlocked()) return;
    // Crisp ESC arming & rotor spool-up 3-note chime
    this.#playTone(523.25, { type: 'triangle', startOffset: 0.0, duration: 0.09, gain: 0.11 });
    this.#playTone(659.25, { type: 'triangle', startOffset: 0.075, duration: 0.09, gain: 0.12 });
    this.#playTone(783.99, { type: 'triangle', startOffset: 0.15, duration: 0.18, gain: 0.13 });
  }

  playCollision() {
    if (!this.ensureUnlocked()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Punchy low-end impact thud
    this.#playTone(150, { type: 'triangle', startOffset: 0, duration: 0.22, gain: 0.28, endFreq: 36 });
    this.#playTone(240, { type: 'sawtooth', startOffset: 0.01, duration: 0.12, gain: 0.11, endFreq: 72 });

    // Short crunchy filtered noise burst
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(720, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.19);
      filter.Q.value = 1.2;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.24, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      src.connect(filter);
      filter.connect(env);
      env.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.22);
    }
  }

  playFailure(reason = 'collision') {
    if (!this.ensureUnlocked()) return;
    if (reason === 'collision' || reason === 'hard_landing') {
      this.playCollision();
      return;
    }
    // Descending caution alert for battery/timeout/out-of-bounds
    this.#playTone(392.0, { type: 'triangle', startOffset: 0.0, duration: 0.14, gain: 0.14 });
    this.#playTone(311.13, { type: 'triangle', startOffset: 0.13, duration: 0.16, gain: 0.14 });
    this.#playTone(233.08, { type: 'sine', startOffset: 0.27, duration: 0.28, gain: 0.15 });
  }

  playRingPass(ringIndex = 0) {
    if (!this.ensureUnlocked()) return;
    const shift = ringIndex * 65;
    this.#playTone(659.25 + shift, { type: 'sine', startOffset: 0.0, duration: 0.11, gain: 0.12 });
    this.#playTone(987.77 + shift, { type: 'triangle', startOffset: 0.08, duration: 0.22, gain: 0.14 });
  }

  playStarReveal(starIndex = 1) {
    if (!this.ensureUnlocked()) return;
    const notes = [523.25, 659.25, 783.99];
    const base = notes[Math.max(0, Math.min(2, starIndex - 1))] || 523.25;
    this.#playTone(base, { type: 'triangle', startOffset: 0, duration: 0.22, gain: 0.14 });
    if (starIndex === 3) {
      this.#playTone(1046.5, { type: 'sine', startOffset: 0.06, duration: 0.36, gain: 0.15 });
      this.#playTone(1318.5, { type: 'sine', startOffset: 0.12, duration: 0.34, gain: 0.1 });
    }
  }

  playMissionComplete(stars = 3) {
    if (!this.ensureUnlocked()) return;
    this.#playTone(523.25, { type: 'triangle', startOffset: 0.0, duration: 0.18, gain: 0.11 });
    this.#playTone(659.25, { type: 'triangle', startOffset: 0.09, duration: 0.18, gain: 0.11 });
    this.#playTone(783.99, { type: 'triangle', startOffset: 0.18, duration: 0.26, gain: 0.12 });
    if (stars >= 3) {
      this.#playTone(1046.5, { type: 'sine', startOffset: 0.28, duration: 0.38, gain: 0.13 });
    }
  }

  playUiClick() {
    if (!this.ensureUnlocked()) return;
    this.#playTone(620, { type: 'sine', startOffset: 0, duration: 0.045, gain: 0.045, endFreq: 780 });
  }

  #startBgmLoop() {
    if (this.bgmTimer !== null || !this.ctx || !this.bgmEnabled || !this.soundEnabled || this.tabHidden) {
      return;
    }
    const stepMs = 254; // ~118 BPM eighth notes
    this.bgmTimer = globalThis.setInterval(() => {
      if (!this.ctx || !this.bgmEnabled || !this.soundEnabled || this.tabHidden || this.ctx.state !== 'running') {
        return;
      }
      const idx = this.bgmStep % BGM_MELODY_HZ.length;
      const mel = BGM_MELODY_HZ[idx];
      const bass = BGM_BASS_HZ[idx];

      if (mel > 0) {
        this.#playTone(mel, {
          type: 'triangle',
          startOffset: 0,
          duration: 0.19,
          gain: 0.42,
          target: this.bgmGain
        });
      }
      if (bass > 0) {
        this.#playTone(bass, {
          type: 'sine',
          startOffset: 0,
          duration: 0.23,
          gain: 0.55,
          target: this.bgmGain
        });
      }
      this.bgmStep = (this.bgmStep + 1) % BGM_MELODY_HZ.length;
    }, stepMs);
  }

  #stopBgmLoop() {
    if (this.bgmTimer !== null) {
      globalThis.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
