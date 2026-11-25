import Phaser from 'phaser';
import { PLAYER as P, DEPTH, COLORS, TILE, QUALITY } from '../config.js';

const approach = (v, target, delta) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));
const damp = (current, target, rate, dt) => Phaser.Math.Linear(current, target, 1 - Math.exp(-rate * dt));
const SPIN_TIME = 0.34;
const FRAME_H = 44;
const SHADOW_RANGE = 170;

/**
 * The shadow character.
 * Physics lives on an invisible Zone (fixed-size hitbox) while a separate sprite handles
 * visuals, so squash & stretch never changes the collision box.
 */
export default class Player {
  constructor(scene, level, effects, x, bottom) {
    this.scene = scene;
    this.level = level;
    this.fx = effects;

    this.hitbox = scene.add.zone(x, bottom - P.BODY_H / 2, P.BODY_W, P.BODY_H);
    scene.physics.add.existing(this.hitbox);
    this.body = this.hitbox.body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(4000, 4000);

    this.shadow = scene.textures.exists('fx-shadow')
      ? scene.add.image(x, bottom, 'fx-shadow').setDepth(DEPTH.PLAYER_GLOW - 1).setAlpha(0.5)
      : null;
    this.glow = scene.add.image(x, bottom, 'glow').setTint(COLORS.rim).setAlpha(0.22).setScale(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.PLAYER_GLOW);
    this.sprite = scene.add.sprite(x, bottom, 'shadow', 'idle0').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER);
    this.sprite.play('idle');
    this.time = 0;

