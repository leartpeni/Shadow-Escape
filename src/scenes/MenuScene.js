import Phaser from 'phaser';
import { GAME_W, GAME_H, applyQualitySetting } from '../config.js';
import { WORLDS, LEVELS, SECRET_LEVELS, getLevelDef, parTime, levelEntry } from '../levels/registry.js';
import Save from '../systems/SaveManager.js';
import Audio from '../systems/Audio.js';
import { toggleFullscreen } from '../systems/fullscreen.js';
import { ensureBackdrop, ensureThumb } from '../gfx/themeTextures.js';
import makePlayerTextures from '../gfx/playerTextures.js';
import { makeFxTextures } from '../systems/Effects.js';
import { CATALOG, findItem, isOwned, unlockText, buy, applyLook, previewTexture, createTrail } from '../systems/Cosmetics.js';
import { ACHIEVEMENTS, STAR_LABELS, checkAchievements, getDaily } from '../systems/Progress.js';
import { C, hex, formatTime, formatDuration, themeOfWorld, accentOf, accentOfWorld, motesOf, ROMAN, textStyle } from '../ui/theme.js';
import { ensureUiTextures, panel, heading, gemLabel, starRow, badge, Button, Nav, NavStack, ScrollView, confirmDialog } from '../ui/widgets.js';
import Toasts from '../ui/toasts.js';

export { formatTime };

const GROUND_Y = 500;
const ADD = Phaser.BlendModes.ADD;
const IDLE_FRAMES = ['idle0', 'idle1', 'idle2', 'idle3', 'idle4', 'idle5', 'blink'];
const IDLE_SEQ = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 0, 6, 0];
const TOTAL_STARS = (LEVELS.length + SECRET_LEVELS.length) * 3;

const levelName = (id) => {
  try {
    return getLevelDef(id).name;
  } catch (e) {
    return '';
  }
};
const shardTotalOf = (id) => {
  try {
    return getLevelDef(id).shards.length;
  } catch (e) {
    return 0;
  }
};
const bossShort = (wi) => (WORLDS[wi] ? WORLDS[wi].boss.split(',')[0] : '');

