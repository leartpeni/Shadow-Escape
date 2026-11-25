import LevelBuilder from '../LevelBuilder.js';

/**
 * 3-2 "Clockwork Ramparts" � through the castle's clock tower and along its walls.
 *
 *   0-45    gear hall: two orbiting gear-blades under a low ceiling, crumbling stones over a pit
 *   46-59   clock tower: elevator platform, then a wall-jump shaft on the right.
 *           Secret: the left shaft's outer wall is hollow (rows 10-12) -> hidden alcove + shard
 *   60-95   ramparts: Light Guardian introduction (stomp it from the higher rampart)
 *   96-122  crumbling crenel bridge, Void Hunter penned behind a merlon
 *   123-153 clockwork bridge: two moving platforms around a blade-guarded pillar (shard above)
 *   154-185 crumbling stairs down to a tracking Light Guardian (stomp it)
 *   186-219 descent shaft (shard tucked under the shelf), low exit hall with a bat
 */
export default function level_3_2() {
  const W = 220;
  const H = 36;
  const L = new LevelBuilder({ name: 'Clockwork Ramparts', width: W, height: H });

  L.walls(2);
  L.solid(0, 32, 60, 4);

  // ---- Gear hall
  L.start(4, 31);
  L.solid(2, 0, 44, 24); // castle mass above the hall
  L.label(8, 27, 'The gears never stop - slip beneath them');
  L.orbitSaw(12, 28, 3, 2.4, 0);
  L.orbitSaw(23, 28, 3, -2.4, 0.5);
  L.pit(30, 10, 32);
  L.crumble(32, 32, 2);
  L.crumble(36, 32, 2);
  L.checkpoint(43, 31);

  // ---- Clock tower (interior 48-57): elevator in the left shaft, wall-jump shaft on the right
  L.solid(46, 4, 2, 24); // left outer wall (entrance below)
  L.solid(58, 8, 2, 24); // right outer wall = start of the ramparts
  L.solid(52, 6, 2, 12); // inner wall between the two shafts
  L.solid(52, 20, 6, 1); // ledge at the top of the elevator
  L.platform(48, 31, 48, 19, 5, 0, 4);
  L.label(53, 25, 'Ride up, then wall-jump');
  // Secret alcove behind the left shaft's outer wall
  L.secret(46, 10, 2, 3);
  L.clear(40, 10, 6, 3);
  L.shard(41, 12);

  // ---- Ramparts (walkway top on row 8)
  L.solid(60, 8, 16, 3);
  L.checkpoint(62, 7);
  L.solid(76, 11, 15, 3); // lower walkway: hop off the rampart onto the guardian's head
  L.enemy('guardian', 80, 10, { range: 7 });
  L.label(80, 4, 'Light Guardians are shielded in front:');
  L.label(80, 5, 'stomp them or DASH into their back');
  L.solid(91, 8, 5, 3);
  L.crumble(98, 8, 2);
  L.crumble(102, 8, 2);
  L.solid(106, 8, 17, 3);
  L.checkpoint(108, 7);
  L.solid(111, 7, 1, 1); // merlon that keeps the hunter penned
  L.enemy('hunter', 118, 7, { range: 7 });

  // ---- Clockwork bridge
  L.platform(124, 8, 130, 8, 4, 0);
  L.shard(128, 3);
  L.solid(134, 8, 3, 28); // pillar: a safe stop
  L.solid(138, 0, 1, 1); // barrier anchor
  L.electric(138, 1, 8, 'v', { on: 2, off: 2, phase: 0.25, warn: 0.5 }); // off while the lift below is near
  L.platform(140, 8, 146, 8, 4, 0.5);
  L.solid(150, 6, 4, 30);
  L.checkpoint(151, 5);

  // ---- Crumbling stairs and a tracking guardian
  L.crumble(155, 9, 2);
  L.crumble(159, 12, 2);
  L.crumble(163, 15, 2);
  L.solid(166, 18, 20, 18);
  L.enemy('guardian', 176, 17, { rate: 2.2 });

  // ---- Descent shaft (186-189) and the low exit hall
  L.solid(190, 18, 28, 8);
  L.solid(166, 30, 52, 6);
  L.solid(186, 22, 2, 1); // shelf
  L.spike(189, 23, 3, 'left');
  L.shard(187, 25);
  L.enemy('bat', 200, 26, { wake: 200 });
  L.spike(204, 29, 1);
  L.exit(214, 29);

  return L.build();
}


