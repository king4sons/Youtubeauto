import {
  TILE,
  TILE_COLORS,
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  PLAYER_START,
  IGNITION_POINT,
  IMPASSABLE,
} from "./config.js";

function makeGrid(fillType) {
  const grid = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push({ type: fillType, ash: 0 });
    }
    grid.push(row);
  }
  return grid;
}

function randomWalkBlob(grid, startR, startC, size, type) {
  let r = startR;
  let c = startC;
  for (let i = 0; i < size; i++) {
    if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
      grid[r][c].type = type;
    }
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0) r -= 1;
    else if (dir === 1) r += 1;
    else if (dir === 2) c -= 1;
    else c += 1;
    r = Math.max(0, Math.min(GRID_ROWS - 1, r));
    c = Math.max(0, Math.min(GRID_COLS - 1, c));
  }
}

/**
 * Builds a foothill/forest region: forest clusters, a river, a mountain
 * evac zone in the top-right, a small settlement near the player start
 * (bottom-left), connected by a dirt road.
 */
function generateAttempt() {
  const grid = makeGrid(TILE.GRASS);

  // Forest clusters scattered across the map.
  for (let i = 0; i < 26; i++) {
    const r = Math.floor(Math.random() * GRID_ROWS);
    const c = Math.floor(Math.random() * GRID_COLS);
    randomWalkBlob(grid, r, c, 40 + Math.floor(Math.random() * 60), TILE.FOREST);
  }

  // River running diagonally across the map (also a water source).
  let rc = 2;
  for (let r = 0; r < GRID_ROWS; r++) {
    rc += Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : -1;
    rc = Math.max(0, Math.min(GRID_COLS - 3, rc));
    for (let w = 0; w < 2; w++) {
      const c = rc + w;
      if (c >= 0 && c < GRID_COLS) grid[r][c].type = TILE.WATER;
    }
  }

  // Mountain / rock evac zone, top-right corner.
  for (let r = 0; r < 8; r++) {
    for (let c = GRID_COLS - 8; c < GRID_COLS; c++) {
      if (r + (GRID_COLS - c) < 10) {
        grid[r][c].type = TILE.ROCK;
      }
    }
  }
  const evacCol = GRID_COLS - 3;
  const evacRow = 2;
  for (let r = evacRow; r < evacRow + 3; r++) {
    for (let c = evacCol; c < evacCol + 3; c++) {
      if (r < GRID_ROWS && c < GRID_COLS) grid[r][c].type = TILE.EVAC;
    }
  }

  // Small settlement near player start, bottom-left.
  const houseSpots = [
    [GRID_ROWS - 4, 3],
    [GRID_ROWS - 6, 6],
    [GRID_ROWS - 3, 8],
  ];
  for (const [r, c] of houseSpots) {
    if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
      grid[r][c].type = TILE.HOUSE;
    }
  }

  // Dirt road connecting the player's spawn to the evac zone. It starts
  // exactly at the spawn point and always paves over whatever is there
  // (including the river) so it can never be cut by a randomly-placed
  // obstacle — it's the one guaranteed passable corridor across the map.
  // targetR sits directly adjacent to the evac zone's bottom row so the
  // road actually reaches it instead of stopping short behind the rock.
  let pr = PLAYER_START.row;
  let pc = PLAYER_START.col;
  const targetR = evacRow + 3;
  const targetC = evacCol;
  grid[pr][pc].type = TILE.ROAD;
  while (pr !== targetR || pc !== targetC) {
    if (pr > targetR) pr--;
    else if (pr < targetR) pr++;
    else if (pc < targetC) pc++;
    else if (pc > targetC) pc--;
    grid[pr][pc].type = TILE.ROAD;
  }

  // Guarantee the player always spawns on clear, walkable ground.
  for (let r = PLAYER_START.row - 1; r <= PLAYER_START.row + 1; r++) {
    for (let c = PLAYER_START.col - 1; c <= PLAYER_START.col + 1; c++) {
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        grid[r][c].type = TILE.GRASS;
      }
    }
  }

  // Guarantee there's flammable forest at the scripted ignition point.
  for (let r = IGNITION_POINT.row - 1; r <= IGNITION_POINT.row + 1; r++) {
    for (let c = IGNITION_POINT.col - 1; c <= IGNITION_POINT.col + 1; c++) {
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        grid[r][c].type = TILE.FOREST;
      }
    }
  }

  return grid;
}

function isReachable(grid, start, targetType) {
  const seen = new Set([start.join(",")]);
  const queue = [start];
  while (queue.length) {
    const [r, c] = queue.shift();
    if (grid[r][c].type === targetType) return true;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!isInBounds(nr, nc)) continue;
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      if (IMPASSABLE.has(grid[nr][nc].type)) continue;
      seen.add(key);
      queue.push([nr, nc]);
    }
  }
  return false;
}

// The spawn-to-evac road already guarantees a path deterministically, but
// we still verify with a BFS (and regenerate on the rare failure) as a
// safety net against future changes to generation that could break it.
export function createWorld() {
  const MAX_ATTEMPTS = 20;
  let grid = generateAttempt();
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    if (isReachable(grid, [PLAYER_START.row, PLAYER_START.col], TILE.EVAC)) {
      return grid;
    }
    grid = generateAttempt();
  }
  return grid;
}

export function isInBounds(r, c) {
  return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS;
}

export function renderWorld(ctx, grid) {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const tile = grid[r][c];
      ctx.fillStyle = TILE_COLORS[tile.type] || "#000";
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      if (tile.type === TILE.ASH && tile.ash > 0) {
        ctx.fillStyle = `rgba(255,120,40,${Math.min(0.4, tile.ash / 20)})`;
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}
