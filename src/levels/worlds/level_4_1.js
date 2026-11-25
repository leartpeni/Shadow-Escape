import LevelBuilder from '../LevelBuilder.js';

/**
 * 4-1 "Glimmer Descent" - first steps into the Crystal Caverns.
 *
 *   0-51    crumbling crystal bridge, falling crystal stalactites
 *   52-104  pulsing lasers, flickering glass platforms over a chasm, hopping slime
 *   105-149 crumble hops over a spike pit (a bat wakes above), sliding laser hurdles
 *   150-209 electric barrier, moving platforms, a Void Hunter ledge, exit
 * Secret: the hunter ledge's right face (seen from the exit floor) hides a crystal pocket.
 */
export default function level_4_1() {
  const W = 210;
  const H = 30;
  const L = new LevelBuilder({ name: 'Glimmer Descent', width: W, height: H });
  L.walls(2, 2);

  // ---- Section 1: crumbling bridge + falling crystals
  L.solid(0, 16, 22, H - 16);
  L.start(4, 15);
  L.label(12, 11, 'Cracked crystal crumbles underfoot');
  L.crumble(22, 16, 3).crumble(25, 16, 3);
  L.shard(25, 13);
  L.solid(28, 18, 24, H - 18);
  L.solid(30, 2, 14, 6);
  L.rock(33, 8).rock(37, 8).rock(41, 8);
  L.label(37, 12, 'Falling crystals: keep moving!');
  L.checkpoint(49, 17);

  // ---- Section 2: lasers + vanishing glass over a chasm
  L.solid(52, 2, 48, 5);
  L.solid(52, 18, 10, H - 18);
  L.label(48, 12, 'Lasers pulse: cross when they fade');
  L.laser(57, 7, 11, 'v', { on: 1.2, off: 1.6 });
  L.label(70, 10, 'Glass platforms flicker away');
  L.vanish(63, 18, 3, { on: 2, off: 1.4, phase: 0 });
  L.vanish(68, 17, 3, { on: 2, off: 1.4, phase: 0.5 });
  L.vanish(73, 18, 3, { on: 2, off: 1.4, phase: 0 });
  L.shard(69, 13);
  L.solid(78, 18, 27, H - 18);
  L.laser(84, 7, 11, 'v', { on: 1, off: 1.5, phase: 0 });
  L.laser(89, 7, 11, 'v', { on: 1, off: 1.5, phase: 0.5 });
  L.enemy('slime', 96, 17, { hop: true });
  L.checkpoint(103, 17);

  // ---- Section 3: crumble hops over spikes, bat, laser hurdles
  L.solid(100, 2, 50, 4);
  L.solid(105, 28, 17, H - 28);
  L.spike(105, 27, 17);
  L.crumble(106, 19, 2).crumble(110, 20, 2).crumble(114, 19, 2).crumble(118, 20, 2);
  L.solid(110, 6, 8, 4);
  L.enemy('bat', 114, 10, { wake: 260 });
  L.solid(122, 19, 38, H - 19);
  L.label(131, 14, 'Jump the sliding beams');
  L.laser(127, 18, 2, 'h', { always: true, toX: 132, period: 3.2 });
  L.laser(140, 18, 2, 'h', { always: true, toX: 145, period: 2.8, movePhase: 0.5 });
  L.checkpoint(148, 18);

  // ---- Section 4: electric barrier, moving platforms, hunter, exit
  L.solid(150, 2, 12, 11);
  L.label(140, 10, 'Electric arcs cycle too');
  L.electric(155, 13, 6, 'v', { on: 1.6, off: 1.2 });
  L.platform(161, 19, 169, 19, 4, 0);
  L.platform(174, 20, 174, 13, 4, 0.25);
  L.solid(178, 15, 10, H - 15);
  L.enemy('hunter', 185, 14, { range: 8 });
  // Secret pocket inside the ledge, entered from its right face; a crack shows the shard.
  L.secret(180, 16, 8, 3);
  L.clear(181, 18, 1, 1);
  L.shard(181, 18);
  L.solid(188, 19, 20, H - 19);
  L.label(198, 14, 'Into the deep caverns');
  L.exit(203, 18);

  return L.build();
}
