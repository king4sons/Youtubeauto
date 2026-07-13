import { TILE, IMPASSABLE } from "./config.js";
import { isInBounds } from "./world.js";

const MOVE_COOLDOWN_MS = 130;

const HUNGER_DECAY = 0.05;
const THIRST_DECAY = 0.07;
const STAMINA_REGEN = 0.3;
const SMOKE_RISE = 2.2;
const SMOKE_FALL = 1.2;

const GATHER_STAMINA_COST = 8;
const BUILD_WOOD_COST = 5;
const DOUSE_WATER_COST = 3;

const FIRE_DAMAGE_PER_TICK = 6;
const ASH_DAMAGE_PER_TICK = 2;
const STARVING_DAMAGE = 0.4;
const SMOKE_SUFFOCATION_DAMAGE = 3;

export class Player {
  constructor(startRow, startCol) {
    this.row = startRow;
    this.col = startCol;
    this.facing = { dr: -1, dc: 0 };

    this.health = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.stamina = 100;
    this.smoke = 0;

    this.wood = 2;
    this.water = 2;
    this.food = 1;

    this.alive = true;
    this.lastMoveAt = 0;
    this.messages = [];
  }

  log(msg) {
    this.messages.push(msg);
    if (this.messages.length > 6) this.messages.shift();
  }

  canMove(now) {
    return now - this.lastMoveAt >= MOVE_COOLDOWN_MS;
  }

  tryMove(dr, dc, grid, now) {
    if (!this.alive || !this.canMove(now)) return false;
    this.facing = { dr, dc };

    // Try the full (possibly diagonal) step first; if blocked by a map
    // edge or obstacle on one axis, slide along the other axis instead
    // of refusing to move at all (e.g. hugging the top map border).
    const candidates =
      dr !== 0 && dc !== 0 ? [[dr, dc], [0, dc], [dr, 0]] : [[dr, dc]];

    for (const [stepR, stepC] of candidates) {
      if (stepR === 0 && stepC === 0) continue;
      const nr = this.row + stepR;
      const nc = this.col + stepC;
      if (!isInBounds(nr, nc)) continue;
      if (IMPASSABLE.has(grid[nr][nc].type)) continue;
      this.row = nr;
      this.col = nc;
      this.lastMoveAt = now;
      return true;
    }
    return false;
  }

  facingTile(grid) {
    const r = this.row + this.facing.dr;
    const c = this.col + this.facing.dc;
    if (!isInBounds(r, c)) return null;
    return { r, c, tile: grid[r][c] };
  }

  gather(grid, fire) {
    const target = this.facingTile(grid);
    if (!target) return;
    const { r, c, tile } = target;

    if (tile.type === TILE.FOREST) {
      if (this.stamina < GATHER_STAMINA_COST) {
        this.log("Too tired to chop wood.");
        return;
      }
      this.stamina -= GATHER_STAMINA_COST;
      this.wood += 2;
      tile.type = TILE.GRASS;
      this.log("Chopped wood (+2).");
    } else if (tile.type === TILE.WATER) {
      this.water += 2;
      this.log("Filled up water (+2).");
    } else if (tile.type === TILE.HOUSE) {
      if (this.stamina < GATHER_STAMINA_COST / 2) {
        this.log("Too tired to search the house.");
        return;
      }
      this.stamina -= GATHER_STAMINA_COST / 2;
      this.food += 2;
      this.wood += 1;
      this.log("Looted supplies: +2 food, +1 wood.");
    } else if (fire.isBurning(r, c) || (tile.type === TILE.ASH && tile.ash > 0)) {
      this.log("Too hot to gather there!");
    } else {
      this.log("Nothing to gather here.");
    }
  }

  build(grid, fire) {
    const target = this.facingTile(grid);
    if (!target) return;
    const { r, c, tile } = target;

    if (this.wood < BUILD_WOOD_COST) {
      this.log("Not enough wood (need 5).");
      return;
    }
    if (fire.isBurning(r, c)) {
      this.log("Can't build on burning ground.");
      return;
    }
    if ([TILE.WATER, TILE.ROCK, TILE.EVAC, TILE.FIREBREAK].includes(tile.type)) {
      this.log("Can't build a firebreak there.");
      return;
    }
    this.wood -= BUILD_WOOD_COST;
    tile.type = TILE.FIREBREAK;
    this.log("Cleared a firebreak.");
  }

  douse(grid, fire) {
    const target = this.facingTile(grid);
    if (!target) return;
    const { r, c } = target;

    if (this.water < DOUSE_WATER_COST) {
      this.log("Not enough water (need 3).");
      return;
    }
    if (!fire.isBurning(r, c)) {
      this.log("No fire there to douse.");
      return;
    }
    this.water -= DOUSE_WATER_COST;
    fire.extinguish(r, c);
    this.log("Doused the flames.");
  }

  tick(grid, fire) {
    if (!this.alive) return;

    this.hunger = clamp(this.hunger - HUNGER_DECAY, 0, 100);
    this.thirst = clamp(this.thirst - THIRST_DECAY, 0, 100);
    this.stamina = clamp(this.stamina + STAMINA_REGEN, 0, 100);

    const nearSmoke = fire.isSmokeNear(this.row, this.col);
    this.smoke = clamp(this.smoke + (nearSmoke ? SMOKE_RISE : -SMOKE_FALL), 0, 100);

    let damage = 0;
    if (fire.isBurning(this.row, this.col)) {
      damage += FIRE_DAMAGE_PER_TICK;
    } else if (grid[this.row][this.col].type === TILE.ASH && grid[this.row][this.col].ash > 0) {
      damage += ASH_DAMAGE_PER_TICK;
    }
    if (this.hunger <= 0 || this.thirst <= 0) {
      damage += STARVING_DAMAGE;
    }
    if (this.smoke >= 100) {
      damage += SMOKE_SUFFOCATION_DAMAGE;
    }

    this.health = clamp(this.health - damage, 0, 100);
    if (this.health <= 0) {
      this.alive = false;
    }
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
