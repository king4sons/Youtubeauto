import * as THREE from "./vendor/three.module.min.js";
import { TILE, PREP_PHASE_SECONDS, TICK_MS, PLAYER_START, IGNITION_POINT, EYE_HEIGHT } from "./config.js";
import { createWorld } from "./world.js";
import { FireSystem } from "./fire.js";
import { Player } from "./player.js";
import { createRenderer, createCamera, buildWorldScene } from "./scene3d.js";
import { createFireEffects } from "./fireFx.js";
import { MouseLookControls } from "./controls.js";

const canvas = document.getElementById("game-canvas");
const renderer = createRenderer(canvas);
const camera = createCamera();
const controls = new MouseLookControls(canvas);

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
  lockPrompt: document.getElementById("lock-prompt"),
  crosshair: document.getElementById("crosshair"),
};

const MOVE_KEYS = {
  w: "forward", W: "forward", ArrowUp: "forward",
  s: "back", S: "back", ArrowDown: "back",
  a: "left", A: "left", ArrowLeft: "left",
  d: "right", D: "right", ArrowRight: "right",
};

let state;

function newGame() {
  const grid = createWorld();
  const world = buildWorldScene(grid);
  const fireFx = createFireEffects(world.scene);

  // Face the player roughly toward the evac zone (up and to the right).
  const startYaw = -Math.PI * 0.72;

  state = {
    grid,
    world,
    fireFx,
    player: new Player(PLAYER_START.row, PLAYER_START.col, startYaw),
    fire: new FireSystem(grid, { windDx: 1, windDy: -1 }),
    phase: "prep",
    prepSecondsLeft: PREP_PHASE_SECONDS,
    ended: false,
    won: false,
    keysHeld: new Set(),
    lastFrameAt: performance.now(),
  };

  controls.setYaw(startYaw);
  els.overlay.classList.add("hidden");
  state.player.log("Wildfire risk detected nearby. Prepare before it ignites.");
}

function endGame(won) {
  if (state.ended) return;
  state.ended = true;
  state.won = won;
  els.overlay.classList.remove("hidden");
  document.exitPointerLock();
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
  const { player, grid, fire, world } = state;
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
  world.sync(grid);

  if (!player.alive) {
    endGame(false);
    return;
  }
  const { row, col } = player.currentTile();
  if (grid[row][col].type === TILE.EVAC) {
    endGame(true);
  }
}

function handleInput(dt) {
  const { player, grid, keysHeld } = state;
  let forward = 0;
  let strafe = 0;
  if (keysHeld.has("forward")) forward += 1;
  if (keysHeld.has("back")) forward -= 1;
  if (keysHeld.has("right")) strafe += 1;
  if (keysHeld.has("left")) strafe -= 1;
  player.move(forward, strafe, controls.yaw, dt, grid);
}

function updateCamera() {
  const { player } = state;
  camera.rotation.x = controls.pitch;
  camera.rotation.y = controls.yaw;
  const bob = state.ended ? 0 : Math.sin(performance.now() / 220) * (state.moving ? 0.06 : 0);
  camera.position.set(player.x, EYE_HEIGHT + bob, player.z);
}

function updateHud() {
  const { player, phase, prepSecondsLeft, grid, fire } = state;

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
      "Objective: Gather wood/water/food and scout a route to the evacuation beacon.";
    els.phaseTimer.textContent = `Fire risk in: ${Math.max(0, prepSecondsLeft).toFixed(0)}s`;
  } else {
    els.objective.textContent = "Objective: The wildfire has ignited! Reach the evacuation beacon alive.";
    els.phaseTimer.textContent = `Active fires: ${fire.activeFireCount()}`;
  }

  els.log.innerHTML = player.messages
    .slice(-6)
    .map((m) => `<div>${escapeHtml(m)}</div>`)
    .join("");

  const target = player.interactTile(controls.yaw, grid);
  const interactable =
    !!target &&
    (target.tile.type === TILE.FOREST ||
      target.tile.type === TILE.WATER ||
      target.tile.type === TILE.HOUSE ||
      fire.isBurning(target.row, target.col));
  els.crosshair.classList.toggle("active", interactable);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.lastFrameAt) / 1000);
  state.lastFrameAt = now;

  if (!state.ended && controls.locked) {
    handleInput(dt);
    state.moving = state.keysHeld.size > 0;
  } else {
    state.moving = false;
  }

  updateCamera();
  state.world.update(now);
  state.fireFx.update(now, dt, state.fire);

  const heat = Math.min(1, state.fire.activeFireCount() / 40);
  state.world.updateAtmosphere(heat);

  updateHud();
  renderer.render(state.world.scene, camera);
  requestAnimationFrame(loop);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

canvas.addEventListener("click", () => {
  if (!state.ended) controls.requestLock();
});

// Headless/automated test hook only: real browsers grant pointer lock from
// the click handler above. Pointer Lock requires a trusted user gesture
// that test automation can't produce, so ?debug=1 lets a test harness force
// the same "locked" state the click handler would normally reach.
if (new URLSearchParams(window.location.search).has("debug")) {
  window.__debugForceLock = () => {
    controls.locked = true;
    els.lockPrompt.classList.add("hidden");
  };
  window.__debugTeleport = (x, z) => {
    state.player.x = x;
    state.player.z = z;
  };
  window.__debugInspect = () => ({
    sceneChildCount: state.world.scene.children.length,
    activeFireTiles: state.fire.activeFireCount(),
    flameSpriteCount: state.fireFx.flameGroup.children.length,
    activeEmberCount: state.fireFx.activeEmberCount(),
    playerPos: { x: state.player.x, z: state.player.z },
  });
}

controls.onLockChange = (locked) => {
  els.lockPrompt.classList.toggle("hidden", locked || state.ended);
};

window.addEventListener("keydown", (e) => {
  const move = MOVE_KEYS[e.key];
  if (move) {
    state.keysHeld.add(move);
    return;
  }
  if (e.repeat) return;
  if (state.ended) {
    if (e.key.toLowerCase() === "r") newGame();
    return;
  }
  if (!controls.locked) return;
  const { player, grid, fire } = state;
  const key = e.key.toLowerCase();
  if (key === "e") player.gather(controls.yaw, grid, fire);
  else if (key === "b") player.build(controls.yaw, grid, fire);
  else if (key === "f") player.douse(controls.yaw, grid, fire);
  else if (key === "r") newGame();
});

window.addEventListener("keyup", (e) => {
  const move = MOVE_KEYS[e.key];
  if (move) state.keysHeld.delete(move);
});

window.addEventListener("resize", onResize);

els.overlayRestart.addEventListener("click", () => newGame());

newGame();
onResize();
els.lockPrompt.classList.remove("hidden");
setInterval(simulationTick, TICK_MS);
requestAnimationFrame(loop);
