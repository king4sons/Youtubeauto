import { TILE, NON_FLAMMABLE, GRID_COLS, GRID_ROWS } from "./config.js";
import { isInBounds } from "./world.js";

const BURN_DURATION_TICKS = 10; // ticks a tile stays actively on fire
const ASH_HOT_TICKS = 8; // ticks scorched ground stays dangerous to stand on
const BASE_SPREAD_CHANCE = 0.025;
const FLAMMABILITY = {
  [TILE.FOREST]: 1.35,
  [TILE.GRASS]: 1.0,
  [TILE.HOUSE]: 1.1,
};
const SMOKE_RADIUS = 3;

// Orthogonal-only spread keeps the fire front directional (finger-like,
// driven by wind) instead of an unrealistic instant-blob explosion.
const NEIGHBORS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

export class FireSystem {
  constructor(grid, { windDx = 1, windDy = -1 } = {}) {
    this.grid = grid;
    this.burning = new Map(); // "r,c" -> ticks burning
    this.wind = normalize(windDx, windDy);
  }

  ignite(r, c) {
    if (!isInBounds(r, c)) return;
    const tile = this.grid[r][c];
    if (NON_FLAMMABLE.has(tile.type)) return;
    if (this.burning.has(key(r, c))) return;
    tile.type = TILE.BURNING;
    this.burning.set(key(r, c), 0);
  }

  ignitePatch(r, c, radius = 1) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        this.ignite(r + dr, c + dc);
      }
    }
  }

  extinguish(r, c) {
    if (!isInBounds(r, c)) return false;
    const k = key(r, c);
    if (!this.burning.has(k)) return false;
    this.burning.delete(k);
    const tile = this.grid[r][c];
    tile.type = TILE.ASH;
    tile.ash = ASH_HOT_TICKS;
    return true;
  }

  isBurning(r, c) {
    return isInBounds(r, c) && this.grid[r][c].type === TILE.BURNING;
  }

  isHot(r, c) {
    if (!isInBounds(r, c)) return false;
    const tile = this.grid[r][c];
    return tile.type === TILE.BURNING || (tile.type === TILE.ASH && tile.ash > 0);
  }

  isSmokeNear(r, c, radius = SMOKE_RADIUS) {
    for (const [k] of this.burning) {
      const [br, bc] = k.split(",").map(Number);
      if (Math.abs(br - r) <= radius && Math.abs(bc - c) <= radius) return true;
    }
    return false;
  }

  activeFireCount() {
    return this.burning.size;
  }

  tick() {
    const toIgnite = [];
    const toAsh = [];

    for (const [k, ticks] of this.burning) {
      const [r, c] = k.split(",").map(Number);
      const nextTicks = ticks + 1;

      if (nextTicks > BURN_DURATION_TICKS) {
        toAsh.push([r, c]);
        continue;
      }
      this.burning.set(k, nextTicks);

      for (const [dr, dc] of NEIGHBORS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!isInBounds(nr, nc)) continue;
        const neighbor = this.grid[nr][nc];
        if (NON_FLAMMABLE.has(neighbor.type)) continue;
        if (this.burning.has(key(nr, nc))) continue;

        const flammability = FLAMMABILITY[neighbor.type] ?? 1.0;
        const windFactor = windAlignment(this.wind, dr, dc);
        const chance = BASE_SPREAD_CHANCE * flammability * windFactor;
        if (Math.random() < chance) {
          toIgnite.push([nr, nc]);
        }
      }
    }

    for (const [r, c] of toAsh) {
      this.burning.delete(key(r, c));
      const tile = this.grid[r][c];
      tile.type = TILE.ASH;
      tile.ash = ASH_HOT_TICKS;
    }
    for (const [r, c] of toIgnite) {
      this.ignite(r, c);
    }

    // Cool down ash tiles over time.
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = this.grid[r][c];
        if (tile.type === TILE.ASH && tile.ash > 0) {
          tile.ash -= 1;
        }
      }
    }
  }
}

function key(r, c) {
  return `${r},${c}`;
}

function normalize(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Spread is more likely in the direction the wind is blowing.
function windAlignment(wind, dr, dc) {
  const len = Math.hypot(dr, dc) || 1;
  const dot = (dc / len) * wind.x + (dr / len) * wind.y;
  return 1 + Math.max(0, dot) * 1.2;
}
