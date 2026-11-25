import Phaser from 'phaser';
import Audio from '../systems/Audio.js';
import { canvasTex, rgba } from '../gfx/util.js';
import { FONT, C, hex, CONFIRM_KEYS, BACK_KEYS, DIRS, textStyle } from './theme.js';

const Rect = Phaser.Geom.Rectangle;

// ---------------------------------------------------------------- textures
function starPath(ctx, cx, cy, ro, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? ri : ro;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Procedural UI icons: stars, crystals, padlock, victory rays. Created once per game. */
export function ensureUiTextures(scene) {
  if (scene.textures.exists('ui-star')) return;
  let { tex, ctx } = canvasTex(scene, 'ui-star', 56, 56);
  starPath(ctx, 28, 30, 25, 11);
  let g = ctx.createLinearGradient(0, 4, 0, 54);
  g.addColorStop(0, '#fff8d8');
  g.addColorStop(0.45, '#ffd76a');
  g.addColorStop(1, '#e08a1e');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(255,190,80,0.9)';
  ctx.shadowBlur = 4;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff4c9';
  ctx.stroke();
  starPath(ctx, 28, 30, 13, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'ui-star-o', 56, 56));
  starPath(ctx, 28, 30, 25, 11);
  ctx.fillStyle = 'rgba(20,14,38,0.85)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(169,155,208,0.7)';
  ctx.stroke();
  tex.refresh();

  const gem = (key, filled) => {
    ({ tex, ctx } = canvasTex(scene, key, 28, 32));
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(25, 13);
    ctx.lineTo(14, 30);
    ctx.lineTo(3, 13);
    ctx.closePath();
    if (filled) {
      g = ctx.createLinearGradient(3, 2, 25, 30);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, '#9ff0ff');
      g.addColorStop(1, '#4a8cff');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#e6fdff';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, 13);
      ctx.lineTo(25, 13);
      ctx.moveTo(14, 2);
      ctx.lineTo(10, 13);
      ctx.lineTo(14, 30);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(20,14,38,0.7)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(159,240,255,0.45)';
      ctx.stroke();
    }
    tex.refresh();
  };
  gem('ui-gem', true);
  gem('ui-gem-o', false);

  ({ tex, ctx } = canvasTex(scene, 'ui-lock', 32, 36));
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#a99bd0';
  ctx.beginPath();
  ctx.arc(16, 14, 8, Math.PI, 0);
  ctx.lineTo(24, 18);
  ctx.moveTo(8, 14);
  ctx.lineTo(8, 18);
  ctx.stroke();
  g = ctx.createLinearGradient(0, 16, 0, 34);
  g.addColorStop(0, '#cbb8ff');
  g.addColorStop(1, '#6a58a8');
  ctx.fillStyle = g;
  ctx.fillRect(4, 17, 24, 17);
  ctx.fillStyle = '#1b1430';
  ctx.beginPath();
  ctx.arc(16, 24, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(15, 25, 2, 5);
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'ui-rays', 512, 512));
  const rays = 14;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const w = 0.1;
    ctx.beginPath();
    ctx.moveTo(256, 256);
    ctx.lineTo(256 + Math.cos(a - w) * 256, 256 + Math.sin(a - w) * 256);
    ctx.lineTo(256 + Math.cos(a + w) * 256, 256 + Math.sin(a + w) * 256);
    ctx.closePath();
    g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, rgba(0xffffff, 0.75));
    g.addColorStop(0.5, rgba(0xffffff, 0.22));
    g.addColorStop(1, rgba(0xffffff, 0));
    ctx.fillStyle = g;
    ctx.fill();
  }
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'ui-soft', 64, 64));
  g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  tex.refresh();
}

// ------------------------------------------------------------------ panels
/**
 * Ornate dark-fantasy panel drawn into `g`, centred on (x, y): drop shadow, deep gradient,
 * double border and diamond corner ornaments.
 */
