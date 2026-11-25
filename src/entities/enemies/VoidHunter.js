import Enemy from './Enemy.js';

/**
 * Void Hunter – prowls slowly; when the player is level with it and in range it
 * winds up (flashes) and charges at high speed, stopping at walls and ledges.
 * opts: range (tiles, default 9), speed (charge px/s, default 420), prowl (default 45), dir
 */
export default class VoidHunter extends Enemy {
  constructor(scene, ctx, def) {
    super(scene, ctx, def, { texture: 'hunter', frame: 'hunter0', w: 40, h: 28, tint: 0xff5577 });
    this.range = (def.range ?? 9) * 32;
    this.speed = def.speed ?? 420;
    this.prowl = def.prowl ?? 45;
  }

  reset() {
    super.reset();
    this.state = 'prowl';
    this.sprite.play('hunter-run');
  }

  think(dt, player) {
    this.applyGravity(dt);
    const p = player && !player.dead ? player.body : null;
    this.timer -= dt;

    switch (this.state) {
      case 'prowl': {
        if (this.onGround && (this.edgeAhead(this.dir) || this.wallAhead(this.dir))) this.dir *= -1;
        this.moveX(this.dir * this.prowl * dt);
        this.sprite.anims.timeScale = 0.5;
        if (p && this.onGround) {
          const dx = p.center.x - this.x;
          const dy = p.bottom - this.y;
          if (Math.abs(dx) < this.range && dy > -80 && dy < 40) {
            this.dir = Math.sign(dx) || this.dir;
            this.state = 'windup';
            this.timer = 0.45;
            this.sprite.stop();
            this.sprite.setFrame('hunterWind');
          }
        }
        break;
      }
      case 'windup':
        this.sprite.setTint(Math.floor(this.timer * 20) % 2 ? 0xffffff : this.tint);
        if (this.timer <= 0) {
          this.state = 'charge';
          this.timer = 1.4;
          this.sprite.setTint(this.tint);
          this.sprite.play('hunter-run');
          this.sprite.anims.timeScale = 2;
        }
        break;
      case 'charge': {
        const blocked = (this.onGround && this.edgeAhead(this.dir)) || !this.moveX(this.dir * this.speed * dt);
        if (Math.random() < 0.5) this.fx.slideDust(this.x - this.dir * 16, this.y);
        if (blocked || this.timer <= 0) {
          this.state = 'recover';
          this.timer = 0.8;
          this.sprite.anims.timeScale = 0.3;
        }
        break;
      }
      case 'recover':
        if (this.timer <= 0) {
          this.state = 'prowl';
          this.dir *= -1;
        }
        break;
      default:
    }
    this.sprite.setFlipX(this.dir < 0);
  }
}
