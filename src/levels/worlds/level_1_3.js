import LevelBuilder from '../LevelBuilder.js';

/**
 * 1-3 "Canopy Climb" — up from the forest floor into the treetops.
 *
 *   0-31    forest floor: branch staircase with a slime, side branch (shard), vine lift up
 *   32-83   high branches over the dark: crumbling leaf bridge, roosting bat, moving branch
 *   84-98   hollow trunk: zig-zag branches up to the canopy (secret room in the trunk wall, shard)
 *   91-169  canopy walkway: hopping slime, crumbling leaves around an orbiting blade,
 *           moving branch (shard above it), bobbing blade, crumbling steps to the treetop exit
 */
export default function level_1_3() {
  const W = 170;
  const H = 46;
  const L = new LevelBuilder({ name: 'Canopy Climb', width: W, height: H });

  L.walls(2);
  L.solid(0, 43, 32, 3);

  // ---- Section 1: branch staircase + lift
  L.start(4, 42);
  L.label(10, 36, 'Climb the branches');
  L.solid(9, 40, 4, 1);
  L.solid(15, 37, 4, 1);
  L.solid(20, 34, 8, 1);
  L.enemy('slime', 24, 33, { speed: 45 });
  L.solid(4, 35, 3, 1);
  L.shard(5, 34);
  L.label(29, 37, 'Ride the vine lift');
  L.platform(28, 34, 28, 24, 7, 0, 3);
  L.solid(31, 25, 9, 2);
  L.checkpoint(35, 24);

  // ---- Section 2: crumbling leaf bridge, moving branch
  L.crumble(42, 25, 3);
  L.crumble(47, 24, 3);
  L.crumble(52, 25, 3);
  L.solid(56, 19, 8, 1);
  L.enemy('bat', 60, 20, { wake: 190 });
  L.solid(57, 25, 7, 2);
  L.platform(64, 25, 74, 25, 7, 0, 3);
  L.solid(77, 25, 14, 2);
  L.checkpoint(79, 24);

  // ---- Section 3: hollow trunk, zig-zag branches inside (wall jumps also work)
  L.label(80, 20, 'Hop up inside the hollow trunk');
  L.solid(85, 9, 2, 13);
  L.solid(91, 12, 8, 14);
  L.solid(89, 22, 2, 1);
  L.solid(87, 19, 2, 1);
  L.solid(89, 16, 2, 1);
  L.solid(87, 13, 2, 1);
  // Secret: the trunk wall beside the third branch is hollow and opens into a small room.
  L.secret(91, 15, 2, 3);
  L.clear(93, 15, 4, 3);
  L.clear(97, 16, 2, 1); // a knothole: the room glows through the trunk's east face
  L.shard(95, 17);

  // ---- Section 4: canopy walkway
  L.solid(99, 12, 12, 2);
  L.checkpoint(100, 11);
  L.enemy('slime', 106, 11, { hop: true, speed: 50 });
  L.crumble(112, 12, 2);
  L.crumble(116, 12, 2);
  L.orbitSaw(115, 9, 2.5, 3.5, 0);
  L.solid(119, 12, 8, 2);
  L.checkpoint(124, 11);
  L.platform(127, 12, 135, 12, 5.5, 0, 3);
  L.shard(132, 7);
  L.solid(138, 12, 7, 2);
  L.saw(141.5, 6.5, 141.5, 11.4, 2.6, 0);
  L.crumble(146, 10, 3);
  L.crumble(150, 9, 3);
  L.solid(154, 9, 14, 2);
  L.enemy('slime', 158, 8, { speed: 45 });
  L.exit(163, 8);

  return L.build();
}
