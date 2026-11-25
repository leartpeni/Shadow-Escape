import Phaser from 'phaser';
import { COLORS, DEPTH, QUALITY } from '../config.js';
import { canvasTex } from '../gfx/util.js';
import Audio from './Audio.js';

const ADD = Phaser.BlendModes.ADD;
export const TRAIL_COLORS = [0x8c6cf0, 0x9f7cff, 0x7fa8ff, 0x5fd3ff];

/** Generates the small additive textures used by the effects (once per game). */
export function makeFxTextures(scene) {
  if (scene.textures.exists('fx-ring')) return;
  // shockwave ring
  let { tex, ctx } = canvasTex(scene, 'fx-ring', 128, 128);
  let g = ctx.createRadialGradient(64, 64, 40, 64, 64, 63);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.82, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  tex.refresh();
  // four-point star flare
  ({ tex, ctx } = canvasTex(scene, 'fx-flare', 96, 96));
  g = ctx.createRadialGradient(48, 48, 0, 48, 48, 24);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
  for (const [w, h] of [[96, 5], [5, 96]]) {
    const lg = w > h ? ctx.createLinearGradient(0, 0, 96, 0) : ctx.createLinearGradient(0, 0, 0, 96);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(48, 48, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
  // speed streak (horizontal)
  ({ tex, ctx } = canvasTex(scene, 'fx-streak', 32, 4));
  g = ctx.createLinearGradient(0, 0, 32, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(16, 2, 16, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
  // tiny diamond sparkle
  ({ tex, ctx } = canvasTex(scene, 'fx-sparkle', 12, 12));
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(7.4, 4.6);
  ctx.lineTo(12, 6);
  ctx.lineTo(7.4, 7.4);
  ctx.lineTo(6, 12);
  ctx.lineTo(4.6, 7.4);
  ctx.lineTo(0, 6);
  ctx.lineTo(4.6, 4.6);
  ctx.closePath();
  ctx.fill();
  tex.refresh();
  // soft ground shadow blob
  ({ tex, ctx } = canvasTex(scene, 'fx-shadow', 64, 16));
  g = ctx.createRadialGradient(32, 8, 0, 32, 8, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.scale(1, 0.25);
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  tex.refresh();
}

/**
 * Centralised particle and juice effects. All particle counts scale with QUALITY.particles
 * so low-end / mobile devices get the same look with fewer particles.
 */
export default class Effects {
  constructor(scene) {
    this.scene = scene;
    this.q = QUALITY.particles;
    makeFxTextures(scene);
    const mk = (key, cfg) => scene.add.particles(0, 0, key, { emitting: false, ...cfg }).setDepth(DEPTH.FX);

    this.dust = mk('dot', {
      lifespan: { min: 250, max: 500 },
      speed: { min: 20, max: 100 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.7, end: 0 },
      gravityY: -60,
      tint: COLORS.dust,
    });
    this.sparks = mk('spark', {
      lifespan: { min: 250, max: 520 },
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [COLORS.spark, 0xc8b6ff, 0x5fd3ff],
      blendMode: ADD,
    });
    this.ring = mk('dot', {
      lifespan: 300,
      speed: 170,
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [COLORS.rim, 0x5fd3ff],
      blendMode: ADD,
    });
    this.deathFx = mk('dot', {
      lifespan: { min: 400, max: 950 },
      speed: { min: 120, max: 400 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 420,
      tint: [0x07060d, 0x2a1d45, COLORS.death, 0x5fd3ff],
    });
    this.gold = mk('dot', {
      lifespan: { min: 500, max: 1100 },
      speed: { min: 40, max: 210 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: COLORS.gold,
      blendMode: ADD,
    });
    // rising twinkles (collections, checkpoints, victory)
    this.twinkle = mk('fx-sparkle', {
      lifespan: { min: 600, max: 1200 },
      speedY: { min: -120, max: -40 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 90 },
      alpha: { start: 1, end: 0 },
      blendMode: ADD,
    });
    // speed streaks: angle set per burst so they fly opposite to the motion
    this.streaks = mk('fx-streak', {
      lifespan: { min: 160, max: 300 },
      speed: { min: 220, max: 480 },
      scaleX: { start: 1.2, end: 0.2 },
      scaleY: { start: 1, end: 0.4 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xc8b6ff, 0x5fd3ff, 0xffffff],
      blendMode: ADD,
    });
    // trailing wisps that fall away from the hero while moving fast
    this.wisps = mk('dot', {
      lifespan: { min: 280, max: 520 },
      speed: { min: 5, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.75, end: 0 },
      alpha: { start: 0.75, end: 0 },
      tint: TRAIL_COLORS,
      blendMode: ADD,
    });

    this.trailIndex = 0;
  }

  /** Scales a particle count by the quality setting. */
  n(count) {
    return Math.max(1, Math.round(count * this.q));
  }

  shake(duration, intensity) {
    const cam = this.scene.cameras.main;
    // Never let a weak shake cut a stronger one short.
    if (cam.shakeEffect.isRunning && cam.shakeEffect.intensity.x > intensity) return;
    cam.shake(duration, intensity);
  }

  // -------------------------------------------------------------- primitives
  /** Expanding additive ring. */
  shockwave(x, y, tint = COLORS.rim, radius = 60, duration = 360, flatten = 1) {
    const s = radius / 52;
    const img = this.scene.add.image(x, y, 'fx-ring').setTint(tint).setBlendMode(ADD).setDepth(DEPTH.FX).setScale(0.1, 0.1 * flatten).setAlpha(1);
    this.scene.tweens.add({ targets: img, scaleX: s, scaleY: s * flatten, alpha: 0, duration, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  /** Bright star flare that pops and fades. */
  flare(x, y, tint = 0xffffff, scale = 1, duration = 280) {
    const img = this.scene.add.image(x, y, 'fx-flare').setTint(tint).setBlendMode(ADD).setDepth(DEPTH.FX).setScale(scale * 0.4).setAngle(Math.random() * 30 - 15);
    this.scene.tweens.add({ targets: img, scale, alpha: 0, angle: img.angle + 25, duration, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
  }

  /** Soft additive light pulse. */
  bloom(x, y, tint = COLORS.rim, scale = 1.4, duration = 320, alpha = 0.6) {
    if (!this.scene.textures.exists('glow')) return;
    const img = this.scene.add.image(x, y, 'glow').setTint(tint).setBlendMode(ADD).setDepth(DEPTH.FX).setScale(scale * 0.5).setAlpha(alpha);
    this.scene.tweens.add({ targets: img, scale, alpha: 0, duration, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
  }

  /** A full magical explosion: flash, bloom, double shockwave, sparks and embers. */
  explosion(x, y, tint = COLORS.rim, power = 1) {
    this.bloom(x, y, tint, 1.6 * power, 420, 0.8);
    this.flare(x, y, 0xffffff, 1.1 * power, 300);
    this.shockwave(x, y, tint, 70 * power, 380);
    if (!QUALITY.low) this.scene.time.delayedCall(70, () => this.shockwave(x, y, 0xffffff, 45 * power, 300));
    this.sparks.explode(this.n(18 * power), x, y);
    this.wisps.explode(this.n(14 * power), x, y);
  }

  // ------------------------------------------------------------ player moves
  jumpDust(x, y) {
    this.dust.explode(this.n(8), x, y);
  }

  landDust(x, y, impact) {
    this.dust.explode(this.n(Phaser.Math.Clamp(impact / 70, 4, 14)), x, y);
    if (impact > 700) {
      this.shockwave(x, y, COLORS.rim, 46, 280, 0.25);
      this.shake(80, 0.003);
    }
  }

  wallDust(x, y) {
    this.dust.explode(this.n(6), x, y);
    this.sparks.explode(this.n(5), x, y);
    this.shockwave(x, y, 0x5fd3ff, 26, 220);
  }

  slideDust(x, y) {
    this.dust.explode(1, x, y);
  }

  doubleJump(x, y) {
    this.ring.explode(this.n(14), x, y);
    this.shockwave(x, y, COLORS.rim, 40, 300, 0.35);
    this.flare(x, y - 4, 0xc8b6ff, 0.55, 220);
  }

  dashBurst(x, y, dx = 1, dy = 0) {
    const back = Phaser.Math.RadToDeg(Math.atan2(-dy, -dx));
    this.streaks.ops.angle.loadConfig({ angle: { min: back - 22, max: back + 22 } });
    this.streaks.ops.rotate.loadConfig({ rotate: back });
    this.streaks.explode(this.n(12), x, y);
    this.sparks.explode(this.n(10), x, y);
    this.shockwave(x, y, 0x5fd3ff, 36, 220);
    this.bloom(x, y, COLORS.rim, 0.9, 220, 0.5);
    this.shake(70, 0.003);
  }

  /** Called every frame while dashing / moving fast: speed streaks + wisps. */
  dashTrail(x, y, dx, dy) {
    const back = Phaser.Math.RadToDeg(Math.atan2(-dy, -dx));
    this.streaks.ops.angle.loadConfig({ angle: { min: back - 8, max: back + 8 } });
    this.streaks.ops.rotate.loadConfig({ rotate: back });
    this.streaks.explode(1, x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 18);
    this.wisps.explode(1, x, y);
  }

  /** Small motes shed from the cloak while running / falling fast. */
  trailWisp(x, y) {
    this.wisps.explode(1, x, y);
  }

  /** Colour-cycling ghost copy of the hero (dash / spin trail). */
  afterimage(sprite, alpha = 0.55, duration = 260) {
    const tint = TRAIL_COLORS[this.trailIndex++ % TRAIL_COLORS.length];
    const img = this.scene.add
      .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setOrigin(sprite.originX, sprite.originY)
      .setFlipX(sprite.flipX)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setRotation(sprite.rotation)
      .setTintFill(tint)
      .setAlpha(alpha)
      .setDepth(DEPTH.PLAYER - 1)
      .setBlendMode(ADD);
    this.scene.tweens.add({ targets: img, alpha: 0, scaleX: sprite.scaleX * 0.85, scaleY: sprite.scaleY * 0.85, duration, onComplete: () => img.destroy() });
  }

  hurt(x, y) {
    this.sparks.explode(this.n(10), x, y);
    this.flare(x, y, 0xff6a8a, 0.7, 200);
    this.shake(140, 0.008);
  }

  death(x, y) {
    this.explosion(x, y, COLORS.death, 1.2);
    this.deathFx.explode(this.n(36), x, y);
    this.shake(260, 0.014);
    this.scene.cameras.main.flash(140, 90, 60, 160);
  }

  respawn(x, y) {
    this.ring.explode(this.n(18), x, y);
    this.bloom(x, y, COLORS.rim, 1.3, 420, 0.7);
    this.shockwave(x, y, 0x5fd3ff, 50, 400);
    this.twinkle.setParticleTint(0xc8b6ff);
    this.twinkle.explode(this.n(10), x, y + 14);
  }

  checkpoint(x, y) {
    this.sparks.explode(this.n(24), x, y);
    this.ring.explode(this.n(16), x, y);
    this.shockwave(x, y, 0x5fd3ff, 80, 500);
    this.bloom(x, y, 0x5fd3ff, 2, 600, 0.6);
    this.twinkle.setParticleTint(0x9fefff);
    this.twinkle.explode(this.n(14), x, y);
  }

  victory(x, y) {
    this.gold.explode(this.n(60), x, y);
    this.explosion(x, y, COLORS.gold, 1.4);
    this.twinkle.setParticleTint(COLORS.gold);
    this.twinkle.explode(this.n(24), x, y);
    for (let i = 1; i <= 3; i++) {
      this.scene.time.delayedCall(i * 160, () => {
        this.shockwave(x, y, i % 2 ? COLORS.gold : COLORS.rim, 70 + i * 30, 500);
        this.twinkle.explode(this.n(8), x + (Math.random() - 0.5) * 40, y);
      });
    }
  }

  // ------------------------------------------------------------------- world
  rubble(x, y, n = 8) {
    if (!this.rubbleFx) {
      this.rubbleFx = this.scene.add
        .particles(0, 0, 'chunk', {
          emitting: false,
          lifespan: { min: 400, max: 800 },
          speed: { min: 60, max: 220 },
          angle: { min: 200, max: 340 },
          rotate: { min: 0, max: 360 },
          scale: { start: 1, end: 0.4 },
          alpha: { start: 1, end: 0 },
          gravityY: 900,
        })
        .setDepth(DEPTH.FX);
    }
    this.rubbleFx.explode(this.n(n), x, y);
    Audio.sfx('crumble');
  }

  /** Burst used for enemies being defeated and boss hits. */
  pop(x, y, tint = 0xffffff, n = 22) {
    if (!this.popFx) {
      this.popFx = this.scene.add
        .particles(0, 0, 'dot', {
          emitting: false,
          lifespan: { min: 300, max: 700 },
          speed: { min: 80, max: 300 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.3, end: 0 },
          alpha: { start: 1, end: 0 },
          gravityY: 300,
          blendMode: ADD,
        })
        .setDepth(DEPTH.FX);
    }
    this.popFx.setParticleTint(tint);
    this.popFx.explode(this.n(n), x, y);
    this.ring.explode(this.n(10), x, y);
    if (n >= 14) {
      this.shockwave(x, y, tint, 30 + n, 320);
      this.flare(x, y, 0xffffff, 0.4 + n / 60, 220);
    }
    if (n >= 30) this.bloom(x, y, tint, 1.2 + n / 40, 420, 0.7);
  }

  stomp(x, y) {
    this.ring.explode(this.n(12), x, y);
    this.dust.explode(this.n(8), x, y);
    this.shockwave(x, y, COLORS.rim, 40, 260, 0.35);
    this.shake(90, 0.005);
  }

  shard(x, y) {
    this.sparks.explode(this.n(20), x, y);
    this.gold.explode(this.n(14), x, y);
    this.flare(x, y, 0xb8f4ff, 1, 320);
    this.bloom(x, y, 0x5fd3ff, 1.5, 420, 0.7);
    this.shockwave(x, y, 0x5fd3ff, 56, 380);
    this.twinkle.setParticleTint(0x9fefff);
    this.twinkle.explode(this.n(10), x, y);
  }

  /** Glowing motes that fly from a collected shard into the HUD counter (screen space). */
  shardToHud(x, y, hudX = 28, hudY = 78) {
    const s = this.scene;
    const cam = s.cameras.main;
    const sx = x - cam.scrollX;
    const sy = y - cam.scrollY;
    const count = QUALITY.low ? 2 : 4;
    for (let i = 0; i < count; i++) {
      const glow = s.add.image(sx, sy, 'glow').setScrollFactor(0).setDepth(DEPTH.VIGNETTE + 1).setBlendMode(ADD).setTint(0x7fe8ff).setScale(0.22).setAlpha(0.9);
      const spark = s.add.image(sx, sy, 'fx-sparkle').setScrollFactor(0).setDepth(DEPTH.VIGNETTE + 1).setBlendMode(ADD).setScale(1.3);
      const c = { t: 0 };
      const mx = sx + (Math.random() - 0.5) * 160;
      const my = Math.min(sy, hudY) - 60 - Math.random() * 80;
      s.tweens.add({
        targets: c,
        t: 1,
        delay: 120 + i * 70,
        duration: 650,
        ease: 'Cubic.in',
        onUpdate: () => {
          const t = c.t;
          const u = 1 - t;
          const px = u * u * sx + 2 * u * t * mx + t * t * hudX;
          const py = u * u * sy + 2 * u * t * my + t * t * hudY;
          glow.setPosition(px, py);
          spark.setPosition(px, py).setAngle(t * 360);
        },
        onComplete: () => {
          glow.destroy();
          spark.destroy();
          if (i === count - 1) {
            const f = s.add.image(hudX, hudY, 'fx-flare').setScrollFactor(0).setDepth(DEPTH.VIGNETTE + 1).setBlendMode(ADD).setTint(0xb8f4ff).setScale(0.3);
            s.tweens.add({ targets: f, scale: 0.9, alpha: 0, angle: 45, duration: 320, onComplete: () => f.destroy() });
          }
        },
      });
    }
  }

  secret(x, y) {
    this.gold.explode(this.n(24), x, y);
    this.shockwave(x, y, COLORS.gold, 90, 600);
    this.twinkle.setParticleTint(COLORS.gold);
    this.twinkle.explode(this.n(14), x, y);
  }

  bossHit(x, y, tint) {
    this.pop(x, y, tint, 36);
    this.explosion(x, y, tint, 1);
    this.shake(200, 0.012);
    this.scene.cameras.main.flash(90, 255, 255, 255);
  }

  impact(x, y, tint = 0xffffff) {
    this.pop(x, y, tint, 10);
    this.flare(x, y, tint, 0.45, 160);
    Audio.sfx('impact');
  }
}
