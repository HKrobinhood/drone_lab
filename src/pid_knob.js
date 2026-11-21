/**
 * Game-like Rotary PID Knob Control (pure Vanilla JS + SVG, zero libraries).
 *
 * Exports pure math helpers (Node.js testable) plus PidKnobControl DOM widget
 * supporting pointer drag (mouse & touch), mouse wheel, keyboard arrows,
 * +/- step buttons, and exact numeric input—always synchronized to the real
 * PID controller bounds and step resolution.
 */

export const KNOB_MIN_ANGLE = -135;
export const KNOB_MAX_ANGLE = 135;

export function quantizePidValue(value, min, max, step) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : 18;
  const safeStep = Number.isFinite(step) && step > 0 ? step : 0.1;
  const numeric = Number.isFinite(Number(value)) ? Number(value) : safeMin;
  const clamped = Math.max(safeMin, Math.min(safeMax, numeric));
  const steps = Math.round((clamped - safeMin) / safeStep);
  const snapped = safeMin + steps * safeStep;
  const decimals = safeStep < 0.1 ? 2 : 1;
  return Number(Math.max(safeMin, Math.min(safeMax, snapped)).toFixed(decimals));
}

export function valueToKnobAngle(value, min, max) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1;
  const clamped = Math.max(safeMin, Math.min(safeMax, Number(value) || 0));
  const ratio = (clamped - safeMin) / (safeMax - safeMin);
  return KNOB_MIN_ANGLE + ratio * (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE);
}

export function knobAngleToValue(angleDeg, min, max, step) {
  const clampedAngle = Math.max(KNOB_MIN_ANGLE, Math.min(KNOB_MAX_ANGLE, Number(angleDeg) || 0));
  const ratio = (clampedAngle - KNOB_MIN_ANGLE) / (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE);
  const raw = min + ratio * (max - min);
  return quantizePidValue(raw, min, max, step);
}

