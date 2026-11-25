/**
 * Offline level verifier: `node tools/level-check.mjs [levelId ...]`
 *
 * Re-implements the player controller (src/entities/Player.js) and Arcade tile collision
 * at a fixed 60 Hz step, then runs weighted A* searches over input sequences to prove that,
 * using only static terrain:
 *   - the exit, every crystal, every checkpoint and every secret passage is reachable
 *     (searches may start from any checkpoint already proven reachable, since dying respawns there),
 *   - the exit is still reachable after respawning at any checkpoint (no softlocks),
 *   - grabbing any crystal does not trap the player.
 * Spawn points / checkpoints are also checked for solid ground and adjacent spikes.
 *
 * Approximations: moving / vanishing / crumbling platforms are treated as always-present
 * ledges along their path; timed hazards, saws and enemies are ignored (always-on beams and
 * spikes kill). A FAIL is a real geometry problem; a PASS means "possible", not "easy".
 */
import { PLAYER as P, TILE } from '../src/config.js';
import { LEVELS, SECRET_LEVELS, getLevelDef } from '../src/levels/registry.js';

const DT = 1 / 60;
const BW = P.BODY_W;
const BH = P.BODY_H;
const MACRO = 5;
const MAX_STATES = Number(process.env.MAX_STATES || 1_200_000);

const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

class World {
  constructor(def) {
    this.def = def;
    this.W = def.width;
    this.H = def.height;
    this.wpx = def.width * TILE;
    this.hpx = def.height * TILE;
    this.grid = def.grid;
    this.hazards = [];
    for (const s of def.spikes) {
      const x = s.x * TILE;
      const y = s.y * TILE;
      if (s.dir === 'down') this.hazards.push({ x: x + 3, y, w: TILE - 6, h: 17 });
      else if (s.dir === 'right') this.hazards.push({ x, y: y + 3, w: 17, h: TILE - 6 });
      else if (s.dir === 'left') this.hazards.push({ x: x + 15, y: y + 3, w: 17, h: TILE - 6 });
      else this.hazards.push({ x: x + 3, y: y + 15, w: TILE - 6, h: 17 });
    }
    const beams = [...def.lasers.map((b) => [b, 10]), ...def.electrics.map((b) => [b, 14])];
    for (const [b, th] of beams) {
      if (!b.always || b.toX !== undefined || b.toY !== undefined) continue;
      const len = b.len * TILE;
      if (b.dir === 'h') this.hazards.push({ x: b.x * TILE, y: b.y * TILE + TILE / 2 - th / 2, w: len, h: th });
      else this.hazards.push({ x: b.x * TILE + TILE / 2 - th / 2, y: b.y * TILE, w: th, h: len });
    }
    this.ledges = [];
    for (const p of def.platforms) {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(p.toX - p.x), Math.abs(p.toY - p.y))));
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        this.ledges.push({ x: (p.x + (p.toX - p.x) * k) * TILE, y: (p.y + (p.toY - p.y) * k) * TILE, w: p.w * TILE });
      }
    }
    for (const p of [...def.vanishers, ...def.crumbles]) this.ledges.push({ x: p.x * TILE, y: p.y * TILE, w: p.w * TILE });
  }

  solidTile(tx, ty) {
    if (ty < 0 || ty >= this.H || tx < 0 || tx >= this.W) return false;
    return this.grid[ty][tx];
  }

  /** Mirrors Level.isSolidAt (wall probes). */
  solidAt(px, py) {
    if (px < 0 || px >= this.wpx || py < 0 || py >= this.hpx) return px < 0 || px >= this.wpx || py >= this.hpx;
    return this.grid[Math.floor(py / TILE)][Math.floor(px / TILE)];
  }

  hazard(b) {
    if (b.y > this.hpx + 32) return true;
    for (const h of this.hazards) if (overlaps(h, b)) return true;
    return false;
  }
}

