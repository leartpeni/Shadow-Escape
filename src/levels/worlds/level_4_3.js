import LevelBuilder from '../LevelBuilder.js';

/**
 * 4-3 "Refraction Maze" - forked crystal halls, light bent into moving walls.
 *
 *   0-50    prism hall: sliding laser walls to hop (jump/double jump), slime, pulsing electric gate
 *   50-94   the fork: flickering glass stair up to the high road (shard above it) where a guardian
 *           stands guard, or the low road under it where a hunter prowls; both meet at crystal steps
 *   94-150  moving crystal over a spike pit under falling rocks (shard above), then a low hall of
 *           rising and falling saws
 *   150-172 refraction well: zig-zag ledges split by a pulsing laser column, a bat near the top.
 *           Secret: the well's left wall is hollow beside the third ledge (shard inside)
 *   172-220 high run: flickering glass over spikes, a hunter, a sliding laser wall, exit
 */
export default function level_4_3() {
  const W = 220;
  const H = 34;
  const L = new LevelBuilder({ name: 'Refraction Maze', width: W, height: H });
  L.walls(2, 2);
  L.solid(0, 28, W, H - 28);

  // ---- Prism hall (rows 16-27)
  L.solid(2, 2, 48, 14);
  L.start(4, 27);
  L.label(8, 23, 'Light walls slide: jump them');
  L.laser(13, 25, 3, 'v', { always: true, toX: 19, period: 2.8 });
  L.laser(26, 25, 3, 'v', { always: true, toX: 32, period: 2.8, movePhase: 0.5 });
  L.solid(37, 27, 1, 1);
  L.solid(44, 27, 1, 1);
  L.enemy('slime', 41, 27);
  L.electric(47, 16, 12, 'v', { on: 1.2, off: 1.6 });

  // ---- The fork: glass stair to the high road, low road below
  L.vanish(51, 25, 3, { on: 2.4, off: 1.2, phase: 0 });
  L.vanish(55, 22, 3, { on: 2.4, off: 1.2, phase: 0.2 });
  L.vanish(59, 19, 3, { on: 2.4, off: 1.2, phase: 0.4 });
  L.shard(60, 13);
  L.solid(63, 16, 24, 2);
  L.label(66, 12, 'High road or low road?');
  L.enemy('guardian', 77, 15, { dir: -1, range: 9 });
  L.solid(64, 27, 1, 1);
  L.enemy('hunter', 76, 27, { range: 8 });
  L.solid(88, 25, 6, 3);
  L.solid(90, 22, 4, 3);
  L.solid(92, 19, 2, 3);
  L.solid(94, 16, 12, 12);
  L.checkpoint(97, 15);

  // ---- Spike pit: moving crystal under falling rocks
  L.spike(106, 27, 16);
  L.solid(106, 2, 16, 8);
  L.rock(110, 10).rock(117, 10);
  L.platform(106, 16, 119, 16, 5, 0, 3);
  L.shard(113, 12);

  // ---- Saw hall (rows 20-27)
  L.solid(126, 2, 26, 18);
  L.label(124, 24, 'Run under the saws as they rise');
  for (let i = 0; i < 5; i++) L.saw(129 + i * 4, 21, 129 + i * 4, 28, 1.6, ((10 - 3 * i) % 10) / 10);
  L.checkpoint(148, 27);

  // ---- Refraction well (x152-171): zig-zag ledges split by a laser column
  L.solid(153, 25, 6, 1);
  L.solid(164, 22, 5, 1);
  L.solid(152, 19, 7, 1);
  L.solid(164, 16, 5, 1);
  L.solid(153, 13, 6, 1);
  L.solid(164, 10, 5, 1);
  L.laser(161, 2, 26, 'v', { on: 1, off: 1.8 });
  L.clear(146, 16, 4, 3);
  L.secret(150, 16, 2, 3);
  L.shard(147, 18);
  L.enemy('bat', 166, 4, { wake: 5 });

  // ---- High run (floor top 8)
  L.solid(172, 8, W - 172, H - 8);
  L.checkpoint(175, 7);
  L.clear(182, 8, 7, 18);
  L.spike(182, 25, 7);
  L.vanish(184, 8, 3, { on: 1.6, off: 1.2 });
  L.solid(191, 7, 1, 1);
  L.enemy('hunter', 198, 7, { range: 8 });
  L.laser(203, 5, 3, 'v', { always: true, toX: 209, period: 2.6 });
  L.exit(214, 7);

  return L.build();
}
