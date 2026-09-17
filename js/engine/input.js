/**
 * input.js - Keyboard, Mouse & Touch Virtual Joystick Input Controller
 */

class InputController {
  constructor() {
    this.keys = {};
    this.moveVector = { x: 0, y: 0 };
    this.interactPressed = false;
    this.hotbarTriggered = null; // index 0-7
    this.escapePressed = false;

    // Virtual Joystick State
    this.touchActive = false;
    this.touchStartPos = { x: 0, y: 0 };
    this.touchCurrentPos = { x: 0, y: 0 };
    this.maxJoystickRadius = 35;

    this.initKeyboard();
    this.initTouch();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Interaction key
      if (e.code === 'KeyE') {
        this.interactPressed = true;
      }

      // Hotbar 1-8
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 8) {
          this.hotbarTriggered = digit - 1;
        }
      }

      // Escape
      if (e.code === 'Escape') {
        this.escapePressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') {
        this.interactPressed = false;
      }
      if (e.code === 'Escape') {
        this.escapePressed = false;
      }
    });
  }

  initTouch() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const touchBtnInteract = document.getElementById('touch-btn-interact');

    if (!joystickZone || !joystickKnob) return;

    const handleStart = (clientX, clientY) => {
      this.touchActive = true;
      const rect = joystickZone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      this.touchStartPos = { x: centerX, y: centerY };
      this.handleMove(clientX, clientY);
    };

    const handleMove = (clientX, clientY) => {
      if (!this.touchActive) return;
      const dx = clientX - this.touchStartPos.x;
      const dy = clientY - this.touchStartPos.y;
      const dist = Math.hypot(dx, dy);

      let normX = 0;
      let normY = 0;

      if (dist > 0) {
        normX = dx / dist;
        normY = dy / dist;
      }

      const clampedDist = Math.min(dist, this.maxJoystickRadius);
      const knobX = normX * clampedDist;
      const knobY = normY * clampedDist;

      joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

      // Set movement vector
      const magnitude = clampedDist / this.maxJoystickRadius;
      this.moveVector.x = normX * magnitude;
      this.moveVector.y = normY * magnitude;
    };

    const handleEnd = () => {
      this.touchActive = false;
      joystickKnob.style.transform = 'translate(0px, 0px)';
      this.moveVector.x = 0;
      this.moveVector.y = 0;
    };

    // Touch events on joystick zone
    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!this.touchActive) return;
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      handleEnd();
    });

    window.addEventListener('touchcancel', () => {
      handleEnd();
    });

    // Touch interact button
    if (touchBtnInteract) {
      touchBtnInteract.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.interactPressed = true;
      }, { passive: false });

      touchBtnInteract.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.interactPressed = false;
      });
    }
  }

  updateMovement() {
    // If joystick is active, it takes priority
    if (this.touchActive && (Math.abs(this.moveVector.x) > 0.05 || Math.abs(this.moveVector.y) > 0.05)) {
      return this.moveVector;
    }

    let dx = 0;
    let dy = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    this.moveVector.x = dx;
    this.moveVector.y = dy;
    return this.moveVector;
  }

  consumeInteract() {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }

  consumeHotbarTrigger() {
    const val = this.hotbarTriggered;
    this.hotbarTriggered = null;
    return val;
  }

  consumeEscape() {
    if (this.escapePressed) {
      this.escapePressed = false;
      return true;
    }
    return false;
  }
}

window.inputController = new InputController();
