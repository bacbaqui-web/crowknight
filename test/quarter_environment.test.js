import { URL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironment, SCENERY_TYPES } from '../src/quarter_view/environment.js';
const world = { floorY: 430 };
function actor(x = 480, z = 0, y = 430) {
  return { quarterDepth: z, player: { x, y, vy: 0, onGround: true } };
}
test('deterministic infinite chunks have bounded cache and clear spawn', () => {
  const env = createEnvironment();
  const first = env.nearby(480, 0);
  assert.ok(first.some((o) => o.type === 'boulder'));
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
  assert.ok(a.player.x < 620);
  env.before(a, world, {});
  a.player.x += 60;
  a.quarterDepth += 40;
  env.after(a, world);
  assert.ok(a.player.x < 620);
  assert.ok(a.quarterDepth > 0);
});
test('roof is a landing surface and trees remain blocking while airborne', () => {
  const env = createEnvironment(),
    a = actor(140, 500, 330);
  a.player.onGround = false;
  a.player.vy = 5;
  env.before(a, world, {});
  a.player.y = 350;
  env.after(a, world);
  assert.equal(a.player.y, world.floorY - SCENERY_TYPES.hut.height);
  assert.equal(a.quarterPlatform.type, 'hut');
  const b = actor(500, -300, 280);
  env.before(b, world, {});
  b.player.x = 660;
  env.after(b, world);
  assert.ok(b.player.x < 546);
});

test('native actor physics lands and remains stable on the roof height', async () => {
  const { readFileSync } = await import('node:fs');
  const { PuppetPlayer } = await import('../src/actor_runtime_engine.js');
  const { defaultTuningFor } = await import('../src/actor_tuning_helper.js');
  const { mergeTuning } = await import('../src/project_data_normalizer_helper.js');
  const { preparePlaneMotion, finishPlaneMotion } = await import('../src/quarter_view/motion.js');
  const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
  const def = saved.characters.find((a) => a.id === 'player_01');
  for (const [x, z, height] of [[140, 500, SCENERY_TYPES.hut.height]]) {
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

test('low stones and steps are ground decoration, separate from solid boulders', () => {
  const env = createEnvironment();
  const all = env.nearby(480, 0, 700, 700, true);
  const solid = env.nearby(480, 0, 700, 700);
  for (const id of ['start-stones', 'start-hut']) {
    const floor = all.find((o) => o.id === id);
    assert.equal(floor.groundDecoration, true);
    assert.equal(floor.height, 0);
    assert.ok(!solid.some((o) => o.id === id));
    const a = actor(floor.x - 100, floor.z);
    env.before(a, world, {});
    a.player.x = floor.x;
    env.after(a, world);
    assert.ok(Math.abs(a.player.x - floor.x) < 1e-8);
    assert.equal(a.player.y, world.floorY);
  }
  assert.ok(solid.some((o) => o.type === 'boulder' && !o.climbable && o.height > 0));
});

test('all four half-size boulders have no landing surface and allow passage behind', () => {
  const env = createEnvironment();
  const rocks = env.nearby(2500, 2500, 4000, 4000).filter((o) => o.type === 'boulder');
  assert.equal(new Set(rocks.map((o) => o.variant % 4)).size, 4);
  for (const rock of rocks) {
    assert.equal(rock.climbable, false);
    assert.ok(rock.w <= 123 && rock.d <= 65);
  }
  const rock = env.nearby(480, 0).find((o) => o.type === 'boulder');
  const a = actor(rock.x, rock.z, 250);
  a.player.onGround = false;
  a.player.vy = 5;
  const motion = {};
  env.before(a, world, motion);
  assert.equal(motion.floorY, 430);
  a.player.y = 400;
  env.after(a, world);
  assert.equal(a.quarterPlatform, null);
  assert.equal(a.player.floorY, 430);
  const b = actor(rock.x - 130, rock.z - rock.d / 2 - 25);
  env.before(b, world, {});
  b.player.x = rock.x + 130;
  env.after(b, world);
  assert.ok(Math.abs(b.player.x - (rock.x + 130)) < 1e-8);
});