function newState(x, bottom) {
  return {
    x: x - BW / 2, y: bottom - BH, vx: 0, vy: 0, gy: 0, grav: true, bl: false, br: false, bd: false,
    moveVx: 0, facing: 1, grounded: false, coyote: 0, jumpBuffer: 0, groundLock: 0, isJumping: false,
    airJumps: 1, wallDir: 0, lastWallDir: 0, wallCoyote: 0, wallJumpLock: 0,
    canDash: true, dashing: false, dashTimer: 0, dashCooldown: 0, ddx: 1, ddy: 0, riding: false,
  };
}

/** One Arcade step: integrate, then separate on X then Y against tiles, ledges and world bounds. */
function physics(w, s) {
  s.bl = s.br = s.bd = false;
  if (s.grav) s.vy += (1800 + s.gy) * DT;
  s.x += s.vx * DT;
  const ty0 = Math.floor(s.y / TILE);
  const ty1 = Math.floor((s.y + BH - 0.001) / TILE);
  if (s.vx > 0) {
    const tx = Math.floor((s.x + BW - 0.001) / TILE);
    for (let ty = ty0; ty <= ty1; ty++)
      if (w.solidTile(tx, ty)) {
        s.x = tx * TILE - BW;
        s.vx = 0;
        s.br = true;
        break;
      }
  } else if (s.vx < 0) {
    const tx = Math.floor(s.x / TILE);
    for (let ty = ty0; ty <= ty1; ty++)
      if (w.solidTile(tx, ty)) {
        s.x = (tx + 1) * TILE;
        s.vx = 0;
        s.bl = true;
        break;
      }
  }
  if (s.x < 0) {
    s.x = 0;
    s.vx = 0;
    s.bl = true;
  } else if (s.x + BW > w.wpx) {
    s.x = w.wpx - BW;
    s.vx = 0;
    s.br = true;
  }
  const prevBottom = s.y + BH;
  s.y += s.vy * DT;
  const tx0 = Math.floor(s.x / TILE);
  const tx1 = Math.floor((s.x + BW - 0.001) / TILE);
  if (s.vy > 0) {
    const ty = Math.floor((s.y + BH - 0.001) / TILE);
    for (let tx = tx0; tx <= tx1; tx++)
      if (w.solidTile(tx, ty)) {
        s.y = ty * TILE - BH;
        s.vy = 0;
        s.bd = true;
        break;
      }
  } else if (s.vy < 0) {
    const ty = Math.floor(s.y / TILE);
    for (let tx = tx0; tx <= tx1; tx++)
      if (w.solidTile(tx, ty)) {
        s.y = (ty + 1) * TILE;
        s.vy = 0;
        break;
      }
  }
  if (s.vy >= -1 && !s.bd) {
    const bottom = s.y + BH;
    for (const l of w.ledges) {
      if (s.x < l.x + l.w && s.x + BW > l.x && bottom > l.y && bottom - l.y <= 14 && prevBottom <= l.y + 14) {
        s.y = l.y - BH;
        s.vy = 0;
        break;
      }
    }
  }
}

function ridingLedge(w, s) {
  const bottom = s.y + BH;
  for (const l of w.ledges) if (s.x + BW > l.x + 1 && s.x < l.x + l.w - 1 && Math.abs(bottom - l.y) <= 4 && s.vy >= -5) return true;
  return false;
}

function touchingWall(w, s, dir) {
  const x = dir > 0 ? s.x + BW + 2 : s.x - 2;
  return w.solidAt(x, s.y + 4) || w.solidAt(x, s.y + BH / 2) || w.solidAt(x, s.y + BH - 4);
}

function jump(s, v) {
  s.vy = -v;
  s.isJumping = true;
  s.jumpBuffer = 0;
  s.coyote = 0;
  s.groundLock = P.JUMP_GROUND_LOCK;
  s.grounded = false;
  s.riding = false;
}

