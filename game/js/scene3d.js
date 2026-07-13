import * as THREE from "./vendor/three.module.min.js";
import { TILE, TILE_COLORS, GRID_COLS, GRID_ROWS, WORLD_UNIT } from "./config.js";
import { tileToWorldX, tileToWorldZ, worldWidth, worldDepth, tileRand } from "./world.js";

const GROUND_PX_PER_TILE = 16;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = false;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
  camera.rotation.order = "YXZ";
  return camera;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(rgb, amt) {
  return `rgb(${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v + amt)))).join(",")})`;
}

function paintGround(ctx, grid) {
  const px = GROUND_PX_PER_TILE;
  for (let r = 0; r < GRID_ROWS; r++) {
    const cy = (GRID_ROWS - 1 - r) * px;
    for (let c = 0; c < GRID_COLS; c++) {
      const cx = c * px;
      const tile = grid[r][c];
      const baseHex = TILE_COLORS[tile.type] || "#4c7a3f";
      const rgb = hexToRgb(baseHex);

      ctx.fillStyle = shade(rgb, 0);
      ctx.fillRect(cx, cy, px, px);

      // Cheap organic mottling: a handful of deterministic speckles per tile.
      const speckleCount = tile.type === TILE.WATER ? 0 : 5;
      for (let i = 0; i < speckleCount; i++) {
        const sx = cx + tileRand(r, c, i * 3 + 1) * px;
        const sy = cy + tileRand(r, c, i * 3 + 2) * px;
        const size = 1 + tileRand(r, c, i * 3 + 3) * 2.5;
        const dark = tileRand(r, c, i * 3 + 4) > 0.5;
        ctx.fillStyle = shade(rgb, dark ? -28 : 22);
        ctx.fillRect(sx, sy, size, size);
      }

      if (tile.type === TILE.ASH && tile.ash > 0) {
        ctx.fillStyle = `rgba(255,110,40,${Math.min(0.35, tile.ash / 22)})`;
        ctx.fillRect(cx, cy, px, px);
      }
      if (tile.type === TILE.EVAC) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 1, cy + 1, px - 2, px - 2);
      }
    }
  }
}

function buildGround(grid) {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_COLS * GROUND_PX_PER_TILE;
  canvas.height = GRID_ROWS * GROUND_PX_PER_TILE;
  const ctx = canvas.getContext("2d");
  paintGround(ctx, grid);

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const geometry = new THREE.PlaneGeometry(worldWidth(), worldDepth());
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((worldWidth() - WORLD_UNIT) / 2, 0, (worldDepth() - WORLD_UNIT) / 2);

  return {
    mesh,
    repaint(latestGrid) {
      paintGround(ctx, latestGrid);
      texture.needsUpdate = true;
    },
  };
}

// Instanced props (trees, rocks) placed at every matching tile, with a
// fixed instance count decided at world-build time. Tiles that change type
// later (a chopped tree, a burned house) hide their instance by zeroing its
// scale rather than resizing the InstancedMesh buffer.
function buildInstancedProp(tiles, buildInstanceMatrix, geometry, material) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, tiles.length));
  mesh.count = tiles.length;
  const dummy = new THREE.Object3D();
  const tileIndex = new Map();
  const hidden = new Array(tiles.length).fill(false);
  const hideMatrix = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);

  tiles.forEach(({ row, col }, i) => {
    buildInstanceMatrix(dummy, row, col);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    tileIndex.set(`${row},${col}`, i);
  });
  mesh.instanceMatrix.needsUpdate = true;

  return {
    mesh,
    sync(grid, expectedType) {
      let changed = false;
      for (const [key, i] of tileIndex) {
        const [row, col] = key.split(",").map(Number);
        const shouldBeVisible = grid[row][col].type === expectedType;
        if (shouldBeVisible === !hidden[i]) continue;
        if (shouldBeVisible) {
          buildInstanceMatrix(dummy, row, col);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        } else {
          mesh.setMatrixAt(i, hideMatrix);
        }
        hidden[i] = !shouldBeVisible;
        changed = true;
      }
      if (changed) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function collectTiles(grid, type) {
  const tiles = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c].type === type) tiles.push({ row: r, col: c });
    }
  }
  return tiles;
}

