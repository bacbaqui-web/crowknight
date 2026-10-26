import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAround, segmentBox, terrainBlocksProjectile } from '../src/quarter_view/terrain_navigation.js';
import { finishPlaneMotion } from '../src/quarter_view/motion.js';
const obstacle = { x: 0, z: 0, w: 120, d: 100, height: 44, type: 'rock' };
test('route goes around obstacle corners and remains clear along every segment', () => {
  const start = { x: -200, z: 0 },
    goal = { x: 200, z: 0 },
    path = routeAround(start, goal, [obstacle]);
  assert.ok(path.length >= 3);
  let previous = start;
  for (const p of path) {
    assert.equal(segmentBox(previous, p, { x: -74, z: -64 }, { x: 74, z: 64 }), false);
    previous = p;
  }
  assert.deepEqual(path.at(-1), goal);
  assert.deepEqual(routeAround({ x: -200, z: 200 }, { x: 200, z: 200 }, [obstacle]), [{ x: 200, z: 200 }]);
});
test('route reaches the accessible edge when player is standing on a roof', () => {
  const path = routeAround({ x: -200, z: 0 }, { x: 0, z: 0 }, [obstacle]);
  assert.ok(path.length);
  assert.ok(path.at(-1).x < -60);
});
test('fast arrows hit scenery below its top and fly over it above its top', () => {
  const env = { nearby: () => [obstacle] },
    world = { floorY: 430 };
  const p = {
    previousX: -200,
    x: 200,
    previousY: 410,
    y: 410,
    previousDepth: 0,
    quarterDepth: 0,
    quarterAim: { x: 1, z: 0 },
    hitboxWidth: 40,
    hitboxHeight: 4,
  };
  assert.equal(terrainBlocksProjectile(p, env, world), true);
  assert.equal(terrainBlocksProjectile({ ...p, y: 350, previousY: 350 }, env, world), false);
  assert.equal(terrainBlocksProjectile({ ...p, previousDepth: 200, quarterDepth: 200 }, env, world), false);
  assert.equal(terrainBlocksProjectile({ ...p, powderBomb: true }, env, world), false);
  assert.equal(
    terrainBlocksProjectile({ ...p, y: 350, previousY: 350 }, { nearby: () => [{ ...obstacle, height: 100 }] }, world),
    true
  );
});
test('air input accelerates, reverses and brakes in world depth without changing jump height', () => {
  const actor = {
    quarterDepth: 0,
    quarterAim: { x: 1, z: 0 },
    quarterAirControl: true,
    player: {
      x: 0,
      y: 300,
      animTime: 0,
      facing: 1,
      vx: 10,
      onGround: false,
      attackSerial: 1,
      actionKey: 'jump',
      actionSettings: { jump: { group: 'movement' } },
    },
  };
  function step(direction) {
    actor.quarterMotionStart = {
      x: actor.player.x,
      z: actor.quarterDepth,
      time: actor.player.animTime,
      facing: 1,
      serial: 1,
      direction,
    };
    actor.player.animTime += 1 / 60;
    actor.player.x += 10;
    finishPlaneMotion(actor, { quarterView: { unbounded: true } });
  }
  for (let i = 0; i < 30; i++) step({ x: 0, z: 1 });
  assert.ok(actor.quarterDepth > 100);
  assert.equal(actor.player.x, 0);
  for (let i = 0; i < 30; i++) step({ x: 0, z: -1 });
  assert.ok(actor.quarterAirVelocity.z < -290);
  for (let i = 0; i < 30; i++) step(null);
  assert.ok(Math.abs(actor.quarterAirVelocity.z) < 1);
  assert.equal(actor.player.y, 300);
});
