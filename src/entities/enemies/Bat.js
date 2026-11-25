import Phaser from 'phaser';
import Enemy from './Enemy.js';

/**
 * Night Bat – hangs from the ceiling until the player comes close, then swoops
 * after them with a wobbling flight. Returns to its perch when the player escapes.
 * opts: wake (px, default 220), speed (default 135), patrol (tiles; flies a horizontal loop instead of hanging)
 */
export default class Bat extends Enemy {
  constructor(scene, ctx, def) {
    super(scene, ctx, def, { texture: 'bat', frame: 'batHang', w: 26, h: 20, tint: 0xff7fbf, ground: false });
    this.wake = def.wake ?? 220;
    this.speed = def.speed ?? 135;
    this.patrol = def.patrol || 0;
  }

  reset() {
    super.reset();
    this.state = this.patrol ? 'patrol' : 'hang';
    this.t = Math.random() * 6;
    if (this.state === 'hang') {
      this.y = this.home.y - 4;
      this.sprite.stop();
      this.sprite.setFrame('batHang');
    } else {
      this.sprite.play('bat-fly');
    }
  }

  flyTo(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    // Slide along walls instead of passing through them.
    if (!this.solid(nx + Math.sign(dx) * this.w * 0.5, this.y)) this.x = nx;
    if (!this.solid(this.x, ny + Math.sign(dy) * this.h * 0.5)) this.y = ny;
    if (Math.abs(dx) > 4) this.sprite.setFlipX(dx < 0);
    return d;
  }

  think(dt, player) {
    this.t += dt;
    const p = player && !player.dead ? player.body.center : null;
    const distP = p ? Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) : Infinity;

    switch (this.state) {
      case 'hang':
        if (distP < this.wake) {
          this.state = 'chase';
          this.sprite.play('bat-fly');
          this.y += 6;
        }
        break;
      case 'patrol': {
        const span = this.patrol * 32;
        const tx = this.home.x + Math.sin(this.t * 0.9) * span * 0.5 + span * 0.5;
        const ty = this.home.y + Math.sin(this.t * 2.2) * 18;
        this.flyTo(tx, ty, this.speed * 1.2, dt);
        if (distP < this.wake) this.state = 'chase';
        break;
      }
      case 'chase':
        if (distP > this.wake * 2.2) {
          this.state = 'return';
          break;
        }
        this.flyTo(p.x + Math.sin(this.t * 3) * 24, p.y - 6 + Math.cos(this.t * 4.3) * 26, this.speed, dt);
        break;
      case 'return': {
        if (distP < this.wake) {
          this.state = 'chase';
          break;
        }
        const d = this.flyTo(this.home.x, this.home.y - (this.patrol ? 0 : 4), this.speed, dt);
        if (d < 3) this.reset();
        break;
      }
      default:
    }
  }
}
