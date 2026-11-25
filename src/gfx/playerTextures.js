import { canvasTex, rgba, mix } from './util.js';

/**
 * The shadow hero's sprite sheet ('shadow'), drawn procedurally.
 *
 * Design: a hooded shadow-cloak with a flame-like hood, glowing cyan eyes, a pulsing
 * violet crystal core, wispy arms, short legs and a ragged hem. Purple back-rim and
 * cyan front-rim light give it the "lit by magic" look.
 */
export const FRAME_W = 40;
export const FRAME_H = 44;
const RES = 1;

const BASE = {
  sx: 1, sy: 1, bob: 0, lean: 0,
  legs: [[0, 0], [0, 0]],
  arms: [[200, 5], [-20, 5]], // [angle deg (0 = forward, 90 = down), length] back arm, front arm
  eyes: 'open', eyeH: 3.5, eyeDx: 0,
  wisp: 0, wispDir: -1, hem: 0,
  core: 0.6, rim: 1, alpha: 1, crack: 0, frags: 0, aura: 0,
};

const POSES = {
  // idle: slow breathing + core pulse
  idle0: { core: 0.5 },
  idle1: { sy: 1.015, wisp: 0.4, core: 0.6, hem: 0.3 },
  idle2: { sy: 1.03, sx: 0.985, wisp: 0.8, core: 0.75, hem: 0.6 },
  idle3: { sy: 1.04, sx: 0.98, wisp: 1.1, core: 0.85, hem: 0.8 },
  idle4: { sy: 1.03, sx: 0.985, wisp: 0.8, core: 0.75, hem: 0.5 },
  idle5: { sy: 1.015, wisp: 0.4, core: 0.6, hem: 0.2 },
  blink: { eyes: 'closed', core: 0.5 },
  // run: 8-frame cycle, arms swing opposite to legs
  run0: { lean: 2.5, legs: [[-4, 0], [4, 3]], arms: [[150, 6], [30, 6]], wisp: 1, hem: 1 },
  run1: { lean: 2.5, legs: [[-2, 1], [2, 2]], arms: [[165, 6], [15, 6]], bob: -1, sy: 1.02, wisp: 1.6, hem: 1.4 },
  run2: { lean: 2.5, legs: [[0, 2], [0, 1]], arms: [[185, 6], [-5, 6]], bob: -2, sy: 1.04, wisp: 2.2, hem: 1.8 },
  run3: { lean: 2.5, legs: [[2, 3], [-2, 0]], arms: [[205, 6], [-25, 6]], bob: -1, sy: 1.02, wisp: 1.6, hem: 1.2 },
  run4: { lean: 2.5, legs: [[4, 3], [-4, 0]], arms: [[215, 6], [-35, 6]], wisp: 1, hem: 1 },
  run5: { lean: 2.5, legs: [[2, 2], [-2, 1]], arms: [[200, 6], [-20, 6]], bob: -1, sy: 1.02, wisp: 1.6, hem: 1.4 },
  run6: { lean: 2.5, legs: [[0, 1], [0, 2]], arms: [[180, 6], [0, 6]], bob: -2, sy: 1.04, wisp: 2.2, hem: 1.8 },
  run7: { lean: 2.5, legs: [[-2, 0], [2, 3]], arms: [[160, 6], [20, 6]], bob: -1, sy: 1.02, wisp: 1.6, hem: 1.2 },
  // airborne
  jump0: { sy: 1.1, sx: 0.9, legs: [[1, 3], [-1, 4]], arms: [[110, 6], [70, 6]], wisp: 3, wispDir: -0.4, hem: -1.5, core: 0.8 },
  jump1: { sy: 1.06, sx: 0.94, legs: [[1, 2], [-1, 3]], arms: [[130, 6], [50, 6]], wisp: 2.4, wispDir: -0.6, hem: -1, core: 0.75 },
  apex: { sy: 1.0, sx: 1.0, legs: [[0, 1], [0, 2]], arms: [[190, 6], [-10, 6]], wisp: 0, wispDir: 0, hem: 0.5, core: 0.7 },
  fall0: { sy: 0.97, sx: 1.04, legs: [[-1, -1], [1, -1]], arms: [[250, 6], [-70, 6]], wisp: -3, wispDir: 0.5, eyeH: 4.2, hem: 2 },
  fall1: { sy: 0.98, sx: 1.03, legs: [[-2, -1], [2, -1]], arms: [[260, 6], [-80, 6]], wisp: -4, wispDir: 1, eyeH: 4.2, hem: 2.6 },
  // double jump: tucked ball (the sprite is spun in code)
  tuck0: { sy: 0.82, sx: 1.08, legs: [[2, 5], [-1, 5]], arms: [[60, 4], [100, 4]], wisp: 2, hem: -2, core: 1, aura: 0.8 },
  tuck1: { sy: 0.8, sx: 1.1, legs: [[1, 6], [-2, 6]], arms: [[80, 4], [120, 4]], wisp: 3, hem: -2.5, core: 1, aura: 1 },
  // dash: stretched forward, arms swept back
  dash0: { sx: 1.2, sy: 0.84, lean: 6, legs: [[-4, 3], [-3, 3]], arms: [[175, 8], [185, 7]], wisp: 4, wispDir: -2.2, hem: 3, core: 1, aura: 1 },
  dash1: { sx: 1.24, sy: 0.82, lean: 6.5, legs: [[-5, 3], [-3, 4]], arms: [[170, 9], [180, 8]], wisp: 5, wispDir: -2.6, hem: 3.5, core: 1, aura: 1 },
  // wall slide (sprite faces away from the wall) and wall-jump kick
  wall0: { sx: 0.92, lean: 3, legs: [[2, 2], [3, 0]], arms: [[160, 6], [210, 5]], eyeDx: -5, wisp: -1, wispDir: -1, hem: 1 },
  wall1: { sx: 0.93, lean: 3, legs: [[2, 1], [3, 1]], arms: [[165, 6], [215, 5]], eyeDx: -5, wisp: -1.5, wispDir: -1.2, hem: 1.4 },
  kick: { sx: 0.95, sy: 1.06, lean: 4, legs: [[-5, 2], [-4, 4]], arms: [[100, 7], [60, 7]], wisp: 2.5, wispDir: -1.5, hem: -1.5, core: 0.9 },
  // landing squash frame
  land: { sy: 0.86, sx: 1.12, legs: [[-2, 0], [2, 0]], arms: [[230, 6], [-50, 6]], wisp: -1, hem: 2, bob: 1 },
  // taking damage: recoil, squinting eyes, hot rim
  hurt0: { lean: -4, sx: 0.94, sy: 1.04, legs: [[3, 2], [4, 1]], arms: [[240, 6], [-60, 7]], eyes: 'hurt', wisp: -2, wispDir: 1.5, hem: -1, rim: 2.2, core: 0.3 },
  hurt1: { lean: -3, sx: 0.96, sy: 1.02, legs: [[2, 1], [3, 1]], arms: [[230, 6], [-50, 6]], eyes: 'hurt', wisp: -1, wispDir: 1, hem: -0.5, rim: 1.6, core: 0.4 },
  // death: flash, crack, dissolve into fragments
  death0: { eyes: 'hurt', rim: 2.5, core: 1, sy: 1.06, sx: 0.95, lean: -2, aura: 1 },
  death1: { eyes: 'wide', rim: 2.5, core: 1, sy: 0.92, sx: 1.08, crack: 0.4, aura: 1 },
  death2: { eyes: 'wide', rim: 2, core: 0.8, sy: 0.88, sx: 1.12, crack: 0.8, frags: 0.2, alpha: 0.9 },
  death3: { eyes: 'closed', rim: 1.5, core: 0.5, sy: 0.84, sx: 1.16, crack: 1, frags: 0.5, alpha: 0.7 },
  death4: { eyes: 'none', rim: 1, core: 0.3, sy: 0.8, sx: 1.18, crack: 1, frags: 0.8, alpha: 0.45 },
  death5: { eyes: 'none', rim: 0.5, core: 0.1, sy: 0.75, sx: 1.2, crack: 1, frags: 1, alpha: 0.2 },
  // victory: arms raised, core blazing
  win0: { sy: 1.04, arms: [[120, 7], [60, 7]], eyes: 'happy', core: 1, wisp: 1.5, hem: -1, aura: 0.6 },
  win1: { sy: 1.1, sx: 0.94, bob: -2, legs: [[0, 2], [0, 2]], arms: [[100, 8], [80, 8]], eyes: 'happy', core: 1, wisp: 2.5, hem: -2, aura: 1 },
  win2: { sy: 1.08, sx: 0.95, bob: -3, legs: [[0, 3], [0, 3]], arms: [[95, 8], [85, 8]], eyes: 'happy', core: 1, wisp: 3, hem: -2.5, aura: 1 },
};

