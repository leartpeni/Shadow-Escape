export const TILE = 32;
export const GAME_W = 960;
export const GAME_H = 540;

// All movement tuning in one place (pixels / seconds).
export const PLAYER = {
  BODY_W: 18,
  BODY_H: 30,

  MAX_RUN: 250,
  RUN_ACCEL: 3000,
  RUN_DECEL: 3200,
  TURN_ACCEL: 5200,
  AIR_ACCEL: 2000,
  AIR_DECEL: 900,

  GRAVITY: 1800,
  FALL_GRAVITY_MULT: 1.55,
  APEX_GRAVITY_MULT: 0.5,
  APEX_THRESHOLD: 70,
  MAX_FALL: 820,
  FAST_FALL: 1000,

  JUMP_VELOCITY: 660,
  DOUBLE_JUMP_VELOCITY: 580,
  JUMP_CUT: 0.45,
  COYOTE_TIME: 0.1,
  JUMP_BUFFER: 0.12,
  JUMP_GROUND_LOCK: 0.08,

  WALL_SLIDE_SPEED: 130,
  WALL_JUMP_X: 300,
  WALL_JUMP_Y: 600,
  WALL_JUMP_LOCK: 0.16,
  WALL_COYOTE: 0.1,

  DASH_SPEED: 720,
  DASH_TIME: 0.14,
  DASH_COOLDOWN: 0.25,
  DASH_END_KEEP_X: 0.55,
  DASH_END_KEEP_Y: 0.45,

  RESPAWN_DELAY: 750,
};

export const COLORS = {
  bgTop: '#0b0916',
  bgBottom: '#2a1d45',
  rim: 0x8c6cf0,
  eye: 0xbff6ff,
  dust: 0x6f5a9e,
  spark: 0x9ff0ff,
  death: 0x8c6cf0,
  gold: 0xffe6a3,
};

export const DEPTH = {
  SKY: -30,
  SKY_FX: -25,
  FAR: -20,
  MID: -15,
  FOG_BACK: -12,
  NEAR: -10,
  CEIL: -8,
  FOG_MID: -7,
  LABELS: -5,
  DECOR_BACK: -1,
  TILES: 0,
  DECOR: 0.5,
  HAZARDS: 1,
  PLATFORMS: 2,
  PROPS: 3,
  PLAYER_GLOW: 9,
  PLAYER: 10,
  FX: 11,
  FOG_FRONT: 12,
  GRADE: 38,
  LIGHT: 39,
  VIGNETTE: 40,
};

/**
 * Visual quality. LOW on touch/coarse-pointer devices (phones/tablets) or with ?fx=low;
 * force HIGH with ?fx=high. Use QUALITY.low to scale particle counts, skip extra layers etc.
 */
const fxParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('fx') : null;
const coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
export const QUALITY = {
  low: fxParam === 'low' || (fxParam !== 'high' && coarse),
  /** Multiply particle counts by this. */
  get particles() {
    return this.low ? 0.5 : 1;
  },
};

/** Applies the saved 'quality' setting ('auto' | 'low' | 'high') unless ?fx= overrides it. */
export function applyQualitySetting(q) {
  if (fxParam === 'low' || fxParam === 'high') return;
  QUALITY.low = q === 'low' ? true : q === 'high' ? false : coarse;
}
