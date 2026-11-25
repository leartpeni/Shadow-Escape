import Phaser from 'phaser';
import { TILE, DEPTH } from '../../config.js';

const Rect = Phaser.Geom.Rectangle;
export const BOSS_GRAVITY = 1800;

/**
 * Base class for bosses.
 *
 * Behaviour is written as generator coroutines: `yield 0.5` waits half a second,
 * a bare `yield` waits one frame, `yield* this.moveTo(...)` tweens. `*pattern(phase)`
 * is restarted whenever it finishes, the phase changes, or the boss is hit.
 *
 * Phases are derived from HP (3 phases). On player death the boss resets to the
 * start of its current phase, so progress through phases is kept.
 *
 * Subclasses set: this.sprite, this.body (Rect: lethal contact), this.hurt (Rect: weak spot,
 * only used while this.vulnerable), and implement *pattern(phase), place(), syncVisual(dt).
 */
export default class Boss {
  constructor(scene, ctx, arena, { name, hp = 6, tint = 0xffffff }) {
    this.scene = scene;
    this.ctx = ctx;
    this.level = ctx.level;
    this.combat = ctx.combat;
    this.fx = ctx.fx;
    this.enemies = ctx.enemies;
    this.name = name;
    this.maxHp = hp;
    this.hp = hp;
    this.tint = tint;
    this.arena = {
      ...arena,
      left: arena.x0 * TILE,
      right: (arena.x1 + 1) * TILE,
      floorY: arena.floor * TILE,
      ceilY: arena.ceiling * TILE,
    };
    this.arena.cx = (this.arena.left + this.arena.right) / 2;
    this.arena.width = this.arena.right - this.arena.left;
    this.body = new Rect();
    this.hurt = new Rect();
    this.state = 'dormant';
    this.vulnerable = false;
    this.contactLethal = true;
    this.invuln = 0;
    this.flash = 0;
    this.phaseStartHp = hp;
    this.co = null;
    this.waitT = 0;
    this.dt = 0;
  }

  get phase() {
    const k = this.hp / this.maxHp;
    if (k > 2 / 3) return 1;
    if (k > 1 / 3) return 2;
    return 3;
  }

  /** HP value at which the given phase begins. */
  phaseHp(phase) {
    return phase === 1 ? this.maxHp : phase === 2 ? Math.floor((this.maxHp * 2) / 3) : Math.floor(this.maxHp / 3);
  }

  // ------------------------------------------------------------ lifecycle
  start() {
    this.state = 'fight';
    this.co = this.intro();
    this.waitT = 0;
  }

  /** Back to the start of the current phase, dormant until the player re-enters. */
  reset() {
    this.hp = this.phaseHp(this.phase);
    this.state = 'dormant';
    this.vulnerable = false;
    this.contactLethal = true;
    this.invuln = 0;
    this.flash = 0;
    this.co = null;
    this.waitT = 0;
    this.place();
  }

  *intro() {
    yield 0.8;
  }

  *pattern() {
    yield 1;
  }

  /** Coroutine played after a successful hit (default: brief recovery). */
  *onHit() {
    this.vulnerable = false;
    yield 0.7;
  }

  *phaseChange(phase) {
    this.vulnerable = false;
    this.contactLethal = false;
    this.scene.cameras.main.shake(400, 0.01);
    this.fx.pop(this.body.centerX, this.body.centerY, this.tint, 40);
    this.scene.events.emit('boss-phase', { phase });
    yield* this.onHit();
    this.contactLethal = true;
    yield 0.4;
  }

  *death() {
    this.vulnerable = false;
    this.contactLethal = false;
    for (let i = 0; i < 6; i++) {
      this.fx.pop(this.body.x + Math.random() * this.body.width, this.body.y + Math.random() * this.body.height, this.tint, 20);
      this.scene.cameras.main.shake(150, 0.01);
      yield 0.18;
    }
    this.scene.tweens.add({ targets: this.visuals(), alpha: 0, duration: 600 });
    yield 0.6;
    this.state = 'dead';
    this.scene.events.emit('boss-defeated', { name: this.name });
  }

  visuals() {
    return [this.sprite];
  }