/** Default palette (the original violet/cyan look). Colours are 0xRRGGBB numbers. */
export const DEFAULT_PALETTE = {
  rim: 0x8c6cf0, // outer glow + back rim
  front: 0x78e6ff, // front rim
  eye: 0xe6fdff,
  eyeGlow: 0x8cf0ff,
  core: 0x966eff,
  cloak: 0x1a1430,
  wisp: 0x3b2a70,
};

let PAL = DEFAULT_PALETTE;
let SKIN = 'classic';

export const POSE_NAMES = Object.keys(POSES);

/**
 * Paints the hero sheet. look = { palette, skin }. If the texture already exists with the same
 * size it is repainted in place, so live sprites and animations keep working (skin changes).
 * `only` limits the frames drawn (for small preview textures).
 */
export default function makePlayerTextures(scene, look = {}, key = 'shadow', only = null) {
  PAL = { ...DEFAULT_PALETTE, ...(look.palette || {}) };
  SKIN = look.skin || 'classic';
  const names = only || POSE_NAMES;
  const w = FRAME_W * RES * names.length;
  const h = FRAME_H * RES;
  let tex;
  let ctx;
  const existing = scene.textures.exists(key) ? scene.textures.get(key) : null;
  if (existing && existing.getContext && existing.width === w && existing.height === h) {
    tex = existing;
    ctx = tex.getContext();
    ctx.clearRect(0, 0, w, h);
  } else {
    ({ tex, ctx } = canvasTex(scene, key, w, h));
  }
  names.forEach((name, i) => {
    ctx.save();
    ctx.scale(RES, RES);
    ctx.beginPath();
    ctx.rect(i * FRAME_W, 0, FRAME_W, FRAME_H);
    ctx.clip();
    drawHero(ctx, i * FRAME_W, { ...BASE, ...POSES[name] }, POSE_NAMES.indexOf(name));
    ctx.restore();
    if (!tex.has(name)) tex.add(name, 0, i * FRAME_W * RES, 0, FRAME_W * RES, FRAME_H * RES);
  });
  tex.refresh();
  PAL = DEFAULT_PALETTE;
  SKIN = 'classic';
  return tex;
}

