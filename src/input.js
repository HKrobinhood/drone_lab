/**
 * Keyboard input handler for WASD flight control, R (Restart), and P (Pause/Resume).
 * Ensures all movement keys are cleared on blur, visibility loss, or pause to prevent stuck keys.
 *
 * Pure JS module (attach/detach browser listeners explicitly).
 */

const MOVEMENT_BINDINGS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right'
};

export class InputController {
  constructor(callbacks = {}) {
    this.onRestart = typeof callbacks.onRestart === 'function' ? callbacks.onRestart : null;
    this.onPauseToggle = typeof callbacks.onPauseToggle === 'function' ? callbacks.onPauseToggle : null;
    this.onMovementPress = typeof callbacks.onMovementPress === 'function' ? callbacks.onMovementPress : null;
    this.isActive = typeof callbacks.isActive === 'function' ? callbacks.isActive : () => true;

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.#boundKeyDown = (e) => this.#onDomKeyDown(e);
    this.#boundKeyUp = (e) => this.#onDomKeyUp(e);
    this.#boundBlur = () => this.clearMovementKeys();
    this.#boundVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        this.clearMovementKeys();
      }
    };
    this.#attachedTargets = null;
  }

  #boundKeyDown;
  #boundKeyUp;
  #boundBlur;
  #boundVisibility;
  #attachedTargets;

  handleKeyDown(code, repeat = false) {
    const dir = MOVEMENT_BINDINGS[code];
    if (dir) {
      const wasPressed = this.keys[dir];
      this.keys[dir] = true;
      if (!wasPressed && this.onMovementPress) {
        this.onMovementPress(dir);
      }
      return true;
    }

    if (repeat) return false;

    if (code === 'KeyR' && this.onRestart) {
      this.onRestart();
      return true;
    }

    if (code === 'KeyP' && this.onPauseToggle) {
      this.onPauseToggle();
      return true;
    }

    return false;
  }

  handleKeyUp(code) {
    const dir = MOVEMENT_BINDINGS[code];
    if (dir) {
      this.keys[dir] = false;
      return true;
    }
    return false;
  }

  clearMovementKeys() {
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;
  }

  getAxes() {
    return {
      moveX: (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0),
      moveZ: (this.keys.up ? 1 : 0) - (this.keys.down ? 1 : 0)
    };
  }

  #shouldIgnoreDomEvent(event) {
    if (!this.isActive()) return true;
    const tag = event?.target?.tagName;
    if (tag === 'INPUT' && event.target.type !== 'range') return true;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return false;
  }

  #onDomKeyDown(event) {
    if (this.#shouldIgnoreDomEvent(event)) return;
    const handled = this.handleKeyDown(event.code, Boolean(event.repeat));
    if (handled && event.preventDefault) {
      event.preventDefault();
    }
  }

  #onDomKeyUp(event) {
    if (MOVEMENT_BINDINGS[event.code]) {
      this.handleKeyUp(event.code);
    }
  }

  attach(win = globalThis.window, doc = globalThis.document) {
    if (this.#attachedTargets || !win || !doc) return;
    win.addEventListener('keydown', this.#boundKeyDown);
    win.addEventListener('keyup', this.#boundKeyUp);
    win.addEventListener('blur', this.#boundBlur);
    doc.addEventListener('visibilitychange', this.#boundVisibility);
    this.#attachedTargets = { win, doc };
  }

  detach() {
    if (!this.#attachedTargets) return;
    const { win, doc } = this.#attachedTargets;
    win.removeEventListener('keydown', this.#boundKeyDown);
    win.removeEventListener('keyup', this.#boundKeyUp);
    win.removeEventListener('blur', this.#boundBlur);
    doc.removeEventListener('visibilitychange', this.#boundVisibility);
    this.#attachedTargets = null;
    this.clearMovementKeys();
  }
}
