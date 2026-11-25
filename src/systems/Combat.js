import Phaser from 'phaser';
import { DEPTH } from '../config.js';

const Rect = Phaser.Geom.Rectangle;

/**
 * Hostile projectiles and telegraphed area attacks used by enemies and bosses.
 * Everything in here kills the player on contact (see hits()).
 */
export default class Combat {
  constructor(scene, level, fx) {
    this.scene = scene;
    this.level = level;
    this.fx = fx;
    this.projectiles = [];
    this.zones = [];
    this.gfx = scene.add.graphics().setDepth(DEPTH.FX - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tmp = new Rect();
    this.gen = 0;
  }

  /**
   * Fires a projectile.
   * opts: { texture='orb', tint, radius=9, gravity=0, life=6, bounce=false, pierce=false (ignore tiles),
   *         homing=0 (turn rate rad/s), speed (for homing), scale, spin, onLand(x, y) }
   */
  shoot(x, y, vx, vy, opts = {}) {
    const o = { texture: 'orb', tint: 0xffffff, radius: 9, gravity: 0, life: 6, pierce: false, homing: 0, scale: 1, spin: 0, ...opts };
    const sprite = this.scene.add.image(x, y, o.texture).setTint(o.tint).setScale(o.scale).setDepth(DEPTH.FX - 1);
    if (o.texture === 'orb') sprite.setBlendMode(Phaser.BlendModes.ADD);
    const p = { x, y, vx, vy, ...o, sprite, age: 0, dead: false };
    this.projectiles.push(p);
    return p;
  }

  /** Aimed shot from (x, y) towards (tx, ty). */
  aim(x, y, tx, ty, speed, opts) {
    const a = Math.atan2(ty - y, tx - x);
    return this.shoot(x, y, Math.cos(a) * speed, Math.sin(a) * speed, opts);
  }

  /** Ring of `n` projectiles. */
  ring(x, y, n, speed, offset = 0, opts) {
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      this.shoot(x, y, Math.cos(a) * speed, Math.sin(a) * speed, opts);
    }
  }

  /** Lob a projectile so it lands at (tx, floorY) after `time` seconds under `gravity`. */
  lob(x, y, tx, ty, time, gravity, opts) {
    const vx = (tx - x) / time;
    const vy = (ty - y - 0.5 * gravity * time * time) / time;
    return this.shoot(x, y, vx, vy, { gravity, ...opts });
  }

  /**
   * Shockwave travelling along the floor (floorY = top of the floor in px).
   * It dies when it hits a wall or runs off a ledge.
   */
  shockwave(x, floorY, dir, speed = 340, tint = 0xffffff) {
    const sprite = this.scene.add.image(x, floorY, 'wave').setOrigin(0.5, 1).setTint(tint).setDepth(DEPTH.FX - 1).setBlendMode(Phaser.BlendModes.ADD);
    sprite.setFlipX(dir < 0);
    const p = { kind: 'wave', x, y: floorY - 14, vx: dir * speed, vy: 0, gravity: 0, radius: 0, life: 8, sprite, age: 0, dead: false, floorY, pierce: true };
    p.rect = new Rect(x - 10, floorY - 30, 20, 30);
    this.projectiles.push(p);
    return p;
  }

  /**
   * Telegraphed vertical column hazard. x = centre, from y0 to y1.
   * warn seconds of flashing outline, then `active` seconds of lethal light.
   */
  pillar(x, y0, y1, width = 48, warn = 0.8, active = 0.5, color = 0xffffff) {
    const z = { kind: 'pillar', rect: new Rect(x - width / 2, y0, width, y1 - y0), warn, active, color, age: 0 };
    this.zones.push(z);
    return z;
  }

  /** Telegraphed horizontal beam across x0..x1 centred at y. */
  beam(y, x0, x1, height = 36, warn = 0.8, active = 0.5, color = 0xffffff) {
    const z = { kind: 'beam', rect: new Rect(x0, y - height / 2, x1 - x0, height), warn, active, color, age: 0 };
    this.zones.push(z);
    return z;
  }

  /** Rock/goo/shard rain: telegraphed drops at each x, falling from y. */
  rain(xs, y, opts = {}) {
    const o = { warn: 0.6, texture: 'rock', tint: 0xffffff, radius: 12, scale: 0.9, floorY: null, ...opts };
    const gen = this.gen;
    xs.forEach((x, i) => {
      if (o.floorY) {
        const z = { kind: 'marker', rect: new Rect(x - 14, o.floorY - 6, 28, 6), warn: o.warn + i * 0.04, active: 0, color: o.tint, age: 0, harmless: true };
        this.zones.push(z);
      }
      this.scene.time.delayedCall((o.warn + i * 0.04) * 1000, () => {
        if (gen !== this.gen) return;
        this.shoot(x, y, 0, 60, { texture: o.texture, tint: o.tint, radius: o.radius, gravity: 1300, scale: o.scale, spin: 4 });
      });
    });
  }

