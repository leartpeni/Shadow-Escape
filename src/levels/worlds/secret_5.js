import LevelBuilder from '../LevelBuilder.js';

/**
 * 5-S "The Heart Beneath" — secret level of the Void. The final hidden trial.
 *
 *   0-40    islands, blades and slimes
 *   41-80   vanishing wave, twin lasers                 -> CP 1
 *   81-120  hunter shelf, falling rocks                 -> CP 2
 *   121-150 electric barrier, guardian, exit
 */
export default function secret_5() {
  const W = 150;
  const H = 30;
  const L = new LevelBuilder({ name: 'The Heart Beneath', width: W, height: H });
  L.walls(2);

  L.ground(26, 0, 18);
  L.start(4, 25);
  L.label(9, 20, 'Beneath the Void, something still beats');
  L.enemy('slime', 13, 25, { hop: true });
  L.ground(25, 21, 7);
  L.ground(24, 31, 11);
  L.orbitSaw(35, 20, 2.5, 3.2);
  L.shard(35, 20);
  L.checkpoint(40, 23);

  const vp = { on: 2.0, off: 1.2 };
  L.vanish(44, 24, 3, { ...vp, phase: 0 });
  L.vanish(50, 24, 3, { ...vp, phase: 0.75 });
  L.vanish(56, 24, 3, { ...vp, phase: 0.5 });
  L.ground(24, 62, 20);
  L.solid(65, 14, 12, 3);
  L.laser(68, 17, 7, 'v', { on: 1.2, off: 1.6, phase: 0 });
  L.laser(73, 17, 7, 'v', { on: 1.2, off: 1.6, phase: 0.5 });
  L.shard(70, 21);
  L.checkpoint(79, 23);

  L.platform(83, 24, 90, 24, 5, 0, 3);
  L.ground(24, 95, 26);
  L.solid(98, 14, 16, 2);
  for (const x of [100, 104, 108]) L.rock(x, 16);
  L.enemy('hunter', 112, 23, { range: 5 }); // short range: the checkpoint at 118 stays out of reach
  L.shard(116, 20);
  L.checkpoint(118, 23);

  L.pit(121, 4);
  L.ground(24, 125, W - 125);
  L.electric(128, 16, 8, 'v', { on: 1.4, off: 1.4 });
  L.enemy('guardian', 136, 23, { dir: -1, rate: 2.2 });
  L.label(140, 19, 'The last light');
  L.exit(144, 23);

  return L.build();
}
