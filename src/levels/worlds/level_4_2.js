import LevelBuilder from '../LevelBuilder.js';

/**
 * 4-2 "Prism Shafts" - up, down and up again through the cavern's crystal shafts.
 *
 *   0-47    guardian hall (stomp it from the entry ledge), Shaft A: wall-jump climb through a cycling
 *           electric arc. Secret: the shaft's left wall is hollow level with the top ledge (a shard
 *           glints in a pocket behind it).
 *   48-90   upper gallery: flickering glass under falling crystals (shard above), electric gate,
 *           hopping slime and a bat
 *   86-103  Shaft B: drop between two pulsing laser grids
 *   103-130 low hunter tunnel, Shaft C: crystal elevator past spiked walls
 *   130-200 crumbling crystals over a spike pit with orbiting saws (shard), a shielded guardian
 *           to stomp from a high ledge, exit
 */
export default function level_4_2() {
  const W = 200;
  const H = 40;
  const L = new LevelBuilder({ name: 'Prism Shafts', width: W, height: H });
  L.walls(2, 2);

  // ---- Guardian hall + Shaft A (interior x24-26)
  L.solid(2, 2, 20, 22);
  L.solid(0, 34, 27, H - 34);
  L.solid(2, 30, 8, 4);
  L.start(4, 29);
  L.label(7, 26, 'Guardians are shielded in front: stomp them');
  L.enemy('guardian', 14, 33, { dir: -1, range: 7 });
  L.solid(22, 2, 2, 29);
  L.clear(15, 10, 7, 4);
  L.secret(22, 10, 2, 4);
  L.shard(17, 13);
  L.solid(27, 15, 21, H - 15);
  L.label(25, 22, 'Wall-jump up when the arc fades');
  L.electric(24, 25, 3, 'h', { on: 1.1, off: 2.1 });
  L.checkpoint(31, 14);

  // ---- Upper gallery
  L.solid(48, 2, 14, 4);
  L.vanish(49, 15, 3, { on: 2, off: 1.4, phase: 0 });
  L.vanish(54, 14, 3, { on: 2, off: 1.4, phase: 0.85 });
  L.rock(51, 6).rock(58, 6);
  L.shard(55, 9);
  L.solid(59, 15, 27, H - 15);
  L.electric(66, 9, 6, 'v', { on: 1.4, off: 1.4 });
  L.solid(69, 14, 1, 1);
  L.enemy('slime', 76, 14, { hop: true });
  L.enemy('bat', 81, 6, { wake: 200 });

  // ---- Shaft B (interior x86-90): drop through the laser grids
  L.solid(91, 2, 12, 29);
  L.label(80, 12, 'Drop when the beams fade');
  L.laser(86, 21, 5, 'h', { on: 1.4, off: 1.4, phase: 0 });
  L.laser(86, 27, 5, 'h', { on: 1.4, off: 1.4, phase: 0.1 });
  L.solid(86, 34, 60, H - 34);
  L.checkpoint(96, 33);

  // ---- Hunter tunnel + Shaft C elevator (interior x126-129)
  L.solid(103, 2, 21, 26);
  L.solid(105, 33, 1, 1);
  L.enemy('hunter', 116, 33, { range: 9 });
  L.solid(124, 2, 2, 29);
  L.pit(126, 4, 34);
  L.platform(126, 34, 126, 17, 8, 0, 4);
  L.spike(129, 21, 6, 'left');
  L.solid(130, 17, 16, H - 17);
  L.checkpoint(134, 16);

  // ---- Crumbling crystals over spikes, orbiting saws
  L.solid(146, 33, 20, H - 33);
  L.spike(146, 32, 20);
  L.crumble(148, 17, 2).crumble(152, 16, 2).crumble(156, 17, 2).crumble(160, 16, 2);
  L.orbitSaw(154, 11, 2.5, 3.2, 0);
  L.shard(158, 12);

  // ---- Guardian stomp + exit
  L.solid(166, 17, 32, H - 17);
  L.solid(171, 12, 5, 1);
  L.enemy('guardian', 180, 16, { dir: -1 });
  L.label(173, 9, 'Stomp it from above');
  L.exit(194, 16);

  return L.build();
}


