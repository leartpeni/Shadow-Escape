import LevelBuilder from './LevelBuilder.js';

/** Temporary level used while a world's real levels are being authored. */
export default function stubLevel(name) {
  const L = new LevelBuilder({ name, width: 60, height: 20 });
  L.ground(16).walls().start(4, 15).label(20, 10, 'Under construction').exit(54, 15);
  return L.build();
}
