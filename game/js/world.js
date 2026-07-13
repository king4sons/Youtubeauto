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

// Deterministic per-tile pseudo-random float in [0, 1), keyed by a salt so a
// tile can draw several independent "random" values without them all moving
// together. Used for texture jitter that must stay stable across redraws
// (a plain Math.random() would make grass/rock speckle crawl every tick).
export function tileRand(r, c, salt) {
  let h = (r * 92821 + c * 68917 + salt * 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const GRASS_BLADE = "#3d6a33";
const GRASS_BLADE_LIGHT = "#6a9a55";
const FOREST_CANOPY = ["#25501f", "#336b2b", "#2c5e26"];
const FOREST_TRUNK = "#4a3423";
const ROCK_SPECKLE_DARK = "#5f5f5a";
const ROCK_SPECKLE_LIGHT = "#9a9a94";
const ROAD_TREAD = "#47473f";
const HOUSE_ROOF = "#5c3a26";
const HOUSE_WALL = "#a97a52";
const HOUSE_DOOR = "#3a2415";
const ASH_CRACK = "#1f1c19";
const FIREBREAK_SCRAPE = "#8a7550";

function drawGrass(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.GRASS];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < 4; i++) {
    const bx = x + tileRand(r, c, i * 3 + 1) * TILE_SIZE;
    const by = y + tileRand(r, c, i * 3 + 2) * TILE_SIZE;
    const h = 3 + tileRand(r, c, i * 3 + 3) * 4;
    ctx.strokeStyle = i % 2 === 0 ? GRASS_BLADE : GRASS_BLADE_LIGHT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 1 + tileRand(r, c, i * 3 + 4) * 2, by - h);
    ctx.stroke();
  }
}

function drawForest(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.GRASS];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = FOREST_TRUNK;
  ctx.fillRect(x + TILE_SIZE / 2 - 1, y + TILE_SIZE * 0.55, 2, TILE_SIZE * 0.4);

  for (let i = 0; i < 3; i++) {
    const cx = x + TILE_SIZE * (0.3 + tileRand(r, c, i * 5 + 1) * 0.4);
    const cy = y + TILE_SIZE * (0.25 + tileRand(r, c, i * 5 + 2) * 0.3);
    const radius = TILE_SIZE * (0.28 + tileRand(r, c, i * 5 + 3) * 0.14);
    ctx.fillStyle = FOREST_CANOPY[i % FOREST_CANOPY.length];
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRock(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.ROCK];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < 4; i++) {
    const dx = x + tileRand(r, c, i * 4 + 1) * TILE_SIZE;
    const dy = y + tileRand(r, c, i * 4 + 2) * TILE_SIZE;
    const radius = 1 + tileRand(r, c, i * 4 + 3) * 1.8;
    ctx.fillStyle = i % 2 === 0 ? ROCK_SPECKLE_DARK : ROCK_SPECKLE_LIGHT;
    ctx.beginPath();
    ctx.arc(dx, dy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaterBase(ctx, x, y, r, c) {
  const grad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
  grad.addColorStop(0, "#3a86bd");
  grad.addColorStop(1, "#204f75");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

function drawRoad(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.ROAD];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = ROAD_TREAD;
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const ly = y + TILE_SIZE * (0.3 + i * 0.4) + (tileRand(r, c, i + 1) - 0.5) * 3;
    ctx.beginPath();
    ctx.moveTo(x + 2, ly);
    ctx.lineTo(x + TILE_SIZE - 2, ly);
    ctx.stroke();
  }
}

function drawHouse(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.GRASS];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = HOUSE_WALL;
  ctx.fillRect(x + 2, y + TILE_SIZE * 0.45, TILE_SIZE - 4, TILE_SIZE * 0.5);
  ctx.fillStyle = HOUSE_ROOF;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + TILE_SIZE * 0.45);
  ctx.lineTo(x + TILE_SIZE / 2, y + 2);
  ctx.lineTo(x + TILE_SIZE - 1, y + TILE_SIZE * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = HOUSE_DOOR;
  ctx.fillRect(x + TILE_SIZE / 2 - 2, y + TILE_SIZE * 0.72, 4, TILE_SIZE * 0.23);
}

function drawEvac(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.EVAC];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `bold ${TILE_SIZE * 0.55}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("H", x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 1);
}

function drawAsh(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.ASH];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = ASH_CRACK;
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const sx = x + tileRand(r, c, i * 6 + 1) * TILE_SIZE;
    const sy = y + tileRand(r, c, i * 6 + 2) * TILE_SIZE;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (tileRand(r, c, i * 6 + 3) - 0.5) * 10, sy + (tileRand(r, c, i * 6 + 4) - 0.5) * 10);
    ctx.stroke();
  }
}

function drawFirebreak(ctx, x, y, r, c) {
  ctx.fillStyle = TILE_COLORS[TILE.FIREBREAK];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = FIREBREAK_SCRAPE;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const ly = y + (i + 1) * (TILE_SIZE / 4);
    ctx.beginPath();
    ctx.moveTo(x + 1, ly + (tileRand(r, c, i + 10) - 0.5) * 2);
    ctx.lineTo(x + TILE_SIZE - 1, ly + (tileRand(r, c, i + 20) - 0.5) * 2);
    ctx.stroke();
  }
}

function drawBurning(ctx, x, y, r, c) {
  ctx.fillStyle = "#3a1f10";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

const TILE_DRAWERS = {
  [TILE.GRASS]: drawGrass,
  [TILE.FOREST]: drawForest,
  [TILE.ROCK]: drawRock,
  [TILE.WATER]: drawWaterBase,
  [TILE.ROAD]: drawRoad,
  [TILE.HOUSE]: drawHouse,
  [TILE.EVAC]: drawEvac,
  [TILE.ASH]: drawAsh,
  [TILE.FIREBREAK]: drawFirebreak,
  [TILE.BURNING]: drawBurning,
};

// Detailed, deterministic per-tile art. Expensive relative to a flat fill,
// so callers should render this to an offscreen canvas on world-state
// change (sim tick) rather than every animation frame, then blit the result.
export function renderTerrain(ctx, grid) {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const tile = grid[r][c];
      const draw = TILE_DRAWERS[tile.type];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      if (draw) draw(ctx, x, y, r, c);
      else {
        ctx.fillStyle = "#000";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }

      if (tile.type === TILE.ASH && tile.ash > 0) {
        ctx.fillStyle = `rgba(255,120,40,${Math.min(0.4, tile.ash / 20)})`;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}