export function drawPanel(g, x, y, w, h, opts = {}) {
  const accent = opts.accent ?? C.border;
  const r = opts.radius ?? 10;
  const alpha = opts.alpha ?? 0.94;
  const left = x - w / 2;
  const top = y - h / 2;
  if (opts.shadow !== false) {
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(left + 3, top + 6, w, h, r);
  }
  g.fillStyle(opts.fill ?? C.panel, alpha);
  g.fillRoundedRect(left, top, w, h, r);
  // Inner sheen: lighter top fading down.
  const inset = Math.min(r, 8);
  g.fillGradientStyle(opts.fillHi ?? C.panelHi, opts.fillHi ?? C.panelHi, opts.fill ?? C.panel, opts.fill ?? C.panel, alpha * 0.85, alpha * 0.85, 0, 0);
  g.fillRect(left + inset, top + 2, w - inset * 2, Math.min(h * 0.5, 90));
  g.lineStyle(opts.lineW ?? 2, accent, opts.borderAlpha ?? 0.85);
  g.strokeRoundedRect(left, top, w, h, r);
  if (opts.inner !== false && w > 40 && h > 30) {
    g.lineStyle(1, accent, 0.25);
    g.strokeRoundedRect(left + 5, top + 5, w - 10, h - 10, Math.max(2, r - 4));
  }
  if (opts.ornaments !== false) {
    g.fillStyle(accent, 1);
    const d = (cx, cy, s) => g.fillPoints([{ x: cx, y: cy - s }, { x: cx + s, y: cy }, { x: cx, y: cy + s }, { x: cx - s, y: cy }], true);
    d(left, top, 5);
    d(left + w, top, 5);
    d(left, top + h, 5);
    d(left + w, top + h, 5);
    if (opts.crest !== false && w > 160) {
      d(x, top, 6);
      g.lineStyle(2, accent, 0.9);
      g.lineBetween(x - 34, top, x - 10, top);
      g.lineBetween(x + 10, top, x + 34, top);
      g.fillStyle(C.bg, 1);
      d(x, top, 2.5);
    }
  }
  return g;
}

export function panel(scene, x, y, w, h, opts) {
  return drawPanel(scene.add.graphics(), x, y, w, h, opts);
}

/** Decorative heading: text flanked by fading lines and diamonds. */
export function heading(scene, x, y, text, opts = {}) {
  const c = scene.add.container(x, y);
  const color = opts.color ?? C.gold;
  const t = scene.add.text(0, 0, text, textStyle(opts.size ?? 30, color)).setOrigin(0.5).setShadow(0, 0, hex(opts.glow ?? C.goldDeep), 12, true, true);
  const g = scene.add.graphics();
  const half = t.width / 2 + 18;
  const len = opts.line ?? 90;
  g.fillGradientStyle(color, color, color, color, 0, 0.9, 0, 0.9);
  g.fillRect(-half - len, -1, len, 2);
  g.fillGradientStyle(color, color, color, color, 0.9, 0, 0.9, 0);
  g.fillRect(half, -1, len, 2);
  g.fillStyle(color, 1);
  for (const sx of [-half + 6, half - 6]) g.fillPoints([{ x: sx, y: -5 }, { x: sx + 5, y: 0 }, { x: sx, y: 5 }, { x: sx - 5, y: 0 }], true);
  c.add([g, t]);
  c.text = t;
  return c;
}

// ------------------------------------------------------------------ icons
export function gemLabel(scene, x, y, value, opts = {}) {
  const c = scene.add.container(x, y);
  const size = opts.size ?? 18;
  const icon = scene.add.image(0, 0, 'ui-gem').setScale(size / 26);
  const t = scene.add.text(size * 0.7, 0, `${value}`, textStyle(size, opts.color ?? C.cyan)).setOrigin(0, 0.5).setShadow(0, 2, '#000', 4);
  c.add([icon, t]);
  c.icon = icon;
  c.text = t;
  c.setValue = (v) => t.setText(`${v}`);
  if (opts.align === 'right') {
    const relayout = () => {
      const w = size * 0.7 + t.width;
      icon.setX(-w);
      t.setX(-w + size * 0.7);
    };
    c.setValue = (v) => {
      t.setText(`${v}`);
      relayout();
    };
    relayout();
  }
  return c;
}

