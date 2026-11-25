import { frameStrip, glowDot, rgba, mix, mulberry32 } from './util.js';
import { THEMES } from '../levels/themes.js';

/** Floor props: 32x40, origin bottom-centre. Ceiling props: 32x56, origin top-centre. */
export const DECO_F = { w: 32, h: 40 };
export const DECO_C = { w: 32, h: 56 };
const TAU = Math.PI * 2;

/**
 * Per-theme decoration metadata. glow: light colour (or null), gy: glow offset from the
 * sprite origin (negative = up), flicker: torch-like flicker, sway: wind sway, float: bob.
 */
export const DECOR = {
  forest: {
    floor: [
      { draw: 'mush', glow: 0x5ff6ff, gy: -12 },
      { draw: 'fern', sway: true },
      { draw: 'grass', sway: true },
      { draw: 'flower', glow: 0xb57bff, gy: -20, sway: true },
    ],
    ceil: [{ draw: 'vine', sway: true }, { draw: 'glowvine', glow: 0x5ff6ff, gy: 44, sway: true }, { draw: 'roots' }],
  },
  ruins: {
    floor: [
      { draw: 'candles', glow: 0xff9a3a, gy: -20, flicker: true },
      { draw: 'rubble' },
      { draw: 'urn' },
      { draw: 'skull' },
    ],
    ceil: [{ draw: 'stalactite' }, { draw: 'chainLamp', glow: 0xff9a3a, gy: 46, flicker: true, sway: true }, { draw: 'roots' }],
  },
  castle: {
    floor: [
      { draw: 'candelabra', glow: 0xffb060, gy: -32, flicker: true },
      { draw: 'bones' },
      { draw: 'tomb' },
      { draw: 'rose', glow: 0xff4a6a, gy: -14 },
    ],
    ceil: [{ draw: 'chainLamp', glow: 0xff5a9a, gy: 46, flicker: true, sway: true }, { draw: 'web' }, { draw: 'banner', sway: true }],
  },
  crystal: {
    floor: [
      { draw: 'cluster', glow: 0x5ff0ff, gy: -12, tint: 0x5ff0ff },
      { draw: 'cluster', glow: 0xa070ff, gy: -12, tint: 0xa070ff },
      { draw: 'shard', glow: 0x9fefff, gy: -16, tint: 0x9fefff },
      { draw: 'pebbles', glow: 0x5ff0ff, gy: -4 },
    ],
    ceil: [
      { draw: 'icicle', glow: 0x5ff0ff, gy: 34, tint: 0x5ff0ff },
      { draw: 'icicle', glow: 0xa070ff, gy: 34, tint: 0xa070ff },
      { draw: 'drip', glow: 0x9fefff, gy: 20 },
    ],
  },
  void: {
    floor: [
      { draw: 'rune', glow: 0xff6af0, gy: -22, float: true },
      { draw: 'tendril', sway: true },
      { draw: 'obelisk', glow: 0x6ae8ff, gy: -26 },
      { draw: 'eye', glow: 0xff6af0, gy: -18, sway: true },
    ],
    ceil: [{ draw: 'tendrilDown', sway: true }, { draw: 'floatShard', glow: 0x6ae8ff, gy: 30, float: true }, { draw: 'roots' }],
  },
};

export default function makeDecorTextures(scene) {
  Object.entries(DECOR).forEach(([key, def]) => {
    const t = THEMES[key];
    const pal = { dark: t.atmo.near, rim: t.atmo.nearRim, mid: t.atmo.mid, tile: t.tile, a: t.atmo };
    const f = {};
    def.floor.forEach((d, i) => (f[i] = d));
    frameStrip(scene, `decoF_${key}`, DECO_F.w, DECO_F.h, f, (ctx, ox, d, name) =>
      FLOOR[d.draw](ctx, ox + 16, DECO_F.h, pal, d, mulberry32(7 + Number(name) * 31 + key.length)));
    const c = {};
    def.ceil.forEach((d, i) => (c[i] = d));
    frameStrip(scene, `decoC_${key}`, DECO_C.w, DECO_C.h, c, (ctx, ox, d, name) =>
      CEIL[d.draw](ctx, ox + 16, 0, pal, d, mulberry32(91 + Number(name) * 17 + key.length)));
  });
}

