import { LEVELS, SECRET_LEVELS, WORLDS, parTime, levelEntry } from '../levels/registry.js';
import Save from './SaveManager.js';

/**
 * Progression rules: three-star ratings, crystal rewards, achievements and daily challenges.
 *
 * Stars:  1) clear the level  2) collect all of its crystals in one run  3) finish under par time.
 * Crystals (currency): every crystal picked up is added to the wallet (10 the first time, 2 on
 * repeats), plus bonuses for first clears, new stars, achievements and daily challenges.
 */

export const REWARD = { newShard: 10, oldShard: 2, firstClear: 20, star: 15, dailyBase: 100, dailyStreak: 20 };

export const STAR_LABELS = ['Escape the level', 'Collect every crystal', 'Beat the par time'];

const bossDone = (wi) => () => Save.isCompleted(WORLDS[wi].levelIds[3]);
const mainShards = () => LEVELS.reduce((n, l) => n + Save.shards(l.id).filter(Boolean).length, 0);
const allSecretsFound = () => WORLDS.every((w, wi) => {
  const s = Save.worldSecrets(wi);
  return s.found >= s.total;
});

/** id, name, desc, reward (crystals), icon, test(). Optional progress() -> [cur, max]. */
export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Light', desc: 'Escape your first level.', reward: 25, icon: 'star', test: () => Save.stats.clears >= 1 },
  { id: 'boss1', name: 'Kingslayer', desc: 'Defeat Mossback, the Slime King.', reward: 50, icon: 'skull', test: bossDone(0) },
  { id: 'boss2', name: 'Stonebreaker', desc: 'Defeat the Stone Warden.', reward: 75, icon: 'skull', test: bossDone(1) },
  { id: 'boss3', name: 'Night\'s End', desc: 'Defeat Count Noctis. Unlocks the Monarch crown.', reward: 100, icon: 'skull', test: bossDone(2) },
  { id: 'boss4', name: 'Shattered Prism', desc: 'Defeat the Prism Colossus.', reward: 125, icon: 'skull', test: bossDone(3) },
  { id: 'boss5', name: 'Heart of the Void', desc: 'Defeat Umbra and escape the Void.', reward: 200, icon: 'skull', test: bossDone(4) },
  { id: 'escaped', name: 'Shadow Escaped', desc: 'Complete all 20 levels.', reward: 250, icon: 'crown', test: () => LEVELS.every((l) => Save.isCompleted(l.id)), progress: () => [Save.completedCount(), LEVELS.length] },
  { id: 'crystal1', name: 'Glimmer', desc: 'Collect 10 crystals in levels.', reward: 25, icon: 'crystal', test: () => mainShards() >= 10, progress: () => [mainShards(), 10] },
  { id: 'collector', name: 'Crystal Hoarder', desc: 'Collect 45 crystals in levels. Unlocks Gilded colour.', reward: 100, icon: 'crystal', test: () => mainShards() >= 45, progress: () => [mainShards(), 45] },
  { id: 'allShards', name: 'Every Last Light', desc: 'Collect all 60 crystals in the five worlds.', reward: 250, icon: 'crystal', test: () => mainShards() >= LEVELS.length * 3, progress: () => [mainShards(), LEVELS.length * 3] },
  { id: 'secret1', name: 'Something Hidden', desc: 'Discover a hidden passage.', reward: 25, icon: 'eye', test: () => Save.stats.secrets >= 1 },
  { id: 'allSecrets', name: 'Nothing Stays Hidden', desc: 'Find every hidden passage. Unlocks Pale Ghost colour.', reward: 200, icon: 'eye', test: allSecretsFound },
  { id: 'secretLevel', name: 'Off the Map', desc: 'Complete a secret level.', reward: 75, icon: 'eye', test: () => Save.completedCount({ secret: true }) >= 1 },
  { id: 'secretMaster', name: 'Keeper of Secrets', desc: 'Complete all five secret levels. Unlocks Prismatic trail.', reward: 300, icon: 'eye', test: () => Save.completedCount({ secret: true }) >= SECRET_LEVELS.length, progress: () => [Save.completedCount({ secret: true }), SECRET_LEVELS.length] },
  { id: 'stars3', name: 'Flawless Form', desc: 'Earn three stars on a level.', reward: 50, icon: 'star', test: () => [...LEVELS, ...SECRET_LEVELS].some((l) => Save.starCount(l.id) === 3) },
  { id: 'stars30', name: 'Rising Star', desc: 'Earn 30 stars.', reward: 100, icon: 'star', test: () => Save.totalStars() >= 30, progress: () => [Save.totalStars(), 30] },
  { id: 'stars60', name: 'Constellation', desc: 'Earn 60 stars.', reward: 300, icon: 'star', test: () => Save.totalStars() >= 60, progress: () => [Save.totalStars(), 60] },
  { id: 'deathless', name: 'Untouchable', desc: 'Complete a level without dying.', reward: 50, icon: 'heart', test: () => Save.stats.deathless >= 1 },
  { id: 'deathless10', name: 'Ghost Runner', desc: 'Complete 10 levels without dying.', reward: 150, icon: 'heart', test: () => Save.stats.deathless >= 10, progress: () => [Save.stats.deathless, 10] },
  { id: 'slayer', name: 'Hunter of Light', desc: 'Defeat 75 enemies.', reward: 100, icon: 'sword', test: () => Save.stats.enemies >= 75, progress: () => [Save.stats.enemies, 75] },
  { id: 'dasher', name: 'Blink of Shadow', desc: 'Dash 500 times.', reward: 50, icon: 'dash', test: () => Save.stats.dashes >= 500, progress: () => [Save.stats.dashes, 500] },
  { id: 'jumper', name: 'Featherweight', desc: 'Jump 2000 times.', reward: 50, icon: 'wing', test: () => Save.stats.jumps + Save.stats.doubleJumps + Save.stats.wallJumps >= 2000, progress: () => [Save.stats.jumps + Save.stats.doubleJumps + Save.stats.wallJumps, 2000] },
  { id: 'persist', name: 'Persistence', desc: 'Fall 100 times and keep going.', reward: 25, icon: 'heart', test: () => Save.stats.deaths >= 100, progress: () => [Save.stats.deaths, 100] },
  { id: 'daily1', name: 'Daily Devotion', desc: 'Complete a daily challenge.', reward: 50, icon: 'sun', test: () => (Save.daily.best || 0) >= 1 },
  { id: 'streak3', name: 'Ritual of Three', desc: 'Reach a 3-day daily streak. Unlocks Gold Glitter trail.', reward: 100, icon: 'sun', test: () => (Save.daily.best || 0) >= 3, progress: () => [Save.daily.best || 0, 3] },
  { id: 'wealth', name: 'Treasure of Shadows', desc: 'Earn 1500 crystals in total.', reward: 100, icon: 'crystal', test: () => Save.data.crystalsEarned >= 1500, progress: () => [Save.data.crystalsEarned, 1500] },
  { id: 'fashion', name: 'A New Shade', desc: 'Buy something in the Wardrobe.', reward: 25, icon: 'crown', test: () => Save.data.cosmetics.owned.length > 3 },
];

