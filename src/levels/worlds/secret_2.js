import LevelBuilder from '../LevelBuilder.js';

/**
 * 2-S "The Sunken Reliquary" — secret level of the Underground Ruins.
 *
 *   0-40    falling rock corridor
 *   41-80   laser gates, guardian                       -> CP 1
 *   81-120  lift over a chasm, rocks                    -> CP 2
 *   121-150 laser sweep and the reliquary exit
 */
export default function secret_2() {
  const W = 150;
  const H = 30;
  const L = new LevelBuilder({ name: 'The Sunken Reliquary', width: W, height: H });
  L.ground(26);
  L.walls(2);
  L.solid(0, 0, W, 2);

  L.start(4, 25);
  L.label(10, 20, 'Relics of a forgotten order rest here');
  L.solid(14, 18, 24, 2);
  for (const x of [18, 22, 23, 28, 32, 33]) L.rock(x, 20);
  L.shard(25, 24);
  L.checkpoint(40, 25);

  L.laser(46, 18, 8, 'v', { on: 1.5, off: 1.5, phase: 0 });
  L.laser(52, 18, 8, 'v', { on: 1.5, off: 1.5, phase: 0.5 });
  L.spike(57, 25, 2);
  L.enemy('guardian', 68, 25, { dir: -1, rate: 2.2 });
  L.solid(62, 23, 2, 3);
  L.shard(63, 19);
  L.checkpoint(78, 25);

  L.pit(84, 14);
  L.platform(84, 26, 92, 26, 5, 0, 3);
  L.solid(96, 22, 4, 4);
  L.rock(102, 10);
  L.rock(104, 10);
  L.solid(98, 8, 10, 2);
  L.shard(97, 18);
  L.checkpoint(112, 25);

  L.laser(118, 24, 2, 'v', { always: true, toX: 124, period: 2.8 });
  L.spike(128, 25, 2);
  L.enemy('slime', 134, 25);
  L.label(140, 20, 'The reliquary opens');
  L.exit(144, 25);

  return L.build();
}
