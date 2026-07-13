export const TILE_SIZE = 24;
export const GRID_COLS = 40;
export const GRID_ROWS = 30;

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
  [TILE.FOREST]: "#2e5c2a",
  [TILE.ROCK]: "#7d7d78",
  [TILE.WATER]: "#2f6f9e",
  [TILE.ROAD]: "#5a5a52",
  [TILE.HOUSE]: "#8a5a3c",
  [TILE.EVAC]: "#3fa0ff",
  [TILE.BURNING]: "#e2621b",
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
