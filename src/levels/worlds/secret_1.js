import LevelBuilder from '../LevelBuilder.js';

/**
 * 1-S "Moonwell Glade" — secret level of the Forgotten Forest. Unlocked by finding
 * every hidden passage in world 1. A moonlit gauntlet of the forest's tricks.
 *
 *   0-40    slime hops between mossy stumps, thorns
 *   41-80   crumbling root bridge, rising blade        -> CP 1
 *   81-120  orbiting blades, moving platform           -> CP 2
 *   121-150 bat swarm under the moon tree, exit
 */
export default function secret_1() {
  const W = 150;
  const H = 30;
  const L = new LevelBuilder({ name: 'Moonwell Glade', width: W, height: H });
  L.ground(26);
  L.walls(2);

  L.start(4, 25);
  L.label(10, 20, 'A hidden glade, untouched by the Shadow');
  L.solid(14, 23, 3, 3);
  L.enemy('slime', 20, 25, { hop: true });
  L.solid(24, 23, 3, 3);
  L.shard(20, 19);
  L.spike(30, 25, 3);
  L.checkpoint(38, 25);

  L.pit(42, 14);
  L.crumble(43, 26, 3);
  L.crumble(48, 25, 3);
  L.crumble(53, 26, 3);
  L.solid(58, 23, 4, 3);
  L.pit(62, 4);
  L.saw(64, 29, 64, 19, 3.2, 0);
  L.solid(66, 23, 4, 3);
  L.spike(72, 25, 2);
  L.checkpoint(78, 25);

  L.orbitSaw(88, 20, 2.5, 4, 0);
  L.shard(88, 20);
  L.orbitSaw(98, 20, 2.5, -4, 0.5);
  L.pit(104, 10);
  L.platform(104, 26, 111, 26, 5, 0, 3);
  L.checkpoint(118, 25);

  L.solid(124, 16, 14, 2);
  L.enemy('bat', 128, 18, { wake: 180 });
  L.enemy('bat', 134, 18, { wake: 180 });
  L.shard(131, 23);
  L.enemy('slime', 140, 25, { speed: 50 });
  L.exit(144, 25);

  return L.build();
}