/** Port of Player.update (movement logic only). */
function control(w, s, inp) {
  s.groundLock = Math.max(0, s.groundLock - DT);
  s.riding = s.groundLock > 0 ? false : ridingLedge(w, s);
  s.grounded = s.groundLock <= 0 && (s.bd || s.riding);
  if (s.grounded) {
    s.coyote = P.COYOTE_TIME;
    s.airJumps = 1;
    s.isJumping = false;
    if (!s.dashing && s.dashCooldown <= 0) s.canDash = true;
  } else s.coyote -= DT;

  s.wallDir = 0;
  if (!s.grounded) {
    if (touchingWall(w, s, 1)) s.wallDir = 1;
    else if (touchingWall(w, s, -1)) s.wallDir = -1;
  }
  if (s.wallDir !== 0) {
    s.wallCoyote = P.WALL_COYOTE;
    s.lastWallDir = s.wallDir;
  } else s.wallCoyote -= DT;

  s.jumpBuffer = inp.jp ? P.JUMP_BUFFER : s.jumpBuffer - DT;
  s.dashCooldown -= DT;
  s.wallJumpLock -= DT;

  if (inp.dp && s.canDash && s.dashCooldown <= 0 && !s.dashing) {
    let dx = inp.x;
    let dy = inp.y;
    if (s.grounded && dy > 0) dy = 0;
    if (dx === 0 && dy === 0) dx = s.facing;
    const len = Math.hypot(dx, dy);
    s.ddx = dx / len;
    s.ddy = dy / len;
    if (dx !== 0) s.facing = Math.sign(dx);
    s.dashing = true;
    s.canDash = false;
    s.dashTimer = P.DASH_TIME;
    s.dashCooldown = P.DASH_COOLDOWN;
    s.isJumping = false;
    s.grav = false;
    s.vx = s.ddx * P.DASH_SPEED;
    s.vy = s.ddy * P.DASH_SPEED;
  }
  if (s.dashing) {
    s.dashTimer -= DT;
    const cancel = s.jumpBuffer > 0 && (s.grounded || s.coyote > 0 || s.wallCoyote > 0);
    if (s.dashTimer <= 0 || cancel) {
      s.dashing = false;
      s.grav = true;
      s.moveVx = s.ddx * P.DASH_SPEED * P.DASH_END_KEEP_X;
      s.vx = s.moveVx;
      s.vy = s.ddy * P.DASH_SPEED * P.DASH_END_KEEP_Y;
    } else {
      s.vx = s.ddx * P.DASH_SPEED;
      s.vy = s.ddy * P.DASH_SPEED;
      return;
    }
  }

  const dirX = inp.x;
  const target = dirX * P.MAX_RUN;
  let accel;
  if (s.grounded) {
    if (dirX === 0) accel = P.RUN_DECEL;
    else if (s.moveVx !== 0 && Math.sign(dirX) !== Math.sign(s.moveVx)) accel = P.TURN_ACCEL;
    else accel = P.RUN_ACCEL;
  } else {
    accel = dirX === 0 ? P.AIR_DECEL : P.AIR_ACCEL;
    if (dirX !== 0 && Math.sign(dirX) === Math.sign(s.moveVx) && Math.abs(s.moveVx) > P.MAX_RUN) accel = P.AIR_DECEL;
  }
  if (s.wallJumpLock > 0) accel *= 0.2;
  s.moveVx = approach(s.moveVx, target, accel * DT);
  if (s.grounded && s.bl && s.moveVx < 0) s.moveVx = 0;
  if (s.grounded && s.br && s.moveVx > 0) s.moveVx = 0;
  if (dirX !== 0 && s.wallJumpLock <= 0) s.facing = dirX;

  if (s.jumpBuffer > 0) {
    if (s.grounded || s.coyote > 0) jump(s, P.JUMP_VELOCITY);
    else if (s.wallCoyote > 0) {
      const dir = s.lastWallDir;
      s.vy = -P.WALL_JUMP_Y;
      s.moveVx = -dir * P.WALL_JUMP_X;
      s.facing = -dir;
      s.wallJumpLock = P.WALL_JUMP_LOCK;
      s.wallCoyote = 0;
      s.jumpBuffer = 0;
      s.isJumping = true;
      s.airJumps = 1;
    } else if (s.airJumps > 0) {
      s.airJumps--;
      jump(s, P.DOUBLE_JUMP_VELOCITY);
    }
  }
  if (s.isJumping && !inp.jh && s.vy < 0) {
    s.vy *= P.JUMP_CUT;
    s.isJumping = false;
  }
  if (s.vy >= 0) s.isJumping = false;

  let g = 1;
  if (s.vy > 0) g = P.FALL_GRAVITY_MULT;
  else if (Math.abs(s.vy) < P.APEX_THRESHOLD && inp.jh && !s.grounded) g = P.APEX_GRAVITY_MULT;
  s.gy = P.GRAVITY * (g - 1);

  const sliding = !s.grounded && s.wallDir !== 0 && dirX === s.wallDir && s.vy > 0;
  const maxFall = sliding ? P.WALL_SLIDE_SPEED : inp.y > 0 ? P.FAST_FALL : P.MAX_FALL;
  if (s.vy > maxFall) s.vy = sliding ? approach(s.vy, maxFall, 4000 * DT) : maxFall;
  s.vx = s.moveVx;
}

