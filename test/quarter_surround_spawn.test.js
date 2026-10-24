import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurroundingSpawner, outsideSpawnArea } from '../src/quarter_view/bounds.js';

test('eight successive spawns surround the current player at the configured safe radius', () => {
  const spawn = createSurroundingSpawner(
    { enemyRules: { spawnRule: { cameraOffsetMin: 740, cameraOffsetMax: 960 } } },
    () => 0.5
  );
  const sectors = new Set();
  for (let i = 0; i < 16; i++) {
    const target = { player: { x: 100000 + i * 800 }, quarterDepth: -100000 + i * 900 };
    const enemy = { player: {} };
    spawn(enemy, target);
    const dx = enemy.player.x - target.player.x,
      dz = enemy.quarterDepth - target.quarterDepth;
    assert.ok(Math.abs(Math.hypot(dx, dz) - 850) < 1e-8);
    assert.ok(enemy.quarterAim.x * dx + enemy.quarterAim.z * dz < 0);
    assert.equal(enemy.player.quarterDepth, enemy.quarterDepth);
    assert.equal(enemy.respawnTargetX, enemy.player.x);
    sectors.add((Math.round((Math.atan2(dz, dx) * 4) / Math.PI) + 8) % 8);
    if (i === 7) assert.equal(sectors.size, 8);
  }
});

test('reversed and too-small spawn distances still keep a safe gap', () => {
  const spawn = createSurroundingSpawner(
    { enemyRules: { spawnRule: { cameraOffsetMin: 20, cameraOffsetMax: 10 } } },
    () => 0
  );
  const enemy = { player: {} },
    hero = { player: { x: 0 }, quarterDepth: 0 };
  spawn(enemy, hero);
  assert.ok(Math.abs(Math.hypot(enemy.player.x, enemy.quarterDepth) - 240) < 1e-8);
});

test('only distant enemies recycle, in any direction and relative to the moving player', () => {
  const hero = { player: { x: 100000 }, quarterDepth: -100000 };
  for (const [x, z] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const enemy = { player: { x: hero.player.x + x * 1500 }, quarterDepth: hero.quarterDepth + z * 1500 };
    assert.equal(outsideSpawnArea(enemy, hero, {}), false);
    enemy.player.x = hero.player.x + x * 3000;
    enemy.quarterDepth = hero.quarterDepth + z * 3000;
    assert.equal(outsideSpawnArea(enemy, hero, {}), true);
  }
});