/** Row of three stars; `filled` is a boolean[3]. */
export function starRow(scene, x, y, filled = [], size = 20, gap = 4) {
  const c = scene.add.container(x, y);
  c.stars = [0, 1, 2].map((i) => {
    const s = scene.add.image((i - 1) * (size + gap), i === 1 ? -size * 0.12 : 0, filled[i] ? 'ui-star' : 'ui-star-o').setScale(size / 52);
    c.add(s);
    return s;
  });
  c.setStars = (f) => c.stars.forEach((s, i) => s.setTexture(f[i] ? 'ui-star' : 'ui-star-o'));
  return c;
}

const BADGE_GLYPHS = { star: '★', skull: '☠', crown: '♛', crystal: '◆', eye: '◉', heart: '♥', sword: '⚔', dash: '»', wing: '⇡', sun: '☀' };

/** Round emblem with a glyph (achievements). */
export function badge(scene, x, y, icon, color, r = 22, dim = false) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(dim ? 0x120d20 : C.ink, 1);
  g.fillCircle(0, 0, r);
  g.lineStyle(2, color, dim ? 0.35 : 1);
  g.strokeCircle(0, 0, r);
  g.lineStyle(1, color, dim ? 0.15 : 0.4);
  g.strokeCircle(0, 0, r - 5);
  const t = scene.add.text(0, 1, BADGE_GLYPHS[icon] || icon || '★', textStyle(Math.round(r * 0.95), dim ? C.faint : color)).setOrigin(0.5);
  if (!dim) t.setShadow(0, 0, hex(color), 8, true, true);
  c.add([g, t]);
  return c;
}

