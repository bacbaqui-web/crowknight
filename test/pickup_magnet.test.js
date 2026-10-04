import test from 'node:test';
import assert from 'node:assert/strict';
import { attractPickup } from '../src/pickup_magnet_helper.js';
const actor = { hp: 50, player: { x: 0, y: 0 } };
test('경험치는 140px, 하트는 40px에서 유인하며 즉시 지급하지 않는다', () => {
  const orb = { x: 100, y: -15, landed: true },
    heart = { ...orb };
  assert.equal(attractPickup(orb, actor, 0.1, 140, 420), false);
  assert.equal(orb.x, 58);
  assert.equal(orb.magnetized, true);
  assert.equal(attractPickup(heart, actor, 0.1, 40, 260), false);
  assert.equal(heart.x, 100);
  heart.x = 35;
  assert.equal(attractPickup(heart, actor, 0.1, 40, 260), true);
});
test('비행 중/사망자에게는 끌리지 않으며 흡수 중에는 범위를 벗어나도 추적한다', () => {
  const pickup = { x: 100, y: -15, landed: false };
  attractPickup(pickup, actor, 1, 140, 420);
  assert.equal(pickup.x, 100);
  pickup.landed = true;
  attractPickup(pickup, { ...actor, hp: 0 }, 1, 140, 420);
  assert.equal(pickup.x, 100);
  attractPickup(pickup, actor, 0.1, 140, 420);
  const movedActor = { hp: 50, player: { x: -200, y: 0 } };
  attractPickup(pickup, movedActor, 0.1, 140, 420);
  assert.equal(pickup.x, 16);
});