function buildTrees(grid) {
  const tiles = collectTiles(grid, TILE.FOREST);

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#4a3423", roughness: 1 });
  const trunk = buildInstancedProp(
    tiles,
    (dummy, row, col) => {
      const jx = (tileRand(row, col, 51) - 0.5) * WORLD_UNIT * 0.5;
      const jz = (tileRand(row, col, 52) - 0.5) * WORLD_UNIT * 0.5;
      dummy.position.set(tileToWorldX(col) + jx, 0.8, tileToWorldZ(row) + jz);
      dummy.rotation.y = tileRand(row, col, 53) * Math.PI * 2;
      const s = 0.85 + tileRand(row, col, 54) * 0.5;
      dummy.scale.set(s, s, s);
    },
    trunkGeo,
    trunkMat
  );

  const canopyGeo = new THREE.ConeGeometry(1.5, 3.4, 7);
  const canopyMat = new THREE.MeshStandardMaterial({ color: "#2f5c29", roughness: 1 });
  const canopy = buildInstancedProp(
    tiles,
    (dummy, row, col) => {
      const jx = (tileRand(row, col, 51) - 0.5) * WORLD_UNIT * 0.5;
      const jz = (tileRand(row, col, 52) - 0.5) * WORLD_UNIT * 0.5;
      dummy.position.set(tileToWorldX(col) + jx, 2.5, tileToWorldZ(row) + jz);
      dummy.rotation.y = tileRand(row, col, 55) * Math.PI * 2;
      const s = 0.85 + tileRand(row, col, 54) * 0.5;
      dummy.scale.set(s, s, s);
    },
    canopyGeo,
    canopyMat
  );

  return {
    group: [trunk.mesh, canopy.mesh],
    sync(latestGrid) {
      trunk.sync(latestGrid, TILE.FOREST);
      canopy.sync(latestGrid, TILE.FOREST);
    },
  };
}

function buildRockDecor(grid) {
  const tiles = collectTiles(grid, TILE.ROCK).filter((t) => tileRand(t.row, t.col, 60) < 0.4);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: "#8a8a83", roughness: 1, flatShading: true });
  const { mesh } = buildInstancedProp(
    tiles,
    (dummy, row, col) => {
      const jx = (tileRand(row, col, 61) - 0.5) * WORLD_UNIT * 0.6;
      const jz = (tileRand(row, col, 62) - 0.5) * WORLD_UNIT * 0.6;
      const s = 0.5 + tileRand(row, col, 63) * 1.1;
      dummy.position.set(tileToWorldX(col) + jx, s * 0.5, tileToWorldZ(row) + jz);
      dummy.rotation.set(tileRand(row, col, 64) * 6, tileRand(row, col, 65) * 6, tileRand(row, col, 66) * 6);
      dummy.scale.set(s, s * 0.8, s);
    },
    geo,
    mat
  );
  return mesh;
}

function buildHouses(grid) {
  const tiles = collectTiles(grid, TILE.HOUSE);
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: "#a97a52", roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: "#5c3a26", roughness: 0.9 });
  const wallGeo = new THREE.BoxGeometry(2.6, 1.9, 2.6);
  const roofGeo = new THREE.ConeGeometry(2.1, 1.4, 4);

  const houseTiles = [];
  for (const { row, col } of tiles) {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(tileToWorldX(col), 0.95, tileToWorldZ(row));
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(tileToWorldX(col), 2.6, tileToWorldZ(row));
    roof.rotation.y = Math.PI / 4;
    const houseGroup = new THREE.Group();
    houseGroup.add(wall, roof);
    group.add(houseGroup);
    houseTiles.push({ row, col, houseGroup });
  }

  return {
    group,
    sync(latestGrid) {
      for (const { row, col, houseGroup } of houseTiles) {
        houseGroup.visible = latestGrid[row][col].type === TILE.HOUSE;
      }
    },
  };
}

