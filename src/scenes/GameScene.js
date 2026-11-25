import Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER, DEPTH, TILE } from '../config.js';
import { getLevelDef, nextLevelId, levelEntry, parTime, WORLDS } from '../levels/registry.js';
import { THEMES } from '../levels/themes.js';
import Level from '../levels/Level.js';
import Player from '../entities/Player.js';
import EnemyManager from '../entities/enemies/index.js';
import { createBoss } from '../entities/bosses/index.js';
import InputController from '../systems/InputController.js';
import Effects from '../systems/Effects.js';
import Combat from '../systems/Combat.js';
import CheckpointManager from '../systems/CheckpointManager.js';
import CameraController from '../systems/CameraController.js';
import Save from '../systems/SaveManager.js';
import Atmosphere from '../systems/Atmosphere.js';
import Audio from '../systems/Audio.js';
import { finishLevel as recordRun, checkAchievements } from '../systems/Progress.js';
import { applyLook, createTrail } from '../systems/Cosmetics.js';

const Rect = Phaser.Geom.Rectangle;
const ACTION_STATS = { jump: 'jumps', doubleJump: 'doubleJumps', wallJump: 'wallJumps', dash: 'dashes' };

/**
 * Runs one level. Events (consumed by the UI scene):
 *  level-start, death, checkpoint, shard, secret, enemy-defeated,
 *  boss-start, boss-hp, boss-phase, boss-defeated, boss-reset, level-complete
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    const param = new URLSearchParams(window.location.search).get('level');
    this.levelId = (data && data.levelId) || param || '1-1';
  }

  create() {
    let def;
    try {
      def = getLevelDef(this.levelId);
    } catch (e) {
      console.warn(e.message, '– falling back to 1-1');
      this.levelId = '1-1';
      def = getLevelDef('1-1');
    }
    this.stats = { deaths: 0, time: 0, finished: false };
    this.theme = THEMES[def.theme] || THEMES.forest;
    this.wrapCamera();

    applyLook(this);
    this.fx = new Effects(this);
    this.level = new Level(this, def, this.fx);
    this.atmo = new Atmosphere(this, this.level, def.theme);
    this.physics.world.setBounds(0, 0, this.level.widthPx, this.level.heightPx + 400, true, true, false, false);

    this.combat = new Combat(this, this.level, this.fx);
    this.enemies = new EnemyManager(this, { level: this.level, combat: this.combat, fx: this.fx }, def.enemies);

    const spawn = this.level.spawnPoint();
    this.player = new Player(this, this.level, this.fx, spawn.x, spawn.bottom);
    this.trail = createTrail(this, this.player.sprite, undefined, DEPTH.PLAYER_GLOW);
    this.checkpoints = new CheckpointManager(this, this.level, this.fx);
    this.prevBottom = this.player.body.bottom;

    // Shards: previously collected ones are shown as ghosts but can be collected again.
    const saved = Save.shards(this.levelId);
    this.shardsCollected = this.level.shards.map(() => false);
    this.level.shards.forEach((s, i) => {
      if (saved[i]) s.img.setAlpha(0.4);
    });

    this.physics.add.collider(this.player.hitbox, this.level.layer);
    this.physics.add.collider(this.player.hitbox, this.level.platformGroup, null, (hitbox, obj) => {
      if (obj.platform && obj.platform.solid === false) return false;
      const pb = hitbox.body;
      const mb = obj.body;
      // One-way: only land when coming from above.
      return pb.velocity.y >= mb.velocity.y - 1 && pb.bottom - mb.top <= 14;
    });

    this.boss = null;
    this.bossDone = false;
    if (def.boss) {
      const ctx = { level: this.level, combat: this.combat, fx: this.fx, enemies: this.enemies };
      this.boss = createBoss(this, ctx, def.boss);
      this.level.setExitSealed(true);
      const onDefeat = () => this.onBossDefeated();
      this.events.on('boss-defeated', onDefeat);
      this.events.once('shutdown', () => this.events.off('boss-defeated', onDefeat));
    }

    if (!this.scene.isActive('UI') && this.scene.get('UI')) this.scene.launch('UI');
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT,SHIFT');
    this.controls = new InputController(this, () => {
      const ui = this.scene.get('UI');
      return ui && ui.touch ? ui.touch : null;
    });

    this.camController = new CameraController(this, this.player.sprite, this.level.widthPx, this.level.heightPx);
    this.camController.snap(spawn.x, spawn.bottom);
    this.cameras.main.fadeIn(400, 7, 6, 13);
    this.setupAudio(def.theme);
    this.setupProgress();

    // UI may be created after us on first boot; emit on the next tick so it can subscribe.
    this.time.delayedCall(0, () => this.events.emit('level-start', this.levelInfo()));
  }

  levelInfo() {
    const d = this.level.def;
    const entry = levelEntry(this.levelId);
    return {
      id: this.levelId,
      name: d.name,
      worldName: d.worldName,
      worldIndex: d.worldIndex,
      number: entry ? entry.number : Number(this.levelId.split('-')[1]),
      isBoss: !!d.boss,
      isSecret: !!d.isSecret,
      par: entry ? parTime(this.levelId) : null,
      shardTotal: this.level.shards.length,
    };
  }

  /** Honour the screen shake / flash accessibility settings for every caller. */
  wrapCamera() {
    const cam = this.cameras.main;
    if (cam._settingsWrapped) return;
    cam._settingsWrapped = true;
    const shake = cam.shake.bind(cam);
    const flash = cam.flash.bind(cam);
    cam.shake = (...args) => (Save.settings.shake ? shake(...args) : cam);
    cam.flash = (...args) => (Save.settings.flashes ? flash(...args) : cam);
  }

  // ------------------------------------------------------------ progress
  /** Lifetime stats, periodic achievement checks and saving. */
  setupProgress() {
    const ui = () => this.scene.get('UI');
    const on = {
      'player-action': (name) => {
        if (ACTION_STATS[name]) Save.bumpStat(ACTION_STATS[name]);
      },
      death: () => Save.bumpStat('deaths'),
      'enemy-defeated': () => Save.bumpStat('enemies'),
      'boss-defeated': () => Save.bumpStat('bosses'),
    };
    Object.entries(on).forEach(([e, fn]) => this.events.on(e, fn));
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        if (this.stats.finished) return;
        const got = checkAchievements();
        const u = ui();
        if (u && u.toasts) got.forEach((a) => u.toasts.achievement(a));
        if (!got.length) Save.persist();
      },
    });
    this.events.once('shutdown', () => {
      Object.entries(on).forEach(([e, fn]) => this.events.off(e, fn));
      Save.persist();
    });
  }

  // ----------------------------------------------------------------- audio
  setupAudio(theme) {
    const themeKey = THEMES[theme] ? theme : 'forest';
    Audio.music(themeKey);
    const on = {
      'player-action': (name, v) => Audio.sfx(name, v),
      death: () => Audio.sfx('death'),
      checkpoint: () => Audio.sfx('checkpoint'),
      shard: () => Audio.sfx('shard'),
      secret: () => Audio.sfx('secret'),
      'enemy-defeated': () => Audio.sfx('enemyPop'),
      'boss-start': () => {
        Audio.sfx('bossRoar');
        Audio.music(`boss:${themeKey}`);
      },
      'boss-hp': () => Audio.sfx('bossHit'),
      'boss-phase': () => Audio.sfx('bossRoar'),
      'boss-defeated': () => {
        Audio.sfx('bossDefeat');
        Audio.music(themeKey);
        this.atmo.pulse(0xfff0d0, 0.35, 900);
      },
      'boss-reset': () => Audio.music(themeKey),
      'level-complete': () => Audio.sfx('victory'),
    };
    Object.entries(on).forEach(([e, fn]) => this.events.on(e, fn));
    this.events.once('shutdown', () => Object.entries(on).forEach(([e, fn]) => this.events.off(e, fn)));
  }

  // ---------------------------------------------------------------- update
  update(time, delta) {
    const input = this.controls.update();
    const player = this.player;
    const dt = Math.min(delta / 1000, 1 / 20);

    if (!this.stats.finished) {
      this.stats.time += delta;
      Save.bumpStat('playtime', delta);
    }
    if (input.respawnPressed && !player.dead && !this.stats.finished) this.killPlayer();

    player.update(input, delta);
    this.level.update(dt, player);
    this.enemies.update(dt, player);
    if (this.boss) this.boss.update(dt, player);
    this.combat.update(dt, player);

    if (!player.dead && !this.stats.finished) {
      const bounds = this.playerBounds();
      this.checkpoints.update(bounds);
      this.updateSecrets(bounds);
      this.collectShards(bounds);
      if (player.riding && player.riding.trigger) player.riding.trigger();
      if (this.boss) this.updateBossTrigger(bounds);
      this.checkDanger(bounds);
      if (!player.dead && !this.level.exit.sealed && Rect.Overlaps(this.level.exit.rect, bounds)) this.finishLevel();
    }
    this.prevBottom = player.body.bottom;

    this.camController.update(player, delta);
    this.atmo.update(delta / 1000, player);
  }

  playerBounds() {
    const b = this.player.body;
    this._bounds = this._bounds || new Rect();
    return this._bounds.setTo(b.x, b.y, b.width, b.height);
  }

  checkDanger(bounds) {
    if (bounds.y > this.level.heightPx + 32) return this.killPlayer();
    if (this.level.hazardHits(bounds)) return this.killPlayer();
    if (this.boss) {
      this.boss.tryHit(this.player, bounds, this.prevBottom);
      if (this.boss.touches(bounds)) return this.killPlayer();
    }
    if (this.enemies.collide(this.player, bounds, this.prevBottom) === 'kill') return this.killPlayer();
    if (this.combat.hits(bounds)) return this.killPlayer();
    return false;
  }

  // ------------------------------------------------------------- secrets
  updateSecrets(bounds) {
    for (const s of this.level.secrets) {
      const inside = Rect.Overlaps(s.rect, bounds);
      if (inside !== s.inside) {
        s.inside = inside;
        this.tweens.killTweensOf(s.layer);
        this.tweens.add({ targets: s.layer, alpha: inside ? 0.25 : 1, duration: 250 });
        if (inside && !s.found) {
          s.found = true;
          this.fx.secret(bounds.centerX, bounds.centerY);
          const wi = this.level.def.worldIndex;
          const world = WORLDS[wi];
          const wasOpen = Save.isSecretUnlocked(wi);
          const isNew = Save.addSecret(this.levelId, this.level.secrets.indexOf(s));
          const ws = Save.worldSecrets(wi);
          this.events.emit('secret', {
            found: this.level.secrets.filter((x) => x.found).length,
            total: this.level.secrets.length,
            isNew,
            worldFound: ws.found,
            worldTotal: ws.total,
            secretLevelUnlocked: !wasOpen && Save.isSecretUnlocked(wi) && world ? world.secretId : null,
          });
        }
      }
    }
  }

  collectShards(bounds) {
    for (const s of this.level.shards) {
      if (s.taken || !Rect.Overlaps(s.rect, bounds)) continue;
      s.taken = true;
      this.shardsCollected[s.index] = true;
      this.fx.shard(s.x, s.img.y);
      const ui = this.scene.get('UI');
      const hud = ui && ui.gemPos ? ui.gemPos(s.index) : null;
      if (hud) this.fx.shardToHud(s.x, s.img.y, hud.x, hud.y);
      else this.fx.shardToHud(s.x, s.img.y);
      if (s.flare) s.flare.setVisible(false);
      this.tweens.add({ targets: [s.img, s.glow], alpha: 0, scale: 1.8, y: s.img.y - 30, duration: 350, onComplete: () => s.img.setVisible(false) });
      this.events.emit('shard', { index: s.index, collected: this.shardsCollected.filter(Boolean).length, total: this.shardsCollected.length });
    }
  }

  // ---------------------------------------------------------------- boss
  bossArenaRect() {
    const a = this.boss.arena;
    this._arena = this._arena || new Rect();
    return this._arena.setTo(a.left + TILE * 2, a.ceilY, a.right - a.left - TILE * 2, a.floorY - a.ceilY);
  }

  updateBossTrigger(bounds) {
    if (this.bossDone || this.boss.state !== 'dormant') return;
    if (!Rect.Overlaps(this.bossArenaRect(), bounds)) return;
    this.setGate(true);
    this.lockCamera(true);
    this.boss.start();
    this.events.emit('boss-start', { name: this.boss.name, hp: this.boss.hp, maxHp: this.boss.maxHp });
  }

  gateColumn() {
    const a = this.boss.arena;
    return a.gateX !== undefined ? a.gateX : a.x0 - 1;
  }

  setGate(closed) {
    const a = this.boss.arena;
    const gx = this.gateColumn();
    for (let y = a.ceiling; y < a.floor; y++) this.level.setSolid(gx, y, closed);
    const px = (gx + 0.5) * TILE;
    this.fx.rubble(px, a.floorY - 20, 10);
    this.cameras.main.shake(150, 0.006);
  }

  lockCamera(lock) {
    const cam = this.cameras.main;
    if (!lock) {
      cam.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
      return;
    }
    const a = this.boss.arena;
    const w = Math.max(a.right - a.left + TILE * 4, GAME_W);
    const h = Math.max(a.floorY - a.ceilY + TILE * 4, GAME_H);
    const cx = (a.left + a.right) / 2;
    const cy = (a.ceilY + a.floorY) / 2;
    const x = Phaser.Math.Clamp(cx - w / 2, 0, Math.max(0, this.level.widthPx - w));
    const y = Phaser.Math.Clamp(cy - h / 2 + TILE, 0, Math.max(0, this.level.heightPx - h));
    cam.setBounds(x, y, Math.min(w, this.level.widthPx), Math.min(h, this.level.heightPx));
  }

  onBossDefeated() {
    this.bossDone = true;
    this.combat.clear();
    this.setGate(false);
    this.lockCamera(false);
    this.level.setExitSealed(false);
    const e = this.level.exit;
    this.fx.victory(e.x, e.bottom - 48);
    this.cameras.main.flash(400, 255, 240, 200);
  }

  // ---------------------------------------------------------- death/respawn
  killPlayer() {
    if (this.player.dead) return;
    this.player.die();
    if (this.trail) this.trail.stop();
    this.stats.deaths++;
    this.events.emit('death', this.stats.deaths);
    this.time.delayedCall(PLAYER.RESPAWN_DELAY, () => {
      this.combat.clear();
      this.enemies.reset();
      this.level.resetHazards();
      const bossLive = this.boss && !this.bossDone && (this.boss.state === 'fight');
      if (bossLive) {
        this.boss.reset();
        this.setGate(false);
        this.lockCamera(false);
        this.events.emit('boss-reset', { name: this.boss.name, hp: this.boss.hp, maxHp: this.boss.maxHp });
      }
      const cp = this.checkpoints.current;
      this.player.respawn(cp.x, cp.bottom);
      if (this.trail) this.trail.start();
      this.prevBottom = this.player.body.bottom;
      this.camController.snap(cp.x, cp.bottom);
    });
  }

  finishLevel() {
    this.stats.finished = true;
    this.player.frozen = true;
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.controls.enabled = false;
    const { x, bottom } = this.level.exit;
    this.fx.victory(x, bottom - 48);
    this.player.celebrate();
    this.tweens.add({ targets: [this.player.sprite, this.player.glow], alpha: 0, scale: 0.2, y: '-=24', delay: 900, duration: 600, ease: 'Quad.in' });
    this.time.delayedCall(900, () => {
      this.fx.flare(this.player.sprite.x, this.player.sprite.y - 22, 0xfff0c0, 1.2, 500);
      if (this.trail) this.trail.stop();
    });
    this.cameras.main.flash(500, 255, 230, 170);

    const run = { time: this.stats.time, deaths: this.stats.deaths, shards: this.shardsCollected.slice() };
    const summary = recordRun(this.levelId, run);
    this.events.emit('level-complete', {
      id: this.levelId,
      time: run.time,
      deaths: run.deaths,
      shards: run.shards,
      shardTotal: run.shards.length,
      nextId: nextLevelId(this.levelId),
      bestTime: summary.bestTime,
      newBest: summary.newBest,
      summary,
      // Stage 1 compatibility
      finished: true,
    });
  }

  restartLevel() {
    this.scene.restart({ levelId: this.levelId });
  }

  loadLevel(id) {
    this.scene.restart({ levelId: id });
  }

  exitToMenu(data) {
    if (this.scene.get('Menu')) {
      this.scene.stop('UI');
      this.scene.start('Menu', data);
    } else {
      this.restartLevel();
    }
  }
}
