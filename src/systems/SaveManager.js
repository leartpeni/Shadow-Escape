import { LEVELS, SECRET_LEVELS, WORLDS, isSecretId, secretCount } from '../levels/registry.js';

const KEY = 'shadow-escape-save-v2';
const LEGACY_KEY = 'shadow-escape-save-v1';

export const DEFAULT_SETTINGS = {
  shake: true, // camera shake
  flashes: true, // full-screen flashes
  timer: true, // show the run timer in the HUD
  touch: 'auto', // on-screen controls: auto | on | off
  quality: 'auto', // auto | low | high
};

const blankStats = () => ({
  jumps: 0,
  doubleJumps: 0,
  wallJumps: 0,
  dashes: 0,
  deaths: 0,
  enemies: 0,
  bosses: 0,
  secrets: 0,
  clears: 0,
  deathless: 0,
  playtime: 0, // ms spent inside levels
});

const blank = () => ({
  version: 2,
  levels: {},
  crystals: 0, // spendable wallet
  crystalsEarned: 0, // lifetime total
  cosmetics: { owned: ['skin:classic', 'color:violet', 'effect:none'], skin: 'classic', color: 'violet', effect: 'none' },
  achievements: {},
  stats: blankStats(),
  daily: { date: null, done: false, streak: 0, lastDone: null, best: 0 },
  settings: { ...DEFAULT_SETTINGS },
  unlockAll: false,
});

const blankLevel = () => ({ done: false, bestTime: null, bestDeaths: null, shards: [], stars: [false, false, false], secrets: [], clears: 0 });

/**
 * Persistent progress (localStorage). Stores levels (completion, best times, crystals, stars,
 * found secrets), the crystal wallet, cosmetics, achievements, lifetime stats, the daily
 * challenge streak and game settings. Audio settings are stored by the Audio engine.
 */
class SaveManager {
  constructor() {
    this.data = this.load();
    this.listeners = new Set();
    try {
      const params = new URLSearchParams(window.location.search);
      // Debug/testing aid only: never written to the save file.
      if (params.get('unlock') === 'all') this.forceUnlock = true;
    } catch (e) {
      /* no window */
    }
  }