function buildWater(grid) {
  const tiles = collectTiles(grid, TILE.WATER);
  const geo = new THREE.PlaneGeometry(WORLD_UNIT * 1.05, WORLD_UNIT * 1.05);
  geo.rotateX(-Math.PI / 2);
  const meshes = tiles.map(({ row, col }) => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#2f6f9e",
      transparent: true,
      opacity: 0.88,
      roughness: 0.25,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(tileToWorldX(col), 0.12, tileToWorldZ(row));
    mesh.userData.phase = tileRand(row, col, 70) * Math.PI * 2;
    return mesh;
  });

  return {
    meshes,
    update(now) {
      for (const m of meshes) {
        const t = now / 700 + m.userData.phase;
        m.position.y = 0.12 + Math.sin(t) * 0.03;
        m.material.opacity = 0.8 + Math.sin(t * 1.3) * 0.08;
      }
    },
  };
}

function buildEvac(grid) {
  const tiles = collectTiles(grid, TILE.EVAC);
  if (tiles.length === 0) return { group: new THREE.Group(), update() {} };

  const centerRow = tiles.reduce((s, t) => s + t.row, 0) / tiles.length;
  const centerCol = tiles.reduce((s, t) => s + t.col, 0) / tiles.length;
  const cx = tileToWorldX(centerCol);
  const cz = tileToWorldZ(centerRow);

  const group = new THREE.Group();

  const beamMat = new THREE.MeshBasicMaterial({ color: "#8fdcff", transparent: true, opacity: 0.35 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 60, 8, 1, true), beamMat);
  beam.position.set(cx, 30, cz);
  group.add(beam);

  const poleMat = new THREE.MeshStandardMaterial({ color: "#2a2a2a" });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 6), poleMat);
  pole.position.set(cx, 1.5, cz);
  group.add(pole);

  const lampMat = new THREE.MeshBasicMaterial({ color: "#bfe9ff" });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), lampMat);
  lamp.position.set(cx, 3.1, cz);
  group.add(lamp);

  const light = new THREE.PointLight("#8fdcff", 4, 26, 2);
  light.position.set(cx, 3.5, cz);
  group.add(light);

  return {
    group,
    update(now) {
      const pulse = 0.6 + Math.sin(now / 350) * 0.4;
      light.intensity = 3 + pulse * 3;
      lampMat.color.setHSL(0.55, 0.7, 0.6 + pulse * 0.2);
      beamMat.opacity = 0.22 + pulse * 0.18;
    },
  };
}

// Reused across frames in updateAtmosphere() below to avoid allocating new
// THREE.Color instances on every render call.
const skyDay = new THREE.Color("#bcd6e8");
const skyFire = new THREE.Color("#8a5335");
const sunDay = new THREE.Color("#fff3d6");
const sunFire = new THREE.Color("#ff8a3d");
const mixedSky = new THREE.Color();
const mixedSun = new THREE.Color();

export function buildWorldScene(grid) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#bcd6e8");
  scene.fog = new THREE.FogExp2("#bcd6e8", 0.01);

  const ambient = new THREE.HemisphereLight("#cfe6ff", "#3f4a33", 0.9);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#fff3d6", 1.4);
  sun.position.set(60, 90, 30);
  scene.add(sun);

  const ground = buildGround(grid);
  scene.add(ground.mesh);

  const trees = buildTrees(grid);
  scene.add(...trees.group);

  const rocks = buildRockDecor(grid);
  scene.add(rocks);

  const houses = buildHouses(grid);
  scene.add(houses.group);

  const water = buildWater(grid);
  for (const m of water.meshes) scene.add(m);

  const evac = buildEvac(grid);
  scene.add(evac.group);

  function sync(latestGrid) {
    ground.repaint(latestGrid);
    trees.sync(latestGrid);
    houses.sync(latestGrid);
  }

  function update(now) {
    water.update(now);
    evac.update(now);
  }

  function updateAtmosphere(heat) {
    mixedSky.copy(skyDay).lerp(skyFire, heat * 0.7);
    scene.background = mixedSky;
    scene.fog.color = mixedSky;
    scene.fog.density = 0.01 + heat * 0.028;
    mixedSun.copy(sunDay).lerp(sunFire, heat * 0.6);
    sun.color.copy(mixedSun);
    ambient.intensity = 0.9 - heat * 0.25;
  }

  return { scene, sync, update, updateAtmosphere };
}
