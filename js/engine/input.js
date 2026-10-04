/**
 * input.js - Keyboard, Mouse (hold-to-move & click-to-interact) & Floating Touch Joystick
 *
 * - PC:
 *   - Hold left mouse button -> player walks toward cursor.
 *   - Click directly on an object, shop, or person -> auto-walks to it and opens interaction (or opens immediately if in range)!
 * - Mobile / Touch:
 *   - Tap directly on any 3D entity or label -> auto-walks to it and opens interaction!
 *   - Touch & drag anywhere on empty ground -> floating joystick appears under the finger.
 * - Keyboard WASD / arrows still work.
 * All directions are camera-relative.
 */

class InputController {
  constructor() {
    this.keys = {};
    this.moveVector = { x: 0, y: 0 };
    this.interactPressed = false;
    this.hotbarTriggered = null; // index 0-7
    this.escapePressed = false;

    // Mouse hold-to-move state
    this.mouseHeld = false;
    this.mousePos = { x: 0, y: 0 };
    this.pointerDownPos = { x: 0, y: 0 };
    this.pointerDownTime = 0;

    // Auto-walk to target entity
    this.autoWalkTarget = null; // { x, y, ent, reach }

    // Floating joystick state
    this.touchActive = false;
    this.touchPointerId = null;
    this.touchStartPos = { x: 0, y: 0 };
    this.joyVector = { x: 0, y: 0 };
    this.maxJoystickRadius = 50;

    this.renderer = null;
    this.player = null;

    this.initKeyboard();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initPointer());
    } else {
      this.initPointer();
    }
  }

  // Called by Game once renderer & player exist
  attach(renderer, player) {
    this.renderer = renderer;
    this.player = player;
  }

  // Target an entity: interact immediately if in range, or auto-walk to it
  targetEntity(entity) {
    if (!entity || !this.player) return;

    const ex = entity.isNpc ? entity.npcRef.x : (entity.x + (entity.w || 48) / 2);
    const ey = entity.isNpc ? entity.npcRef.y : (entity.y + (entity.h || 48) / 2);
    const dist = Math.hypot(this.player.x - ex, this.player.y - ey);
    const REACH = 75;

    if (dist <= REACH) {
      // In range: open interaction immediately!
      this.autoWalkTarget = null;
      if (window.game && window.game.handleEntityInteraction) {
        window.game.handleEntityInteraction(entity);
      }
    } else {
      // Out of range: auto-walk towards entity then open interaction!
      this.autoWalkTarget = { x: ex, y: ey, ent: entity, reach: 68 };
      if (window.game && window.game.showToast) {
        window.game.showToast(`กำลังเดินไปหา [${entity.name || 'เป้าหมาย'}]...`, 'normal');
      }
    }
  }

  cancelAutoWalk() {
    this.autoWalkTarget = null;
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.cancelAutoWalk(); // Manual keyboard input cancels auto-walk

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

    // Stop movement if the window loses focus mid-press
    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouseHeld = false;
      this.cancelAutoWalk();
      this.endJoystick();
    });
  }

  initPointer() {
    const canvas = document.getElementById('game-canvas');
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickKnob = document.getElementById('joystick-knob');
    const touchBtnInteract = document.getElementById('touch-btn-interact');
    if (!canvas) return;

    canvas.style.touchAction = 'none';
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const startTouch = (e) => {
      if (this.touchActive) return;
      this.cancelAutoWalk();
      this.touchActive = true;
      this.touchPointerId = e.pointerId;
      this.touchStartPos = { x: e.clientX, y: e.clientY };
      if (this.joystickZone) {
        const z = this.joystickZone;
        z.classList.add('floating', 'active');
        z.style.left = `${e.clientX - z.offsetWidth / 2}px`;
        z.style.top = `${e.clientY - z.offsetHeight / 2}px`;
      }
      this.moveJoystick(e.clientX, e.clientY);
    };

    canvas.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.pointerDownTime = performance.now();

      if (e.pointerType === 'mouse') {
        if (e.button !== 0) return;
        this.mouseHeld = true;
        this.mousePos = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('walking');
      } else {
        startTouch(e);
      }
    });

    // Default joystick spot can also be grabbed directly
    if (this.joystickZone) {
      this.joystickZone.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') startTouch(e);
      });
    }

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.mousePos = { x: e.clientX, y: e.clientY };
        if (this.mouseHeld) {
          const moveDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
          if (moveDist > 10) {
            this.cancelAutoWalk(); // Dragging manually cancels auto-walk
          }
        }
      } else if (this.touchActive && e.pointerId === this.touchPointerId) {
        this.moveJoystick(e.clientX, e.clientY);
      }
    });

    const end = (e) => {
      if (e.pointerType === 'mouse') {
        const wasHeld = this.mouseHeld;
        this.mouseHeld = false;
        canvas.classList.remove('walking');

        // Check if this was a quick click rather than a sustained drag
        const dragDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
        const duration = performance.now() - this.pointerDownTime;
        if (wasHeld && dragDist < 12 && duration < 380) {
          // It was a direct click on screen: check if an entity was clicked!
          this.checkClickOnEntity(e.clientX, e.clientY);
        }
      } else if (e.pointerId === this.touchPointerId) {
        const dragDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
        const duration = performance.now() - this.pointerDownTime;
        this.endJoystick();

        // Tap on touch without dragging: check if entity was tapped
        if (dragDist < 16 && duration < 350) {
          this.checkClickOnEntity(e.clientX, e.clientY);
        }
      }
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    // Touch interact button (separate pointer -> works while moving)
    if (touchBtnInteract) {
      touchBtnInteract.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.interactPressed = true;
      });
    }
  }

  // Check if click/tap coordinates hit any interactive entity or NPC
  checkClickOnEntity(screenX, screenY) {
    if (!this.renderer || !this.renderer.screenToGround || !window.game || !window.game.world) return;
    const p = this.renderer.screenToGround(screenX, screenY);
    if (!p) return;

    // Check if clicked close to an entity or NPC (radius ~52px)
    const ent = window.game.world.getNearbyEntity(p.x, p.y, 52);
    if (ent) {
      this.targetEntity(ent);
    }
  }

  moveJoystick(clientX, clientY) {
    const dx = clientX - this.touchStartPos.x;
    const dy = clientY - this.touchStartPos.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, this.maxJoystickRadius);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;

    if (this.joystickKnob) {
      this.joystickKnob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
    }

    // Dead-zone of 15% then linear speed
    const mag = clamped / this.maxJoystickRadius;
    const eff = mag < 0.15 ? 0 : (mag - 0.15) / 0.85;
    this.joyVector.x = nx * eff;
    this.joyVector.y = ny * eff;
  }

  endJoystick() {
    this.touchActive = false;
    this.touchPointerId = null;
    this.joyVector.x = 0;
    this.joyVector.y = 0;
    if (this.joystickKnob) this.joystickKnob.style.transform = 'translate(0px, 0px)';
    if (this.joystickZone) {
      this.joystickZone.classList.remove('active', 'floating');
      this.joystickZone.style.left = '';
      this.joystickZone.style.top = '';
    }
  }

  toWorld(dx, dy) {
    if (this.renderer && this.renderer.screenDirToWorld) {
      const v = this.renderer.screenDirToWorld(dx, dy);
      this.moveVector.x = v.x;
      this.moveVector.y = v.y;
    } else {
      this.moveVector.x = dx;
      this.moveVector.y = dy;
    }
    return this.moveVector;
  }

  updateMovement() {
    // 1. Touch joystick has priority
    if (this.touchActive && (Math.abs(this.joyVector.x) > 0.05 || Math.abs(this.joyVector.y) > 0.05)) {
      this.cancelAutoWalk();
      return this.toWorld(this.joyVector.x, this.joyVector.y);
    }

    // 2. Mouse hold: walk toward the ground point under the cursor
    if (this.mouseHeld && this.renderer && this.renderer.screenToGround && this.player) {
      const p = this.renderer.screenToGround(this.mousePos.x, this.mousePos.y);
      if (p) {
        const dx = p.x - this.player.x;
        const dy = p.y - this.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 8) {
          this.moveVector.x = 0;
          this.moveVector.y = 0;
        } else {
          this.cancelAutoWalk();
          const mag = Math.min(1, dist / 40); // ease in when close to cursor
          this.moveVector.x = (dx / dist) * mag;
          this.moveVector.y = (dy / dist) * mag;
        }
        return this.moveVector; // already world space
      }
    }

    // 3. Auto-walk towards targeted entity
    if (this.autoWalkTarget && this.player) {
      const dx = this.autoWalkTarget.x - this.player.x;
      const dy = this.autoWalkTarget.y - this.player.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= this.autoWalkTarget.reach) {
        // Arrived at destination!
        const target = this.autoWalkTarget.ent;
        this.autoWalkTarget = null;
        if (window.game && window.game.handleEntityInteraction) {
          window.game.handleEntityInteraction(target);
        }
        this.moveVector.x = 0;
        this.moveVector.y = 0;
        return this.moveVector;
      } else {
        // Move towards target
        this.moveVector.x = dx / dist;
        this.moveVector.y = dy / dist;
        return this.moveVector;
      }
    }

    // 4. Keyboard
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

    return this.toWorld(dx, dy);
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
