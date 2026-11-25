import Phaser from 'phaser';
import { TILE, DEPTH } from '../config.js';
import { Saw, Beam, FallingRock } from '../objects/Hazards.js';
import { MovingPlatform, VanishPlatform, CrumblePlatform } from '../objects/Platforms.js';

export { PathMover } from '../objects/Hazards.js';

const Rect = Phaser.Geom.Rectangle;

/**
 * Turns a level definition (see LevelBuilder) into a tilemap, hazards, platforms,
 * collectibles and triggers. Enemies and bosses are spawned by the GameScene.
 */
export default class Level {
  constructor(scene, def, fx) {
    this.scene = scene;
    // Copy the grid: boss gates mutate it at runtime and level defs are cached.
    this.def = { ...def, grid: def.grid.map((r) => r.slice()) };
    this.fx = fx;
    this.widthPx = def.width * TILE;
    this.heightPx = def.height * TILE;
    this.time = 0;
    this.tilesKey = `tiles_${def.theme || 'forest'}`;

    this.buildTilemap();
    this.buildSecrets();
    this.buildSpikes();
    this.buildPlatforms();
    this.buildHazards();
    this.buildShards();
    this.buildCheckpoints();
    this.buildExit();
    this.buildLabels();

    // Kinematic objects are advanced in lock-step with the physics simulation.
    this.onWorldStep = (delta) => this.stepMovers(delta);
    scene.physics.world.on('worldstep', this.onWorldStep);
    const world = scene.physics.world;
    scene.events.once('shutdown', () => world && world.off('worldstep', this.onWorldStep));
  }

  // --------------------------------------------------------------- tilemap
  /** Solid for autotiling purposes: fake (secret) cells count as wall so the illusion holds. */
  looksSolid(x, y) {
    const { width: W, height: H, grid, fake } = this.def;
    if (x < 0 || x >= W || y >= H) return true;
    if (y < 0) return false;
    return grid[y][x] || fake[y][x];
  }

  maskAt(x, y) {
    let mask = 0;
    if (!this.looksSolid(x, y - 1)) mask |= 1;
    if (!this.looksSolid(x + 1, y)) mask |= 2;
    if (!this.looksSolid(x, y + 1)) mask |= 4;
    if (!this.looksSolid(x - 1, y)) mask |= 8;
    return mask;
  }

  buildTilemap() {
    const { grid } = this.def;
    const data = grid.map((row, y) => row.map((s, x) => (s ? this.maskAt(x, y) : -1)));
    this.map = this.scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    this.tileset = this.map.addTilesetImage(this.tilesKey, this.tilesKey, TILE, TILE, 0, 0, 0);
    this.layer = this.map.createLayer(0, this.tileset, 0, 0).setDepth(DEPTH.TILES);
    this.layer.setCollisionBetween(0, 15);
  }

  isSolidAt(px, py) {
    const tile = this.layer.getTileAtWorldXY(px, py, true);
    if (!tile) return px < 0 || px >= this.widthPx || py >= this.heightPx;
    return tile.index >= 0 && tile.collides;
  }

  isSolidTile(tx, ty) {
    const { width: W, height: H } = this.def;
    if (tx < 0 || tx >= W || ty >= H) return true;
    if (ty < 0) return false;
    return this.def.grid[ty][tx];
  }

  /** Adds/removes a solid tile at runtime (boss gates) and refreshes neighbour autotiles. */
  setSolid(tx, ty, solid) {
    if (tx < 0 || ty < 0 || tx >= this.def.width || ty >= this.def.height) return;
    this.def.grid[ty][tx] = solid;
    for (let j = ty - 1; j <= ty + 1; j++) {
      for (let i = tx - 1; i <= tx + 1; i++) {
        if (i < 0 || j < 0 || i >= this.def.width || j >= this.def.height) continue;
        if (this.def.grid[j][i]) {
          const t = this.layer.putTileAt(this.maskAt(i, j), i, j);
          t.setCollision(true, true, true, true);
        } else {
          this.layer.removeTileAt(i, j);
        }
      }
    }
  }

