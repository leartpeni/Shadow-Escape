import Phaser from 'phaser';

/**
 * Smooth follow camera with directional look-ahead and fall look-down.
 */
export default class CameraController {
  constructor(scene, target, worldW, worldH) {
    this.cam = scene.cameras.main;
    this.cam.setBounds(0, 0, worldW, worldH);
    this.cam.startFollow(target, false, 0.12, 0.12);
    this.cam.setDeadzone(40, 60);
    this.offX = 0;
    this.offY = 0;
  }

  update(player, dtMs) {
    const dt = dtMs / 1000;
    const vy = player.body.velocity.y;
    const tx = -player.facing * 70;
    const ty = vy > 450 && !player.grounded ? -90 : 30;
    this.offX = Phaser.Math.Linear(this.offX, tx, 1 - Math.exp(-2.5 * dt));
    this.offY = Phaser.Math.Linear(this.offY, ty, 1 - Math.exp(-3 * dt));
    this.cam.setFollowOffset(this.offX, this.offY);
  }

  snap(x, y) {
    this.cam.centerOn(x - this.offX, y - this.offY);
  }
}
