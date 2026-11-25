import Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#07060d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, roundPixels: true },
  input: { activePointers: 4 },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: PLAYER.GRAVITY },
      tileBias: 32,
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
});

// Exposed for debugging / automated testing.
window.__SHADOW_ESCAPE__ = game;