// ------------------------------------------------------------------ button
/**
 * Focusable button that works with mouse (hover focuses), touch (tap = down+up on the
 * same button without dragging) and keyboard (via Nav). Options:
 *  label, sub, icon (texture key or glyph), size, accent, align ('center'|'left'),
 *  value (right-hand text), onClick(btn), onDir(dx, dy) -> handled?, enabled, sfx,
 *  fill, style ('normal'|'ghost'|'primary'), bar { get() -> 0..1, set(v) } for sliders.
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    this.w = w;
    this.h = h;
    this.opts = opts;
    this.accent = opts.accent ?? C.cyan;
    this.enabled = opts.enabled !== false;
    this.focused = false;
    this.pressed = false;
    this.clip = null;
    this.nav = null;

    this.glow = scene.add.image(0, 0, 'ui-soft').setDisplaySize(w + 40, h + 40).setTint(this.accent).setAlpha(0).setBlendMode('ADD');
    this.bg = scene.add.graphics();
    this.add([this.glow, this.bg]);

    const size = opts.size ?? 20;
    const left = opts.align === 'left';
    let lx = left ? -w / 2 + 18 : 0;
    if (opts.icon) {
      const isTex = scene.textures.exists(opts.icon);
      const ix = left ? -w / 2 + 22 : 0;
      this.icon = isTex
        ? scene.add.image(ix, 0, opts.icon).setScale(opts.iconScale ?? 1)
        : scene.add.text(ix, 0, opts.icon, textStyle(opts.iconSize ?? size + 2, C.violet)).setOrigin(0.5);
      this.add(this.icon);
      if (left) lx += 30;
    }
    this.label = scene.add
      .text(lx, opts.sub ? -9 : 0, opts.label || '', textStyle(size, C.text))
      .setOrigin(left ? 0 : 0.5, 0.5)
      .setShadow(0, 2, '#000', 4);
    this.add(this.label);
    if (opts.icon && !left) {
      // icon + label centred together
      const total = this.icon.displayWidth + 10 + this.label.width;
      this.icon.setX(-total / 2 + this.icon.displayWidth / 2);
      this.label.setX(-total / 2 + this.icon.displayWidth + 10 + this.label.width / 2);
    }
    if (opts.sub) {
      this.subText = scene.add
        .text(this.label.x, 12, opts.sub, textStyle(Math.max(11, size - 7), C.dim, false))
        .setOrigin(left ? 0 : 0.5, 0.5);
      this.add(this.subText);
    }
    if (opts.value !== undefined || opts.bar) {
      this.valueText = scene.add
        .text(w / 2 - 18, 0, opts.value || '', textStyle(Math.max(12, size - 2), C.cyan))
        .setOrigin(1, 0.5)
        .setShadow(0, 2, '#000', 4);
      this.add(this.valueText);
    }
    if (opts.bar) {
      this.barW = opts.barW ?? 150;
      this.barX = w / 2 - 70 - this.barW;
      this.barG = scene.add.graphics();
      this.add(this.barG);
    }

    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', this.onOver, this);
    this.on('pointerout', this.onOut, this);
    this.on('pointerdown', this.onDown, this);
    this.on('pointerup', this.onUp, this);
    this.on('pointermove', this.onMove, this);
    this.redraw();
  }

  hitOk(p) {
    if (this.clip && !this.clip.contains(p.x, p.y)) return false;
    return !(this.scene.uiLocked && this.scene.uiLocked());
  }

  onOver(p) {
    if (!this.hitOk(p)) return;
    this.hover = true;
    if (!p.wasTouch && this.nav) this.nav.focus(this);
    this.redraw();
  }

  onOut() {
    this.hover = false;
    if (this.pressed) {
      this.pressed = false;
      this.setScale(1);
    }
    this.redraw();
  }

  onDown(p) {
    if (!this.hitOk(p)) return;
    this.pressed = true;
    this.downX = p.x;
    this.downY = p.y;
    if (this.nav) this.nav.focus(this, true);
    if (this.opts.bar && this.inBar(p)) {
      this.dragBar = true;
      this.setBarFromPointer(p);
    }
    this.scene.tweens.killTweensOf(this);
    this.setScale(0.97);
    this.redraw();
  }

  onMove(p) {
    if (this.dragBar && p.isDown) this.setBarFromPointer(p);
  }

  onUp(p) {
    const wasBar = this.dragBar;
    this.dragBar = false;
    if (!this.pressed) return;
    this.pressed = false;
    this.scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: 'Back.out' });
    this.redraw();
    if (wasBar) return;
    if (Math.hypot(p.x - this.downX, p.y - this.downY) > 14 || !this.hitOk(p)) return;
    this.activate();
  }

  inBar(p) {
    const local = this.pointToContainer ? this.pointToContainer({ x: p.x, y: p.y }) : null;
    if (!local) return false;
    return local.x >= this.barX - 10 && local.x <= this.barX + this.barW + 10;
  }

  setBarFromPointer(p) {
    const local = this.pointToContainer({ x: p.x, y: p.y });
    const v = Phaser.Math.Clamp((local.x - this.barX) / this.barW, 0, 1);
    this.opts.bar.set(Math.round(v * 10) / 10);
    this.refresh();
  }

  activate() {
    if (this.scene.uiLocked && this.scene.uiLocked()) return;
    if (!this.enabled) {
      Audio.sfx('uiDeny');
      this.shake();
      if (this.opts.onDenied) this.opts.onDenied(this);
      return;
    }
    if (this.opts.sfx !== null) Audio.sfx(this.opts.sfx || 'uiConfirm');
    if (this.opts.onClick) this.opts.onClick(this);
  }

  shake() {
    const x0 = this.x;
    this.scene.tweens.add({ targets: this, x: x0 + 6, duration: 40, yoyo: true, repeat: 2, onComplete: () => this.setX(x0) });
  }

  setFocus(f) {
    if (this.focused === f) return;
    this.focused = f;
    this.redraw();
    this.scene.tweens.killTweensOf(this.glow);
    if (f) {
      this.glow.setAlpha(0.18);
      this.scene.tweens.add({ targets: this.glow, alpha: 0.32, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    } else this.glow.setAlpha(0);
  }

  setEnabled(e) {
    this.enabled = e;
    this.redraw();
    return this;
  }

  setLabel(t) {
    this.label.setText(t);
    return this;
  }

  setValue(t) {
    if (this.valueText) this.valueText.setText(t);
    return this;
  }

  setAccent(a) {
    this.accent = a;
    this.glow.setTint(a);
    this.redraw();
    return this;
  }

  refresh() {
    if (this.opts.refresh) this.opts.refresh(this);
    this.redraw();
  }

  redraw() {
    const { w, h, opts } = this;
    const g = this.bg;
    const f = this.focused;
    const style = opts.style || 'normal';
    g.clear();
    const accent = this.accent;
    const r = opts.radius ?? Math.min(10, h / 3);
    if (style !== 'ghost' || f) {
      const base = style === 'primary' ? 0x3a2a6a : opts.fill ?? C.button;
      g.fillStyle(f ? (style === 'primary' ? 0x4a3688 : C.buttonHi) : base, style === 'ghost' ? 0.6 : 0.92);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, f ? 0.09 : 0.05, f ? 0.09 : 0.05, 0, 0);
      g.fillRect(-w / 2 + r, -h / 2 + 1, w - r * 2, h * 0.45);
    }
    const border = f ? accent : style === 'primary' ? C.gold : C.border;
    g.lineStyle(f ? 2.5 : 1.5, border, f ? 1 : style === 'ghost' ? 0.35 : 0.55);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    if (f) {
      g.fillStyle(accent, 1);
      const d = (cx, s) => g.fillPoints([{ x: cx, y: -s }, { x: cx + s, y: 0 }, { x: cx, y: s }, { x: cx - s, y: 0 }], true);
      d(-w / 2, 5);
      d(w / 2, 5);
    }
    const col = !this.enabled ? C.faint : f ? (opts.focusColor ?? accent) : opts.color ?? C.text;
    this.label.setColor(hex(col));
    if (this.icon && this.icon.setTint && this.icon.type === 'Image' && opts.tintIcon) this.icon.setTint(col);
    if (this.icon && this.icon.type === 'Text') this.icon.setColor(hex(!this.enabled ? C.faint : f ? accent : opts.iconColor ?? C.violet));
    this.setAlpha(this.enabled || opts.keepAlpha ? 1 : 0.75);
    if (this.barG) {
      const v = opts.bar.get();
      const bg = this.barG;
      bg.clear();
      bg.fillStyle(C.ink, 1);
      bg.fillRoundedRect(this.barX, -5, this.barW, 10, 5);
      bg.fillGradientStyle(C.border, accent, C.border, accent, 1);
      if (v > 0) bg.fillRect(this.barX + 2, -3, (this.barW - 4) * v, 6);
      bg.lineStyle(1, C.border, 0.6);
      bg.strokeRoundedRect(this.barX, -5, this.barW, 10, 5);
      bg.fillStyle(f ? accent : C.text, 1);
      bg.fillCircle(this.barX + this.barW * v, 0, f ? 8 : 7);
      bg.lineStyle(2, C.bg, 1);
      bg.strokeCircle(this.barX + this.barW * v, 0, f ? 8 : 7);
    }
  }
}

// --------------------------------------------------------------- navigation
const worldPos = (obj) => {
  const m = obj.getWorldTransformMatrix();
  return { x: m.tx, y: m.ty };
};

const isShown = (obj) => {
  let o = obj;
  while (o) {
    if (!o.visible || o.alpha === 0) return false;
    o = o.parentContainer;
  }
  return true;
};

/**
 * Keyboard focus manager for a set of buttons. Arrow keys / WASD move spatially to the
 * nearest item in that direction; confirm keys activate; back keys call onBack.
 */