function fillPoly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function crystalShape(ctx, x, by, h, w, lean, c) {
  fillPoly(ctx, [x - w / 2, by, x - w / 2 + lean * 0.3, by - h * 0.75, x + lean, by - h, x + w / 2 + lean * 0.3, by - h * 0.75, x + w / 2, by], mix(c, '#000000', 0.55));
  fillPoly(ctx, [x + lean, by - h, x + w / 2 + lean * 0.3, by - h * 0.75, x + w / 2, by, x, by], mix(c, '#ffffff', 0.05));
  ctx.fillStyle = rgba(0xffffff, 0.7);
  ctx.fillRect(x + lean * 0.6 - 0.5, by - h * 0.85, 1, h * 0.4);
}

// -------------------------------------------------------------------- floor
const FLOOR = {
  mush(ctx, x, by, p, d, r) {
    glowDot(ctx, x, by - 12, 16, d.glow, 0.35);
    for (const [dx, h, cw] of [[-6, 9, 5], [3, 14, 7], [10, 6, 4]]) {
      ctx.fillStyle = '#c8e8e0';
      ctx.fillRect(x + dx - 1, by - h, 2, h);
      ctx.fillStyle = rgba(d.glow, 0.95);
      ctx.beginPath();
      ctx.ellipse(x + dx, by - h, cw, cw * 0.6, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(x + dx - 1, by - h - cw * 0.4, 2, 1);
    }
  },
  fern(ctx, x, by, p) {
    ctx.strokeStyle = p.tile.topDetail;
    ctx.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      const ex = x + k * 6;
      const ey = by - 22 + Math.abs(k) * 4;
      ctx.quadraticCurveTo(x + k * 2, by - 18, ex, ey);
      ctx.stroke();
      ctx.fillStyle = p.tile.top;
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        const lx = x + (ex - x) * t;
        const ly = by + (ey - by) * t;
        ctx.fillRect(lx - 3, ly, 6, 1.5);
      }
    }
  },
  grass(ctx, x, by, p, d, r) {
    for (let i = 0; i < 9; i++) {
      const bx = x - 12 + i * 3;
      const h = 8 + r() * 14;
      ctx.fillStyle = i % 2 ? p.tile.top : p.tile.topDetail;
      ctx.beginPath();
      ctx.moveTo(bx - 1.5, by);
      ctx.quadraticCurveTo(bx, by - h * 0.6, bx + (r() - 0.5) * 6, by - h);
      ctx.lineTo(bx + 1.5, by);
      ctx.fill();
    }
  },
  flower(ctx, x, by, p, d) {
    ctx.strokeStyle = p.tile.topDetail;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, by);
    ctx.quadraticCurveTo(x - 4, by - 10, x, by - 20);
    ctx.stroke();
    glowDot(ctx, x, by - 20, 12, d.glow, 0.6);
    ctx.fillStyle = rgba(d.glow, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 3, by - 20 + Math.sin(a) * 3, 2.5, 1.5, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, by - 21, 2, 2);
  },
  candles(ctx, x, by, p, d) {
    glowDot(ctx, x, by - 18, 18, d.glow, 0.4);
    for (const [dx, h] of [[-7, 8], [0, 14], [6, 10]]) {
      ctx.fillStyle = '#d8c8a0';
      ctx.fillRect(x + dx - 2, by - h, 4, h);
      ctx.fillStyle = '#b09870';
      ctx.fillRect(x + dx + 1, by - h, 1, h);
      ctx.fillStyle = rgba(0xffd080, 1);
      ctx.beginPath();
      ctx.ellipse(x + dx, by - h - 3, 1.5, 3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + dx - 0.5, by - h - 3, 1, 2);
    }
  },
  rubble(ctx, x, by, p, d, r) {
    for (let i = 0; i < 5; i++) {
      const rx = x - 12 + r() * 24;
      const s = 3 + r() * 5;
      fillPoly(ctx, [rx - s, by, rx - s * 0.6, by - s, rx + s * 0.5, by - s * 1.1, rx + s, by], i % 2 ? p.tile.side : p.tile.inner);
      ctx.fillStyle = rgba(p.tile.topLine, 0.4);
      ctx.fillRect(rx - s * 0.5, by - s, s, 1);
    }
  },
  urn(ctx, x, by, p) {
    ctx.fillStyle = p.tile.side;
    ctx.beginPath();
    ctx.moveTo(x - 4, by);
    ctx.quadraticCurveTo(x - 12, by - 10, x - 5, by - 18);
    ctx.lineTo(x - 4, by - 22);
    ctx.lineTo(x + 4, by - 22);
    ctx.lineTo(x + 5, by - 18);
    ctx.quadraticCurveTo(x + 12, by - 10, x + 4, by);
    ctx.fill();
    ctx.fillStyle = rgba(p.tile.topLine, 0.55);
    ctx.fillRect(x - 6, by - 16, 1.5, 8);
    ctx.fillStyle = p.tile.top;
    ctx.fillRect(x - 9, by - 12, 18, 1.5);
  },
  skull(ctx, x, by, p) {
    ctx.fillStyle = '#cdbf9e';
    ctx.beginPath();
    ctx.arc(x, by - 7, 6, 0, TAU);
    ctx.fill();
    ctx.fillRect(x - 3.5, by - 4, 7, 4);
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(x - 3.5, by - 8, 2.5, 2.5);
    ctx.fillRect(x + 1, by - 8, 2.5, 2.5);
    ctx.fillRect(x - 0.5, by - 4.5, 1, 1.5);
    ctx.fillStyle = '#b8a888';
    ctx.fillRect(x + 6, by - 2, 9, 2);
  },
  candelabra(ctx, x, by, p, d) {
    glowDot(ctx, x, by - 32, 20, d.glow, 0.35);
    ctx.fillStyle = '#3a3048';
    ctx.fillRect(x - 6, by - 2, 12, 2);
    ctx.fillRect(x - 1, by - 24, 2, 23);
    ctx.fillRect(x - 9, by - 24, 18, 2);
    for (const dx of [-8, 0, 8]) {
      const h = dx ? 5 : 8;
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(x + dx - 1.5, by - 24 - h, 3, h);
      ctx.fillStyle = rgba(d.glow, 1);
      ctx.beginPath();
      ctx.ellipse(x + dx, by - 27 - h, 1.4, 2.6, 0, 0, TAU);
      ctx.fill();
    }
  },
  bones(ctx, x, by) {
    ctx.fillStyle = '#c4bcae';
    ctx.save();
    ctx.translate(x - 4, by - 3);
    ctx.rotate(-0.3);
    ctx.fillRect(-7, -1, 14, 2);
    ctx.fillRect(-8, -2, 3, 4);
    ctx.fillRect(5, -2, 3, 4);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x + 7, by - 5, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#18101a';
    ctx.fillRect(x + 4.5, by - 6, 2, 2);
    ctx.fillRect(x + 8, by - 6, 2, 2);
  },
  tomb(ctx, x, by, p) {
    ctx.fillStyle = p.tile.side;
    ctx.beginPath();
    ctx.moveTo(x - 8, by);
    ctx.lineTo(x - 8, by - 18);
    ctx.arc(x, by - 18, 8, Math.PI, 0);
    ctx.lineTo(x + 8, by);
    ctx.fill();
    ctx.fillStyle = rgba(p.tile.topLine, 0.5);
    ctx.fillRect(x - 8, by - 18, 1, 18);
    ctx.fillStyle = p.tile.speckB;
    ctx.fillRect(x - 1, by - 20, 2, 9);
    ctx.fillRect(x - 4, by - 17, 8, 2);
  },
  rose(ctx, x, by, p, d) {
    ctx.strokeStyle = '#2a1a22';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, by);
    ctx.quadraticCurveTo(x + 4, by - 7, x, by - 14);
    ctx.stroke();
    glowDot(ctx, x, by - 14, 10, d.glow, 0.6);
    ctx.fillStyle = rgba(d.glow, 1);
    ctx.beginPath();
    ctx.arc(x, by - 14, 3, 0, TAU);
    ctx.fill();
  },
  cluster(ctx, x, by, p, d) {
    glowDot(ctx, x, by - 10, 18, d.tint, 0.35);
    crystalShape(ctx, x - 6, by, 14, 6, -4, d.tint);
    crystalShape(ctx, x + 6, by, 12, 6, 4, d.tint);
    crystalShape(ctx, x, by, 22, 8, 1, d.tint);
  },
  shard(ctx, x, by, p, d) {
    glowDot(ctx, x, by - 14, 16, d.tint, 0.35);
    crystalShape(ctx, x, by, 30, 9, 3, d.tint);
    crystalShape(ctx, x + 7, by, 10, 5, 4, d.tint);
  },
  pebbles(ctx, x, by, p, d, r) {
    for (let i = 0; i < 6; i++) {
      const px = x - 12 + r() * 24;
      glowDot(ctx, px, by - 2, 5, d.glow, 0.5);
      ctx.fillStyle = rgba(0xdffaff, 0.9);
      ctx.fillRect(px - 1, by - 3, 2, 2);
    }
  },
  rune(ctx, x, by, p, d) {
    const cy = by - 22;
    glowDot(ctx, x, cy, 16, d.glow, 0.35);
    fillPoly(ctx, [x - 7, cy, x - 3, cy - 10, x + 6, cy - 8, x + 8, cy + 4, x, cy + 10, x - 6, cy + 6], p.dark);
    ctx.strokeStyle = rgba(d.glow, 1);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 2, cy - 5);
    ctx.lineTo(x + 2, cy);
    ctx.lineTo(x - 2, cy + 5);
    ctx.moveTo(x + 2, cy - 5);
    ctx.lineTo(x + 2, cy + 5);
    ctx.stroke();
  },
  tendril(ctx, x, by, p) {
    ctx.strokeStyle = p.rim;
    ctx.lineWidth = 2;
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + k * 5, by);
      ctx.bezierCurveTo(x + k * 9, by - 10, x - k * 4, by - 18, x + k * 6, by - 28 + Math.abs(k) * 8);
      ctx.stroke();
    }
  },
  obelisk(ctx, x, by, p, d) {
    glowDot(ctx, x, by - 26, 14, d.glow, 0.4);
    fillPoly(ctx, [x - 5, by, x - 3, by - 30, x, by - 36, x + 3, by - 30, x + 5, by], p.dark);
    fillPoly(ctx, [x, by - 36, x + 3, by - 30, x + 5, by, x + 1, by], p.rim);
    ctx.fillStyle = rgba(d.glow, 1);
    ctx.fillRect(x - 1, by - 28, 2, 3);
    ctx.fillRect(x - 1, by - 20, 2, 2);
    ctx.fillRect(x - 1, by - 13, 2, 2);
  },
  eye(ctx, x, by, p, d) {
    ctx.strokeStyle = p.rim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, by);
    ctx.quadraticCurveTo(x - 6, by - 9, x, by - 16);
    ctx.stroke();
    glowDot(ctx, x, by - 18, 12, d.glow, 0.5);
    ctx.fillStyle = '#ffe8ff';
    ctx.beginPath();
    ctx.ellipse(x, by - 18, 4, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#20002a';
    ctx.fillRect(x - 1, by - 19.5, 2, 3);
  },
};

