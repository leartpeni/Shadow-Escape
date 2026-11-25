import Phaser from 'phaser';
import { TILE, DEPTH } from '../../config.js';

const GRAVITY = 1800;

/**
 * Base enemy with manual kinematics (tile sampling), so enemies never push the
 * player around and are cheap to simulate. Ground enemies use (x, y) = feet.
 */
export default class Enemy {
  constructor(scene, ctx, def, { texture, frame, w, h, tint, ground = true }) {
    this.scene = scene;
    this.level = ctx.level;
    this.combat = ctx.combat;
    this.fx = ctx.fx;
    this.def = def;
    this.w = w;
    this.h = h;
    this.tint = tint;
    this.ground = ground;
    this.summoned = !!def.summoned;
    this.home = ground ? { x: (def.x + 0.5) * TILE, y: (def.y + 1) * TILE } : { x: (def.x + 0.5) * TILE, y: (def.y + 0.5) * TILE };
    if (def.px !== undefined) this.home = { x: def.px, y: def.py };
    this.sprite = scene.add
      .sprite(this.home.x, this.home.y, texture, frame)
      .setOrigin(0.5, ground ? 1 : 0.5)
      .setTint(tint)
      .setDepth(DEPTH.PLAYER - 1);
    this.rect = new Phaser.Geom.Rectangle();
    this.stompable = true;
    this.reset();
  }

  reset() {
    this.alive = true;
    this.x = this.home.x;
    this.y = this.home.y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.dir = this.def.dir || -1;
    this.state = 'idle';
    this.timer = 0;
    this.sprite.setVisible(true).setAlpha(1).setPosition(this.x, this.y).setScale(1).setAngle(0);
    this.sprite.setTint(this.tint);
    this.updateRect();
  }

  get cx() {
    return this.x;
  }

  get cy() {
    return this.ground ? this.y - this.h / 2 : this.y;
  }

  updateRect() {
    if (this.ground) this.rect.setTo(this.x - this.w / 2, this.y - this.h, this.w, this.h);
    else this.rect.setTo(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
  }

  solid(px, py) {
    return this.level.isSolidAt(px, py);
  }

  /** Gravity + floor snapping. Returns true when landing this frame. */
  applyGravity(dt) {
    const wasGround = this.onGround;
    this.vy = Math.min(this.vy + GRAVITY * dt, 900);
    const ny = this.y + this.vy * dt;
    if (this.vy >= 0 && (this.solid(this.x - this.w / 2 + 2, ny) || this.solid(this.x + this.w / 2 - 2, ny))) {
      this.y = Math.floor(ny / TILE) * TILE;
      this.vy = 0;
      this.onGround = true;
    } else {
      if (this.vy < 0 && this.solid(this.x, ny - this.h)) {
        this.vy = 0;
      } else {
        this.y = ny;
      }
      this.onGround = false;
    }
    if (this.y > this.level.heightPx + 64) this.alive && this.kill(true);
    return this.onGround && !wasGround;
  }

  wallAhead(dir) {
    const fx = this.x + dir * (this.w / 2 + 2);
    return this.solid(fx, this.y - 4) || this.solid(fx, this.y - this.h + 4);
  }

  edgeAhead(dir) {
    return !this.solid(this.x + dir * (this.w / 2 + 2), this.y + 4);
  }

  /** Horizontal move that stops at walls. Returns false when blocked. */
  moveX(dx) {
    const dir = Math.sign(dx);
    if (!dir) return true;
    if (this.wallAhead(dir)) return false;
    this.x += dx;
    return true;
  }

  update(dt, player) {
    if (!this.alive) return;
    this.think(dt, player);
    this.updateRect();
    this.sprite.setPosition(this.x, this.y);
  }

  think() {}

  /** Can a dash coming from the player defeat this enemy? */
  dashKillable() {
    return true;
  }

  /** Does contact with this enemy knock the player back instead of killing them? */
  shields() {
    return false;
  }

  kill(silent = false) {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.setVisible(false);
    if (!silent) this.fx.pop(this.cx, this.cy, this.tint);
  }

  destroy() {
    this.sprite.destroy();
  }
}