  // -------------------------------------------------------------- update
  update(dt, player) {
    this.dt = dt;
    this.player = player;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.state === 'fight' || this.state === 'dying') this.runCo(dt);
    this.syncVisual(dt);
    // When a vulnerable window closes with the player inside the boss, shove them out instead of killing.
    if (this._wasVuln && !this.vulnerable && player && !player.dead && player.body.enable) {
      const b = player.body;
      if (Rect.Overlaps(this.body, new Rect(b.x, b.y, b.width, b.height))) {
        player.knockback(Math.sign(b.center.x - this.body.centerX) || -1, 380, 420);
        this.shoveGrace = 0.35;
      }
    }
    this._wasVuln = this.vulnerable;
    if (this.shoveGrace > 0) this.shoveGrace -= dt;
    const tintNow = this.flash > 0 && Math.floor(this.flash * 30) % 2 ? 0xffffff : this.vulnerable ? this.vulnTint() : this.tint;
    for (const v of this.visuals()) if (v.setTint && !v.noTint) v.setTint(tintNow);
  }

  vulnTint() {
    return Math.floor(this.scene.time.now / 110) % 2 ? 0xffffff : this.tint;
  }

  runCo(dt) {
    if (!this.co) this.co = this.pattern(this.phase);
    if (this.waitT > 0) {
      this.waitT -= dt;
      return;
    }
    const r = this.co.next();
    if (r.done) {
      if (this.state === 'fight') this.co = this.pattern(this.phase);
    } else if (typeof r.value === 'number') {
      this.waitT = r.value;
    }
  }

  // ---------------------------------------------------------- coroutines
  *wait(t) {
    yield t;
  }

  /** Tween this.x/this.y (or any object's props) over `dur` seconds. */
  *moveTo(x, y, dur, ease = 'Sine.easeInOut', target = this) {
    const sx = target.x;
    const sy = target.y;
    const fn = Phaser.Tweens.Builders.GetEaseFunction(ease);
    let t = 0;
    while (t < dur) {
      t += this.dt;
      const k = fn(Math.min(1, t / dur));
      target.x = sx + (x - sx) * k;
      target.y = sy + (y - sy) * k;
      yield;
    }
  }

  /** Ballistic jump landing on the floor at tx after `time` seconds (feet coordinates). */
  *jumpTo(tx, time, floorY = this.arena.floorY) {
    tx = Phaser.Math.Clamp(tx, this.arena.left + this.halfW, this.arena.right - this.halfW);
    const vx = (tx - this.x) / time;
    let vy = (floorY - this.y - 0.5 * BOSS_GRAVITY * time * time) / time;
    let t = 0;
    while (t < time) {
      const dt = Math.min(this.dt, time - t);
      t += dt;
      vy += BOSS_GRAVITY * dt;
      this.x += vx * dt;
      this.y += vy * dt;
      yield;
    }
    this.x = tx;
    this.y = floorY;
  }

  /** Flash briefly as an attack telegraph. */
  *telegraph(t = 0.45) {
    this.flash = t;
    yield t;
  }

  // ------------------------------------------------------------- combat
  get halfW() {
    return 40;
  }

  playerX() {
    return this.player && !this.player.dead ? this.player.body.center.x : this.arena.cx;
  }

  playerY() {
    return this.player && !this.player.dead ? this.player.body.center.y : this.arena.floorY - 20;
  }

  clampX(x, margin = this.halfW) {
    return Phaser.Math.Clamp(x, this.arena.left + margin, this.arena.right - margin);
  }

  /** Lethal contact with the boss itself. */
  touches(bounds) {
    if (this.state !== 'fight' || !this.contactLethal || this.vulnerable || this.shoveGrace > 0) return false;
    return Rect.Overlaps(this.body, bounds);
  }

  /**
   * Player attacks: stomping or dashing into the weak spot while vulnerable.
   * Returns 'hit' | 'bounce' | null.
   */
  tryHit(player, bounds, prevBottom) {
    if (this.state !== 'fight' || !this.vulnerable || this.invuln > 0) return null;
    if (!Rect.Overlaps(this.hurt, bounds)) return null;
    const stomp = player.body.velocity.y > 0 && prevBottom <= this.hurt.top + 14;
    if (!stomp && !player.dashing) return null;
    this.takeHit();
    if (stomp) {
      // Bounce up and away so the player doesn't land back inside the boss.
      player.bounce(620);
      player.moveVx = (Math.sign(player.body.center.x - this.hurt.centerX) || -1) * 260;
      player.wallJumpLock = 0.25;
    } else {
      player.knockback(Math.sign(player.body.center.x - this.hurt.centerX) || -1, 320, 420);
      player.refreshDash();
    }
    return 'hit';
  }

  takeHit() {
    const before = this.phase;
    this.hp--;
    this.invuln = 0.8;
    this.flash = 0.4;
    this.fx.bossHit(this.hurt.centerX, this.hurt.centerY, this.tint);
    this.scene.events.emit('boss-hp', { hp: this.hp, maxHp: this.maxHp });
    if (this.hp <= 0) {
      this.state = 'dying';
      this.combat.clear();
      this.enemies.killSummoned();
      this.co = this.death();
      this.waitT = 0;
      return;
    }
    this.co = this.phase !== before ? this.chain(this.phaseChange(this.phase)) : this.chain(this.onHit());
    this.waitT = 0;
  }

  /** Runs a coroutine then hands back to the regular pattern. */
  *chain(gen) {
    yield* gen;
  }

  summon(type, x, y, opts) {
    const e = this.enemies.spawn(type, x, y, opts);
    this.fx.pop(x, y - 16, e.tint, 14);
    return e;
  }

  place() {}

  syncVisual() {}

  /** Depth helper for subclasses. */
  static get DEPTH() {
    return DEPTH.PLAYER - 2;
  }
}
