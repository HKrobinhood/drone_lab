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

  render(sim, frameDt = 1 / 60, options = {}) {
    const showGhostDrone = options.showGhostDrone !== false;
    const showTrails = options.showTrails !== false;
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
    if (sim.windMode !== 'calm' || Math.abs(sim.drone.windX) > 0.05 || Math.abs(sim.drone.windZ) > 0.05) {
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

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.save();
  ctx.scale(dpr, dpr);

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
