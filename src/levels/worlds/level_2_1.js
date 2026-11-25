import LevelBuilder from '../LevelBuilder.js';

/**
 * 2-1 "Sunken Stairs" – the descent into the Underground Ruins.
 * Introduces falling rocks and collapsing floors in safe spots, then combines them.
 *
 *   0-47    entrance stairs, slime, double-jump ledge (shard 1), small pit
 *   48-82   low rock corridor: loose rocks fall when you pass (keep moving)
 *   83-92   corridor end: drop shaft; the right wall hides a chamber (secret + shard 3)
 *   93-123  collapsing floors: harmless trench first, then a bridge over spikes (shard 2)
 *   124-153 the sunken stairs: crumbling steps over a bottomless pit, lift up
 *   154-189 rock hall over a crumbling spike trench, hopping slime, exit
 *
 * Note: every crumbling run ends in a one-tile step down (a one-way platform flush
 * with a same-height tile edge snags the player, see Player.js riding bias).
 */
export default function level_2_1() {
  const W = 190;
  const H = 36;
  const L = new LevelBuilder({ name: 'Sunken Stairs', width: W, height: H });
  L.walls(2, 2);

  // ---- Section 1: entrance stairs
  L.ground(16, 0, 12);
  L.start(4, 15);
  L.label(8, 11, 'The ruins sink into darkness...');
  L.ground(18, 12, 5);
  L.ground(20, 17, 5);
  L.ground(22, 22, 23);
  L.solid(30, 17, 4, 1);
  L.shard(32, 16);
  L.enemy('slime', 38, 21);
  // pit 45..47

  // ---- Section 2: falling rock corridor
  L.ground(22, 48, 32);
  L.solid(48, 2, 35, 14); // corridor ceiling, open rows 16..21
  L.label(52, 18, 'Loose rocks! Keep moving');
  L.rock(58, 16);
  L.rock(63, 16);
  L.rock(64, 16);
  L.spike(69, 21, 2);
  L.rock(75, 16);
  L.rock(78, 16);

  // ---- Corridor end: drop shaft + secret chamber in the right wall
  L.solid(83, 2, 10, 22); // block x83..92 rows 2..23
  L.clear(85, 17, 5, 5);
  L.secret(83, 19, 2, 3);
  L.shard(87, 21);

  // ---- Section 3: collapsing floors
  L.ground(28, 80, 16);
  L.checkpoint(88, 27);
  L.label(99, 23, 'Cracked floors crumble - don\'t linger!');
  L.ground(30, 96, 6); // harmless trench
  L.crumble(96, 28, 3);
  L.crumble(99, 28, 3);
  L.ground(29, 102, 6);
  L.ground(31, 108, 12); // spike trench
  L.spike(108, 30, 12);
  L.crumble(108, 29, 3);
  L.crumble(111, 29, 3);
  L.crumble(114, 29, 3);
  L.crumble(117, 29, 3);
  L.shard(113, 27);
  L.ground(30, 120, 4);
  L.checkpoint(121, 29);

  // ---- Section 4: the sunken stairs (bottomless)
  L.crumble(125, 31, 3);
  L.crumble(130, 32, 3);
  L.solid(135, 33, 3, 3);
  L.crumble(140, 32, 3);
  L.platform(144, 31, 150, 25, 5.5, 0, 3);

  // ---- Section 5: rock hall over a crumbling trench
  L.ground(26, 153, 13);
  L.checkpoint(156, 25);
  L.solid(160, 2, 28, 17); // ceiling, open rows 19..25
  L.rock(163, 19);
  L.ground(28, 166, 9);
  L.spike(166, 27, 9);
  L.crumble(166, 26, 3);
  L.crumble(169, 26, 3);
  L.crumble(172, 26, 3);
  L.rock(168, 19);
  L.rock(173, 19);
  L.ground(27, 175, 15);
  L.enemy('slime', 179, 26, { hop: true });
  L.exit(185, 26);

  return L.build();
}