/**
 * Main menu with every meta screen: title (animated logo), world select, level select,
 * character wardrobe, settings, achievements and credits. Mouse, touch and keyboard.
 * Start data: { screen: 'title' | 'worlds' | 'levels' | 'character' | ..., levelId }.
 */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.startData = data || {};
  }

  create() {
    if (this.scene.isActive('UI') || this.scene.isPaused('UI')) this.scene.stop('UI');
    if (this.scene.isActive('Game') || this.scene.isPaused('Game')) this.scene.stop('Game');

    ensureUiTextures(this);
    makeFxTextures(this);
    applyLook(this);
    this.leaving = false;
    this.transitioning = false;
    this.uiLocked = () => this.leaving || this.transitioning;
    this.input.setTopOnly(true);
    this.screen = null;
    this.screenC = null;
    this.theme = null;
    this.screenKey = null;
    this.t = 0;

    WORLDS.forEach((w) => ensureThumb(this, w.theme));
    const contEntry = levelEntry(Save.continueId());
    this.createBackdrop();
    this.setTheme(themeOfWorld(contEntry ? contEntry.world : 0), true);
    this.createLogo();
    this.createTopBar();
    this.toasts = new Toasts(this, { y: 112, bannerY: 92 });
    this.navs = new NavStack(this, (e) => this.onGlobalKey(e));

    Audio.duck(false);
    Audio.music('menu');

    const sd = this.startData;
    if (sd.screen === 'levels') {
      const e = levelEntry(sd.levelId);
      this.go('levels', { world: e ? e.world : contEntry ? contEntry.world : 0, focus: sd.levelId }, true);
    } else if (sd.screen && this[`build_${sd.screen}`]) this.go(sd.screen, sd.arg || null, true);
    else this.go('title', null, true);

    this.scale.on('enterfullscreen', this.onFsChange, this);
    this.scale.on('leavefullscreen', this.onFsChange, this);
    this.events.once('shutdown', () => {
      this.scale.off('enterfullscreen', this.onFsChange, this);
      this.scale.off('leavefullscreen', this.onFsChange, this);
    });

    this.cameras.main.fadeIn(350, 7, 6, 13);
    this.time.delayedCall(700, () => this.announce(checkAchievements()));
  }

  announce(list) {
    if (!list || !list.length) return;
    list.forEach((a) => this.toasts.achievement(a));
    this.refreshTopBar();
  }

  onFsChange() {
    if (this.screen === 'settings' && this.screenRefresh) this.screenRefresh();
  }

  // ================================================================ backdrop
  tex(base, theme) {
    const k = `${base}_${theme}`;
    if (this.textures.exists(k)) return k;
    return this.textures.exists(base) ? base : '__DEFAULT';
  }

  createBackdrop() {
    const layer = () => {
      const c = this.add.container(0, 0);
      c.sky = this.add.image(0, 0, '__DEFAULT').setOrigin(0);
      c.far = this.add.tileSprite(0, 0, GAME_W, GAME_H, '__DEFAULT').setOrigin(0);
      c.mid = this.add.tileSprite(0, 0, GAME_W, GAME_H, '__DEFAULT').setOrigin(0);
      c.near = this.add.tileSprite(0, 0, GAME_W, GAME_H, '__DEFAULT').setOrigin(0).setAlpha(0.92);
      c.add([c.sky, c.far, c.mid, c.near]);
      return c;
    };
    this.bgA = layer();
    this.bgB = layer().setAlpha(0);
    this.scrollX = 0;

    const v = this.add.graphics();
    v.fillGradientStyle(C.bg, C.bg, C.bg, C.bg, 0.6, 0.6, 0, 0);
    v.fillRect(0, 0, GAME_W, 170);
    v.fillGradientStyle(C.bg, C.bg, C.bg, C.bg, 0, 0, 0.65, 0.65);
    v.fillRect(0, GAME_H - 170, GAME_W, 170);

    this.ground = this.add.rectangle(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y, C.bg, 1).setOrigin(0);
    this.groundLine = this.add.rectangle(0, GROUND_Y, GAME_W, 2, C.cyan, 0.6).setOrigin(0);
    this.dimmer = this.add.rectangle(0, 0, GAME_W, GAME_H, C.bg, 1).setOrigin(0).setAlpha(0);

    this.moteColors = [C.cyan, C.violet];
    if (this.textures.exists('dot')) {
      this.motes = this.add.particles(0, 0, 'dot', {
        x: { min: 0, max: GAME_W },
        y: { min: 60, max: GAME_H },
        lifespan: { min: 4000, max: 8000 },
        speedX: { min: -14, max: 14 },
        speedY: { min: -28, max: -6 },
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: { onEmit: () => Phaser.Utils.Array.GetRandom(this.moteColors) },
        blendMode: ADD,
        frequency: 110,
      });
      this.motes.fastForward(5000);
    }

    this.heroGlow = this.add.image(190, GROUND_Y - 40, 'glow').setScale(1.4).setAlpha(0.35).setBlendMode(ADD);
    this.hero = this.add.sprite(190, GROUND_Y, 'shadow', 'idle0').setOrigin(0.5, 1).setScale(2);
    if (this.anims.exists('run')) this.hero.play('run');
    this.makeHeroTrail();
    this.time.addEvent({ delay: 3600, loop: true, callback: () => this.heroJump() });
  }

  makeHeroTrail() {
    if (this.heroTrail) this.heroTrail.destroy();
    this.heroTrail = createTrail(this, this.hero, Save.equipped('effect'), 1);
    if (this.heroTrail) {
      this.heroTrail.followOffset.set(-6, -40);
      this.heroTrail.setVisible(this.hero.visible);
    }
  }

  heroJump() {
    if (!this.hero.visible || this.heroJumping) return;
    this.heroJumping = true;
    if (this.anims.exists('jump')) this.hero.play('jump');
    this.tweens.add({
      targets: this.hero,
      y: GROUND_Y - 90,
      duration: 380,
      ease: 'Quad.out',
      onComplete: () => {
        if (this.anims.exists('fall')) this.hero.play('fall');
        this.tweens.add({
          targets: this.hero,
          y: GROUND_Y,
          duration: 340,
          ease: 'Quad.in',
          onComplete: () => {
            this.heroJumping = false;
            if (this.anims.exists('run')) this.hero.play('run');
          },
        });
      },
    });
  }

  setTheme(theme, instant = false) {
    if (theme === this.theme) return;
    this.theme = theme;
    const accent = accentOf(theme);
    this.moteColors = motesOf(theme);
    this.groundLine.setFillStyle(accent, 0.6);
    this.heroGlow.setTint(accent);
    const front = instant ? this.bgA : this.bgB;
    ensureBackdrop(this, theme);
    front.sky.setTexture(this.tex('sky', theme)).setDisplaySize(GAME_W, GAME_H);
    front.far.setTexture(this.tex('bg_far', theme));
    front.mid.setTexture(this.tex('bg_mid', theme));
    front.near.setTexture(this.tex('bg_near', theme));
    this.tweens.killTweensOf([this.bgA, this.bgB]);
    if (instant) {
      this.bgA.setAlpha(1);
      this.bgB.setAlpha(0);
      return;
    }
    this.tweens.add({
      targets: this.bgB,
      alpha: 1,
      duration: 450,
      onComplete: () => {
        const a = this.bgA;
        this.bgA = this.bgB;
        this.bgB = a;
        this.bgB.setAlpha(0);
        this.children.moveBelow(this.bgB, this.bgA);
      },
    });
  }

  showHero(on) {
    this.hero.setVisible(on);
    this.heroGlow.setVisible(on);
    this.ground.setVisible(on);
    this.groundLine.setVisible(on);
    if (this.heroTrail) this.heroTrail.setVisible(on);
  }

  update(time, delta) {
    this.t += delta / 1000;
    const speed = this.screen === 'title' ? 1 : 0.25;
    this.scrollX += delta * 0.06 * speed;
    for (const c of [this.bgA, this.bgB]) {
      c.far.tilePositionX = this.scrollX * 0.25;
      c.mid.tilePositionX = this.scrollX * 0.5;
      c.near.tilePositionX = this.scrollX * 0.8;
    }
    this.heroGlow.setPosition(this.hero.x, this.hero.y - 40);
    if (this.logo.visible) this.updateLogo();
    if (this.screenUpdate) this.screenUpdate(delta);
  }

  // ==================================================================== logo
  createLogo() {
    const c = this.add.container(GAME_W / 2, 96).setDepth(5);
    this.logo = c;
    const accent = C.violet;
    this.logoGlow = this.add.image(0, 10, 'ui-soft').setDisplaySize(620, 220).setTint(C.border).setAlpha(0.35).setBlendMode(ADD);
    this.logoRing = this.add.graphics();
    const g = this.logoRing;
    g.lineStyle(2, C.border, 0.35);
    g.strokeCircle(0, 0, 96);
    g.lineStyle(1, C.cyan, 0.25);
    g.strokeCircle(0, 0, 84);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r1 = i % 3 === 0 ? 100 : 98;
      g.lineStyle(2, i % 3 === 0 ? C.cyan : C.border, i % 3 === 0 ? 0.6 : 0.35);
      g.lineBetween(Math.cos(a) * 88, Math.sin(a) * 88, Math.cos(a) * r1, Math.sin(a) * r1);
      if (i % 6 === 0) {
        g.fillStyle(C.cyan, 0.7);
        const x = Math.cos(a) * 92;
        const y = Math.sin(a) * 92;
        g.fillPoints([{ x, y: y - 4 }, { x: x + 4, y }, { x, y: y + 4 }, { x: x - 4, y }], true);
      }
    }
    this.logoRing.setAlpha(0.8);
    c.add([this.logoGlow, this.logoRing]);

    const makeWord = (word, y, size, spacing, colors, stroke) => {
      const letters = [];
      let total = 0;
      for (const ch of word) {
        const t = this.add.text(0, y, ch, textStyle(size, C.text)).setOrigin(0.5);
        const grd = t.context.createLinearGradient(0, 0, 0, t.height);
        colors.forEach((col, i) => grd.addColorStop(i / (colors.length - 1), col));
        t.setFill(grd);
        t.setStroke(stroke, Math.max(3, size / 14));
        t.setShadow(0, 4, '#000000', 10, true, true);
        letters.push(t);
        total += t.width + spacing;
      }
      total -= spacing;
      let x = -total / 2;
      for (const t of letters) {
        t.setX(x + t.width / 2);
        t.baseY = y;
        x += t.width + spacing;
      }
      return letters;
    };
    this.logoTop = makeWord('SHADOW', -14, 80, 2, ['#ffffff', '#e3d6ff', '#9a7cf0', '#4a2e9a'], '#140c28');
    this.logoBottom = makeWord('ESCAPE', 46, 38, 16, ['#ffffff', '#c8fbff', '#5fd3ff'], '#0a1830');
    c.add([...this.logoTop, ...this.logoBottom]);

    const line = this.add.graphics();
    line.fillGradientStyle(accent, accent, accent, accent, 0, 0.9, 0, 0.9);
    line.fillRect(-190, 74, 160, 2);
    line.fillGradientStyle(accent, accent, accent, accent, 0.9, 0, 0.9, 0);
    line.fillRect(30, 74, 160, 2);
    line.fillStyle(C.cyan, 1);
    line.fillPoints([{ x: 0, y: 66 }, { x: 8, y: 75 }, { x: 0, y: 84 }, { x: -8, y: 75 }], true);
    line.fillStyle(C.bg, 1);
    line.fillPoints([{ x: 0, y: 71 }, { x: 4, y: 75 }, { x: 0, y: 79 }, { x: -4, y: 75 }], true);
    this.tagline = this.add.text(0, 98, 'Five worlds. One shadow. No way back.', textStyle(14, C.dim, false, { fontStyle: 'italic' })).setOrigin(0.5).setShadow(0, 2, '#000', 4);
    c.add([line, this.tagline]);

    this.logoShine = this.add.image(-320, 0, 'fx-flare').setScale(0.5, 2.4).setAngle(18).setBlendMode(ADD).setAlpha(0);
    c.add(this.logoShine);
    this.logoSparks = this.add.particles(0, 0, 'fx-sparkle', {
      x: { min: -240, max: 240 },
      y: { min: -60, max: 70 },
      lifespan: { min: 700, max: 1300 },
      speedY: { min: -20, max: -4 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 180 },
      tint: [C.cyan, C.violet, C.gold],
      blendMode: ADD,
      frequency: 160,
    });
    c.add(this.logoSparks);

    // Intro: letters drop in one by one.
    [...this.logoTop, ...this.logoBottom].forEach((t, i) => {
      t.setAlpha(0).setY(t.baseY - 70).setScale(1.4);
      this.tweens.add({ targets: t, alpha: 1, y: t.baseY, scale: 1, delay: 150 + i * 70, duration: 520, ease: 'Back.out' });
    });
    line.setScale(0, 1);
    this.tweens.add({ targets: line, scaleX: 1, delay: 900, duration: 500, ease: 'Quad.out' });
    this.tagline.setAlpha(0);
    this.tweens.add({ targets: this.tagline, alpha: 1, delay: 1200, duration: 600 });
    this.logoIntro = 0;
    this.time.addEvent({
      delay: 5200,
      loop: true,
      startAt: 2600,
      callback: () => {
        if (!this.logo.visible) return;
        this.logoShine.setX(-320).setAlpha(0.55);
        this.tweens.add({ targets: this.logoShine, x: 320, duration: 900, ease: 'Sine.inOut', onComplete: () => this.logoShine.setAlpha(0) });
      },
    });
  }

  updateLogo() {
    const t = this.t;
    this.logoRing.setRotation(t * 0.15);
    this.logoGlow.setAlpha(0.28 + Math.sin(t * 1.8) * 0.08);
    if (t > 2) {
      this.logoTop.forEach((l, i) => (l.y = l.baseY + Math.sin(t * 1.6 + i * 0.55) * 3));
      this.logoBottom.forEach((l, i) => (l.y = l.baseY + Math.sin(t * 1.6 + i * 0.55 + 1.5) * 2));
    }
  }

  // ================================================================= top bar
  createTopBar() {
    const c = this.add.container(0, 0).setDepth(60);
    this.topBar = c;
    this.starIcon = this.add.image(GAME_W - 268, 28, 'ui-star').setScale(0.42);
    this.starText = this.add.text(GAME_W - 254, 28, '', textStyle(17, C.gold)).setOrigin(0, 0.5).setShadow(0, 2, '#000', 4);
    this.wallet = gemLabel(this, GAME_W - 168, 28, Save.crystals, { size: 17 });
    c.add([this.starIcon, this.starText, this.wallet]);

    this.musicBtn = new Button(this, GAME_W - 70, 28, 38, 38, {
      label: '♪',
      size: 20,
      style: 'ghost',
      radius: 19,
      sfx: null,
      onClick: () => this.toggleMusic(),
    });
    this.musicSlash = this.add.rectangle(GAME_W - 70, 28, 26, 3, C.red).setAngle(-45);
    c.add([this.musicBtn, this.musicSlash]);
    if (this.scale.fullscreen.available) {
      this.fsBtn = new Button(this, GAME_W - 26, 28, 38, 38, { label: '⛶', size: 20, style: 'ghost', radius: 19, onClick: () => this.toggleFullscreen() });
      c.add(this.fsBtn);
    } else this.musicBtn.setX(GAME_W - 26) && this.musicSlash.setX(GAME_W - 26);
    // Pointer-only buttons: hover highlight without a Nav.
    for (const b of [this.musicBtn, this.fsBtn]) {
      if (!b) continue;
      b.on('pointerover', () => b.setFocus(true));
      b.on('pointerout', () => b.setFocus(false));
    }
    this.refreshTopBar();
  }

  refreshTopBar() {
    let stars = 0;
    for (const l of [...LEVELS, ...SECRET_LEVELS]) stars += Save.starCount(l.id);
    this.starText.setText(`${stars}/${TOTAL_STARS}`);
    this.wallet.setValue(Save.crystals);
    this.musicSlash.setVisible(!Audio.settings.music);
    this.musicBtn.label.setAlpha(Audio.settings.music ? 1 : 0.55);
  }

  bumpWallet() {
    this.refreshTopBar();
    this.tweens.killTweensOf(this.wallet);
    this.wallet.setScale(1.3);
    this.tweens.add({ targets: this.wallet, scale: 1, duration: 300, ease: 'Back.out' });
  }

  toggleMusic() {
    Audio.toggleMusic();
    this.refreshTopBar();
    if (this.screen === 'settings' && this.screenRefresh) this.screenRefresh();
  }

  toggleFullscreen() {
    toggleFullscreen(this.scale);
  }

  onGlobalKey(e) {
    if (e.repeat) return;
    if (e.code === 'KeyM') this.toggleMusic();
    else if (e.code === 'KeyF') this.toggleFullscreen();
    else if (this.screenKey) this.screenKey(e);
  }

  // ============================================================== navigation
  /** Switches screen with a cross-fade. Each build_<name>(arg) returns { c, nav }. */
  go(name, arg = null, instant = false) {
    if (this.transitioning || this.leaving) return;
    const prev = this.screenC;
    const build = () => {
      if (prev) prev.destroy();
      if (this.screenCleanup) this.screenCleanup();
      this.screenCleanup = null;
      this.screenUpdate = null;
      this.screenRefresh = null;
      this.screenKey = null;
      this.navs.stack = [];
      this.screen = name;
      const isTitle = name === 'title';
      this.showHero(isTitle);
      this.logo.setVisible(isTitle);
      this.tweens.killTweensOf(this.dimmer);
      this.tweens.add({ targets: this.dimmer, alpha: isTitle ? 0 : 0.45, duration: 250 });
      const { c, nav } = this[`build_${name}`](arg);
      c.setDepth(10);
      this.screenC = c;
      this.navs.push(nav);
      this.refreshTopBar();
      if (instant) {
        this.transitioning = false;
        return;
      }
      c.setAlpha(0);
      if (isTitle) this.logo.setAlpha(0);
      this.tweens.add({
        targets: isTitle ? [c, this.logo] : c,
        alpha: 1,
        duration: 200,
        onComplete: () => (this.transitioning = false),
      });
    };
    if (instant || !prev) {
      this.transitioning = !instant;
      build();
      return;
    }
    this.transitioning = true;
    this.tweens.add({
      targets: this.screen === 'title' ? [prev, this.logo] : prev,
      alpha: 0,
      duration: 140,
      onComplete: build,
    });
  }

  back(to = 'title', arg = null) {
    Audio.sfx('uiBack');
    this.go(to, arg);
  }

  backButton(c, to = 'title', arg = null) {
    const b = new Button(this, 74, 30, 116, 38, { label: '‹  BACK', size: 16, sfx: 'uiBack', onClick: () => this.go(to, arg) });
    c.add(b);
    return b;
  }

  hint(c, text) {
    c.add(this.add.text(GAME_W / 2, GAME_H - 14, text, textStyle(13, C.faint, false)).setOrigin(0.5).setShadow(0, 2, '#000', 4));
  }

  startLevel(id) {
    if (this.leaving || !id) return;
    if (!Save.isUnlocked(id)) {
      Audio.sfx('uiDeny');
      return;
    }
    this.leaving = true;
    this.cameras.main.fadeOut(280, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { levelId: id }));
  }

  // =================================================================== title
  build_title() {
    const c = this.add.container(0, 0);
    const buttons = [];
    const mk = (y, label, onClick, o = {}) => {
      const b = new Button(this, GAME_W / 2, y, o.w ?? 270, o.h ?? 38, { label, size: o.size ?? 18, onClick, accent: accentOf(this.theme), ...o });
      c.add(b);
      buttons.push(b);
      return b;
    };
    const contId = Save.continueId();
    const anyDone = Save.completedCount() > 0;
    mk(240, anyDone ? `CONTINUE  ·  ${contId}` : 'PLAY', () => this.startLevel(contId), { style: 'primary', w: 300, h: 48, size: 22, accent: C.gold });
    mk(292, 'WORLDS', () => this.go('worlds'), { icon: '❖', iconSize: 16 });
    mk(338, 'CHARACTER', () => this.go('character'), { icon: '♛', iconSize: 16 });
    mk(384, 'SETTINGS', () => this.go('settings'), { icon: '⚙', iconSize: 16 });
    const got = ACHIEVEMENTS.filter((a) => Save.hasAchievement(a.id)).length;
    mk(430, `ACHIEVEMENTS  ${got}/${ACHIEVEMENTS.length}`, () => this.go('achievements'), { icon: '★', iconSize: 16 });
    mk(476, 'CREDITS', () => this.go('credits'), { icon: '✦', iconSize: 14 });

    const daily = this.buildDailyCard(c);
    if (anyDone) {
      const e = levelEntry(contId);
      const sub = e ? `${WORLDS[e.world].name}  ·  ${levelName(contId)}` : '';
      c.add(this.add.text(GAME_W / 2, 214, sub, textStyle(13, C.dim, false)).setOrigin(0.5).setShadow(0, 2, '#000', 4));
      this.tagline.setVisible(false);
    } else this.tagline.setVisible(true);
    this.hint(c, 'Arrows / WASD to choose  ·  Enter / Space to select  ·  Esc to go back  ·  M music');

    // Hero preview + profile on the left
    const prof = this.add.container(118, 300);
    const pg = panel(this, 0, 0, 190, 130, { accent: C.border, alpha: 0.82, crest: false });
    const cleared = Save.completedCount();
    prof.add([
      pg,
      this.add.text(0, -46, 'JOURNEY', textStyle(13, C.gold)).setOrigin(0.5),
      this.add.text(-78, -20, 'Levels', textStyle(13, C.dim, false)).setOrigin(0, 0.5),
      this.add.text(78, -20, `${cleared}/${LEVELS.length}`, textStyle(14, C.text)).setOrigin(1, 0.5),
      this.add.text(-78, 2, 'Secrets', textStyle(13, C.dim, false)).setOrigin(0, 0.5),
      this.add.text(78, 2, `${Save.completedCount({ secret: true })}/${SECRET_LEVELS.length}`, textStyle(14, C.text)).setOrigin(1, 0.5),
      this.add.text(-78, 24, 'Crystals found', textStyle(13, C.dim, false)).setOrigin(0, 0.5),
      this.add.text(78, 24, `${Save.totalShards()}`, textStyle(14, C.cyan)).setOrigin(1, 0.5),
      this.add.text(-78, 46, 'Play time', textStyle(13, C.dim, false)).setOrigin(0, 0.5),
      this.add.text(78, 46, formatDuration(Save.stats.playtime), textStyle(14, C.text)).setOrigin(1, 0.5),
    ]);
    c.add(prof);

    const nav = new Nav(this);
    nav.setItems([...buttons, daily], buttons[0]);

    // Slowly cycle the backdrop through reached worlds.
    let wi = Math.max(0, WORLDS.findIndex((w) => w.theme === this.theme));
    const cycle = this.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        const reached = WORLDS.filter((w, i) => Save.isWorldUnlocked(i)).length || 1;
        wi = (wi + 1) % reached;
        this.setTheme(themeOfWorld(wi));
      },
    });
    this.screenCleanup = () => cycle.remove();
    return { c, nav };
  }

  buildDailyCard(c) {
    const d = getDaily();
    const wi = levelEntry(d.levelId) ? levelEntry(d.levelId).world : 0;
    const accent = accentOfWorld(wi);
    const b = new Button(this, GAME_W - 130, 316, 220, 212, {
      label: '',
      accent: C.gold,
      fill: 0x1a1230,
      onClick: () => this.startLevel(d.levelId),
    });
    const g = this.add.graphics();
    g.fillStyle(C.gold, 0.12);
    g.fillRoundedRect(-110, -106, 220, 34, { tl: 10, tr: 10, bl: 0, br: 0 });
    b.add(g);
    b.add(this.add.text(0, -89, '☀  DAILY CHALLENGE', textStyle(14, C.gold)).setOrigin(0.5));
    b.add(this.add.text(0, -56, `${d.levelId}  ·  ${levelName(d.levelId)}`, textStyle(14, C.text, true, { align: 'center', wordWrap: { width: 196 } })).setOrigin(0.5));
    b.add(this.add.text(0, -26, d.goalInfo ? d.goalInfo.name.toUpperCase() : '', textStyle(15, accent)).setOrigin(0.5));
    b.add(this.add.text(0, 2, d.goalInfo ? d.goalInfo.text : '', textStyle(13, C.dim, false, { align: 'center', wordWrap: { width: 196 } })).setOrigin(0.5));
    const reward = gemLabel(this, -24, 40, `+${d.reward}`, { size: 18 });
    b.add(reward);
    b.add(this.add.text(0, 66, d.streak > 0 ? `Streak  ${'✦'.repeat(Math.min(d.streak, 7))}  ${d.streak} day${d.streak > 1 ? 's' : ''}` : 'Start a streak today', textStyle(12, C.violet, false)).setOrigin(0.5));
    const status = d.done ? '✔  COMPLETED' : '▶  PLAY';
    b.add(this.add.text(0, 89, status, textStyle(14, d.done ? C.green : C.cyan)).setOrigin(0.5));
    if (d.done) reward.setAlpha(0.45);
    c.add(b);
    return b;
  }

  // ================================================================== worlds
  worldStats(wi) {
    const ids = WORLDS[wi].levelIds;
    let done = 0;
    let stars = 0;
    let gems = 0;
    let gemTotal = 0;
    for (const id of ids) {
      if (Save.isCompleted(id)) done++;
      stars += Save.starCount(id);
      const n = shardTotalOf(id);
      gemTotal += n;
      gems += Math.min(n, Save.shards(id).filter(Boolean).length);
    }
    const sid = WORLDS[wi].secretId;
    const secret = Save.isCompleted(sid) ? 'cleared' : Save.isUnlocked(sid) ? 'open' : 'locked';
    return { done, total: ids.length, stars, starTotal: ids.length * 3, gems, gemTotal, passages: Save.worldSecrets(wi), secret, sid };
  }

  build_worlds(arg) {
    const c = this.add.container(0, 0);
    c.add(heading(this, GAME_W / 2, 74, 'CHOOSE YOUR WORLD', { size: 30 }));
    const back = this.backButton(c);
    const cards = WORLDS.map((w, wi) => this.worldCard(c, wi, GAME_W / 2 + (wi - 2) * 184, 300));
    let focusWi = arg && arg.world != null ? arg.world : WORLDS.findIndex((w) => w.theme === this.theme);
    if (focusWi < 0) focusWi = 0;
    const nav = new Nav(this, { onBack: () => this.back('title'), onFocus: (it) => it.world != null && this.setTheme(themeOfWorld(it.world)) });
    nav.setItems([back, ...cards], cards[focusWi]);
    this.hint(c, 'Choose a world  ·  Clear a world\'s boss to open the next  ·  Find every hidden passage to reveal its secret level');
    return { c, nav };
  }

  worldCard(c, wi, x, y) {
    const w = WORLDS[wi];
    const accent = accentOfWorld(wi);
    const unlocked = Save.isWorldUnlocked(wi);
    const st = this.worldStats(wi);
    const W = 174;
    const H = 340;
    const b = new Button(this, x, y, W, H, { label: '', accent, fill: 0x140e26, radius: 12, enabled: unlocked, keepAlpha: true, onClick: () => this.go('levels', { world: wi }) });
    b.world = wi;
    b.add(this.add.text(0, -152, `WORLD ${ROMAN[wi]}`, textStyle(12, accent)).setOrigin(0.5));
    b.add(this.add.text(0, -132, w.name.toUpperCase(), textStyle(15, C.text, true, { align: 'center', wordWrap: { width: 160 } })).setOrigin(0.5).setShadow(0, 2, '#000', 4));
    const thumb = this.add.image(0, -70, `thumb_${w.theme}`);
    thumb.setCrop((thumb.width - 158) / 2, 0, 158, thumb.height);
    const frame = this.add.graphics();
    frame.lineStyle(1.5, accent, 0.7);
    frame.strokeRect(-79, -70 - thumb.height / 2, 158, thumb.height);
    b.add([thumb, frame]);

    const row = (yy, label, value, color = C.text) => {
      b.add(this.add.text(-74, yy, label, textStyle(12, C.dim, false)).setOrigin(0, 0.5));
      b.add(this.add.text(74, yy, value, textStyle(13, color)).setOrigin(1, 0.5));
    };
    if (unlocked) {
      row(-6, 'Levels', `${st.done}/${st.total}`, st.done === st.total ? C.green : C.text);
      b.add(this.add.image(-66, 18, 'ui-star').setScale(0.3));
      row(18, '     Stars', `${st.stars}/${st.starTotal}`, C.gold);
      b.add(this.add.image(-67, 40, 'ui-gem').setScale(0.5));
      row(40, '     Crystals', `${st.gems}/${st.gemTotal}`, C.cyan);
      row(62, '◉  Passages', `${st.passages.found}/${st.passages.total}`, C.violet);
      const sText = { locked: 'Sealed', open: 'Open!', cleared: 'Cleared' }[st.secret];
      row(84, '✦  Secret level', sText, st.secret === 'locked' ? C.faint : st.secret === 'open' ? C.gold : C.green);
      b.add(this.add.text(0, 114, `☠  ${bossShort(wi)}`, textStyle(12, st.done === st.total ? C.green : 0xff8fa3)).setOrigin(0.5));
      // completion bar
      const pct = (st.done + st.stars + st.gems + (st.secret === 'cleared' ? 2 : 0)) / (st.total + st.starTotal + st.gemTotal + 2);
      const g = this.add.graphics();
      g.fillStyle(C.ink, 1);
      g.fillRoundedRect(-70, 140, 140, 8, 4);
      g.fillStyle(accent, 1);
      if (pct > 0) g.fillRoundedRect(-70, 140, Math.max(8, 140 * pct), 8, 4);
      b.add(g);
      b.add(this.add.text(0, 157, `${Math.round(pct * 100)}% complete`, textStyle(11, C.dim, false)).setOrigin(0.5));
    } else {
      thumb.setTint(0x3a3450);
      b.add(this.add.image(0, 20, 'ui-lock').setScale(1.4));
      b.add(this.add.text(0, 72, `Defeat\n${bossShort(wi - 1)}\nto enter`, textStyle(13, C.dim, false, { align: 'center' })).setOrigin(0.5));
      b.add(this.add.text(0, 140, `☠  ???`, textStyle(12, C.faint)).setOrigin(0.5));
    }
    c.add(b);
    return b;
  }

  // ================================================================== levels
  build_levels(arg) {
    const wi = Phaser.Math.Clamp(arg && arg.world != null ? arg.world : 0, 0, WORLDS.length - 1);
    const w = WORLDS[wi];
    const accent = accentOfWorld(wi);
    this.setTheme(w.theme);
    const c = this.add.container(0, 0);
    c.add(this.add.text(GAME_W / 2, 50, `WORLD ${ROMAN[wi]}`, textStyle(14, accent)).setOrigin(0.5).setShadow(0, 2, '#000', 4));
    c.add(heading(this, GAME_W / 2, 80, w.name.toUpperCase(), { size: 30, color: C.text, glow: accent }));
    const back = this.backButton(c, 'worlds', { world: wi });

    const ids = [...w.levelIds, w.secretId];
    const tiles = ids.map((id, i) => this.levelTile(c, id, wi, GAME_W / 2 + (i - 2) * 172, 252, i === 4));
    const arrows = [];
    const arrow = (dir) => {
      const target = wi + dir;
      const ok = target >= 0 && target < WORLDS.length && Save.isWorldUnlocked(target);
      const exists = target >= 0 && target < WORLDS.length;
      const a = new Button(this, dir < 0 ? 26 : GAME_W - 26, 252, 40, 92, {
        label: dir < 0 ? '‹' : '›',
        size: 34,
        style: 'ghost',
        accent: exists ? accentOfWorld(target) : C.border,
        enabled: ok,
        onClick: () => this.go('levels', { world: target }),
      });
      a.setVisible(exists);
      c.add(a);
      if (exists) arrows.push(a);
      return a;
    };
    arrow(-1);
    arrow(1);

    // Detail panel for the focused level.
    const dp = this.add.container(GAME_W / 2, 446);
    dp.add(panel(this, 0, 0, 780, 96, { accent, alpha: 0.9 }));
    const dTitle = this.add.text(-370, -26, '', textStyle(18, C.text)).setOrigin(0, 0.5).setShadow(0, 2, '#000', 4);
    const dSub = this.add.text(370, -26, '', textStyle(13, C.dim, false)).setOrigin(1, 0.5);
    dp.add([dTitle, dSub]);
    const conds = [0, 1, 2].map((i) => {
      const x = -370 + i * 250;
      const s = this.add.image(x + 12, 16, 'ui-star-o').setScale(0.45);
      const t = this.add.text(x + 30, 16, '', textStyle(13, C.text, false, { wordWrap: { width: 210 } })).setOrigin(0, 0.5);
      dp.add([s, t]);
      return { s, t };
    });
    c.add(dp);
    const showDetail = (it) => {
      const id = it.levelId;
      if (!id) return;
      const open = Save.isUnlocked(id);
      const secret = id === w.secretId;
      if (!open) {
        dTitle.setText(secret ? 'SECRET LEVEL  ·  ???' : `${id}  ·  LOCKED`);
        dSub.setText('');
        const ps = Save.worldSecrets(wi);
        conds.forEach((k, i) => {
          k.s.setVisible(i === 0);
          k.t.setText(i === 0 ? (secret ? `Find every hidden passage in ${w.name} (${ps.found}/${ps.total}) to reveal this level.` : `Escape ${ids[ids.indexOf(id) - 1]} to unlock this level.`) : '');
          k.t.setWordWrapWidth(i === 0 ? 700 : 210);
        });
        conds[0].s.setTexture('ui-lock').setScale(0.55);
        return;
      }
      const rec = Save.get(id);
      const stars = Save.stars(id);
      dTitle.setText(`${id}  ·  ${levelName(id)}${secret ? '  ·  SECRET' : ''}`);
      dSub.setText(rec && rec.clears ? `Escaped ${rec.clears}×  ·  Best ${formatTime(rec.bestTime)}  ·  Fewest deaths ${rec.bestDeaths ?? '-'}` : 'Not yet escaped');
      const labels = [STAR_LABELS[0], STAR_LABELS[1], `${STAR_LABELS[2]} (${formatTime(parTime(id)).replace(/\.00$/, '')})`];
      conds.forEach((k, i) => {
        k.s.setVisible(true).setTexture(stars[i] ? 'ui-star' : 'ui-star-o').setScale(0.45);
        k.t.setWordWrapWidth(210).setText(labels[i]).setColor(hex(stars[i] ? C.gold : C.text));
      });
    };

    const nav = new Nav(this, {
      onBack: () => this.back('worlds', { world: wi }),
      onFocus: (it) => showDetail(it),
    });
    const focusId = arg && arg.focus;
    let focus = tiles.find((t) => t.levelId === focusId);
    if (!focus) focus = tiles.find((t) => t.levelId === Save.continueId()) || tiles.find((t) => t.enabled) || tiles[0];
    nav.setItems([back, ...tiles, ...arrows], focus);
    showDetail(focus);
    this.screenKey = (e) => {
      if (e.code === 'KeyQ' || e.code === 'PageUp') arrows.find((a) => a.x < GAME_W / 2)?.activate();
      if (e.code === 'KeyE' || e.code === 'PageDown') arrows.find((a) => a.x > GAME_W / 2)?.activate();
    };
    this.hint(c, 'Q / E change world  ·  Enter to play  ·  Esc to go back');
    return { c, nav };
  }

  levelTile(c, id, wi, x, y, secret) {
    const accent = secret ? C.gold : accentOfWorld(wi);
    const open = Save.isUnlocked(id);
    const def = getLevelDef(id);
    const W = 160;
    const H = 212;
    const b = new Button(this, x, y, W, H, {
      label: '',
      accent,
      fill: secret ? 0x1e1426 : 0x140e26,
      radius: 12,
      enabled: open,
      keepAlpha: true,
      onClick: () => this.startLevel(id),
    });
    b.levelId = id;
    const done = Save.isCompleted(id);
    if (secret) {
      const g = this.add.graphics();
      g.lineStyle(1, C.gold, 0.4);
      g.strokeRoundedRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 8);
      b.add(g);
    }
    if (!open) {
      b.add(this.add.text(0, -76, secret ? '✦  SECRET' : id, textStyle(secret ? 16 : 26, secret ? C.gold : C.faint)).setOrigin(0.5));
      b.add(this.add.image(0, -8, 'ui-lock').setScale(1.3));
      const txt = secret ? 'Find every\nhidden passage' : `Escape\n${WORLDS[wi].levelIds[WORLDS[wi].levelIds.indexOf(id) - 1] || ''}`;
      b.add(this.add.text(0, 52, txt, textStyle(12, C.dim, false, { align: 'center' })).setOrigin(0.5));
      if (secret) {
        const ps = Save.worldSecrets(wi);
        b.add(this.add.text(0, 86, `◉ ${ps.found}/${ps.total}`, textStyle(14, C.violet)).setOrigin(0.5));
      }
      c.add(b);
      return b;
    }
    const top = secret ? `✦  ${id}` : def.isBoss ? `☠  ${id}` : id;
    b.add(this.add.text(0, -80, top, textStyle(24, secret ? C.gold : def.isBoss ? 0xff8fa3 : C.text)).setOrigin(0.5).setShadow(0, 0, hex(accent), 10, true, true));
    b.add(this.add.text(0, -46, def.name, textStyle(13, C.dim, true, { align: 'center', wordWrap: { width: W - 16 } })).setOrigin(0.5));
    b.add(starRow(this, 0, -6, Save.stars(id), 26, 4));
    const got = Save.shards(id);
    const n = def.shards.length;
    for (let i = 0; i < n; i++) b.add(this.add.image((i - (n - 1) / 2) * 22, 30, got[i] ? 'ui-gem' : 'ui-gem-o').setScale(0.6));
    const rec = Save.get(id);
    b.add(this.add.text(0, 56, `Best  ${rec && rec.bestTime != null ? formatTime(rec.bestTime) : '--:--'}`, textStyle(12, C.text, false)).setOrigin(0.5));
    b.add(this.add.text(0, 74, `Par  ${formatTime(parTime(id))}`, textStyle(11, C.faint, false)).setOrigin(0.5));
    if (!secret) {
      const found = Save.secretsFound(id).length > 0;
      b.add(this.add.text(0, 92, found ? '◉ passage found' : '◌ hidden passage', textStyle(11, found ? C.violet : C.faint, false)).setOrigin(0.5));
    }
    if (done) {
      const tick = this.add.text(W / 2 - 14, -H / 2 + 14, '✔', textStyle(14, C.green)).setOrigin(0.5);
      b.add(tick);
    }
    c.add(b);
    return b;
  }

  // =============================================================== character
  heroIdleKey(skin, colorId) {
    const key = `hero-idle-${skin}-${colorId}`;
    if (!this.textures.exists(key)) makePlayerTextures(this, { skin, palette: findItem('color', colorId).palette }, key, IDLE_FRAMES);
    return key;
  }

  build_character(arg) {
    const c = this.add.container(0, 0);
    c.add(heading(this, GAME_W / 2, 64, 'WARDROBE', { size: 30 }));
    const back = this.backButton(c);
    const tab = (arg && arg.tab) || 'skin';
    const kinds = [
      ['skin', 'SKINS'],
      ['color', 'COLOURS'],
      ['effect', 'TRAILS'],
    ];

    // Preview pedestal
    const px = 200;
    const pc = this.add.container(0, 0);
    pc.add(panel(this, px, 290, 300, 370, { accent: C.border, alpha: 0.9 }));
    const ped = this.add.graphics();
    ped.fillStyle(0x000000, 0.5);
    ped.fillEllipse(px, 330, 150, 26);
    ped.lineStyle(2, C.border, 0.6);
    ped.strokeEllipse(px, 330, 150, 26);
    ped.lineStyle(1, C.cyan, 0.3);
    ped.strokeEllipse(px, 330, 120, 18);
    const pglow = this.add.image(px, 270, 'glow').setScale(2.4).setAlpha(0.4).setBlendMode(ADD);
    const hero = this.add.sprite(px, 332, '__DEFAULT').setOrigin(0.5, 1).setScale(3.6);
    const wisp = this.add.zone(px, 260, 2, 2);
    const nameT = this.add.text(px, 368, '', textStyle(19, C.text)).setOrigin(0.5).setShadow(0, 2, '#000', 4);
    const descT = this.add.text(px, 398, '', textStyle(12, C.dim, false, { align: 'center', wordWrap: { width: 260 } })).setOrigin(0.5, 0);
    const stateT = this.add.text(px, 448, '', textStyle(14, C.cyan)).setOrigin(0.5);
    pc.add([ped, pglow, hero, wisp, nameT, descT, stateT]);
    c.add(pc);

    let trail = null;
    let look = { skin: Save.equipped('skin'), color: Save.equipped('color'), effect: Save.equipped('effect') };
    const setPreview = (next) => {
      const prevEffect = look.effect;
      look = { ...look, ...next };
      hero.setTexture(this.heroIdleKey(look.skin, look.color), 'idle0');
      pglow.setTint(findItem('color', look.color).palette.rim ?? C.border);
      if (!trail || prevEffect !== look.effect) {
        if (trail) trail.destroy();
        trail = createTrail(this, wisp, look.effect, 11);
        if (trail) trail.followOffset.set(0, 0);
      }
    };
    setPreview({});
    let frame = 0;
    const anim = this.time.addEvent({ delay: 130, loop: true, callback: () => hero.setFrame(IDLE_FRAMES[IDLE_SEQ[(frame = (frame + 1) % IDLE_SEQ.length)]]) });
    this.screenUpdate = () => {
      const t = this.t * 1.6;
      wisp.setPosition(px + Math.sin(t) * 90, 250 + Math.sin(t * 2) * 34);
    };
    this.screenCleanup = () => {
      anim.remove();
      if (trail) trail.destroy();
    };

    const tabs = kinds.map(([k, label], i) => {
      const b = new Button(this, 506 + i * 160, 126, 148, 38, {
        label,
        size: 16,
        accent: k === tab ? C.gold : C.cyan,
        style: k === tab ? 'primary' : 'normal',
        onClick: () => k !== tab && this.go('character', { tab: k }),
      });
      b.tab = k;
      c.add(b);
      return b;
    });

    const items = CATALOG[tab];
    const cards = items.map((item, i) => {
      const col = i % 3;
      const r = Math.floor(i / 3);
      return this.itemCard(c, tab, item, 506 + col * 160, 214 + r * 116, (it) => setPreview({ [tab]: it.id }));
    });

    const describe = (card) => {
      if (!card || !card.item) {
        const sk = findItem('skin', look.skin);
        nameT.setText(sk.name);
        descT.setText(sk.desc || '');
        stateT.setText('');
        return;
      }
      const { item, kind } = card;
      nameT.setText(item.name);
      descT.setText(item.req ? item.desc : item.desc || (kind === 'color' ? 'A new shade for your shadow.' : kind === 'effect' ? 'A trail that follows every step.' : ''));
      const owned = isOwned(kind, item);
      const eq = Save.equipped(kind) === item.id;
      if (eq) stateT.setText('✔ EQUIPPED').setColor(hex(C.green));
      else if (owned) stateT.setText('Owned  ·  Select to equip').setColor(hex(C.cyan));
      else if (item.req) stateT.setText('🔒 Locked').setColor(hex(C.faint));
      else stateT.setText(`Buy for ${item.price} crystals`).setColor(hex(Save.crystals >= item.price ? C.gold : C.red));
    };

    const nav = new Nav(this, {
      onBack: () => this.back('title'),
      onFocus: (it) => {
        if (it.item) setPreview({ [it.kind]: it.item.id });
        else setPreview({ [tab]: Save.equipped(tab) });
        describe(it.item ? it : null);
      },
    });
    const eqCard = cards.find((cd) => Save.equipped(tab) === cd.item.id);
    const focusTab = arg && arg.fromTab ? tabs.find((t) => t.tab === tab) : null;
    nav.setItems([back, ...tabs, ...cards], focusTab || eqCard || cards[0]);
    describe(nav.current && nav.current.item ? nav.current : null);
    this.screenKey = (e) => {
      const i = kinds.findIndex(([k]) => k === tab);
      if (e.code === 'KeyQ' || e.code === 'PageUp') this.go('character', { tab: kinds[(i + 2) % 3][0], fromTab: true });
      if (e.code === 'KeyE' || e.code === 'PageDown') this.go('character', { tab: kinds[(i + 1) % 3][0], fromTab: true });
    };
    this.charRefresh = () => {
      cards.forEach((cd) => cd.refreshState());
      describe(nav.current && nav.current.item ? nav.current : null);
      this.refreshTopBar();
    };
    this.hint(c, 'Q / E switch tab  ·  Enter to buy or equip  ·  Earn crystals by escaping levels, stars, dailies and achievements');
    return { c, nav };
  }

  itemCard(c, kind, item, x, y, onPreview) {
    const W = 148;
    const H = 106;
    const b = new Button(this, x, y, W, H, { label: '', accent: C.cyan, fill: 0x140e26, radius: 10, onClick: () => this.useItem(kind, item, b) });
    b.item = item;
    b.kind = kind;
    if (kind === 'effect') {
      const g = this.add.graphics();
      const cols = item.swatch;
      cols.forEach((col, i) => {
        g.fillStyle(col, 0.25);
        g.fillCircle((i - (cols.length - 1) / 2) * 18, -18, 20);
      });
      cols.forEach((col, i) => {
        g.fillStyle(col, 1);
        g.fillCircle((i - (cols.length - 1) / 2) * 18, -18, 9);
      });
      b.add(g);
      if (item.cfg) {
        const sparks = this.add.particles(0, -18, item.cfg.texture === 'dot' ? 'dot' : 'fx-sparkle', {
          x: { min: -30, max: 30 },
          y: { min: -10, max: 10 },
          tint: item.cfg.tint,
          lifespan: 700,
          speedY: { min: -20, max: -5 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 1, end: 0 },
          blendMode: ADD,
          frequency: 220,
        });
        b.add(sparks);
      }
    } else {
      const skin = kind === 'skin' ? item.id : Save.equipped('skin');
      const color = kind === 'color' ? item.id : Save.equipped('color');
      const img = this.add.image(0, -14, previewTexture(this, skin, color, 'idle0')).setScale(1.25);
      b.add(img);
    }
    b.add(this.add.text(0, 22, item.name, textStyle(13, C.text)).setOrigin(0.5));
    const state = this.add.text(0, 40, '', textStyle(12, C.cyan)).setOrigin(0.5);
    b.add(state);
    const lock = this.add.image(W / 2 - 16, -H / 2 + 18, 'ui-lock').setScale(0.55);
    b.add(lock);
    b.refreshState = () => {
      const owned = isOwned(kind, item);
      const eq = Save.equipped(kind) === item.id;
      lock.setVisible(!owned && !!item.req);
      if (eq) state.setText('✔ EQUIPPED').setColor(hex(C.green));
      else if (owned) state.setText('OWNED').setColor(hex(C.dim));
      else if (item.req) state.setText('LOCKED').setColor(hex(C.faint));
      else state.setText(`◆ ${item.price}`).setColor(hex(Save.crystals >= item.price ? C.gold : 0xff8fa3));
      b.setAccent(eq ? C.green : C.cyan);
    };
    b.refreshState();
    c.add(b);
    return b;
  }

  useItem(kind, item, card) {
    if (isOwned(kind, item)) {
      if (Save.equipped(kind) === item.id) return;
      this.equip(kind, item);
      return;
    }
    if (item.req) {
      Audio.sfx('uiDeny');
      card.shake();
      this.toasts.message(unlockText(item), C.violet, 1800);
      return;
    }
    if (Save.crystals < item.price) {
      Audio.sfx('uiDeny');
      card.shake();
      this.toasts.message(`Need ${item.price - Save.crystals} more crystals`, C.red);
      return;
    }
    confirmDialog(this, this.navs, {
      title: 'PURCHASE',
      text: `Buy ${item.name} for ${item.price} crystals?\nYou have ${Save.crystals}.`,
      yes: `BUY  ◆ ${item.price}`,
      accent: C.gold,
      onYes: () => {
        const r = buy(kind, item);
        if (r === 'ok') {
          Audio.sfx('purchase');
          this.equip(kind, item, false);
          this.bumpWallet();
          this.toasts.message(`${item.name} unlocked!`, C.gold);
          this.announce(checkAchievements());
        } else {
          Audio.sfx('uiDeny');
        }
      },
    });
  }

  equip(kind, item, sfx = true) {
    Save.equip(kind, item.id);
    applyLook(this);
    if (kind === 'effect') this.makeHeroTrail();
    if (sfx) Audio.sfx('coin');
    if (this.charRefresh) this.charRefresh();
  }

  // ================================================================ settings
  build_settings() {
    const c = this.add.container(0, 0);
    c.add(heading(this, GAME_W / 2, 56, 'SETTINGS', { size: 30 }));
    const back = this.backButton(c);
    c.add(panel(this, GAME_W / 2, 296, 600, 424, { accent: C.border, alpha: 0.9 }));
    const on = (v) => (v ? 'ON' : 'OFF');
    const pct = (v) => `${Math.round((v ?? 1) * 100)}%`;
    const cycle = (key, opts) => (dir) => {
      const cur = opts.indexOf(Save.settings[key]);
      const next = opts[(cur + (dir || 1) + opts.length) % opts.length];
      Save.setSetting(key, next);
      if (key === 'quality') applyQualitySetting(next);
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
      { label: 'Visual quality', value: () => `${Save.settings.quality.toUpperCase()}`, click: cycle('quality', ['auto', 'low', 'high']), dir: (d) => cycle('quality', ['auto', 'low', 'high'])(d) },
    ];
    if (this.scale.fullscreen.available) rows.push({ label: 'Fullscreen', value: () => on(this.scale.isFullscreen), click: () => this.toggleFullscreen() });

    const buttons = rows.map((r, i) => {
      const b = new Button(this, GAME_W / 2, 122 + i * 44, 540, 38, {
        label: r.label,
        align: 'left',
        size: 16,
        value: r.value(),
        bar: r.bar,
        barW: 170,
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
    const reset = new Button(this, GAME_W / 2, 122 + rows.length * 44 + 14, 260, 38, {
      label: 'RESET PROGRESS',
      size: 15,
      accent: C.red,
      color: 0xff8fa3,
      onClick: () =>
        confirmDialog(this, this.navs, {
          title: 'RESET PROGRESS?',
          text: 'All levels, stars, crystals, cosmetics and achievements will be erased. Settings are kept.',
          yes: 'ERASE',
          danger: true,
          onYes: () => {
            Save.reset();
            applyLook(this, true);
            this.makeHeroTrail();
            this.refreshTopBar();
            this.toasts.message('Progress erased', C.red);
          },
        }),
    });
    c.add(reset);
    const note = this.add.text(GAME_W / 2, 488, 'Quality changes apply when the next level loads.  ←/→ adjust values.', textStyle(12, C.faint, false)).setOrigin(0.5);
    c.add(note);
    const refresh = () => {
      buttons.forEach((b) => b.refresh());
      this.refreshTopBar();
    };
    this.screenRefresh = refresh;
    const nav = new Nav(this, { onBack: () => this.back('title'), wrap: true });
    nav.setItems([back, ...buttons, reset], buttons[0]);
    return { c, nav };
  }

  // ============================================================ achievements
  build_achievements() {
    const c = this.add.container(0, 0);
    const got = ACHIEVEMENTS.filter((a) => Save.hasAchievement(a.id)).length;
    c.add(heading(this, GAME_W / 2, 56, `ACHIEVEMENTS  ${got}/${ACHIEVEMENTS.length}`, { size: 28 }));
    const back = this.backButton(c);
    const s = Save.stats;
    const stats = [
      ['Play time', formatDuration(s.playtime)],
      ['Escapes', s.clears],
      ['Deaths', s.deaths],
      ['Enemies', s.enemies],
      ['Jumps', s.jumps + s.doubleJumps + s.wallJumps],
      ['Dashes', s.dashes],
      ['Secrets', s.secrets],
      ['Earned', Save.data.crystalsEarned],
    ];
    const sw = 840 / stats.length;
    c.add(panel(this, GAME_W / 2, 106, 860, 50, { accent: C.border, alpha: 0.85, crest: false }));
    stats.forEach(([k, v], i) => {
      const x = GAME_W / 2 - 420 + sw * (i + 0.5);
      c.add(this.add.text(x, 96, `${v}`, textStyle(16, i === 7 ? C.cyan : C.text)).setOrigin(0.5));
      c.add(this.add.text(x, 116, k.toUpperCase(), textStyle(10, C.dim, false)).setOrigin(0.5));
    });

    const view = new ScrollView(this, c, 54, 144, 842, 360);
    const RW = 412;
    const RH = 74;
    const rows = ACHIEVEMENTS.map((a, i) => {
      const col = i % 2;
      const r = Math.floor(i / 2);
      const x = RW / 2 + col * (RW + 18);
      const y = RH / 2 + 4 + r * (RH + 10);
      const has = Save.hasAchievement(a.id);
      const accent = has ? C.gold : C.border;
      const b = new Button(this, x, y, RW, RH, { label: '', accent: has ? C.gold : C.cyan, fill: has ? 0x221838 : 0x120d20, radius: 10, sfx: null, keepAlpha: true });
      b.add(badge(this, -RW / 2 + 38, 0, a.icon, has ? C.gold : C.faint, 24, !has));
      b.add(this.add.text(-RW / 2 + 74, -18, a.name, textStyle(15, has ? C.gold : C.text)).setOrigin(0, 0.5));
      b.add(this.add.text(-RW / 2 + 74, 4, a.desc, textStyle(11, C.dim, false, { wordWrap: { width: RW - 150 } })).setOrigin(0, 0.5));
      b.add(gemLabel(this, RW / 2 - 14, -18, a.reward, { size: 13, align: 'right', color: has ? C.dim : C.cyan }));
      if (has) {
        const ts = Save.data.achievements[a.id];
        const date = ts ? new Date(ts).toLocaleDateString() : '';
        b.add(this.add.text(RW / 2 - 14, 22, `✔ ${date}`, textStyle(11, C.green)).setOrigin(1, 0.5));
      } else if (a.progress) {
        let cur = 0;
        let max = 1;
        try {
          [cur, max] = a.progress();
        } catch (e) {
          /* ignore */
        }
        const k = Phaser.Math.Clamp(cur / max, 0, 1);
        const g = this.add.graphics();
        g.fillStyle(C.ink, 1);
        g.fillRoundedRect(-RW / 2 + 74, 22, 220, 7, 3);
        g.fillStyle(C.border, 1);
        if (k > 0) g.fillRoundedRect(-RW / 2 + 74, 22, Math.max(6, 220 * k), 7, 3);
        b.add(g);
        b.add(this.add.text(RW / 2 - 14, 25, `${Math.min(cur, max)}/${max}`, textStyle(11, C.dim)).setOrigin(1, 0.5));
      }
      b.setAccent(accent === C.gold ? C.gold : C.cyan);
      view.content.add(b);
      b.scrollView = view;
      return b;
    });
    view.setContentHeight(Math.ceil(ACHIEVEMENTS.length / 2) * (RH + 10) + 8);
    view.clipButtons(rows);
    const nav = new Nav(this, {
      onBack: () => this.back('title'),
      onFocus: (it) => it.scrollView && it.scrollView.reveal(it.y - RH / 2, it.y + RH / 2),
    });
    nav.setItems([back, ...rows], rows[0]);
    this.hint(c, 'Each achievement pays crystals  ·  Some unlock exclusive wardrobe items');
    return { c, nav };
  }

  // ================================================================= credits
  build_credits() {
    const c = this.add.container(0, 0);
    c.add(heading(this, GAME_W / 2, 56, 'CREDITS', { size: 30 }));
    const back = this.backButton(c);
    c.add(panel(this, GAME_W / 2, 292, 640, 400, { accent: C.border, alpha: 0.88 }));
    const view = new ScrollView(this, c, GAME_W / 2 - 300, 104, 600, 376);
    const lines = [
      ['SHADOW ESCAPE', 30, C.gold],
      ['A dark fantasy platformer', 15, C.dim],
      ['', 20],
      ['GAME DESIGN & PROGRAMMING', 13, C.cyan],
      ['The Shadow Escape Team', 18, C.text],
      ['', 14],
      ['ART', 13, C.cyan],
      ['Every sprite, tile and backdrop is painted in code at runtime', 15, C.text],
      ['', 14],
      ['MUSIC & SOUND', 13, C.cyan],
      ['Real-time Web Audio synthesis — no recorded samples', 15, C.text],
      ['', 14],
      ['ENGINE', 13, C.cyan],
      ['Phaser 3  ·  Vite', 18, C.text],
      ['', 14],
      ['WORLDS', 13, C.cyan],
      ...WORLDS.map((w, i) => [`${ROMAN[i]}.  ${w.name}  —  ${w.boss}`, 14, accentOfWorld(i)]),
      ['', 14],
      ['SPECIAL THANKS', 13, C.cyan],
      ['Everyone who fell a hundred times and kept going', 15, C.text],
      ['', 30],
      ['✦', 26, C.violet],
      ['Thank you for playing', 20, C.gold],
      ['', 60],
    ];
    let y = 300;
    for (const [t, size, color] of lines) {
      if (t) view.content.add(this.add.text(300, y, t, textStyle(size, color ?? C.text, size >= 18 || color === C.cyan, { align: 'center', wordWrap: { width: 560 } })).setOrigin(0.5, 0));
      y += size + 12;
    }
    view.setContentHeight(y + 100);
    let idle = 0;
    this.screenUpdate = (delta) => {
      idle += delta;
      if (view.drag) idle = 0;
      if (idle > 600) {
        view.target = view.target >= view.maxScroll ? 0 : view.target + delta * 0.03;
        if (view.target === 0) view.scroll = 0;
      }
    };
    const nav = new Nav(this, { onBack: () => this.back('title') });
    back.opts.onDir = (dx, dy) => {
      if (!dy) return false;
      idle = -1500;
      view.scrollTo(view.target + dy * 60);
      return true;
    };
    nav.setItems([back], back);
    return { c, nav };
  }
}
