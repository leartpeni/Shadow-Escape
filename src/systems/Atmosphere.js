import Phaser from 'phaser';
import { GAME_W, GAME_H, TILE, DEPTH, QUALITY } from '../config.js';
import { THEMES } from '../levels/themes.js';
import { ensureBackdrop } from '../gfx/themeTextures.js';
import { DECOR } from '../gfx/decorTextures.js';
import { mulberry32 } from '../gfx/util.js';
import Audio from './Audio.js';

const ADD = Phaser.BlendModes.ADD;
const PAD = 24; // overscan so camera shake never reveals screen edges
const W = GAME_W + PAD * 2;

/**
 * World atmosphere: sky, parallax silhouettes, light shafts, drifting fog, ambient particles,
 * weather, environment props and screen-space grading. Everything is cheap (tile sprites,
 * a handful of additive images, one particle emitter) so it runs well on mobile.
 */
export default class Atmosphere {
  constructor(scene, level, themeKey) {
    this.scene = scene;
    this.level = level;
    this.key = ensureBackdrop(scene, themeKey);
    this.a = THEMES[this.key].atmo;
    this.low = QUALITY.low;
    this.t = 0;
    this.createSky();
    this.createLayers();
    this.createShafts();
    this.createFog();
    this.createAmbient();
    this.createDecor();
    this.createOverlays();
    if (this.a.ambient === 'rain') this.nextBolt = 2.5;
  }

  // ---------------------------------------------------------------- creation
  screenImage(key, depth) {
    return this.scene.add.image(-PAD, -PAD, key).setOrigin(0).setScrollFactor(0).setDepth(depth).setDisplaySize(W, GAME_H + PAD * 2);
  }

  layer(base, depth) {
    const key = `${base}_${this.key}`;
    if (!this.scene.textures.exists(key)) return null;
    const h = Math.min(GAME_H, this.scene.textures.get(key).getSourceImage().height);
    return this.scene.add.tileSprite(-PAD, 0, W, h, key).setOrigin(0).setScrollFactor(0).setDepth(depth);
  }

  createSky() {
    const s = this.scene;
    const a = this.a;
    this.sky = this.screenImage(`sky_${this.key}`, DEPTH.SKY);
    const sx = (x) => -PAD + (x * W) / GAME_W;
    const sy = (y) => -PAD + (y * (GAME_H + PAD * 2)) / GAME_H;
    this.skyFx = [];
    const orb = a.moon || a.eclipse;
    if (orb) {
      const halo = s.add.image(sx(orb.x), sy(orb.y), 'glow').setScrollFactor(0).setDepth(DEPTH.SKY_FX).setBlendMode(ADD)
        .setTint(orb.halo || orb.color).setScale(orb.r / 22).setAlpha(0.35);
      this.skyFx.push({ img: halo, kind: 'pulse', base: 0.35 });
      if (a.eclipse) {
        const ring = s.add.image(sx(orb.x), sy(orb.y), 'fx-ring').setScrollFactor(0).setDepth(DEPTH.SKY_FX).setBlendMode(ADD)
          .setTint(orb.color).setScale((orb.r * 2.3) / 64).setAlpha(0.4);
        this.skyFx.push({ img: ring, kind: 'spin', base: 0.4 });
        const flare = s.add.image(sx(orb.x), sy(orb.y), 'fx-flare').setScrollFactor(0).setDepth(DEPTH.SKY_FX).setBlendMode(ADD)
          .setTint(0xffd0ff).setScale(2.2).setAlpha(0.35);
        this.skyFx.push({ img: flare, kind: 'spinSlow', base: 0.35 });
      }
    }
    if (a.ambient === 'rain') {
      // lightning: a flash plane behind the silhouettes + an occasional bolt
      this.flash = s.add.rectangle(-PAD, -PAD, W, GAME_H + PAD * 2, 0xe6c8ff).setOrigin(0).setScrollFactor(0)
        .setDepth(DEPTH.SKY_FX).setBlendMode(ADD).setAlpha(0);
      this.bolt = s.add.graphics().setScrollFactor(0).setDepth(DEPTH.SKY_FX).setBlendMode(ADD);
      this.frontFlash = s.add.rectangle(-PAD, -PAD, W, GAME_H + PAD * 2, 0xd8c0ff).setOrigin(0).setScrollFactor(0)
        .setDepth(DEPTH.GRADE).setBlendMode(ADD).setAlpha(0);
    }
  }

  createLayers() {
    this.far = this.layer('bg_far', DEPTH.FAR);
    this.mid = this.layer('bg_mid', DEPTH.MID);
    this.near = this.layer('bg_near', DEPTH.NEAR);
    if (this.near) this.near.setAlpha(0.95);
    this.ceil = this.a.ceil ? this.layer('bg_ceil', DEPTH.CEIL) : null;
    if (this.ceil) this.ceilH = this.ceil.height;
  }

