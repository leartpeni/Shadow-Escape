import LevelBuilder from '../LevelBuilder.js';

/**
 * Developer sandbox (not part of progression): every obstacle, every enemy and a
 * boss arena. Open with ?level=sandbox&boss=stoneWarden (any boss type key).
 */
export default function sandbox() {
  let boss = 'slimeKing';
  try {
    boss = new URLSearchParams(window.location.search).get('boss') || boss;
  } catch (e) {
    /* not in a browser */
  }
  const theme = { slimeKing: 'forest', stoneWarden: 'ruins', countNoctis: 'castle', prismColossus: 'crystal', umbra: 'void' }[boss];
  const L = new LevelBuilder({ name: 'Sandbox', width: 134, height: 24, theme });
  L.ground(20);
  L.walls(2, 2);
  L.start(4, 19);

  // Obstacles
  L.spike(10, 19, 2);
  L.solid(16, 15, 1, 5).spike(15, 17, 2, 'left');
  L.saw(22, 16, 26, 16, 2.5);
  L.orbitSaw(32, 15, 2.5, 3);
  L.laser(38, 17, 2, 'v', { on: 1, off: 1.5 });
  L.electric(44, 16, 4, 'v', { on: 1.2, off: 1.4 });
  L.solid(48, 6, 4, 2).rock(50, 8);
  L.pit(54, 4).vanish(54, 19, 2, { on: 2, off: 1 }).crumble(56, 19, 2);
  L.pit(60, 4).platform(60, 19, 61, 19, 3, 0, 2);
  L.secret(64, 16, 3, 3).solid(64, 13, 3, 3).shard(65, 17);
  L.shard(30, 12).shard(70, 15);

  // Enemies
  L.enemy('slime', 68, 19);
  L.enemy('bat', 74, 12);
  L.enemy('hunter', 78, 19);
  L.enemy('guardian', 84, 19);
  L.checkpoint(90, 19);

  // Boss arena 101..130 (30 tiles), floor at row 20, ceiling at row 4
  L.solid(98, 2, 2, 14); // entrance wall with an opening at the bottom
  L.clear(98, 16, 2, 4);
  L.boss(boss, { x0: 101, x1: 131, floor: 20, ceiling: 4, gateX: 99 });
  L.exit(128, 19);
  return L.build();
}
