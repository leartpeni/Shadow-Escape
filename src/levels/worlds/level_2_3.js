import LevelBuilder from '../LevelBuilder.js';

/**
 * 2-3 "Laser Vaults" – the sealed treasure vaults of the ruins, still guarded by
 * pulsing lasers and Light Guardians.
 *
 *   0-40    laser hall: one pulsing beam, an alternating pair, a head-high beam over a slime (dash, don't jump)
 *   41-77   guardians: one facing a wall (strike its back), one below a ledge (stomp; shard 1 on a ledge)
 *   77-125  the vault: moving platforms over the abyss between pulsing beams, a vertical lift
 *           (shard 3 above it), a ride under a sinking scanner beam
 *   126-150 laser shaft: climb ledges between beams that switch off from the top down (secret: the west wall beside the 4th
 *           ledge is hollow, a crack in the vault ceiling shows its glow -> shard 2)
 *   151-217 treasury: crumbling bridge over spikes under a beam, a roaming beam, guardian, exit
 */
export default function level_2_3() {
  const W = 220;
  const H = 34;
  const L = new LevelBuilder({ name: 'Laser Vaults', width: W, height: H });
  L.walls(2, 2);

  // ---- Section 1: laser hall
  L.ground(28, 0, 40);
  L.start(4, 27);
  L.solid(10, 2, 30, 18); // ceiling, open rows 20..27
  L.label(7, 22, 'Lasers pulse - wait for the gap');
  L.laser(14, 20, 8, 'v', { on: 1.4, off: 1.6 });
  L.laser(20, 20, 8, 'v', { on: 1.5, off: 1.5, phase: 0 });
  L.laser(24, 20, 8, 'v', { on: 1.5, off: 1.5, phase: 0.5 });
  L.label(30, 23, 'Low beam - don\'t jump!');
  L.clear(28, 28, 11, 1); // shallow trench keeps the slime under the beam
  L.laser(30, 27, 6, 'h', { always: true });
  L.enemy('slime', 33, 28, { speed: 50 });

  // ---- Section 2: guardians
  L.ground(28, 40, 37);
  L.checkpoint(41, 27);
  L.label(45, 22, 'Guardians: shield in front - strike their back');
  L.enemy('guardian', 50, 27, { dir: 1 });
  L.solid(54, 25, 2, 3);
  L.solid(59, 25, 2, 3);
  L.solid(61, 22, 4, 6);
  L.enemy('guardian', 68, 27, { rate: 2.2 });
  L.solid(71, 23, 3, 1);
  L.shard(72, 22);
  L.solid(75, 25, 5, 9);

  // ---- Section 3: the vault
  L.checkpoint(77, 24);
  L.solid(80, 2, 48, 10); // vault ceiling, open rows 12..
  L.pit(80, 40, 25);
  L.platform(81, 24, 88, 24, 5, 0, 3);
  L.laser(92, 12, 22, 'v', { on: 1.4, off: 1.6 });
  L.solid(93, 25, 3, 9);
  L.platform(97, 26, 97, 18, 4.5, 0, 3);
  L.shard(98, 14);
  L.laser(101, 12, 22, 'v', { on: 1.2, off: 1.6, phase: 0.3 });
  L.solid(102, 22, 3, 12);
  L.platform(106, 22, 116, 22, 6, 0, 3);
  L.laser(106, 12, 13, 'h', { always: true, toY: 19.6, period: 5 });
  L.solid(120, 23, 6, 11);
  L.checkpoint(122, 22);

  // ---- Section 4: laser shaft (x128..138)
  L.ground(23, 126, 13);
  L.solid(139, 7, 2, 16);
  L.solid(134, 20, 4, 1);
  L.solid(129, 17, 4, 1);
  L.solid(134, 14, 4, 1);
  L.solid(128, 11, 5, 1);
  L.solid(134, 8, 5, 1);
  L.laser(128, 18, 11, 'h', { on: 1.2, off: 1.8, phase: 0 });
  L.laser(128, 15, 11, 'h', { on: 1.2, off: 1.8, phase: 0.1 });
  L.laser(128, 12, 11, 'h', { on: 1.2, off: 1.8, phase: 0.2 });
  L.laser(128, 9, 11, 'h', { on: 1.2, off: 1.8, phase: 0.3 });
  // secret alcove inside the vault ceiling
  L.secret(126, 8, 2, 3);
  L.clear(121, 8, 5, 3);
  L.clear(123, 11, 1, 1); // crack: the shard glows through the vault ceiling
  L.shard(122, 10);

  // ---- Section 5: corridor + treasury
  L.solid(139, 2, 12, 1);
  L.ground(7, 139, 12);
  L.ground(20, 151, 67);
  L.checkpoint(154, 19);
  L.enemy('guardian', 163, 19, { rate: 2.0 });
  L.clear(170, 20, 9, 2);
  L.spike(170, 21, 9);
  L.crumble(170, 19, 3);
  L.crumble(173, 19, 3);
  L.crumble(176, 19, 3);
  L.laser(174, 2, 17, 'v', { on: 1.4, off: 1.8 });
  L.laser(184, 2, 18, 'v', { on: 1.6, off: 1.6, phase: 0.5, toX: 190, period: 5 });
  L.enemy('guardian', 199, 19, { burst: 2, rate: 2.2 });
  L.exit(212, 19);

  return L.build();
}
