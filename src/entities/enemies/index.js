import Phaser from 'phaser';
import Slime from './Slime.js';
import Bat from './Bat.js';
import VoidHunter from './VoidHunter.js';
import LightGuardian from './LightGuardian.js';

export const ENEMY_TYPES = { slime: Slime, bat: Bat, hunter: VoidHunter, guardian: LightGuardian };

const Rect = Phaser.Geom.Rectangle;

/**
 * Spawns enemies from the level definition, updates them and resolves
 * player contact (stomp / dash kill / shield knockback / player death).
 */
export default class EnemyManager {
  constructor(scene, ctx, defs) {
    this.scene = scene;
    this.ctx = ctx;
    this.list = defs.map((d) => this.create(d));
  }

  create(def) {
    const Cls = ENEMY_TYPES[def.type];
    if (!Cls) throw new Error(`Unknown enemy type "${def.type}"`);
    return new Cls(this.scene, this.ctx, def);
  }

  /** Spawn at pixel position (feet for ground enemies). Used by bosses. */
  spawn(type, px, py, opts = {}) {
    const e = this.create({ type, x: 0, y: 0, px, py, summoned: true, ...opts });
    this.list.push(e);
    return e;
  }

  update(dt, player) {
    let n = 0;
    for (const e of this.list) {
      // Defeated boss minions are discarded instead of piling up during long fights.
      if (e.summoned && !e.alive) {
        e.destroy();
        continue;
      }
      e.update(dt, player);
      this.list[n++] = e;
    }
    this.list.length = n;
  }

  /**
   * Resolves contact with the player. Returns 'kill' if the player must die.
   * `prevBottom` is the player's bottom edge last frame (for fair stomp detection).
   */
  collide(player, bounds, prevBottom) {
    if (player.dead) return null;
    const vy = player.body.velocity.y;
    for (const e of this.list) {
      if (!e.alive || !Rect.Overlaps(e.rect, bounds)) continue;
      const stomp = e.stompable && vy > 0 && prevBottom <= e.rect.top + 10;
      if (stomp) {
        e.kill();
        player.bounce();
        this.ctx.fx.stomp(player.body.center.x, player.body.bottom);
        this.scene.events.emit('enemy-defeated', e.def.type);
        continue;
      }
      if (player.dashing && e.dashKillable(player)) {
        e.kill();
        player.refreshDash();
        this.scene.events.emit('enemy-defeated', e.def.type);
        continue;
      }
      if (e.shields(player)) {
        player.knockback(Math.sign(player.body.center.x - e.x) || 1);
        this.ctx.fx.impact(player.body.center.x, player.body.center.y, e.tint);
        continue;
      }
      return 'kill';
    }
    return null;
  }

  /** After a player death: revive placed enemies, remove summoned ones. */
  reset() {
    this.list = this.list.filter((e) => {
      if (e.summoned) {
        e.destroy();
        return false;
      }
      e.reset();
      return true;
    });
  }

  killSummoned() {
    for (const e of this.list) if (e.summoned) e.kill();
  }
}
