import Phaser from 'phaser';
import { TILE, DEPTH } from '../config.js';

const Rect = Phaser.Geom.Rectangle;

/** Ping-pong mover with smooth (sinusoidal) easing between two points. */
export class PathMover {
  constructor(from, to, period, phase = 0) {
    this.from = from;
    this.to = to;
    this.period = period;
    this.phase = phase;
  }

  at(t) {
    const k = 0.5 - 0.5 * Math.cos(Math.PI * 2 * (t / this.period + this.phase));
    return { x: this.from.x + (this.to.x - this.from.x) * k, y: this.from.y + (this.to.y - this.from.y) * k };
  }
}

/** Constant-speed circular motion. Negative period = counter-clockwise. */
export class OrbitMover {
  constructor(center, radius, period, phase = 0) {
    this.center = center;
    this.radius = radius;
    this.period = period;
    this.phase = phase;
  }

  at(t) {
    const a = Math.PI * 2 * (t / this.period + this.phase);
    return { x: this.center.x + Math.cos(a) * this.radius, y: this.center.y + Math.sin(a) * this.radius };
  }
}

/** Returns where we are in an on/off cycle: { on, warn } */
export function cycleState(t, on, off, phase, warn) {
  const period = on + off;
  const local = ((((t / period + phase) % 1) + 1) % 1) * period;
  if (local < on) return { on: true, warn: false, k: local / on };
  return { on: false, warn: local > period - warn, k: (local - on) / off };
}

const circleHitsRect = (cx, cy, r, b) => {
  const nx = Phaser.Math.Clamp(cx, b.x, b.right);
  const ny = Phaser.Math.Clamp(cy, b.y, b.bottom);
  return (nx - cx) ** 2 + (ny - cy) ** 2 < r * r;
};

// ---------------------------------------------------------------------- saw
export class Saw {
  constructor(scene, def) {
    this.def = def;
    if (def.kind === 'orbit') {
      const c = { x: def.x * TILE, y: def.y * TILE };
      this.mover = new OrbitMover(c, def.radius * TILE, def.period, def.phase);
      // Chain links from the pivot to the blade.
      this.links = [];
      const n = Math.max(2, Math.round(def.radius * 2));
      for (let i = 0; i <= n; i++) this.links.push(scene.add.image(c.x, c.y, 'chain').setDepth(DEPTH.HAZARDS - 0.5));
      this.pivot = c;
    } else {
      this.mover = new PathMover({ x: def.x * TILE, y: def.y * TILE }, { x: def.toX * TILE, y: def.toY * TILE }, def.period, def.phase);
    }
    const p = this.mover.at(0);
    this.sprite = scene.add.image(p.x, p.y, 'saw').setDepth(DEPTH.HAZARDS);
    this.radius = 18;
  }

  update(t, dt) {
    const p = this.mover.at(t);
    this.sprite.setPosition(p.x, p.y);
    this.sprite.rotation += dt * 9;
    if (this.links) {
      const n = this.links.length - 1;
      this.links.forEach((l, i) => l.setPosition(this.pivot.x + ((p.x - this.pivot.x) * i) / n, this.pivot.y + ((p.y - this.pivot.y) * i) / n));
    }
  }

  hits(b) {
    return circleHitsRect(this.sprite.x, this.sprite.y, this.radius, b);
  }

  reset() {}
}

// ------------------------------------------------------- laser + electric
/**
 * Timed beam between two points. kind 'laser' = red beam from an emitter;
 * kind 'electric' = crackling arc between two posts.
 */
export class Beam {
  constructor(scene, def, kind) {
    this.scene = scene;
    this.def = def;
    this.kind = kind;
    this.horizontal = def.dir === 'h';
    const len = def.len * TILE;
    this.len = len;
    this.base = { x: def.x * TILE, y: def.y * TILE };
    if (def.toX !== undefined || def.toY !== undefined) {
      this.mover = new PathMover(this.base, { x: (def.toX ?? def.x) * TILE, y: (def.toY ?? def.y) * TILE }, def.period || 4, def.movePhase || 0);
    }
    this.thickness = kind === 'laser' ? 10 : 14;
    this.gfx = scene.add.graphics().setDepth(DEPTH.HAZARDS).setBlendMode(Phaser.BlendModes.ADD);
    const tex = kind === 'laser' ? 'emitter' : 'epost';
    this.capA = scene.add.image(0, 0, tex).setDepth(DEPTH.HAZARDS + 0.1);
    this.capB = scene.add.image(0, 0, tex).setDepth(DEPTH.HAZARDS + 0.1);
    if (kind === 'laser') this.capB.setScale(0.6).setAlpha(0.7);
    this.color = kind === 'laser' ? 0xff3a5c : 0x7fe0ff;
    this.rect = new Rect();
    this.active = false;
    this.flicker = 0;
  }