/**
 * Unlocks every achievement whose condition is met, pays the rewards and persists.
 * Returns the newly unlocked achievement objects.
 */
export function checkAchievements() {
  const unlocked = [];
  // Rewards can unlock further achievements (wealth), so loop until stable.
  for (let pass = 0; pass < 3; pass++) {
    let any = false;
    for (const a of ACHIEVEMENTS) {
      if (Save.hasAchievement(a.id)) continue;
      let ok = false;
      try {
        ok = a.test();
      } catch (e) {
        ok = false;
      }
      if (ok && Save.unlockAchievement(a.id)) {
        Save.addCrystals(a.reward, false);
        unlocked.push(a);
        any = true;
      }
    }
    if (!any) break;
  }
  if (unlocked.length) Save.persist();
  return unlocked;
}

// ------------------------------------------------------------------ stars
export function runStars(id, { time, shards }) {
  const total = shards.length;
  return [true, total === 0 || shards.every(Boolean), time <= parTime(id)];
}

// ------------------------------------------------------------------ daily
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const DAILY_GOALS = {
  deathless: { name: 'Untouched', text: 'Escape without dying' },
  allShards: { name: 'Lightkeeper', text: 'Collect all 3 crystals in one run' },
  par: { name: 'Swift Shadow', text: 'Escape under the par time' },
  careful: { name: 'Steady Hand', text: 'Escape with at most 2 deaths and 2+ crystals' },
};

