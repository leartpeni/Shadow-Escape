import Phaser from 'phaser';
import Boss from './Boss.js';

const BOLT = 0xd08cff;

/**
 * World 3 boss – COUNT NOCTIS.
 * A vampire lord that hovers above the arena. Bolt fans, low swoops (stay on the
 * ground – he passes overhead), bat summons, teleports with homing orbs and (phase 3)
 * a spiral barrage. Each swoop sequence ends with him crashing down dazed.
 */
export default class CountNoctis extends Boss {
  constructor(scene, ctx, arena) {
    super(scene, ctx, arena, { name: 'Count Noctis', hp: 6, tint: 0xd08cff });
    this.sprite = scene.add.sprite(0, 0, 'noctis', 'noct0').setDepth(Boss.DEPTH);
    this.place();
  }

  get halfW() {
    return 60;
  }

  get hoverY() {
    return this.arena.ceilY + 80;
  }

  place() {
    this.x = this.arena.right - 160;
    this.y = this.hoverY;
    this.dazed = false;
    this.sprite.setAlpha(1).setAngle(0);
    this.sprite.play('noctis-fly');
    this.syncVisual(0);
  }

  *intro() {
    yield* this.moveTo(this.x - 60, this.hoverY + 20, 0.6);
    yield* this.telegraph(0.4);
  }

  *hoverTo(x, dur = 0.7) {
    yield* this.moveTo(this.clampX(x, 80), this.hoverY + (Math.random() - 0.5) * 40, dur);
  }

  *boltFan() {
    yield* this.telegraph(0.35);
    const n = this.phase === 3 ? 7 : 5;
    const base = Math.atan2(this.playerY() - this.y, this.playerX() - this.x);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.2;
      this.combat.shoot(this.x, this.y + 10, Math.cos(a) * 230, Math.sin(a) * 230, { tint: BOLT, radius: 8 });
    }
    yield 0.6;
  }

  /** Low swoop through the player's column. Bottom of his body stays above a standing player. */
  *swoop(crash) {
    const startX = this.x;
    const px = this.clampX(this.playerX(), 100);
    let endX = this.clampX(2 * px - startX, 80);
    if (Math.abs(endX - startX) < 200) endX = this.clampX(startX < this.arena.cx ? this.arena.right - 100 : this.arena.left + 100, 80);
    this.sprite.setFlipX(endX < startX);
    yield* this.telegraph(this.phase === 3 ? 0.35 : 0.5);
    const lowY = this.arena.floorY - 74;
    const startY = this.y;
    const dur = this.phase === 3 ? 0.9 : 1.1;
    let t = 0;
    while (t < dur) {
      t += this.dt;
      const k = Math.min(1, t / dur);
      this.x = startX + (endX - startX) * k;
      this.y = startY + (lowY - startY) * Math.sin(Math.PI * k) + (this.hoverY - startY) * k * k;
      if (crash && k > 0.5) break;
      yield;
    }
    if (crash) {
      // Crash-lands at the bottom of the swoop.
      yield* this.moveTo(this.x + (endX - startX) * 0.15, this.arena.floorY - 40, 0.25, 'Quad.easeIn');
      this.scene.cameras.main.shake(200, 0.01);
      this.fx.landDust(this.x, this.arena.floorY, 900);
      this.sprite.stop();
      this.sprite.setFrame('noctDaze');
      this.vulnerable = true;
      yield this.phase === 3 ? 1.9 : 2.3;
      this.vulnerable = false;
      this.contactLethal = false;
      this.sprite.play('noctis-fly');
      yield* this.moveTo(this.x, this.hoverY, 0.5, 'Sine.easeOut');
      this.contactLethal = true;
    }
  }

  *summonBats() {
    if (this.enemies.list.filter((e) => e.summoned && e.alive).length >= 3) return;
    yield* this.telegraph(0.3);
    this.summon('bat', this.x - 60, this.y + 20, { wake: 900, speed: 120 });
    this.summon('bat', this.x + 60, this.y + 20, { wake: 900, speed: 120 });
    yield 0.5;
  }

  *teleport() {
    this.contactLethal = false;
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 250 });
    this.fx.pop(this.x, this.y, BOLT, 16);
    yield 0.45;
    const px = this.playerX();
    this.x = this.clampX(px < this.arena.cx ? px + 300 : px - 300, 80);
    this.y = this.hoverY;
    this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 250 });
    yield 0.3;
    this.contactLethal = true;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.9;
      this.combat.shoot(this.x, this.y, Math.cos(a) * 170, Math.sin(a) * 170, { tint: 0xff6fd8, radius: 8, homing: 1.8, speed: 170, life: 4.2 });
    }
    yield 0.9;
  }

  *spiral() {
    yield* this.hoverTo(this.arena.cx, 0.6);
    yield* this.telegraph(0.4);
    let a = 0;
    for (let i = 0; i < 16; i++) {
      for (let k = 0; k < 3; k++) {
        const ang = a + (k * Math.PI * 2) / 3;
        this.combat.shoot(this.x, this.y, Math.cos(ang) * 150, Math.sin(ang) * 150, { tint: BOLT, radius: 7, life: 5 });
      }
      a += 0.32;
      yield 0.13;
    }
    yield 0.5;
  }

  *pattern(phase) {
    if (phase === 1) {
      yield* this.hoverTo(this.playerX() + (Math.random() < 0.5 ? -250 : 250));
      yield* this.boltFan();
      yield* this.swoop(false);
      yield 0.3;
      yield* this.boltFan();
      yield* this.swoop(true);
    } else if (phase === 2) {
      yield* this.teleport();
      yield* this.summonBats();
      yield* this.boltFan();
      yield* this.swoop(false);
      yield* this.swoop(true);
    } else {
      yield* this.spiral();
      yield* this.teleport();
      yield* this.boltFan();
      yield* this.swoop(false);
      yield* this.swoop(true);
    }
    yield 0.3;
  }

  *onHit() {
    this.vulnerable = false;
    this.contactLethal = false;
    this.sprite.play('noctis-fly');
    yield* this.moveTo(this.x, this.hoverY, 0.45, 'Sine.easeOut');
    this.contactLethal = true;
    yield 0.3;
  }

  syncVisual() {
    const bob = this.vulnerable || this.state !== 'fight' ? 0 : Math.sin(this.scene.time.now / 200) * 5;
    this.sprite.setPosition(this.x, this.y + bob);
    if (this.state === 'fight' && !this.vulnerable) {
      const px = this.playerX();
      if (Math.abs(px - this.x) > 30 && this.flash <= 0) this.sprite.setFlipX(px < this.x);
    }
    this.body.setTo(this.x - 46, this.y - 24 + bob, 92, 50);
    this.hurt.setTo(this.x - 56, this.y - 38, 112, 76);
  }
}
