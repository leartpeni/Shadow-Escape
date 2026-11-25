import LevelBuilder from '../LevelBuilder.js';

/**
 * 1-2 "Thornroot Hollow" — first real forest level: thorns, slimes, crumbling roots, bats, blades.
 *
 *   0-41    thorn patch, two mossy mounds with a slime between them (shard high over the slime)
 *   42-80   crumbling root bridge over a bottomless hollow, first bat under an overhang
 *   81-125  blade gap (saw rising out of the hollow), orbiting blade around a hanging lantern (shard)
 *   126-200 crumbling steps up the old trunk (secret tunnel through its base, shard), patrolling bat,
 *           moving platform over the last hollow, exit
 */
export default function level_1_2() {
  const W = 200;
  const H = 30;
  const L = new LevelBuilder({ name: 'Thornroot Hollow', width: W, height: H });

  L.ground(26);
  L.walls(2);

  // ---- Section 1: thorns + first slime
  L.start(4, 25);
  L.label(9, 21, 'Thorns are deadly - jump over them', 'Thorns are deadly - jump over them');
  L.spike(13, 25, 3);
  L.solid(19, 23, 3, 3);
  L.solid(29, 23, 3, 3);
  L.enemy('slime', 25, 25, { speed: 50 });
  L.label(25, 17, 'Land on slimes to squash them');
  L.shard(25, 18);
  L.spike(35, 25, 2);
  L.checkpoint(40, 25);

  // ---- Section 2: crumbling roots + first bat
  L.pit(44, 14);
  L.label(50, 20, 'Crumbling roots - keep moving!');
  L.crumble(45, 26, 3);
  L.crumble(50, 25, 3);
  L.crumble(55, 26, 2);
  L.solid(63, 15, 12, 2);
  L.enemy('bat', 69, 17, { wake: 200 });
  L.label(64, 21, 'Bats swoop: DASH (SHIFT / X) through them', 'Bats swoop: tap DASH to strike them');
  L.enemy('slime', 76, 25);
  L.checkpoint(80, 25);

  // ---- Section 3: blades
  L.solid(86, 23, 8, 3);
  L.pit(94, 4);
  L.solid(98, 23, 8, 3);
  L.saw(96, 29, 96, 19, 3.2, 0);
  L.label(96, 16, 'Watch the blade, then jump');
  L.orbitSaw(112, 20, 2.5, 4, 0);
  L.shard(111, 19);
  L.spike(118, 25, 2);
  L.checkpoint(124, 25);

  // ---- Section 4: the old trunk, secret, platform, exit
  L.crumble(129, 23, 3);
  L.crumble(133, 20, 3);
  L.solid(138, 17, 6, 9);
  // Secret: a hollow through the trunk's base; its far side is an open, suspicious alcove.
  L.secret(139, 23, 4, 3);
  L.clear(143, 23, 1, 3);
  L.shard(141, 25);
  L.enemy('bat', 152, 19, { patrol: 5, wake: 160 });
  L.checkpoint(158, 25);
  L.pit(162, 10);
  L.platform(162, 26, 169, 26, 5, 0, 3);
  L.spike(176, 25, 2);
  L.exit(190, 25);

  return L.build();
}