/** Today's challenge { date, levelId, goal, done, streak, reward }. Generated once per day. */
export function getDaily() {
  const d = Save.daily;
  const today = dateKey();
  if (d.date !== today || !d.levelId || !levelEntry(d.levelId)) {
    const unlocked = LEVELS.filter((l) => Save.isUnlocked(l.id));
    const pool = unlocked.length ? unlocked : [LEVELS[0]];
    const h = hash(`shadow-${today}`);
    const level = pool[h % pool.length];
    const goals = Object.keys(DAILY_GOALS);
    d.date = today;
    d.levelId = level.id;
    d.goal = goals[(h >>> 8) % goals.length];
    d.done = false;
    Save.persist();
  }
  // A streak is broken if the last completed daily was before yesterday.
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const streakAlive = d.lastDone === today || d.lastDone === dateKey(y);
  const streak = streakAlive ? d.streak : 0;
  return { ...d, streak, reward: dailyReward(streak + (d.done ? 0 : 1)), goalInfo: DAILY_GOALS[d.goal] };
}

export function dailyReward(streak) {
  return REWARD.dailyBase + REWARD.dailyStreak * Math.min(Math.max(streak - 1, 0), 5);
}

function dailyMet(goal, run) {
  const got = run.shards.filter(Boolean).length;
  if (goal === 'deathless') return run.deaths === 0;
  if (goal === 'allShards') return run.shards.length > 0 && got === run.shards.length;
  if (goal === 'par') return run.time <= run.par;
  if (goal === 'careful') return run.deaths <= 2 && got >= 2;
  return false;
}

/** Marks today's daily as done if the run qualifies. Returns { reward, streak } or null. */
function completeDaily(id, run) {
  const daily = getDaily();
  if (daily.done || daily.levelId !== id || !dailyMet(daily.goal, run)) return null;
  const d = Save.daily;
  const streak = daily.streak + 1;
  const reward = dailyReward(streak);
  d.done = true;
  d.streak = streak;
  d.best = Math.max(d.best || 0, streak);
  d.lastDone = dateKey();
  Save.addCrystals(reward, false);
  return { reward, streak, goal: daily.goalInfo };
}

// ---------------------------------------------------------- level finish
/**
 * Applies a finished run: records it, awards stars/crystals, daily and achievements.
 * run: { time, deaths, shards: boolean[] }. Returns a summary for the victory screen.
 */
export function finishLevel(id, run) {
  const par = parTime(id);
  const prevShards = Save.shards(id);
  const stars = runStars(id, run);
  const prevBest = Save.get(id)?.bestTime ?? null;
  const res = Save.completeLevel(id, { ...run, stars });

  const earned = [];
  const got = run.shards.filter(Boolean).length;
  const newShards = run.shards.filter((s, i) => s && !prevShards[i]).length;
  const oldShards = got - newShards;
  if (newShards) earned.push({ label: `New crystals x${newShards}`, amount: newShards * REWARD.newShard });
  if (oldShards) earned.push({ label: `Crystals x${oldShards}`, amount: oldShards * REWARD.oldShard });
  if (res.firstClear) earned.push({ label: 'First escape', amount: REWARD.firstClear });
  if (res.newStars.length) earned.push({ label: `New stars x${res.newStars.length}`, amount: res.newStars.length * REWARD.star });
  const base = earned.reduce((n, e) => n + e.amount, 0);
  Save.addCrystals(base, false);

  const daily = completeDaily(id, { ...run, par });
  if (daily) earned.push({ label: `Daily challenge (streak ${daily.streak})`, amount: daily.reward });
  Save.persist();
  const achievements = checkAchievements();
  for (const a of achievements) earned.push({ label: `Achievement: ${a.name}`, amount: a.reward });

  return {
    id,
    time: run.time,
    deaths: run.deaths,
    shards: run.shards.slice(),
    par,
    stars,
    bestStars: res.record.stars.slice(),
    newStars: res.newStars,
    firstClear: res.firstClear,
    bestTime: res.record.bestTime,
    newBest: prevBest == null || run.time < prevBest,
    prevBest,
    earned,
    total: earned.reduce((n, e) => n + e.amount, 0),
    wallet: Save.crystals,
    achievements,
    daily,
  };
}
