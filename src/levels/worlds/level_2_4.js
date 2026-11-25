import LevelBuilder from '../LevelBuilder.js';

/**
 * 2-4 "The Warden's Hall" � a short, dense approach through the Warden's antechambers,
 * then the arena of the Stone Warden.
 *
 *   0-43    antechamber: loose rocks, crumbling bridge over spikes, a guardian under a ledge (shard 1 on the ledge)
 *   44-75   the chasm: moving platform, a pulsing laser across the far gap, rock hall with a hopping slime
 *   76-105  the stair: a double-jump step, a bat, a crumbling high bridge over spikes (shard 3 floats above
 *           its first gap), drop to the gate; the landing block's east face is hollow (secret chamber, shard 2)
 *   108-135 the Warden's Hall (boss arena), exit unseals when the Warden falls
 */
export default function level_2_4() {
  const W = 138;
  const H = 30;
  const L = new LevelBuilder({ name: "The Warden's Hall", width: W, height: H });
  L.walls(2, 2);
  L.ground(26, 0, 48);
  L.ground(26, 62, W - 62); // chasm 48..61
  L.start(4, 25);

  // ---- Section 1: antechamber
  L.solid(10, 2, 22, 15); // ceiling, open rows 17..25
  L.label(6, 21, 'The Warden waits beyond...');
  L.rock(13, 17);
  L.rock(14, 17);
  L.rock(17, 17);
  L.clear(20, 26, 8, 2);
  L.spike(20, 27, 8);
  L.crumble(20, 25, 3);
  L.crumble(23, 25, 3);
  L.crumble(26, 25, 2);
  L.rock(24, 17);
  L.solid(33, 22, 3, 1); // ledge above the guardian
  L.shard(34, 21);
  L.enemy('guardian', 38, 25, { dir: -1, rate: 2.2 });
  L.checkpoint(43, 25);

  // ---- Section 2: the chasm + rock hall
  L.solid(44, 2, 32, 12); // ceiling, open rows 14..
  L.platform(48, 25, 56, 25, 5, 0, 3);
  L.laser(60, 14, 11, 'v', { on: 1.2, off: 1.8 }); // guards the far side of the chasm
  L.rock(65, 14);
  L.rock(66, 14);
  L.rock(70, 14);
  L.enemy('slime', 71, 25, { hop: true });
  L.checkpoint(74, 25);

  // ---- Section 3: the stair
  L.solid(76, 2, 22, 11); // ceiling, open rows 13..
  L.solid(76, 22, 8, 4); // step (double jump)
  L.solid(80, 19, 4, 3); // upper block
  L.enemy('bat', 86, 14, { wake: 230 });
  L.spike(84, 25, 10);
  L.crumble(84, 19, 3);
  L.crumble(88, 19, 3);
  L.crumble(92, 19, 2);
  L.shard(87, 16);
  L.solid(94, 20, 5, 6); // one step down from the bridge
  L.secret(97, 23, 2, 3); // its east face is hollow
  L.clear(95, 23, 2, 3);
  L.clear(98, 22, 1, 1); // notch: the chamber glows through
  L.shard(95, 25);
  L.checkpoint(104, 25);

  // ---- Boss arena 108..135, floor row 26, ceiling row 12
  L.solid(98, 2, 38, 10); // hall ceiling (rows 2..11)
  L.solid(106, 2, 2, 20); // entrance wall, 4-tall opening rows 22..25
  L.label(102, 18, 'The Stone Warden');
  L.boss('stoneWarden', { x0: 108, x1: 135, floor: 26, ceiling: 12, gateX: 107 });
  L.exit(133, 25);

  return L.build();
}