export class Nav {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.items = [];
    this.current = null;
    this.onBack = opts.onBack || null;
    this.onFocus = opts.onFocus || null;
    this.wrap = opts.wrap ?? false;
  }

  setItems(items, focusItem = null, silent = true) {
    if (this.current && !items.includes(this.current)) this.current.setFocus(false);
    if (!items.includes(this.current)) this.current = null;
    this.items = items.filter(Boolean);
    for (const it of this.items) it.nav = this;
    const target = focusItem && this.items.includes(focusItem) ? focusItem : this.current || this.items.find((i) => i.enabled !== false) || this.items[0];
    if (target) this.focus(target, silent, true);
    return this;
  }

  add(item) {
    this.items.push(item);
    item.nav = this;
    return item;
  }

  focus(item, silent = false, force = false) {
    if (!item || (item === this.current && !force)) return;
    if (this.current && this.current !== item) this.current.setFocus(false);
    this.current = item;
    item.setFocus(true);
    if (!silent) Audio.sfx('uiMove');
    if (this.onFocus) this.onFocus(item);
  }

  candidates() {
    return this.items.filter((i) => i !== this.current && isShown(i) && i.navSkip !== true);
  }

  move(dx, dy) {
    const cur = this.current;
    if (cur && cur.opts && cur.opts.onDir && cur.opts.onDir(dx, dy, cur)) return true;
    if (!cur || !isShown(cur)) {
      const first = this.items.find((i) => isShown(i));
      if (first) this.focus(first);
      return true;
    }
    const p = worldPos(cur);
    let best = null;
    let bestScore = Infinity;
    for (const it of this.candidates()) {
      const q = worldPos(it);
      const vx = q.x - p.x;
      const vy = q.y - p.y;
      const along = vx * dx + vy * dy;
      if (along <= 6) continue;
      const perp = Math.abs(vx * dy - vy * dx);
      const score = along + perp * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    if (!best && this.wrap) {
      // wrap to the farthest item on the opposite side along the same line
      let far = -Infinity;
      for (const it of this.candidates()) {
        const q = worldPos(it);
        const along = -((q.x - p.x) * dx + (q.y - p.y) * dy);
        const perp = Math.abs((q.x - p.x) * dy - (q.y - p.y) * dx);
        if (perp < 40 && along > far) {
          far = along;
          best = it;
        }
      }
    }
    if (best) this.focus(best);
    return true;
  }

  confirm() {
    if (this.current && isShown(this.current)) this.current.activate();
  }

  back() {
    if (this.onBack) {
      this.onBack();
      return true;
    }
    return false;
  }

  /** Returns true if the key was consumed. */
  handleKey(e) {
    const dir = DIRS[e.code];
    if (dir) return this.move(dir[0], dir[1]);
    if (CONFIRM_KEYS.includes(e.code)) {
      if (!e.repeat) this.confirm();
      return true;
    }
    if (BACK_KEYS.includes(e.code)) {
      if (!e.repeat) return this.back();
      return true;
    }
    return false;
  }
}

