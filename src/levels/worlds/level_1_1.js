import LevelBuilder from '../LevelBuilder.js';

/**
 * 1-1 "The First Shadow" — the movement tutorial (Stage 1 level).
 *
 *   0-29    movement + jump + variable jump height
 *   30-57   double jump
 *   58-85   moving platforms over a bottomless pit
 *   86-105  wall-jump chimney
 *   106-140 dash gap high above a spike field, vertical platform down
 *   141-187 saws, up-dash wall, low-ceiling spike pit (dash)
 *   188-231 platform finale + exit portal
 */
export default function level_1_1() {
  const W = 232;
  const H = 34;
  const L = new LevelBuilder({ name: 'The First Shadow', width: W, height: H });

  L.solid(0, 28, W, H - 28);
  L.solid(0, 0, 2, 28);
  L.solid(W - 2, 0, 2, 28);

  // ---- Section 1: basics
  L.start(4, 27);
  L.label(6, 23, '← → / A D  to move', 'Drag the left stick to move');
  L.solid(12, 26, 3, 2);
  L.label(13, 22, 'SPACE / Z  to jump', 'Tap JUMP to jump');
  L.solid(18, 25, 3, 3);
  L.label(19, 21, 'Hold jump to jump higher');
  L.clear(24, 28, 4, 5);
  L.spike(24, 32, 4);
  L.shard(26, 24);

  // ---- Section 2: double jump
  L.label(36, 18, 'Press jump again in mid-air to DOUBLE JUMP');
  L.solid(36, 23, 4, 5);
  L.shard(38, 20);
  L.spike(44, 27, 6);
  L.checkpoint(53, 27);

  // ---- Section 3: moving platforms over a pit
  L.clear(58, 28, 28, H - 28);
  L.label(66, 20, 'Ride the moving platforms');
  L.platform(59, 26, 68, 26, 4, 0);
  L.platform(72, 24, 80, 24, 4, 0.5);

  // ---- Section 4: wall-jump chimney
  L.checkpoint(88, 27);
  L.label(92, 16, 'Jump off walls to WALL JUMP', 'Jump while touching a wall to WALL JUMP');
  L.label(92, 18, 'hold toward a wall to slide');
  L.solid(96, 14, 2, 12);
  L.solid(102, 12, 4, 16);
  // Secret: the chimney's right wall hides an alcove at floor level.
  L.secret(102, 25, 3, 3);
  L.shard(104, 26);

  // ---- Section 5: dash gap above spikes
  L.solid(106, 12, 8, 2);
  L.checkpoint(108, 11);
  L.label(118, 7, 'SHIFT / X  to DASH (works in mid-air)', 'Tap DASH to dash (works in mid-air)');
  L.solid(123, 12, 6, 2);
  L.spike(106, 27, 30);
  L.platform(131, 13, 131, 25, 4, 0);

  // ---- Section 6: saws, up-dash, low ceiling
  L.checkpoint(141, 27);
  L.saw(146, 27.35, 156, 27.35, 3, 0);
  L.saw(161, 21.5, 161, 27.35, 2.2, 0);
  L.label(163, 15, 'Hold ↑ + DASH to dash upward', 'Push stick UP + DASH to dash upward');
  L.solid(166, 21, 10, 7);
  L.solid(178, 0, 10, 21);
  L.spike(181, 21, 7, 'down');
  L.spike(182, 27, 6);
  L.label(184, 24, 'Low ceiling: jump + DASH across');

  // ---- Section 7: finale
  L.checkpoint(190, 27);
  L.clear(194, 28, 20, H - 28);
  L.platform(195, 26, 195, 19, 4, 0);
  L.platform(199, 19, 208, 19, 4, 0.5);
  L.label(218, 22, 'Reach the light to ESCAPE');
  L.exit(223, 27);

  return L.build();
}
