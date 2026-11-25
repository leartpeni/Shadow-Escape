import { WORLDS } from '../levels/registry.js';
import { THEMES } from '../levels/themes.js';

/** Shared visual identity for every menu / HUD screen. */
export const FONT = 'Trebuchet MS, sans-serif';

export const C = {
  bg: 0x07060d,
  ink: 0x0e0a1a,
  panel: 0x161029,
  panelHi: 0x251b44,
  button: 0x1d1533,
  buttonHi: 0x33265a,
  border: 0x8c6cf0,
  violet: 0xcbb8ff,
  cyan: 0x9ff0ff,
  gold: 0xffe6a3,
  goldDeep: 0xffb347,
  red: 0xff5a7a,
  green: 0x8cffb0,
  text: 0xe8deff,
  dim: 0xa99bd0,
  faint: 0x6f6590,
};

export const hex = (n) => `#${(n >>> 0).toString(16).padStart(6, '0')}`;

export const CONFIRM_KEYS = ['Space', 'Enter', 'NumpadEnter', 'KeyZ', 'KeyK', 'KeyC'];
export const BACK_KEYS = ['Escape', 'Backspace', 'KeyX'];

export const DIRS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export const formatTime = (ms) => {
  if (ms == null) return '--:--';
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(2).padStart(5, '0')}`;
};

export const formatDuration = (ms) => {
  const m = Math.floor((ms || 0) / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
};

export const themeOfWorld = (wi) => (WORLDS[wi] && WORLDS[wi].theme) || 'forest';
export const accentOf = (theme) => (THEMES[theme] && THEMES[theme].accent) || C.cyan;
export const accentOfWorld = (wi) => accentOf(themeOfWorld(wi));
export const motesOf = (theme) => (THEMES[theme] && THEMES[theme].motes) || [C.cyan, C.violet];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export const textStyle = (size = 18, color = C.text, bold = true, extra = {}) => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color: typeof color === 'number' ? hex(color) : color,
  fontStyle: bold ? 'bold' : 'normal',
  ...extra,
});
