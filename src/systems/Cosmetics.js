import Phaser from 'phaser';
import { COLORS } from '../config.js';
import makePlayerTextures from '../gfx/playerTextures.js';
import { TRAIL_COLORS } from './Effects.js';
import Save from './SaveManager.js';

/**
 * Character customisation: skins (accessories), colours (palettes) and trail effects.
 * Each item is either free, bought with crystals (`price`) or unlocked by a requirement
 * (`req`: { achievement } | { stars } | { secrets }).
 */
export const SKINS = [
  { id: 'classic', name: 'Hooded Shade', desc: 'The shadow, as it first awoke.', price: 0 },
  { id: 'horns', name: 'Horned Wraith', desc: 'Bone horns pried from the Forest\'s old king.', price: 150 },
  { id: 'scarf', name: 'Crimson Wanderer', desc: 'A scarf that remembers the wind.', price: 220 },
  { id: 'mask', name: 'Bone Mask', desc: 'Worn by the wardens of the Ruins.', price: 320 },
  { id: 'crown', name: 'Shadow Monarch', desc: 'Defeat Count Noctis to claim his crown.', req: { achievement: 'boss3' } },
  { id: 'halo', name: 'Fallen Light', desc: 'Earn 45 stars to rekindle the halo.', req: { stars: 45 } },
];

export const PALETTES = [
  { id: 'violet', name: 'Violet Dusk', price: 0, palette: {} },
  { id: 'ember', name: 'Ember', price: 100, palette: { rim: 0xff7a3c, front: 0xffd27a, eye: 0xfff0c8, eyeGlow: 0xffb060, core: 0xff6a2a, cloak: 0x2a140e, wisp: 0x6e2a14 } },
  { id: 'verdant', name: 'Verdant', price: 100, palette: { rim: 0x52d68a, front: 0xc8ff8a, eye: 0xeaffe0, eyeGlow: 0x9cff9c, core: 0x3cc87a, cloak: 0x0f2018, wisp: 0x1f5a38 } },
  { id: 'frost', name: 'Frostbound', price: 160, palette: { rim: 0x6cc8ff, front: 0xe0f8ff, eye: 0xffffff, eyeGlow: 0xa8e8ff, core: 0x7ad8ff, cloak: 0x101c2e, wisp: 0x2a5078 } },
  { id: 'blood', name: 'Bloodmoon', price: 220, palette: { rim: 0xe0304a, front: 0xff8a8a, eye: 0xffd0d0, eyeGlow: 0xff4060, core: 0xd0203a, cloak: 0x200a10, wisp: 0x5a1424 } },
  { id: 'voidpink', name: 'Void Bloom', price: 260, palette: { rim: 0xff5ad2, front: 0x8a7cff, eye: 0xffe0fa, eyeGlow: 0xff8ae8, core: 0xff4ac8, cloak: 0x1c0c24, wisp: 0x5a1e6a } },
  { id: 'gold', name: 'Gilded', desc: 'Collect 45 light crystals.', req: { achievement: 'collector' }, palette: { rim: 0xffc94a, front: 0xfff2b0, eye: 0xfffbe8, eyeGlow: 0xffe08a, core: 0xffb830, cloak: 0x241a0c, wisp: 0x6a4a18 } },
  { id: 'ghost', name: 'Pale Ghost', desc: 'Find every hidden passage.', req: { achievement: 'allSecrets' }, palette: { rim: 0xd8e0f0, front: 0xffffff, eye: 0x9ff0ff, eyeGlow: 0x9ff0ff, core: 0xe8f0ff, cloak: 0x2a2e3a, wisp: 0x6a7080 } },
];

const ADD = Phaser.BlendModes.ADD;

