# Shadow Escape

A dark-fantasy precision platformer built with [Phaser 3](https://phaser.io) and [Vite](https://vitejs.dev).
It has five worlds of four levels each (20 levels), each world ending in a boss, plus five secret levels.
All graphics and audio are generated at runtime, so the game needs no external asset files.

## Requirements

- Node.js 18 or newer (tested with Node 22+)
- A modern browser (Chrome, Edge, Firefox, Safari; desktop or mobile)

## Run

```bash
npm install        # once
npm run dev        # development server with hot reload
```

Open the URL Vite prints (usually http://localhost:5173). The server runs with `--host`, so a phone on the same Wi-Fi can open the printed *Network* URL.

> **Windows PowerShell:** if `npm` is blocked with *"running scripts is disabled"*, use `npm.cmd` instead (e.g. `npm.cmd run dev`).

## Build for release

```bash
npm run build      # outputs an optimized static build to dist/
npm run preview    # serves dist/ at http://localhost:4173 to check the build
```

`dist/` is fully static with relative paths (`base: './'`), so you can deploy it to any static host or sub-folder (GitHub Pages, Netlify, itch.io as an HTML5 game, nginx, ...).

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys / WASD | Left joystick |
| Jump / double jump / wall jump | Space, Z, K, C | JUMP button |
| Dash | Shift, X, J | DASH button |
| Respawn at checkpoint | R | — |
| Pause | Esc, P | Pause button (top right) |
| Toggle music | M | Settings |
| Fullscreen | F | Fullscreen button |
| Menus | Arrows + Enter, Esc to go back, or mouse / tap | Tap |

The game pauses automatically when the tab or app loses focus.

## Progression

- **Crystals:** the currency. Every crystal picked up in a level adds to your wallet, and first clears, new stars, achievements and daily challenges award bonus crystals. Spend them on skins, colours and effects in Character.
- **Stars:** each level awards three, for escaping it, collecting all of its crystals in one run, and beating the par time.
- **Worlds:** defeating a world's boss unlocks the next world.
- **Secret levels:** finding every hidden passage (fake wall) in a world's regular levels unlocks that world's secret level.
- **Saving:** progress, settings, skins and best times are stored in `localStorage` (`shadow-escape-save-v2`). A corrupted save is detected and reset safely.

## Debug URL parameters

| Parameter | Effect |
|---|---|
| `?level=2-3` | Jump straight into a level (`1-1` … `5-4`, `1-S` … `5-S`) |
| `?unlock=all` | Unlock all worlds and levels for this session only (not saved) |
| `?fx=low` / `?fx=high` | Force the effects quality |

## Project layout

```
src/
  main.js            Phaser game config
  config.js          tuning constants (player physics, quality presets)
  scenes/            Boot, Menu, Game, UI (HUD / pause / victory)
  entities/          Player, enemies (Slime, Bat, Light Guardian, Void Hunter), bosses
  levels/            level builder, registry, worlds/level_*.js and secret_*.js
  systems/           save, progress, audio, input, touch controls, camera, effects
  gfx/               procedural texture generation
  ui/                UI theme, widgets, toasts
tools/
  level-check.mjs    BFS solver that checks every level is completable from every checkpoint
```

Check that every level can be completed (useful after editing levels):

```bash
node tools/level-check.mjs           # all levels
node tools/level-check.mjs 3-2 5-S   # specific levels
```
