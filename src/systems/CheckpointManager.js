import Phaser from 'phaser';

/**
 * Tracks the active respawn point and activates checkpoints on contact.
 */
export default class CheckpointManager {
  constructor(scene, level, effects) {
    this.scene = scene;
    this.level = level;
    this.fx = effects;
    this.current = level.spawnPoint();
    this.activeIndex = -1;
  }

  update(playerBounds) {
    for (const cp of this.level.checkpoints) {
      if (cp.active || !Phaser.Geom.Rectangle.Overlaps(cp.rect, playerBounds)) continue;
      // Only move forward: never reactivate an earlier checkpoint.
      if (cp.index < this.activeIndex) continue;
      this.activate(cp);
    }
  }

  activate(cp) {
    for (const other of this.level.checkpoints) {
      if (other.index < cp.index) other.active = true;
    }
    cp.active = true;
    this.activeIndex = cp.index;
    this.current = { x: cp.x, bottom: cp.bottom };
    cp.sprite.setTexture('cp_on');
    this.scene.tweens.add({ targets: cp.glow, alpha: 0.6, duration: 300 });
    this.scene.tweens.add({ targets: cp.sprite, scaleY: 1.15, duration: 90, yoyo: true });
    this.fx.checkpoint(cp.x, cp.bottom - 43);
    this.scene.events.emit('checkpoint', cp.index);
  }
}