export const EFFECTS = [
  { id: 'none', name: 'No Trail', price: 0, swatch: [0x3a3150] },
  {
    id: 'embers', name: 'Embers', price: 150, swatch: [0xff6a2a, 0xffb347],
    cfg: { texture: 'dot', tint: [0xff6a2a, 0xffb347, 0xffe08a], gravityY: -90, speed: { min: 5, max: 35 }, lifespan: { min: 450, max: 850 }, scale: { start: 0.7, end: 0 } },
  },
  {
    id: 'frost', name: 'Frost Motes', price: 200, swatch: [0xbff6ff, 0x7ad8ff],
    cfg: { texture: 'fx-sparkle', tint: [0xbff6ff, 0xffffff, 0x7ad8ff], gravityY: 50, speed: { min: 5, max: 25 }, lifespan: { min: 500, max: 900 }, scale: { start: 0.55, end: 0 }, rotate: { min: 0, max: 180 } },
  },
  {
    id: 'rifts', name: 'Void Rifts', price: 300, swatch: [0xb04aff, 0xff5ad2],
    cfg: { texture: 'dot', tint: [0xb04aff, 0x6a2ad0, 0xff5ad2], gravityY: 0, speed: { min: 0, max: 12 }, lifespan: { min: 600, max: 1000 }, scale: { start: 1.3, end: 0 } },
  },
  {
    id: 'glitter', name: 'Gold Glitter', desc: 'Complete a 3-day daily streak.', req: { achievement: 'streak3' }, swatch: [0xffe08a, 0xffb830],
    cfg: { texture: 'fx-sparkle', tint: [0xffe08a, 0xfff6d0, 0xffb830], gravityY: 80, speed: { min: 10, max: 40 }, lifespan: { min: 400, max: 800 }, scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 180 } },
  },
  {
    id: 'prism', name: 'Prismatic', desc: 'Complete all five secret levels.', req: { achievement: 'secretMaster' }, swatch: [0xff5a7a, 0x7ad8ff],
    cfg: { texture: 'fx-sparkle', tint: [0xff5a7a, 0xffb347, 0xfff07a, 0x7aff9a, 0x7ad8ff, 0xb48cff], gravityY: -20, speed: { min: 10, max: 45 }, lifespan: { min: 500, max: 900 }, scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 360 } },
  },
];

export const CATALOG = { skin: SKINS, color: PALETTES, effect: EFFECTS };

export function findItem(kind, id) {
  return CATALOG[kind].find((i) => i.id === id) || CATALOG[kind][0];
}

/** True when the requirement of a locked item is met. */
export function reqMet(req) {
  if (!req) return false;
  if (req.achievement) return Save.hasAchievement(req.achievement);
  if (req.stars) return Save.totalStars() >= req.stars;
  return false;
}

export function isOwned(kind, item) {
  return (item.price === 0 && !item.req) || Save.owns(kind, item.id) || reqMet(item.req);
}

/** Text explaining how to get an item. */
export function unlockText(item) {
  if (item.req) return item.desc || 'Locked';
  return `${item.price} crystals`;
}

/** Attempts to buy an item. Returns 'ok' | 'owned' | 'poor' | 'locked'. */
export function buy(kind, item) {
  if (isOwned(kind, item)) return 'owned';
  if (item.req) return 'locked';
  if (!Save.spendCrystals(item.price)) return 'poor';
  Save.grant(kind, item.id);
  return 'ok';
}

export function currentLook() {
  const skin = findItem('skin', Save.equipped('skin'));
  const color = findItem('color', Save.equipped('color'));
  return { skin: skin.id, palette: color.palette, colorId: color.id };
}

let appliedSig = null;

/** Repaints the hero sheet and recolours the player's effect palette with the equipped look. */
export function applyLook(scene, force = false) {
  const look = currentLook();
  const sig = `${look.skin}/${look.colorId}`;
  if (force || sig !== appliedSig || !scene.textures.exists('shadow')) makePlayerTextures(scene, look);
  appliedSig = sig;
  const p = look.palette;
  const rim = p.rim ?? 0x8c6cf0;
  const front = p.front ?? 0x5fd3ff;
  COLORS.rim = rim;
  COLORS.death = rim;
  const mix = (a, b, k) => {
    const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };
  TRAIL_COLORS.splice(0, TRAIL_COLORS.length, rim, mix(rim, 0xffffff, 0.15), mix(rim, front, 0.5), front);
  return look;
}

/** Renders a single-frame preview texture for a skin/colour combination. Returns the key. */
export function previewTexture(scene, skinId, colorId, frame = 'idle0') {
  const key = `hero-prev-${skinId}-${colorId}-${frame}`;
  if (!scene.textures.exists(key)) makePlayerTextures(scene, { skin: skinId, palette: findItem('color', colorId).palette }, key, [frame]);
  return key;
}

/** Creates the equipped trail emitter following `target`, or null. */
export function createTrail(scene, target, effectId = Save.equipped('effect'), depth = 9) {
  const fx = findItem('effect', effectId);
  if (!fx.cfg) return null;
  const { texture, ...cfg } = fx.cfg;
  if (!scene.textures.exists(texture)) return null;
  const em = scene.add.particles(0, 0, texture, {
    ...cfg,
    angle: { min: 0, max: 360 },
    alpha: { start: 0.9, end: 0 },
    frequency: 45,
    quantity: 1,
    blendMode: ADD,
    follow: target,
    followOffset: { x: 0, y: -16 },
  });
  em.setDepth(depth);
  return em;
}