/** A stack of Navs: the top one receives keyboard input (modals push on top). */
export class NavStack {
  constructor(scene, fallback = null) {
    this.scene = scene;
    this.stack = [];
    this.fallback = fallback;
    this.onKey = (e) => {
      if (scene.uiLocked && scene.uiLocked()) return;
      const top = this.top();
      if (top && top.handleKey(e)) return;
      if (this.fallback) this.fallback(e);
    };
    scene.input.keyboard.on('keydown', this.onKey);
    scene.events.once('shutdown', () => scene.input.keyboard.off('keydown', this.onKey));
  }

  top() {
    return this.stack[this.stack.length - 1] || null;
  }

  push(nav) {
    this.stack.push(nav);
    return nav;
  }

  pop(nav) {
    const i = nav ? this.stack.lastIndexOf(nav) : this.stack.length - 1;
    if (i >= 0) this.stack.splice(i, 1);
  }

  replace(nav) {
    this.stack = [nav];
    return nav;
  }
}

// --------------------------------------------------------------- scrolling
/**
 * Vertically scrolling, masked region. Content goes in `view.content` (local coords start
 * at 0,0 = viewport top-left). Drag, mouse wheel and keyboard focus all scroll it.
 */
export class ScrollView {
  constructor(scene, parent, x, y, w, h) {
    this.scene = scene;
    this.parent = parent;
    this.rect = new Rect(x, y, w, h);
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.content = scene.add.container(x, y);
    parent.add(this.content);
    this.maskG = scene.make.graphics({}, false);
    this.maskG.fillStyle(0xffffff, 1);
    this.maskG.fillRect(x, y, w, h);
    this.content.setMask(this.maskG.createGeometryMask());
    this.bar = scene.add.graphics();
    parent.add(this.bar);
    this.scroll = 0;
    this.target = 0;
    this.contentH = h;
    this.drag = null;

    const shown = () => isShown(parent) && !(scene.uiLocked && scene.uiLocked());
    this.handlers = {
      wheel: (p, objs, dx, dy) => {
        if (shown() && this.rect.contains(p.x, p.y)) this.scrollTo(this.target + dy * 0.7);
      },
      pointerdown: (p) => {
        if (shown() && this.rect.contains(p.x, p.y)) this.drag = { y: p.y, start: this.target, id: p.id };
      },
      pointermove: (p) => {
        if (!this.drag || this.drag.id !== p.id || !p.isDown) return;
        this.scrollTo(this.drag.start - (p.y - this.drag.y), true);
      },
      pointerup: () => (this.drag = null),
    };
    for (const [k, fn] of Object.entries(this.handlers)) scene.input.on(k, fn);
    this.onUpdate = () => this.update();
    scene.events.on('update', this.onUpdate);
    scene.events.once('shutdown', () => this.destroy());
    parent.once('destroy', () => this.destroy());
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    for (const [k, fn] of Object.entries(this.handlers)) this.scene.input.off(k, fn);
    this.scene.events.off('update', this.onUpdate);
    if (this.maskG) this.maskG.destroy();
    this.maskG = null;
  }

