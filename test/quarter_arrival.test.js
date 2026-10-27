import test from 'node:test';
import assert from 'node:assert/strict';
import { createArrival } from '../src/quarter_view/arrival.js';
test('arrival owns motion and clears combat input until landing at the original spawn', () => {
  const world = { floorY: 430, viewW: 1280, quarterView: {} };
  const actor = {
    quarterDepth: 0,
    player: { x: 480, y: 430, animTime: 0 },
    quarterPendingInputs: new Map([['attack', 1]]),
  };
  const intro = createArrival(world),
    keys = new Set(['KeyQ']),
    pressed = new Set(['Space']);
  intro.begin(actor);
  assert.ok(actor.player.x < 0 && actor.player.y < 250);
  for (let i = 0; i < 24; i++) assert.equal(intro.advance(0.1, keys, pressed), true);
  assert.equal(intro.active, true);
  assert.equal(keys.size + pressed.size, 0);
  for (let i = 0; i < 2; i++) intro.advance(0.1, keys, pressed);
  assert.equal(intro.active, false);
  assert.equal(actor.player.x, 480);
  assert.equal(actor.player.y, 430);
  assert.equal(actor.player.onGround, true);
  assert.equal(actor.player.actionPreview, null);
  assert.equal(actor.quarterPendingInputs.size, 0);
  assert.equal(intro.advance(0.1), false);
  intro.begin(actor);
  assert.equal(intro.active, true);
});

import { arrivalPose } from '../src/quarter_view/arrival_visual.js';
test('glide spreads wings, flares upright before contact, then folds and settles continuously', () => {
  assert.equal(arrivalPose(0).spread, 1);
  assert.ok(arrivalPose(1).lean > 0.5);
  assert.equal(arrivalPose(2.15).lean, 0);
  assert.equal(arrivalPose(2.15).spread, 1);
  assert.ok(arrivalPose(2.3).spread < 0.6);
  assert.ok(arrivalPose(2.3).squash < 0.92);
  assert.deepEqual(arrivalPose(2.5), { spread: 0, lean: 0, squash: 1, flare: 1 });
  for (const boundary of [1.55, 2.15, 2.47, 2.5]) {
    const a = arrivalPose(boundary - 0.00001),
      b = arrivalPose(boundary);
    for (const key of Object.keys(a)) assert.ok(Math.abs(a[key] - b[key]) < 0.0001);
  }
});
