import LevelBuilder from '../LevelBuilder.js';

/**
 * 3-3 "Hall of Sparks" — the castle's lightning works.
 *
 *   0-45    spark hall: a single barrier, then a pair of out-of-step barriers (wait between them),
 *           a roosting bat over a gap
 *   46-53   tesla tower: wall-jump chimney cut by a pulsing horizontal arc (rest in the alcove below it)
 *   52-93   ramparts: chain of vanishing platforms over the void (shard high above the chain)
 *   94-97   drop shaft into the gallery; it doubles as a chimney. Secret: a dark gap in its east
 *           wall halfway up leads to a hidden vault (shard glints inside)
 *   98-129  gallery: Void Hunter on the floor, Light Guardian guarding the far end (stomp it)
 *   130-152 spark bridge: pillars over a pit, each gap crossed by a barrier; the "off" wave rolls
 *           from left to right (shard above the third pillar)
 *   153-199 crumbling stairs out into the night, blade on the walkway, a last hunter, exit
 */
export default function level_3_3() {
  const W = 202;
  const H = 34;
  const L = new LevelBuilder({ name: 'Hall of Sparks', width: W, height: H });

  L.ground(30);
  L.walls(2);

  // ---- Spark hall (interior rows 20-29)
  L.start(4, 29);
  L.solid(2, 0, 44, 20);
  L.label(7, 24, 'Hall of Sparks');
  L.electric(13, 20, 10, 'v', { on: 1.4, off: 1.4, warn: 0.45 });
  L.label(22, 22, 'Two gates, out of step: wait between them');
  L.electric(19, 20, 10, 'v', { on: 1.5, off: 1.5, phase: 0, warn: 0.45 });
  L.electric(24, 20, 10, 'v', { on: 1.5, off: 1.5, phase: 0.5, warn: 0.45 });
  L.enemy('bat', 31, 21, { wake: 300 });
  L.pit(33, 4, 30);
  L.checkpoint(42, 29);

  // ---- Tesla tower: 3-wide chimney x 49-51 between the west wall 46-48 and the rampart 52+
  L.solid(46, 4, 3, 22); // west wall, walk in underneath (rows 26-29)
  L.clear(46, 13, 3, 4); // resting alcove cut into the west wall
  L.electric(49, 9, 3, 'h', { on: 1.0, off: 2.4, warn: 0.5 });
  L.label(50, 23, 'Wall-jump up - rest in the alcove');

  // ---- Ramparts and the vanishing chain
  L.solid(52, 6, 14, 24);
  L.checkpoint(56, 5);
  L.pit(66, 21, 30);
  L.vanish(67, 6, 3, { on: 2.2, off: 1.2, phase: 0 });
  L.vanish(72, 4, 3, { on: 2.2, off: 1.2, phase: 0.8 });
  L.vanish(77, 6, 3, { on: 2.2, off: 1.2, phase: 0.6 });
  L.vanish(82, 4, 3, { on: 2.2, off: 1.2, phase: 0.4 });
  L.shard(73, 0);
  L.solid(87, 6, 7, 24);

  // ---- Drop shaft (94-97) with the secret vault in its east wall
  L.solid(98, 0, 60, 20); // gallery ceiling mass
  L.secret(98, 10, 2, 3);
  L.clear(100, 10, 6, 3);
  L.shard(104, 12);
  L.checkpoint(95, 29);

  // ---- Gallery: hunter, then a guardian at the far end
  L.enemy('hunter', 108, 29, { range: 8 });
  L.solid(114, 27, 3, 3); // step to jump on the guardian from
  L.enemy('guardian', 121, 29, { range: 6 });
  L.label(118, 22, 'Stomp the Guardian');

  // ---- Spark bridge: the barriers switch off one after another, left to right
  L.pit(130, 23, 30);
  for (const x of [133, 138, 143, 148]) L.solid(x, 27, 2, 7);
  [131, 136, 141, 146, 151].forEach((x, i) => L.electric(x, 20, 10, 'v', { on: 1.3, off: 1.3, phase: (1 - 0.14 * i) % 1, warn: 0.4 }));
  L.shard(143, 22);
  L.checkpoint(155, 29);

  // ---- Crumbling stairs to the night walkway
  L.pit(158, 13, 30);
  L.crumble(159, 27, 2);
  L.crumble(163, 24, 2);
  L.crumble(167, 21, 2);
  L.solid(171, 18, 29, 16);
  L.saw(175, 17.45, 181, 17.45, 3, 0);
  L.enemy('hunter', 191, 17, { range: 6 });
  L.exit(197, 17);

  return L.build();
}
