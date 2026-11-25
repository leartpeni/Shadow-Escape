import LevelBuilder from '../LevelBuilder.js';

/**
 * 3-S "Hall of Silent Bells" — secret level of the Shadow Castle.
 *
 *   0-40    electric barriers in the bell hall
 *   41-80   vanishing steps over a moat                 -> CP 1
 *   81-120  hunter and bats in the gallery              -> CP 2
 *   121-150 final barrier, exit
 */
export default function secret_3() {
  const W = 150;
  const H = 30;
  const L = new LevelBuilder({ name: 'Hall of Silent Bells', width: W, height: H });
  L.ground(26);
  L.walls(2);

  L.start(4, 25);
  L.label(10, 20, 'The bells have not rung in a thousand years');
  L.electric(16, 18, 8, 'v', { on: 1.4, off: 1.4, warn: 0.45 });
  L.electric(22, 18, 8, 'v', { on: 1.5, off: 1.5, phase: 0.5, warn: 0.45 });
  L.spike(28, 25, 2);
  L.shard(29, 21);
  L.checkpoint(38, 25);

  L.pit(44, 24);
  L.vanish(45, 25, 3, { on: 2.4, off: 1.2, phase: 0 });
  L.vanish(51, 24, 3, { on: 2.4, off: 1.2, phase: 0.75 });
  L.vanish(57, 25, 3, { on: 2.4, off: 1.2, phase: 0.5 });
  L.vanish(63, 24, 3, { on: 2.4, off: 1.2, phase: 0.25 });
  L.shard(58, 21);
  L.checkpoint(74, 25);

  L.solid(84, 15, 26, 2);
  L.enemy('hunter', 94, 25, { range: 8 });
  L.enemy('bat', 102, 17, { wake: 170 });
  L.spike(106, 25, 2);
  L.shard(100, 22);
  L.checkpoint(116, 25);

  L.electric(126, 18, 8, 'v', { on: 1.6, off: 1.4, warn: 0.5 });
  L.enemy('slime', 134, 25, { speed: 50 });
  L.exit(144, 25);

  return L.build();
}
