import LevelBuilder from '../LevelBuilder.js';

/**
 * 5-2 "Fractured Paths" — the ground itself has broken apart.
 *
 *   0-28    rift steps: a rising blade in the first gap, an orbiting blade in the second
 *   29-81   the Sweep Hall: a travelling laser combs the corridor – duck into the trenches
 *           (SECRET: the third trench's floor is false; a tunnel below hides a shard and
 *           drops you out at the far end)                                   -> CP 1 below
 *   82-109  the Shattered Spire: wall-jump chimney cut by a timed electric arc
 *   110-139 blinking stepping stones over the void                          -> CP 2
 *   140-177 diagonal lift down to a Void Hunter's island (shard high above the lift) -> CP 3
 *   178-227 crumbling bridge into a Light Guardian, falling rocks, final arc, exit
 */
export default function level_5_2() {
  const W = 230;
  const H = 34;
  const L = new LevelBuilder({ name: 'Fractured Paths', width: W, height: H });
  L.walls(2);

  // ---- A: rift steps
  L.ground(26, 0, 16);
  L.start(4, 25);
  L.saw(18, 21, 18, 28, 2.2);
  L.ground(25, 20, 5);
  L.orbitSaw(26.5, 21.5, 2.2, 2.8);

  // ---- B: the Sweep Hall
  L.ground(23, 29, 53);
  L.solid(38, 13, 40, 2);
  L.label(33, 19, 'Hide from the sweeping light');
  L.laser(40, 15, 8, 'v', { always: true, toX: 76, period: 9 });
  for (const x of [45, 53, 61, 69]) L.clear(x, 23, 2, 2);
  L.shard(57, 19);
  // secret: false trench floor + tunnel to the lower floor
  L.secret(61, 25, 2, 1);
  L.secret(61, 26, 21, 2);
  L.shard(72, 27);

  // ---- C: the Shattered Spire
  L.ground(28, 82, 20);
  L.checkpoint(86, 27);
  L.solid(94, 8, 2, 18); // left chimney wall (walk under it at rows 26-27)
  L.solid(100, 10, 2, 18); // right chimney wall (lower: hop over it at the top)
  L.solid(100, 10, 10, 2); // top ledge
  L.solid(96, 22, 1, 1); // resting nub below the arc
  L.electric(96, 16, 4, 'h', { on: 1.2, off: 1.6, warn: 0.5 });

  // ---- D: blinking stones over the void
  const vb = { on: 1.6, off: 1.2 };
  L.vanish(113, 9, 3, { ...vb, phase: 0 });
  L.vanish(119, 8, 3, { ...vb, phase: 0.65 });
  L.vanish(125, 9, 3, { ...vb, phase: 0.3 });
  L.solid(130, 9, 9, 3);
  L.checkpoint(132, 8);

  // ---- E: diagonal lift, shard perch, hunter island
  L.platform(140, 10, 150, 17, 8, 0, 3);
  L.shard(141, 5);
  L.ground(20, 156, 12);
  L.enemy('hunter', 163, 19, { range: 8 });
  L.ground(17, 168, 10);
  L.checkpoint(172, 16);

  // ---- F: crumble bridge, guardian, rocks, exit
  for (const x of [180, 184, 188]) L.crumble(x, 17, 2, { delay: 0.4, respawn: 2.4 });
  L.ground(17, 192, W - 192);
  L.enemy('guardian', 198, 16, { dir: -1, rate: 2.0 });
  L.solid(204, 8, 14, 2);
  for (const x of [206, 210, 214]) L.rock(x, 10);
  L.solid(219, 5, 3, 6);
  L.electric(220, 11, 6, 'v', { on: 1.4, off: 1.4 });
  L.exit(224, 16);

  return L.build();
}
