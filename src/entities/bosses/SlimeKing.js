import Phaser from 'phaser';
import Boss from './Boss.js';

const GOO = 0xb48cff;

/**
 * World 1 boss – THE SLIME KING.
 * Hops after the player, spits arcs of goo, and performs a huge body slam that
 * sends shockwaves along the floor. After the slam he is dazed: stomp or dash him.
 * Phase 2: hops send shockwaves, summons slimes. Phase 3: goo rain, faster.
 */
export default class SlimeKing extends Boss {
  constructor(scene, ctx, arena) {
    super(scene, ctx, arena, { name: 'Mossback, the Slime King', hp: 6, tint: 0xa98bff });
    this.sprite = scene.add.sprite(0, 0, 'slimeKing', 'king0').setOrigin(0.5, 1).setDepth(Boss.DEPTH);
    this.place();
  }

  get halfW() {
    return 64;
  }

  place() {
    this.x = this.arena.right - 170;
    this.y = this.arena.floorY;
    this.squash = 1;
    this.sprite.setFrame('king0').setAlpha(1);
    this.syncVisual(0);
  }

  *intro() {
    this.sprite.setFrame('king1');
    yield* this.jumpTo(this.x - 40, 0.7);
    this.land(false);
    yield 0.6;
    this.sprite.setFrame('king0');
  }

  land(waves) {
    this.squash = 0.7;
    this.scene.cameras.main.shake(160, 0.008);
    this.fx.landDust(this.x, this.y, 900);
    if (waves) {
      const sp = this.phase === 3 ? 360 : 300;
      this.combat.shockwave(this.x - this.halfW, this.arena.floorY, -1, sp, GOO);
      this.combat.shockwave(this.x + this.halfW, this.arena.floorY, 1, sp, GOO);
    }
  }

  *hop() {
    this.squash = 1.2;
    yield 0.18;
    const step = Phaser.Math.Clamp(this.playerX() - this.x, -220, 220);
    const tx = this.clampX(this.x + step);
    this.combat.marker(tx, this.arena.floorY, 120, 0.55, GOO);
    yield* this.jumpTo(tx, 0.55);
    this.land(this.phase >= 2);
  }

  *spit() {
    this.sprite.setFrame('king1');
    yield* this.telegraph(0.35);
    const n = 2 + this.phase;
    const px = this.playerX();
    for (let i = 0; i < n; i++) {
      const tx = px + (i - (n - 1) / 2) * 70;
      this.combat.lob(this.x, this.y - 100, tx, this.arena.floorY - 8, 0.95, 1100, { texture: 'blob', tint: GOO, radius: 10, spin: 6 });
      yield 0.08;
    }
    yield 0.4;
    this.sprite.setFrame('king0');
  }

  *bigSlam() {
    this.squash = 1.3;
    yield* this.telegraph(0.4);
    const tx = this.clampX(this.playerX());
    this.combat.marker(tx, this.arena.floorY, 140, 1.05, GOO);
    this.sprite.setFrame('king1');
    yield* this.jumpTo(tx, 1.05);
    this.land(true);
    // Dazed – the opening.
    this.sprite.setFrame('kingDaze');
    this.vulnerable = true;
    yield this.phase === 3 ? 1.9 : 2.4;
    this.vulnerable = false;
    this.sprite.setFrame('king0');
    yield 0.3;
  }

  *pattern(phase) {
    const hops = phase === 1 ? 2 : 3;
    for (let i = 0; i < hops; i++) {
      yield* this.hop();
      yield phase === 3 ? 0.15 : 0.3;
    }
    yield* this.spit();
    if (phase >= 2) {
      // World 1 is gentle: at most 2 (phase 2) / 3 (phase 3) minions, never spawned on top of the player.
      const alive = this.enemies.list.filter((e) => e.summoned && e.alive).length;
      let n = Math.min(phase === 3 ? 2 : 1, (phase === 3 ? 3 : 2) - alive);
      const px = this.playerX();
      for (const side of px < this.x ? [1, -1] : [-1, 1]) {
        const sx = this.clampX(this.x + side * 120, 40);
        if (n <= 0 || Math.abs(sx - px) < 90) continue;
        this.summon('slime', sx, this.arena.floorY, { speed: 70 });
        n--;
      }
      yield 0.4;
    }
    if (phase === 3) {
      const xs = [];
      for (let x = this.arena.left + 40; x < this.arena.right - 20; x += 96) xs.push(x + Math.random() * 40);
      this.combat.rain(xs, this.arena.ceilY + 8, { warn: 0.8, texture: 'blob', tint: GOO, radius: 10, scale: 1, floorY: this.arena.floorY });
      yield 1.2;
    }
    yield* this.bigSlam();
  }

  *onHit() {
    this.vulnerable = false;
    this.contactLethal = false;
    this.sprite.setFrame('king1');
    const away = this.x < this.arena.cx ? this.arena.right - 120 : this.arena.left + 120;
    yield* this.jumpTo(away, 0.8);
    this.land(false);
    this.contactLethal = true;
    this.sprite.setFrame('king0');
    yield 0.5;
  }

  syncVisual(dt) {
    this.squash += (1 - this.squash) * Math.min(1, dt * 8);
    const wobble = this.state === 'fight' ? Math.sin(this.scene.time.now / 160) * 0.03 : 0;
    this.sprite.setPosition(this.x, this.y).setScale(2 - this.squash + wobble, this.squash - wobble);
    this.body.setTo(this.x - 58, this.y - 88, 116, 88);
    this.hurt.setTo(this.x - 64, this.y - 96, 128, 96);
  }
}