  load() {
    let data = blank();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = {
          ...blank(),
          ...parsed,
          cosmetics: { ...blank().cosmetics, ...(parsed.cosmetics || {}) },
          stats: { ...blankStats(), ...(parsed.stats || {}) },
          daily: { ...blank().daily, ...(parsed.daily || {}) },
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
        if (!data.levels || typeof data.levels !== 'object') data.levels = {};
        for (const id of Object.keys(data.levels)) data.levels[id] = { ...blankLevel(), ...data.levels[id] };
        if (!Array.isArray(data.cosmetics.owned)) data.cosmetics.owned = blank().cosmetics.owned;
        // Older builds persisted the ?unlock=all debug flag; it is runtime-only now.
        data.unlockAll = false;
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) data = this.migrate(JSON.parse(legacy));
      }
    } catch (e) {
      data = blank();
    }
    return data;
  }

  /** v1 -> v2: keep completion, times and crystals; award stars and crystals already earned. */
  migrate(v1) {
    const data = blank();
    for (const [id, rec] of Object.entries(v1.levels || {})) {
      const lvl = { ...blankLevel(), ...rec };
      const shards = lvl.shards || [];
      lvl.stars = [!!lvl.done, shards.length > 0 && shards.every(Boolean) && shards.length >= 3, false];
      lvl.clears = lvl.done ? 1 : 0;
      data.levels[id] = lvl;
      const got = shards.filter(Boolean).length;
      const earned = (lvl.done ? 20 : 0) + got * 10 + lvl.stars.filter(Boolean).length * 15;
      data.crystals += earned;
      data.crystalsEarned += earned;
      if (lvl.done) data.stats.clears++;
    }
    this.data = data;
    this.persist(data);
    return data;
  }

  persist(data = this.data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable (private mode) - progress is kept for this session only */
    }
    if (this.listeners) this.listeners.forEach((fn) => fn(this.data));
  }

  /** Subscribe to save changes. Returns an unsubscribe function. */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // --------------------------------------------------------------- levels
  get(id) {
    return this.data.levels[id] || null;
  }

  level(id) {
    if (!this.data.levels[id]) this.data.levels[id] = blankLevel();
    return this.data.levels[id];
  }

  isCompleted(id) {
    return !!(this.data.levels[id] && this.data.levels[id].done);
  }

  isUnlocked(id) {
    if (this.data.unlockAll || this.forceUnlock) return true;
    if (isSecretId(id)) return this.isSecretUnlocked(Number(id.split('-')[0]) - 1);
    const idx = LEVELS.findIndex((l) => l.id === id);
    if (idx <= 0) return idx === 0;
    return this.isCompleted(LEVELS[idx - 1].id);
  }

  isWorldUnlocked(wi) {
    return this.isUnlocked(WORLDS[wi].levelIds[0]);
  }

  /** Hidden passages found in a world's regular levels: { found, total }. */
  worldSecrets(wi) {
    let found = 0;
    let total = 0;
    for (const id of WORLDS[wi].levelIds) {
      const n = secretCount(id);
      total += n;
      found += Math.min(n, this.secretsFound(id).length);
    }
    return { found, total };
  }

  isSecretUnlocked(wi) {
    if (this.data.unlockAll || this.forceUnlock) return true;
    const s = this.worldSecrets(wi);
    return s.total > 0 && s.found >= s.total;
  }

  shards(id) {
    return (this.data.levels[id] && this.data.levels[id].shards) || [];
  }

  stars(id) {
    return (this.data.levels[id] && this.data.levels[id].stars) || [false, false, false];
  }

  starCount(id) {
    return this.stars(id).filter(Boolean).length;
  }

  secretsFound(id) {
    return (this.data.levels[id] && this.data.levels[id].secrets) || [];
  }

  /** Records a found hidden passage immediately. Returns true if it is new. */
  addSecret(id, index) {
    const lvl = this.level(id);
    if (lvl.secrets.includes(index)) return false;
    lvl.secrets.push(index);
    this.data.stats.secrets++;
    this.persist();
    return true;
  }

  /**
   * stats: { time (ms), deaths, shards: boolean[], stars: boolean[] }
   * Returns { record, newStars: number[], newShards, firstClear, newBest }.
   */
  completeLevel(id, stats) {
    const prev = this.level(id);
    const prevShards = prev.shards || [];
    const shards = (stats.shards || []).map((s, i) => !!s || !!prevShards[i]);
    const newShards = (stats.shards || []).filter((s, i) => s && !prevShards[i]).length;
    const stars = [0, 1, 2].map((i) => !!(stats.stars && stats.stars[i]) || !!prev.stars[i]);
    const newStars = [0, 1, 2].filter((i) => stars[i] && !prev.stars[i]);
    const firstClear = !prev.done;
    const newBest = prev.bestTime == null || stats.time < prev.bestTime;
    this.data.levels[id] = {
      ...prev,
      done: true,
      bestTime: prev.bestTime == null ? stats.time : Math.min(prev.bestTime, stats.time),
      bestDeaths: prev.bestDeaths == null ? stats.deaths : Math.min(prev.bestDeaths, stats.deaths),
      shards,
      stars,
      clears: (prev.clears || 0) + 1,
    };
    this.data.stats.clears++;
    if (stats.deaths === 0) this.data.stats.deathless++;
    this.persist();
    return { record: this.data.levels[id], newStars, newShards, firstClear, newBest };
  }

  totalShards() {
    let got = 0;
    for (const id of Object.keys(this.data.levels)) got += this.shards(id).filter(Boolean).length;
    return got;
  }

  totalStars() {
    let n = 0;
    for (const id of Object.keys(this.data.levels)) n += this.starCount(id);
    return n;
  }

  completedCount({ secret = false } = {}) {
    const list = secret ? SECRET_LEVELS : LEVELS;
    return list.filter((l) => this.isCompleted(l.id)).length;
  }

  /** Id of the first unlocked-but-not-completed level (for a "Continue" button). */
  continueId() {
    const next = LEVELS.find((l) => !this.isCompleted(l.id) && this.isUnlocked(l.id));
    return next ? next.id : LEVELS[LEVELS.length - 1].id;
  }

  // ------------------------------------------------------------- crystals
  get crystals() {
    return this.data.crystals;
  }

  addCrystals(n, persist = true) {
    if (n <= 0) return;
    this.data.crystals += n;
    this.data.crystalsEarned += n;
    if (persist) this.persist();
  }

  spendCrystals(n) {
    if (this.data.crystals < n) return false;
    this.data.crystals -= n;
    this.persist();
    return true;
  }

  // ------------------------------------------------------------ cosmetics
  owns(kind, id) {
    return this.data.cosmetics.owned.includes(`${kind}:${id}`);
  }

  grant(kind, id, persist = true) {
    if (this.owns(kind, id)) return false;
    this.data.cosmetics.owned.push(`${kind}:${id}`);
    if (persist) this.persist();
    return true;
  }

  equip(kind, id) {
    this.data.cosmetics[kind] = id;
    this.persist();
  }

  equipped(kind) {
    return this.data.cosmetics[kind];
  }

  // --------------------------------------------------------- achievements
  hasAchievement(id) {
    return !!this.data.achievements[id];
  }

  unlockAchievement(id) {
    if (this.data.achievements[id]) return false;
    this.data.achievements[id] = Date.now();
    return true;
  }

  // --------------------------------------------------------------- stats
  get stats() {
    return this.data.stats;
  }

  bumpStat(name, n = 1) {
    this.data.stats[name] = (this.data.stats[name] || 0) + n;
  }

  // ------------------------------------------------------------ settings
  get settings() {
    return this.data.settings;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.persist();
  }

  // ---------------------------------------------------------------- misc
  get daily() {
    return this.data.daily;
  }

  /** Wipes progress but keeps settings. */
  reset() {
    const settings = this.data.settings;
    this.data = blank();
    this.data.settings = settings;
    this.persist();
  }
}

const Save = new SaveManager();
export default Save;
