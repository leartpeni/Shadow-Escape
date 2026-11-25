import LevelBuilder from '../LevelBuilder.js';

/**
 * 4-4 "Heart of the Colossus" - a short, dense descent to the Prism Colossus.
 *
 *   0-36    crystal throat: hanging crystals that drop, a crumbling bridge over spikes (shard 1
 *           above its middle gap), a slime on the far side
 *   36-75   the chasm: a moving crystal under falling rocks (shard 2 above its path), a bat,
 *           a pulsing electric gate, a sliding laser wall, a guardian
 *   76-110  prism steps: flickering glass over spikes, a drop into a hunter's pit; the pit's
 *           west wall is hollow (secret chamber, shard 3 - its glow leaks through a notch)
 *   113-140 the Colossus's heart (boss arena), exit unseals when the Colossus falls
 */
export default function level_4_4() {
  const W = 143;
  const H = 30;
  const L = new LevelBuilder({ name: 'Heart of the Colossus', width: W, height: H });
  L.walls(2, 2);
  L.ground(26, 0, 38);
  L.ground(26, 52, W - 52); // chasm 38..51
  L.start(4, 25);

  // ---- Section 1: crystal throat
  L.label(6, 21, 'The Colossus stirs below...');
  L.solid(8, 2, 10, 14); // low ceiling, open rows 16..25
  L.rock(11, 16);
  L.rock(14, 16);
  L.clear(18, 26, 9, 2);
  L.spike(18, 27, 9);
  L.crumble(19, 25, 2);
  L.crumble(23, 25, 2);
  L.shard(22, 22);
  L.enemy('slime', 31, 25);
  L.checkpoint(36, 25);

  // ---- Section 2: the chasm
  L.solid(38, 2, 14, 10); // ceiling over the chasm, rocks hang beneath
  L.rock(42, 12);
  L.rock(47, 12);
  L.platform(38, 24, 48, 24, 5, 0, 3);
  L.shard(45, 20);
  L.solid(52, 2, 24, 12); // hall ceiling, open rows 14..25
  L.enemy('bat', 55, 14, { wake: 7 });
  L.electric(58, 14, 12, 'v', { on: 1.4, off: 1.4 });
  L.laser(61, 23, 3, 'v', { always: true, toX: 67, period: 2.8 });
  L.enemy('guardian', 71, 25, { dir: -1, rate: 2.2 });
  L.checkpoint(75, 25);

  // ---- Section 3: prism steps + the hunter's pit
  L.clear(78, 26, 15, 1);
  L.spike(78, 26, 15);
  L.vanish(80, 23, 3, { on: 2, off: 1.4, phase: 0 });
  L.vanish(85, 21, 3, { on: 2, off: 1.4, phase: 0.33 });
  L.vanish(89, 23, 3, { on: 2, off: 1.4, phase: 0.66 });
  L.solid(93, 22, 4, 4); // ledge above the pit
  L.clear(94, 23, 2, 3);
  L.secret(96, 23, 1, 3); // the ledge's pit-facing side is hollow
  L.clear(96, 22, 1, 1); // notch: the chamber glows through
  L.shard(94, 24);
  L.enemy('hunter', 101, 25, { range: 7 });
  L.solid(105, 24, 2, 2); // pit east step
  L.checkpoint(108, 25);

  // ---- Boss arena 113..140, floor row 26, ceiling row 12
  L.solid(111, 2, 2, 20); // entrance wall, 4-tall opening rows 22..25
  L.solid(113, 2, 28, 10);
  L.label(107, 19, 'The Prism Colossus');
  L.boss('prismColossus', { x0: 113, x1: 140, floor: 26, ceiling: 12, gateX: 112 });
  L.exit(138, 25);

  return L.build();
}
