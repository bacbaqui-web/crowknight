import test from 'node:test';
import assert from 'node:assert/strict';
import { createJumpCameraFollow, groundPoint, QUARTER_PROJECTION } from '../src/quarter_view/camera.js';

test('camera rises smoothly with jump, freezes on pause and returns on landing', () => {
  const follow = createJumpCameraFollow();
  const actor = { player: { y: 430, animTime: 0 } };
  assert.equal(follow(actor, 430), 0);
  actor.player.y = 230;
  actor.player.animTime = 1 / 60;
  const first = follow(actor, 430);
  assert.ok(first > 0 && first < 200);
  assert.equal(follow(actor, 430), first);
  for (let i = 0; i < 60; i++) {
    actor.player.animTime += 1 / 60;
    follow(actor, 430);
  }
  const height = follow(actor, 430);
  assert.equal(height, 200);
  const point = groundPoint(0, 0, {
    x: 0,
    depth: -height / QUARTER_PROJECTION.slope,
    width: 800,
    height: 600,
    zoom: 1,
  });
  assert.ok(Math.abs(point.y - 200 - 600 * 0.58) < 1e-8);
  actor.player.y = 430;
  for (let i = 0; i < 60; i++) {
    actor.player.animTime += 1 / 60;
    follow(actor, 430);
  }
  assert.equal(follow(actor, 430), 0);
  actor.player.y = 330;
  actor.player.animTime = 0;
  assert.equal(follow(actor, 430), 100);
});
