import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';

const STICK_RADIUS = 60;
const DEADZONE = 0.3;

/**
 * Mobile controls: floating virtual joystick on the left half of the screen,
 * JUMP and DASH buttons on the right. Fully multi-touch; state is polled each frame.
 */
export default class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.mode = 'auto';
    this.stickPointerId = null;
    this.stickOrigin = new Phaser.Math.Vector2(150, GAME_H - 120);
    this.state = { left: false, right: false, up: false, down: false, jump: false, dash: false };

    this.buttons = {
      jump: { x: GAME_W - 95, y: GAME_H - 105, r: 62, label: 'JUMP', color: 0x8c6cf0 },
      dash: { x: GAME_W - 225, y: GAME_H - 70, r: 50, label: 'DASH', color: 0x5fd3ff },
    };

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    this.stickBase = scene.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.08).setStrokeStyle(3, 0xcbb8ff, 0.35);
    this.stickKnob = scene.add.circle(0, 0, 28, 0xcbb8ff, 0.35);
    this.container.add([this.stickBase, this.stickKnob]);
    this.placeStick(this.stickOrigin.x, this.stickOrigin.y);

    for (const [key, b] of Object.entries(this.buttons)) {
      b.circle = scene.add.circle(b.x, b.y, b.r, b.color, 0.18).setStrokeStyle(3, b.color, 0.6);
      b.text = scene.add
        .text(b.x, b.y, b.label, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: key === 'jump' ? '22px' : '18px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setAlpha(0.8);
      this.container.add([b.circle, b.text]);
    }

    scene.input.addPointer(3);
    const show = (pointer) => {
      if (pointer.wasTouch) this.setVisible(true);
    };
    scene.input.on('pointerdown', show);

    // Pointers that went down on a UI button (or while a menu is open) never drive gameplay.
    this.isBlocked = null;
    this.ignored = new Set();
    scene.input.on('pointerdown', (pointer, over) => {
      if ((over && over.length) || (this.isBlocked && this.isBlocked())) this.ignored.add(pointer.id);
    });

    if (scene.sys.game.device.input.touch && navigator.maxTouchPoints > 0) this.setVisible(true);
  }

  setVisible(v) {
    if (this.mode === 'off') v = false;
    else if (this.mode === 'on') v = true;
    this.visible = v;
    this.container.setVisible(v);
  }

  /** 'auto' (show after the first touch), 'on' (always) or 'off' (never). */
  setMode(mode) {
    this.mode = mode || 'auto';
    const touchDevice = this.scene.sys.game.device.input.touch && navigator.maxTouchPoints > 0;
    this.setVisible(this.mode === 'auto' ? this.visible || touchDevice : this.mode === 'on');
  }

  placeStick(x, y) {
    this.stickBase.setPosition(x, y);
    this.stickKnob.setPosition(x, y);
  }

  hitButton(p) {
    for (const [key, b] of Object.entries(this.buttons)) {
      // Generous hit area (1.35x the drawn radius) for comfortable thumbs.
      if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r * 1.35) return key;
    }
    return null;
  }

  poll() {
    const s = this.state;
    s.left = s.right = s.up = s.down = s.jump = s.dash = false;
    if (!this.visible) return s;

    for (const id of this.ignored) {
      const p = this.scene.input.manager.pointers[id];
      if (!p || !p.isDown) this.ignored.delete(id);
    }
    const pointers = this.scene.input.manager.pointers.filter((p) => p && p.isDown && !this.ignored.has(p.id));
    let stickPointer = null;

    for (const p of pointers) {
      if (p.id === this.stickPointerId) {
        stickPointer = p;
        continue;
      }
      const btn = this.hitButton(p);
      if (btn) {
        s[btn] = true;
      } else if (this.stickPointerId === null && p.x < GAME_W * 0.5) {
        this.stickPointerId = p.id;
        this.stickOrigin.set(p.x, p.y);
        stickPointer = p;
      }
    }

    if (!stickPointer) {
      this.stickPointerId = null;
      this.placeStick(150, GAME_H - 120);
      this.stickBase.setAlpha(0.6);
    } else {
      const dx = stickPointer.x - this.stickOrigin.x;
      const dy = stickPointer.y - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, STICK_RADIUS);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;
      this.stickBase.setPosition(this.stickOrigin.x, this.stickOrigin.y).setAlpha(1);
      this.stickKnob.setPosition(this.stickOrigin.x + nx * clamped, this.stickOrigin.y + ny * clamped);
      const mx = (nx * clamped) / STICK_RADIUS;
      const my = (ny * clamped) / STICK_RADIUS;
      s.left = mx < -DEADZONE;
      s.right = mx > DEADZONE;
      s.up = my < -0.5;
      s.down = my > 0.5;
    }

    for (const [key, b] of Object.entries(this.buttons)) {
      b.circle.setFillStyle(b.color, s[key] ? 0.45 : 0.18);
    }
    return s;
  }
}
