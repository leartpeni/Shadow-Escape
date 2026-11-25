import LevelBuilder from '../LevelBuilder.js';

/**
 * 5-4 "Umbra's Throne" - the final approach and the fight against Umbra.
 *
 *   0-36    edge of the throne: a bottomless rift with a flickering ledge, an orbiting blade,
 *           a hopping slime
 *   38-78   the antechamber: falling void-stone, an electric gate, a rift crossed on a moving
 *           platform (shard 1 above it), a Void Hunter on the far side
 *   80-114  hall of judgement: alternating laser curtains (shard 2 between them), a guardian;
 *           past it the floor is hollow (secret pocket below, shard 3)
 *   118-146 Umbra's throne (boss arena); the exit unseals when Umbra falls
 */
export default function level_5_4() {
  const W = 149;
  const H = 30;
  const L = new LevelBuilder({ name: "Umbra's Throne", width: W, height: H });
  L.walls(2, 2);
  L.ground(26, 0, W);
  L.start(4, 25);

  // ---- Section 1: edge of the throne
  L.label(5, 21, 'Umbra awaits beyond the dark.');
  L.pit(12, 5);
  L.vanish(13, 23, 3, { on: 2, off: 1.2 });
  L.orbitSaw(25, 21, 4, 3.4);
  L.enemy('slime', 31, 25, { hop: true });
  L.checkpoint(36, 25);

  // ---- Section 2: the antechamber
  L.solid(40, 2, 20, 12); // ceiling, open rows 14..25
  L.rock(44, 14);
  L.rock(50, 14);
  L.electric(55, 14, 12, 'v', { on: 1.4, off: 1.4 });
  L.pit(60, 7);
  L.platform(60, 24, 64, 24, 4, 0, 3);
  L.shard(63, 20);
  L.enemy('hunter', 73, 25, { range: 4 }); // short range: the checkpoint at 78 stays out of reach
  L.checkpoint(78, 25);

  // ---- Section 3: hall of judgement
  L.solid(80, 2, 30, 14); // ceiling, open rows 16..25
  L.laser(86, 16, 10, 'v', { on: 1.2, off: 1.5 });
  L.laser(92, 16, 10, 'v', { on: 1.2, off: 1.5, phase: 0.5 });
  L.shard(89, 23);
  L.enemy('guardian', 100, 25, { dir: -1, rate: 2.2 });
  L.clear(105, 27, 4, 2); // hidden pocket under a hollow floor
  L.secret(105, 26, 4, 1);
  L.shard(107, 28);
  L.checkpoint(112, 25);

  // ---- Boss arena 118..146, floor row 26, ceiling row 12
  L.solid(116, 2, 2, 20); // entrance wall, 4-tall opening rows 22..25
  L.solid(118, 2, 29, 10);
  L.label(111, 19, 'Umbra, the Last Shadow');
  L.boss('umbra', { x0: 118, x1: 146, floor: 26, ceiling: 12, gateX: 117 });
  L.exit(144, 25);

  return L.build();
}
