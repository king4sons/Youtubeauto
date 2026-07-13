export const GRID_COLS = 40;
export const GRID_ROWS = 30;

// World-space size of one grid tile, in Three.js units (meters-ish).
export const WORLD_UNIT = 4;

export const TILE = {
  GRASS: "grass",
  FOREST: "forest",
  ROCK: "rock",
  WATER: "water",
  ROAD: "road",
  HOUSE: "house",
  EVAC: "evac",
  BURNING: "burning",
  ASH: "ash",
  FIREBREAK: "firebreak",
};

export const TILE_COLORS = {
  [TILE.GRASS]: "#4c7a3f",
  [TILE.FOREST]: "#3c6633",
  [TILE.ROCK]: "#7d7d78",
  [TILE.WATER]: "#2f6f9e",
  [TILE.ROAD]: "#5a5a52",
  [TILE.HOUSE]: "#4c7a3f",
  [TILE.EVAC]: "#3fa0ff",
  [TILE.BURNING]: "#3a1f10",
  [TILE.ASH]: "#3a3733",
  [TILE.FIREBREAK]: "#6b5b3a",
};

// Tiles fire cannot spread onto / does not ignite.
export const NON_FLAMMABLE = new Set([
  TILE.ROCK,
  TILE.WATER,
  TILE.ROAD,
  TILE.EVAC,
  TILE.ASH,
  TILE.FIREBREAK,
]);

// Tiles that block player movement.
export const IMPASSABLE = new Set([TILE.WATER, TILE.ROCK]);

export const PREP_PHASE_SECONDS = 45;
export const TICK_MS = 250; // simulation tick rate for fire spread & stat decay

export const PLAYER_START = { row: GRID_ROWS - 3, col: 2 };
export const IGNITION_POINT = { row: GRID_ROWS - 14, col: 15 };

// First-person movement & interaction tuning.
export const EYE_HEIGHT = 1.75;
export const MOVE_SPEED = 9.5; // world units / second
export const MOUSE_SENSITIVITY = 0.0022;
export const INTERACT_RANGE = WORLD_UNIT * 1.6;
export const PLAYER_RADIUS = 1.1; // collision radius against impassable tiles
