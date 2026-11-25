import LevelBuilder from './LevelBuilder.js';
import level_1_1 from './worlds/level_1_1.js';
import level_1_2 from './worlds/level_1_2.js';
import level_1_3 from './worlds/level_1_3.js';
import level_1_4 from './worlds/level_1_4.js';
import level_2_1 from './worlds/level_2_1.js';
import level_2_2 from './worlds/level_2_2.js';
import level_2_3 from './worlds/level_2_3.js';
import level_2_4 from './worlds/level_2_4.js';
import level_3_1 from './worlds/level_3_1.js';
import level_3_2 from './worlds/level_3_2.js';
import level_3_3 from './worlds/level_3_3.js';
import level_3_4 from './worlds/level_3_4.js';
import level_4_1 from './worlds/level_4_1.js';
import level_4_2 from './worlds/level_4_2.js';
import level_4_3 from './worlds/level_4_3.js';
import level_4_4 from './worlds/level_4_4.js';
import level_5_1 from './worlds/level_5_1.js';
import level_5_2 from './worlds/level_5_2.js';
import level_5_3 from './worlds/level_5_3.js';
import level_5_4 from './worlds/level_5_4.js';
import sandbox from './worlds/sandbox.js';
import secret_1 from './worlds/secret_1.js';
import secret_2 from './worlds/secret_2.js';
import secret_3 from './worlds/secret_3.js';
import secret_4 from './worlds/secret_4.js';
import secret_5 from './worlds/secret_5.js';

/**
 * World / level registry. To add a level: create a builder function in ./worlds/
 * (see LevelBuilder.js) and append it to a world's `levels` array. Ids ("2-3") and
 * unlock order are derived automatically.
 */
export const WORLDS = [
  { name: 'Forgotten Forest', theme: 'forest', boss: 'Mossback, the Slime King', levels: [level_1_1, level_1_2, level_1_3, level_1_4] },
  { name: 'Underground Ruins', theme: 'ruins', boss: 'The Stone Warden', levels: [level_2_1, level_2_2, level_2_3, level_2_4] },
  { name: 'Shadow Castle', theme: 'castle', boss: 'Count Noctis', levels: [level_3_1, level_3_2, level_3_3, level_3_4] },
  { name: 'Crystal Caverns', theme: 'crystal', boss: 'The Prism Colossus', levels: [level_4_1, level_4_2, level_4_3, level_4_4] },
  { name: 'The Void', theme: 'void', boss: 'Umbra, the Void Heart', levels: [level_5_1, level_5_2, level_5_3, level_5_4] },
];

export const LEVELS = [];
WORLDS.forEach((world, wi) => {
  world.index = wi;
  world.levelIds = world.levels.map((build, li) => {
    const id = `${wi + 1}-${li + 1}`;
    LEVELS.push({ id, index: LEVELS.length, world: wi, number: li + 1, build });
    return id;
  });
});

/**
 * Secret levels ("1-S" ...), one per world. Not part of the linear unlock chain: a world's
 * secret level opens once every hidden passage in that world's regular levels is found.
 */
const SECRET_BUILDS = [secret_1, secret_2, secret_3, secret_4, secret_5];
export const SECRET_LEVELS = WORLDS.map((world, wi) => {
  const entry = { id: `${wi + 1}-S`, index: -1, world: wi, number: 'S', secret: true, build: SECRET_BUILDS[wi] };
  world.secretId = entry.id;
  return entry;
});

export const isSecretId = (id) => /^\d+-S$/.test(id || '');

/** Every playable progression level id (regular + secret). */
export const ALL_LEVEL_IDS = [...LEVELS.map((l) => l.id), ...SECRET_LEVELS.map((l) => l.id)];

/** Developer-only levels reachable via ?level=<key> (not part of progression). */
export const DEV_LEVELS = { sandbox };

const cache = new Map();

/** Returns the built (and cached) level definition, with world/theme metadata applied. */
export function getLevelDef(id) {
  if (!cache.has(id)) {
    const entry = levelEntry(id) || (DEV_LEVELS[id] && { build: DEV_LEVELS[id], world: 0 });
    if (!entry) throw new Error(`Unknown level ${id}`);
    const def = entry.build();
    const world = WORLDS[entry.world];
    def.id = id;
    def.worldIndex = entry.world;
    def.worldName = world.name;
    def.theme = def.theme || world.theme;
    def.isBoss = !!def.boss;
    def.isSecret = !!entry.secret;
    cache.set(id, def);
  }
  return cache.get(id);
}

export function levelEntry(id) {
  return LEVELS.find((l) => l.id === id) || SECRET_LEVELS.find((l) => l.id === id) || null;
}

/** Number of hidden passages (connected fake-wall regions) in a level; matches Level.secrets order. */
export function secretCount(id) {
  const def = getLevelDef(id);
  if (def._secretCount !== undefined) return def._secretCount;
  const { width: W, height: H, fake } = def;
  const seen = Array.from({ length: H }, () => new Array(W).fill(false));
  let n = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!fake[y][x] || seen[y][x]) continue;
      n++;
      const stack = [[x, y]];
      seen[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && fake[ny][nx] && !seen[ny][nx]) {
            seen[ny][nx] = true;
            stack.push([nx, ny]);
          }
        }
      }
    }
  def._secretCount = n;
  return n;
}

/** Target time (ms) for the third star. Levels may override with `def.par` (seconds). */
export function parTime(id) {
  const def = getLevelDef(id);
  if (def.par) return def.par * 1000;
  const dist = Math.abs((def.exit ? def.exit.x : def.width) - def.start.x) * 32;
  let s = (dist / 250) * 2.6 + 12;
  if (def.boss) s += 55;
  return Math.ceil(s / 5) * 5 * 1000;
}

export function nextLevelId(id) {
  const e = levelEntry(id);
  if (!e || e.secret) return null;
  return LEVELS[e.index + 1] ? LEVELS[e.index + 1].id : null;
}
