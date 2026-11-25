import LevelBuilder from '../LevelBuilder.js';

/**
 * 4-S "The Singing Geode" — secret level of the Crystal Caverns.
 *
 *   0-40    sweeping lasers along the floor
 *   41-80   vanishing crystal shelves, guardian         -> CP 1
 *   81-120  moving platform, falling crystals            -> CP 2
 *   121-150 electric gate, exit
 */
export default function secret_4() {
  const W = 150;
  const H = 30;
  const L = new LevelBuilder({ name: 'The Singing Geode', width: W, height: H });
  L.ground(26);
  L.walls(2);

  L.start(4, 25);
  L.label(10, 20, 'The crystals hum a song only you can hear');
  L.laser(14, 25, 3, 'v', { always: true, toX: 20, period: 2.8 });
  L.laser(27, 25, 3, 'v', { always: true, toX: 33, period: 2.8, movePhase: 0.5 });
  L.shard(24, 21);
  L.checkpoint(39, 25);

  L.pit(44, 22);
  L.vanish(45, 25, 3, { on: 2.4, off: 1.2, phase: 0 });
  L.vanish(50, 23, 3, { on: 2.4, off: 1.2, phase: 0.2 });
  L.vanish(55, 25, 3, { on: 2.4, off: 1.2, phase: 0.4 });
  L.vanish(60, 23, 3, { on: 2.4, off: 1.2, phase: 0.6 });
  L.shard(61, 19);
  L.enemy('guardian', 74, 25, { dir: -1, rate: 2.2 });
  L.checkpoint(78, 25);

  L.pit(84, 12);
  L.platform(84, 26, 93, 26, 5, 0, 3);
  L.solid(98, 12, 14, 2);
  L.rock(102, 14);
  L.rock(107, 14);
  L.shard(105, 23);
  L.checkpoint(116, 25);

  L.electric(124, 17, 9, 'v', { on: 1.6, off: 1.2 });
  L.enemy('hunter', 134, 25, { range: 7 });
  L.exit(144, 25);

  return L.build();
}
