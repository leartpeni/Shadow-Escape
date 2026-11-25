import Phaser from 'phaser';

const KC = Phaser.Input.Keyboard.KeyCodes;

const BINDINGS = {
  left: [KC.LEFT, KC.A],
  right: [KC.RIGHT, KC.D],
  up: [KC.UP, KC.W],
  down: [KC.DOWN, KC.S],
  jump: [KC.SPACE, KC.Z, KC.K, KC.C],
  dash: [KC.SHIFT, KC.X, KC.J],
  respawn: [KC.R],
};

/**
 * Merges keyboard and touch into a single per-frame action state.
 * Edge-triggered actions (jump/dash pressed) are captured from keydown events so
 * very short taps between frames are never lost.
 */
export default class InputController {
  constructor(scene, getTouch) {
    this.scene = scene;
    this.getTouch = getTouch;
    this.keys = {};
    const kb = scene.input.keyboard;
    for (const [action, codes] of Object.entries(BINDINGS)) {
      this.keys[action] = codes.map((c) => kb.addKey(c, true, false));
    }
    this.queued = { jump: false, dash: false, respawn: false };
    // Start as "held" so a key still down from a previous screen doesn't trigger instantly.
    this.prevHeld = { jump: true, dash: true, respawn: true };
    this.enabled = true;

    this.onKeyDown = (event) => {
      if (event.repeat) return;
      for (const action of Object.keys(this.queued)) {
        if (BINDINGS[action].includes(event.keyCode)) this.queued[action] = true;
      }
    };
    kb.on('keydown', this.onKeyDown);
    scene.events.once('shutdown', () => kb.off('keydown', this.onKeyDown));

    this.state = this.emptyState();
  }

  emptyState() {
    return {
      left: false, right: false, up: false, down: false,
      jumpHeld: false, jumpPressed: false, dashPressed: false, respawnPressed: false,
      x: 0, y: 0,
    };
  }

  held(action) {
    return this.keys[action].some((k) => k.isDown);
  }

  update() {
    const touch = this.getTouch() ? this.getTouch().poll() : null;
    const s = this.state;
    if (!this.enabled) {
      Object.assign(s, this.emptyState());
      this.queued.jump = this.queued.dash = this.queued.respawn = false;
      return s;
    }

    s.left = this.held('left') || !!(touch && touch.left);
    s.right = this.held('right') || !!(touch && touch.right);
    s.up = this.held('up') || !!(touch && touch.up);
    s.down = this.held('down') || !!(touch && touch.down);

    const edge = (action, touchHeld) => {
      const heldNow = this.held(action) || !!touchHeld;
      const pressed = this.queued[action] || (heldNow && !this.prevHeld[action]);
      this.prevHeld[action] = heldNow;
      this.queued[action] = false;
      return { heldNow, pressed };
    };

    const j = edge('jump', touch && touch.jump);
    const d = edge('dash', touch && touch.dash);
    const r = edge('respawn', false);
    s.jumpHeld = j.heldNow;
    s.jumpPressed = j.pressed;
    s.dashPressed = d.pressed;
    s.respawnPressed = r.pressed;
    s.x = (s.right ? 1 : 0) - (s.left ? 1 : 0);
    s.y = (s.down ? 1 : 0) - (s.up ? 1 : 0);
    return s;
  }
}
