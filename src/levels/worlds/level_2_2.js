import LevelBuilder from '../LevelBuilder.js';

/**
 * 2-2 "Rockfall Galleries" – old mining galleries where the ceiling keeps coming down.
 * Introduces Night Bats, then stacks a rock-strewn upper gallery on top of the lower one.
 *
 *   0-46    entrance + lower rock gallery: rocks, a spike gap (shard 1 above it)
 *   44-60   open hall: pit, slime
 *   60-92   bat cave: a single bat under a stone arch, the lift shaft up
 *           (secret: the shaft's right wall is hollow at floor level -> chamber with shard 2,
 *            a slit window in the wall lets its glow through)
 *   93-142  upper gallery: rocks, crumbling bridge over spikes (shard 3 above it), bat, more rocks
 *   143-156 crumbling ledges down over the abyss
 *   156-197 last gallery: rocks, moving platform over a spike trench, bat, hopping slime, exit
 */
export default function level_2_2() {
  const W = 200;
  const H = 34;
  const L = new LevelBuilder({ name: 'Rockfall Galleries', width: W, height: H });
  L.walls(2, 2);

  // ---- Section 1: entrance + lower rock gallery
  L.ground(28, 0, 44);
  L.start(4, 27);
  L.label(8, 23, 'Listen for loose rocks...');
  L.solid(14, 2, 30, 19); // gallery ceiling, open rows 21..27
  L.rock(19, 21);
  L.rock(22, 21);
  L.rock(23, 21);
  L.spike(28, 27, 2);
  L.shard(28, 24);
  L.rock(34, 21);
  L.rock(35, 21);
  L.rock(39, 21);

  // ---- Section 2: open hall
  L.ground(28, 50, 11); // pit 47..49
  L.solid(44, 28, 3, 6);
  L.enemy('slime', 56, 27);
  L.checkpoint(59, 27);

  // ---- Section 3: bat cave + lift shaft
  L.ground(28, 61, 32);
  L.solid(65, 2, 13, 20); // stone arch, bat hangs below it
  L.label(62, 21, 'Bats swoop - stomp or dash them!');
  L.enemy('bat', 71, 22, { wake: 200 });
  L.platform(89, 26, 89, 15, 7.5, 0, 3);
  // upper slab (x93..142); the lower part hides the secret chamber
  L.ground(16, 93, 50);
  L.secret(93, 25, 2, 3);
  L.clear(95, 23, 10, 5);
  L.clear(93, 23, 2, 1); // slit window: the chamber glows through the wall
  L.shard(101, 27);

  // ---- Section 4: upper gallery
  L.solid(96, 2, 47, 7); // ceiling, open rows 9..15
  L.rock(99, 9);
  L.rock(100, 9);
  L.rock(103, 9);
  L.clear(106, 16, 8, 3);
  L.spike(106, 18, 8);
  L.crumble(106, 15, 3);
  L.crumble(109, 15, 3);
  L.crumble(112, 15, 2);
  L.shard(110, 11);
  L.rock(110, 9);
  L.enemy('bat', 123, 9, { wake: 240 });
  L.rock(128, 9);
  L.rock(129, 9);
  L.rock(133, 9);
  L.checkpoint(139, 15);

  // ---- Section 5: crumbling ledges down
  L.crumble(144, 18, 3);
  L.crumble(149, 21, 3);
  L.solid(153, 24, 2, 1);

  // ---- Section 6: last gallery
  L.ground(26, 156, 42);
  L.checkpoint(158, 25);
  L.solid(161, 2, 35, 15); // ceiling, open rows 17..25
  L.rock(164, 17);
  L.rock(165, 17);
  L.rock(169, 17);
  L.clear(173, 26, 8, 2);
  L.spike(173, 27, 8);
  L.platform(173, 25, 178, 25, 4, 0, 3);
  L.enemy('bat', 187, 18, { wake: 260 });
  L.enemy('slime', 191, 25, { hop: true });
  L.exit(195, 25);

  return L.build();
}