    this.resetState();
  }

  resetState() {
    this.moveVx = 0;
    this.facing = 1;
    this.grounded = false;
    this.wasGrounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.groundLock = 0;
    this.isJumping = false;
    this.airJumps = 1;
    this.wallDir = 0;
    this.lastWallDir = 0;
    this.wallCoyote = 0;
    this.wallJumpLock = 0;
    this.wallSliding = false;
    this.canDash = true;
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = new Phaser.Math.Vector2(1, 0);
    this.trailTimer = 0;
    this.slideDustTimer = 0;
    this.riding = null;
    this.dead = false;
    this.frozen = false;
    this.scaleX = 1;
    this.scaleY = 1;
    this.prevVy = 0;
    // animation-only state
    this.spinTimer = 0;
    this.kickTimer = 0;
    this.hurtTimer = 0;
    this.landTimer = 0;
    this.wispTimer = 0;
    this.celebrating = false;
  }

  get x() {
    return this.body.center.x;
  }

  get bottom() {
    return this.body.bottom;
  }

  // ---------------------------------------------------------------- queries
  touchingWall(dir) {
    const b = this.body;
    const x = dir > 0 ? b.right + 2 : b.left - 2;
    return this.level.isSolidAt(x, b.top + 4) || this.level.isSolidAt(x, b.center.y) || this.level.isSolidAt(x, b.bottom - 4);
  }

  findRidingPlatform() {
    const b = this.body;
    for (const p of this.level.platforms) {
      if (p.solid === false) continue;
      const pb = p.body;
      if (b.right > pb.left + 1 && b.left < pb.right - 1 && Math.abs(b.bottom - pb.top) <= 4 && b.velocity.y >= pb.velocity.y - 5) {
        return p;
      }
    }
    return null;
  }

  // ----------------------------------------------------------------- update
  update(input, dtMs) {
    if (this.dead || this.frozen) {
      this.syncVisual(dtMs / 1000);
      return;
    }
    const dt = Math.min(dtMs / 1000, 1 / 30);
    const b = this.body;

    // --- contact state
    this.groundLock = Math.max(0, this.groundLock - dt);
    this.riding = this.groundLock > 0 ? null : this.findRidingPlatform();
    this.grounded = this.groundLock <= 0 && (b.blocked.down || !!this.riding);

    if (this.grounded) {
      this.coyote = P.COYOTE_TIME;
      this.airJumps = 1;
      this.isJumping = false;
      if (!this.dashing && this.dashCooldown <= 0) this.canDash = true;
      if (!this.wasGrounded) this.onLand();
    } else {
      this.coyote -= dt;
    }

    this.wallDir = 0;
    if (!this.grounded) {
      if (this.touchingWall(1)) this.wallDir = 1;
      else if (this.touchingWall(-1)) this.wallDir = -1;
    }
    if (this.wallDir !== 0) {
      this.wallCoyote = P.WALL_COYOTE;
      this.lastWallDir = this.wallDir;
    } else {
      this.wallCoyote -= dt;
    }

    this.jumpBuffer = input.jumpPressed ? P.JUMP_BUFFER : this.jumpBuffer - dt;
    this.dashCooldown -= dt;
    this.wallJumpLock -= dt;

    // --- dash
    if (input.dashPressed && this.canDash && this.dashCooldown <= 0 && !this.dashing) {
      this.startDash(input);
    }
    if (this.dashing) {
      this.dashTimer -= dt;
      const jumpCancel = this.jumpBuffer > 0 && (this.grounded || this.coyote > 0 || this.wallCoyote > 0);
      if (this.dashTimer <= 0 || jumpCancel) {
        this.endDash();
      } else {
        b.velocity.set(this.dashDir.x * P.DASH_SPEED, this.dashDir.y * P.DASH_SPEED);
        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
          this.trailTimer = 0.025;
          this.fx.afterimage(this.sprite);
          this.fx.dashTrail(b.center.x, b.center.y, this.dashDir.x, this.dashDir.y);
        }
        this.wasGrounded = this.grounded;
        this.syncVisual(dt);
        return;
      }
    }

    // --- horizontal movement
    const dirX = input.x;
    const target = dirX * P.MAX_RUN;
    let accel;
    if (this.grounded) {
      if (dirX === 0) accel = P.RUN_DECEL;
      else if (this.moveVx !== 0 && Math.sign(dirX) !== Math.sign(this.moveVx)) accel = P.TURN_ACCEL;
      else accel = P.RUN_ACCEL;
    } else {
      accel = dirX === 0 ? P.AIR_DECEL : P.AIR_ACCEL;
      // Preserve extra momentum (e.g. after dashing) when holding the same direction.
      if (dirX !== 0 && Math.sign(dirX) === Math.sign(this.moveVx) && Math.abs(this.moveVx) > P.MAX_RUN) accel = P.AIR_DECEL;
    }
    if (this.wallJumpLock > 0) accel *= 0.2;
    this.moveVx = approach(this.moveVx, target, accel * dt);
    if (this.grounded && b.blocked.left && this.moveVx < 0) this.moveVx = 0;
    if (this.grounded && b.blocked.right && this.moveVx > 0) this.moveVx = 0;

    if (dirX !== 0 && this.wallJumpLock <= 0) this.facing = dirX;

    // --- platform carry
    let carryVx = 0;
    if (this.riding) {
      carryVx = this.riding.body.velocity.x;
      // Small downward bias keeps contact with platforms that move down.
      b.velocity.y = this.riding.body.velocity.y + 40;
    }

    // --- jumping (buffer + coyote)
    if (this.jumpBuffer > 0) {
      if (this.grounded || this.coyote > 0) {
        this.jump(P.JUMP_VELOCITY);
        if (this.riding) this.moveVx += carryVx;
        carryVx = 0;
      } else if (this.wallCoyote > 0) {
        this.wallJump();
      } else if (this.airJumps > 0) {
        this.airJumps--;
        this.jump(P.DOUBLE_JUMP_VELOCITY, true);
      }
    }

    // Variable jump height: releasing jump cuts the ascent.
    if (this.isJumping && !input.jumpHeld && b.velocity.y < 0) {
      b.velocity.y *= P.JUMP_CUT;
      this.isJumping = false;
    }
    if (b.velocity.y >= 0) this.isJumping = false;

    // --- gravity shaping
    let g = 1;
    if (b.velocity.y > 0) g = P.FALL_GRAVITY_MULT;
    else if (Math.abs(b.velocity.y) < P.APEX_THRESHOLD && input.jumpHeld && !this.grounded) g = P.APEX_GRAVITY_MULT;
    b.setGravityY(P.GRAVITY * (g - 1));

    // --- wall slide + fall speed caps
    this.wallSliding = !this.grounded && this.wallDir !== 0 && dirX === this.wallDir && b.velocity.y > 0;
    const maxFall = this.wallSliding ? P.WALL_SLIDE_SPEED : input.down ? P.FAST_FALL : P.MAX_FALL;
    if (b.velocity.y > maxFall) {
      b.velocity.y = this.wallSliding ? approach(b.velocity.y, maxFall, 4000 * dt) : maxFall;
    }
    if (this.wallSliding) {
      this.facing = -this.wallDir;
      this.slideDustTimer -= dt;
      if (this.slideDustTimer <= 0) {
        this.slideDustTimer = 0.06;
        this.fx.slideDust(this.wallDir > 0 ? b.right : b.left, b.top + 6);
      }
    }

    b.velocity.x = this.moveVx + carryVx;
    this.prevVy = b.velocity.y;
    this.wasGrounded = this.grounded;
    this.syncVisual(dt);
  }

  // ---------------------------------------------------------------- actions
  jump(velocity, isDouble = false) {
    const b = this.body;
    b.velocity.y = -velocity;
    this.isJumping = true;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.groundLock = P.JUMP_GROUND_LOCK;
    this.grounded = false;
    this.riding = null;
    this.setSquash(0.72, 1.3);
    if (isDouble) {
      this.fx.doubleJump(b.center.x, b.bottom);
      this.spinTimer = SPIN_TIME;
    } else this.fx.jumpDust(b.center.x, b.bottom);
    this.emit(isDouble ? 'doubleJump' : 'jump');
  }

  wallJump() {
    const dir = this.lastWallDir;
    const b = this.body;
    b.velocity.y = -P.WALL_JUMP_Y;
    this.moveVx = -dir * P.WALL_JUMP_X;
    this.facing = -dir;
    this.wallJumpLock = P.WALL_JUMP_LOCK;
    this.wallCoyote = 0;
    this.jumpBuffer = 0;
    this.isJumping = true;
    this.airJumps = 1;
    this.setSquash(0.75, 1.25);
    this.fx.wallDust(dir > 0 ? b.right : b.left, b.center.y);
    this.kickTimer = 0.2;
    this.spinTimer = 0;
    this.emit('wallJump');
  }

  startDash(input) {
    let dx = input.x;
    let dy = input.y;
    // Dashing down into the floor is useless, so convert it into a horizontal dash.
    if (this.grounded && dy > 0) dy = 0;
    if (dx === 0 && dy === 0) dx = this.facing;
    this.dashDir.set(dx, dy).normalize();
    if (dx !== 0) this.facing = Math.sign(dx);
    this.dashing = true;
    this.canDash = false;
    this.dashTimer = P.DASH_TIME;
    this.dashCooldown = P.DASH_COOLDOWN;
    this.isJumping = false;
    this.trailTimer = 0;
    this.body.setAllowGravity(false);
    this.body.velocity.set(this.dashDir.x * P.DASH_SPEED, this.dashDir.y * P.DASH_SPEED);
    this.setSquash(1.35, 0.7);
    this.fx.dashBurst(this.body.center.x, this.body.center.y, this.dashDir.x, this.dashDir.y);
    this.spinTimer = 0;
    this.emit('dash');
  }

  endDash() {
    this.dashing = false;
    this.body.setAllowGravity(true);
    this.moveVx = this.dashDir.x * P.DASH_SPEED * P.DASH_END_KEEP_X;
    this.body.velocity.x = this.moveVx;
    this.body.velocity.y = this.dashDir.y * P.DASH_SPEED * P.DASH_END_KEEP_Y;
  }

  onLand() {
    const impact = Math.max(0, this.prevVy);
    if (impact > 120) {
      const k = Phaser.Math.Clamp(impact / P.MAX_FALL, 0.2, 1);
      this.setSquash(1 + 0.35 * k, 1 - 0.3 * k);
      this.fx.landDust(this.body.center.x, this.body.bottom, impact);
      if (k > 0.45) this.landTimer = 0.1;
      this.emit('land', k);
    }
    this.spinTimer = 0;
    this.kickTimer = 0;
  }

  setSquash(sx, sy) {
    this.scaleX = sx;
    this.scaleY = sy;
  }

  /** Notifies listeners (audio etc.): scene.events 'player-action' (name, value). */
  emit(name, value) {
    this.scene.events.emit('player-action', name, value);
  }

  // ---------------------------------------------------------------- visuals
  syncVisual(dt) {
    const b = this.body;
    const s = this.sprite;
    this.time += dt;
    this.spinTimer = Math.max(0, this.spinTimer - dt);
    this.kickTimer = Math.max(0, this.kickTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.landTimer = Math.max(0, this.landTimer - dt);

    this.glow.setPosition(b.center.x, b.center.y);
    const glowBoost = this.dashing ? 0.18 : this.spinTimer > 0 ? 0.12 : 0;
    this.glow.setAlpha(0.2 + 0.05 * Math.sin(this.time * 3.2) + glowBoost);
    this.glow.setScale(0.85 + 0.06 * Math.sin(this.time * 3.2) + glowBoost);
    this.updateShadow();
    if (this.celebrating) return;

    this.scaleX = damp(this.scaleX, 1, 14, dt);
    this.scaleY = damp(this.scaleY, 1, 14, dt);
    const spinning = this.spinTimer > 0 && !this.dead && !this.dashing;
    if (spinning) {
      s.setOrigin(0.5, 0.5).setPosition(b.center.x, b.bottom - FRAME_H / 2);
    } else {
      s.setOrigin(0.5, 1).setPosition(b.center.x, b.bottom);
      if (this.wasSpinning) s.rotation = 0;
    }
    this.wasSpinning = spinning;
    s.setScale(this.scaleX, this.scaleY);
    if (this.dead) return;

    s.setFlipX(this.facing < 0);
    if (spinning) {
      s.rotation = this.facing * (1 - this.spinTimer / SPIN_TIME) * Math.PI * 2;
      this.wispTimer -= dt;
      if (this.wispTimer <= 0) {
        this.wispTimer = 0.05;
        this.fx.afterimage(s, 0.3, 180);
      }
    } else {
      const lean = this.grounded && !this.dashing ? (b.velocity.x / P.MAX_RUN) * 0.06 : 0;
      s.rotation = damp(s.rotation, lean, 18, dt);
    }

    const vy = b.velocity.y;
    let anim;
    if (this.dashing) anim = 'dash';
    else if (this.hurtTimer > 0) anim = 'hurt';
    else if (this.wallSliding) anim = 'wall';
    else if (!this.grounded) {
      if (spinning) anim = 'djump';
      else if (this.kickTimer > 0) anim = 'walljump';
      else if (vy < -90) anim = 'jump';
      else if (vy < 90) anim = 'apex';
      else anim = 'fall';
    } else if (this.landTimer > 0) anim = 'land';
    else anim = Math.abs(this.moveVx) > 20 ? 'run' : 'idle';
    if (anim === 'wall') s.setFlipX(this.wallDir < 0);
    const cur = s.anims.currentAnim;
    if (!cur || cur.key !== anim) s.play(anim);
    s.anims.timeScale = anim === 'run' ? Phaser.Math.Clamp(Math.abs(this.moveVx) / P.MAX_RUN, 0.5, 1.2) : 1;

    // hurt flash
    if (this.hurtTimer > 0 && Math.floor(this.time * 24) % 2 === 0) s.setTint(0xff9ab0);
    else if (s.isTinted) s.clearTint();

    // cloak wisps shed while moving fast
    if (!spinning && !this.dashing) {
      const fast = (this.grounded && Math.abs(this.moveVx) > P.MAX_RUN * 0.8) || vy > 380;
      if (fast) {
        this.wispTimer -= dt;
        if (this.wispTimer <= 0) {
          this.wispTimer = QUALITY.low ? 0.12 : 0.07;
          this.fx.trailWisp(b.center.x - this.facing * 6, b.center.y + (vy > 380 ? -10 : 2));
        }
      }
    }
  }

  /** Soft contact shadow projected onto the ground / platform below the hero. */
  updateShadow() {
    const sh = this.shadow;
    if (!sh) return;
    const b = this.body;
    if (this.dead && !this.sprite.visible) {
      sh.setVisible(false);
      return;
    }
    const x = b.center.x;
    const tx = Math.floor(x / TILE);
    let groundY = Infinity;
    for (let ty = Math.floor((b.bottom - 2) / TILE); ty * TILE <= b.bottom + SHADOW_RANGE; ty++) {
      if (ty * TILE >= b.bottom - 2 && this.level.isSolidTile(tx, ty)) {
        groundY = ty * TILE;
        break;
      }
    }
    for (const p of this.level.platforms) {
      if (p.solid === false) continue;
      const pb = p.body;
      if (x >= pb.left && x <= pb.right && pb.top >= b.bottom - 2 && pb.top < groundY) groundY = pb.top;
    }
    const d = groundY - b.bottom;
    if (!(d < SHADOW_RANGE)) {
      sh.setVisible(false);
      return;
    }
    const k = 1 - Math.max(0, d) / SHADOW_RANGE;
    sh.setVisible(true).setPosition(x, groundY).setAlpha(0.6 * k).setScale(0.45 + 0.35 * k, 0.6 + 0.4 * k);
  }

  // ------------------------------------------------------------ interactions
  /** Bounce off an enemy (stomp). Refreshes the air jump and dash. */
  bounce(velocity = 560) {
    if (this.dashing) this.endDash();
    const b = this.body;
    b.velocity.y = -velocity;
    this.isJumping = true;
    this.groundLock = P.JUMP_GROUND_LOCK;
    this.grounded = false;
    this.riding = null;
    this.airJumps = 1;
    this.canDash = true;
    this.dashCooldown = 0;
    this.setSquash(0.75, 1.25);
  }

  /** Called when a dash defeats an enemy: dash is immediately available again. */
  refreshDash() {
    this.canDash = true;
    this.dashCooldown = Math.min(this.dashCooldown, 0.08);
  }

  /** Pushed away from a shield/boss without dying. */
  knockback(dir, vx = 340, vy = 380) {
    if (this.dashing) this.endDash();
    this.moveVx = dir * vx;
    this.body.velocity.x = this.moveVx;
    this.body.velocity.y = -vy;
    this.wallJumpLock = 0.22;
    this.groundLock = P.JUMP_GROUND_LOCK;
    this.isJumping = false;
    this.setSquash(1.25, 0.8);
    this.hurtTimer = 0.32;
    this.spinTimer = 0;
    this.fx.hurt(this.body.center.x, this.body.center.y);
    this.emit('hurt');
  }

  /** Victory pose at the exit; visuals are then driven by the scene's tweens. */
  celebrate() {
    this.celebrating = true;
    this.spinTimer = 0;
    this.sprite.setOrigin(0.5, 1).setPosition(this.body.center.x, this.body.bottom).setRotation(0).setScale(1).clearTint();
    this.sprite.anims.timeScale = 1;
    this.sprite.play('victory');
  }

  // ---------------------------------------------------------- death/respawn
  die() {
    if (this.dead) return;
    this.dead = true;
    this.dashing = false;
    this.fx.death(this.body.center.x, this.body.center.y);
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    const s = this.sprite;
    s.setOrigin(0.5, 1).setPosition(this.body.center.x, this.body.bottom).setRotation(0).clearTint();
    s.anims.timeScale = 1;
    s.play('death');
    s.once('animationcomplete-death', () => {
      if (this.dead) s.setVisible(false);
    });
    this.glow.setVisible(false);
  }

  respawn(x, bottom) {
    this.resetState();
    this.body.enable = true;
    this.body.setAllowGravity(true);
    this.body.setGravityY(0);
    this.body.reset(x, bottom - P.BODY_H / 2);
    this.sprite.setVisible(true).setAlpha(1).setRotation(0).setOrigin(0.5, 1).clearTint();
    this.sprite.play('idle');
    this.glow.setVisible(true);
    this.setSquash(0.6, 1.4);
    this.syncVisual(0.016);
    this.fx.respawn(x, bottom - P.BODY_H / 2);
    this.emit('respawn');
  }
}