const ACTIONS = [];
for (const x of [-1, 0, 1]) for (const j of ['none', 'hold', 'press']) ACTIONS.push({ x, y: 0, j, dash: false });
for (const [x, y] of [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [1, 1], [-1, 1], [0, 1]]) ACTIONS.push({ x, y, j: 'none', dash: true });

const QX = Number(process.env.QX || 8);
const QV = Number(process.env.QV || 110);
function key(s) {
  return [
    Math.round(s.x / QX), Math.round(s.y / QX), Math.round(s.vx / QV), Math.round(s.vy / QV), Math.round(s.moveVx / QV),
    s.airJumps, s.canDash ? 1 : 0, s.dashing ? 1 : 0, s.isJumping ? 1 : 0, s.grounded ? 1 : 0,
    s.dashCooldown > 0 ? 1 : 0, s.wallJumpLock > 0 ? 1 : 0, s.wallCoyote > 0 ? 1 : 0,
  ].join(',');
}

class Heap {
  constructor() {
    this.a = [];
  }
  push(f, v) {
    const a = this.a;
    a.push([f, v]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top[1];
  }
  get size() {
    return this.a.length;
  }
}

const W_H = Number(process.env.WH || 2.5);
/** Weighted A* toward `goal` (frames ~ distance / run speed). Records every target touched on the way. */
function search(w, start, targets, goal, found = new Set()) {
  const gx = goal.rect.x + goal.rect.w / 2;
  const gy = goal.rect.y + goal.rect.h / 2;
  const h = (s) => (Math.hypot(s.x + BW / 2 - gx, (s.y + BH / 2 - gy) * 0.8) / P.MAX_RUN) * 60;
  const seen = new Set([key(start)]);
  const open = new Heap();
  start.g = 0;
  open.push(W_H * h(start), start);
  let states = 0;
  const b = { x: 0, y: 0, w: BW, h: BH };
  while (open.size && states < MAX_STATES) {
    const st = open.pop();
    for (const a of ACTIONS) {
      const s = { ...st };
      let dead = false;
      for (let f = 0; f < MACRO; f++) {
        physics(w, s);
        control(w, s, { x: a.x, y: a.y, jp: a.j === 'press' && f === 0, jh: a.j !== 'none', dp: a.dash && f === 0 });
        b.x = s.x;
        b.y = s.y;
        if (w.hazard(b)) {
          dead = true;
          break;
        }
        for (const t of targets) if (!found.has(t.name) && overlaps(t.rect, b)) found.add(t.name);
      }
      if (dead) continue;
      if (found.has(goal.name)) return { found, states };
      const k = key(s);
      if (seen.has(k)) continue;
      seen.add(k);
      states++;
      s.g = st.g + MACRO;
      open.push(s.g + W_H * h(s), s);
    }
  }
  return { found, states, capped: states >= MAX_STATES };
}
function checkLevel(id) {
  const def = getLevelDef(id);
  const w = new World(def);
  const issues = [];
  const exitX = (def.exit.x + 0.5) * TILE;
  const exitB = (def.exit.y + 1) * TILE;
  const exitT = { name: 'exit', rect: { x: exitX - 22, y: exitB - 90, w: 44, h: 90 } };
  const shardT = def.shards.map((s, i) => {
    const x = (s.x + 0.5) * TILE;
    const y = (s.y + 0.5) * TILE;
    return { name: `crystal${i + 1}(${s.x},${s.y})`, rect: { x: x - 14, y: y - 18, w: 28, h: 36 }, x, y };
  });
  const cpT = def.checkpoints.map((c, i) => {
    const x = (c.x + 0.5) * TILE;
    const bottom = (c.y + 1) * TILE;
    return { name: `checkpoint${i + 1}(${c.x},${c.y})`, rect: { x: x - 20, y: bottom - 64, w: 40, h: 64 }, x, bottom };
  });

  const secretT = [];
  const seenFake = def.fake.map((r) => r.map(() => false));
  for (let y = 0; y < def.height; y++)
    for (let x = 0; x < def.width; x++) {
      if (!def.fake[y][x] || seenFake[y][x]) continue;
      let [x0, y0, x1, y1] = [x, y, x, y];
      const stack = [[x, y]];
      seenFake[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        x0 = Math.min(x0, cx);
        y0 = Math.min(y0, cy);
        x1 = Math.max(x1, cx);
        y1 = Math.max(y1, cy);
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]])
          if (nx >= 0 && ny >= 0 && nx < def.width && ny < def.height && def.fake[ny][nx] && !seenFake[ny][nx]) {
            seenFake[ny][nx] = true;
            stack.push([nx, ny]);
          }
      }
      secretT.push({ name: `secret${secretT.length + 1}(${x0},${y0})`, rect: { x: x0 * TILE - 4, y: y0 * TILE - 4, w: (x1 - x0 + 1) * TILE + 8, h: (y1 - y0 + 1) * TILE + 8 } });
    }

  const feet = [['start', def.start], ['exit', def.exit], ...def.checkpoints.map((c, i) => [`checkpoint${i + 1}`, c])];
  for (const [name, p] of feet) {
    if (w.solidTile(p.x, p.y)) issues.push(`${name} (${p.x},${p.y}) is inside a solid tile`);
    const cx = (p.x + 0.5) * TILE;
    const onLedge = w.ledges.some((l) => Math.abs(l.y - (p.y + 1) * TILE) < 1 && cx > l.x && cx < l.x + l.w);
    if (!w.solidTile(p.x, p.y + 1) && !onLedge) issues.push(`${name} (${p.x},${p.y}) has no ground below`);
    if (name !== 'exit') {
      const r = { x: cx - 24, y: (p.y + 1) * TILE - BH - 4, w: 48, h: BH + 4 };
      if (w.hazards.some((h) => overlaps(h, r))) issues.push(`${name} (${p.x},${p.y}) spawns next to a hazard`);
    }
  }
  for (const t of shardT) if (w.solidTile(Math.floor(t.x / TILE), Math.floor(t.y / TILE))) issues.push(`${t.name} is inside a solid tile`);

  const t0 = Date.now();
  const all = [exitT, ...shardT, ...cpT, ...secretT];
  // Reachability is chained through checkpoints: once a checkpoint is reachable the player can
  // always die and respawn there, so later searches may start from it. This keeps each search short.
  const found = new Set();
  let states = 0;
  const log = (...a) => process.env.VERBOSE && console.log('   ', ...a);
  const dist = (a, t) => Math.hypot(a.x - (t.rect.x + t.rect.w / 2), a.bottom - (t.rect.y + t.rect.h));
  const startNode = { name: 'start', x: (def.start.x + 0.5) * TILE, bottom: (def.start.y + 1) * TILE };
  const sources = () => [startNode, ...cpT.filter((c) => found.has(c.name))];
  for (let progress = true; progress; ) {
    progress = false;
    for (const t of all) {
      if (found.has(t.name)) continue;
      for (const src of sources().sort((p, q) => dist(p, t) - dist(q, t))) {
        const r = search(w, newState(src.x, src.bottom), all, t, found);
        states += r.states;
        log(`${src.name} -> ${t.name}`, r.states, r.capped ? 'CAPPED' : '');
        if (found.has(t.name)) {
          progress = true;
          break;
        }
      }
    }
  }
  for (const t of all) if (!found.has(t.name)) issues.push(`${t.name} NOT reachable from start or any reachable checkpoint`);

  // Can the exit still be reached from a respawn / after grabbing a crystal (no soft-locks)?
  const okCp = new Set();
  const exitFrom = (s, label) => {
    const r = search(w, s(), [exitT, ...cpT], exitT);
    states += r.states;
    log(`${label} -> exit`, r.states, r.capped ? 'CAPPED' : '');
    if (r.found.has('exit') || cpT.some((c) => okCp.has(c.name) && r.found.has(c.name))) return true;
    for (const c of cpT.filter((c) => okCp.has(c.name))) {
      const r2 = search(w, s(), [c], c);
      states += r2.states;
      log(`${label} -> ${c.name}`, r2.states, r2.capped ? 'CAPPED' : '');
      if (r2.found.has(c.name)) return true;
    }
    return false;
  };
  for (const t of [...cpT].reverse()) {
    if (!found.has(t.name)) continue;
    if (exitFrom(() => newState(t.x, t.bottom), t.name)) okCp.add(t.name);
    else issues.push(`exit NOT reachable after respawn at ${t.name}`);
  }
  for (const t of shardT) {
    if (!found.has(t.name)) continue;
    if (!exitFrom(() => newState(t.x, t.y + BH / 2), t.name)) issues.push(`exit NOT reachable after taking ${t.name}`);
  }
  return { id, name: def.name, issues, note: `${states} states, ${((Date.now() - t0) / 1000).toFixed(1)}s` };
}

