import {
  TILE,
  TILE_SIZE,
  PREP_PHASE_SECONDS,
  TICK_MS,
  PLAYER_START,
  IGNITION_POINT,
} from "./config.js";
import { createWorld, renderTerrain, tileRand } from "./world.js";
import { FireSystem } from "./fire.js";
import { Player } from "./player.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const terrainCanvas = document.createElement("canvas");
terrainCanvas.width = canvas.width;
terrainCanvas.height = canvas.height;
const terrainCtx = terrainCanvas.getContext("2d");

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

const MAX_EMBERS = 220;
const MAX_SMOKE_PUFFS = 90;

let state;

function redrawTerrain() {
  renderTerrain(terrainCtx, state.grid);
  state.waterTiles = [];
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < state.grid[0].length; c++) {
      if (state.grid[r][c].type === TILE.WATER) state.waterTiles.push([r, c]);
    }
  }
}

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
    waterTiles: [],
    embers: [],
    smokePuffs: [],
    lastFrameAt: performance.now(),
  };
  redrawTerrain();
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
  redrawTerrain();

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

function spawnEmbers(now) {
  if (state.embers.length >= MAX_EMBERS) return;
  for (const [k] of state.fire.burning) {
    if (Math.random() > 0.35) continue;
    const [r, c] = k.split(",").map(Number);
    state.embers.push({
      x: c * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * TILE_SIZE * 0.6,
      y: r * TILE_SIZE + TILE_SIZE * 0.3,
      vx: (Math.random() - 0.5) * 12,
      vy: -20 - Math.random() * 18,
      life: 0.7 + Math.random() * 0.6,
      maxLife: 0.7 + Math.random() * 0.6,
      size: 1 + Math.random() * 1.5,
    });
  }
}

function spawnSmoke() {
  if (state.smokePuffs.length >= MAX_SMOKE_PUFFS) return;
  for (const [k] of state.fire.burning) {
    if (Math.random() > 0.06) continue;
    const [r, c] = k.split(",").map(Number);
    state.smokePuffs.push({
      x: c * TILE_SIZE + TILE_SIZE / 2,
      y: r * TILE_SIZE,
      vx: (Math.random() - 0.5) * 6,
      vy: -9 - Math.random() * 6,
      life: 3 + Math.random() * 2,
      maxLife: 3 + Math.random() * 2,
      size: TILE_SIZE * (0.5 + Math.random() * 0.4),
    });
  }
}

function updateParticles(dt) {
  spawnEmbers();
  spawnSmoke();

  state.embers = state.embers.filter((e) => e.life > 0);
  for (const e of state.embers) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vy += 6 * dt;
    e.life -= dt;
  }

  state.smokePuffs = state.smokePuffs.filter((s) => s.life > 0);
  for (const s of state.smokePuffs) {
    s.x += (s.vx + Math.sin(performance.now() / 600 + s.y) * 4) * dt;
    s.y += s.vy * dt;
    s.size += dt * 6;
    s.life -= dt;
  }
}

function drawWaterShimmer(now) {
  ctx.save();
  for (const [r, c] of state.waterTiles) {
    const x = c * TILE_SIZE;
    const y = r * TILE_SIZE;
    const phase = tileRand(r, c, 42) * Math.PI * 2;
    const glint = 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(now / 500 + phase));
    ctx.fillStyle = `rgba(255,255,255,${glint.toFixed(3)})`;
    const bandY = y + ((now / 900 + tileRand(r, c, 7)) % 1) * TILE_SIZE;
    ctx.fillRect(x, bandY, TILE_SIZE, 2);
  }
  ctx.restore();
}

