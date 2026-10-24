import test from 'node:test';
import assert from 'node:assert/strict';
import { attractPickup, PICKUP_ATTRACTION } from '../src/pickup_magnet_helper.js';
const actor = { hp: 50, player: { x: 0, y: 0 } };
test('경험치와 하트는 같은140px 범위와420px/s 속도로 유인하고 도착해야 수집한다', () => {
  const pickup = { x: 100, y: -15, landed: true };
  assert.equal(attractPickup(pickup, actor, 0.1, PICKUP_ATTRACTION.radius, PICKUP_ATTRACTION.speed), false);
  assert.equal(pickup.x, 58);
  assert.equal(pickup.magnetized, true);
  assert.equal(attractPickup(pickup, actor, 0.1, PICKUP_ATTRACTION.radius, PICKUP_ATTRACTION.speed), true);
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