export function stepPidValue(currentValue, deltaSteps, min, max, step) {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 0.1;
  return quantizePidValue((Number(currentValue) || 0) + deltaSteps * safeStep, min, max, safeStep);
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/**
 * Interactive SVG Rotary Knob bound to an existing container element.
 */
export class PidKnobControl {
  constructor(options) {
    this.param = options.param; // 'kp' | 'ki' | 'kd'
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
    this.decimals = this.step < 0.1 ? 2 : 1;
    this.color = options.color || '#0284c7';
    this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

    this.dialEl = options.dialEl;
    this.arcFillEl = options.arcFillEl;
    this.pointerEl = options.pointerEl;
    this.numberInputEl = options.numberInputEl;
    this.btnMinusEl = options.btnMinusEl;
    this.btnPlusEl = options.btnPlusEl;
    this.valueBadgeEl = options.valueBadgeEl;
    this.cardEl = options.cardEl;

    this.value = this.min;
    this.dragging = false;
    this.dragStartY = 0;
    this.dragStartX = 0;
    this.dragStartVal = this.min;
    this.pulseTimer = null;

    this.#initStaticTrack();
    this.#bindEvents();
    this.setValue(this.min, false);
  }

  #initStaticTrack() {
    if (!this.dialEl) return;
    const trackEl = this.dialEl.querySelector('.knob-arc-track');
    if (trackEl) {
      trackEl.setAttribute('d', describeArc(50, 50, 38, KNOB_MIN_ANGLE, KNOB_MAX_ANGLE));
    }
    const ticksHost = this.dialEl.querySelector('.knob-ticks');
    if (ticksHost && !ticksHost.childElementCount) {
      const tickCount = 11;
      let html = '';
      for (let i = 0; i < tickCount; i++) {
        const ang = KNOB_MIN_ANGLE + (i / (tickCount - 1)) * (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE);
        const outer = polarToCartesian(50, 50, 46, ang);
        const inner = polarToCartesian(50, 50, i % 5 === 0 ? 41.5 : 43, ang);
        html += `<line x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" class="knob-tick ${i % 5 === 0 ? 'is-major' : ''}" />`;
      }
      ticksHost.innerHTML = html;
    }
  }

  #bindEvents() {
    if (this.dialEl) {
      this.dialEl.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        this.dragging = true;
        this.dragStartY = e.clientY;
        this.dragStartX = e.clientX;
        this.dragStartVal = this.value;
        this.dialEl.classList.add('is-dragging');
        this.dialEl.focus();
        try {
          this.dialEl.setPointerCapture(e.pointerId);
        } catch {}
      });

      this.dialEl.addEventListener('pointermove', (e) => {
        if (!this.dragging) return;
        e.preventDefault();
        // Comfortable vertical + horizontal drag mapping (150px spans full range)
        const dy = this.dragStartY - e.clientY;
        const dx = (e.clientX - this.dragStartX) * 0.55;
        const deltaFrac = (dy + dx) / 150;
        const next = quantizePidValue(
          this.dragStartVal + deltaFrac * (this.max - this.min),
          this.min,
          this.max,
          this.step
        );
        if (next !== this.value) {
          this.#emitChange(next);
        }
      });

      const endDrag = (e) => {
        if (!this.dragging) return;
        this.dragging = false;
        this.dialEl.classList.remove('is-dragging');
        try {
          this.dialEl.releasePointerCapture(e.pointerId);
        } catch {}
      };
      this.dialEl.addEventListener('pointerup', endDrag);
      this.dialEl.addEventListener('pointercancel', endDrag);

      this.dialEl.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          const dir = e.deltaY < 0 ? 1 : -1;
          const mult = e.shiftKey ? 5 : 2;
          const next = stepPidValue(this.value, dir * mult, this.min, this.max, this.step);
          if (next !== this.value) this.#emitChange(next);
        },
        { passive: false }
      );

      this.dialEl.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          next = stepPidValue(this.value, e.shiftKey ? 5 : 1, this.min, this.max, this.step);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          next = stepPidValue(this.value, e.shiftKey ? -5 : -1, this.min, this.max, this.step);
        } else if (e.key === 'PageUp') {
          next = stepPidValue(this.value, 5, this.min, this.max, this.step);
        } else if (e.key === 'PageDown') {
          next = stepPidValue(this.value, -5, this.min, this.max, this.step);
        } else if (e.key === 'Home') {
          next = this.min;
        } else if (e.key === 'End') {
          next = this.max;
        }
        if (next !== null) {
          e.preventDefault();
          if (next !== this.value) this.#emitChange(next);
        }
      });
    }

    if (this.btnMinusEl) {
      this.btnMinusEl.addEventListener('click', () => {
        const deltaSteps = this.param === 'ki' ? -2 : -5; // Friendly 0.5 for Kp/Kd, 0.10 for Ki
        const next = stepPidValue(this.value, deltaSteps, this.min, this.max, this.step);
        this.#emitChange(next);
      });
    }

    if (this.btnPlusEl) {
      this.btnPlusEl.addEventListener('click', () => {
        const deltaSteps = this.param === 'ki' ? 2 : 5;
        const next = stepPidValue(this.value, deltaSteps, this.min, this.max, this.step);
        this.#emitChange(next);
      });
    }

    if (this.numberInputEl) {
      this.numberInputEl.min = String(this.min);
      this.numberInputEl.max = String(this.max);
      this.numberInputEl.step = String(this.step);

      const commitInput = () => {
        const parsed = parseFloat(this.numberInputEl.value);
        const next = Number.isFinite(parsed)
          ? quantizePidValue(parsed, this.min, this.max, this.step)
          : this.value;
        this.numberInputEl.value = next.toFixed(this.decimals);
        if (next !== this.value) {
          this.#emitChange(next);
        }
      };
      this.numberInputEl.addEventListener('change', commitInput);
      this.numberInputEl.addEventListener('blur', commitInput);
      this.numberInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitInput();
          this.numberInputEl.blur();
        }
      });
    }
  }

  #emitChange(nextVal) {
    this.setValue(nextVal, true);
    this.onChange(this.param, this.value);
  }

  setValue(nextVal, triggerPulse = false) {
    this.value = quantizePidValue(nextVal, this.min, this.max, this.step);
    const angle = valueToKnobAngle(this.value, this.min, this.max);

    if (this.pointerEl) {
      this.pointerEl.setAttribute('transform', `rotate(${angle.toFixed(1)} 50 50)`);
    }
    if (this.arcFillEl) {
      if (angle <= KNOB_MIN_ANGLE + 0.5) {
        this.arcFillEl.setAttribute('d', '');
      } else {
        this.arcFillEl.setAttribute('d', describeArc(50, 50, 38, KNOB_MIN_ANGLE, angle));
      }
    }
    if (this.dialEl) {
      this.dialEl.setAttribute('aria-valuenow', this.value.toFixed(this.decimals));
      this.dialEl.setAttribute('aria-valuemin', String(this.min));
      this.dialEl.setAttribute('aria-valuemax', String(this.max));
    }
    if (this.numberInputEl && document.activeElement !== this.numberInputEl) {
      this.numberInputEl.value = this.value.toFixed(this.decimals);
    }
    if (this.valueBadgeEl) {
      this.valueBadgeEl.textContent = this.value.toFixed(this.decimals);
    }
    if (triggerPulse && this.cardEl) {
      this.cardEl.classList.add('is-adjusting');
      clearTimeout(this.pulseTimer);
      this.pulseTimer = setTimeout(() => {
        this.cardEl?.classList.remove('is-adjusting');
      }, 220);
    }
  }
}
