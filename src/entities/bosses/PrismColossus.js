import Phaser from 'phaser';
import Boss from './Boss.js';

const PRISM = 0x7fe8ff;

/**
 * World 4 boss – THE PRISM COLOSSUS.
 * A giant crystal statue whose floating prism core attacks with sweeping low/high
 * lasers, shard rain, radial bursts and light pillars. After each cycle the core
 * sinks to the floor, overheated – dash into it or stomp it.
 */
export default class PrismColossus extends Boss {
  constructor(scene, ctx, arena) {
    super(scene, ctx, arena, { name: 'The Prism Colossus', hp: 6, tint: PRISM });
    const d = Boss.DEPTH;
    this.statue = scene.add.image(this.arena.cx, this.arena.floorY, 'colossus').setOrigin(0.5, 1).setDepth(-4).setAlpha(0.55);
    this.statue.noTint = true;
    this.sprite = scene.add.image(0, 0, 'prismCore').setDepth(d);
    this.halo = scene.add.image(0, 0, 'glow').setTint(PRISM).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(d - 0.1);
    this.halo.noTint = true;
    this.place();
  }

  get halfW() {
    return 40;
  }

  visuals() {
    return [this.sprite, this.halo];
  }

  get hoverY() {
    return this.arena.ceilY + 96;
  }

  place() {
    this.x = this.arena.cx;
    this.y = this.hoverY;
    this.spin = 0;
    this.sprite.setAlpha(1);
    this.halo.setAlpha(0.5);
    this.syncVisual(0);
  }

  *intro() {
    this.scene.tweens.add({ targets: this.statue, alpha: 0.8, duration: 500, yoyo: true });
    yield* this.telegraph(0.8);
  }

  *drift() {
    const tx = this.clampX(this.playerX() + (Math.random() - 0.5) * 300, 90);
    yield* this.moveTo(tx, this.hoverY + (Math.random() - 0.5) * 30, 0.6);
  }

  *laser(high) {
    const y = high ? this.arena.floorY - 84 : this.arena.floorY - 16;
    this.flash = 0.4;
    this.combat.beam(y, this.arena.left, this.arena.right, high ? 40 : 30, this.phase === 3 ? 0.7 : 0.9, 0.45, PRISM);
    yield this.phase === 3 ? 0.95 : 1.25;
  }

  *burst(offset = 0) {
    yield* this.telegraph(0.35);
    const n = this.phase === 1 ? 10 : 14;
    this.combat.ring(this.x, this.y, n, 170, offset, { tint: PRISM, radius: 8 });
    yield 0.7;
  }

  *pillars() {
    const n = this.phase + 2;
    for (let i = 0; i < n; i++) {
      this.combat.pillar(this.clampX(this.playerX(), 30), this.arena.ceilY, this.arena.floorY, 52, 0.75, 0.4, PRISM);
      yield 0.5;
    }
    yield 0.5;
  }

  /** Pillars filling the arena except for one safe gap. */
  *pillarWall() {
    const cols = Math.floor(this.arena.width / 64);
    // The safe gap is always within ~3 columns (one second of running) of the player.
    const pc = Math.floor((this.playerX() - this.arena.left) / 64);
    const gap = Phaser.Math.Clamp(pc + Phaser.Math.Between(-3, 3), 1, cols - 2);
    for (let i = 0; i < cols; i++) {
      if (Math.abs(i - gap) <= 0) continue;
      this.combat.pillar(this.arena.left + i * 64 + 32, this.arena.ceilY, this.arena.floorY, 60, 1.2, 0.45, PRISM);
    }
    yield 1.9;
  }

  *shardRain() {
    const xs = [];
    // The two-column safe gap is always within reach of the player.
    const cols = Math.floor((this.arena.width - 48) / 64);
    const pc = Math.floor((this.playerX() - this.arena.left - 28) / 64);
    const skip = Phaser.Math.Clamp(pc + Phaser.Math.Between(-3, 2), 0, cols - 2);
    let i = 0;
    for (let x = this.arena.left + 28; x < this.arena.right - 20; x += 64, i++) if (i !== skip && i !== skip + 1) xs.push(x);
    this.combat.rain(xs, this.arena.ceilY + 10, { warn: 0.85, texture: 'shard', tint: PRISM, radius: 10, scale: 0.9, floorY: this.arena.floorY });
    yield 1.4;
  }

  *overheat() {
    yield* this.telegraph(0.35);
    const tx = this.clampX(this.x, 80);
    yield* this.moveTo(tx, this.arena.floorY - 50, 0.5, 'Quad.easeIn');
    this.scene.cameras.main.shake(150, 0.008);
    this.vulnerable = true;
    yield this.phase === 3 ? 2.0 : 2.4;
    this.vulnerable = false;
    this.contactLethal = false;
    yield* this.moveTo(this.x, this.hoverY, 0.5, 'Sine.easeOut');
    this.contactLethal = true;
  }

  *pattern(phase) {
    if (phase === 1) {
      yield* this.drift();
      yield* this.laser(false);
      yield* this.burst();
      yield* this.pillars();
      yield* this.laser(true);
    } else if (phase === 2) {
      yield* this.shardRain();
      yield* this.drift();
      yield* this.laser(true);
      yield* this.laser(false);
      yield* this.burst();
      yield* this.pillars();
    } else {
      yield* this.pillarWall();
      yield* this.drift();
      yield* this.burst(0);
      yield* this.burst(0.22);
      yield* this.laser(false);
      yield* this.laser(true);
      yield* this.shardRain();
    }
    yield* this.overheat();
    yield 0.3;
  }

  *onHit() {
    this.vulnerable = false;
    this.contactLethal = false;
    yield 0.25;
    yield* this.moveTo(this.x, this.hoverY, 0.5, 'Sine.easeOut');
    this.contactLethal = true;
    yield 0.3;
  }

  syncVisual(dt) {
    this.spin += dt * (this.vulnerable ? 1 : 3);
    const bob = this.vulnerable ? 0 : Math.sin(this.scene.time.now / 300) * 6;
    this.sprite.setPosition(this.x, this.y + bob).setScale(1 + Math.sin(this.spin) * 0.06, 1);
    this.halo.setPosition(this.x, this.y + bob).setScale(this.vulnerable ? 1.6 : 1.1);
    this.body.setTo(this.x - 26, this.y - 32 + bob, 52, 64);
    this.hurt.setTo(this.x - 42, this.y - 46, 84, 92);
  }
}
