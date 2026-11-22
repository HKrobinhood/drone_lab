/**
 * Canvas 2D side-view renderer for Drone Lab — PID Flight Challenge.
 * Converts SI world coordinates (meters) to responsive HiDPI Canvas pixels.
 * Decorative cartoon story backdrops are rendered strictly behind physics/collision geometry.
 */

import { getSceneThemeConfig } from './story.js';

export class FlightRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rotorPhase = 0;
  }

  resizeIfNeeded() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    return { width: rect.width, height: rect.height, dpr };
  }

  render(sim, frameDt = 1 / 60, options = {}) {
    const showGhostDrone = options.showGhostDrone !== false;
    const showTrails = options.showTrails !== false;
    const dims = this.resizeIfNeeded();
    if (!dims || !this.ctx) return;

    const { width, height, dpr } = dims;
    const ctx = this.ctx;
    const worldW = sim.config.worldWidth;
    const worldH = sim.config.worldHeight;
    const theme = getSceneThemeConfig(sim.activeScene?.id);

    ctx.save();
    ctx.scale(dpr, dpr);

    const groundPx = 38;
    const padX = 16;
    const padTop = 16;
    const drawW = width - padX * 2;
    const drawH = height - groundPx - padTop;
    const scale = Math.min(drawW / worldW, drawH / worldH);
    const originX = (width - worldW * scale) * 0.5;
    const groundY = height - groundPx;

    const toPxX = (wx) => originX + wx * scale;
    const toPxY = (wz) => groundY - wz * scale;

    // 1. Themed Cartoon Sky & Decorative Backdrop (strictly separated from collision bodies)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, theme.skyTop);
    skyGrad.addColorStop(0.55, theme.skyMid);
    skyGrad.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, groundY);

    this.#drawThemedBackdrop(ctx, theme, width, groundY, padTop, sim);

    // 2. Metric Grid (every 2m)
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= worldW; x += 2) {
      const px = toPxX(x);
      ctx.moveTo(px, padTop);
      ctx.lineTo(px, groundY);
    }
    for (let z = 0; z <= worldH; z += 2) {
      const py = toPxY(z);
      ctx.moveTo(toPxX(0), py);
      ctx.lineTo(toPxX(worldW), py);
    }
    ctx.stroke();

    // Arena Boundary Outline & Challenge Out-of-Bounds Perimeter
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(toPxX(0), toPxY(worldH), worldW * scale, worldH * scale);

    if (Number.isFinite(sim.outOfBoundsMargin)) {
      const m = sim.outOfBoundsMargin;
      ctx.save();
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(toPxX(m), groundY);
      ctx.lineTo(toPxX(m), toPxY(worldH - m));
      ctx.lineTo(toPxX(worldW - m), toPxY(worldH - m));
      ctx.lineTo(toPxX(worldW - m), groundY);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Location Tag + Wind Indicator Overlay
    if (theme.id !== 'default') {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.52)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      const badgeLabel = theme.label.toUpperCase();
      ctx.font = '700 10px sans-serif';
      const tw = ctx.measureText(badgeLabel).width + 18;
      ctx.beginPath();
      ctx.roundRect(toPxX(0) + 10, padTop + 10, tw, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.fillText(badgeLabel, toPxX(0) + 19, padTop + 24);
      ctx.restore();
    }

    if (sim.windMode !== 'calm' || Math.abs(sim.drone.windX) > 0.05 || Math.abs(sim.drone.windZ) > 0.05) {
      this.#drawWindOverlay(ctx, width, padTop + 14, sim.drone.windX, sim.drone.windZ, sim.windMode);
    }

    // 4. Obstacles (rendered strictly from physics collision rects on top of backdrop)
    if (sim.obstacles?.length) {
      this.#drawObstacles(ctx, sim.obstacles, toPxX, toPxY, scale);
    }

    // 5. Ground & Launch Pad
    ctx.fillStyle = theme.groundFill;
    ctx.fillRect(0, groundY, width, groundPx);
    ctx.fillStyle = theme.groundTop;
    ctx.fillRect(0, groundY, width, 4);

    const padCenterPx = toPxX(sim.startPos.x);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(padCenterPx - 1.0 * scale, groundY - 4, 2.0 * scale, 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAUNCH PAD', padCenterPx, groundY + 22);

    // 6. Elevated Precision Landing Pad
    if (sim.landingPad) {
      this.#drawLandingPad(ctx, sim.landingPad, sim.padStatus, toPxX, toPxY, groundY, scale);
    }

    // 7. Sequential Checkpoints / Rings
    if (sim.rings?.length) {
      this.#drawRings(ctx, sim.rings, sim.nextRingIndex, toPxX, toPxY, scale);
    }

    // 8. Aerial Target Zone
    if (sim.targetZone) {
      this.#drawTargetZone(ctx, sim.targetZone, toPxX, toPxY, scale);
    }

    // 9. Previous Attempt (if retrying), Commanded REF & Actual Flight Trails
    if (showTrails) {
      if (sim.previousTrail?.length > 1) {
        this.#drawPreviousTrail(ctx, sim.previousTrail, toPxX, toPxY);
      }
      this.#drawRefTrail(ctx, sim.refTrail, toPxX, toPxY);
      this.#drawTrail(ctx, sim.trail, toPxX, toPxY);
    }

    // 10. Reference Position (Ghost Drone + Error Tether)
    this.#drawReferenceMarker(ctx, sim.reference, sim.drone, sim.config, toPxX, toPxY, scale, showGhostDrone);

    // 11. Drone Body
    if (!sim.paused && sim.started) {
      this.rotorPhase += frameDt * (18 + sim.drone.thrust * 1.4);
    }
    this.#drawDrone(ctx, sim.drone, sim.config, toPxX, toPxY, scale);

    // 12. Pause Overlay
    if (sim.paused) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SIMULATION PAUSED', width * 0.5, height * 0.48);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 13px sans-serif';
      ctx.fillText('Press P or click Resume to continue flying', width * 0.5, height * 0.54);
    }

    ctx.restore();
  }

  #drawThemedBackdrop(ctx, theme, width, groundY, padTop, sim) {
    if (!theme || theme.backdropType === 'default') return;
    const t = Number(sim?.elapsedTime || 0);
    ctx.save();

    // Soft cartoon clouds (drifting smoothly with elapsedTime)
    if (theme.clouds) {
      const isStorm = theme.backdropType === 'storm-zone' || theme.backdropType === 'final-rescue';
      ctx.fillStyle = isStorm ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.16)';
      const drift = (t * (isStorm ? 22 : 8)) % (width + 180);
      for (let i = 0; i < 4; i++) {
        const cx = ((i * width * 0.28 + drift) % (width + 160)) - 80;
        const cy = padTop + 28 + (i % 2) * 26;
        const r = isStorm ? 36 : 24;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 1.9, r * 0.58, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - r * 0.65, cy - r * 0.25, r * 0.85, r * 0.55, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + r * 0.6, cy - r * 0.2, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Distant low-poly horizon silhouettes (low contrast so foreground obstacles pop unambiguously)
    if (theme.backdropType === 'academy' || theme.backdropType === 'academy-wind') {
      // Rolling low-poly green hills
      ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width * 0.14, groundY - 62);
      ctx.lineTo(width * 0.34, groundY - 28);
      ctx.lineTo(width * 0.58, groundY - 76);
      ctx.lineTo(width * 0.82, groundY - 34);
      ctx.lineTo(width, groundY - 58);
      ctx.lineTo(width, groundY);
      ctx.closePath();
      ctx.fill();

      // Tiny far-background Academy Hangar on left edge
      ctx.fillStyle = 'rgba(248, 250, 252, 0.22)';
      ctx.fillRect(28, groundY - 34, 52, 34);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.34)';
      ctx.beginPath();
      ctx.moveTo(22, groundY - 34);
      ctx.lineTo(54, groundY - 54);
      ctx.lineTo(86, groundY - 34);
      ctx.closePath();
      ctx.fill();

      // Fluttering windsock on academy-wind
      if (theme.backdropType === 'academy-wind') {
        const sx = width * 0.16;
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, groundY);
        ctx.lineTo(sx, groundY - 46);
        ctx.stroke();
        const flutter = Math.sin(t * 7) * 3;
        ctx.fillStyle = 'rgba(249, 115, 22, 0.55)';
        ctx.beginPath();
        ctx.moveTo(sx + 1, groundY - 45);
        ctx.lineTo(sx + 26, groundY - 41 + flutter);
        ctx.lineTo(sx + 26, groundY - 34 + flutter);
        ctx.lineTo(sx + 1, groundY - 32);
        ctx.closePath();
        ctx.fill();
      }
    } else if (theme.backdropType === 'rescue-base') {
      // Distant SKYGUARD HQ & radio tower
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(30, groundY - 54, 78, 54);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.fillRect(42, groundY - 44, 54, 14);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.32)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(96, groundY - 54);
      ctx.lineTo(96, groundY - 88);
      ctx.stroke();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.beginPath();
      ctx.arc(96, groundY - 90, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Distant skyline
      ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
      const skyline = [0.28, 0.35, 0.46, 0.62, 0.74, 0.86];
      skyline.forEach((f, idx) => {
        const bh = 36 + (idx % 3) * 22;
        ctx.fillRect(width * f, groundY - bh, 36, bh);
      });
    } else if (theme.backdropType === 'city-rooftops') {
      // Soft distant city skyline towers
      const towers = [
        { f: 0.04, w: 54, h: 72 },
        { f: 0.14, w: 42, h: 108 },
        { f: 0.25, w: 60, h: 64 },
        { f: 0.44, w: 48, h: 92 },
        { f: 0.62, w: 56, h: 78 },
        { f: 0.78, w: 44, h: 112 },
        { f: 0.89, w: 58, h: 68 }
      ];
      for (const b of towers) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.fillRect(width * b.f, groundY - b.h, b.w, b.h);
        ctx.fillStyle = 'rgba(254, 240, 138, 0.16)';
        for (let wy = groundY - b.h + 10; wy < groundY - 12; wy += 16) {
          ctx.fillRect(width * b.f + 8, wy, 7, 7);
          ctx.fillRect(width * b.f + b.w - 15, wy, 7, 7);
        }
      }
    } else if (theme.backdropType === 'cargo-station') {
      // Distant cranes & stacked containers along horizon
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.lineWidth = 3;
      for (const f of [0.18, 0.76]) {
        const cx = width * f;
        ctx.beginPath();
        ctx.moveTo(cx, groundY);
        ctx.lineTo(cx, groundY - 96);
        ctx.lineTo(cx + 56, groundY - 96);
        ctx.stroke();
      }
      const crates = [
        { f: 0.05, c: 'rgba(249, 115, 22, 0.24)' },
        { f: 0.11, c: 'rgba(14, 165, 233, 0.24)' },
        { f: 0.66, c: 'rgba(234, 179, 8, 0.22)' },
        { f: 0.84, c: 'rgba(249, 115, 22, 0.22)' }
      ];
      for (const cr of crates) {
        ctx.fillStyle = cr.c;
        ctx.fillRect(width * cr.f, groundY - 26, 40, 26);
      }
    } else if (theme.backdropType === 'narrow-passage') {
      // Subtle low-contrast twilight city backdrop (clearly recessed behind solid obstacles)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
      for (let i = 0; i < 8; i++) {
        const bx = width * (0.03 + i * 0.125);
        const bh = 68 + ((i * 37) % 64);
        ctx.fillRect(bx, groundY - bh, 46, bh);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.12)';
        ctx.fillRect(bx + 10, groundY - bh + 12, 6, 8);
        ctx.fillRect(bx + 26, groundY - bh + 28, 6, 8);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
      }
    } else if (theme.backdropType === 'storm-zone' || theme.backdropType === 'final-rescue') {
      // Darkened storm horizon buildings
      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      for (let i = 0; i < 7; i++) {
        const bx = width * (0.04 + i * 0.14);
        const bh = 42 + ((i * 29) % 52);
        ctx.fillRect(bx, groundY - bh, 48, bh);
      }
      // Sweeping golden rescue searchlight beacon on Final Rescue
      if (theme.searchlight) {
        const sweep = Math.sin(t * 0.9) * 0.22;
        const bx = width * 0.9;
        const by = groundY - 42;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-2.45 + sweep);
        const beamGrad = ctx.createLinearGradient(0, 0, width * 0.65, 0);
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width * 0.65, -48);
        ctx.lineTo(width * 0.65, 48);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Lightweight animated wind streaks (pure math, zero allocations)
    if (theme.windStreaks) {
      const windMag = Math.max(1.5, Math.abs(sim?.drone?.windX || 3.5));
      const speedPx = 55 + windMag * 28;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.18)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const x = ((i * 137 + t * speedPx) % (width + 80)) - 40;
        const y = padTop + 26 + ((i * 59) % Math.max(60, groundY - padTop - 40));
        ctx.moveTo(x, y);
        ctx.lineTo(x + 28 + (i % 3) * 10, y);
      }
      ctx.stroke();
    }

    // Lightweight animated slanting rain streaks for storm missions
    if (theme.rain) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.24)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const spanH = Math.max(80, groundY - padTop);
      for (let i = 0; i < 28; i++) {
        const rx = ((i * 67 + t * 145) % (width + 60)) - 30;
        const ry = padTop + ((i * 43 + t * 290) % spanH);
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 6, ry + 14);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  #drawWindOverlay(ctx, canvasW, y, windX, windZ, mode) {
    const isGusting =
      (mode === 'challenge_gust' || mode === 'gust' || mode === 'scene_wind') &&
      (windX > 4.5 || Math.abs(windZ) > 0.3);
    const label = isGusting
      ? `GUST SURGE (+${windX.toFixed(1)} N)`
      : `CROSSWIND (+${windX.toFixed(1)} N)`;
    ctx.save();
    ctx.fillStyle = isGusting ? 'rgba(239, 68, 68, 0.24)' : 'rgba(251, 146, 60, 0.16)';
    ctx.strokeStyle = isGusting ? 'rgba(248, 113, 113, 0.8)' : 'rgba(251, 146, 60, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(canvasW - 196, y, 178, 28, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isGusting ? '#fca5a5' : '#fdba74';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    const downArrow = windZ < -0.5 ? ' ↘' : '';
    ctx.fillText(`→ ${label}${downArrow}`, canvasW - 107, y + 18);
    ctx.restore();
  }

  #drawObstacles(ctx, obstacles, toPxX, toPxY, scale) {
    ctx.save();
    for (const obs of obstacles) {
      const px = toPxX(obs.x);
      const py = toPxY(obs.z + obs.height);
      const pw = obs.width * scale;
      const ph = obs.height * scale;

      ctx.fillStyle = '#334155';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, ph);

      // Subtle diagonal hazard stripe accent
      ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
      ctx.fillRect(px + 2, py + 2, pw - 4, Math.min(10, ph - 4));
    }
    ctx.restore();
  }

  #drawLandingPad(ctx, pad, padStatus, toPxX, toPxY, groundY, scale) {
    const leftX = toPxX(pad.x - pad.halfWidth);
    const padW = pad.halfWidth * 2 * scale;
    const topY = toPxY(pad.topZ);
    const pedH = Math.max(0, groundY - topY);

    ctx.save();
    // Pedestal
    ctx.fillStyle = '#334155';
    ctx.fillRect(leftX + 4, topY, padW - 8, pedH);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftX + 4, topY, padW - 8, pedH);

    // Top Deck
    ctx.fillStyle = padStatus?.landedSafely ? '#22c55e' : padStatus?.inside ? '#38bdf8' : '#0ea5e9';
    ctx.fillRect(leftX, topY - 4, padW, 7);

    // Hold Progress Bar
    const progress = Math.min(1, (padStatus?.holdTimer || 0) / pad.holdRequired);
    if (progress > 0) {
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(leftX, topY - 10, padW * progress, 4);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    const label = padStatus?.landedSafely
      ? 'LANDED!'
      : padStatus?.inside
        ? `HOLD ${padStatus.holdTimer.toFixed(1)}/${pad.holdRequired.toFixed(1)}s`
        : 'HELIPAD';
    ctx.fillText(label, toPxX(pad.x), topY - 16);
    ctx.restore();
  }

  #drawRings(ctx, rings, nextIndex, toPxX, toPxY, scale) {
    ctx.save();
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      const rx = toPxX(ring.x);
      const topOpenY = toPxY(ring.z + ring.apertureHalfH);
      const botOpenY = toPxY(ring.z - ring.apertureHalfH);
      const rimPx = 0.42 * scale;
      const postW = 0.32 * scale;

      const isPassed = ring.passed;
      const isActive = i === nextIndex;
      const rimColor = isPassed ? '#22c55e' : isActive ? '#facc15' : '#64748b';
      const gateColor = isPassed
        ? 'rgba(34, 197, 94, 0.25)'
        : isActive
          ? 'rgba(250, 204, 21, 0.28)'
          : 'rgba(100, 116, 139, 0.16)';

      // Aperture Corridor Line
      ctx.strokeStyle = gateColor;
      ctx.lineWidth = isActive ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(rx, topOpenY);
      ctx.lineTo(rx, botOpenY);
      ctx.stroke();

      // Solid Top & Bottom Rim Posts
      ctx.fillStyle = rimColor;
      ctx.fillRect(rx - postW * 0.5, topOpenY - rimPx, postW, rimPx);
      ctx.fillRect(rx - postW * 0.5, botOpenY, postW, rimPx);

      ctx.fillStyle = isPassed ? '#86efac' : isActive ? '#fde047' : '#94a3b8';
      ctx.font = '700 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1}`, rx, topOpenY - rimPx - 6);
    }
    ctx.restore();
  }

  #drawTargetZone(ctx, zone, toPxX, toPxY, scale) {
    const cx = toPxX(zone.x);
    const cy = toPxY(zone.z);
    const r = zone.radius * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = zone.stabilized
      ? 'rgba(34, 197, 94, 0.22)'
      : zone.inside
        ? 'rgba(56, 189, 248, 0.2)'
        : 'rgba(56, 189, 248, 0.08)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = zone.stabilized ? '#4ade80' : '#38bdf8';
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    const progress = Math.min(1, zone.holdTimer / zone.holdRequired);
    if (progress > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    ctx.fillStyle = zone.stabilized ? '#86efac' : '#7dd3fc';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    const text = zone.stabilized
      ? 'STABILIZED'
      : zone.inside
        ? `HOLD ${zone.holdTimer.toFixed(1)}/${zone.holdRequired.toFixed(1)}s`
        : 'TARGET ZONE';
    ctx.fillText(text, cx, cy - r - 10);
    ctx.restore();
  }

  #drawPreviousTrail(ctx, prevTrail, toPxX, toPxY) {
    if (!prevTrail || prevTrail.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(toPxX(prevTrail[0].x), toPxY(prevTrail[0].z));
    for (let i = 1; i < prevTrail.length; i++) {
      ctx.lineTo(toPxX(prevTrail[i].x), toPxY(prevTrail[i].z));
    }
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.48)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  #drawRefTrail(ctx, refTrail, toPxX, toPxY) {
    if (!refTrail || refTrail.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(toPxX(refTrail[0].x), toPxY(refTrail[0].z));
    for (let i = 1; i < refTrail.length; i++) {
      ctx.lineTo(toPxX(refTrail[i].x), toPxY(refTrail[i].z));
    }
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  #drawTrail(ctx, trail, toPxX, toPxY) {
    if (trail.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toPxX(trail[0].x), toPxY(trail[0].z));
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(toPxX(trail[i].x), toPxY(trail[i].z));
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  #drawReferenceMarker(ctx, ref, drone, config, toPxX, toPxY, scale, showGhostDrone = true) {
    const rx = toPxX(ref.x);
    const ry = toPxY(ref.z);
    const dx = toPxX(drone.x);
    const dy = toPxY(drone.z);
    const errDist = Math.hypot(ref.x - drone.x, ref.z - drone.z);

    ctx.save();
    if (showGhostDrone) {
      // Position Error Tether + Arrow between Actual Drone and Ghost REF Drone
      if (errDist > 0.12) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(dx, dy);
        ctx.lineTo(rx, ry);
        ctx.strokeStyle = errDist > 1.2 ? 'rgba(251, 113, 133, 0.72)' : 'rgba(250, 204, 21, 0.58)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead pointing toward REF
        const ang = Math.atan2(ry - dy, rx - dx);
        const ax = rx - Math.cos(ang) * 14;
        const ay = ry - Math.sin(ang) * 14;
        ctx.fillStyle = errDist > 1.2 ? '#fb7185' : '#facc15';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(ang - 0.45) * 7, ay - Math.sin(ang - 0.45) * 7);
        ctx.lineTo(ax - Math.cos(ang + 0.45) * 7, ay - Math.sin(ang + 0.45) * 7);
        ctx.closePath();
        ctx.fill();

        // Compact error magnitude badge midway
        const mx = (dx + rx) * 0.5;
        const my = (dy + ry) * 0.5 - 8;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.beginPath();
        ctx.roundRect(mx - 24, my - 9, 48, 15, 4);
        ctx.fill();
        ctx.fillStyle = errDist > 1.2 ? '#fda4af' : '#fde047';
        ctx.font = '700 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`e ${errDist.toFixed(2)}m`, mx, my + 2);
      }

      // Semi-transparent Ghost Drone silhouette at Reference Position
      const bodyHalfW = (config?.droneRadius || 0.45) * scale;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-bodyHalfW * 0.85, 0);
      ctx.lineTo(bodyHalfW * 0.85, 0);
      ctx.stroke();

      for (const bx of [-bodyHalfW * 0.72, bodyHalfW * 0.72]) {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(bx - bodyHalfW * 0.36, -6);
        ctx.lineTo(bx + bodyHalfW * 0.36, -6);
        ctx.stroke();
      }

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-9, -5, 18, 9, 4);
      ctx.fill();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-bodyHalfW * 0.9, -11, bodyHalfW * 1.8, 22);
      ctx.setLineDash([]);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(dx, dy);
      ctx.lineTo(rx, ry);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(rx, ry, 7, 0, Math.PI * 2);
    ctx.moveTo(rx - 11, ry);
    ctx.lineTo(rx + 11, ry);
    ctx.moveTo(rx, ry - 11);
    ctx.lineTo(rx, ry + 11);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(showGhostDrone ? 'GHOST REF' : 'REF', rx + 13, ry - 10);
    ctx.restore();
  }

  #drawDrone(ctx, drone, config, toPxX, toPxY, scale) {
    const cx = toPxX(drone.x);
    const cy = toPxY(drone.z);
    const bodyHalfW = config.droneRadius * scale;
    const thrustNorm = Math.min(1, Math.max(0, drone.thrust / config.maxThrust));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(drone.theta);

    if (thrustNorm > 0.03) {
      const plumeLen = (8 + thrustNorm * 26) * (0.9 + 0.1 * Math.sin(this.rotorPhase * 2));
      ctx.fillStyle = `rgba(251, 146, 60, ${0.3 + thrustNorm * 0.55})`;
      for (const rx of [-bodyHalfW * 0.72, bodyHalfW * 0.72]) {
        ctx.beginPath();
        ctx.moveTo(rx - 6, -4);
        ctx.lineTo(rx + 6, -4);
        ctx.lineTo(rx, plumeLen);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bodyHalfW * 0.45, 4);
    ctx.lineTo(-bodyHalfW * 0.6, 12);
    ctx.moveTo(bodyHalfW * 0.45, 4);
    ctx.lineTo(bodyHalfW * 0.6, 12);
    ctx.moveTo(-bodyHalfW * 0.75, 12);
    ctx.lineTo(bodyHalfW * 0.75, 12);
    ctx.stroke();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-bodyHalfW * 0.85, 0);
    ctx.lineTo(bodyHalfW * 0.85, 0);
    ctx.stroke();

    const bladeHalf = bodyHalfW * (0.35 + 0.14 * Math.abs(Math.cos(this.rotorPhase)));
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 3;
    for (const rx of [-bodyHalfW * 0.72, bodyHalfW * 0.72]) {
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx, -7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rx - bladeHalf, -7);
      ctx.lineTo(rx + bladeHalf, -7);
      ctx.stroke();
    }

    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.roundRect(-10, -6, 20, 11, 4);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Draw a comparison of Previous Attempt (dashed purple, if present),
 * Commanded REF path (dashed gold), and Actual drone path (cyan)
 * on the Result Screen mini-canvas.
 */
