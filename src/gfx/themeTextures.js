import { TILE, GAME_W, GAME_H, QUALITY } from '../config.js';
import { THEMES } from '../levels/themes.js';
import { canvasTex, mulberry32, rgba, mix, glowDot, wrapX } from './util.js';
import makeDecorTextures from './decorTextures.js';

const W = GAME_W;
const H = GAME_H;
const TAU = Math.PI * 2;
const CEIL_H = 190;

/**
 * Eager textures: tiles_<theme>, decor strips and the shared atmosphere textures.
 * The large backdrop textures (sky / far / mid / near / ceiling) are generated lazily per
 * theme with ensureBackdrop() and kept in a small LRU cache to stay mobile-memory friendly.
 */
export default function makeThemeTextures(scene) {
  Object.entries(THEMES).forEach(([key, theme], ti) => makeTiles(scene, key, theme, ti));
  makeDecorTextures(scene);
  makeAtmoTextures(scene);
}

// ------------------------------------------------------------------ backdrops
const loaded = [];
const PARTS = ['sky', 'bg_far', 'bg_mid', 'bg_near', 'bg_ceil'];

/** Generates (once) the backdrop textures for a theme. Returns the theme key actually used. */
export function ensureBackdrop(scene, key) {
  const theme = THEMES[key] ? key : 'forest';
  const i = loaded.indexOf(theme);
  if (i >= 0) loaded.splice(i, 1);
  if (i < 0 || !scene.textures.exists(`sky_${theme}`)) {
    const t = THEMES[theme];
    const ti = Object.keys(THEMES).indexOf(theme);
    makeSky(scene, theme, t.atmo, ti);
    LAYERS.forEach((cfg, L) => makeLayer(scene, theme, t.atmo, ti, L, cfg));
    if (t.atmo.ceil) makeCeiling(scene, theme, t.atmo, ti);
  }
  loaded.push(theme);
  const max = QUALITY.low ? 2 : 3;
  while (loaded.length > max) {
    const old = loaded.shift();
    for (const p of PARTS) if (scene.textures.exists(`${p}_${old}`)) scene.textures.remove(`${p}_${old}`);
  }
  return theme;
}

/**
 * Small persistent level-select strip per theme (sky + silhouettes), composited from the
 * full backdrop canvases so it survives backdrop LRU eviction.
 */
export function ensureThumb(scene, key) {
  const theme = THEMES[key] ? key : 'forest';
  const k = `thumb_${theme}`;
  if (scene.textures.exists(k)) return k;
  ensureBackdrop(scene, theme);
  const TW = 480;
  const TH = 84;
  const { tex, ctx } = canvasTex(scene, k, TW, TH);
  const src = (p) => scene.textures.get(`${p}_${theme}`).getSourceImage();
  // Crop the horizon band of each layer.
  const y0 = H * 0.42;
  const bandH = H * 0.5;
  ctx.drawImage(src('sky'), 0, y0 - H * 0.2, W, bandH, 0, 0, TW, TH);
  for (const p of ['bg_far', 'bg_mid', 'bg_near']) ctx.drawImage(src(p), 0, y0, W, bandH, 0, 0, TW, TH);
  tex.refresh();
  return k;
}

// ---------------------------------------------------------------------- tiles
function makeTiles(scene, key, theme, ti) {
  const t = theme.tile;
  const glow = theme.atmo ? theme.atmo.glowA : 0x9ff0ff;
  // 16 autotile variants indexed by exposed-edge bitmask: 1=top 2=right 4=bottom 8=left
  const { tex, ctx } = canvasTex(scene, `tiles_${key}`, TILE * 16, TILE);
  for (let m = 0; m < 16; m++) {
    const ox = m * TILE;
    const rnd = mulberry32(1337 + m + ti * 101);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, 0, TILE, TILE);
    ctx.clip();

    const bg = ctx.createLinearGradient(0, 0, 0, TILE);
    bg.addColorStop(0, t.inner);
    bg.addColorStop(1, t.base);
    ctx.fillStyle = bg;
    ctx.fillRect(ox, 0, TILE, TILE);

    drawTilePattern(ctx, ox, t, rnd, glow);

    // fine grain noise
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rnd() > 0.5 ? rgba(t.speckA, 0.55) : rgba(t.speckB, 0.7);
      ctx.fillRect(ox + Math.floor(rnd() * 31), Math.floor(rnd() * 31), 1 + Math.floor(rnd() * 2), 1);
    }

    // exposed sides: light catches the left, right falls into shadow
    if (m & 8) {
      const g = ctx.createLinearGradient(ox, 0, ox + 6, 0);
      g.addColorStop(0, rgba(t.side, 0.95));
      g.addColorStop(1, rgba(t.side, 0));
      ctx.fillStyle = g;
      ctx.fillRect(ox, 0, 6, TILE);
    }
    if (m & 2) {
      const g = ctx.createLinearGradient(ox + TILE - 7, 0, ox + TILE, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(ox + TILE - 7, 0, 7, TILE);
      ctx.fillStyle = rgba(t.side, 0.6);
      ctx.fillRect(ox + TILE - 1, 0, 1, TILE);
    }
    if (m & 4) {
      const g = ctx.createLinearGradient(0, TILE - 10, 0, TILE);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = g;
      ctx.fillRect(ox, TILE - 10, TILE, 10);
      ctx.fillStyle = t.bottom;
      ctx.fillRect(ox, TILE - 2, TILE, 2);
      if (t.pattern === 'crystal' || t.pattern === 'void') {
        ctx.fillStyle = rgba(glow, 0.35);
        ctx.fillRect(ox + 2, TILE - 1, TILE - 4, 1);
      }
    }
    if (m & 1) drawTileTop(ctx, ox, t, rnd, glow, m);
    ctx.restore();
  }
  tex.refresh();
}

