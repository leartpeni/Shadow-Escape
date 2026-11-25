import Phaser from 'phaser';
import Boss from './Boss.js';

const VOID = 0xff4d8d;

/**
 * World 5 final boss – UMBRA, THE VOID HEART.
 * A giant echo of the player's own shadow. Orb rings, chasing light pillars,
 * telegraphed full-arena dashes (jump over him!) and Void Hunter summons.
 * After each dash he is exhausted – the moment to strike.
 */
export default class Umbra extends Boss {
  constructor(scene, ctx, arena) {
    super(scene, ctx, arena, { name: 'Umbra, the Void Heart', hp: 8, tint: VOID });
    this.sprite = scene.add.sprite(0, 0, 'shadow', 'idle0').setOrigin(0.5, 1).setDepth(Boss.DEPTH).setScale(1.8);
    this.aura = scene.add.image(0, 0, 'glow').setTint(VOID).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(1.4).setDepth(Boss.DEPTH - 0.1);
    this.aura.noTint = true;
    this.place();
  }

  get halfW() {
    return 30;
  }

  visuals() {
    return [this.sprite, this.aura];
  }

  place() {
    this.x = this.arena.right - 120;
    this.y = this.arena.floorY;
    this.facing = -1;
    this.sprite.setAlpha(1).setScale(1.8);
    this.aura.setAlpha(0.35);
    this.sprite.play('idle');
    this.syncVisual(0);
  }

  *intro() {
    this.sprite.play('jump');
    yield* this.jumpTo(this.x - 80, 0.6);
    this.sprite.play('idle');
    this.scene.cameras.main.shake(300, 0.008);
    yield 0.5;
  }

  face() {
    this.facing = this.playerX() < this.x ? -1 : 1;
  }

  *rings() {
    this.face();
    yield* this.telegraph(0.4);
    const n = this.phase === 3 ? 14 : 12;
    this.combat.ring(this.x, this.y - 50, n, 160, 0, { tint: VOID, radius: 8 });
    if (this.phase >= 2) {
      yield 0.45;
      this.combat.ring(this.x, this.y - 50, n, 160, Math.PI / n, { tint: VOID, radius: 8 });
    }
    yield 0.6;
  }

  *pillarChase() {
    const n = 2 + this.phase;
    for (let i = 0; i < n; i++) {
      this.combat.pillar(this.clampX(this.playerX(), 30), this.arena.ceilY, this.arena.floorY, 50, 0.7, 0.35, VOID);
      yield 0.42;
    }
    yield 0.5;
  }

  /** Telegraphed charge across the arena at body height – jump over it. Leaves him exhausted. */
  *dash(exhaust) {
    this.face();
    // Pick the far side from where he stands.
    const toRight = this.x < this.arena.cx;
    const tx = toRight ? this.arena.right - 50 : this.arena.left + 50;
    this.facing = toRight ? 1 : -1;
    this.sprite.play('run');
    this.combat.marker(this.arena.cx, this.arena.floorY - 40, this.arena.width - 20, this.phase === 3 ? 0.55 : 0.75, VOID);
    yield* this.telegraph(this.phase === 3 ? 0.55 : 0.75);
    this.sprite.play('dash');
    const speed = 820;
    while (Math.abs(tx - this.x) > 4) {
      const step = Math.min(Math.abs(tx - this.x), speed * this.dt);
      this.x += Math.sign(tx - this.x) * step;
      if (Math.random() < 0.6) this.fx.afterimage(this.sprite);
      yield;
    }
    this.scene.cameras.main.shake(140, 0.008);
    this.sprite.play('idle');
    if (exhaust) {
      this.vulnerable = true;
      this.sprite.anims.timeScale = 0.3;
      yield this.phase === 3 ? 1.6 : 2.0;
      this.sprite.anims.timeScale = 1;
      this.vulnerable = false;
    } else {
      yield 0.3;
    }
  }

  *summonHunters() {
    if (this.enemies.list.filter((e) => e.summoned && e.alive).length >= 2) return;
    yield* this.telegraph(0.4);
    this.summon('hunter', this.arena.left + 60, this.arena.floorY, { dir: 1, range: 12 });
    this.summon('hunter', this.arena.right - 60, this.arena.floorY, { dir: -1, range: 12 });
    yield 0.8;
  }

  *pattern(phase) {
    if (phase === 1) {
      yield* this.rings();
      yield* this.pillarChase();
      yield* this.dash(true);
    } else if (phase === 2) {
      yield* this.summonHunters();
      yield* this.rings();
      yield* this.dash(false);
      yield* this.pillarChase();
      yield* this.dash(true);
    } else {
      yield* this.rings();
      yield* this.pillarChase();
      yield* this.summonHunters();
      yield* this.dash(false);
      yield* this.rings();
      yield* this.dash(true);
    }
    yield 0.3;
  }

  *onHit() {
    this.vulnerable = false;
    this.contactLethal = false;
    this.sprite.anims.timeScale = 1;
    this.sprite.play('jump');
    const tx = this.x < this.arena.cx ? this.arena.right - 90 : this.arena.left + 90;
    yield* this.jumpTo(tx, 0.7);
    this.sprite.play('idle');
    this.contactLethal = true;
    yield 0.4;
  }

  syncVisual() {
    this.sprite.setPosition(this.x, this.y).setFlipX(this.facing < 0);
    this.aura.setPosition(this.x, this.y - 40).setAlpha(this.vulnerable ? 0.15 : 0.35 + Math.sin(this.scene.time.now / 150) * 0.08);
    this.body.setTo(this.x - 18, this.y - 62, 36, 62);
    this.hurt.setTo(this.x - 28, this.y - 76, 56, 76);
  }
}