if (process.env.TRACE) {
  const def = getLevelDef(process.env.TRACE);
  const w = new World(def);
  const s = newState((def.start.x + 0.5) * TILE, (def.start.y + 1) * TILE);
  for (let f = 0; f < 90; f++) {
    physics(w, s);
    control(w, s, { x: 1, y: 0, jp: f === 30, jh: f >= 30, dp: false });
    if (f % 5 === 0) console.log(f, s.x.toFixed(1), s.y.toFixed(1), s.vx.toFixed(0), s.vy.toFixed(0), s.grounded, w.hazard({ x: s.x, y: s.y, w: BW, h: BH }));
  }
  process.exit(0);
}

const ids = process.argv.slice(2);
const list = ids.length ? ids : [...LEVELS.map((l) => l.id), ...SECRET_LEVELS.map((l) => l.id)];
let fails = 0;
for (const id of list) {
  const r = checkLevel(id);
  if (r.issues.length) fails++;
  console.log(`${r.issues.length ? 'FAIL' : 'PASS'}  ${id.padEnd(4)} ${String(r.name).padEnd(26)} ${r.note}`);
  for (const i of r.issues) console.log(`        - ${i}`);
}
console.log(fails ? `\n${fails} level(s) with issues` : '\nAll levels passed');
process.exit(fails ? 1 : 0);