  setContentHeight(h) {
    this.contentH = Math.max(h, this.h);
    this.scrollTo(this.target, true);
  }

  get maxScroll() {
    return Math.max(0, this.contentH - this.h);
  }

  scrollTo(v, instant = false) {
    this.target = Phaser.Math.Clamp(v, 0, this.maxScroll);
    if (instant) this.scroll = this.target;
  }

  /** Scrolls so the content-local band [top, bottom] is visible. */
  reveal(top, bottom, pad = 12) {
    if (top - pad < this.target) this.scrollTo(top - pad);
    else if (bottom + pad > this.target + this.h) this.scrollTo(bottom + pad - this.h);
  }

  /** Makes every button in the content respect the viewport for pointer input. */
  clipButtons(buttons) {
    for (const b of buttons) b.clip = this.rect;
  }

  update() {
    this.scroll += (this.target - this.scroll) * 0.25;
    if (Math.abs(this.target - this.scroll) < 0.5) this.scroll = this.target;
    this.content.y = this.y - Math.round(this.scroll);
    const g = this.bar;
    g.clear();
    if (this.maxScroll <= 0) return;
    const trackH = this.h - 8;
    const thumbH = Math.max(30, (trackH * this.h) / this.contentH);
    const ty = this.y + 4 + ((trackH - thumbH) * this.scroll) / this.maxScroll;
    g.fillStyle(C.ink, 0.8);
    g.fillRoundedRect(this.x + this.w + 6, this.y + 4, 6, trackH, 3);
    g.fillStyle(C.border, 0.9);
    g.fillRoundedRect(this.x + this.w + 6, ty, 6, thumbH, 3);
  }
}

// ------------------------------------------------------------------ dialog
/**
 * Modal confirmation dialog. Returns a controller; pushes its own Nav onto `stack`.
 * opts: { title, text, yes, no, onYes, onNo, accent, danger }
 */
export function confirmDialog(scene, stack, opts) {
  const c = scene.add.container(0, 0).setDepth(500);
  const shade = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, C.bg, 0.75).setOrigin(0).setInteractive();
  const W = 440;
  const H = 220;
  const cx = scene.scale.width / 2;
  const cy = scene.scale.height / 2;
  const accent = opts.danger ? C.red : opts.accent ?? C.border;
  const g = panel(scene, cx, cy, W, H, { accent });
  const title = scene.add.text(cx, cy - 66, opts.title || 'ARE YOU SURE?', textStyle(26, opts.danger ? C.red : C.gold)).setOrigin(0.5);
  const text = scene.add
    .text(cx, cy - 16, opts.text || '', textStyle(16, C.dim, false, { align: 'center', wordWrap: { width: W - 60 } }))
    .setOrigin(0.5);
  c.add([shade, g, title, text]);
  const close = () => {
    stack.pop(nav);
    c.destroy();
  };
  const nav = new Nav(scene, {
    onBack: () => {
      Audio.sfx('uiBack');
      close();
      if (opts.onNo) opts.onNo();
    },
  });
  const yes = new Button(scene, cx - 92, cy + 60, 160, 46, {
    label: opts.yes || 'YES',
    accent,
    style: 'primary',
    onClick: () => {
      close();
      if (opts.onYes) opts.onYes();
    },
  });
  const no = new Button(scene, cx + 92, cy + 60, 160, 46, {
    label: opts.no || 'CANCEL',
    sfx: 'uiBack',
    onClick: () => {
      close();
      if (opts.onNo) opts.onNo();
    },
  });
  c.add([yes, no]);
  nav.setItems([yes, no], opts.danger ? no : yes);
  stack.push(nav);
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 150 });
  return { close, container: c };
}

export { Rect, isShown, worldPos, FONT };
