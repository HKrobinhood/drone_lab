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

    // Reserve bottom strip for ground visual
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

    // Arena Boundary Outline
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(toPxX(0), toPxY(worldH), worldW * scale, worldH * scale);

    // 3. Wind Indicator Arrows (when active)
    if (sim.windMode !== 'calm') {
      this.#drawWindOverlay(ctx, width, padTop + 14, sim.drone.windX, sim.windMode);
    }

    // 4. Ground & Launch Pad
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, width, groundPx);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, groundY, width, 4);

    // Takeoff Pad at startPos.x
    const padCenterPx = toPxX(sim.startPos.x);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(padCenterPx - 1.1 * scale, groundY - 4, 2.2 * scale, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAUNCH PAD', padCenterPx, groundY + 22);

    // 5. Target Zone (Playground Hover Test)
    this.#drawTargetZone(ctx, sim.targetZone, toPxX, toPxY, scale);

    // 6. Flight Trail
    this.#drawTrail(ctx, sim.trail, toPxX, toPxY);

    // 7. Reference Position Crosshair & Tether
    this.#drawReferenceMarker(ctx, sim.reference, sim.drone, toPxX, toPxY);

    // 8. Drone Body
    if (!sim.paused && sim.started) {
      this.rotorPhase += frameDt * (18 + sim.drone.thrust * 1.4);
    }
    this.#drawDrone(ctx, sim.drone, sim.config, toPxX, toPxY, scale);

    // 9. Pause Overlay
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

  #drawWindOverlay(ctx, canvasW, y, windX, mode) {
    const label = mode === 'gust' ? `GUST WIND (${windX.toFixed(1)} N)` : `STEADY WIND (+${windX.toFixed(1)} N)`;
    ctx.save();
    ctx.fillStyle = 'rgba(251, 146, 60, 0.16)';
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(canvasW - 184, y, 166, 28, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fdba74';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`→ ${label}`, canvasW - 101, y + 18);
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

    // Hold progress arc
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
        ? `HOLD ${zone.holdTimer.toFixed(1)}/${zone.holdRequired.toFixed(0)}s`
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
    // Error tether line between reference target and actual drone position
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(dx, dy);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Target Crosshair
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
    // Positive theta tilts thrust toward +x (clockwise in Canvas)
    ctx.rotate(drone.theta);

    // Thrust Plumes
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

    // Landing Skids
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

    // Main Chassis Bar
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-bodyHalfW * 0.85, 0);
    ctx.lineTo(bodyHalfW * 0.85, 0);
    ctx.stroke();

    // Rotor Masts & Spinning Blades
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

    // Center Flight Controller Hub
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.roundRect(-10, -6, 20, 11, 4);
    ctx.fill();

    // Nose LED Indicator
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
