import Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER, QUALITY, applyQualitySetting } from '../config.js';
import TouchControls from '../systems/TouchControls.js';
import { WORLDS, LEVELS, levelEntry, nextLevelId, getLevelDef, parTime } from '../levels/registry.js';
import Audio from '../systems/Audio.js';
import { toggleFullscreen } from '../systems/fullscreen.js';
import Save from '../systems/SaveManager.js';
import { STAR_LABELS, getDaily } from '../systems/Progress.js';
import { C, hex, textStyle, formatTime, accentOfWorld } from '../ui/theme.js';
import { ensureUiTextures, drawPanel, heading, gemLabel, Button, Nav, NavStack } from '../ui/widgets.js';
import Toasts from '../ui/toasts.js';

const BOSS_BAR_W = 380;
const PROG_W = 240;
const HUD_L = 10;
const HUD_T = 10;
const HUD_W = 226;
const STAR_SHORT = ['ESCAPED', 'ALL CRYSTALS', 'UNDER PAR'];

/**
 * In-game overlay: crystal / death / timer panel, ability indicators, level progress, boss
 * bar, toasts, touch controls, pause menu (with settings) and the victory screen.
 * Lives alongside 'Game' and survives Game restarts. Works with mouse, keyboard and touch.
 */
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game');
    this.modal = null; // null | 'pause' | 'complete'
    this.panelReady = true;
    this.levelInfo = null;
    this.accent = C.border;
    this.shardTotal = 0;
    this.input.setTopOnly(true);
    ensureUiTextures(this);

    this.touch = new TouchControls(this);
    this.touch.isBlocked = () => !!this.modal;
    this.touch.setMode(Save.settings.touch);

    this.navs = new NavStack(this, (e) => this.onKey(e));
    this.toasts = new Toasts(this, { depth: 400, y: 236, bannerY: 134 });

    this.createStats();
    this.createAbilities();
    this.createProgressBar();
    this.createLevelCard();
    this.createBossBar();
    this.createHudButtons();
    this.hint = this.add.text(GAME_W - 18, 64, '', textStyle(12, C.faint, false)).setOrigin(1, 0).setShadow(0, 2, '#000', 4);
    this.layoutStats();

    const ge = this.game_.events;
    this.gameListeners = {
      'level-start': this.onLevelStart,
      checkpoint: this.onCheckpoint,
      death: this.onDeath,
      shard: this.onShard,
      secret: this.onSecret,
      'boss-start': this.onBossStart,
      'boss-hp': this.onBossHp,
      'boss-defeated': this.onBossDefeated,
      'boss-reset': this.onBossReset,
      'level-complete': this.onLevelComplete,
    };
    for (const [name, fn] of Object.entries(this.gameListeners)) ge.on(name, fn, this);

    // Auto-pause when the app is backgrounded (tab switch, phone call, alt-tab) so the
    // player never returns mid-jump into a hazard.
    const core = this.game.events;
    core.on(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
    core.on(Phaser.Core.Events.BLUR, this.pauseGame, this);

    this.events.once('shutdown', () => {
      for (const [name, fn] of Object.entries(this.gameListeners)) ge.off(name, fn, this);
      core.off(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
      core.off(Phaser.Core.Events.BLUR, this.pauseGame, this);
    });

    // Game emitted 'level-start' before this scene existed: show its info now.
    const g = this.game_;
    if (g.level && g.level.def) this.onLevelStart(this.levelInfoFromGame());
  }

  /** Blocks button / key input briefly after a panel opens (see armPanel). */
  uiLocked() {
    return !!this.modal && !this.panelReady;
  }

  levelInfoFromGame() {
    const g = this.game_;
    if (g && g.level && typeof g.levelInfo === 'function') return g.levelInfo();
    return { id: g && g.levelId, name: '', worldIndex: 0, shardTotal: 0 };
  }

  // ============================================================ HUD: stats
  createStats() {
    const c = this.add.container(0, 0).setDepth(10);
    this.statsG = this.add.graphics();
    this.deathText = this.add.text(0, 0, '☠ 0', textStyle(16, C.text)).setOrigin(0, 0.5).setShadow(0, 2, '#000', 4);
    this.timeText = this.add.text(0, 0, '0:00.00', textStyle(15, C.text)).setOrigin(0, 0.5).setShadow(0, 2, '#000', 4);
    this.parText = this.add.text(0, 0, '', textStyle(11, C.dim, false)).setOrigin(1, 0.5);
    this.wallet = gemLabel(this, 0, 0, Save.crystals, { size: 14, align: 'right' });
    c.add([this.statsG, this.deathText, this.timeText, this.parText, this.wallet]);
    this.gemSlots = [];
    this.statsC = c;
  }

  ensureGemSlots(n) {
    while (this.gemSlots.length < n) {
      const img = this.add.image(0, 0, 'ui-gem-o').setScale(0.72);
      this.statsC.add(img);
      this.gemSlots.push(img);
    }
    this.gemSlots.forEach((s, i) => s.setVisible(i < n));
  }

  layoutStats() {
    const timer = Save.settings.timer;
    const n = Math.min(this.shardTotal, 6);
    this.ensureGemSlots(n);
    const H = timer ? 64 : 40;
    this.statsG.clear();
    drawPanel(this.statsG, HUD_L + HUD_W / 2, HUD_T + H / 2, HUD_W, H, {
      accent: this.accent,
      radius: 8,
      alpha: 0.72,
      crest: false,
      inner: false,
      borderAlpha: 0.55,
      lineW: 1.5,
    });
    const y1 = HUD_T + 20;
    this.gemSlots.forEach((s, i) => s.setPosition(HUD_L + 22 + i * 22, y1));
    this.deathText.setPosition(n ? HUD_L + 22 + n * 22 + 2 : HUD_L + 14, y1);
    this.wallet.setPosition(HUD_L + HUD_W - 12, y1);
    const y2 = HUD_T + 46;
    this.timeText.setPosition(HUD_L + 14, y2).setVisible(timer);
    this.parText.setPosition(HUD_L + HUD_W - 12, y2).setVisible(timer);
    this.abilityY = HUD_T + H + 22;
    if (this.abilities) this.abilities.forEach((a) => a.c.setY(this.abilityY));
  }

  /** Screen position of crystal slot i (target for the collect animation). */
  gemPos(i) {
    const s = this.gemSlots[i];
    if (s && s.visible) return { x: s.x, y: s.y };
    return { x: HUD_L + 22, y: HUD_T + 20 };
  }

  refreshShards(popIndex = -1) {
    const run = this.game_.shardsCollected || [];
    const saved = this.levelInfo && this.levelInfo.id ? Save.shards(this.levelInfo.id) : [];
    this.gemSlots.forEach((s, i) => {
      if (i >= this.shardTotal) return;
      const got = !!run[i];
      s.setTexture(got || saved[i] ? 'ui-gem' : 'ui-gem-o').setAlpha(got ? 1 : saved[i] ? 0.35 : 1);
    });
    const slot = this.gemSlots[popIndex];
    if (slot) {
      this.tweens.killTweensOf(slot);
      slot.setScale(1.3);
      this.tweens.add({ targets: slot, scale: 0.72, duration: 380, ease: 'Back.out' });
    }
  }

  // ========================================================= HUD: abilities
  createAbilities() {
    const defs = [
      { key: 'jump', color: C.violet },
      { key: 'dash', color: C.cyan },
      { key: 'wall', color: C.green },
    ];
    this.abilities = defs.map((d, i) => {
      const c = this.add.container(HUD_L + 18 + i * 36, this.abilityY || 96).setDepth(10);
      const glow = this.add.image(0, 0, 'ui-soft').setDisplaySize(48, 48).setBlendMode('ADD').setTint(d.color).setAlpha(0);
      const g = this.add.graphics();
      c.add([glow, g]);
      return { ...d, c, g, glow, sig: '' };
    });
  }

  /** state: ready | idle | used | active; frac = recharge progress (0..1) while used. */
  drawAbility(a, state, frac = 0) {
    const sig = `${state}:${Math.round(frac * 24)}`;
    if (sig === a.sig) return;
    a.sig = sig;
    const g = a.g.clear();
    const used = state === 'used';
    const col = used ? C.faint : a.color;
    const alpha = used ? 0.55 : state === 'idle' ? 0.7 : 1;
    g.fillStyle(C.ink, 0.8);
    g.fillCircle(0, 0, 14);
    g.lineStyle(2, col, used ? 0.4 : 0.9 * alpha);
    g.strokeCircle(0, 0, 14);
    if (used && frac > 0) {
      g.lineStyle(3, a.color, 0.95);
      g.beginPath();
      g.arc(0, 0, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
      g.strokePath();
    }
    g.lineStyle(2.5, col, alpha);
    const chevron = (pts) => {
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.strokePath();
    };
    if (a.key === 'jump') {
      chevron([-6, -1, 0, -7, 6, -1]);
      chevron([-6, 6, 0, 0, 6, 6]);
    } else if (a.key === 'dash') {
      chevron([-7, -6, -1, 0, -7, 6]);
      chevron([0, -6, 6, 0, 0, 6]);
    } else {
      chevron([6, -8, 6, 8]);
      chevron([-3, -7, -3, 5]);
      chevron([-7, 1, -3, 5, 1, 1]);
    }
    this.tweens.killTweensOf(a.glow);
    a.glow.setAlpha(state === 'active' ? 0.6 : state === 'ready' ? 0.16 : 0);
    if (state === 'ready' && a.prevState === 'used') {
      a.c.setScale(1.3);
      this.tweens.add({ targets: a.c, scale: 1, duration: 250, ease: 'Back.out' });
    }
    a.prevState = state;
  }

  updateAbilities() {
    const p = this.game_.player;
    if (!p) return;
    const [jump, dash, wall] = this.abilities;
    this.drawAbility(jump, p.grounded || p.airJumps > 0 ? 'ready' : 'used');
    const ready = p.canDash && p.dashCooldown <= 0 && !p.dashing;
    const frac = !ready && p.dashCooldown > 0 ? 1 - p.dashCooldown / PLAYER.DASH_COOLDOWN : 0;
    this.drawAbility(dash, p.dashing ? 'active' : ready ? 'ready' : 'used', frac);
    this.drawAbility(wall, p.wallSliding ? 'active' : 'idle');
    const show = !p.dead && this.modal !== 'complete';
    for (const a of this.abilities) a.c.setVisible(show);
  }

  // ========================================================== HUD: progress
  createProgressBar() {
    const c = this.add.container(GAME_W / 2, 24).setDepth(10).setVisible(false);
    this.progTrack = this.add.graphics();
    this.progFill = this.add.graphics();
    this.progMarks = this.add.graphics();
    this.progGlow = this.add.image(0, 0, 'ui-soft').setDisplaySize(30, 30).setBlendMode('ADD').setAlpha(0.7);
    this.progDot = this.add.circle(0, 0, 5, C.text).setStrokeStyle(2, C.bg);
    this.progEnd = this.add.text(PROG_W / 2 + 16, 0, '', textStyle(15, C.gold)).setOrigin(0.5).setShadow(0, 0, '#000', 4);
    c.add([this.progTrack, this.progFill, this.progMarks, this.progGlow, this.progDot, this.progEnd]);
    this.progC = c;
  }

  setupProgress() {
    const lvl = this.game_.level;
    this.progBest = -1;
    this.progOn = false;
    this.progC.setVisible(false);
    if (!lvl || !lvl.exit || typeof lvl.spawnPoint !== 'function') return;
    this.progX0 = lvl.spawnPoint().x;
    this.progX1 = lvl.exit.x;
    if (Math.abs(this.progX1 - this.progX0) < 64) return;
    this.progOn = true;
    const t = this.progTrack.clear();
    t.fillStyle(C.ink, 0.72);
    t.fillRoundedRect(-PROG_W / 2 - 8, -7, PROG_W + 16, 14, 7);
    t.lineStyle(1.5, this.accent, 0.5);
    t.strokeRoundedRect(-PROG_W / 2 - 8, -7, PROG_W + 16, 14, 7);
    const boss = this.levelInfo && this.levelInfo.isBoss;
    this.progEnd.setText(boss ? '☠' : '✦').setColor(hex(boss ? C.red : C.gold));
    this.progGlow.setTint(this.accent);
    this.drawProgressMarks();
  }

  progFrac(x) {
    return Phaser.Math.Clamp((x - this.progX0) / (this.progX1 - this.progX0), 0, 1);
  }

  drawProgressMarks() {
    if (!this.progOn) return;
    const lvl = this.game_.level;
    const g = this.progMarks.clear();
    for (const cp of lvl.checkpoints || []) {
      const x = -PROG_W / 2 + PROG_W * this.progFrac(cp.x);
      g.fillStyle(cp.active ? C.cyan : C.faint, 1);
      g.fillPoints([{ x, y: -5 }, { x: x + 4, y: 0 }, { x, y: 5 }, { x: x - 4, y: 0 }], true);
    }
  }

  updateProgress() {
    const p = this.game_.player;
    const show = this.progOn && p && !this.bossBar.visible && this.modal !== 'complete';
    this.progC.setVisible(!!show);
    if (!show) return;
    const f = this.progFrac(p.sprite.x);
    if (f > this.progBest + 0.002) {
      this.progBest = f;
      const g = this.progFill.clear();
      g.fillGradientStyle(C.border, this.accent, C.border, this.accent, 0.95);
      g.fillRect(-PROG_W / 2, -3, PROG_W * f, 6);
    }
    const x = -PROG_W / 2 + PROG_W * f;
    this.progDot.setX(x);
    this.progGlow.setX(x);
  }

  // ================================================== HUD: card, boss, buttons
  createLevelCard() {
    const c = this.add.container(GAME_W / 2, 160).setAlpha(0).setDepth(20);
    this.cardTop = this.add.text(0, -26, '', textStyle(16, C.cyan)).setOrigin(0.5).setShadow(0, 2, '#000', 4);
    this.cardName = this.add.text(0, 8, '', textStyle(38, 0xf1eaff)).setOrigin(0.5).setShadow(0, 3, '#000', 8);
    this.cardLineL = this.add.rectangle(0, -26, 60, 2, C.cyan, 0.8).setOrigin(1, 0.5);
    this.cardLineR = this.add.rectangle(0, -26, 60, 2, C.cyan, 0.8).setOrigin(0, 0.5);
    this.cardSub = this.add.text(0, 44, '', textStyle(16, 0xff8fa3)).setOrigin(0.5).setShadow(0, 2, '#000', 4);
    c.add([this.cardLineL, this.cardLineR, this.cardTop, this.cardName, this.cardSub]);
    this.levelCard = c;
  }

  createBossBar() {
    const c = this.add.container(GAME_W / 2, 0).setVisible(false).setDepth(30);
    this.bossName = this.add.text(0, 12, '', textStyle(17, 0xffb3c1)).setOrigin(0.5, 0).setShadow(0, 2, '#000', 5);
    const frame = this.add.rectangle(0, 46, BOSS_BAR_W + 8, 22, C.bg, 0.85).setStrokeStyle(2, C.red, 0.8);
    this.bossTrail = this.add.rectangle(-BOSS_BAR_W / 2, 46, BOSS_BAR_W, 14, C.gold, 0.9).setOrigin(0, 0.5);
    this.bossFill = this.add.rectangle(-BOSS_BAR_W / 2, 46, BOSS_BAR_W, 14, 0xff3d6a, 1).setOrigin(0, 0.5);
    this.bossSegs = this.add.graphics();
    c.add([this.bossName, frame, this.bossTrail, this.bossFill, this.bossSegs]);
    this.bossBar = c;
  }

  /** Round HUD icon button (mouse + touch; generous hit area). */
  hudButton(x, y, drawIcon, onTap) {
    const c = this.add.container(x, y).setDepth(40);
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(C.ink, 0.6);
      bg.fillCircle(0, 0, 21);
      bg.lineStyle(2, hover ? C.cyan : C.border, hover ? 1 : 0.6);
      bg.strokeCircle(0, 0, 21);
    };
    draw(false);
    const icon = this.add.graphics();
    drawIcon(icon);
    c.add([bg, icon]);
    c.setSize(58, 58).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerup', () => {
      if (this.modal) return;
      onTap();
    });
    return c;
  }

  createHudButtons() {
    this.pauseBtn = this.hudButton(
      GAME_W - 36,
      34,
      (g) => {
        g.fillStyle(C.text, 1);
        g.fillRoundedRect(-8, -9, 6, 18, 2);
        g.fillRoundedRect(2, -9, 6, 18, 2);
      },
      () => this.pauseGame()
    );
    this.fsBtn = this.hudButton(
      GAME_W - 90,
      34,
      (g) => {
        g.lineStyle(2.5, C.text, 1);
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          g.beginPath();
          g.moveTo(sx * 9, sy * 3);
          g.lineTo(sx * 9, sy * 9);
          g.lineTo(sx * 3, sy * 9);
          g.strokePath();
        }
      },
      () => this.toggleFullscreen()
    ).setVisible(this.scale.fullscreen.available);
  }

  toggleFullscreen() {
    toggleFullscreen(this.scale);
  }

  // ============================================================= game events
  onLevelStart(data) {
    const base = this.levelInfoFromGame();
    const info = typeof data === 'string' ? { ...base, name: data } : { ...base, ...(data || {}) };
    this.levelInfo = info;
    this.closeModals();
    this.onBossReset();
    this.accent = accentOfWorld(info.worldIndex || 0);
    this.shardTotal = info.shardTotal || 0;
    this.layoutStats();
    this.refreshShards();
    this.wallet.setValue(Save.crystals);
    this.parText.setText(info.par ? `PAR ${formatTime(info.par)}` : '');
    this.setupProgress();

    const accent = info.isSecret ? C.gold : this.accent;
    const worldName = info.worldName || (WORLDS[info.worldIndex] && WORLDS[info.worldIndex].name) || '';
    const top = info.isSecret ? `SECRET LEVEL  ·  ${worldName.toUpperCase()}` : `${info.id || ''}${info.id && worldName ? '  ·  ' : ''}${worldName.toUpperCase()}`;
    this.cardTop.setText(top).setColor(hex(accent));
    this.cardName.setText((info.name || '').toUpperCase());
    const half = this.cardTop.width / 2 + 14;
    this.cardLineL.setX(-half).setFillStyle(accent, 0.8);
    this.cardLineR.setX(half).setFillStyle(accent, 0.8);
    let sub = '';
    if (info.isBoss) sub = `♛ ${(WORLDS[info.worldIndex] && WORLDS[info.worldIndex].boss) || 'BOSS'}`;
    const daily = getDaily();
    if (!sub && daily.levelId === info.id && !daily.done) sub = `☀ DAILY: ${daily.goalInfo ? daily.goalInfo.text : ''}`;
    this.cardSub.setText(sub).setColor(info.isBoss ? '#ff8fa3' : hex(C.gold));

    this.tweens.killTweensOf(this.levelCard);
    this.levelCard.setAlpha(0).setY(176);
    this.tweens.add({ targets: this.levelCard, alpha: 1, y: 160, duration: 450, delay: 150, ease: 'Quad.out' });
    this.tweens.add({ targets: this.levelCard, alpha: 0, y: 150, duration: 500, delay: 2800, ease: 'Quad.in' });
  }

  onCheckpoint() {
    this.toasts.message('CHECKPOINT', C.cyan);
    this.drawProgressMarks();
  }

  onSecret(data) {
    const d = data || {};
    this.toasts.message(d.total ? `HIDDEN PASSAGE  ${d.found}/${d.total}` : 'HIDDEN PASSAGE', C.gold);
    if (d.secretLevelUnlocked) {
      const e = levelEntry(d.secretLevelUnlocked);
      this.toasts.achievement({
        title: 'SECRET LEVEL UNLOCKED',
        name: e && e.name ? e.name : d.secretLevelUnlocked,
        icon: 'eye',
        color: C.gold,
        sfx: 'secret',
      });
    }
  }

  onDeath() {
    this.tweens.killTweensOf(this.deathText);
    this.deathText.setScale(1.3).setColor('#ff8fa3');
    this.tweens.add({ targets: this.deathText, scale: 1, duration: 300, ease: 'Quad.out', onComplete: () => this.deathText.setColor(hex(C.text)) });
  }

  onShard(data) {
    if (data && data.total) this.shardTotal = data.total;
    const idx = data && data.index != null ? data.index : -1;
    // the crystal flies to its HUD slot first (see GameScene.collectShards)
    this.time.delayedCall(450, () => this.refreshShards(idx));
  }

  onBossStart(data) {
    const d = data || {};
    this.bossMax = Math.max(1, d.maxHp || d.hp || 1);
    this.bossHp = d.hp != null ? d.hp : this.bossMax;
    this.bossName.setText((d.name || 'BOSS').toUpperCase());
    this.bossSegs.clear();
    if (this.bossMax > 1 && this.bossMax <= 40) {
      this.bossSegs.fillStyle(C.bg, 1);
      const step = BOSS_BAR_W / this.bossMax;
      for (let i = 1; i < this.bossMax; i++) this.bossSegs.fillRect(-BOSS_BAR_W / 2 + i * step - 1, 39, 2, 14);
    }
    const w = (BOSS_BAR_W * this.bossHp) / this.bossMax;
    this.tweens.killTweensOf([this.bossFill, this.bossTrail, this.bossBar]);
    this.bossFill.setFillStyle(0xff3d6a, 1);
    this.bossFill.width = 0;
    this.bossTrail.width = 0;
    this.bossBar.setVisible(true).setAlpha(0).setY(-20).setX(GAME_W / 2);
    this.tweens.add({ targets: this.bossBar, alpha: 1, y: 0, duration: 400, ease: 'Quad.out' });
    this.tweens.add({ targets: [this.bossFill, this.bossTrail], width: w, duration: 800, delay: 200, ease: 'Quad.out' });
  }

  onBossHp(data) {
    const d = data || {};
    if (!this.bossBar.visible) this.onBossStart({ name: this.bossName.text, ...d });
    if (d.maxHp) this.bossMax = d.maxHp;
    const prev = this.bossHp;
    this.bossHp = Math.max(0, d.hp != null ? d.hp : 0);
    const w = (BOSS_BAR_W * this.bossHp) / (this.bossMax || 1);
    this.tweens.killTweensOf([this.bossFill, this.bossTrail]);
    this.tweens.add({ targets: this.bossFill, width: w, duration: 90 });
    this.tweens.add({ targets: this.bossTrail, width: w, duration: 450, delay: 300, ease: 'Quad.in' });
    if (prev != null && this.bossHp < prev) {
      this.bossFill.setFillStyle(0xffffff, 1);
      this.time.delayedCall(80, () => this.bossFill.setFillStyle(0xff3d6a, 1));
      this.tweens.killTweensOf(this.bossBar);
      this.bossBar.setAlpha(1).setY(0);
      this.tweens.add({
        targets: this.bossBar,
        x: GAME_W / 2 + 5,
        duration: 40,
        yoyo: true,
        repeat: 2,
        onComplete: () => this.bossBar.setX(GAME_W / 2),
      });
    }
  }

  onBossDefeated(data) {
    if (!this.bossBar.visible) return;
    this.onBossHp({ hp: 0, maxHp: this.bossMax });
    this.tweens.add({ targets: this.bossBar, alpha: 0, delay: 700, duration: 500, onComplete: () => this.bossBar.setVisible(false) });
    const name = (data && data.name) || this.bossName.text;
    this.toasts.message(`${name.toUpperCase()} DEFEATED`, C.gold, 1800);
  }

  onBossReset() {
    if (!this.bossBar) return;
    this.tweens.killTweensOf([this.bossBar, this.bossFill, this.bossTrail]);
    this.bossBar.setVisible(false).setX(GAME_W / 2);
    this.bossHp = null;
  }

  // ============================================================== modals
  /** Short input guard so a held jump/tap doesn't instantly press a panel button. */
  armPanel(ms) {
    this.panelReady = false;
    if (this.armTimer) this.armTimer.remove();
    this.armTimer = this.time.delayedCall(ms, () => (this.panelReady = true));
  }

  shade(c, alpha = 0.72) {
    const s = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, C.bg, alpha).setInteractive();
    c.add(s);
    return s;
  }

  canPause() {
    const g = this.game_;
    return !this.modal && g.stats && !g.stats.finished && this.scene.isActive('Game');
  }

  pauseGame() {
    if (!this.canPause()) return;
    this.scene.pause('Game');
    this.modal = 'pause';
    Audio.duck(true);
    Audio.sfx('uiConfirm');
    this.buildPause();
    this.armPanel(150);
  }

  buildPause() {
    const c = this.add.container(0, 0).setDepth(200);
    this.pauseC = c;
    this.shade(c, 0.7);
    const cx = GAME_W / 2;
    const info = this.levelInfo || {};
    const H = 470;
    const top = GAME_H / 2 - H / 2;
    const g = this.add.graphics();
    drawPanel(g, cx, GAME_H / 2, 460, H, { accent: this.accent, alpha: 0.96, ornaments: true });
    c.add(g);
    c.add(heading(this, cx, top + 40, 'PAUSED', { size: 30 }));
    c.add(this.add.text(cx, top + 72, info.id ? `${info.isSecret ? 'SECRET' : info.id}  ·  ${info.name || ''}` : '', textStyle(14, C.dim, false)).setOrigin(0.5));

    // star conditions
    const g2 = this.game_;
    const saved = info.id ? Save.stars(info.id) : [false, false, false];
    const run = g2.shardsCollected || [];
    const got = run.filter(Boolean).length;
    const tot = this.shardTotal || run.length;
    const elapsed = g2.stats ? g2.stats.time : 0;
    const status = [
      'Reach the exit',
      tot ? `${got}/${tot} this run` : 'No crystals here',
      info.par ? (elapsed <= info.par ? `${formatTime(info.par - elapsed)} left` : 'Over par') : '—',
    ];
    STAR_LABELS.forEach((label, i) => {
      const y = top + 104 + i * 26;
      c.add(this.add.image(cx - 190, y, saved[i] ? 'ui-star' : 'ui-star-o').setScale(0.36).setAlpha(saved[i] ? 1 : 0.7));
      c.add(this.add.text(cx - 172, y, label, textStyle(14, saved[i] ? C.text : C.dim, false)).setOrigin(0, 0.5));
      const over = i === 2 && info.par && elapsed > info.par;
      c.add(this.add.text(cx + 196, y, status[i], textStyle(13, over ? 0xff8fa3 : C.cyan, false)).setOrigin(1, 0.5));
    });
    const daily = getDaily();
    if (daily.levelId === info.id && !daily.done && daily.goalInfo) {
      c.add(this.add.text(cx, top + 188, `☀ Daily: ${daily.goalInfo.text}  (+${daily.reward})`, textStyle(13, C.gold, false)).setOrigin(0.5));
    }

    const defs = [
      { label: 'RESUME', style: 'primary', onClick: () => this.resumeGame() },
      { label: 'RESTART LEVEL', onClick: () => this.restartLevel() },
      { label: 'SETTINGS', onClick: () => this.openSettings() },
      { label: 'LEVEL SELECT', onClick: () => this.toLevelSelect() },
      { label: 'MAIN MENU', onClick: () => this.toMenu('title') },
    ];
    const buttons = defs.map((d, i) => {
      const b = new Button(this, cx, top + 226 + i * 44, 280, 38, { size: 17, accent: this.accent, ...d });
      c.add(b);
      return b;
    });
    this.pauseNav = new Nav(this, { onBack: () => this.resumeGame(), wrap: true });
    this.pauseNav.setItems(buttons, buttons[0]);
    this.navs.push(this.pauseNav);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 140 });
  }

  resumeGame() {
    if (this.modal !== 'pause') return;
    this.closeSettings(true);
    if (this.pauseC) this.pauseC.destroy();
    this.pauseC = null;
    if (this.pauseNav) this.navs.pop(this.pauseNav);
    this.pauseNav = null;
    this.modal = null;
    Audio.duck(false);
    Audio.sfx('uiBack');
    if (this.scene.isPaused('Game')) this.scene.resume('Game');
  }

  openSettings() {
    if (this.settingsC) return;
    const c = this.add.container(0, 0).setDepth(210);
    this.settingsC = c;
    this.shade(c, 0.5);
    const cx = GAME_W / 2;
    const g = this.add.graphics();
    drawPanel(g, cx, GAME_H / 2, 480, 470, { accent: C.border, alpha: 0.97 });
    c.add(g);
    c.add(heading(this, cx, 66, 'SETTINGS', { size: 26 }));
    const on = (v) => (v ? 'ON' : 'OFF');
    const pct = (v) => `${Math.round((v ?? 1) * 100)}%`;
    const cycle = (key, opts) => (dir) => {
      const cur = opts.indexOf(Save.settings[key]);
      const next = opts[(cur + (dir || 1) + opts.length) % opts.length];
      Save.setSetting(key, next);
      if (key === 'quality') applyQualitySetting(next);
      if (key === 'touch') this.touch.setMode(next);
    };
    const vol = (bus) => ({
      get: () => (Audio.settings[bus] ? Audio.settings[`${bus}Vol`] ?? 1 : 0),
      set: (v) => {
        Audio.setVolume(bus, v);
        if (bus === 'music') Audio.setMusic(v > 0);
        else Audio.setSfx(v > 0);
        if (bus === 'sfx') Audio.sfx('uiMove');
      },
    });
    const toggleBus = (bus) => {
      const isOn = Audio.settings[bus];
      if (!isOn && (Audio.settings[`${bus}Vol`] ?? 1) === 0) Audio.setVolume(bus, 0.5);
      if (bus === 'music') Audio.setMusic(!isOn);
      else Audio.setSfx(!isOn);
    };
    const rows = [
      { label: 'Music', bar: vol('music'), value: () => (Audio.settings.music ? pct(Audio.settings.musicVol) : 'OFF'), click: () => toggleBus('music'), dir: (d) => vol('music').set(Phaser.Math.Clamp(vol('music').get() + d * 0.1, 0, 1)) },
      { label: 'Sound effects', bar: vol('sfx'), value: () => (Audio.settings.sfx ? pct(Audio.settings.sfxVol) : 'OFF'), click: () => toggleBus('sfx'), dir: (d) => vol('sfx').set(Phaser.Math.Clamp(vol('sfx').get() + d * 0.1, 0, 1)) },
      { label: 'Screen shake', value: () => on(Save.settings.shake), click: () => Save.setSetting('shake', !Save.settings.shake) },
      { label: 'Screen flashes', value: () => on(Save.settings.flashes), click: () => Save.setSetting('flashes', !Save.settings.flashes) },
      { label: 'Show run timer', value: () => on(Save.settings.timer), click: () => Save.setSetting('timer', !Save.settings.timer) },
      { label: 'Touch controls', value: () => Save.settings.touch.toUpperCase(), click: cycle('touch', ['auto', 'on', 'off']), dir: (d) => cycle('touch', ['auto', 'on', 'off'])(d) },
      { label: 'Visual quality', value: () => Save.settings.quality.toUpperCase(), click: cycle('quality', ['auto', 'low', 'high']), dir: (d) => cycle('quality', ['auto', 'low', 'high'])(d) },
    ];
    const refresh = () => {
      buttons.forEach((b) => b.refresh());
      this.layoutStats();
    };
    const buttons = rows.map((r, i) => {
      const b = new Button(this, cx, 108 + i * 42, 420, 36, {
        label: r.label,
        align: 'left',
        size: 15,
        value: r.value(),
        bar: r.bar,
        barW: 110,
        onClick: () => {
          r.click();
          refresh();
        },
        onDir: (dx) => {
          if (!dx) return false;
          if (r.dir) r.dir(dx);
          else r.click();
          Audio.sfx('uiMove');
          refresh();
          return true;
        },
        refresh: (btn) => btn.setValue(r.value()),
      });
      c.add(b);
      return b;
    });
    const back = new Button(this, cx, 108 + rows.length * 42 + 12, 200, 38, { label: 'BACK', size: 16, style: 'primary', sfx: 'uiBack', onClick: () => this.closeSettings() });
    c.add(back);
    c.add(this.add.text(cx, 500, 'Quality applies when the next level loads.  ←/→ adjust values.', textStyle(11, C.faint, false)).setOrigin(0.5));
    this.settingsNav = new Nav(this, { onBack: () => this.closeSettings(), wrap: true });
    this.settingsNav.setItems([...buttons, back], buttons[0]);
    this.navs.push(this.settingsNav);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 120 });
  }

  closeSettings(silent = false) {
    if (!this.settingsC) return;
    this.settingsC.destroy();
    this.settingsC = null;
    this.navs.pop(this.settingsNav);
    this.settingsNav = null;
    if (!silent) Audio.sfx('uiBack');
    this.layoutStats();
    this.refreshShards();
  }

  // ============================================================ victory
  onLevelComplete(raw) {
    const g = this.game_;
    const s = raw || {};
    const id = s.id || g.levelId || (this.levelInfo && this.levelInfo.id);
    const shards = s.shards || g.shardsCollected || [];
    const time = s.time != null ? s.time : g.stats ? g.stats.time : 0;
    const summary = s.summary || {
      id,
      time,
      deaths: s.deaths || 0,
      shards,
      par: parTime(id),
      stars: [true, shards.every(Boolean), false],
      newStars: [],
      firstClear: false,
      bestTime: s.bestTime != null ? s.bestTime : time,
      newBest: !!s.newBest,
      earned: [],
      total: 0,
      wallet: Save.crystals,
      achievements: [],
      daily: null,
    };
    const nextId = s.nextId !== undefined ? s.nextId : id ? nextLevelId(id) : null;
    if (this.completeTimer) this.completeTimer.remove();
    this.completeTimer = this.time.delayedCall(900, () => this.showVictory(summary, nextId));
  }

  showVictory(sum, nextId) {
    this.completeTimer = null;
    if (this.modal === 'pause') this.resumeGame();
    this.modal = 'complete';
    this.victoryNext = nextId;
    const info = this.levelInfo && this.levelInfo.id === sum.id ? this.levelInfo : { ...this.levelInfoFromGame(), id: sum.id };
    const entry = levelEntry(sum.id) || {};
    const isSecret = !!(info.isSecret || entry.secret);
    const isLast = !isSecret && !nextId;
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const gold = C.gold;
    Audio.sfx('victory');

    const root = this.add.container(0, 0).setDepth(220);
    this.victoryC = root;
    this.victoryFx = [];
    const shade = this.shade(root, 0.75);
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 350 });

    const rays = this.add.image(cx, 150, 'ui-rays').setTint(gold).setBlendMode('ADD').setAlpha(0).setScale(1.3);
    root.add(rays);
    this.tweens.add({ targets: rays, alpha: 0.32, duration: 600 });
    this.tweens.add({ targets: rays, angle: 360, duration: 24000, repeat: -1 });

    const confetti = this.add.particles(0, -10, 'ui-soft', {
      x: { min: 0, max: GAME_W },
      speedY: { min: 40, max: 110 },
      speedX: { min: -30, max: 30 },
      scale: { start: 0.22, end: 0.05 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 5200,
      frequency: QUALITY.low ? 260 : 110,
      tint: [gold, C.cyan, C.violet, this.accent],
      blendMode: 'ADD',
    });
    confetti.setDepth(221);
    this.victoryFx.push(confetti);

    const body = this.add.container(cx, cy).setDepth(222);
    this.victoryBody = body;
    const g = this.add.graphics();
    drawPanel(g, 0, 0, 640, 480, { accent: gold, alpha: 0.96, ornaments: true, crest: true });
    body.add(g);

    let title = 'LEVEL ESCAPED';
    if (isSecret) title = 'SECRET LEVEL CLEARED';
    else if (isLast) title = 'YOU ESCAPED THE VOID!';
    else if (info.isBoss) title = 'BOSS DEFEATED';
    body.add(heading(this, 0, -204, title, { size: title.length > 16 ? 28 : 32, color: gold }));
    const name = info.name || entry.name || '';
    const sub = `${isSecret ? 'SECRET' : sum.id}  ·  ${name}${sum.firstClear ? '   ✦ FIRST ESCAPE' : ''}`;
    body.add(this.add.text(0, -172, sub, textStyle(14, sum.firstClear ? C.gold : C.dim, false)).setOrigin(0.5));

    // ---- stars
    const newStars = sum.newStars || [];
    [0, 1, 2].forEach((i) => {
      const x = (i - 1) * 84;
      const y = i === 1 ? -120 : -110;
      const big = i === 1 ? 0.95 : 0.8;
      body.add(this.add.image(x, y, 'ui-star-o').setScale(big).setAlpha(0.5));
      body.add(this.add.text(x, -72, STAR_SHORT[i], textStyle(10, sum.stars[i] ? C.text : C.faint, false)).setOrigin(0.5));
      if (!sum.stars[i]) return;
      const star = this.add.image(x, y, 'ui-star').setScale(0).setAngle(-40);
      body.add(star);
      this.tweens.add({
        targets: star,
        scale: big,
        angle: 0,
        duration: 420,
        delay: 500 + i * 320,
        ease: 'Back.out',
        onStart: () => {
          Audio.sfx('star', i);
          const burst = this.add.particles(cx + x, cy + y, 'ui-soft', {
            speed: { min: 60, max: 200 },
            scale: { start: 0.3, end: 0 },
            lifespan: 600,
            tint: [gold, 0xffffff],
            blendMode: 'ADD',
            emitting: false,
          });
          burst.setDepth(223);
          burst.explode(QUALITY.low ? 10 : 22);
          this.victoryFx.push(burst);
        },
      });
      if (newStars.includes(i)) {
        const tag = this.add.text(x + 22, y - 26, 'NEW', textStyle(11, C.ink)).setOrigin(0.5).setBackgroundColor(hex(C.cyan)).setPadding(4, 1, 4, 1).setAlpha(0);
        body.add(tag);
        this.tweens.add({ targets: tag, alpha: 1, delay: 800 + i * 320, duration: 200 });
      }
    });

    // ---- left column: run stats
    const L = -290;
    const statRow = (i, label, value, color = C.text) => {
      const y = -40 + i * 30;
      body.add(this.add.text(L, y, label, textStyle(13, C.dim, false)).setOrigin(0, 0.5));
      const v = this.add.text(L + 250, y, value, textStyle(17, color)).setOrigin(1, 0.5).setShadow(0, 2, '#000', 4);
      body.add(v);
      return v;
    };
    statRow(0, 'TIME', formatTime(sum.time), sum.par && sum.time <= sum.par ? C.cyan : C.text);
    const best = statRow(1, 'BEST', formatTime(sum.bestTime != null ? sum.bestTime : sum.time));
    if (sum.newBest && sum.prevBest != null) {
      const pill = this.add.text(L + 120, -10, 'NEW BEST', textStyle(11, C.ink)).setOrigin(0.5).setBackgroundColor(hex(gold)).setPadding(5, 2, 5, 2).setScale(0);
      body.add(pill);
      this.tweens.add({ targets: pill, scale: 1, duration: 350, delay: 600, ease: 'Back.out' });
      best.setColor(hex(gold));
    }
    statRow(2, 'PAR', sum.par ? formatTime(sum.par) : '—');
    statRow(3, 'DEATHS', `${sum.deaths}`, sum.deaths === 0 ? C.green : C.text);
    body.add(this.add.text(L, 80, 'CRYSTALS', textStyle(13, C.dim, false)).setOrigin(0, 0.5));
    const tot = sum.shards.length;
    if (!tot) body.add(this.add.text(L + 250, 80, '—', textStyle(17, C.text)).setOrigin(1, 0.5));
    sum.shards.forEach((got, i) => {
      body.add(this.add.image(L + 250 - (tot - 1 - i) * 24 - 8, 80, got ? 'ui-gem' : 'ui-gem-o').setScale(0.7));
    });
    const daily = getDaily();
    let dailyLine = '';
    let dailyColor = C.dim;
    if (sum.daily) {
      dailyLine = `☀ Daily complete  ·  streak ${sum.daily.streak}`;
      dailyColor = gold;
    } else if (daily.levelId === sum.id && !daily.done && daily.goalInfo) {
      dailyLine = `☀ Daily not met: ${daily.goalInfo.text}`;
    }
    if (dailyLine) body.add(this.add.text(L, 116, dailyLine, textStyle(12, dailyColor, false)).setOrigin(0, 0.5));

    // ---- right column: rewards
    const R = 40;
    const RW = 250;
    body.add(this.add.text(R, -40, 'REWARDS', textStyle(13, C.dim)).setOrigin(0, 0.5));
    body.add(this.add.rectangle(R, -26, RW, 1, C.border, 0.5).setOrigin(0, 0.5));
    let lines = (sum.earned || []).slice();
    if (lines.length > 5) {
      const rest = lines.slice(4);
      lines = [...lines.slice(0, 4), { label: `Other rewards x${rest.length}`, amount: rest.reduce((n, e) => n + e.amount, 0) }];
    }
    if (!lines.length) body.add(this.add.text(R, -8, 'No new rewards this run', textStyle(13, C.faint, false)).setOrigin(0, 0.5));
    lines.forEach((e, i) => {
      const y = -8 + i * 22;
      const l = this.add.text(R, y, e.label, textStyle(13, C.text, false)).setOrigin(0, 0.5).setAlpha(0);
      const a = this.add.text(R + RW, y, `+${e.amount}`, textStyle(14, C.cyan)).setOrigin(1, 0.5).setAlpha(0);
      body.add([l, a]);
      this.tweens.add({ targets: [l, a], alpha: 1, x: '+=0', duration: 250, delay: 1300 + i * 140 });
    });
    body.add(this.add.rectangle(R, 106, RW, 1, C.border, 0.5).setOrigin(0, 0.5));
    body.add(this.add.text(R, 124, 'TOTAL', textStyle(14, C.dim)).setOrigin(0, 0.5));
    const totalLbl = gemLabel(this, R + RW, 124, 0, { size: 18, color: C.gold, align: 'right' });
    body.add(totalLbl);
    const wallet = sum.wallet != null ? sum.wallet : Save.crystals;
    const total = sum.total || 0;
    const startCount = 1300 + lines.length * 140 + 200;
    if (total > 0) {
      let lastTick = 0;
      this.tweens.addCounter({
        from: 0,
        to: total,
        duration: Math.min(1200, 300 + total * 6),
        delay: startCount,
        ease: 'Quad.out',
        onUpdate: (tw) => {
          const v = Math.round(tw.getValue());
          totalLbl.setValue(v);
          this.wallet.setValue(wallet - total + v);
          if (this.time.now - lastTick > 70) {
            lastTick = this.time.now;
            Audio.sfx('coin');
          }
        },
        onComplete: () => {
          totalLbl.setValue(total);
          this.wallet.setValue(wallet);
          this._walletShown = wallet;
        },
      });
    }
    this._walletShown = wallet;
    this.wallet.setValue(wallet - total);

    // ---- buttons
    const hasNext = !!nextId;
    const nextOk = hasNext && Save.isUnlocked(nextId);
    const defs = [
      {
        label: isLast ? 'CREDITS' : 'NEXT  ▸',
        style: 'primary',
        enabled: isLast || nextOk,
        onClick: () => (isLast ? this.toMenu('credits') : this.nextLevel()),
        onDenied: () => this.toasts.message(isSecret ? 'Return to the world map' : 'Next level is locked', C.red),
      },
      { label: 'REPLAY', onClick: () => this.restartLevel() },
      { label: 'LEVELS', onClick: () => this.toLevelSelect() },
      { label: 'MENU', onClick: () => this.toMenu('title') },
    ];
    const buttons = defs.map((d, i) => {
      const b = new Button(this, (i - 1.5) * 140, 196, 128, 40, { size: 16, accent: gold, ...d });
      body.add(b);
      return b;
    });
    this.victoryNav = new Nav(this, { wrap: true });
    this.victoryNav.setItems(buttons, buttons[0].enabled ? buttons[0] : buttons[1]);
    this.navs.push(this.victoryNav);

    body.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: body, scale: 1, alpha: 1, duration: 380, ease: 'Back.out' });
    this.armPanel(700);

    this.time.delayedCall(1800, () => {
      if (this.victoryC !== root) return;
      for (const a of sum.achievements || []) this.toasts.achievement(a);
      if (sum.daily) {
        this.toasts.achievement({
          title: 'DAILY CHALLENGE COMPLETE',
          name: (sum.daily.goal && sum.daily.goal.name) || 'Daily challenge',
          reward: sum.daily.reward,
          icon: 'sun',
          color: C.goldDeep,
        });
      }
    });
  }

  hideVictory() {
    if (this.completeTimer) {
      this.completeTimer.remove();
      this.completeTimer = null;
    }
    if (this.victoryC) {
      this.tweens.killTweensOf(this.victoryC.list);
      this.victoryC.destroy();
      this.victoryBody.destroy();
      for (const fx of this.victoryFx) fx.destroy();
    }
    this.victoryC = null;
    this.victoryBody = null;
    this.victoryFx = [];
    if (this.victoryNav) this.navs.pop(this.victoryNav);
    this.victoryNav = null;
  }

  // ============================================================== actions
  closeModals() {
    this.closeSettings(true);
    if (this.pauseC) this.pauseC.destroy();
    this.pauseC = null;
    if (this.pauseNav) this.navs.pop(this.pauseNav);
    this.pauseNav = null;
    this.hideVictory();
    this.modal = null;
    this.panelReady = true;
    Audio.duck(false);
    if (this.scene.isPaused('Game')) this.scene.resume('Game');
  }

  restartLevel() {
    this.closeModals();
    this.game_.restartLevel();
  }

  nextLevel() {
    const id = this.victoryNext;
    if (!id) return;
    this.closeModals();
    if (typeof this.game_.loadLevel === 'function') this.game_.loadLevel(id);
    else this.game_.scene.restart({ levelId: id });
  }

  toLevelSelect() {
    const id = (this.levelInfo && this.levelInfo.id) || this.game_.levelId;
    const focus = this.modal === 'complete' && this.victoryNext && Save.isUnlocked(this.victoryNext) ? this.victoryNext : id;
    this.leaveTo({ screen: 'levels', levelId: focus });
  }

  toMenu(screen = 'title') {
    this.leaveTo({ screen });
  }

  leaveTo(data) {
    this.closeModals();
    Save.persist();
    this.scene.stop('Game');
    this.scene.start('Menu', data);
  }

  // ================================================================ input
  onKey(e) {
    const code = e.code;
    if (code === 'KeyM' && !e.repeat) {
      Audio.toggleMusic();
      this.toasts.message(`MUSIC ${Audio.settings.music ? 'ON' : 'OFF'}`, C.violet);
      return;
    }
    if (e.repeat) return;
    if (code === 'KeyP' && this.modal === 'pause') this.resumeGame();
    else if ((code === 'Escape' || code === 'KeyP') && !this.modal) this.pauseGame();
  }

  update() {
    const g = this.game_;
    if (!g || !g.stats) return;
    this.deathText.setText(`☠ ${g.stats.deaths}`);
    if (Save.settings.timer) {
      const par = this.levelInfo && this.levelInfo.par;
      this.timeText.setText(formatTime(g.stats.time)).setColor(par && g.stats.time > par ? '#ff8fa3' : hex(C.text));
    }
    if (this.modal !== 'complete' && this._walletShown !== Save.crystals) {
      this._walletShown = Save.crystals;
      this.wallet.setValue(Save.crystals);
    }
    this.updateAbilities();
    this.updateProgress();
    this.hint.setText(this.touch.visible || this.modal ? '' : 'R: retry  ·  Esc: pause  ·  M: music');
    this.touch.container.setVisible(this.touch.visible && !this.modal);
    const hud = this.modal !== 'complete';
    this.pauseBtn.setVisible(hud);
    this.fsBtn.setVisible(hud && this.scale.fullscreen.available);
  }
}
