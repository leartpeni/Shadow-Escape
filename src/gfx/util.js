export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Creates (or replaces) a canvas texture and returns it with its 2D context. */
export function canvasTex(scene, key, w, h) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  return { tex, ctx: tex.getContext() };
}

/** '#rrggbb' or 0xrrggbb -> 'rgba(r,g,b,a)'. */
export function rgba(c, a = 1) {
  let n = typeof c === 'number' ? c : parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Linear mix of two colours ('#hex' or number) -> '#rrggbb'. */
export function mix(a, b, k) {
  const na = typeof a === 'number' ? a : parseInt(a.slice(1), 16);
  const nb = typeof b === 'number' ? b : parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((na >> s) & 255) * (1 - k) + ((nb >> s) & 255) * k);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** Soft radial glow blob. */
export function glowDot(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.35, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Calls fn(sx) for x and its horizontally wrapped copies so a texture of width W tiles seamlessly. */
export function wrapX(W, x, w, fn) {
  fn(x);
  if (x + w > W) fn(x - W);
  if (x - w < 0) fn(x + W);
}

/** Builds a horizontal strip of named frames. draw(ctx, ox, def, name) is called per frame. */
export function frameStrip(scene, key, fw, fh, frames, draw) {
  const names = Object.keys(frames);
  const { tex, ctx } = canvasTex(scene, key, fw * names.length, fh);
  names.forEach((name, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * fw, 0, fw, fh);
    ctx.clip();
    draw(ctx, i * fw, frames[name], name);
    ctx.restore();
    tex.add(name, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
  return tex;
}