// ------------------------------------------------------------------ ceiling
const CEIL = {
  vine(ctx, x, y, p, d, r) {
    ctx.strokeStyle = p.tile.topDetail;
    ctx.lineWidth = 1.5;
    for (const k of [-5, 4]) {
      const len = 30 + r() * 22;
      ctx.beginPath();
      ctx.moveTo(x + k, y);
      ctx.quadraticCurveTo(x + k + 5, y + len / 2, x + k - 2, y + len);
      ctx.stroke();
      ctx.fillStyle = p.tile.top;
      for (let t = 6; t < len; t += 6) {
        ctx.beginPath();
        ctx.ellipse(x + k + 2 + (t % 12 ? 2 : -2), y + t, 2.5, 1.4, t % 12 ? 0.5 : -0.5, 0, TAU);
        ctx.fill();
      }
    }
  },
  glowvine(ctx, x, y, p, d) {
    CEIL.vine(ctx, x, y, p, d, mulberry32(3));
    glowDot(ctx, x - 6, y + 44, 10, d.glow, 0.7);
    glowDot(ctx, x + 3, y + 36, 8, d.glow, 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 7, y + 43, 2, 2);
    ctx.fillRect(x + 2, y + 35, 2, 2);
  },
  roots(ctx, x, y, p, d, r) {
    ctx.strokeStyle = p.rim;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const sx = x - 10 + r() * 20;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.bezierCurveTo(sx + 6, y + 8, sx - 6, y + 16, sx + (r() - 0.5) * 10, y + 14 + r() * 18);
      ctx.stroke();
    }
  },
  stalactite(ctx, x, y, p) {
    fillPoly(ctx, [x - 9, y, x - 3, y + 26, x, y + 40, x + 3, y + 24, x + 8, y], p.tile.inner);
    fillPoly(ctx, [x - 9, y, x - 6, y + 12, x - 2, y + 8, x, y + 40, x - 3, y + 26], p.tile.side);
    fillPoly(ctx, [x + 9, y, x + 12, y + 14, x + 14, y], p.tile.inner);
  },
  chainLamp(ctx, x, y, p, d) {
    ctx.strokeStyle = '#4a4050';
    ctx.lineWidth = 1.5;
    for (let cy = y; cy < y + 36; cy += 5) {
      ctx.beginPath();
      ctx.ellipse(x, cy + 2.5, 1.5, 2.5, 0, 0, TAU);
      ctx.stroke();
    }
    glowDot(ctx, x, y + 46, 16, d.glow, 0.55);
    fillPoly(ctx, [x - 5, y + 38, x + 5, y + 38, x + 4, y + 52, x - 4, y + 52], '#2a2230');
    ctx.fillStyle = rgba(d.glow, 0.95);
    ctx.fillRect(x - 3, y + 41, 6, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y + 44, 2, 4);
  },
  web(ctx, x, y) {
    ctx.strokeStyle = 'rgba(220,210,240,0.35)';
    ctx.lineWidth = 0.8;
    const cx = x - 16;
    for (let i = 0; i < 5; i++) {
      const a = (i / 4) * (Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + Math.cos(a) * 30, y + Math.sin(a) * 30);
      ctx.stroke();
    }
    for (const rr of [9, 17, 25]) {
      ctx.beginPath();
      ctx.arc(cx, y, rr, 0, Math.PI / 2);
      ctx.stroke();
    }
  },
  banner(ctx, x, y, p) {
    ctx.fillStyle = '#3a3048';
    ctx.fillRect(x - 10, y + 2, 20, 2);
    fillPoly(ctx, [x - 8, y + 4, x + 8, y + 4, x + 8, y + 44, x, y + 36, x - 8, y + 44], '#5a1030');
    fillPoly(ctx, [x + 4, y + 4, x + 8, y + 4, x + 8, y + 44, x + 4, y + 40], '#3a0820');
    ctx.fillStyle = '#d0a040';
    ctx.beginPath();
    ctx.arc(x, y + 18, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5a1030';
    ctx.beginPath();
    ctx.arc(x + 1.5, y + 17, 3, 0, TAU);
    ctx.fill();
  },
  icicle(ctx, x, y, p, d) {
    glowDot(ctx, x, y + 30, 14, d.tint, 0.4);
    fillPoly(ctx, [x - 6, y, x, y + 40, x + 6, y], mix(d.tint, '#000000', 0.5));
    fillPoly(ctx, [x, y, x, y + 40, x + 6, y], mix(d.tint, '#ffffff', 0.1));
    fillPoly(ctx, [x + 7, y, x + 10, y + 18, x + 13, y], mix(d.tint, '#000000', 0.35));
    fillPoly(ctx, [x - 8, y, x - 10, y + 14, x - 12, y], mix(d.tint, '#000000', 0.35));
  },
  drip(ctx, x, y, p, d) {
    fillPoly(ctx, [x - 4, y, x, y + 14, x + 4, y], p.tile.side);
    glowDot(ctx, x, y + 20, 7, d.glow, 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 1.5, 2.2, 0, 0, TAU);
    ctx.fill();
  },
  tendrilDown(ctx, x, y, p) {
    ctx.strokeStyle = p.rim;
    ctx.lineWidth = 2;
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + k * 5, y);
      ctx.bezierCurveTo(x + k * 9, y + 14, x - k * 6, y + 26, x + k * 4, y + 40 - Math.abs(k) * 10);
      ctx.stroke();
    }
  },
  floatShard(ctx, x, y, p, d) {
    glowDot(ctx, x, y + 30, 14, d.glow, 0.45);
    fillPoly(ctx, [x, y + 18, x + 5, y + 30, x, y + 44, x - 5, y + 30], p.dark);
    fillPoly(ctx, [x, y + 18, x + 5, y + 30, x, y + 44], p.rim);
    ctx.fillStyle = rgba(d.glow, 1);
    ctx.fillRect(x - 1, y + 28, 2, 4);
  },
};
