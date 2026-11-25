import Enemy from './Enemy.js';

/**
 * Shadow Slime – patrols back and forth, turning at walls and ledges.
 * opts: speed (px/s, default 60), hop (true = bounces along), dir (-1/1)
 */
export default class Slime extends Enemy {
  constructor(scene, ctx, def) {
    super(scene, ctx, def, { texture: 'slime', frame: 'slime0', w: 32, h: 22, tint: 0xa98bff });
    this.speed = def.speed ?? 60;
    this.hop = !!def.hop;
    this.sprite.play('slime-move');
  }

  reset() {
    super.reset();
    this.hopTimer = 0.8 + Math.random() * 0.6;
  }

  think(dt) {
    const landed = this.applyGravity(dt);
    if (landed) this.sprite.setScale(1.2, 0.8);
    this.sprite.scaleX += (1 - this.sprite.scaleX) * Math.min(1, dt * 10);
    this.sprite.scaleY += (1 - this.sprite.scaleY) * Math.min(1, dt * 10);

    if (this.onGround) {
      if (this.edgeAhead(this.dir) || this.wallAhead(this.dir)) this.dir *= -1;
      if (this.hop) {
        this.hopTimer -= dt;
        if (this.hopTimer <= 0) {
          this.hopTimer = 1.3 + Math.random() * 0.5;
          this.vy = -460;
          this.onGround = false;
          this.sprite.setScale(0.8, 1.25);
        }
      }
    }
    // While airborne (hopping) keep momentum but avoid overshooting walls.
    if (!this.moveX(this.dir * this.speed * dt)) this.dir *= -1;
    this.sprite.setFlipX(this.dir > 0);
  }
}
