import * as THREE from "./vendor/three.module.min.js";
import { WORLD_UNIT } from "./config.js";
import { tileToWorldX, tileToWorldZ, tileRand } from "./world.js";

const MAX_EMBERS = 260;
const MAX_SMOKE = 70;

function radialTexture(stops, size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createFireEffects(scene) {
  const flameTexture = radialTexture([
    [0, "rgba(255,255,235,1)"],
    [0.35, "rgba(255,170,60,0.95)"],
    [0.7, "rgba(220,60,10,0.55)"],
    [1, "rgba(220,60,10,0)"],
  ]);
  const emberTexture = radialTexture([
    [0, "rgba(255,255,220,1)"],
    [0.5, "rgba(255,150,40,0.9)"],
    [1, "rgba(255,150,40,0)"],
  ]);
  const smokeTexture = radialTexture([
    [0, "rgba(110,108,105,0.55)"],
    [0.6, "rgba(90,88,85,0.32)"],
    [1, "rgba(90,88,85,0)"],
  ]);

  const flameGroup = new THREE.Group();
  scene.add(flameGroup);
  const flameSprites = new Map();

  // Embers: a single Points cloud reused every frame (cheap, one draw call).
  const emberPositions = new Float32Array(MAX_EMBERS * 3);
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
  const emberMaterial = new THREE.PointsMaterial({
    size: 0.5,
    map: emberTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const emberPoints = new THREE.Points(emberGeometry, emberMaterial);
  scene.add(emberPoints);
  const embers = [];

  // Smoke: a small pool of reusable billboard sprites.
  const smokePool = [];
  for (let i = 0; i < MAX_SMOKE; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, depthWrite: false, opacity: 0 })
    );
    sprite.visible = false;
    scene.add(sprite);
    smokePool.push({ sprite, active: false, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0 });
  }

  function syncFlames(burningMap, now) {
    const activeKeys = new Set(burningMap.keys());
    for (const key of activeKeys) {
      if (flameSprites.has(key)) continue;
      const [r, c] = key.split(",").map(Number);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: flameTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      sprite.position.set(tileToWorldX(c), 1.6, tileToWorldZ(r));
      sprite.userData.phase = tileRand(r, c, 3) * Math.PI * 2;
      flameGroup.add(sprite);
      flameSprites.set(key, sprite);
    }
    for (const [key, sprite] of flameSprites) {
      if (activeKeys.has(key)) continue;
      flameGroup.remove(sprite);
      sprite.material.dispose();
      flameSprites.delete(key);
    }
    for (const [key, sprite] of flameSprites) {
      const flicker = 0.8 + 0.3 * Math.sin(now / 110 + sprite.userData.phase * 3);
      const scale = WORLD_UNIT * 0.85 * flicker;
      sprite.scale.set(scale, scale * 1.35, 1);
      sprite.position.y = 1.5 + Math.sin(now / 160 + sprite.userData.phase) * 0.2;
    }
  }

  function spawnFromBurning(burningMap) {
    if (embers.length < MAX_EMBERS) {
      for (const key of burningMap.keys()) {
        if (Math.random() > 0.3) continue;
        const [r, c] = key.split(",").map(Number);
        embers.push({
          x: tileToWorldX(c) + (Math.random() - 0.5) * WORLD_UNIT * 0.5,
          y: 1.2,
          z: tileToWorldZ(r) + (Math.random() - 0.5) * WORLD_UNIT * 0.5,
          vx: (Math.random() - 0.5) * 1.4,
          vy: 3.2 + Math.random() * 2.6,
          vz: (Math.random() - 0.5) * 1.4,
          life: 0.8 + Math.random() * 0.7,
          maxLife: 0.8 + Math.random() * 0.7,
        });
        if (embers.length >= MAX_EMBERS) break;
      }
    }

    const freeSlot = smokePool.find((s) => !s.active);
    if (freeSlot) {
      for (const key of burningMap.keys()) {
        if (Math.random() > 0.05) continue;
        const [r, c] = key.split(",").map(Number);
        freeSlot.active = true;
        freeSlot.life = 3.5 + Math.random() * 2;
        freeSlot.maxLife = freeSlot.life;
        freeSlot.sprite.position.set(tileToWorldX(c), 2, tileToWorldZ(r));
        freeSlot.vx = (Math.random() - 0.5) * 0.8;
        freeSlot.vy = 1.6 + Math.random() * 1.2;
        freeSlot.vz = (Math.random() - 0.5) * 0.8;
        freeSlot.sprite.scale.setScalar(WORLD_UNIT * 0.6);
        freeSlot.sprite.visible = true;
        break;
      }
    }
  }

  function updateParticles(dt) {
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.life -= dt;
      if (e.life <= 0) {
        embers.splice(i, 1);
        continue;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.z += e.vz * dt;
      e.vy -= 2.2 * dt;
    }
    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      emberPositions[i * 3] = e.x;
      emberPositions[i * 3 + 1] = e.y;
      emberPositions[i * 3 + 2] = e.z;
    }
    emberGeometry.setDrawRange(0, embers.length);
    emberGeometry.attributes.position.needsUpdate = true;

    for (const s of smokePool) {
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        s.sprite.visible = false;
        continue;
      }
      s.sprite.position.x += s.vx * dt;
      s.sprite.position.y += s.vy * dt;
      s.sprite.position.z += s.vz * dt;
      const t = s.life / s.maxLife;
      s.sprite.material.opacity = Math.min(0.4, t) * 0.9;
      s.sprite.scale.addScalar(dt * 1.4);
    }
  }

  return {
    flameGroup,
    activeEmberCount: () => embers.length,
    update(now, dt, fire) {
      syncFlames(fire.burning, now);
      spawnFromBurning(fire.burning);
      updateParticles(dt);
    },
  };
}
