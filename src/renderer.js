/**
 * Canvas 2D side-view renderer for Drone Lab — PID Flight Challenge.
 * Converts SI world coordinates (meters) to responsive HiDPI Canvas pixels.
 */

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

  render(sim, frameDt = 1 / 60) {
    const dims = this.resizeIfNeeded();
    if (!dims || !this.ctx) return;

    const { width, height, dpr } = dims;
    const ctx = this.ctx;
    const worldW = sim.config.worldWidth;
    const worldH = sim.config.worldHeight;

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

    // 1. Sky Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, groundY);

    // 2. Metric Grid (every 2m)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
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
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
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

    // 3. Wind Indicator Overlay
    if (sim.windMode !== 'calm') {
      this.#drawWindOverlay(ctx, width, padTop + 14, sim.drone.windX, sim.drone.windZ, sim.windMode);
    }

    // 4. Obstacles
    if (sim.obstacles?.length) {
      this.#drawObstacles(ctx, sim.obstacles, toPxX, toPxY, scale);
    }

    // 5. Ground & Launch Pad
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, width, groundPx);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, groundY, width, 4);

    const padCenterPx = toPxX(sim.startPos.x);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(padCenterPx - 1.0 * scale, groundY - 4, 2.0 * scale, 6);
    ctx.fillStyle = '#94a3b8';
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

    // 9. Flight Trail
    this.#drawTrail(ctx, sim.trail, toPxX, toPxY);

    // 10. Reference Position Crosshair & Tether
    this.#drawReferenceMarker(ctx, sim.reference, sim.drone, toPxX, toPxY);

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

  #drawWindOverlay(ctx, canvasW, y, windX, windZ, mode) {
    const isGusting = (mode === 'challenge_gust' || mode === 'gust') && windX > 4.5;
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

  #drawReferenceMarker(ctx, ref, drone, toPxX, toPxY) {
    const rx = toPxX(ref.x);
    const ry = toPxY(ref.z);
    const dx = toPxX(drone.x);
    const dy = toPxY(drone.z);

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(dx, dy);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, ry, 9, 0, Math.PI * 2);
    ctx.moveTo(rx - 14, ry);
    ctx.lineTo(rx + 14, ry);
    ctx.moveTo(rx, ry - 14);
    ctx.lineTo(rx, ry + 14);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('REF', rx + 13, ry - 8);
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
