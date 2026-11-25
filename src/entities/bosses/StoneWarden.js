import Phaser from 'phaser';
import Boss from './Boss.js';

const STONE = 0xd9b98c;
const EYE = 0xff8a3d;

/**
 * World 2 boss – THE STONE WARDEN.
 * A golem with two floating fists. Fist slams (shockwaves from phase 2), boulder
 * tosses, rock rain and low/high eye lasers. After a slam sequence it kneels and
 * exposes its glowing core – dash into it or stomp on it.
 */
export default class StoneWarden extends Boss {
  constructor(scene, ctx, arena) {
    super(scene, ctx, arena, { name: 'The Stone Warden', hp: 6, tint: STONE });
    const d = Boss.DEPTH;
    this.sprite = scene.add.image(0, 0, 'golemBody').setOrigin(0.5, 1).setDepth(d);
    this.coreImg = scene.add.image(0, 0, 'golemCore').setDepth(d + 0.1).setBlendMode(Phaser.BlendModes.ADD);
    this.coreImg.noTint = true;
    this.fists = [0, 1].map(() => {
      const img = scene.add.image(0, 0, 'golemFist').setDepth(d + 0.2);
      return { img, x: 0, y: 0, rect: new Phaser.Geom.Rectangle(), busy: false };
    });
    this.place();
  }

  get halfW() {
    return 60;
  }

  visuals() {
    return [this.sprite, this.coreImg, ...this.fists.map((f) => f.img)];
  }

  fistHome(i) {
    const bob = Math.sin(this.scene.time.now / 400 + i * 2) * 8;
    return i === 0 ? { x: this.x - 110, y: this.y - 110 + bob } : { x: this.x + 70, y: this.y - 150 + bob };
  }

  place() {
    this.x = this.arena.right - 120;
    this.y = this.arena.floorY;
    this.kneel = 0;
    this.fists.forEach((f, i) => {
      Object.assign(f, this.fistHome(i));
      f.busy = false;
      f.img.setAlpha(1);
    });
    this.sprite.setAlpha(1);
    this.coreImg.setAlpha(1);
    this.syncVisual(0);
  }

  *intro() {
    this.scene.cameras.main.shake(600, 0.006);
    this.flash = 0.6;
    yield 1.0;
  }

  *slam(fistIndex) {
    const f = this.fists[fistIndex];
    f.busy = true;
    const tx = Phaser.Math.Clamp(this.playerX(), this.arena.left + 30, this.arena.right - 30);
    yield* this.moveTo(tx, this.arena.ceilY + 70, 0.45, 'Sine.easeOut', f);
    const warn = this.phase === 3 ? 0.3 : 0.42;
    this.combat.marker(tx, this.arena.floorY, 56, warn + 0.15, STONE);
    yield warn;
    yield* this.moveTo(tx, this.arena.floorY - 22, 0.15, 'Quad.easeIn', f);
    this.scene.cameras.main.shake(180, 0.01);
    this.fx.rubble(tx, this.arena.floorY, 10);
    if (this.phase >= 2) {
      this.combat.shockwave(tx - 28, this.arena.floorY, -1, 320, STONE);
      this.combat.shockwave(tx + 28, this.arena.floorY, 1, 320, STONE);
    }
    yield 0.45;
    const home = this.fistHome(fistIndex);
    yield* this.moveTo(home.x, home.y, 0.4, 'Sine.easeInOut', f);
    f.busy = false;
  }

  *boulders() {
    yield* this.telegraph(0.35);
    const n = this.phase + 1;
    for (let i = 0; i < n; i++) {
      const tx = this.playerX() + (Math.random() - 0.5) * 120;
      this.combat.lob(this.x - 40, this.y - 150, tx, this.arena.floorY - 12, 1.0, 1200, { texture: 'rock', radius: 13, spin: 5 });
      yield 0.35;
    }
  }

  *rockRain() {
    const xs = [];
    const gap = Phaser.Math.Between(0, 5);
    let i = 0;
    for (let x = this.arena.left + 32; x < this.x - 60; x += 72, i++) if (i !== gap && i !== gap + 1) xs.push(x);
    this.combat.rain(xs, this.arena.ceilY + 10, { warn: 0.9, texture: 'rock', radius: 12, floorY: this.arena.floorY });
    yield 1.3;
  }

  *eyeLaser(high) {
    const y = high ? this.arena.floorY - 84 : this.arena.floorY - 16;
    this.flash = 0.5;
    this.combat.beam(y, this.arena.left, this.x - 30, high ? 40 : 30, this.phase === 3 ? 0.7 : 0.9, 0.5, EYE);
    yield this.phase === 3 ? 1.0 : 1.3;
  }

  *exposeCore() {
    yield* this.telegraph(0.3);
    yield* this.moveTo(1, 0, 0.3, 'Quad.easeOut', this.kneelTarget());
    this.vulnerable = true;
    // the core sits at the far end of the hall: leave time to cross from the safe side
    yield this.phase === 3 ? 2.4 : 3.0;
    this.vulnerable = false;
    yield* this.moveTo(0, 0, 0.35, 'Sine.easeInOut', this.kneelTarget());
  }

  kneelTarget() {
    const self = this;
    return {
      get x() {
        return self.kneel;
      },
      set x(v) {
        self.kneel = v;
      },
      y: 0,
    };
  }

  *pattern(phase) {
    if (phase === 1) {
      yield* this.slam(0);
      yield* this.slam(1);
      yield* this.boulders();
      yield* this.eyeLaser(false);
      yield* this.slam(0);
    } else if (phase === 2) {
      yield* this.slam(0);
      yield* this.rockRain();
      yield* this.eyeLaser(false);
      yield* this.eyeLaser(true);
      yield* this.boulders();
      yield* this.slam(1);
    } else {
      yield* this.eyeLaser(Math.random() < 0.5);
      yield* this.eyeLaser(Math.random() < 0.5);
      yield* this.rockRain();
      yield* this.slam(0);
      yield* this.boulders();
      yield* this.slam(1);
    }
    yield* this.exposeCore();
    yield 0.4;
  }

  *onHit() {
    this.vulnerable = false;
    this.contactLethal = false;
    yield 0.4;
    yield* this.moveTo(0, 0, 0.35, 'Sine.easeInOut', this.kneelTarget());
    yield 0.5;
    this.contactLethal = true;
  }

  touches(bounds) {
    if (this.state !== 'fight') return false;
    for (const f of this.fists) if (f.busy && Phaser.Geom.Rectangle.Overlaps(f.rect, bounds)) return true;
    return super.touches(bounds);
  }

  syncVisual() {
    const drop = this.kneel * 34;
    this.sprite.setPosition(this.x, this.y + drop);
    this.fists.forEach((f, i) => {
      if (!f.busy && this.state !== 'dying') {
        const h = this.fistHome(i);
        f.x += (h.x - f.x) * 0.15;
        f.y += (h.y - f.y + drop) * 0.15;
      }
      f.img.setPosition(f.x, f.y);
      f.rect.setTo(f.x - 20, f.y - 18, 40, 36);
    });
    const cy = this.y - 92 + drop;
    this.coreImg.setPosition(this.x - 4, cy).setScale(this.vulnerable ? 1.3 + Math.sin(this.scene.time.now / 80) * 0.15 : 0.8);
    this.coreImg.setAlpha(this.vulnerable ? 1 : 0.5);
    this.body.setTo(this.x - 50, this.y - 140 + drop, 100, 140 - drop);
    this.hurt.setTo(this.x - 50, cy - 44, 92, 88);
  }
}
