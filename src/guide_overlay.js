import { renderPipRobotSvg, getStemVisualAid, renderInteractiveVisualAidHtml, bindVisualAidInteractions } from './visual_aids.js';

/**
 * Non-blocking Spotlight & Floating Step Card Overlay for Tutorial Village.
 *
 * Design guarantees:
 * - Never relies on hardcoded screen coordinates; dynamically tracks DOM rects via getBoundingClientRect()
 * - Auto-updates on window resize, scroll, and ResizeObserver changes
 * - Backdrop/spotlight ring use pointer-events: none so target sliders, buttons, and Canvas are NEVER blocked
 * - Displays PIP expression avatar, short dialogue, contextual SVG visual aid, and collapsible Learn More
 * - Cleans up cleanly when switching views or modes
 */

export class TutorialSpotlightOverlay {
  constructor(options = {}) {
    this.onBack = typeof options.onBack === 'function' ? options.onBack : () => {};
    this.onNext = typeof options.onNext === 'function' ? options.onNext : () => {};
    this.onDismiss = typeof options.onDismiss === 'function' ? options.onDismiss : () => {};

    this.root = document.getElementById('tutorial-spotlight-layer');
    this.maskTop = document.getElementById('tut-mask-top');
    this.maskBottom = document.getElementById('tut-mask-bottom');
    this.maskLeft = document.getElementById('tut-mask-left');
    this.maskRight = document.getElementById('tut-mask-right');
    this.frame = document.getElementById('tut-spotlight-frame');
    this.card = document.getElementById('tut-guide-card');
    this.avatarEl = document.getElementById('tut-guide-avatar');
    this.stepPill = document.getElementById('tut-step-pill');
    this.titleEl = document.getElementById('tut-step-title');
    this.bodyEl = document.getElementById('tut-step-body');
    this.visualSlot = document.getElementById('tut-visual-slot');
    this.learnMoreDetails = document.getElementById('tut-learn-more');
    this.learnMoreText = document.getElementById('tut-learn-more-text');
    this.hintEl = document.getElementById('tut-step-hint');
    this.wasdChips = document.getElementById('tut-wasd-chips');
    this.btnBack = document.getElementById('btn-tut-back');
    this.btnNext = document.getElementById('btn-tut-next');
    this.btnSkip = document.getElementById('btn-tut-skip');

    this.activeTarget = null;
    this.lastStepId = null;
    this.resizeObserver = null;

    this.#bindEvents();
  }

  #bindEvents() {
    this.btnBack?.addEventListener('click', () => this.onBack());
    this.btnNext?.addEventListener('click', () => this.onNext());
    this.btnSkip?.addEventListener('click', () => this.onDismiss());
    this.learnMoreDetails?.addEventListener('toggle', () => this.reposition());