function drawTilePattern(ctx, ox, t, rnd, glow) {
  if (t.pattern === 'brick') {
    ctx.fillStyle = rgba(t.speckB, 0.9);
    ctx.fillRect(ox, 15, TILE, 2);
    ctx.fillRect(ox + 12, 0, 2, 15);
    ctx.fillRect(ox + 26, 17, 2, 15);
    ctx.fillRect(ox + 4, 17, 2, 15);
    ctx.fillStyle = rgba(t.speckA, 0.8);
    ctx.fillRect(ox + 1, 1, 10, 1);
    ctx.fillRect(ox + 15, 1, 14, 1);
    ctx.fillRect(ox + 7, 18, 18, 1);
    // chipped corners
    ctx.fillStyle = rgba(t.speckB, 0.6);
    ctx.fillRect(ox + 10, 12, 2, 2);
    ctx.fillRect(ox + 24, 28, 2, 2);
  } else if (t.pattern === 'crystal') {
    for (let i = 0; i < 2; i++) {
      const x = ox + 3 + rnd() * 20;
      const top = 6 + rnd() * 12;
      ctx.fillStyle = rgba(t.speckA, 0.9);
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x + 4 + rnd() * 4, top);
      ctx.lineTo(x + 10, 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(glow, 0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 5, 31);
      ctx.lineTo(x + 6, top + 4);
      ctx.stroke();
    }
    if (rnd() > 0.5) glowDot(ctx, ox + 8 + rnd() * 16, 10 + rnd() * 16, 5, glow, 0.3);
  } else if (t.pattern === 'void') {
    ctx.strokeStyle = rgba(glow, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    let x = ox + 4 + rnd() * 10;
    let y = 6 + rnd() * 10;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += 3 + rnd() * 5;
      y += (rnd() - 0.4) * 8;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = rnd() > 0.6 ? rgba(glow, 0.5) : t.speckA;
      ctx.fillRect(ox + 3 + Math.floor(rnd() * 25), 3 + Math.floor(rnd() * 25), 1, 1);
    }
  } else {
    // forest soil: pebbles and roots
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(t.speckA, 0.9);
      ctx.beginPath();
      ctx.ellipse(ox + 5 + rnd() * 22, 6 + rnd() * 22, 2 + rnd() * 2, 1.4 + rnd(), 0, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(t.speckB, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const rx = ox + rnd() * 30;
    ctx.moveTo(rx, 0);
    ctx.quadraticCurveTo(rx + 6, 10, rx + (rnd() - 0.5) * 12, 18 + rnd() * 10);
    ctx.stroke();
  }
}

function drawTileTop(ctx, ox, t, rnd, glow, m) {
  const g = ctx.createLinearGradient(0, 0, 0, 12);
  g.addColorStop(0, rgba(t.top, 0.95));
  g.addColorStop(1, rgba(t.top, 0));
  ctx.fillStyle = g;
  ctx.fillRect(ox, 0, TILE, 12);

  if (t.pattern === 'speck') {
    // grass cap with hanging moss
    ctx.fillStyle = t.top;
    ctx.fillRect(ox, 0, TILE, 4);
    for (let i = 0; i < 5; i++) {
      const x = ox + rnd() * 30;
      ctx.beginPath();
      ctx.ellipse(x, 4, 2 + rnd() * 2, 2 + rnd() * 3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = t.topDetail;
    for (let i = 0; i < 4; i++) ctx.fillRect(ox + 2 + Math.floor(rnd() * 28), 4, 1, 3 + Math.floor(rnd() * 5));
    ctx.fillStyle = t.topLine;
    for (let x = 0; x < TILE; x += 2) ctx.fillRect(ox + x, 0, 2, rnd() > 0.5 ? 2 : 1);
    if (rnd() > 0.6) glowDot(ctx, ox + 6 + rnd() * 20, 3, 3, glow, 0.6);
  } else if (t.pattern === 'brick') {
    ctx.fillStyle = t.top;
    ctx.fillRect(ox, 0, TILE, 5);
    ctx.fillStyle = t.topDetail;
    ctx.fillRect(ox, 5, TILE, 1);
    ctx.fillStyle = t.topLine;
    ctx.fillRect(ox, 0, TILE, 1);
    ctx.fillStyle = rgba(t.topLine, 0.45);
    ctx.fillRect(ox, 1, TILE, 1);
    ctx.fillStyle = t.topDetail;
    for (let i = 0; i < 2; i++) ctx.fillRect(ox + 3 + Math.floor(rnd() * 26), 1, 2, 2);
  } else if (t.pattern === 'crystal') {
    ctx.fillStyle = t.top;
    ctx.fillRect(ox, 0, TILE, 3);
    ctx.save();
    ctx.shadowColor = rgba(glow, 1);
    ctx.shadowBlur = 6;
    ctx.fillStyle = t.topLine;
    ctx.fillRect(ox, 0, TILE, 2);
    for (let i = 0; i < 2; i++) {
      const x = ox + 3 + rnd() * 24;
      ctx.beginPath();
      ctx.moveTo(x, 3);
      ctx.lineTo(x + 2, 7 + rnd() * 5);
      ctx.lineTo(x + 4, 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else {
    // void: magenta energy edge with light drips
    ctx.fillStyle = t.top;
    ctx.fillRect(ox, 0, TILE, 3);
    ctx.save();
    ctx.shadowColor = rgba(glow, 1);
    ctx.shadowBlur = 5;
    ctx.fillStyle = t.topLine;
    ctx.fillRect(ox, 0, TILE, 1.5);
    for (let i = 0; i < 2; i++) ctx.fillRect(ox + 3 + Math.floor(rnd() * 26), 1, 1, 3 + Math.floor(rnd() * 7));
    ctx.restore();
  }
  // corner rounding where the top meets an exposed side
  if (m & 8) {
    ctx.fillStyle = rgba(t.topLine, 0.85);
    ctx.fillRect(ox, 0, 1, 4);
  }
}

// ------------------------------------------------------------------------ sky
function makeSky(scene, key, a, ti) {
  const { tex, ctx } = canvasTex(scene, `sky_${key}`, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  a.sky.forEach((c, i) => g.addColorStop(i / (a.sky.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = mulberry32(42 + ti * 7);

  // soft nebula / cloud glows
  ctx.globalCompositeOperation = 'lighter';
  const neb = key === 'void' ? 9 : key === 'crystal' ? 6 : 4;
  for (let i = 0; i < neb; i++) {
    const c = i % 2 ? a.glowB : a.glowA;
    const x = r() * W;
    const y = H * (0.1 + r() * 0.6);
    const rad = 90 + r() * 200;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.8, 0.7);
    const ng = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    const al = key === 'void' ? 0.13 : 0.06;
    ng.addColorStop(0, rgba(c, al));
    ng.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = ng;
    ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';

  // stars
  for (let i = 0; i < a.stars; i++) {
    const x = r() * W;
    const y = r() * H * 0.72;
    const b = 0.25 + r() * 0.7;
    const tint = r() > 0.8 ? a.glowA : r() > 0.7 ? a.glowB : 0xffffff;
    ctx.fillStyle = rgba(tint, b * (1 - y / (H * 0.9)));
    const s = r() > 0.92 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
    if (s === 2 && r() > 0.5) glowDot(ctx, x + 1, y + 1, 6, tint, 0.25);
  }

  if (key === 'forest') {
    drawMoon(ctx, a.moon, r, false);
    cloudBands(ctx, r, mix(a.sky[2], '#000000', 0.2), 0.55, 5, H * 0.18, H * 0.42);
  } else if (key === 'castle') {
    drawMoon(ctx, a.moon, r, true);
    cloudBands(ctx, r, a.sky[1], 0.75, 7, H * 0.12, H * 0.5);
  } else if (key === 'void') {
    const e = a.eclipse;
    glowDot(ctx, e.x, e.y, e.r * 4.5, e.color, 0.35);
    glowDot(ctx, e.x, e.y, e.r * 2, 0xffffff, 0.25);
    ctx.save();
    ctx.shadowColor = rgba(e.color, 1);
    ctx.shadowBlur = 24;
    ctx.strokeStyle = rgba(0xffe0ff, 0.95);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#020005';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r - 1.5, 0, TAU);
    ctx.fill();
  } else if (key === 'ruins') {
    // cave: light pouring from a distant opening, dark rock everywhere else
    const o = a.opening;
    glowDot(ctx, o.x, -20, 340, o.color, 0.45);
    glowDot(ctx, o.x, -10, 120, 0xfff0d0, 0.5);
    caveWalls(ctx, r, a.sky[0], o.x);
  } else if (key === 'crystal') {
    // luminous crystal veins in the far cave walls
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const c = i % 3 === 0 ? a.glowB : a.glowA;
      ctx.strokeStyle = rgba(c, 0.18 + r() * 0.15);
      ctx.shadowColor = rgba(c, 1);
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      let x = r() * W;
      let y = r() * H * 0.3;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 120;
        y += 30 + r() * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    caveWalls(ctx, r, a.sky[0], -1000);
    for (let i = 0; i < 70; i++) glowDot(ctx, r() * W, r() * H * 0.8, 1.5 + r() * 3, r() > 0.5 ? a.glowA : a.glowB, 0.5);
  }
  // horizon light
  const hg = ctx.createLinearGradient(0, H * 0.55, 0, H);
  hg.addColorStop(0, rgba(a.glowA, 0));
  hg.addColorStop(1, rgba(a.glowA, 0.1));
  ctx.fillStyle = hg;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
  tex.refresh();
}

function drawMoon(ctx, m, r, craters) {
  glowDot(ctx, m.x, m.y, m.r * 5, m.halo, 0.32);
  glowDot(ctx, m.x, m.y, m.r * 2.2, m.halo, 0.4);
  const g = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 2, m.x, m.y, m.r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, m.color);
  g.addColorStop(1, mix(m.color, '#000000', 0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = mix(m.color, '#000000', craters ? 0.3 : 0.12);
  for (let i = 0; i < (craters ? 9 : 5); i++) {
    const a = r() * TAU;
    const d = r() * m.r * 0.7;
    ctx.globalAlpha = 0.35 + r() * 0.3;
    ctx.beginPath();
    ctx.arc(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, 2 + r() * m.r * 0.18, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function cloudBands(ctx, r, color, alpha, n, y0, y1) {
  for (let i = 0; i < n; i++) {
    const y = y0 + r() * (y1 - y0);
    const x = r() * W;
    const w = 160 + r() * 280;
    const h = 8 + r() * 16;
    ctx.fillStyle = rgba(color, alpha * (0.5 + r() * 0.5));
    for (const sx of [x, x - W, x + W]) {
      ctx.beginPath();
      ctx.ellipse(sx, y, w / 2, h / 2, 0, 0, TAU);
      ctx.ellipse(sx + w * 0.2, y - h * 0.4, w * 0.3, h * 0.45, 0, 0, TAU);
      ctx.fill();
    }
  }
}

function caveWalls(ctx, r, color, holeX) {
  ctx.fillStyle = rgba(color, 0.85);
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    if (Math.abs(x - holeX) < 140) continue;
    const y = r() * 70 - 20;
    ctx.beginPath();
    ctx.ellipse(x, y, 40 + r() * 80, 20 + r() * 40, 0, 0, TAU);
    ctx.fill();
  }
}

// --------------------------------------------------------------------- layers
// L0 = far, L1 = mid, L2 = near. Textures are W x H with the "ground" near baseY.
const LAYERS = [
  { name: 'bg_far', baseY: H * 0.8, rimDy: 1.5, hazeH: 160, hazeA: 0.75 },
  { name: 'bg_mid', baseY: H * 0.88, rimDy: 2, hazeH: 130, hazeA: 0.55 },
  { name: 'bg_near', baseY: H * 0.97, rimDy: 2.5, hazeH: 90, hazeA: 0.3 },
];

function makeLayer(scene, key, a, ti, L, cfg) {
  const { tex, ctx } = canvasTex(scene, `${cfg.name}_${key}`, W, H);
  const r = mulberry32(900 + ti * 131 + L * 17);
  const path = new MultiPath();
  const post = [];
  const base = [a.far, a.mid, a.near][L];
  const rim = [a.farRim, a.midRim, a.nearRim][L];
  GEN[key](path, r, cfg.baseY, L, post, a);

  ctx.fillStyle = rim;
  path.fill(ctx);
  ctx.save();
  ctx.translate(1, cfg.rimDy);
  ctx.fillStyle = base;
  path.fill(ctx);
  ctx.restore();
  // depth haze at the base of the silhouettes
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, cfg.baseY - cfg.hazeH, 0, H);
  g.addColorStop(0, rgba(a.haze, 0));
  g.addColorStop(0.6, rgba(a.haze, cfg.hazeA));
  g.addColorStop(1, rgba(a.haze, cfg.hazeA * 0.6));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  post.forEach((fn) => fn(ctx, base, rim));
  ctx.restore();
  tex.refresh();
}

function makeCeiling(scene, key, a, ti) {
  const { tex, ctx } = canvasTex(scene, `bg_ceil_${key}`, W, CEIL_H);
  const r = mulberry32(4242 + ti * 7);
  const path = new MultiPath();
  const post = [];
  CEIL[key](path, r, post, a);
  ctx.fillStyle = a.nearRim;
  path.fill(ctx);
  ctx.save();
  ctx.translate(0, -2.5);
  ctx.fillStyle = a.near;
  path.fill(ctx);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  post.forEach((fn) => fn(ctx));
  ctx.restore();
  tex.refresh();
}

// ---------------------------------------------------------- shape primitives
/**
 * Collects every sub-shape as its own Path2D so overlapping shapes with opposite winding
 * never cancel each other out (nonzero fill would punch holes otherwise).
 */
class MultiPath {
  constructor() {
    this.paths = [];
    this.cur = null;
  }
  moveTo(x, y) {
    this.cur = new Path2D();
    this.paths.push(this.cur);
    this.cur.moveTo(x, y);
  }
  lineTo(x, y) { this.cur.lineTo(x, y); }
  quadraticCurveTo(a, b, c, d) { this.cur.quadraticCurveTo(a, b, c, d); }
  bezierCurveTo(a, b, c, d, e, f) { this.cur.bezierCurveTo(a, b, c, d, e, f); }
  arc(...args) { this.cur.arc(...args); }
  ellipse(...args) { this.cur.ellipse(...args); }
  closePath() { this.cur.closePath(); }
  rect(x, y, w, h) {
    this.cur = new Path2D();
    this.cur.rect(x, y, w, h);
    this.paths.push(this.cur);
  }
  fill(ctx) {
    for (const p of this.paths) ctx.fill(p);
  }
}

function circle(p, x, y, rad) {
  p.moveTo(x + rad, y);
  p.arc(x, y, rad, 0, TAU);
}

function poly(p, pts) {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
}

/** Periodic rolling ground so the texture tiles seamlessly. */
function ground(p, r, baseY, amp, jag = 0) {
  const k1 = 1 + Math.floor(r() * 3);
  const k2 = 4 + Math.floor(r() * 4);
  const ph1 = r() * TAU;
  const ph2 = r() * TAU;
  p.moveTo(-20, H + 4);
  for (let x = -20; x <= W + 20; x += 8) {
    const j = jag ? Math.abs(Math.sin((x * 0.37 * TAU) / W * 10)) * jag : 0;
    p.lineTo(x, baseY - amp * (0.6 * Math.sin((TAU * k1 * x) / W + ph1) + 0.4 * Math.sin((TAU * k2 * x) / W + ph2)) - j);
  }
  p.lineTo(W + 20, H + 4);
  p.closePath();
}

/** Places things along x with random gaps; params are pre-rolled so wrapped copies match. */
function scatter(r, gapMin, gapMax, fn) {
  let x = r() * gapMin;
  while (x < W) {
    fn(x, Math.floor(r() * 1e9));
    x += gapMin + r() * (gapMax - gapMin);
  }
}

const light = (x, y, rad, color, a) => (ctx) => glowDot(ctx, x, y, rad, color, a);

function pine(p, cx, by, h, w, rr) {
  const tiers = 5 + Math.floor(rr() * 3);
  const top = by - h;
  const th = (h * 0.8) / tiers;
  for (let i = 0; i < tiers; i++) {
    const ty = top + i * th * 0.95;
    const tw = w * 0.5 * (0.22 + (0.78 * (i + 1)) / tiers);
    const droop = th * 1.3;
    p.moveTo(cx, ty - 5);
    p.quadraticCurveTo(cx + tw * 0.3, ty + droop * 0.45, cx + tw + rr() * 3, ty + droop);
    p.lineTo(cx + tw * 0.55, ty + droop * 0.85);
    p.lineTo(cx + tw * 0.25, ty + droop * 0.98);
    p.lineTo(cx - tw * 0.25, ty + droop * 0.9);
    p.lineTo(cx - tw * 0.55, ty + droop * 0.98);
    p.lineTo(cx - tw - rr() * 3, ty + droop * 0.92);
    p.quadraticCurveTo(cx - tw * 0.3, ty + droop * 0.45, cx, ty - 5);
    p.closePath();
  }
  p.rect(cx - w * 0.04 - 1.5, top + h * 0.5, w * 0.08 + 3, h * 0.5 + 12);
}

function broadleaf(p, cx, by, h, w, rr) {
  poly(p, [cx - 9, by + 10, cx - 4, by - h * 0.62, cx + 4, by - h * 0.62, cx + 9, by + 10]);
  poly(p, [cx - 2, by - h * 0.45, cx - w * 0.3, by - h * 0.7, cx - w * 0.28, by - h * 0.74, cx + 1, by - h * 0.52]);
  const n = 8 + Math.floor(rr() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    circle(p, cx + Math.cos(a) * w * (0.22 + rr() * 0.12), by - h * 0.72 + Math.sin(a) * h * 0.14, w * (0.16 + rr() * 0.1));
  }
  circle(p, cx, by - h * 0.76, w * 0.3);
}

function mushrooms(p, x, by, rr, post, colors) {
  const n = 2 + Math.floor(rr() * 3);
  for (let i = 0; i < n; i++) {
    const mx = x + (rr() - 0.5) * 26;
    const mh = 6 + rr() * 14;
    const cw = 5 + rr() * 7;
    p.rect(mx - 1.2, by - mh, 2.4, mh + 4);
    p.moveTo(mx - cw, by - mh + 1);
    p.ellipse(mx, by - mh + 1, cw, cw * 0.65, 0, Math.PI, TAU);
    p.closePath();
    const c = colors[Math.floor(rr() * colors.length)];
    post.push(light(mx, by - mh - 1, cw * 2.6, c, 0.55));
    post.push(light(mx, by - mh - 1, cw * 0.9, 0xffffff, 0.35));
  }
}

function blade(p, x, by, h, lean) {
  p.moveTo(x - 1.6, by);
  p.quadraticCurveTo(x + lean * 0.3, by - h * 0.6, x + lean, by - h);
  p.quadraticCurveTo(x + lean * 0.4, by - h * 0.5, x + 1.6, by);
  p.closePath();
}

function column(p, cx, by, h, cw, broken, rr) {
  p.rect(cx - cw / 2 - 5, by - 10, cw + 10, 12);
  p.rect(cx - cw / 2, by - h, cw, h);
  if (broken) {
    poly(p, [cx - cw / 2, by - h + 1, cx - cw / 2 + cw * 0.3, by - h - 10 - rr() * 10, cx, by - h - 2, cx + cw * 0.3, by - h - 16 - rr() * 12, cx + cw / 2, by - h + 1]);
  } else {
    p.rect(cx - cw / 2 - 6, by - h - 10, cw + 12, 10);
    p.rect(cx - cw / 2 - 3, by - h - 14, cw + 6, 4);
  }
}

function arch(p, x, by, w, h, pw) {
  const ir = (w - pw * 2) / 2;
  const cx = x + w / 2;
  const yc = by - h + pw + ir;
  p.moveTo(x, by);
  p.lineTo(x, by - h);
  p.lineTo(x + w, by - h);
  p.lineTo(x + w, by);
  p.lineTo(x + w - pw, by);
  p.lineTo(x + w - pw, yc);
  p.arc(cx, yc, ir, 0, Math.PI, true);
  p.lineTo(x + pw, by);
  p.closePath();
}

function tower(p, cx, by, h, tw, spire, rr, post, a, lit) {
  const top = by - h;
  p.rect(cx - tw / 2, top, tw, h + 10);
  if (spire) {
    poly(p, [cx - tw / 2 - 5, top + 2, cx, top - tw * 1.4 - rr() * 30, cx + tw / 2 + 5, top + 2]);
    p.rect(cx - 0.8, top - tw * 1.4 - 40, 1.6, 14);
  } else {
    p.rect(cx - tw / 2 - 4, top - 4, tw + 8, 6);
    for (let i = 0; i < 4; i++) p.rect(cx - tw / 2 - 4 + (i * (tw + 8)) / 3.5, top - 12, (tw + 8) / 7, 8);
  }
  if (lit) {
    const n = 1 + Math.floor(rr() * 3);
    for (let i = 0; i < n; i++) {
      if (rr() > 0.7) continue;
      const wy = top + 14 + rr() * (h * 0.6);
      const wx = cx + (rr() - 0.5) * tw * 0.5;
      const c = a.windows ? a.windows[Math.floor(rr() * a.windows.length)] : '#ffb060';
      const ww = lit > 1 ? 5 : 3;
      const wh = lit > 1 ? 9 : 5;
      post.push((ctx) => {
        glowDot(ctx, wx, wy, ww * 4, c, 0.4);
        ctx.fillStyle = rgba(c, 0.95);
        ctx.beginPath();
        ctx.moveTo(wx - ww / 2, wy + wh / 2);
        ctx.lineTo(wx - ww / 2, wy - wh / 2 + ww / 2);
        ctx.arc(wx, wy - wh / 2 + ww / 2, ww / 2, Math.PI, 0);
        ctx.lineTo(wx + ww / 2, wy + wh / 2);
        ctx.closePath();
        ctx.fill();
      });
    }
  }
}

function branch(p, x, y, ang, len, wid, depth, rr) {
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;
  const nx = Math.cos(ang + Math.PI / 2) * wid;
  const ny = Math.sin(ang + Math.PI / 2) * wid;
  poly(p, [x - nx, y - ny, ex - nx * 0.4, ey - ny * 0.4, ex + nx * 0.4, ey + ny * 0.4, x + nx, y + ny]);
  if (depth <= 0) return;
  branch(p, ex, ey, ang - 0.4 - rr() * 0.4, len * 0.7, wid * 0.55, depth - 1, rr);
  branch(p, ex, ey, ang + 0.3 + rr() * 0.4, len * 0.65, wid * 0.55, depth - 1, rr);
}

function crystal(p, cx, by, h, w, lean) {
  poly(p, [cx - w / 2, by + 4, cx - w / 2 + lean * 0.25, by - h * 0.78, cx + lean, by - h, cx + w / 2 + lean * 0.25, by - h * 0.78, cx + w / 2, by + 4]);
}

function crystalFacet(cx, by, h, w, lean, color, a) {
  return (ctx) => {
    ctx.fillStyle = rgba(color, a);
    ctx.beginPath();
    ctx.moveTo(cx + lean, by - h);
    ctx.lineTo(cx + w / 2 + lean * 0.25, by - h * 0.78);
    ctx.lineTo(cx + w / 2, by);
    ctx.lineTo(cx + w * 0.05, by);
    ctx.closePath();
    ctx.fill();
    glowDot(ctx, cx + lean * 0.7, by - h * 0.8, w * 1.1, color, a * 1.4);
  };
}

function island(p, cx, cy, w, rr) {
  const pts = [cx - w / 2, cy];
  for (let i = 1; i < 6; i++) pts.push(cx - w / 2 + (w * i) / 6, cy - 2 - rr() * 5);
  pts.push(cx + w / 2, cy);
  pts.push(cx + w * 0.32, cy + w * 0.18);
  pts.push(cx + w * 0.12, cy + w * 0.32 + rr() * w * 0.1);
  pts.push(cx + (rr() - 0.5) * w * 0.1, cy + w * (0.55 + rr() * 0.2));
  pts.push(cx - w * 0.15, cy + w * 0.3);
  pts.push(cx - w * 0.36, cy + w * 0.14);
  poly(p, pts);
}

// ------------------------------------------------------------- theme layers
const GEN = {
  forest(p, r, by, L, post, a) {
    const glowCols = [a.glowA, a.glowB, 0xd8ff7a];
    if (L === 0) {
      scatter(r, 22, 54, (x, s) => {
        const rr = mulberry32(s);
        const h = 140 + rr() * 170;
        const w = 36 + rr() * 34;
        wrapX(W, x, w, (sx) => pine(p, sx, by + 8, h, w, mulberry32(s + 1)));
      });
    } else if (L === 1) {
      scatter(r, 60, 140, (x, s) => {
        const rr = mulberry32(s);
        const big = rr() < 0.4;
        const h = big ? 170 + rr() * 90 : 150 + rr() * 170;
        const w = big ? 110 + rr() * 50 : 48 + rr() * 30;
        wrapX(W, x, w, (sx) => (big ? broadleaf(p, sx, by, h, w, mulberry32(s + 1)) : pine(p, sx, by + 6, h, w, mulberry32(s + 1))));
      });
      scatter(r, 110, 240, (x, s) => wrapX(W, x, 30, (sx) => mushrooms(p, sx, by - 4, mulberry32(s), post, glowCols)));
      for (let i = 0; i < 16; i++) {
        const fx = r() * W;
        const fy = by - 30 - r() * 220;
        post.push(light(fx, fy, 5 + r() * 4, r() > 0.4 ? 0xd8ff7a : a.glowA, 0.6));
      }
    } else {
      scatter(r, 220, 420, (x, s) => {
        wrapX(W, x, 90, (sx) => {
          const rr = mulberry32(s);
          const tw = 22 + rr() * 16;
          const top = H * (0.05 + rr() * 0.15);
          poly(p, [sx - tw * 1.8, by + 10, sx - tw / 2, by - 40, sx - tw / 2, top + 40, sx + tw / 2, top + 40, sx + tw / 2, by - 40, sx + tw * 1.8, by + 10]);
          for (let i = 0; i < 9; i++) {
            const ang = (i / 9) * TAU;
            circle(p, sx + Math.cos(ang) * 70, top + 30 + Math.sin(ang) * 26, 30 + rr() * 22);
          }
          circle(p, sx, top + 20, 60);
        });
      });
      scatter(r, 4, 14, (x, s) => {
        const rr = mulberry32(s);
        const h = 10 + rr() * 26;
        const lean = (rr() - 0.5) * 14;
        wrapX(W, x, 10, (sx) => blade(p, sx, by + 2, h, lean));
      });
      scatter(r, 160, 300, (x, s) => wrapX(W, x, 30, (sx) => mushrooms(p, sx, by, mulberry32(s), post, glowCols)));
    }
    ground(p, r, by, [6, 10, 6][L]);
  },

  ruins(p, r, by, L, post, a) {
    if (L === 0) {
      scatter(r, 260, 420, (x, s) => {
        const rr = mulberry32(s);
        const kind = rr();
        if (kind < 0.4) {
          const w = 220 + rr() * 100;
          const steps = 5 + Math.floor(rr() * 3);
          const sh = 22 + rr() * 10;
          wrapX(W, x, w / 2 + 10, (sx) => {
            for (let i = 0; i < steps; i++) p.rect(sx - w / 2 + i * (w / steps / 2.4), by - (i + 1) * sh, w - i * (w / steps / 1.2), sh + 2);
            p.rect(sx - 22, by - steps * sh - 40, 44, 40);
            poly(p, [sx - 30, by - steps * sh - 40, sx, by - steps * sh - 62, sx + 30, by - steps * sh - 40]);
          });
        } else {
          const w = 120 + rr() * 80;
          const h = 180 + rr() * 120;
          wrapX(W, x, w + 10, (sx) => {
            arch(p, sx - w / 2, by, w, h, 24);
            p.rect(sx - w / 2 - 8, by - h - 14, w + 16, 16);
          });
        }
      });
    } else if (L === 1) {
      scatter(r, 70, 160, (x, s) => {
        const rr = mulberry32(s);
        const h = 120 + rr() * 200;
        const cw = 22 + rr() * 16;
        const broken = rr() < 0.45;
        const torch = rr() < 0.45;
        wrapX(W, x, cw + 10, (sx) => {
          column(p, sx, by, h, cw, broken, mulberry32(s + 3));
          if (torch) {
            const ty = by - h * 0.55;
            p.rect(sx + cw / 2, ty, 8, 3);
            p.rect(sx + cw / 2 + 5, ty - 8, 4, 10);
            post.push(light(sx + cw / 2 + 7, ty - 12, 40, a.glowA, 0.5));
            post.push(light(sx + cw / 2 + 7, ty - 12, 8, 0xfff0c0, 0.9));
          }
        });
      });
    } else {
      scatter(r, 120, 260, (x, s) => {
        const rr = mulberry32(s);
        const w = 80 + rr() * 140;
        const h = 24 + rr() * 50;
        wrapX(W, x, w / 2 + 20, (sx) => {
          const q = mulberry32(s + 1);
          const pts = [sx - w / 2, by + 6];
          for (let i = 0; i <= 8; i++) pts.push(sx - w / 2 + (w * i) / 8, by - Math.sin((i / 8) * Math.PI) * h - q() * 10);
          pts.push(sx + w / 2, by + 6);
          poly(p, pts);
          if (q() < 0.5) {
            const bx = sx + (q() - 0.5) * w * 0.5;
            poly(p, [bx - 30, by - h * 0.6, bx + 26, by - h * 0.9, bx + 30, by - h * 0.9 + 16, bx - 26, by - h * 0.6 + 16]);
          }
        });
      });
      for (let i = 0; i < 10; i++) post.push(light(r() * W, by - 10 - r() * 60, 3 + r() * 3, a.glowA, 0.7));
    }
    ground(p, r, by, [4, 6, 8][L]);
  },

  castle(p, r, by, L, post, a) {
    if (L === 0) {
      p.rect(-10, by - 60, W + 20, 70);
      for (let x = 0; x < W; x += 16) p.rect(x, by - 68, 9, 9);
      scatter(r, 70, 150, (x, s) => {
        const rr = mulberry32(s);
        const h = 110 + rr() * 220;
        const tw = 22 + rr() * 22;
        const spire = rr() < 0.6;
        wrapX(W, x, tw + 10, (sx) => tower(p, sx, by - 50, h, tw, spire, mulberry32(s + 1), post, a, 1));
      });
    } else if (L === 1) {
      scatter(r, 150, 300, (x, s) => {
        const rr = mulberry32(s);
        const h = 200 + rr() * 170;
        const tw = 44 + rr() * 30;
        const spire = rr() < 0.55;
        wrapX(W, x, tw + 20, (sx) => {
          tower(p, sx, by, h, tw, spire, mulberry32(s + 1), post, a, 2);
          poly(p, [sx - tw / 2 - 18, by + 6, sx - tw / 2, by - h * 0.4, sx - tw / 2, by + 6]);
        });
      });
    } else {
      // graveyard fence, tombstones and dead trees
      p.rect(-10, by - 38, W + 20, 3);
      p.rect(-10, by - 12, W + 20, 3);
      for (let x = 0; x < W; x += 11) {
        p.rect(x, by - 46, 2.5, 50);
        poly(p, [x - 2, by - 46, x + 1.25, by - 55, x + 4.5, by - 46]);
      }
      scatter(r, 90, 200, (x, s) => {
        const rr = mulberry32(s);
        const kind = rr();
        wrapX(W, x, 70, (sx) => {
          const q = mulberry32(s + 2);
          if (kind < 0.35) branch(p, sx, by + 4, -Math.PI / 2 + (q() - 0.5) * 0.3, 60 + q() * 40, 7, 4, q);
          else {
            const gw = 16 + q() * 10;
            const gh = 22 + q() * 18;
            p.moveTo(sx - gw / 2, by + 4);
            p.lineTo(sx - gw / 2, by - gh + gw / 2);
            p.arc(sx, by - gh + gw / 2, gw / 2, Math.PI, 0);
            p.lineTo(sx + gw / 2, by + 4);
            p.closePath();
          }
        });
      });
    }
    ground(p, r, by, [3, 6, 5][L]);
  },

  crystal(p, r, by, L, post, a) {
    const cols = [a.glowA, a.glowB];
    if (L === 0) {
      scatter(r, 60, 150, (x, s) => {
        const rr = mulberry32(s);
        const h = 150 + rr() * 200;
        const w = 30 + rr() * 50;
        const lean = (rr() - 0.5) * 40;
        const c = cols[Math.floor(rr() * 2)];
        wrapX(W, x, w + 30, (sx) => {
          crystal(p, sx, by, h, w, lean);
          crystal(p, sx + w * 0.5, by, h * 0.55, w * 0.6, lean + 12);
          post.push(crystalFacet(sx, by, h, w, lean, c, 0.08));
        });
      });
    } else if (L === 1) {
      scatter(r, 90, 200, (x, s) => {
        const rr = mulberry32(s);
        const n = 3 + Math.floor(rr() * 3);
        const parts = [];
        for (let i = 0; i < n; i++) parts.push([(rr() - 0.5) * 60, 50 + rr() * 140, 14 + rr() * 26, (rr() - 0.5) * 50, cols[Math.floor(rr() * 2)]]);
        wrapX(W, x, 80, (sx) => {
          for (const [dx, h, w, lean, c] of parts) {
            crystal(p, sx + dx, by, h, w, lean);
            post.push(crystalFacet(sx + dx, by, h, w, lean, c, 0.14));
          }
        });
      });
    } else {
      scatter(r, 110, 240, (x, s) => {
        const rr = mulberry32(s);
        const w = 70 + rr() * 120;
        const h = 20 + rr() * 40;
        const c = cols[Math.floor(rr() * 2)];
        wrapX(W, x, w / 2 + 30, (sx) => {
          const q = mulberry32(s + 1);
          const pts = [sx - w / 2, by + 6];
          for (let i = 0; i <= 6; i++) pts.push(sx - w / 2 + (w * i) / 6, by - Math.sin((i / 6) * Math.PI) * h - q() * 8);
          pts.push(sx + w / 2, by + 6);
          poly(p, pts);
          crystal(p, sx + w * 0.15, by - h * 0.6, 40, 14, 10);
          post.push(crystalFacet(sx + w * 0.15, by - h * 0.6, 40, 14, 10, c, 0.25));
        });
      });
    }
    ground(p, r, by, [4, 6, 6][L]);
  },

  void(p, r, by, L, post, a) {
    const cols = [a.glowA, a.glowB];
    if (L === 0) {
      scatter(r, 90, 220, (x, s) => {
        const rr = mulberry32(s);
        const w = 40 + rr() * 90;
        const cy = H * (0.25 + rr() * 0.4);
        wrapX(W, x, w, (sx) => island(p, sx, cy, w, mulberry32(s + 1)));
        if (rr() < 0.5) post.push(light(x, cy - 6, 10, cols[Math.floor(rr() * 2)], 0.4));
      });
      scatter(r, 140, 260, (x, s) => {
        const rr = mulberry32(s);
        const y = H * (0.15 + rr() * 0.5);
        const h = 20 + rr() * 50;
        wrapX(W, x, 8, (sx) => poly(p, [sx, y - h, sx + 4, y, sx, y + h * 0.4, sx - 4, y]));
      });
    } else if (L === 1) {
      scatter(r, 180, 340, (x, s) => {
        const rr = mulberry32(s);
        const w = 100 + rr() * 110;
        const cy = H * (0.4 + rr() * 0.35);
        const c = cols[Math.floor(rr() * 2)];
        const pillar = rr() < 0.5;
        wrapX(W, x, w, (sx) => {
          island(p, sx, cy, w, mulberry32(s + 1));
          if (pillar) column(p, sx - w * 0.15, cy, 40 + (s % 40), 14, true, mulberry32(s + 2));
          post.push(light(sx + w * 0.2, cy - 12, 22, c, 0.45));
          post.push((ctx) => {
            ctx.strokeStyle = rgba(c, 0.5);
            ctx.lineWidth = 1;
            const q = mulberry32(s + 5);
            for (let i = 0; i < 4; i++) {
              const rx = sx + (q() - 0.5) * w * 0.5;
              ctx.beginPath();
              ctx.moveTo(rx, cy + w * 0.15);
              ctx.quadraticCurveTo(rx + 6, cy + w * 0.3, rx - 3, cy + w * (0.35 + q() * 0.3));
              ctx.stroke();
            }
          });
        });
      });
      ground(p, r, by + 20, 10);
    } else {
      p.rect(-10, by, W + 20, H - by + 4);
      scatter(r, 14, 40, (x, s) => {
        const rr = mulberry32(s);
        const h = 20 + rr() * 90;
        const w = 10 + rr() * 16;
        const lean = (rr() - 0.5) * 20;
        wrapX(W, x, w, (sx) => poly(p, [sx - w / 2, by + 2, sx + lean, by - h, sx + w / 2, by + 2]));
      });
      for (let i = 0; i < 12; i++) post.push(light(r() * W, by - 10 - r() * 100, 3 + r() * 4, cols[i % 2], 0.6));
    }
  },
};

// ------------------------------------------------------------------ ceilings
const CEIL = {
  forest(p, r, post, a) {
    p.rect(-10, -10, W + 20, 24);
    scatter(r, 18, 46, (x, s) => {
      const rr = mulberry32(s);
      const y = 8 + rr() * 34;
      const rad = 18 + rr() * 30;
      wrapX(W, x, rad, (sx) => circle(p, sx, y, rad));
    });
    scatter(r, 26, 70, (x, s) => {
      const rr = mulberry32(s);
      const len = 40 + rr() * 110;
      const sway = (rr() - 0.5) * 16;
      const glow = rr() < 0.3;
      wrapX(W, x, 20, (sx) => {
        for (let y = 30; y < len; y += 7) {
          const k = (y - 30) / len;
          const vx = sx + Math.sin(k * 3) * sway;
          p.moveTo(vx + 1.2, y);
          p.ellipse(vx, y, 1.6, 4, 0, 0, TAU);
          p.moveTo(vx + 4.5, y + 2);
          p.ellipse(vx + 3, y + 2, 2.6, 1.4, 0.6, 0, TAU);
        }
        if (glow) {
          const ex = sx + Math.sin(3) * sway;
          post.push(light(ex, len + 4, 14, a.glowA, 0.6));
          post.push(light(ex, len + 4, 4, 0xffffff, 0.8));
        }
      });
    });
  },
  ruins(p, r, post, a) {
    const pts = [-20, -10];
    for (let x = -20; x <= W + 20; x += 10) pts.push(x, 26 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.013) * 8);
    pts.push(W + 20, -10);
    poly(p, pts);
    scatter(r, 20, 60, (x, s) => {
      const rr = mulberry32(s);
      const len = 20 + rr() * 90;
      const w = 8 + rr() * 18;
      const tip = (rr() - 0.5) * 3;
      wrapX(W, x, w, (sx) => poly(p, [sx - w / 2, 20, sx + tip, 20 + len, sx + w / 2, 20]));
    });
    post.push((ctx) => {
      ctx.strokeStyle = rgba(a.nearRim, 0.5);
      ctx.lineWidth = 1.2;
      const q = mulberry32(77);
      for (let i = 0; i < 24; i++) {
        const x = q() * W;
        ctx.beginPath();
        ctx.moveTo(x, 24);
        ctx.bezierCurveTo(x + 10, 60, x - 10, 90, x + (q() - 0.5) * 20, 60 + q() * 100);
        ctx.stroke();
      }
    });
  },
  crystal(p, r, post, a) {
    const pts = [-20, -10];
    for (let x = -20; x <= W + 20; x += 10) pts.push(x, 22 + Math.sin(x * 0.04) * 5 + Math.sin(x * 0.011) * 7);
    pts.push(W + 20, -10);
    poly(p, pts);
    scatter(r, 24, 70, (x, s) => {
      const rr = mulberry32(s);
      const len = 30 + rr() * 120;
      const w = 10 + rr() * 22;
      const lean = (rr() - 0.5) * 16;
      const c = rr() < 0.6 ? a.glowA : a.glowB;
      wrapX(W, x, w, (sx) => {
        poly(p, [sx - w / 2, 18, sx - w / 2 + lean * 0.2, 18 + len * 0.75, sx + lean, 18 + len, sx + w / 2 + lean * 0.2, 18 + len * 0.75, sx + w / 2, 18]);
        post.push(light(sx + lean, 18 + len, w * 1.3, c, 0.45));
        post.push(light(sx + lean, 14 + len, 3, 0xffffff, 0.9));
      });
    });
  },
};

// -------------------------------------------------------- atmosphere helpers
function makeAtmoTextures(scene) {
  // drifting fog band (tiles horizontally)
  let { tex, ctx } = canvasTex(scene, 'fx-fog', 512, 128);
  const r = mulberry32(5);
  for (let i = 0; i < 46; i++) {
    const x = r() * 512;
    const y = 40 + r() * 60;
    const rad = 30 + r() * 50;
    for (const sx of [x - 512, x, x + 512]) {
      ctx.save();
      ctx.translate(sx, y);
      ctx.scale(2.2, 0.6);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'destination-in';
  let g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  tex.refresh();

  // volumetric light shaft
  ({ tex, ctx } = canvasTex(scene, 'fx-shaft', 64, 256));
  g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  ctx.globalCompositeOperation = 'destination-in';
  g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  tex.refresh();

  // screen vignette
  ({ tex, ctx } = canvasTex(scene, 'fx-vignette', 256, 144));
  ctx.save();
  ctx.scale(1, 144 / 256);
  g = ctx.createRadialGradient(128, 128, 60, 128, 128, 186);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.restore();
  tex.refresh();

  // darkness with a soft hole: the hero carries light through the world
  ({ tex, ctx } = canvasTex(scene, 'fx-light', 256, 256));
  g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.1, 'rgba(0,0,0,0)');
  g.addColorStop(0.35, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.9)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  tex.refresh();

  // colour grade: glow from the top and bottom of the frame
  ({ tex, ctx } = canvasTex(scene, 'fx-grade', 4, 256));
  g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.35, 'rgba(255,255,255,0)');
  g.addColorStop(0.65, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  tex.refresh();
}
