import {
  TILE,
  TILE_SIZE,
  PREP_PHASE_SECONDS,
  TICK_MS,
  PLAYER_START,
  IGNITION_POINT,
} from "./config.js";
import { createWorld, renderWorld } from "./world.js";
import { FireSystem } from "./fire.js";
import { Player } from "./player.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const els = {
  health: document.getElementById("bar-health"),
  hunger: document.getElementById("bar-hunger"),
  thirst: document.getElementById("bar-thirst"),
  stamina: document.getElementById("bar-stamina"),
  smoke: document.getElementById("bar-smoke"),
  wood: document.getElementById("inv-wood"),
  water: document.getElementById("inv-water"),
  food: document.getElementById("inv-food"),
  objective: document.getElementById("objective"),
  phaseTimer: document.getElementById("phase-timer"),
  log: document.getElementById("log"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayText: document.getElementById("overlay-text"),
  overlayRestart: document.getElementById("overlay-restart"),
};

const KEY_MOVES = {
  ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
  ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
  ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
  ArrowRight: [0, 1], d: [0, 1], D: [0, 1],
};

let state;

function newGame() {
  const grid = createWorld();
  state = {
    grid,
    player: new Player(PLAYER_START.row, PLAYER_START.col),
    fire: new FireSystem(grid, { windDx: 1, windDy: -1 }),
    phase: "prep",
    prepSecondsLeft: PREP_PHASE_SECONDS,
    ended: false,
    keysHeld: new Set(),
  };
  els.overlay.classList.add("hidden");
  state.player.log("Wildfire risk detected nearby. Prepare before it ignites.");
}

function endGame(won) {
  if (state.ended) return;
  state.ended = true;
  els.overlay.classList.remove("hidden");
  if (won) {
    els.overlayTitle.textContent = "You made it out alive.";
    els.overlayText.textContent =
      "You reached the evacuation zone before the fire caught you. That's disaster survival 101.";
  } else {
    els.overlayTitle.textContent = "You did not survive.";
    els.overlayText.textContent =
      "The wildfire caught up with you. Gather more supplies and build firebreaks earlier next run.";
  }
}

function simulationTick() {
  const { player, grid, fire } = state;
  if (state.ended) return;

  if (state.phase === "prep") {
    state.prepSecondsLeft -= TICK_MS / 1000;
    if (state.prepSecondsLeft <= 0) {
      state.phase = "escape";
      fire.ignitePatch(IGNITION_POINT.row, IGNITION_POINT.col, 1);
      player.log("The wildfire has ignited! Get to the evacuation zone!");
    }
  } else if (state.phase === "escape") {
    fire.tick();
  }

  player.tick(grid, fire);

  if (!player.alive) {
    endGame(false);
    return;
  }
  if (grid[player.row][player.col].type === TILE.EVAC) {
    endGame(true);
  }
}

function handleInput(now) {
  const { player, grid, keysHeld } = state;
  // Sum all held direction keys so e.g. Up+Right held together moves
  // diagonally instead of getting stuck on whichever key matched first.
  let dr = 0;
  let dc = 0;
  for (const k of keysHeld) {
    const move = KEY_MOVES[k];
    if (move) {
      dr += move[0];
      dc += move[1];
    }
  }
  dr = Math.max(-1, Math.min(1, dr));
  dc = Math.max(-1, Math.min(1, dc));
  if (dr !== 0 || dc !== 0) {
    player.tryMove(dr, dc, grid, now);
  }
}

function render() {
  const { grid, fire, player } = state;

  renderWorld(ctx, grid);

  // Fire glow overlay.
  const flicker = 0.6 + Math.sin(performance.now() / 90) * 0.15;
  ctx.save();
  for (const [k] of fire.burning) {
    const [r, c] = k.split(",").map(Number);
    ctx.fillStyle = `rgba(255, 140, 20, ${flicker})`;
    ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
  ctx.restore();

  // Evac zone pulse.
  ctx.save();
  ctx.strokeStyle = `rgba(80, 200, 255, ${0.5 + Math.sin(performance.now() / 300) * 0.4})`;
  ctx.lineWidth = 3;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c].type === TILE.EVAC) {
        ctx.strokeRect(c * TILE_SIZE + 1, r * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }
    }
  }
  ctx.restore();

  // Player.
  ctx.save();
  ctx.fillStyle = "#ffe08a";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  const px = player.col * TILE_SIZE + TILE_SIZE / 2;
  const py = player.row * TILE_SIZE + TILE_SIZE / 2;
  ctx.beginPath();
  ctx.arc(px, py, TILE_SIZE / 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Facing indicator.
  ctx.fillStyle = "#1a1a1a";
  const fx = px + player.facing.dc * (TILE_SIZE / 2);
  const fy = py + player.facing.dr * (TILE_SIZE / 2);
  ctx.beginPath();
  ctx.arc(fx, fy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!player.alive) {
    ctx.save();
    ctx.fillStyle = "rgba(120, 0, 0, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function updateHud() {
  const { player, phase, prepSecondsLeft } = state;

  els.health.style.width = `${player.health}%`;
  els.hunger.style.width = `${player.hunger}%`;
  els.thirst.style.width = `${player.thirst}%`;
  els.stamina.style.width = `${player.stamina}%`;
  els.smoke.style.width = `${player.smoke}%`;

  els.wood.textContent = player.wood;
  els.water.textContent = player.water;
  els.food.textContent = player.food;

  if (phase === "prep") {
    els.objective.textContent =
      "Objective: Gather wood/water/food and scout a route to the blue evacuation zone (top-right).";
    els.phaseTimer.textContent = `Fire risk in: ${Math.max(0, prepSecondsLeft).toFixed(0)}s`;
  } else {
    els.objective.textContent =
      "Objective: The wildfire has ignited! Reach the blue evacuation zone alive.";
    els.phaseTimer.textContent = `Active fires: ${state.fire.activeFireCount()}`;
  }

  els.log.innerHTML = player.messages
    .slice(-6)
    .map((m) => `<div>${escapeHtml(m)}</div>`)
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function loop(now) {
  if (!state.ended) {
    handleInput(now);
  }
  render();
  updateHud();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (KEY_MOVES[e.key]) {
    state.keysHeld.add(e.key);
    return;
  }
  if (e.repeat) return;
  if (state.ended) {
    if (e.key.toLowerCase() === "r") newGame();
    return;
  }
  const { player, grid, fire } = state;
  if (e.key.toLowerCase() === "e") player.gather(grid, fire);
  else if (e.key.toLowerCase() === "b") player.build(grid, fire);
  else if (e.key.toLowerCase() === "f") player.douse(grid, fire);
  else if (e.key.toLowerCase() === "r") newGame();
});

window.addEventListener("keyup", (e) => {
  state.keysHeld.delete(e.key);
});

els.overlayRestart.addEventListener("click", () => newGame());

newGame();
setInterval(simulationTick, TICK_MS);
requestAnimationFrame(loop);
