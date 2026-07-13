# Natural Disasters: Survival 101 — Wildfire Prototype

This is a small, playable **vertical slice** of the "Natural Disasters:
Survival 101" concept, scoped down to something a coding session can
actually build and verify: one disaster (wildfire evacuation), one map, a
handful of survival mechanics. It is not the AAA/VR/multiplayer game
described in the full design doc — see
[`docs/GAME_DESIGN_ROADMAP.md`](../docs/GAME_DESIGN_ROADMAP.md) for how this
slice maps to that larger vision and what would be involved in growing
toward it.

It's a dependency-free browser game: plain HTML5 Canvas + vanilla JS
(ES modules), no build step, no framework.

## How to run

From this directory, serve it with any static file server (ES modules
require `http(s)://`, not `file://`):

```bash
cd game
python3 -m http.server 8080
# then open http://localhost:8080
```

## The loop

1. **Prep phase (45s):** explore the map, chop wood from forest tiles,
   fill up water at the river, and loot food/wood from houses near your
   camp. Scout a route toward the blue evacuation zone in the
   mountains (top-right).
2. **Escape phase:** a wildfire ignites and spreads across the map,
   driven by wind. Reach the evacuation zone before the fire — or your
   health — gets you. You can spend wood to clear firebreaks and water
   to douse nearby flames along the way.

Win by stepping onto the evac zone alive. Lose if health hits zero
(fire damage, smoke, or prolonged starvation/dehydration).

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move (diagonals supported) |
| E | Gather / loot the tile you're facing |
| B | Build a firebreak on the tile you're facing (5 wood) |
| F | Douse a burning tile you're facing (3 water) |
| R | Restart |

## Code layout

- `js/config.js` — tunable constants (grid size, tile types, timers).
- `js/world.js` — procedural map generation + rendering. Regenerates
  and re-checks itself (via BFS) until the evac zone is guaranteed
  reachable from spawn, so a run is never unwinnable by construction.
- `js/fire.js` — the wildfire cellular-automaton spread simulation.
- `js/player.js` — movement, survival stats, inventory, actions.
- `js/main.js` — game loop, input, HUD wiring, win/lose state.

## Known scope limits (intentional, for this slice)

- One biome/disaster (wildfire). No day/night, seasons, or other hazards.
- Solo, no NPCs/animals/vehicles.
- Flat-color placeholder art, no audio.
- Single fixed-size map that fits entirely on screen (no camera/scrolling).
