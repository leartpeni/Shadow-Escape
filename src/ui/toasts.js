import Audio from '../systems/Audio.js';
import { C, hex, textStyle } from './theme.js';
import { panel, badge } from './widgets.js';

/**
 * Notification queue shared by the menu and the HUD: centred message toasts and
 * achievement banners that slide in from the right, one after another.
 */
export default class Toasts {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.depth = opts.depth ?? 400;
    this.y = opts.y ?? 96;
    this.bannerY = opts.bannerY ?? 96;
    this.queue = [];
    this.busy = false;
    this.msg = scene.add
      .text(scene.scale.width / 2, this.y, '', textStyle(24, C.cyan))
      .setOrigin(0.5)
      .setShadow(0, 2, '#000', 6)
      .setDepth(this.depth)
      .setAlpha(0);
  }

  message(text, color = C.cyan, hold = 1300) {
    if (!text) return;
    const s = this.scene;
    s.tweens.killTweensOf(this.msg);
    this.msg.setText(text).setColor(hex(color)).setAlpha(0).setScale(0.8);
    s.tweens.add({ targets: this.msg, alpha: 1, scale: 1, duration: 200, ease: 'Back.out' });
    s.tweens.add({ targets: this.msg, alpha: 0, delay: hold, duration: 400 });
  }

  /** a: { name, reward, icon } or { title, name, reward, icon, color } */
  achievement(a) {
    this.queue.push(a);
    if (!this.busy) this.next();
  }

  next() {
    const a = this.queue.shift();
    if (!a) {
      this.busy = false;
      return;
    }
    this.busy = true;
    const s = this.scene;
    const W = 300;
    const H = 66;
    const x = s.scale.width - W / 2 - 16;
    const color = a.color ?? C.gold;
    const c = s.add.container(s.scale.width + W, this.bannerY).setDepth(this.depth + 1);
    const g = panel(s, 0, 0, W, H, { accent: color, radius: 8, crest: false });
    const b = badge(s, -W / 2 + 36, 0, a.icon || 'star', color, 22);
    const t1 = s.add.text(-W / 2 + 68, -14, a.title || 'ACHIEVEMENT UNLOCKED', textStyle(12, color)).setOrigin(0, 0.5);
    const t2 = s.add.text(-W / 2 + 68, 8, a.name, textStyle(17, C.text)).setOrigin(0, 0.5).setShadow(0, 2, '#000', 4);
    c.add([g, b, t1, t2]);
    if (a.reward) {
      const icon = s.add.image(W / 2 - 18, 8, 'ui-gem').setScale(0.6);
      const r = s.add.text(W / 2 - 28, 8, `+${a.reward}`, textStyle(15, C.cyan)).setOrigin(1, 0.5);
      c.add([icon, r]);
    }
    if (a.sfx !== null) Audio.sfx(a.sfx || 'achievement');
    s.tweens.add({ targets: c, x, duration: 380, ease: 'Back.out' });
    s.tweens.add({
      targets: c,
      x: s.scale.width + W,
      delay: 2600,
      duration: 320,
      ease: 'Quad.in',
      onComplete: () => {
        c.destroy();
        this.next();
      },
    });
  }
}
