/**
 * Small DSL for authoring levels. All coordinates are in tiles (32px).
 *
 * "Feet" positions (start, exit, checkpoints, ground enemies) use the row the
 * character stands in, i.e. solid ground is at row y + 1.
 *
 * Usage:
 *   const L = new LevelBuilder({ name: 'Mossy Steps', width: 180, height: 34 });
 *   L.ground(28);            // fills rows 28..height with solid tiles
 *   L.walls();               // left/right boundary walls
 *   L.start(4, 27);
 *   L.spike(20, 27, 3);
 *   L.exit(170, 27);
 *   return L.build();
 */
export default class LevelBuilder {
  constructor({ name, width, height, theme = null, music = null }) {
    this.def = {
      name,
      width,
      height,
      theme,
      music,
      grid: Array.from({ length: height }, () => new Array(width).fill(false)),
      fake: Array.from({ length: height }, () => new Array(width).fill(false)),
      start: { x: 3, y: height - 7 },
      exit: null,
      spikes: [],
      platforms: [],
      saws: [],
      lasers: [],
      electrics: [],
      rocks: [],
      vanishers: [],
      crumbles: [],
      enemies: [],
      shards: [],
      checkpoints: [],
      labels: [],
      boss: null,
    };
  }

  inBounds(x, y) {
    return y >= 0 && y < this.def.height && x >= 0 && x < this.def.width;
  }

  // ------------------------------------------------------------- terrain
  solid(x, y, w = 1, h = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.inBounds(i, j)) this.def.grid[j][i] = true;
    return this;
  }

  clear(x, y, w = 1, h = 1) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (this.inBounds(i, j)) {
          this.def.grid[j][i] = false;
          this.def.fake[j][i] = false;
        }
    return this;
  }

  /** Solid ground from row `top` to the bottom of the map. */
  ground(top, x = 0, w = this.def.width) {
    return this.solid(x, top, w, this.def.height - top);
  }

  /** A bottomless pit: clears from row `top` down. */
  pit(x, w, top = 0) {
    return this.clear(x, top, w, this.def.height - top);
  }

  /** Boundary walls on the left and right edges (and optional ceiling). */
  walls(thickness = 2, ceiling = 0) {
    const { width: W, height: H } = this.def;
    this.solid(0, 0, thickness, H);
    this.solid(W - thickness, 0, thickness, H);
    if (ceiling) this.solid(0, 0, W, ceiling);
    return this;
  }

  /** Secret passage: looks like solid wall but can be walked through. Revealed on entry. */
  secret(x, y, w, h) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (this.inBounds(i, j)) {
          this.def.grid[j][i] = false;
          this.def.fake[j][i] = true;
        }
    return this;
  }

  // ------------------------------------------------------ markers/triggers
  start(x, y) {
    this.def.start = { x, y };
    return this;
  }

  exit(x, y) {
    this.def.exit = { x, y };
    return this;
  }

  checkpoint(x, y) {
    this.def.checkpoints.push({ x, y });
    return this;
  }

  label(x, y, text, touchText = text) {
    this.def.labels.push({ x, y, text, touchText });
    return this;
  }

  /** Collectible light shard (3 per level is the convention). x/y are the tile it floats in. */
  shard(x, y) {
    this.def.shards.push({ x, y });
    return this;
  }

  // -------------------------------------------------------------- hazards
  /** Row of spikes. dir: 'up' (on floor), 'down' (on ceiling), 'left'/'right' (on walls, w = height). */
  spike(x, y, w = 1, dir = 'up') {
    for (let i = 0; i < w; i++) {
      if (dir === 'left' || dir === 'right') this.def.spikes.push({ x, y: y + i, dir });
      else this.def.spikes.push({ x: x + i, y, dir });
    }
    return this;
  }

  /** Moving blade travelling between two tile positions (centre coords). */
  saw(x, y, toX = x, toY = y, period = 3, phase = 0) {
    this.def.saws.push({ kind: 'line', x, y, toX, toY, period, phase });
    return this;
  }

  /** Blade orbiting a centre point. Negative period spins the other way. */
  orbitSaw(cx, cy, radius, period = 3, phase = 0) {
    this.def.saws.push({ kind: 'orbit', x: cx, y: cy, radius, period, phase });
    return this;
  }

  /**
   * Laser beam starting at tile (x, y), `len` tiles long, 'h' (to the right) or 'v' (downwards).
   * opts: { on, off, phase (0..1), warn, always, toX, toY, period } – toX/toY make the emitter travel.
   */
  laser(x, y, len, dir = 'h', opts = {}) {
    this.def.lasers.push({ x, y, len, dir, on: 1.4, off: 1.4, phase: 0, warn: 0.55, always: false, ...opts });
    return this;
  }

  /** Electric barrier between two posts. Same timing options as lasers. */
  electric(x, y, len, dir = 'v', opts = {}) {
    this.def.electrics.push({ x, y, len, dir, on: 1.6, off: 1.2, phase: 0, warn: 0.4, always: false, ...opts });
    return this;
  }

  /** Rock hanging from the ceiling at tile (x, y); falls when the player passes underneath. */
  rock(x, y, opts = {}) {
    this.def.rocks.push({ x, y, ...opts });
    return this;
  }

  // ------------------------------------------------------------ platforms
  /** One-way moving platform, w tiles wide, ping-ponging between two positions. */
  platform(x, y, toX = x, toY = y, period = 4, phase = 0, w = 3) {
    this.def.platforms.push({ x, y, toX, toY, period, phase, w });
    return this;
  }

  /** Platform that blinks in and out. opts: { on, off, phase (0..1) }. */
  vanish(x, y, w = 3, opts = {}) {
    this.def.vanishers.push({ x, y, w, on: 2, off: 1.4, phase: 0, ...opts });
    return this;
  }

  /** Floor that collapses shortly after being stood on and reforms later. */
  crumble(x, y, w = 2, opts = {}) {
    this.def.crumbles.push({ x, y, w, delay: 0.45, respawn: 2.6, ...opts });
    return this;
  }

  // -------------------------------------------------------------- enemies
  /**
   * type: 'slime' | 'bat' | 'hunter' | 'guardian'
   * Ground enemies use feet row y. Bats use the tile they hang from / hover in.
   * opts: slime {speed, hop}, bat {wake, speed, patrol}, hunter {range, speed}, guardian {range, burst, rate, dir}
   */
  enemy(type, x, y, opts = {}) {
    this.def.enemies.push({ type, x, y, ...opts });
    return this;
  }

  /**
   * Boss fight. The arena spans tiles x0..x1 (inclusive, open floor), floor = row of the
   * solid floor's top, ceiling = first open row. A gate closes at gateX when the fight starts.
   * The level's exit stays sealed until the boss is defeated.
   */
  boss(type, arena) {
    this.def.boss = { type, ...arena };
    return this;
  }

  build() {
    if (!this.def.exit) throw new Error(`Level "${this.def.name}" has no exit`);
    return this.def;
  }
}
