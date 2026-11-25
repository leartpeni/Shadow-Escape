import LevelBuilder from '../LevelBuilder.js';

/**
 * 3-4 "Noctis' Belfry" - a short climb through the bell tower, then Count Noctis' bell chamber.
 *
 *   0-46    courtyard: spike pair, a spinning blade to slip under, a vanishing plank over a pit
 *           (shard 1 above it), a roosting bat
 *   47-76   belfry tower: ride the bell-rope lift, cross a crumbling bridge cut by a spark barrier
 *           (shard 2 sits in the arc - grab it while it's off), dash through a Void Hunter
 *   77-97   clapper hall: two swinging clapper blades along the floor. Secret: the tower's east face
 *           (below the hunter's ledge) is hollow at floor level -> hidden crypt, its shard glints through
 *   98-129  Count Noctis' bell chamber (boss arena), exit unseals when the Count falls
 */
export default function level_3_4() {
  const W = 132;
  const H = 30;
  const L = new LevelBuilder({ name: "Noctis' Belfry", width: W, height: H });

  L.ground(26);
  L.walls(2, 2);
  L.start(4, 25);

  // ---- Courtyard
  L.label(7, 21, "Noctis' Belfry");
  L.spike(11, 25, 2);
  L.orbitSaw(20, 22, 3, 2.4, 0);
  L.pit(28, 6);
  L.vanish(29, 25, 3, { on: 2, off: 1.4, phase: 0 });
  L.shard(30, 21);
  L.enemy('bat', 40, 18, { wake: 300 });
  L.checkpoint(45, 25);

  // ---- Belfry tower
  L.solid(48, 4, 2, 18); // west tower wall, enter underneath (rows 22-25)
  L.platform(50, 25, 50, 12, 5, 0, 3); // bell-rope lift
  L.label(46, 16, 'Ride the bell rope');
  L.solid(53, 13, 6, 13); // landing block (top row 13)
  L.spike(59, 25, 8);
  L.crumble(60, 13, 2);
  L.crumble(64, 13, 2);
  L.solid(62, 2, 1, 3); // spark post anchor hanging from the roof
  L.electric(62, 5, 8, 'v', { on: 1.4, off: 1.6, warn: 0.45 });
  L.shard(62, 10);
  L.solid(67, 14, 10, 12); // hunter ledge (one step down from the bridge)
  L.enemy('hunter', 73, 13, { range: 6 });
  

  // ---- Clapper hall
  L.solid(77, 2, 21, 10); // hall roof (rows 2-11)
  L.checkpoint(79, 25);
  L.saw(82, 15, 82, 25, 2.2, 0);
  L.saw(90, 15, 90, 25, 2.2, 0.5);
  L.secret(75, 23, 2, 3); // hollow east face of the hunter ledge
  L.clear(70, 23, 5, 3);
  L.shard(71, 25);
  L.checkpoint(95, 25);

  // ---- Boss arena 100..129, floor row 26, ceiling row 12
  L.solid(98, 2, 32, 10); // chamber roof (rows 2-11)
  L.solid(98, 2, 2, 20); // entrance wall, 4-tall opening rows 22-25
  L.label(93, 18, 'The bells toll for thee...');
  L.boss('countNoctis', { x0: 100, x1: 129, floor: 26, ceiling: 12, gateX: 99 });
  L.exit(127, 25);

  return L.build();
}
