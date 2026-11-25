import SlimeKing from './SlimeKing.js';
import StoneWarden from './StoneWarden.js';
import CountNoctis from './CountNoctis.js';
import PrismColossus from './PrismColossus.js';
import Umbra from './Umbra.js';

/** Boss type keys used by LevelBuilder.boss(type, arena). */
export const BOSS_TYPES = {
  slimeKing: SlimeKing,
  stoneWarden: StoneWarden,
  countNoctis: CountNoctis,
  prismColossus: PrismColossus,
  umbra: Umbra,
};

export function createBoss(scene, ctx, def) {
  const Cls = BOSS_TYPES[def.type];
  if (!Cls) throw new Error(`Unknown boss type "${def.type}"`);
  return new Cls(scene, ctx, def);
}