  update(t, dt) {
    const d = this.def;
    const st = d.always ? { on: true, warn: false } : cycleState(t, d.on, d.off, d.phase, d.warn);
    this.active = st.on;
    const o = this.mover ? this.mover.at(t) : this.base;
    // Beam runs through the centre of its tile row/column.
    let ax, ay, bx, by;
    if (this.horizontal) {
      ax = o.x;
      ay = o.y + TILE / 2;
      bx = o.x + this.len;
      by = ay;
      this.rect.setTo(ax, ay - this.thickness / 2, this.len, this.thickness);
    } else {
      ax = o.x + TILE / 2;
      ay = o.y;
      bx = ax;
      by = o.y + this.len;
      this.rect.setTo(ax - this.thickness / 2, ay, this.thickness, this.len);
    }
    this.capA.setPosition(ax, ay);
    this.capB.setPosition(bx, by);
    const g = this.gfx;
    g.clear();
    this.flicker += dt;
    if (st.on) {
      if (this.kind === 'laser') {
        const w = 9 + Math.sin(this.flicker * 40) * 1.5;
        g.lineStyle(w + 8, this.color, 0.18).lineBetween(ax, ay, bx, by);
        g.lineStyle(w, this.color, 0.55).lineBetween(ax, ay, bx, by);
        g.lineStyle(3, 0xffe0e6, 1).lineBetween(ax, ay, bx, by);
      } else {
        this.drawBolt(g, ax, ay, bx, by, 9, 0.9, 3);
        this.drawBolt(g, ax, ay, bx, by, 6, 0.5, 2);
        g.lineStyle(14, this.color, 0.12).lineBetween(ax, ay, bx, by);
      }
    } else if (st.warn) {
      const a = 0.25 + 0.35 * Math.abs(Math.sin(this.flicker * 30));
      if (this.kind === 'laser') g.lineStyle(2, this.color, a).lineBetween(ax, ay, bx, by);
      else this.drawBolt(g, ax, ay, bx, by, 4, a, 1);
    }
    this.capA.setTint(st.on ? 0xffffff : 0x9a8fb0);
    this.capB.setTint(st.on ? 0xffffff : 0x9a8fb0);
  }

  drawBolt(g, ax, ay, bx, by, jitter, alpha, width) {
    const segs = Math.max(4, Math.round(this.len / 14));
    g.lineStyle(width, this.color, alpha);
    g.beginPath();
    g.moveTo(ax, ay);
    for (let i = 1; i < segs; i++) {
      const k = i / segs;
      const j = (Math.random() - 0.5) * jitter * 2;
      g.lineTo(ax + (bx - ax) * k + (this.horizontal ? 0 : j), ay + (by - ay) * k + (this.horizontal ? j : 0));
    }
    g.lineTo(bx, by);
    g.strokePath();
  }

  hits(b) {
    return this.active && Phaser.Geom.Rectangle.Overlaps(this.rect, b);
  }

  reset() {}
}

// ------------------------------------------------------------ falling rock
export class FallingRock {
  constructor(scene, level, def, fx) {
    this.scene = scene;
    this.level = level;
    this.fx = fx;
    this.home = { x: (def.x + 0.5) * TILE, y: def.y * TILE + 15 };
    this.sprite = scene.add.image(this.home.x, this.home.y, 'rock').setDepth(DEPTH.HAZARDS);
    this.rect = new Rect();
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.vy = 0;
    this.y = this.home.y;
    this.sprite.setPosition(this.home.x, this.y).setVisible(true).setAlpha(1).setAngle(0);
  }

  update(t, dt, player) {
    switch (this.state) {
      case 'idle': {
        if (player && !player.dead) {
          const pb = player.body;
          const below = pb.top > this.y + 10 && pb.top - this.y < TILE * 12;
          if (below && Math.abs(pb.center.x - this.home.x) < 44) {
            this.state = 'shake';
            this.timer = 0.32;
          }
        }
        break;
      }
      case 'shake':
        this.timer -= dt;
        this.sprite.x = this.home.x + Math.sin(this.timer * 90) * 2;
        if (this.timer <= 0) {
          this.state = 'fall';
          this.sprite.x = this.home.x;
        }
        break;
      case 'fall':
        this.vy = Math.min(this.vy + 1700 * dt, 900);
        this.y += this.vy * dt;
        this.sprite.y = this.y;
        this.sprite.angle += dt * 60;
        if (this.level.isSolidAt(this.home.x, this.y + 14) || this.y > this.level.heightPx + 40) {
          this.fx.rubble(this.home.x, this.y + 10);
          this.state = 'gone';
          this.timer = 2.2;
          this.sprite.setVisible(false);
        }
        break;
      case 'gone':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.reset();
          this.sprite.setAlpha(0);
          this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 300 });
        }
        break;
      default:
    }
    this.rect.setTo(this.home.x - 12, this.y - 12, 24, 24);
  }

  hits(b) {
    return this.state !== 'gone' && Phaser.Geom.Rectangle.Overlaps(this.rect, b);
  }
}
