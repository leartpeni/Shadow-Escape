import Phaser from 'phaser';
import { TILE, DEPTH } from '../config.js';
import { PathMover, cycleState } from './Hazards.js';

const H = 16;

/** Creates an immovable, one-way (top-only) arcade body. */
function oneWayBody(scene, obj) {
  scene.physics.add.existing(obj);
  const body = obj.body;
  body.setAllowGravity(false);
  body.setImmovable(true);
  body.friction.set(0, 0);
  body.checkCollision.down = false;
  body.checkCollision.left = false;
  body.checkCollision.right = false;
  return body;
}

/**
 * All platforms share { body, solid, collider-object (obj), update(t, dt), step(tNext, delta), reset() }.
 * `solid === false` means the player falls through (vanished/crumbled).
 */
export class MovingPlatform {
  constructor(scene, d) {
    const w = d.w * TILE;
    this.mover = new PathMover({ x: d.x * TILE, y: d.y * TILE }, { x: d.toX * TILE, y: d.toY * TILE }, d.period, d.phase);
    const p = this.mover.at(0);
    this.obj = scene.add.image(p.x + w / 2, p.y + H / 2, 'platform').setDepth(DEPTH.PLATFORMS).setDisplaySize(w, H);
    // Arcane underglow that travels with the platform.
    this.glow = scene.add
      .image(this.obj.x, this.obj.y + 10, 'glow')
      .setTint(0x8c6cf0)
      .setAlpha(0.4)
      .setDisplaySize(w * 1.5, 34)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.PLATFORMS - 0.5);
    this.body = oneWayBody(scene, this.obj);
    this.obj.platform = this;
    this.solid = true;
    this.seed = d.x * 1.3 + d.y;
  }

  step(tNext, delta) {
    const target = this.mover.at(tNext);
    // Velocity that lands the body exactly on its path at the end of this step.
    this.body.velocity.set((target.x - this.body.x) / delta, (target.y - this.body.y) / delta);
  }

  update(t) {
    this.glow.setPosition(this.obj.x, this.obj.y + 10);
    this.glow.setAlpha(0.32 + 0.1 * Math.sin(t * 3 + this.seed));
  }

  reset() {}
}

/** Static platform built from per-tile images so it can flash, shake or break apart. */
class TiledPlatform {
  constructor(scene, d, texture) {
    this.scene = scene;
    this.x = d.x * TILE;
    this.y = d.y * TILE;
    this.w = d.w * TILE;
    this.tiles = [];
    for (let i = 0; i < d.w; i++) {
      this.tiles.push(scene.add.image(this.x + i * TILE + TILE / 2, this.y, texture).setOrigin(0.5, 0).setDepth(DEPTH.PLATFORMS));
    }
    this.obj = scene.add.zone(this.x + this.w / 2, this.y + H / 2, this.w, H);
    this.body = oneWayBody(scene, this.obj);
    this.obj.platform = this;
    this.solid = true;
  }

  step() {}

  setAlpha(a) {
    this.tiles.forEach((t) => t.setAlpha(a));
  }
}

export class VanishPlatform extends TiledPlatform {
  constructor(scene, d) {
    super(scene, d, 'vanish');
    this.d = d;
    this.glow = scene.add
      .image(this.x + this.w / 2, this.y + 8, 'glow')
      .setTint(0x5fd3ff)
      .setAlpha(0.3)
      .setDisplaySize(this.w * 1.4, 30)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.PLATFORMS - 0.5);
  }

  setAlpha(a) {
    super.setAlpha(a);
    if (this.glow) this.glow.setAlpha(a * 0.3);
  }

  update(t) {
    const d = this.d;
    const st = cycleState(t, d.on, d.off, d.phase, 0.5);
    this.solid = st.on;
    if (st.on) {
      // Flicker during the last 0.45s before disappearing.
      const left = (1 - st.k) * d.on;
      const blink = left < 0.45 ? (Math.floor(left * 16) % 2 ? 0.35 : 1) : 1;
      this.setAlpha(blink);
    } else {
      this.setAlpha(st.warn ? 0.25 : 0.08);
    }
  }

  reset() {}
}

export class CrumblePlatform extends TiledPlatform {
  constructor(scene, d, fx) {
    super(scene, d, 'crumble');
    this.d = d;
    this.fx = fx;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.solid = true;
    this.tiles.forEach((tile, i) => tile.setPosition(this.x + i * TILE + TILE / 2, this.y).setAlpha(1).setVisible(true).setAngle(0));
  }

  /** Called by the scene when the player is standing on it. */
  trigger() {
    if (this.state !== 'idle') return;
    this.state = 'shake';
    this.timer = this.d.delay;
  }

  update(t, dt) {
    if (this.state === 'shake') {
      this.timer -= dt;
      this.tiles.forEach((tile, i) => tile.setPosition(this.x + i * TILE + TILE / 2 + (Math.random() - 0.5) * 3, this.y + (Math.random() - 0.5) * 2));
      if (this.timer <= 0) {
        this.state = 'gone';
        this.timer = this.d.respawn;
        this.solid = false;
        this.tiles.forEach((tile) => {
          this.fx.rubble(tile.x, this.y + 8, 5);
          tile.setVisible(false);
        });
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.reset();
        this.tiles.forEach((tile) => {
          tile.setAlpha(0);
          this.scene.tweens.add({ targets: tile, alpha: 1, duration: 250 });
        });
      }
    }
  }
}
