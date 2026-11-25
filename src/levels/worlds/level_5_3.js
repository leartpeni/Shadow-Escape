import LevelBuilder from '../LevelBuilder.js';

/**
 * 5-3 "The Long Dark" - a long march through the lightless middle of the Void.
 *
 *   0-28    the shore: a blade rises and falls in the first rift
 *   28-55   rock alley: a ceiling of hanging rocks, a spike strip to hop (shard 1),
 *           an electric gate at the far end                               -> CP 1
 *   56-104  the void bridge: blinking stones, a ferry under an orbiting blade (shard 2
 *           in the blade's eye), a bat roosting over the landing          -> CP 2
 *   104-148 hunters' trench: a low corridor, two Void Hunters, a spike pit
 *           (SECRET: a cracked patch in the trench roof hides shard 3)    -> CP 3
 *   150-202 crumbling causeway between pulsing lasers, then the "low sky":
 *           a travelling beam sweeps just above head height - only jump when it's away -> CP 4
 *   202-250 the last ferry, a Light Guardian on the island, blinking stones, exit
 */
export default function level_5_3() {
  const W = 250;
  const H = 34;
  const L = new LevelBuilder({ name: 'The Long Dark', width: W, height: H });
  L.walls(2);

  // ---- A: the shore + rising blade
  L.ground(26, 0, 16);
  L.start(4, 25);
  L.label(8, 21, 'Nothing lights the way now');
  L.saw(19, 20, 19, 29, 2.4);
  L.ground(25, 22, 34); // 22..55

  // ---- rock alley
  L.solid(30, 13, 16, 4); // ceiling rows 13-16
  for (const x of [32, 36, 40, 44]) L.rock(x, 17);
  L.spike(38, 24, 2);
  L.shard(38, 21);
  L.electric(49, 15, 10, 'v', { on: 1.4, off: 1.4 });
  L.checkpoint(53, 24);

  // ---- B: void bridge
  const vb = { on: 1.8, off: 1.2 };
  L.vanish(58, 23, 3, { ...vb, phase: 0 });
  L.vanish(63, 21, 3, { ...vb, phase: 0.6 });
  L.solid(68, 23, 3, 1); // a lone floating stone: wait here for the ferry
  L.platform(73, 22, 83, 22, 6, 0, 3);
  L.orbitSaw(79, 17, 2.4, 3.2);
  L.shard(78, 16);
  L.ground(23, 89, 61); // 89..149
  L.solid(91, 10, 9, 4); // roost
  L.enemy('bat', 95, 14, { wake: 300 });
  L.checkpoint(101, 22);

  // ---- C: hunters' trench (open rows 18..22)
  L.solid(106, 10, 42, 8); // roof rows 10-17
  L.enemy('hunter', 118, 22, { range: 9 });
  L.clear(126, 23, 3, 2);
  L.spike(126, 24, 3);
  L.enemy('hunter', 136, 22, { range: 9 });
  // secret: cracked roof patch with a pocket above it
  L.clear(139, 14, 5, 3); // pocket rows 14-16
  L.secret(140, 17, 2, 1); // the crack
  L.clear(143, 17, 1, 1); // a notch beside it lets the shard's glow leak out
  L.shard(141, 15);
  L.solid(145, 20, 5, 3); // raised step out of the hunters' sight
  L.checkpoint(147, 19);

  // ---- D: crumbling causeway between lasers
  for (const x of [152, 157, 162, 167]) L.crumble(x, 23, 3, { delay: 0.45, respawn: 2.4 });
  L.solid(150, 8, 23, 2);
  L.laser(155, 10, 13, 'v', { on: 1.2, off: 1.6, phase: 0 });
  L.laser(165, 10, 13, 'v', { on: 1.2, off: 1.6, phase: 0.45 });
  L.ground(24, 172, 30); // 172..201 (one step below the crumbles)
  L.label(175, 19, 'Keep your head down');
  L.solid(176, 10, 24, 2); // emitter rail
  L.laser(178, 12, 9, 'v', { always: true, toX: 196, period: 5 }); // rows 12-20, stand under it
  L.spike(184, 23, 2);
  L.spike(191, 23, 2);
  L.checkpoint(199, 23);

  // ---- E: last ferry, guardian island, blinking stones, exit
  L.platform(204, 23, 214, 23, 6, 0, 3);
  L.orbitSaw(212, 18, 2.2, -3);
  L.ground(23, 220, 10); // island 220..229
  L.enemy('guardian', 226, 22, { dir: -1, rate: 2.0, range: 7 });
  L.vanish(232, 22, 3, { on: 1.6, off: 1.2, phase: 0 });
  L.vanish(237, 21, 3, { on: 1.6, off: 1.2, phase: 0.64 });
  L.ground(23, 242, W - 242);
  L.exit(246, 22);

  return L.build();
}


