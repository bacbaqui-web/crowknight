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
  assert.ok(actor.player.x < 0 && actor.player.y < 430);
  for (let i = 0; i < 13; i++) assert.equal(intro.advance(0.1, keys, pressed), true);
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
test('landing absorbs impact and returns to the normal pose', () => {
  assert.equal(arrivalPose(0).squash, 1);
  assert.equal(arrivalPose(1.15).squash, 1);
  assert.ok(arrivalPose(1.275).squash < 0.91);
  assert.equal(arrivalPose(1.4).squash, 1);
});
test('jump rises then falls to the exact destination without overshoot', () => {
  const world = { floorY: 430, viewW: 1280, quarterView: {} };
  const actor = { player: { x: 480, y: 430, animTime: 0 } };
  const intro = createArrival(world);
  intro.begin(actor);
  const startY = actor.player.y;
  for (let i = 0; i < 4; i++) intro.advance(0.1);
  assert.ok(actor.player.y < startY);
  assert.equal(actor.player.actionPreview.action, 'customAction3');
  for (let i = 0; i < 8; i++) intro.advance(0.1);
  assert.equal(actor.player.y, 430);
  assert.equal(actor.player.x, 480);
  assert.equal(actor.player.onGround, true);
});
