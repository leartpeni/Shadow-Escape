import Enemy from './Enemy.js';

/**
 * Light Guardian – stationary sentinel with a shield on its front. It turns to face
 * the player, charges up and fires light orbs. The shield knocks the player back:
 * attack it from behind (dash) or from above (stomp).
 * opts: range (tiles, default 11), burst (orbs per volley, default 1), rate (s between volleys, default 1.8),
 *       speed (orb speed, default 230), dir (fixed facing; omit to track the player)
 */
export default class LightGuardian extends Enemy {
  constructor(scene, ctx, def) {
    super(scene, ctx, def, { texture: 'guardian', frame: 'guard0', w: 30, h: 50, tint: 0xffe08a });
    this.range = (def.range ?? 11) * 32;
    this.burst = def.burst ?? 1;
    this.rate = def.rate ?? 1.8;
    this.orbSpeed = def.speed ?? 230;
    this.fixedDir = def.dir || 0;
  }

  reset() {
    super.reset();
    this.dir = this.fixedDir || -1;
    this.state = 'watch';
    this.timer = 0.6;
    this.turnTimer = 0;
    this.sprite.setFrame('guard0');
  }

  think(dt, player) {
    this.applyGravity(dt);
    const p = player && !player.dead ? player.body : null;
    this.timer -= dt;
    const inRange = p && Math.abs(p.center.x - this.x) < this.range && Math.abs(p.center.y - this.cy) < this.range * 0.7;

    // Turning around is slow, which gives the player a window to get behind it.
    if (p && !this.fixedDir && this.state !== 'charge') {
      const want = Math.sign(p.center.x - this.x) || this.dir;
      if (want !== this.dir) {
        this.turnTimer += dt;
        if (this.turnTimer > 0.7) {
          this.dir = want;
          this.turnTimer = 0;
        }
      } else this.turnTimer = 0;
    }

    if (this.state === 'watch') {
      if (inRange && this.timer <= 0) {
        this.state = 'charge';
        this.timer = 0.7;
        this.sprite.setFrame('guardCharge');
      }
    } else if (this.state === 'charge') {
      this.sprite.setTint(Math.floor(this.timer * 16) % 2 ? 0xffffff : this.tint);
      if (this.timer <= 0) {
        this.fire(p);
        this.state = 'watch';
        this.timer = this.rate;
        this.sprite.setFrame('guard0').setTint(this.tint);
      }
    }
    this.sprite.setFlipX(this.dir < 0);
  }

  fire(p) {
    const ox = this.x + this.dir * 16;
    const oy = this.y - 34;
    const tx = p ? p.center.x : ox + this.dir * 100;
    const ty = p ? p.center.y : oy;
    // Never shoot backwards through itself.
    const aimX = Math.sign(tx - ox) === this.dir ? tx : ox + this.dir * 100;
    const base = Math.atan2(ty - oy, aimX - ox);
    for (let i = 0; i < this.burst; i++) {
      const a = base + (i - (this.burst - 1) / 2) * 0.22;
      this.combat.shoot(ox, oy, Math.cos(a) * this.orbSpeed, Math.sin(a) * this.orbSpeed, { tint: 0xffe08a, radius: 8, life: 5 });
    }
    this.fx.impact(ox, oy, 0xffe08a);
  }

  /** Player is on the shielded side. */
  front(player) {
    return Math.sign(player.body.center.x - this.x) === this.dir;
  }

  dashKillable(player) {
    return !this.front(player);
  }

  shields(player) {
    return this.front(player);
  }
}