function drawFire(now) {
  ctx.save();
  for (const [k] of state.fire.burning) {
    const [r, c] = k.split(",").map(Number);
    const cx = c * TILE_SIZE + TILE_SIZE / 2;
    const cy = r * TILE_SIZE + TILE_SIZE / 2;
    const phase = tileRand(r, c, 3) * Math.PI * 2;
    const flicker = 0.75 + 0.25 * Math.sin(now / 110 + phase * 3);
    const outerR = TILE_SIZE * 0.75 * flicker;

    const outer = ctx.createRadialGradient(cx, cy + TILE_SIZE * 0.15, 0, cx, cy + TILE_SIZE * 0.15, outerR);
    outer.addColorStop(0, "rgba(255,220,120,0.95)");
    outer.addColorStop(0.35, "rgba(255,140,30,0.85)");
    outer.addColorStop(0.75, "rgba(200,50,10,0.55)");
    outer.addColorStop(1, "rgba(200,50,10,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy + TILE_SIZE * 0.15, outerR, 0, Math.PI * 2);
    ctx.fill();

    const coreR = TILE_SIZE * 0.28 * flicker;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    core.addColorStop(0, "rgba(255,255,230,0.95)");
    core.addColorStop(1, "rgba(255,200,80,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const s of state.smokePuffs) {
    const alpha = Math.min(0.35, (s.life / s.maxLife) * 0.35);
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
    grad.addColorStop(0, `rgba(90,90,90,${alpha})`);
    grad.addColorStop(1, "rgba(90,90,90,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const e of state.embers) {
    const alpha = Math.max(0, e.life / e.maxLife);
    ctx.fillStyle = `rgba(255,${170 + Math.floor(alpha * 60)},${60 * alpha},${alpha})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEvacBeacon(now) {
  ctx.save();
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < state.grid[0].length; c++) {
      if (state.grid[r][c].type !== TILE.EVAC) continue;
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      const pulse = 0.5 + Math.sin(now / 300) * 0.4;
      ctx.strokeStyle = `rgba(80, 200, 255, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      const ring = (now / 900) % 1;
      ctx.strokeStyle = `rgba(140, 220, 255, ${1 - ring})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * (0.4 + ring * 1.4), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPlayer(now) {
  const { player } = state;
  const bob = Math.sin(now / 220) * 1.4;
  const px = player.col * TILE_SIZE + TILE_SIZE / 2;
  const py = player.row * TILE_SIZE + TILE_SIZE / 2 + bob;

  ctx.save();

  // Contact shadow.
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(px, player.row * TILE_SIZE + TILE_SIZE * 0.82, TILE_SIZE * 0.32, TILE_SIZE * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Backpack.
  ctx.fillStyle = "#6b4a2c";
  ctx.fillRect(px - TILE_SIZE * 0.16, py - TILE_SIZE * 0.02, TILE_SIZE * 0.14, TILE_SIZE * 0.3);

  // Facing wedge (a subtle direction cue behind the body).
  if (player.alive) {
    ctx.fillStyle = "rgba(255, 224, 138, 0.45)";
    const wx = px + player.facing.dc * TILE_SIZE * 0.55;
    const wy = py + player.facing.dr * TILE_SIZE * 0.55;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(wx + player.facing.dc * 2 - player.facing.dr * 5, wy + player.facing.dr * 2 + player.facing.dc * 5);
    ctx.lineTo(wx + player.facing.dc * 2 + player.facing.dr * 5, wy + player.facing.dr * 2 - player.facing.dc * 5);
    ctx.closePath();
    ctx.fill();
  }

  // Cloak / body.
  ctx.fillStyle = player.alive ? "#3f6f8f" : "#5a5a5a";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, py - TILE_SIZE * 0.05);
  ctx.quadraticCurveTo(px - TILE_SIZE * 0.32, py + TILE_SIZE * 0.2, px - TILE_SIZE * 0.22, py + TILE_SIZE * 0.4);
  ctx.lineTo(px + TILE_SIZE * 0.22, py + TILE_SIZE * 0.4);
  ctx.quadraticCurveTo(px + TILE_SIZE * 0.32, py + TILE_SIZE * 0.2, px, py - TILE_SIZE * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head.
  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.arc(px, py - TILE_SIZE * 0.18, TILE_SIZE * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function render(now) {
  const { player } = state;

  ctx.drawImage(terrainCanvas, 0, 0);
  drawWaterShimmer(now);
  drawEvacBeacon(now);
  drawFire(now);
  drawParticles();
  drawPlayer(now);

  // Wildfire sky-glow: ambient warmth that grows with how much is burning.
  const heat = Math.min(1, state.fire.activeFireCount() / 40);
  if (heat > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 100, 20, ${(heat * 0.12).toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Vignette.
  ctx.save();
  const vignette = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.35,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.75
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  const dt = Math.min(0.05, (now - state.lastFrameAt) / 1000);
  state.lastFrameAt = now;

  if (!state.ended) {
    handleInput(now);
    updateParticles(dt);
  }
  render(now);
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
  const key = e.key.toLowerCase();
  if (key === "e") player.gather(grid, fire);
  else if (key === "b") player.build(grid, fire);
  else if (key === "f") player.douse(grid, fire);
  else if (key === "r") newGame();
  else return;
  redrawTerrain();
});

window.addEventListener("keyup", (e) => {
  state.keysHeld.delete(e.key);
});

els.overlayRestart.addEventListener("click", () => newGame());

newGame();
setInterval(simulationTick, TICK_MS);
requestAnimationFrame(loop);