export function makePlayerAnimations(scene) {
  const f = (...names) => names.map((frame) => ({ key: 'shadow', frame }));
  const add = (key, frames, frameRate, repeat = -1) => {
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({ key, frames, frameRate, repeat });
  };
  add('idle', f('idle0', 'idle1', 'idle2', 'idle3', 'idle4', 'idle5', 'idle0', 'idle1', 'idle2', 'idle3', 'idle4', 'idle5', 'blink', 'idle0'), 8);
  add('run', f('run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7'), 18);
  add('jump', f('jump0', 'jump1'), 10, 0);
  add('apex', f('apex'), 1);
  add('fall', f('fall0', 'fall1'), 10);
  add('djump', f('tuck0', 'tuck1'), 16);
  add('dash', f('dash0', 'dash1'), 24);
  add('wall', f('wall0', 'wall1'), 8);
  add('walljump', f('kick'), 1);
  add('land', f('land'), 1);
  add('hurt', f('hurt0', 'hurt1', 'hurt0', 'hurt1'), 14, 0);
  add('death', f('death0', 'death1', 'death2', 'death3', 'death4', 'death5'), 13, 0);
  add('victory', f('win0', 'win1', 'win2', 'win1', 'win2', 'win1', 'win2'), 7, 0);
}

function drawHero(ctx, ox, p, seed) {
  const cx = ox + FRAME_W / 2;
  const feet = FRAME_H - 1;
  const legH = 6;
  const bottom = feet - legH + 2 + p.bob;
  const bodyH = 25 * p.sy;
  const halfW = 11 * p.sx;
  const top = bottom - bodyH;
  const lean = p.lean;
  ctx.globalAlpha = p.alpha;

  // --- soft magic aura behind the body
  if (p.aura > 0) {
    const ag = ctx.createRadialGradient(cx, top + bodyH * 0.55, 2, cx, top + bodyH * 0.55, 19);
    ag.addColorStop(0, rgba(mix(PAL.rim, 0xffffff, 0.2), 0.35 * p.aura));
    ag.addColorStop(0.6, rgba(PAL.front, 0.12 * p.aura));
    ag.addColorStop(1, rgba(PAL.front, 0));
    ctx.fillStyle = ag;
    ctx.fillRect(ox, 0, FRAME_W, FRAME_H);
  }

  const dark = '#07060d';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- back arm (behind body)
  drawArm(ctx, cx - 3 * p.sx + lean * 0.4, top + bodyH * 0.45, p.arms[0], dark, 0.55);

  // --- legs
  p.legs.forEach(([lx, lift], i) => {
    const x = cx + (i === 0 ? -5 : 3) * p.sx + lx;
    ctx.fillStyle = i === 0 ? '#0b0914' : dark;
    ctx.beginPath();
    ctx.roundRect(x - 1, bottom - 3 - lift, 4.5, legH + 1, 2);
    ctx.fill();
  });

  // --- cloak body path (hooded teardrop with a ragged hem)
  const hem = p.hem;
  const body = new Path2D();
  body.moveTo(cx - halfW, bottom - 1);
  body.quadraticCurveTo(cx - halfW - 1, top + bodyH * 0.35, cx - 4 + lean, top + 2);
  body.quadraticCurveTo(cx + lean, top - 3, cx + 5 + lean, top + 2);
  body.quadraticCurveTo(cx + halfW + 1, top + bodyH * 0.35, cx + halfW, bottom - 1);
  body.lineTo(cx + halfW * 0.55, bottom + 1.5 + hem * 0.3);
  body.lineTo(cx + halfW * 0.2, bottom - 0.5);
  body.lineTo(cx - halfW * 0.2, bottom + 2 - hem * 0.4);
  body.lineTo(cx - halfW * 0.6, bottom - 0.5);
  body.lineTo(cx - halfW - hem * 0.8, bottom + 1.5 + Math.abs(hem) * 0.4);
  body.closePath();

  // hood wisps (flame-like)
  const w = p.wisp;
  const wd = p.wispDir;
  const wisps = new Path2D();
  wisps.moveTo(cx - 6 + lean, top + 4);
  wisps.quadraticCurveTo(cx - 9 + lean + wd * 3, top - 4 + w, cx - 13 + lean + wd * 6, top - 6 + w * 1.5);
  wisps.quadraticCurveTo(cx - 6 + lean, top - 1, cx - 1 + lean, top + 1);
  wisps.closePath();
  wisps.moveTo(cx - 2 + lean, top);
  wisps.quadraticCurveTo(cx - 2 + lean + wd * 2, top - 6 - w, cx - 6 + lean + wd * 4, top - 10 - w);
  wisps.quadraticCurveTo(cx + 2 + lean, top - 3, cx + 3 + lean, top + 1);
  wisps.closePath();

  // outer glow (purple)
  ctx.save();
  ctx.shadowColor = rgba(PAL.rim, Math.min(1, 0.75 * p.rim));
  ctx.shadowBlur = 4 + p.rim * 2;
  ctx.fillStyle = dark;
  ctx.fill(body);
  ctx.fill(wisps);
  ctx.restore();

  // body gradient (subtle depth)
  const bg = ctx.createLinearGradient(cx - halfW, top, cx + halfW, bottom);
  bg.addColorStop(0, rgba(PAL.cloak));
  bg.addColorStop(0.45, mix(PAL.cloak, 0x050409, 0.6));
  bg.addColorStop(1, '#050409');
  ctx.fillStyle = bg;
  ctx.fill(body);
  const wg = ctx.createLinearGradient(0, top - 12, 0, top + 4);
  wg.addColorStop(0, rgba(PAL.wisp));
  wg.addColorStop(1, '#0c0a17');
  ctx.fillStyle = wg;
  ctx.fill(wisps);

  // rim lights: purple on the back edge, cyan on the front edge
  ctx.save();
  ctx.clip(body);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = rgba(mix(PAL.rim, 0xffffff, 0.1), Math.min(1, 0.55 * p.rim));
  ctx.beginPath();
  ctx.moveTo(cx - halfW + 0.5, bottom);
  ctx.quadraticCurveTo(cx - halfW - 0.5, top + bodyH * 0.35, cx - 4 + lean, top + 2.5);
  ctx.stroke();
  ctx.strokeStyle = rgba(PAL.front, Math.min(1, 0.4 * p.rim));
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(cx + 5 + lean, top + 2.5);
  ctx.quadraticCurveTo(cx + halfW + 0.5, top + bodyH * 0.35, cx + halfW - 0.5, bottom - 2);
  ctx.stroke();
  if (p.rim > 1.5) {
    ctx.fillStyle = `rgba(255,255,255,${(p.rim - 1.5) * 0.35})`;
    ctx.fill(body);
  }
  ctx.restore();

  // face hollow inside the hood
  const fx = cx + 4 + lean * 0.7;
  const fy = top + 10 * p.sy;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.ellipse(fx, fy, 6, 4.2 * p.sy, 0, 0, Math.PI * 2);
  ctx.fill();

  // crystal core (pulsing violet heart)
  if (p.core > 0.05) {
    const kx = cx + 1 + lean * 0.5;
    const ky = top + bodyH * 0.62;
    const cg = ctx.createRadialGradient(kx, ky, 0, kx, ky, 5 + p.core * 3);
    cg.addColorStop(0, rgba(mix(PAL.core, 0xffffff, 0.7), 0.9 * p.core));
    cg.addColorStop(0.35, rgba(PAL.core, 0.55 * p.core));
    cg.addColorStop(1, rgba(PAL.core, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(kx - 9, ky - 9, 18, 18);
    ctx.fillStyle = rgba(mix(PAL.core, 0xffffff, 0.85), Math.min(1, 0.4 + p.core * 0.6));
    ctx.beginPath();
    ctx.moveTo(kx, ky - 2.4);
    ctx.lineTo(kx + 1.5, ky);
    ctx.lineTo(kx, ky + 2.4);
    ctx.lineTo(kx - 1.5, ky);
    ctx.closePath();
    ctx.fill();
  }

  // cracks (death)
  if (p.crack > 0) {
    ctx.save();
    ctx.clip(body);
    ctx.strokeStyle = rgba(mix(PAL.rim, 0xffffff, 0.5), 0.9 * p.crack);
    ctx.lineWidth = 0.8;
    ctx.shadowColor = rgba(PAL.rim, 1);
    ctx.shadowBlur = 3;
    const r = rng(seed * 31 + 7);
    for (let i = 0; i < 3 + Math.round(p.crack * 4); i++) {
      let x = cx + (r() - 0.5) * halfW * 1.4;
      let y = top + 3 + r() * bodyH * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        x += (r() - 0.5) * 7;
        y += (r() - 0.3) * 6;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // dissolving fragments
  if (p.frags > 0) {
    const r = rng(99);
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2;
      const d = 4 + r() * 14 * p.frags + p.frags * 6;
      const x = cx + Math.cos(a) * d;
      const y = top + bodyH * 0.5 + Math.sin(a) * d * 0.8 - p.frags * 6;
      const s = 1 + r() * 2.2 * (1 - p.frags * 0.5);
      ctx.fillStyle = i % 3 === 0 ? rgba(PAL.rim, 0.9) : i % 3 === 1 ? rgba(PAL.front, 0.8) : dark;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }

  // --- accessories (scarf, horns, crown, mask)
  drawAccessory(ctx, SKIN, { cx, top, bodyH, halfW, lean, fx, fy, p });

  // --- front arm
  drawArm(ctx, cx + 3 * p.sx + lean * 0.6, top + bodyH * 0.48, p.arms[1], '#0d0b18', 1);

  // --- eyes
  drawEyes(ctx, fx - 2 + p.eyeDx, fy, p);
  if (SKIN === 'halo') drawHalo(ctx, cx + lean + 1, top - 7, p);
  ctx.globalAlpha = 1;
}

function drawAccessory(ctx, skin, g) {
  const { cx, top, bodyH, halfW, lean, fx, fy, p } = g;
  ctx.save();
  if (skin === 'horns') {
    const horn = (bx, dir) => {
      const grd = ctx.createLinearGradient(bx, top + 4, bx + dir * 8, top - 8);
      grd.addColorStop(0, '#5a4c3e');
      grd.addColorStop(1, '#efe4cf');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(bx - 1.6, top + 4);
      ctx.quadraticCurveTo(bx + dir * 7, top + 1, bx + dir * 8.5, top - 8);
      ctx.quadraticCurveTo(bx + dir * 3.5, top - 1, bx + 1.8, top + 3);
      ctx.closePath();
      ctx.fill();
    };
    ctx.shadowColor = rgba(PAL.rim, 0.6);
    ctx.shadowBlur = 3;
    horn(cx - 3 + lean, -1);
    horn(cx + 6 + lean, 1);
  } else if (skin === 'crown') {
    const x = cx + 1 + lean;
    const y = top - 1;
    ctx.shadowColor = 'rgba(255,200,90,0.9)';
    ctx.shadowBlur = 4;
    const cg = ctx.createLinearGradient(0, y - 7, 0, y + 1);
    cg.addColorStop(0, '#fff3b8');
    cg.addColorStop(1, '#c98a1e');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 1);
    ctx.lineTo(x - 6.5, y - 5);
    ctx.lineTo(x - 3, y - 2);
    ctx.lineTo(x, y - 7.5);
    ctx.lineTo(x + 3, y - 2);
    ctx.lineTo(x + 6.5, y - 5);
    ctx.lineTo(x + 6, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff4f7a';
    ctx.beginPath();
    ctx.arc(x, y - 1.6, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (skin === 'scarf') {
    const y = top + bodyH * 0.4;
    const flow = p.wisp * 0.8 + p.hem * 0.5;
    ctx.fillStyle = '#b8253f';
    ctx.shadowColor = 'rgba(255,80,110,0.6)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.ellipse(cx + 1 + lean * 0.6, y, halfW * 0.92, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - halfW * 0.6 + lean * 0.5, y - 1);
    ctx.quadraticCurveTo(cx - halfW - 4, y + 2 - flow, cx - halfW - 8, y + 4 - flow * 1.6);
    ctx.lineTo(cx - halfW - 7, y + 7 - flow * 1.4);
    ctx.quadraticCurveTo(cx - halfW - 3, y + 5 - flow * 0.6, cx - halfW * 0.4 + lean * 0.5, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,170,180,0.55)';
    ctx.fillRect(cx - 3 + lean * 0.6, y - 1.6, 8, 0.9);
  } else if (skin === 'mask') {
    ctx.fillStyle = '#e9e1d0';
    ctx.shadowColor = rgba(PAL.rim, 0.7);
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.ellipse(fx + 0.5, fy + 0.6, 6.2, 5 * p.sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a2230';
    ctx.beginPath();
    ctx.ellipse(fx - 2 + p.eyeDx, fy, 2.2, 2.4, 0, 0, Math.PI * 2);
    ctx.ellipse(fx + 4 + p.eyeDx, fy, 2.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,80,0.8)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(fx + 1, fy + 3);
    ctx.lineTo(fx + 1, fy + 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHalo(ctx, x, y, p) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,240,190,0.95)';
  ctx.shadowColor = 'rgba(255,220,120,1)';
  ctx.shadowBlur = 5;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(x, y + p.bob * 0.5, 7, 2.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawArm(ctx, x, y, [deg, len], color, rimA) {
  const a = (deg * Math.PI) / 180;
  const ex = x + Math.cos(a) * len;
  const ey = y + Math.sin(a) * len;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = rgba(PAL.rim, 0.7 * rimA);
  ctx.shadowBlur = 3;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo((x + ex) / 2 + Math.sin(a) * 1.5, (y + ey) / 2 - Math.cos(a) * 1.5, ex, ey);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(ex, ey, 1.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEyes(ctx, ex, ey, p) {
  if (p.eyes === 'none') return;
  ctx.save();
  ctx.shadowColor = rgba(PAL.eyeGlow, 1);
  ctx.shadowBlur = 5;
  ctx.fillStyle = rgba(PAL.eye);
  ctx.strokeStyle = rgba(PAL.eye);
  ctx.lineWidth = 1.1;
  const pair = (fn) => {
    fn(ex);
    fn(ex + 6);
  };
  if (p.eyes === 'closed') {
    pair((x) => ctx.fillRect(x - 1.8, ey - 0.3, 3.6, 0.9));
  } else if (p.eyes === 'hurt') {
    ctx.beginPath();
    ctx.moveTo(ex - 1.8, ey - 1.5);
    ctx.lineTo(ex + 1.2, ey);
    ctx.lineTo(ex - 1.8, ey + 1.5);
    ctx.moveTo(ex + 7.8, ey - 1.5);
    ctx.lineTo(ex + 4.8, ey);
    ctx.lineTo(ex + 7.8, ey + 1.5);
    ctx.stroke();
  } else if (p.eyes === 'happy') {
    pair((x) => {
      ctx.beginPath();
      ctx.arc(x, ey + 0.8, 1.7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });
  } else {
    const h = p.eyes === 'wide' ? 5 : p.eyeH;
    const rw = p.eyes === 'wide' ? 2.2 : 1.7;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rw, h / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(ex + 6, ey, rw, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(ex - 0.6, ey - h / 2 + 0.6, 0.9, 0.9);
    ctx.fillRect(ex + 5.4, ey - h / 2 + 0.6, 0.9, 0.9);
  }
  ctx.restore();
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