  createShafts() {
    this.shafts = [];
    const kinds = { forest: 4, ruins: 5, crystal: 4, void: 2 };
    let n = kinds[this.key] || 0;
    if (this.low) n = Math.ceil(n / 2);
    const r = mulberry32(31);
    for (let i = 0; i < n; i++) {
      const img = this.scene.add.image(0, -40, 'fx-shaft').setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.MID + 1)
        .setBlendMode(ADD).setTint(this.a.shaft);
      const w = 50 + r() * 110;
      img.setDisplaySize(w, GAME_H * (0.8 + r() * 0.5));
      img.setAngle(this.key === 'ruins' ? -18 + r() * 36 : 10 + r() * 14);
      this.shafts.push({
        img,
        x: (this.key === 'ruins' ? (this.a.opening.x - 160) + r() * 320 : r() * GAME_W) + (i * GAME_W) / n * 0.3,
        base: 0.07 + r() * 0.09,
        speed: 0.3 + r() * 0.5,
        phase: r() * 6,
      });
    }
  }

  createFog() {
    const s = this.scene;
    const a = this.a;
    const H = this.level.heightPx;
    const mk = (depth, alpha, y, scrollY, scale) => {
      const t = s.add.tileSprite(-PAD, y, W, 128, 'fx-fog').setOrigin(0, 0.5).setScrollFactor(0, scrollY).setDepth(depth)
        .setTint(a.fog).setAlpha(alpha);
      t.tileScaleX = scale;
      t.tileScaleY = 1;
      t.setScale(1, scale);
      return t;
    };
    this.fog = [
      { img: mk(DEPTH.FOG_BACK, a.fogAlpha[0], GAME_H - 110, 0, 1.6), k: 0.18, drift: 8, screen: true },
      { img: mk(DEPTH.FOG_MID, a.fogAlpha[1], H - 70, 1, 1.3), k: 0.6, drift: 14 },
    ];
    if (!this.low) this.fog.push({ img: mk(DEPTH.FOG_FRONT, a.fogAlpha[2], H - 20, 1, 1.1), k: 1.25, drift: 22 });
  }

  createAmbient() {
    const s = this.scene;
    const a = this.a;
    const cam = s.cameras.main;
    const q = this.low ? 2 : 1;
    const rx = (pad = 60) => ({ onEmit: () => cam.scrollX - pad + Math.random() * (GAME_W + pad * 2) });
    const ry = (pad = 40) => ({ onEmit: () => cam.scrollY - pad + Math.random() * (GAME_H + pad * 2) });
    const twinkle = (p, k, t) => Math.sin(t * Math.PI) * (0.55 + 0.45 * Math.sin(t * 24 + p.x * 0.1));
    let cfg;
    switch (a.ambient) {
      case 'fireflies':
        cfg = {
          x: rx(), y: ry(), lifespan: { min: 4000, max: 7000 }, frequency: 160 * q,
          speedX: { min: -14, max: 14 }, speedY: { min: -16, max: 8 },
          scale: { min: 0.35, max: 0.7 }, alpha: { onUpdate: twinkle },
          tint: [0xd8ff7a, a.glowA, 0xeaffb0],
        };
        break;
      case 'embers':
        cfg = {
          x: rx(), y: { onEmit: () => cam.scrollY + GAME_H * (0.3 + Math.random() * 0.8) }, lifespan: { min: 3000, max: 5500 },
          frequency: 110 * q, speedX: { min: -12, max: 28 }, speedY: { min: -90, max: -35 },
          scale: { start: 0.55, end: 0 }, alpha: { onUpdate: twinkle }, tint: [a.glowA, 0xffd080, 0xff6a2a],
        };
        break;
      case 'rain':
        cfg = {
          texture: 'fx-streak', x: rx(160), y: { onEmit: () => cam.scrollY - 30 - Math.random() * 60 },
          lifespan: 750, frequency: 14 * q, quantity: 2,
          speedX: -150, speedY: { min: 850, max: 1000 }, rotate: 99.5,
          scaleX: { min: 0.6, max: 1 }, scaleY: 0.5, alpha: { min: 0.15, max: 0.35 }, tint: 0xc6b4e0, blend: false,
        };
        break;
      case 'sparkles':
        cfg = {
          texture: 'fx-sparkle', x: rx(), y: ry(), lifespan: { min: 2500, max: 4500 }, frequency: 120 * q,
          speedX: { min: -8, max: 8 }, speedY: { min: -18, max: 4 }, rotate: { min: 0, max: 90 },
          scale: { min: 0.3, max: 0.75 }, alpha: { onUpdate: twinkle }, tint: [a.glowA, a.glowB, 0xffffff],
        };
        break;
      default:
        cfg = {
          x: rx(), y: ry(), lifespan: { min: 4000, max: 8000 }, frequency: 130 * q,
          speedX: { min: -10, max: 10 }, speedY: { min: -30, max: -8 },
          scale: { start: 0.9, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [a.glowA, a.glowB, 0xffffff],
        };
    }
    const { texture = 'dot', blend = true, ...rest } = cfg;
    this.ambient = s.add.particles(0, 0, texture, { ...rest, blendMode: blend ? ADD : Phaser.BlendModes.NORMAL })
      .setDepth(a.ambient === 'rain' ? DEPTH.FOG_FRONT : DEPTH.FX - 0.2);
    this.ambient.fastForward(3000);
  }

  // ------------------------------------------------------------------- decor
  createDecor() {
    this.decor = [];
    const def = DECOR[this.key];
    if (!def) return;
    const L = this.level;
    const d = L.def;
    const s = this.scene;
    const r = mulberry32(d.width * 7919 + d.height * 31 + (d.name || '').length);
    const dens = this.low ? 0.5 : 1;
    // keep the play-relevant spots readable
    const blocked = new Set();
    const block = (x, y, rx = 1) => {
      for (let i = -rx; i <= rx; i++) blocked.add(`${x + i},${y}`);
    };
    d.spikes.forEach((sp) => block(sp.x, sp.y, 0));
    d.checkpoints.forEach((c) => block(c.x, c.y));
    block(d.exit.x, d.exit.y, 2);
    block(d.start.x, d.start.y);
    const fake = d.fake;
    const air = (x, y) => x >= 0 && x < d.width && y >= 0 && y < d.height && !d.grid[y][x] && !(fake && fake[y][x]);

    for (let y = 1; y < d.height; y++) {
      for (let x = 0; x < d.width; x++) {
        if (!d.grid[y][x]) continue;
        // floor prop sitting on this tile
        if (air(x, y - 1) && air(x, y - 2) && !blocked.has(`${x},${y - 1}`) && r() < 0.16 * dens) {
          const i = Math.floor(r() * def.floor.length);
          this.addDecor(`decoF_${this.key}`, i, def.floor[i], (x + 0.5) * TILE + (r() - 0.5) * 8, y * TILE, 1, r);
        }
        // ceiling prop hanging below this tile
        if (air(x, y + 1) && air(x, y + 2) && !blocked.has(`${x},${y + 1}`) && r() < 0.1 * dens) {
          const i = Math.floor(r() * def.ceil.length);
          this.addDecor(`decoC_${this.key}`, i, def.ceil[i], (x + 0.5) * TILE, (y + 1) * TILE, 0, r);
        }
      }
    }
    s.events.once('shutdown', () => (this.decor = []));
  }

  addDecor(tex, frame, meta, x, y, originY, r) {
    const s = this.scene;
    const img = s.add.image(x, y, tex, String(frame)).setOrigin(0.5, originY).setDepth(DEPTH.DECOR_BACK);
    if (r() < 0.5) img.setFlipX(true);
    const item = { img, meta, x, y, phase: r() * 10, glow: null };
    if (meta.glow) {
      item.glow = s.add.image(x, y + meta.gy, 'glow').setTint(meta.glow).setBlendMode(ADD).setDepth(DEPTH.DECOR_BACK)
        .setScale(meta.flicker ? 0.6 : 0.4).setAlpha(0.45);
    }
    this.decor.push(item);
  }

  // ---------------------------------------------------------------- overlays
  createOverlays() {
    const a = this.a;
    this.grade = this.screenImage('fx-grade', DEPTH.GRADE).setTint(a.grade).setBlendMode(ADD).setAlpha(0.13);
    if (!this.low) {
      this.light = this.scene.add.image(0, 0, 'fx-light').setScrollFactor(0).setDepth(DEPTH.LIGHT).setScale(9).setAlpha(0.32);
    }
    this.vignette = this.screenImage('fx-vignette', DEPTH.VIGNETTE).setAlpha(0.9);
  }

  /** Brief world-wide light burst (e.g. boss defeat). */
  pulse(color = 0xffffff, alpha = 0.25, duration = 500) {
    const img = this.screenImage('fx-grade', DEPTH.GRADE).setTint(color).setBlendMode(ADD).setAlpha(alpha);
    this.scene.tweens.add({ targets: img, alpha: 0, duration, onComplete: () => img.destroy() });
  }

  // ------------------------------------------------------------------ update
  update(dt, player) {
    this.t += dt;
    const t = this.t;
    const cam = this.scene.cameras.main;
    const sxp = cam.scrollX;
    const maxScrollY = Math.max(0, this.level.heightPx - GAME_H);
    const fromBottom = Math.max(0, maxScrollY - cam.scrollY);
    const clamp = Phaser.Math.Clamp;

    if (this.far) {
      this.far.tilePositionX = sxp * 0.1 + t * (this.key === 'void' ? 3 : 0);
      this.far.y = clamp(fromBottom * 0.1, 0, GAME_H);
    }
    if (this.mid) {
      this.mid.tilePositionX = sxp * 0.22;
      this.mid.y = clamp(fromBottom * 0.18, 0, GAME_H);
    }
    if (this.near) {
      this.near.tilePositionX = sxp * 0.38;
      this.near.y = clamp(fromBottom * 0.3, 0, GAME_H);
    }
    if (this.ceil) {
      this.ceil.tilePositionX = sxp * 0.45;
      this.ceil.y = -clamp(cam.scrollY * 0.3, 0, this.ceilH);
    }

    for (const f of this.skyFx) {
      if (f.kind === 'pulse') f.img.setAlpha(f.base * (0.85 + 0.15 * Math.sin(t * 0.9)));
      else if (f.kind === 'spin') f.img.rotation = t * 0.12;
      else f.img.rotation = -t * 0.05;
    }

    const span = GAME_W + 240;
    for (const sh of this.shafts) {
      const x = (((sh.x - sxp * 0.2) % span) + span) % span - 120;
      sh.img.x = x;
      sh.img.y = -40 + clamp(fromBottom * 0.18, 0, GAME_H);
      sh.img.setAlpha(sh.base * (0.6 + 0.4 * Math.sin(t * sh.speed + sh.phase)));
    }

    for (const f of this.fog) {
      f.img.tilePositionX = (sxp * f.k + t * f.drift) / f.img.tileScaleX;
      if (f.screen) f.img.y = GAME_H - 110 + clamp(fromBottom * 0.18, 0, GAME_H);
    }

    if (this.light && player) {
      const s = player.sprite;
      this.light.setPosition(s.x - cam.scrollX, s.y - 20 - cam.scrollY);
      this.light.setAlpha(player.dead ? 0.15 : 0.32);
    }

    if (this.flash) this.updateLightning(dt);
    this.updateDecor(t, cam);
  }

  updateDecor(t, cam) {
    const x0 = cam.scrollX - 64;
    const x1 = cam.scrollX + GAME_W + 64;
    const y0 = cam.scrollY - 64;
    const y1 = cam.scrollY + GAME_H + 64;
    for (const d of this.decor) {
      if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
      const m = d.meta;
      const ph = d.phase;
      if (m.sway) d.img.rotation = Math.sin(t * 1.6 + ph) * 0.06;
      if (m.float) {
        const off = Math.sin(t * 1.8 + ph) * 3;
        d.img.y = d.y + off;
        if (d.glow) d.glow.y = d.y + m.gy + off;
      }
      if (d.glow) {
        const k = m.flicker
          ? 0.75 + 0.15 * Math.sin(t * 13 + ph) + 0.1 * Math.sin(t * 29 + ph * 2)
          : 0.75 + 0.25 * Math.sin(t * 1.4 + ph);
        d.glow.setAlpha(0.5 * k);
      }
    }
  }

  updateLightning(dt) {
    this.nextBolt -= dt;
    if (this.nextBolt > 0) return;
    this.nextBolt = 5 + Math.random() * 7;
    const s = this.scene;
    s.tweens.killTweensOf([this.flash, this.frontFlash, this.bolt]);
    this.flash.setAlpha(0);
    s.tweens.chain({
      targets: this.flash,
      tweens: [
        { alpha: 0.55, duration: 50 },
        { alpha: 0.12, duration: 70 },
        { alpha: 0.45, duration: 40 },
        { alpha: 0, duration: 600, ease: 'Quad.out' },
      ],
    });
    this.frontFlash.setAlpha(0.1);
    s.tweens.add({ targets: this.frontFlash, alpha: 0, duration: 450, ease: 'Quad.out' });
    // jagged bolt from the sky
    const g = this.bolt;
    g.clear();
    let x = 80 + Math.random() * (GAME_W - 160);
    let y = -10;
    const pts = [[x, y]];
    while (y < GAME_H * 0.6) {
      x += (Math.random() - 0.5) * 50;
      y += 20 + Math.random() * 30;
      pts.push([x, y]);
    }
    for (const [w, c, al] of [[6, 0xb57bff, 0.35], [2, 0xffffff, 0.95]]) {
      g.lineStyle(w, c, al);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.strokePath();
    }
    g.setAlpha(1);
    s.tweens.add({ targets: g, alpha: 0, duration: 380, ease: 'Quad.in' });
    s.time.delayedCall(250 + Math.random() * 700, () => Audio.sfx('thunder'));
  }
}