    window.addEventListener('resize', () => this.reposition());
    window.addEventListener('scroll', () => this.reposition(), true);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.reposition());
    }
  }

  hide() {
    if (!this.root) return;
    this.root.classList.add('hidden');
    if (this.activeTarget) {
      this.activeTarget.classList.remove('tutorial-target-active', 'tutorial-action-pulse');
      this.resizeObserver?.unobserve(this.activeTarget);
      this.activeTarget = null;
    }
    this.lastStepId = null;
  }

  render(step, progressInfo, safetyWarning = null) {
    if (!this.root || !step) {
      this.hide();
      return;
    }

    const targetEl = document.querySelector(step.targetSelector);
    if (!targetEl) {
      this.hide();
      return;
    }

    if (this.activeTarget && this.activeTarget !== targetEl) {
      this.activeTarget.classList.remove('tutorial-target-active', 'tutorial-action-pulse');
      this.resizeObserver?.unobserve(this.activeTarget);
    }

    this.activeTarget = targetEl;
    this.activeTarget.classList.add('tutorial-target-active');
    const shouldPulse =
      Boolean(step.focusParam) ||
      step.requiredAction === 'tune_pid_valid' ||
      step.requiredAction === 'tune_kp_ready' ||
      step.requiredAction === 'tune_ki_ready' ||
      step.requiredAction === 'run_test_pid' ||
      step.requiredAction === 'start_flight';
    this.activeTarget.classList.toggle('tutorial-action-pulse', shouldPulse);
    this.resizeObserver?.observe(this.activeTarget);
    this.root.classList.remove('hidden');

    const stepChanged = this.lastStepId !== step.stepId;
    this.lastStepId = step.stepId;

    this.stepPill.textContent = `Step ${progressInfo.current} / ${progressInfo.total}`;
    this.titleEl.textContent = step.title;
    this.bodyEl.textContent = step.instruction;

    if (this.avatarEl) {
      const mood = safetyWarning ? 'warning' : (step.pipMood || 'explaining');
      this.avatarEl.innerHTML = renderPipRobotSvg(mood, 'pip-avatar-mini');
    }

    if (this.visualSlot) {
      const aid = step.visualId ? getStemVisualAid(step.visualId) : null;
      if (aid) {
        this.visualSlot.classList.remove('hidden');
        if (stepChanged || !this.visualSlot.innerHTML) {
          this.visualSlot.innerHTML = renderInteractiveVisualAidHtml(step.visualId);
          bindVisualAidInteractions(this.visualSlot);
        }
      } else {
        this.visualSlot.classList.add('hidden');
        this.visualSlot.innerHTML = '';
      }
    }

    if (this.learnMoreDetails && this.learnMoreText) {
      if (step.learnMore) {
        this.learnMoreDetails.classList.remove('hidden');
        this.learnMoreText.textContent = step.learnMore;
        if (stepChanged) this.learnMoreDetails.open = false;
      } else {
        this.learnMoreDetails.classList.add('hidden');
      }
    }

    if (step.requiredAction === 'wasd_sequence' && step.wasdSubsteps) {
      this.wasdChips.classList.remove('hidden');
      this.wasdChips.innerHTML = '';
      step.wasdSubsteps.forEach((sub, idx) => {
        const chip = document.createElement('span');
        const done = Boolean(step.wasdDone?.[sub.key]);
        const current = idx === step.wasdSubIndex;
        chip.className = `tut-chip ${done ? 'is-done' : current ? 'is-current' : ''}`;
        chip.textContent = `${done ? '✓ ' : ''}${sub.label}`;
        this.wasdChips.appendChild(chip);
      });
      this.hintEl.textContent = step.activeSubPrompt || step.actionHint;
      this.hintEl.classList.remove('is-ready');
    } else {
      this.wasdChips.classList.add('hidden');
      this.hintEl.textContent = safetyWarning || step.statusFeedback || step.actionHint;
      this.hintEl.classList.toggle('is-ready', Boolean(step.satisfied && step.requiredAction !== 'acknowledge'));
    }

    this.btnBack.disabled = !progressInfo.canBack;

    // Tutorial 1 never displays Hide Guide; Tutorial 2+ allow hiding the guide anytime
    const canSkip = Boolean(progressInfo.canSkip);
    if (this.btnSkip) {
      this.btnSkip.disabled = !canSkip;
      this.btnSkip.classList.toggle('hidden', !canSkip);
      this.btnSkip.setAttribute('aria-hidden', String(!canSkip));
    }

    // Always keep Next Step visible so players see continuous progression—locked until action is done, highlighted once unlocked!
    this.btnNext.classList.remove('hidden');
    if (step.requiredAction === 'acknowledge') {
      this.btnNext.disabled = false;
      this.btnNext.classList.remove('is-locked-step', 'is-unlocked-ready');
      this.btnNext.textContent =
        progressInfo.total === 1
          ? 'Got It'
          : progressInfo.current === progressInfo.total
            ? 'Finish Guide'
            : 'Next Step →';
    } else if (step.requiredAction === 'start_flight') {
      this.btnNext.classList.add('hidden');
      this.btnNext.disabled = true;
    } else if (step.requiredAction === 'reach_target') {
      this.btnNext.disabled = !progressInfo.canNext;
      this.btnNext.classList.toggle('is-locked-step', !progressInfo.canNext);
      this.btnNext.classList.toggle('is-unlocked-ready', Boolean(progressInfo.canNext));
      this.btnNext.textContent = progressInfo.canNext ? 'Next Step →' : 'Hover In Target';
    } else {
      this.btnNext.disabled = !progressInfo.canNext;
      this.btnNext.classList.toggle('is-locked-step', !progressInfo.canNext);
      this.btnNext.classList.toggle('is-unlocked-ready', Boolean(progressInfo.canNext));
      this.btnNext.textContent = progressInfo.canNext ? 'Next Step →' : 'Complete Action';
    }

    if (stepChanged && typeof targetEl.scrollIntoView === 'function') {
      targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }

    this.reposition();
  }

  reposition() {
    if (!this.root || this.root.classList.contains('hidden') || !this.activeTarget) return;

    const rect = this.activeTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rawTop = rect.top - pad;
    const rawLeft = rect.left - pad;
    const rawWidth = rect.width + pad * 2;
    const rawHeight = rect.height + pad * 2;

    const top = Math.max(0, Math.min(vh, rawTop));
    const left = Math.max(0, Math.min(vw, rawLeft));
    const right = Math.max(left, Math.min(vw, rawLeft + rawWidth));
    const bottom = Math.max(top, Math.min(vh, rawTop + rawHeight));
    const maskHeight = Math.max(0, bottom - top);

    this.maskTop.style.cssText = `top:0;left:0;width:${vw}px;height:${top}px;`;
    this.maskBottom.style.cssText = `top:${bottom}px;left:0;width:${vw}px;height:${Math.max(0, vh - bottom)}px;`;
    this.maskLeft.style.cssText = `top:${top}px;left:0;width:${left}px;height:${maskHeight}px;`;
    this.maskRight.style.cssText = `top:${top}px;left:${right}px;width:${Math.max(0, vw - right)}px;height:${maskHeight}px;`;

    this.frame.style.cssText = `top:${rawTop}px;left:${rawLeft}px;width:${rawWidth}px;height:${rawHeight}px;`;

    // Position the floating guide card cleanly without obscuring the highlighted element or clipping viewport edges
    const cardRect = this.card.getBoundingClientRect();
    const cardW = Math.min(Math.max(cardRect.width || 380, 380), vw - 24);
    const cardH = cardRect.height || 200;
    const gap = 14;

    let cardTop;
    let cardLeft;

    if (bottom + gap + cardH <= vh - 12) {
      cardTop = bottom + gap;
      cardLeft = Math.min(Math.max(12, left), vw - cardW - 12);
    } else if (top - gap - cardH >= 12) {
      cardTop = top - gap - cardH;
      cardLeft = Math.min(Math.max(12, left), vw - cardW - 12);
    } else if (right + gap + cardW <= vw - 12) {
      cardLeft = right + gap;
      cardTop = Math.min(Math.max(12, top), vh - cardH - 12);
    } else if (left - gap - cardW >= 12) {
      cardLeft = left - gap - cardW;
      cardTop = Math.min(Math.max(12, top), vh - cardH - 12);
    } else {
      // Fallback: pin bottom-right corner when target spans most of viewport (e.g. flight canvas)
      cardTop = Math.max(12, vh - cardH - 16);
      cardLeft = Math.max(12, vw - cardW - 16);
    }

    this.card.style.top = `${Math.round(cardTop)}px`;
    this.card.style.left = `${Math.round(cardLeft)}px`;
  }
}