export function renderRouteFitPreview(canvas, sim, previousTrail = null) {
  if (!canvas || !sim) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 420;
  const height = rect.height || 200;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const worldW = sim.config.worldWidth;
  const worldH = sim.config.worldHeight;
  const pad = 16;
  const scale = Math.min((width - pad * 2) / worldW, (height - pad * 2) / worldH);
  const offsetX = (width - worldW * scale) * 0.5;
  const groundY = height - pad;

  const toX = (wx) => offsetX + wx * scale;
  const toY = (wz) => groundY - wz * scale;

  // Ground line
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(toX(0), groundY);
  ctx.lineTo(toX(worldW), groundY);
  ctx.stroke();

  // Obstacles silhouette
  if (sim.obstacles?.length) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
    for (const obs of sim.obstacles) {
      ctx.fillRect(toX(obs.x), toY(obs.z + obs.height), obs.width * scale, obs.height * scale);
    }
  }

  // Target / Pad marker
  if (sim.targetZone) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(toX(sim.targetZone.x), toY(sim.targetZone.z), sim.targetZone.radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (sim.landingPad) {
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(
      toX(sim.landingPad.x - sim.landingPad.halfWidth),
      toY(sim.landingPad.topZ) - 2,
      sim.landingPad.halfWidth * 2 * scale,
      4
    );
  }

  // Previous Attempt trail (dashed violet)
  const prevPts = previousTrail || sim.previousTrail;
  if (prevPts?.length > 1) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(toX(prevPts[0].x), toY(prevPts[0].z));
    for (let i = 1; i < prevPts.length; i++) {
      ctx.lineTo(toX(prevPts[i].x), toY(prevPts[i].z));
    }
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.72)';
    ctx.lineWidth = 1.7;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // REF route (dashed gold)
  if (sim.refTrail?.length > 1) {
    ctx.beginPath();
    ctx.setLineDash([5, 4]);
    ctx.moveTo(toX(sim.refTrail[0].x), toY(sim.refTrail[0].z));
    for (let i = 1; i < sim.refTrail.length; i++) {
      ctx.lineTo(toX(sim.refTrail[i].x), toY(sim.refTrail[i].z));
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Actual route (solid cyan)
  if (sim.trail?.length > 1) {
    ctx.beginPath();
    ctx.moveTo(toX(sim.trail[0].x), toY(sim.trail[0].z));
    for (let i = 1; i < sim.trail.length; i++) {
      ctx.lineTo(toX(sim.trail[i].x), toY(sim.trail[i].z));
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw time-series tracking error magnitude and thrust/PID output on the Result Screen.
 */
export function renderTelemetryTimeSeriesPlot(canvas, telemetry = [], maxThrust = 28) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 420;
  const height = rect.height || 170;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  if (!telemetry || telemetry.length < 2) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Not enough flight samples yet', width * 0.5, height * 0.5);
    ctx.restore();
    return;
  }

  const padL = 28;
  const padR = 14;
  const padT = 16;
  const padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const tStart = telemetry[0].t;
  const tEnd = Math.max(tStart + 0.5, telemetry[telemetry.length - 1].t);
  let maxErr = 2.5;
  for (const s of telemetry) {
    const mag = Math.hypot(s.errX ?? 0, s.errZ ?? 0);
    if (mag > maxErr) maxErr = mag;
  }
  maxErr = Math.ceil(maxErr * 1.1);

  const toX = (t) => padL + ((t - tStart) / (tEnd - tStart)) * plotW;
  const toErrY = (e) => padT + plotH - (Math.min(e, maxErr) / maxErr) * plotH;
  const toThrustY = (th) => padT + plotH - (Math.min(th, maxThrust) / maxThrust) * plotH;

  // Grid & axes
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Thrust normalized curve (amber)
  ctx.beginPath();
  ctx.moveTo(toX(telemetry[0].t), toThrustY(telemetry[0].thrust ?? 0));
  for (let i = 1; i < telemetry.length; i++) {
    ctx.lineTo(toX(telemetry[i].t), toThrustY(telemetry[i].thrust ?? 0));
  }
  ctx.strokeStyle = 'rgba(251, 146, 60, 0.75)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Position error curve (cyan)
  ctx.beginPath();
  ctx.moveTo(toX(telemetry[0].t), toErrY(Math.hypot(telemetry[0].errX ?? 0, telemetry[0].errZ ?? 0)));
  for (let i = 1; i < telemetry.length; i++) {
    const s = telemetry[i];
    ctx.lineTo(toX(s.t), toErrY(Math.hypot(s.errX ?? 0, s.errZ ?? 0)));
  }
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.1;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`0 s`, padL, height - 6);
  ctx.textAlign = 'right';
  ctx.fillText(`${tEnd.toFixed(1)} s`, width - padR, height - 6);

  ctx.restore();
}

/**
 * Draw real-time PID response strip on the Flight Screen from actual telemetry samples:
 * Target Position (gold dashed), Actual Position (cyan solid), and Position Error (coral).
 */
export function renderLivePidResponseChart(canvas, telemetry = [], axis = 'z', worldSpan = 14) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 460;
  const height = rect.height || 108;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);

  // Only resize backing store when dimensions actually change (avoids 60fps canvas flicker in Safari/Chrome)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, width, height);

  const series = Array.isArray(telemetry) ? telemetry : [];
  if (series.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Live PID telemetry appears once flight begins', width * 0.5, height * 0.52);
    ctx.restore();
    return;
  }

  const lastT = series[series.length - 1].t;
  const windowSec = 12;
  const tMin = Math.max(0, lastT - windowSec);
  const windowPts = series.filter((s) => s.t >= tMin);
  const pts = windowPts.length >= 2 ? windowPts : series.slice(-2);
  const tStart = pts[0].t;
  const tEnd = Math.max(tStart + 1.0, pts[pts.length - 1].t);

  const padL = 32;
  const padR = 12;
  const padT = 14;
  const padB = 18;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const isX = axis === 'x';
  const maxVal = Math.max(4, worldSpan);
  const toX = (t) => padL + ((t - tStart) / (tEnd - tStart)) * plotW;
  const toPosY = (v) => padT + plotH - (Math.max(0, Math.min(v, maxVal)) / maxVal) * plotH;
  const maxErrScale = Math.max(4, maxVal * 0.45);
  const toErrY = (e) => padT + plotH - (Math.min(Math.abs(e), maxErrScale) / maxErrScale) * (plotH * 0.85);

  // Subtle horizontal guide lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 2; i++) {
    const gy = padT + (plotH * i) / 2;
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
  }
  ctx.stroke();

  // Position Error |REF - Actual| (coral)
  ctx.beginPath();
  ctx.moveTo(toX(pts[0].t), toErrY(isX ? pts[0].errX : pts[0].errZ));
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(toX(pts[i].t), toErrY(isX ? pts[i].errX : pts[i].errZ));
  }
  ctx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Target Position REF (dashed gold)
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.moveTo(toX(pts[0].t), toPosY(isX ? pts[0].refX : pts[0].refZ));
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(toX(pts[i].t), toPosY(isX ? pts[i].refX : pts[i].refZ));
  }
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.setLineDash([]);

  // Actual Drone Position (solid cyan)
  ctx.beginPath();
  ctx.moveTo(toX(pts[0].t), toPosY(isX ? pts[0].x : pts[0].z));
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(toX(pts[i].t), toPosY(isX ? pts[i].x : pts[i].z));
  }
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  const latest = pts[pts.length - 1];
  const targetCur = isX ? latest.refX : latest.refZ;
  const actualCur = isX ? latest.x : latest.z;
  const errCur = isX ? latest.errX : latest.errZ;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 9.5px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${maxVal.toFixed(0)}m`, 4, padT + 6);
  ctx.fillText('0m', 10, padT + plotH);

  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'right';
  ctx.fillText(
    `${isX ? 'X' : 'Z'} REF ${targetCur.toFixed(1)}m · Drone ${actualCur.toFixed(1)}m · Err ${Math.abs(errCur).toFixed(2)}m`,
    width - padR,
    height - 5
  );

  ctx.restore();
}

/**
 * Render a 4-axis Strategy Trade-off Radar (Speed, Stability, Precision, Efficiency)
 * on the Result Screen, comparing mission priority target vs. current & previous runs.
 */
export function renderStrategyRadar(canvas, currentProfile, previousProfile = null, priorities = null) {
  if (!canvas || !currentProfile) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 320;
  const height = rect.height || 180;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.52;
  const maxR = Math.min(width * 0.31, height * 0.36);

  const axes = [
    { key: 'speed', label: 'Speed', angle: -Math.PI / 2 },
    { key: 'precision', label: 'Precision', angle: 0 },
    { key: 'efficiency', label: 'Efficiency', angle: Math.PI / 2 },
    { key: 'stability', label: 'Stability', angle: Math.PI }
  ];

  // Concentric diamond guide rings (33%, 66%, 100%)
  for (const frac of [0.33, 0.66, 1.0]) {
    ctx.beginPath();
    axes.forEach((ax, idx) => {
      const px = cx + Math.cos(ax.angle) * maxR * frac;
      const py = cy + Math.sin(ax.angle) * maxR * frac;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Axis spokes
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  for (const ax of axes) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ax.angle) * maxR, cy + Math.sin(ax.angle) * maxR);
    ctx.stroke();
  }

  const drawPoly = (values, fillStyle, strokeStyle, dashed = false) => {
    ctx.save();
    ctx.beginPath();
    axes.forEach((ax, idx) => {
      const val = Math.max(0, Math.min(100, Number(values?.[ax.key] ?? 0))) / 100;
      const px = cx + Math.cos(ax.angle) * maxR * val;
      const py = cy + Math.sin(ax.angle) * maxR * val;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    if (dashed) ctx.setLineDash([4, 4]);
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  // Mission priority silhouette (dashed gold)
  if (priorities) {
    const prioScaled = {
      speed: (priorities.speed ?? 2) * 32,
      stability: (priorities.stability ?? 2) * 32,
      precision: (priorities.precision ?? 2) * 32,
      efficiency: (priorities.efficiency ?? 2) * 32
    };
    drawPoly(prioScaled, 'rgba(250, 204, 21, 0.08)', 'rgba(250, 204, 21, 0.72)', true);
  }

  // Previous run (dashed violet)
  if (previousProfile) {
    drawPoly(previousProfile, 'rgba(192, 132, 252, 0.1)', 'rgba(192, 132, 252, 0.85)', true);
  }

  // Current run (solid cyan)
  drawPoly(currentProfile, 'rgba(56, 189, 248, 0.24)', '#38bdf8', false);

  // Axis labels + numeric values
  ctx.font = '700 10.5px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  for (const ax of axes) {
    const lx = cx + Math.cos(ax.angle) * (maxR + 18);
    const ly = cy + Math.sin(ax.angle) * (maxR + 14);
    ctx.textAlign = ax.angle === 0 ? 'left' : ax.angle === Math.PI ? 'right' : 'center';
    const val = Math.round(Number(currentProfile[ax.key] ?? 0));
    ctx.fillText(`${ax.label} ${val}`, lx, ly + 3);
  }

  ctx.restore();
}

/**
 * Draw standardized PID Test Bench response curve from real simulation samples:
 * - Reference target line (dashed gold)
 * - Settling tolerance band (soft green)
 * - Previous response curve (dashed violet, only when experimentKey matches)
 * - Current response curve (solid bright cyan)
 */
export function renderTestBenchChart(canvas, currentResult, previousResult = null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 460;
  const height = rect.height || 148;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, width, height);

  if (!currentResult || !Array.isArray(currentResult.samples) || currentResult.samples.length < 2) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const gy = (height * i) / 4;
      ctx.beginPath();
      ctx.moveTo(28, gy);
      ctx.lineTo(width - 14, gy);
      ctx.stroke();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Test PID" to run a real 6.5 s flight response test', width * 0.5, height * 0.52);
    ctx.restore();
    return;
  }

  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const comparablePrev =
    previousResult &&
    previousResult.experimentKey === currentResult.experimentKey &&
    Array.isArray(previousResult.samples) &&
    previousResult.samples.length >= 2
      ? previousResult
      : null;

  const allVals = [currentResult.refVal, currentResult.startVal];
  for (const s of currentResult.samples) allVals.push(s.actual);
  if (comparablePrev) {
    for (const s of comparablePrev.samples) allVals.push(s.actual);
  }

  let yMin = Math.min(...allVals) - 0.6;
  let yMax = Math.max(...allVals) + 0.6;
  if (yMax - yMin < 2.2) {
    const mid = (yMin + yMax) * 0.5;
    yMin = mid - 1.2;
    yMax = mid + 1.2;
  }

  const tMax = Math.max(1, currentResult.duration || 6.5);
  const toX = (t) => padL + (t / tMax) * plotW;
  const toY = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 3; i++) {
    const gy = padT + (plotH * i) / 3;
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
  }
  ctx.stroke();

  // Settling tolerance band around Reference (+/- 0.25 m)
  const bandHalf = currentResult.testType === 'wind' ? 0.25 : 0.22;
  const bandTop = toY(currentResult.refVal + bandHalf);
  const bandBot = toY(currentResult.refVal - bandHalf);
  ctx.fillStyle = 'rgba(34, 197, 94, 0.11)';
  ctx.fillRect(padL, bandTop, plotW, Math.max(2, bandBot - bandTop));

  // Reference Position line (gold dashed)
  const refY = toY(currentResult.refVal);
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([5, 4]);
  ctx.moveTo(padL, refY);
  ctx.lineTo(padL + plotW, refY);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // Previous Response (violet dashed)
  if (comparablePrev) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 4]);
    ctx.moveTo(toX(comparablePrev.samples[0].t), toY(comparablePrev.samples[0].actual));
    for (let i = 1; i < comparablePrev.samples.length; i++) {
      ctx.lineTo(toX(comparablePrev.samples[i].t), toY(comparablePrev.samples[i].actual));
    }
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.78)';
    ctx.lineWidth = 1.9;
    ctx.stroke();
    ctx.restore();
  }

  // Current Response (solid cyan)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(toX(currentResult.samples[0].t), toY(currentResult.samples[0].actual));
  for (let i = 1; i < currentResult.samples.length; i++) {
    ctx.lineTo(toX(currentResult.samples[i].t), toY(currentResult.samples[i].actual));
  }
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  const last = currentResult.samples[currentResult.samples.length - 1];
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(toX(last.t), toY(last.actual), 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Axis Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 9.5px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${yMax.toFixed(1)}m`, padL - 5, padT + 6);
  ctx.fillText(`${yMin.toFixed(1)}m`, padL - 5, padT + plotH);

  ctx.textAlign = 'left';
  ctx.fillText('0 s', padL, height - 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.fillText(`Target ${currentResult.refVal.toFixed(1)} m`, padL + plotW * 0.5, padT - 4);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${tMax.toFixed(1)} s`, width - padR, height - 6);

  ctx.restore();
}
