import Phaser from 'phaser';
import makeThemeTextures from '../gfx/themeTextures.js';
import makeObjectTextures from '../gfx/objectTextures.js';
import makeCreatureTextures from '../gfx/creatureTextures.js';
import { makePlayerAnimations } from '../gfx/playerTextures.js';
import Audio from '../systems/Audio.js';
import Save from '../systems/SaveManager.js';
import { applyLook } from '../systems/Cosmetics.js';
import { makeFxTextures } from '../systems/Effects.js';
import { ensureUiTextures } from '../ui/widgets.js';
import { applyQualitySetting } from '../config.js';

const FRAME_W = 40;
const FRAME_H = 44;

/**
 * Generates every texture procedurally so the game has no external asset dependencies.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    applyQualitySetting(Save.settings.quality);
    applyLook(this);
    makeThemeTextures(this);
    makeObjectTextures(this);
    makeCreatureTextures(this);
    makeFxTextures(this);
    ensureUiTextures(this);
    this.makeAnimations();
    Audio.init(this.game);
    // ?level=2-3 jumps straight into a level (handy for testing); otherwise show the menu.
    const params = new URLSearchParams(window.location.search);
    const level = params.get('level');
    if (level || !this.scene.get('Menu')) this.scene.start('Game', { levelId: level || undefined });
    else this.scene.start('Menu');
  }

  canvas(key, w, h) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, w, h);
    return { tex, ctx: tex.getContext() };
  }

  makeAnimations() {
    makePlayerAnimations(this);
    const add = (key, frames, frameRate, repeat = -1) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames, frameRate, repeat });
    };
    const e = (key, ...names) => names.map((frame) => ({ key, frame }));
    add('slime-move', e('slime', 'slime0', 'slime2', 'slime0', 'slime1'), 6);
    add('bat-fly', e('bat', 'bat0', 'bat1', 'bat2', 'bat1'), 14);
    add('hunter-run', e('hunter', 'hunter0', 'hunter1'), 10);
    add('noctis-fly', e('noctis', 'noct0', 'noct1'), 6);
  }
}
