import LevelBuilder from '../LevelBuilder.js';

/**
 * 3-1 "Castle Gate" — arrival at the Shadow Castle (world 3 opener, medium).
 *
 *   0-30    drawbridge moat (crumbling bridge stone), portcullis gate
 *   30-49   outer courtyard: Night Bat under an arch
 *   50-57   wall-jump chimney up the keep wall (secret: hollow stone at its foot)
 *   56-90   ramparts: blade in a crenel gap, blade sweeping the walkway, high shard
 *   91-118  inner ward: Void Hunter introduction (it patrols a raised dais)
 *   118-131 gatehouse with an electric barrier
 *   132-158 vanishing platforms over the chasm (shard above)
 *   158-199 keep entrance, bats, exit portal
 */
export default function level_3_1() {
  const W = 200;
  const H = 30;
  const L = new LevelBuilder({ name: 'Castle Gate', width: W, height: H });

  L.ground(26);
  L.walls(2);

  // ---- Drawbridge & moat
  L.start(4, 25);
  L.label(9, 21, 'The Shadow Castle');
  L.pit(14, 8, 26);
  L.crumble(17, 26, 2);
  L.label(18, 22, 'Old stones crumble - keep moving');
  // Portcullis: a low gate with iron teeth hanging from it
  L.solid(25, 12, 3, 10);
  L.spike(25, 22, 3, 'down');

  // ---- Outer courtyard: a bat under an arch
  L.solid(33, 18, 9, 2);
  L.solid(33, 20, 1, 2);
  L.solid(41, 20, 1, 2);
  L.enemy('bat', 37, 20, { wake: 240 });
  L.label(37, 15, 'Bats wake up when you come close: stomp or DASH into them');
  L.spike(44, 25, 2);
  L.checkpoint(48, 25);

  // ---- Wall-jump chimney up the keep (walls 50-51 and 56+)
  L.solid(50, 6, 2, 17); // left chimney wall, gap underneath to walk in
  L.solid(56, 10, 35, 16); // keep block, rampart walkway on row 10
  L.label(53, 4, 'Wall-jump up the chimney');
  // Secret: hollow stones at the chimney's foot lead into a vault (visible cavity + shard glint)
  L.secret(56, 23, 2, 3);
  L.clear(58, 23, 4, 3);
  L.shard(60, 25);

  // ---- Ramparts
  L.solid(63, 9, 1, 1); // merlons
  L.pit(66, 4, 10);
  L.solid(66, 14, 4, 12);
  L.spike(66, 13, 4);
  L.saw(68, 13, 68, 6, 2.6, 0);
  L.checkpoint(73, 9);
  L.saw(77, 9.45, 87, 9.45, 3.4, 0);
  L.shard(81, 3);
  L.solid(89, 9, 2, 1);

  // ---- Inner ward: Void Hunter
  // The hunter prowls a raised dais and ignores you while you stay on the lower floor.
  L.solid(100, 24, 18, 2);
  L.label(104, 18, 'Void Hunters charge on sight - jump over them or DASH into them');
  L.enemy('hunter', 110, 23, { range: 8 });
  L.solid(118, 23, 14, 3); // gatehouse floor step
  L.checkpoint(120, 22);

  // ---- Gatehouse with an electric barrier
  L.solid(124, 8, 5, 10);
  L.electric(126, 18, 5, 'v', { on: 1.6, off: 1.4, warn: 0.5 });
  L.label(126, 6, 'Electric barriers pulse - wait for the gap');

  // ---- Chasm with vanishing platforms
  L.pit(132, 26);
  L.vanish(134, 23, 3, { on: 2.6, off: 1.2, phase: 0 });
  L.vanish(140, 21, 3, { on: 2.6, off: 1.2, phase: 0.75 });
  L.vanish(146, 23, 3, { on: 2.6, off: 1.2, phase: 0.5 });
  L.vanish(152, 21, 3, { on: 2.6, off: 1.2, phase: 0.25 });
  L.shard(141, 17);

  // ---- Keep entrance
  L.solid(158, 23, 40, 3);
  L.solid(158, 26, 40, 4);
  L.checkpoint(160, 22);
  L.enemy('bat', 172, 17, { wake: 240 });
  L.solid(168, 16, 9, 1);
  L.spike(176, 22, 2);
  L.solid(184, 8, 2, 11); // keep arch
  L.exit(192, 22);

  return L.build();
}