  /** Harmless floor telegraph showing where something will land. */
  marker(x, y, w, t, color = 0xffffff) {
    this.zones.push({ kind: 'marker', rect: new Rect(x - w / 2, y - 6, w, 6), warn: t, active: 0, color, age: 0, harmless: true });
  }

  update(dt, player) {
    const lvl = this.level;
    for (const p of this.projectiles) {
      p.age += dt;
      if (p.homing && player && !player.dead) {
        const want = Math.atan2(player.body.center.y - p.y, player.body.center.x - p.x);
        const cur = Math.atan2(p.vy, p.vx);
        const diff = Phaser.Math.Angle.Wrap(want - cur);
        const na = cur + Phaser.Math.Clamp(diff, -p.homing * dt, p.homing * dt);
        const sp = p.speed || Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(na) * sp;
        p.vy = Math.sin(na) * sp;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'wave') {
        // Follows the floor; dies at walls or ledges.
        const ahead = p.x + Math.sign(p.vx) * 12;
        if (lvl.isSolidAt(ahead, p.floorY - 10) || !lvl.isSolidAt(ahead, p.floorY + 6)) p.dead = true;
        p.rect.setTo(p.x - 10, p.floorY - 30, 20, 30);
        p.sprite.setPosition(p.x, p.floorY);
        p.sprite.setScale(1, 0.9 + Math.sin(p.age * 30) * 0.1);
      } else {
        p.sprite.setPosition(p.x, p.y);
        if (p.spin) p.sprite.rotation += p.spin * dt;
        if (!p.pierce && lvl.isSolidAt(p.x, p.y)) {
          p.dead = true;
          this.fx.impact(p.x, p.y, p.tint);
          if (p.onLand) p.onLand(p.x, p.y);
        }
      }
      if (p.age > p.life || p.y > lvl.heightPx + 64 || p.x < -64 || p.x > lvl.widthPx + 64) p.dead = true;
    }
    // In-place compaction (no per-frame array allocation).
    let n = 0;
    for (const p of this.projectiles) {
      if (p.dead) p.sprite.destroy();
      else this.projectiles[n++] = p;
    }
    this.projectiles.length = n;

    const g = this.gfx;
    if (!this.zones.length) {
      if (this.gfxDirty) g.clear();
      this.gfxDirty = false;
      return;
    }
    this.gfxDirty = true;
    g.clear();
    for (const z of this.zones) {
      z.age += dt;
      const r = z.rect;
      if (z.age < z.warn) {
        const blink = 0.25 + 0.35 * Math.abs(Math.sin(z.age * 18));
        g.lineStyle(2, z.color, blink).strokeRectShape(r);
        g.fillStyle(z.color, 0.06 + 0.05 * (z.age / z.warn)).fillRectShape(r);
      } else if (z.age < z.warn + z.active) {
        const k = (z.age - z.warn) / z.active;
        g.fillStyle(z.color, 0.25 * (1 - k) + 0.1).fillRectShape(r);
        const inset = z.kind === 'pillar' ? r.width * 0.3 : r.height * 0.3;
        if (z.kind === 'pillar') g.fillStyle(0xffffff, 0.85 * (1 - k)).fillRect(r.x + inset, r.y, r.width - inset * 2, r.height);
        else g.fillStyle(0xffffff, 0.85 * (1 - k)).fillRect(r.x, r.y + inset, r.width, r.height - inset * 2);
        if (!z.fired) {
          z.fired = true;
          if (z.kind !== 'marker') this.scene.cameras.main.shake(120, 0.004);
        }
      }
    }
    n = 0;
    for (const z of this.zones) if (z.age < z.warn + z.active) this.zones[n++] = z;
    this.zones.length = n;
  }

  hits(b) {
    for (const p of this.projectiles) {
      if (p.kind === 'wave') {
        if (Rect.Overlaps(p.rect, b)) return true;
        continue;
      }
      const nx = Phaser.Math.Clamp(p.x, b.x, b.right);
      const ny = Phaser.Math.Clamp(p.y, b.y, b.bottom);
      if ((nx - p.x) ** 2 + (ny - p.y) ** 2 < p.radius * p.radius) return true;
    }
    for (const z of this.zones) {
      if (z.harmless || z.age < z.warn) continue;
      // Shrink the lethal area slightly so grazing the fading edge is forgiven.
      const r = z.rect;
      this.tmp.setTo(r.x + 4, r.y + 4, r.width - 8, r.height - 8);
      if (Rect.Overlaps(this.tmp, b)) return true;
    }
    return false;
  }

  /** Removes everything (on player death / boss defeat). */
  clear() {
    this.gen++;
    this.projectiles.forEach((p) => p.sprite.destroy());
    this.projectiles = [];
    this.zones = [];
    this.gfx.clear();
  }
}
