import LevelBuilder from '../LevelBuilder.js';

/**
 * 1-4 "Mossback's Grove" — a short walk through the King's grove, then the boss.
 *
 *   0-40    grove path: thorns, a slime between a stump and a hollow log (secret tunnel
 *           through the log, shard; a knothole on its far end gives it away), high branch (shard)
 *           guarded by a roosting bat
 *   41-58   crumbling root steps over a hollow
 *   58-74   thorn bed guarded by an orbiting blade (time the jump), hopping slime on a mound
 *   74-99   moving branch across the last hollow (shard above its path), patrolling bat,
 *           checkpoint before the gate
 *   100-131 Mossback's arena (x0 101 .. x1 130, floor 22, ceiling 8), exit at the far end
 */
export default function level_1_4() {
  const W = 134;
  const H = 26;
  const L = new LevelBuilder({ name: "Mossback's Grove", width: W, height: H });

  L.ground(22);
  L.walls(2);

  // ---- Section 1: grove path, hollow log secret, high branch
  L.start(4, 21);
  L.label(8, 17, "The Slime King's grove...");
  L.spike(11, 21, 2);
  L.solid(15, 20, 2, 2);
  L.enemy('slime', 21, 21, { speed: 55 });
  L.solid(26, 19, 6, 1);
  // Secret: the log is hollow; the knothole on its east end hints at it.
  L.secret(26, 20, 6, 2);
  L.clear(31, 20, 1, 1);
  L.shard(28, 21);
  L.solid(34, 16, 3, 1);
  L.shard(35, 14);
  L.solid(36, 10, 4, 1);
  L.enemy('bat', 37, 11, { wake: 150 }); // guards the branch shard
  L.checkpoint(39, 21);

  // ---- Section 2: crumbling root steps
  L.pit(42, 15);
  L.crumble(42, 21, 3);
  L.crumble(47, 20, 3);
  L.crumble(52, 20, 3);

  // ---- Section 3: thorn bed under an orbiting blade
  L.label(62, 14, 'Wait for the blade to swing up');
  L.spike(62, 21, 3);
  L.orbitSaw(63.5, 18.5, 2.5, 4, 0);
  L.solid(67, 20, 6, 2);
  L.enemy('slime', 70, 19, { hop: true, speed: 45 });
  L.checkpoint(74, 21);

  // ---- Section 4: moving branch, patrolling bat, gate
  L.pit(77, 11);
  L.platform(77, 22, 84, 22, 5, 0, 3);
  L.shard(82, 17);
  L.enemy('bat', 83, 13, { patrol: 4, wake: 150 });
  L.checkpoint(95, 21);
  L.label(93, 16, 'Mossback awaits');

  // ---- Boss arena
  L.solid(98, 0, 2, 18); // entrance wall, 4-tall opening at the bottom
  L.solid(100, 0, 31, 8); // arena ceiling
  L.solid(131, 0, 3, 22);
  L.boss('slimeKing', { x0: 101, x1: 130, floor: 22, ceiling: 8, gateX: 99 });
  L.exit(128, 21);

  return L.build();
}
