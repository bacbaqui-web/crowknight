import test from 'node:test';
import assert from 'node:assert/strict';
import { createSlashTrails, TRAIL_LIMIT, TRAIL_LIFETIME } from '../src/quarter_view/slash_trail.js';
import { projectileAttackRegion } from '../src/projectile_runtime_engine.js';

const world = { floorY: 430 };
const view = { width: 1280, height: 720, x: 480, depth: 0, zoom: 1 };
function fixture(plane = 'ground') {
  const calls = { fills: 0, strokes: 0, paths: 0 };
  const ctx = {
    save() {},
    restore() {},
    beginPath() {
      calls.paths++;
    },
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {
      calls.fills++;
    },
    stroke() {
      calls.strokes++;
    },
  };
  const actor = {
    quarterDepth: 0,
    quarterAim: { x: 1, z: 0 },
    quarterAttackPlanes: { slash: plane },
    player: { x: 480, y: 430, facing: 1, animTime: 0, attackSerial: 1, actionKey: 'slash', actionSettings: {} },
  };
  const trail = createSlashTrails(ctx, world);
  function region(i = 0) {
    return { key: 'blade', x: 500 + i, y: 360 - i, w: 100, h: 16, reaction: { damage: 7 } };
  }
  return { trail, actor, calls, region };
}
test('ground ribbons ignore altitude and height ribbons retain it; source geometry is never changed', () => {
  for (const plane of ['ground', 'height']) {
    const { trail, actor, region } = fixture(plane);
    const raw = [region()],
      original = JSON.stringify(raw);
    trail.capture(actor, raw);
    actor.player.y -= 150;
    actor.player.animTime += 1 / 60;
    trail.capture(actor, [{ ...raw[0], y: raw[0].y - 150 }]);
    const samples = trail.samples(actor);
    assert.equal(samples.length, 2);
    if (plane === 'ground') assert.deepEqual(samples[0].tip, samples[1].tip);
    else assert.equal(samples[0].tip.y - samples[1].tip.y, 150);
    assert.equal(JSON.stringify(raw), original);
  }
});
test('history is bounded at high refresh rates, paused frames do not duplicate, and fading ends without active hitboxes', () => {
  const { trail, actor, calls, region } = fixture();
  for (let i = 0; i < 300; i++) {
    actor.player.animTime = i / 240;
    trail.capture(actor, [region(i)]);
  }
  assert.equal(trail.samples(actor).length, TRAIL_LIMIT);
  const captured = trail.stats.captured;
  trail.capture(actor, [region(300)]);
  assert.equal(trail.stats.captured, captured);
  trail.draw(actor, view, true);
  assert.ok(calls.fills <= 4 && calls.strokes <= 9, 'bounded batched draw calls');
  const projected = trail.stats.projected;
  trail.draw(actor, view, true);
  assert.equal(trail.stats.projected, projected, 'stationary view reuses projected sample points');
  actor.player.animTime += TRAIL_LIFETIME + 0.01;
  trail.capture(actor, []);
  const before = calls.paths;
  trail.draw(actor, view, true);
  assert.equal(trail.samples(actor).length, 0);
  assert.equal(calls.paths, before);
});
test('a new attack never connects to the previous attack, dead/reset actors discard trails and offscreen work is culled', () => {
  const { trail, actor, calls, region } = fixture();
  trail.capture(actor, [region()]);
  actor.player.attackSerial++;
  actor.player.animTime += 1 / 60;
  trail.capture(actor, [region(100)]);
  trail.draw(actor, view);
  assert.equal(calls.fills, 0);
  const before = calls.paths;
  trail.draw(actor, { ...view, x: 100000 });
  assert.equal(calls.paths, before);
  actor.player.dead = true;
  trail.draw(actor, view);
  assert.equal(trail.samples(actor).length, 0);
  actor.player.dead = false;
  actor.player.animTime++;
  trail.capture(actor, [region()]);
  trail.reset();
  assert.equal(trail.samples(actor).length, 0);
});
test('projectile hitboxes rotate with the arrow sprite and keep the authored reaction and dimensions', () => {
  const arrow = { x: 100, y: 200, angle: Math.PI / 2, hitboxWidth: 80, hitboxHeight: 8, reaction: { damage: 3 } };
  const r = projectileAttackRegion(arrow);
  assert.ok(Math.abs(r.w - 8) < 1e-6);
  assert.ok(Math.abs(r.h - 80) < 1e-6);
  assert.equal(r.reaction, arrow.reaction);
  assert.ok(r.points.every((p) => Math.abs(p.x - 100) <= 4.00001 && Math.abs(p.y - 200) <= 40.00001));
});

test('an instantaneous facing flip cannot connect two opposite sword trails even in the same action', () => {
  const { trail, actor, calls, region } = fixture();
  trail.capture(actor, [region()]);
  actor.player.facing = -1;
  actor.quarterAim = { x: -1, z: 0 };
  actor.player.animTime += 1 / 60;
  trail.capture(actor, [region(100)]);
  trail.draw(actor, view);
  assert.equal(calls.fills, 0);
});
