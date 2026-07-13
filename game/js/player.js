import { TILE, IMPASSABLE, MOVE_SPEED, PLAYER_RADIUS, INTERACT_RANGE } from "./config.js";
import { tileToWorldX, tileToWorldZ, worldToCol, worldToRow, isInBounds } from "./world.js";

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
  constructor(startRow, startCol, startYaw = 0) {
    this.x = tileToWorldX(startCol);
    this.z = tileToWorldZ(startRow);
    this.yaw = startYaw;

    this.health = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.stamina = 100;
    this.smoke = 0;

    this.wood = 2;
    this.water = 2;
    this.food = 1;

    this.alive = true;
    this.messages = [];
  }

  log(msg) {
    this.messages.push(msg);
    if (this.messages.length > 6) this.messages.shift();
  }

  currentTile() {
    return { row: worldToRow(this.z), col: worldToCol(this.x) };
  }

  isPassable(x, z, grid) {
    const r = PLAYER_RADIUS;
    const corners = [
      [x - r, z - r],
      [x + r, z - r],
      [x - r, z + r],
      [x + r, z + r],
    ];
    for (const [px, pz] of corners) {
      const row = worldToRow(pz);
      const col = worldToCol(px);
      if (!isInBounds(row, col)) return false;
      if (IMPASSABLE.has(grid[row][col].type)) return false;
    }
    return true;
  }

  // forwardInput/strafeInput in [-1, 1]; movement direction is relative to
  // the given camera yaw. Axes are resolved independently so the player
  // slides along a wall instead of stopping dead when moving diagonally
  // into it.
  move(forwardInput, strafeInput, yaw, dt, grid) {
    if (!this.alive) return;
    if (forwardInput === 0 && strafeInput === 0) return;

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    let dx = fx * forwardInput + rx * strafeInput;
    let dz = fz * forwardInput + rz * strafeInput;
    const len = Math.hypot(dx, dz) || 1;
    dx = (dx / len) * MOVE_SPEED * dt;
    dz = (dz / len) * MOVE_SPEED * dt;

    if (this.isPassable(this.x + dx, this.z, grid)) this.x += dx;
    if (this.isPassable(this.x, this.z + dz, grid)) this.z += dz;
  }

  interactTile(yaw, grid) {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const tx = this.x + fx * INTERACT_RANGE;
    const tz = this.z + fz * INTERACT_RANGE;
    const row = worldToRow(tz);
    const col = worldToCol(tx);
    if (!isInBounds(row, col)) return null;
    return { row, col, tile: grid[row][col] };
  }

  gather(yaw, grid, fire) {
    const target = this.interactTile(yaw, grid);
    if (!target) return;
    const { row, col, tile } = target;

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
    } else if (fire.isBurning(row, col) || (tile.type === TILE.ASH && tile.ash > 0)) {
      this.log("Too hot to gather there!");
    } else {
      this.log("Nothing to gather here.");
    }
  }

  build(yaw, grid, fire) {
    const target = this.interactTile(yaw, grid);
    if (!target) return;
    const { row, col, tile } = target;

    if (this.wood < BUILD_WOOD_COST) {
      this.log("Not enough wood (need 5).");
      return;
    }
    if (fire.isBurning(row, col)) {
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

  douse(yaw, grid, fire) {
    const target = this.interactTile(yaw, grid);
    if (!target) return;
    const { row, col } = target;

    if (this.water < DOUSE_WATER_COST) {
      this.log("Not enough water (need 3).");
      return;
    }
    if (!fire.isBurning(row, col)) {
      this.log("No fire there to douse.");
      return;
    }
    this.water -= DOUSE_WATER_COST;
    fire.extinguish(row, col);
    this.log("Doused the flames.");
  }

  tick(grid, fire) {
    if (!this.alive) return;

    this.hunger = clamp(this.hunger - HUNGER_DECAY, 0, 100);
    this.thirst = clamp(this.thirst - THIRST_DECAY, 0, 100);
    this.stamina = clamp(this.stamina + STAMINA_REGEN, 0, 100);

    const { row, col } = this.currentTile();
    const nearSmoke = fire.isSmokeNear(row, col);
    this.smoke = clamp(this.smoke + (nearSmoke ? SMOKE_RISE : -SMOKE_FALL), 0, 100);

    let damage = 0;
    if (fire.isBurning(row, col)) {
      damage += FIRE_DAMAGE_PER_TICK;
    } else if (grid[row][col].type === TILE.ASH && grid[row][col].ash > 0) {
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
