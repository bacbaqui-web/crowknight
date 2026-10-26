import { URL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironment } from '../src/quarter_view/environment.js';
const world = { floorY: 430 };
function actor(x = 480, z = 0, y = 430) {
  return { quarterDepth: z, player: { x, y, vy: 0, onGround: true } };
}
test('deterministic infinite chunks have bounded cache and clear spawn', () => {
  const env = createEnvironment();
  const first = env.nearby(480, 0);
  assert.ok(first.some((o) => o.type === 'hut'));
  assert.ok(first.some((o) => o.type === 'tree'));
  for (let i = 0; i < 500; i++) env.nearby(i * 1000, -i * 1000);
  assert.ok(env.cacheSize <= 100);
  assert.deepEqual(env.nearby(480, 0), first);
});
test('ground movement cannot tunnel through a rock and can slide along its face', () => {
  const env = createEnvironment(),
    a = actor();
  env.before(a, world, {});
  a.player.x = 820;
  env.after(a, world);
  assert.ok(a.player.x < 600);
  env.before(a, world, {});
  a.player.x += 60;
  a.quarterDepth += 40;
  env.after(a, world);
  assert.ok(a.player.x < 600);
  assert.ok(a.quarterDepth > 0);
});
test('jump over side then descend onto rock, stand, and walk off', () => {
  const env = createEnvironment(),
    a = actor(580, 0, 350),
    motion = {};
  a.player.onGround = false;
  env.before(a, world, motion);
  a.player.x = 670;
  a.player.y = 365;
  a.player.vy = 4;
  env.after(a, world);
  assert.equal(a.player.x, 670);
  env.before(a, world, motion);
  assert.equal(motion.floorY, 386);
  a.player.y = 390;
  env.after(a, world);
  assert.equal(a.player.y, 386);
  assert.equal(a.player.onGround, true);
  env.before(a, world, motion);
  env.after(a, world);
  assert.equal(a.quarterPlatform.type, 'rock');
  env.before(a, world, motion);
  a.player.x = 790;
  env.after(a, world);
  assert.equal(a.player.onGround, false);
  assert.equal(a.player.floorY, 430);
});
test('roof is a landing surface and trees remain blocking while airborne', () => {
  const env = createEnvironment(),
    a = actor(220, 240, 330);
  a.player.onGround = false;
  a.player.vy = 5;
  env.before(a, world, {});
  a.player.y = 350;
  env.after(a, world);
  assert.equal(a.player.y, 348);
  assert.equal(a.quarterPlatform.type, 'hut');
  const b = actor(500, -300, 280);
  env.before(b, world, {});
  b.player.x = 660;
  env.after(b, world);
  assert.ok(b.player.x < 546);
});

test('native actor physics lands and remains stable on both platform heights', async () => {
  const { readFileSync } = await import('node:fs');
  const { PuppetPlayer } = await import('../src/actor_runtime_engine.js');
  const { defaultTuningFor } = await import('../src/actor_tuning_helper.js');
  const { mergeTuning } = await import('../src/project_data_normalizer_helper.js');
  const { preparePlaneMotion, finishPlaneMotion } = await import('../src/quarter_view/motion.js');
  const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
  const def = saved.characters.find((a) => a.id === 'player_01');
  for (const [x, z, height] of [
    [670, 0, 44],
    [220, 240, 82],
  ]) {
    const env = createEnvironment(),
      p = new PuppetPlayer(x, 250, {});
    p.applyTuning(mergeTuning(defaultTuningFor(def), saved.actors.player_01.tuning));
    p.y = 250;
    p.onGround = false;
    p.vy = 0;
    const a = { player: p, quarterDepth: z, quarterAim: { x: 1, z: 0 } };
    const w = {
      floorY: 430,
      minX: -Infinity,
      maxX: Infinity,
      worldPhysics: { gravity: 1, inertia: 30 },
      quarterView: { unbounded: true },
    };
    const motion = Object.create(w);
    for (let frame = 0; frame < 180; frame++) {
      env.before(a, w, motion);
      const input = preparePlaneMotion(a, null, new Set(), new Set());
      p.update(1 / 60, input.keys, input.pressed, motion);
      finishPlaneMotion(a, w);
      env.after(a, w);
    }
    assert.equal(p.y, 430 - height);
    assert.equal(p.onGround, true);
    assert.equal(a.quarterPlatform.height, height);
  }
});
