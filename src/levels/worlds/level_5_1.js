import LevelBuilder from '../LevelBuilder.js';

/**
 * 5-1 "Edge of Nothing" — first steps into the Void. Floating islands over a
 * bottomless dark; every old trick returns, now in pairs.
 *
 *   0-44    spike lip + pit (double jump), orbiting blade guarding a shard
 *   45-80   wave of vanishing platforms                        -> CP 1
 *   81-100  crumbling bridge under a slab of falling rocks (keep moving!)
 *   101-128 twin lasers, a Void Hunter on a raised shelf       -> CP 2
 *   129-171 moving platform, vertical lift, bat under an overhang
 *           (SECRET: the overhang's cracked underside hides a shard)
 *   172-199 drop down, Light Guardian, electric barrier, exit  (CP 3)
 */
export default function level_5_1() {
  const W = 200;
  const H = 32;
  const L = new LevelBuilder({ name: 'Edge of Nothing', width: W, height: H });
  L.walls(2);

  // ---- A: spike lip, pit, orbit blade
  L.ground(26, 0, 22);
  L.start(4, 25);
  L.label(9, 21, 'The Void swallows everything that falls');
  L.enemy('slime', 16, 25, { hop: true });
  L.spike(19, 25, 2);
  L.ground(24, 26, 7); // P1
  L.ground(22, 38, 7); // P2
  L.orbitSaw(35.5, 19.5, 2.5, 3.2);
  L.shard(35, 19); // in the eye of the orbiting blade

  // ---- B: vanishing wave
  const vp = { on: 2.0, off: 1.2 };
  L.vanish(47, 22, 3, { ...vp, phase: 0 });
  L.vanish(53, 22, 3, { ...vp, phase: 0.78 });
  L.vanish(59, 22, 3, { ...vp, phase: 0.56 });
  L.vanish(65, 22, 3, { ...vp, phase: 0.34 });
  L.ground(22, 71, 10); // P3
  L.checkpoint(73, 21);

  // ---- C: crumble bridge under falling rocks
  L.solid(80, 12, 21, 3);
  for (const x of [82, 88, 94]) {
    L.crumble(x, 22, 3, { delay: 0.45, respawn: 2.4 });
    L.rock(x + 1, 15);
  }
  L.shard(86, 17); // needs a full jump between two crumbling floors

  // ---- D: twin lasers + hunter shelf
  L.ground(22, 100, 17); // P4 low part 100-116
  L.ground(21, 117, 9); // raised hunter shelf 117-125
  L.ground(18, 126, 3); // safe block 126-128 (hunter can't see or reach it)
  L.solid(103, 12, 12, 3);
  L.spike(103, 15, 12, 'down');
  L.laser(106, 15, 7, 'v', { on: 1.2, off: 1.6, phase: 0 });
  L.laser(111, 15, 7, 'v', { on: 1.2, off: 1.6, phase: 0 });
  L.enemy('hunter', 122, 20, { range: 9 });
  L.checkpoint(127, 17);

  // ---- E: moving platform, island, lift, overhang with bat (+ secret)
  L.platform(130, 20, 139, 20, 6.4, 0, 3);
  L.ground(19, 145, 5); // island I1 145-149
  L.electric(147, 13, 6, 'v', { on: 1.3, off: 1.5, phase: 0.3 });
  L.platform(151, 19, 151, 11, 5.4, 0, 3);
  L.solid(156, 11, 15, 3); // high ledge 156-170
  L.solid(158, 3, 12, 4); // overhang rows 3-6
  L.secret(165, 4, 2, 3);
  L.clear(167, 6, 1, 1); // a crack in the overhang's underside
  L.shard(166, 5);
  L.enemy('bat', 161, 7, { wake: 150 });

  // ---- F: drop, guardian, electric barrier, exit
  L.ground(22, 172, W - 172);
  L.checkpoint(175, 21);
  L.enemy('guardian', 183, 21, { rate: 2.0 });
  L.electric(189, 14, 8, 'v', { on: 1.4, off: 1.4, phase: 0 });
  L.label(192, 17, 'Light lies beyond');
  L.exit(195, 21);

  return L.build();
}