  // --------------------------------------------------------------- secrets
  buildSecrets() {
    const { fake, width: W, height: H } = this.def;
    const seen = fake.map((r) => r.map(() => false));
    this.secrets = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!fake[y][x] || seen[y][x]) continue;
        // Flood fill one connected secret region.
        const cells = [];
        const stack = [[x, y]];
        seen[y][x] = true;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          cells.push([cx, cy]);
          for (const [nx, ny] of [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ]) {
            if (nx >= 0 && ny >= 0 && nx < W && ny < H && fake[ny][nx] && !seen[ny][nx]) {
              seen[ny][nx] = true;
              stack.push([nx, ny]);
            }
          }
        }
        const data = Array.from({ length: H }, () => new Array(W).fill(-1));
        let minX = W;
        let minY = H;
        let maxX = 0;
        let maxY = 0;
        for (const [cx, cy] of cells) {
          data[cy][cx] = this.maskAt(cx, cy);
          minX = Math.min(minX, cx);
          minY = Math.min(minY, cy);
          maxX = Math.max(maxX, cx);
          maxY = Math.max(maxY, cy);
        }
        const map = this.scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
        const ts = map.addTilesetImage(this.tilesKey, this.tilesKey, TILE, TILE, 0, 0, 0);
        const layer = map.createLayer(0, ts, 0, 0).setDepth(DEPTH.FX - 0.5);
        this.secrets.push({
          layer,
          rect: new Rect(minX * TILE - 4, minY * TILE - 4, (maxX - minX + 1) * TILE + 8, (maxY - minY + 1) * TILE + 8),
          found: false,
          inside: false,
        });
      }
    }
  }

  // ---------------------------------------------------------------- hazards
  buildSpikes() {
    this.spikeRects = [];
    for (const s of this.def.spikes) {
      const x = s.x * TILE;
      const y = s.y * TILE;
      const img = this.scene.add.image(x + TILE / 2, y + TILE / 2, 'spike').setDepth(DEPTH.HAZARDS);
      switch (s.dir) {
        case 'down':
          img.setFlipY(true);
          this.spikeRects.push(new Rect(x + 3, y, TILE - 6, 17));
          break;
        case 'right': // attached to a wall on the left, pointing right
          img.setAngle(90);
          this.spikeRects.push(new Rect(x, y + 3, 17, TILE - 6));
          break;
        case 'left': // attached to a wall on the right, pointing left
          img.setAngle(-90);
          this.spikeRects.push(new Rect(x + 15, y + 3, 17, TILE - 6));
          break;
        default:
          this.spikeRects.push(new Rect(x + 3, y + 15, TILE - 6, 17));
      }
    }
  }

  buildHazards() {
    const d = this.def;
    this.saws = d.saws.map((s) => new Saw(this.scene, s));
    this.lasers = d.lasers.map((l) => new Beam(this.scene, l, 'laser'));
    this.electrics = d.electrics.map((e) => new Beam(this.scene, e, 'electric'));
    this.rocks = d.rocks.map((r) => new FallingRock(this.scene, this, r, this.fx));
    this.hazards = [...this.saws, ...this.lasers, ...this.electrics, ...this.rocks];
  }

  // -------------------------------------------------------------- platforms
  buildPlatforms() {
    const d = this.def;
    this.platforms = [
      ...d.platforms.map((p) => new MovingPlatform(this.scene, p)),
      ...d.vanishers.map((p) => new VanishPlatform(this.scene, p)),
      ...d.crumbles.map((p) => new CrumblePlatform(this.scene, p, this.fx)),
    ];
    this.platformGroup = this.platforms.map((p) => p.obj);
  }

  stepMovers(delta) {
    const tNext = this.time + delta;
    for (const p of this.platforms) p.step(tNext, delta);
    this.time = tNext;
  }

  /** Per-frame update of animated hazards and platforms. */
  update(dt, player) {
    const t = this.time;
    for (const p of this.platforms) p.update(t, dt);
    for (const h of this.hazards) h.update(t, dt, player);
    for (const s of this.shards) {
      if (s.taken) continue;
      s.img.y = s.y + Math.sin(t * 2.4 + s.index) * 4;
      s.glow.y = s.img.y;
      const pulse = Math.sin(t * 3 + s.index * 1.7);
      s.glow.setScale(0.55 + pulse * 0.07);
      if (s.flare) {
        s.flare.y = s.img.y;
        s.flare.angle = t * 40 + s.index * 25;
        s.flare.setAlpha((0.32 + pulse * 0.14) * (s.img.alpha < 0.6 ? 0.4 : 1));
      }
    }
    for (const c of this.checkpoints) {
      if (!c.active) continue;
      const k = Math.sin(t * 2.6 + c.index);
      c.glow.setScale(0.9 + k * 0.08);
      if (c.halo) c.halo.setAlpha(0.35 + k * 0.15).setScale(1 + k * 0.06, 0.32 + k * 0.02);
    }
    const e = this.exit;
    if (e && e.rings && !e.sealed) {
      e.rings[0].angle = t * 50;
      e.rings[1].angle = -t * 34;
    }
  }

  /** Resets stateful hazards (rocks, crumbling floors) after a death. */
  resetHazards() {
    for (const r of this.rocks) r.reset();
    for (const p of this.platforms) p.reset();
  }

  hazardHits(bounds) {
    for (const r of this.spikeRects) if (Rect.Overlaps(r, bounds)) return true;
    for (const h of this.hazards) if (h.hits(bounds)) return true;
    return false;
  }

  // ------------------------------------------------------------ collectibles
  buildShards() {
    this.shards = this.def.shards.map((s, index) => {
      const x = (s.x + 0.5) * TILE;
      const y = (s.y + 0.5) * TILE;
      const glow = this.scene.add.image(x, y, 'glow').setTint(0x8fe8ff).setAlpha(0.45).setScale(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.PROPS);
      const flare = this.scene.add.image(x, y, 'fx-flare').setTint(0x9ff0ff).setAlpha(0.35).setScale(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.PROPS);
      const img = this.scene.add.image(x, y, 'shard').setDepth(DEPTH.PROPS);
      return { index, x, y, img, glow, flare, taken: false, rect: new Rect(x - 14, y - 18, 28, 36) };
    });
  }

  // --------------------------------------------------------------- triggers
  buildCheckpoints() {
    this.checkpoints = this.def.checkpoints.map((c, i) => {
      const x = (c.x + 0.5) * TILE;
      const bottom = (c.y + 1) * TILE;
      const sprite = this.scene.add.image(x, bottom, 'cp_off').setOrigin(0.5, 1).setDepth(DEPTH.PROPS);
      const glow = this.scene.add
        .image(x, bottom - 43, 'glow')
        .setTint(0x9ff0ff)
        .setAlpha(0)
        .setScale(0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.PROPS);
      // Floor halo that lights up once the checkpoint is active.
      const halo = this.scene.add
        .image(x, bottom - 2, 'glow')
        .setTint(0x9ff0ff)
        .setAlpha(0)
        .setScale(1, 0.32)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.DECOR);
      this.scene.tweens.add({ targets: sprite, alpha: { from: 1, to: 0.92 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      return { index: i, x, bottom, sprite, glow, halo, active: false, rect: new Rect(x - 20, bottom - 64, 40, 64) };
    });
  }

  buildExit() {
    const e = this.def.exit;
    const x = (e.x + 0.5) * TILE;
    const bottom = (e.y + 1) * TILE;
    const glow = this.scene.add.image(x, bottom - 48, 'glow').setScale(2.6).setTint(0xffd27a).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.PROPS);
    const portal = this.scene.add.image(x, bottom - 48, 'portal').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.PROPS);
    const rings = [
      this.scene.add.image(x, bottom - 48, 'fx-ring').setScale(0.95, 1.25).setTint(0xffd27a).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.PROPS),
      this.scene.add.image(x, bottom - 48, 'fx-flare').setScale(1.2, 1.6).setTint(0xffe6a3).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.PROPS),
    ];
    const base = this.scene.add.image(x, bottom - 2, 'glow').setScale(1.6, 0.35).setTint(0xffd27a).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.DECOR);
    this.scene.tweens.add({ targets: portal, scaleX: 0.85, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.scene.tweens.add({ targets: glow, alpha: 0.8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const particles = this.scene.add
      .particles(x, bottom - 48, 'dot', {
        lifespan: 1400,
        frequency: 60,
        speed: { min: 10, max: 40 },
        angle: { min: 250, max: 290 },
        x: { min: -22, max: 22 },
        y: { min: -30, max: 40 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: 0xffe6a3,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.PROPS);
    this.exit = { x, bottom, portal, glow, rings, base, particles, sealed: false, rect: new Rect(x - 22, bottom - 90, 44, 90) };
  }

  /** Boss levels keep the exit sealed (dim, inactive) until the boss is defeated. */
  setExitSealed(sealed) {
    const e = this.exit;
    e.sealed = sealed;
    e.portal.setAlpha(sealed ? 0.12 : 1);
    e.glow.setVisible(!sealed);
    for (const r of e.rings) r.setVisible(!sealed);
    e.base.setVisible(!sealed);
    e.particles.emitting = !sealed;
  }

  buildLabels() {
    const touch = this.scene.sys.game.device.input.touch && navigator.maxTouchPoints > 0;
    for (const l of this.def.labels) {
      this.scene.add
        .text(l.x * TILE, l.y * TILE, touch ? l.touchText : l.text, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '18px',
          color: '#cbb8ff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setAlpha(0.75)
        .setDepth(DEPTH.LABELS);
    }
  }

  spawnPoint() {
    const s = this.def.start;
    return { x: (s.x + 0.5) * TILE, bottom: (s.y + 1) * TILE };
  }
}
