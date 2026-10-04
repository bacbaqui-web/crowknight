import test from 'node:test';
import assert from 'node:assert/strict';
import { createHealthDrops } from '../src/health_drop_controller.js';
const world = { floorY: 0, gravity: 980 };
function enemy(group = 'mobs') {
  return {
    group,
    player: {
      deathRagdoll: {
        parts: [
          { x: 0, y: -50, vx: 20 },
          { x: 1, y: -50, vx: 20 },
        ],
      },
    },
  };
}
function player(hp = 70) {
  return { hp, maxHp: 100, player: { x: 0, y: 0 } };
}
test('잡몹의 조각 하나만 하트로 변하며 보스와 확률 실패는 제외한다', () => {
  const drops = createHealthDrops({ random: () => 0 });
  const mob = enemy();
  drops.recordKill(mob);
  drops.recordKill(enemy('bosses'));
  drops.update(0, player(), world);
  assert.equal(mob.player.deathRagdoll.parts.length, 1);
  assert.equal(drops.snapshot().length, 1);
  const missed = createHealthDrops({ random: () => 0.9 });
  missed.recordKill(enemy());
  missed.update(0, player(), world);
  assert.equal(missed.snapshot().length, 0);
});
test('하트는 날아가서 착지한 뒤 접근해야 10 HP를 회복하고 한번만 먹는다', () => {
  const drops = createHealthDrops({ random: () => 0 });
  const p = player();
  drops.recordKill(enemy());
  drops.update(0, p, world);
  for (let i = 0; i < 100; i++) drops.update(0.01, p, world);
  const [drop] = drops.snapshot();
  assert.ok(drop.landed);
  assert.ok(drop.x > 80);
  assert.equal(p.hp, 70);
  p.player.x = drop.x;
  drops.update(0, p, world);
  assert.equal(p.hp, 80);
  assert.equal(drops.snapshot().length, 0);
  drops.update(1, p, world);
  assert.equal(p.hp, 80);
});
test('최대 체력 제한, 사망자 회복 금지와 만료/초기화를 적용한다', () => {
  const drops = createHealthDrops({ random: () => 0 });
  const p = player(95);
  drops.recordKill(enemy());
  drops.update(1, p, world);
  p.player.x = drops.snapshot()[0].x;
  drops.update(0, p, world);
  assert.equal(p.hp, 100);
  p.hp = 0;
  drops.recordKill(enemy());
  drops.update(1, p, world);
  p.player.x = drops.snapshot()[0].x;
  drops.update(0, p, world);
  assert.equal(p.hp, 0);
  drops.update(10, p, world);
  assert.equal(drops.snapshot().length, 0);
  drops.recordKill(enemy());
  drops.reset();
  drops.update(0, p, world);
  assert.equal(drops.snapshot().length, 0);
});
test('하트는 회전하며 튕긴 뒤 바닥에서 굴러가고 마찰로 멈춘다', () => {
  const drops = createHealthDrops({ random: () => 0 });
  const p = player();
  p.player.x = -1000;
  drops.recordKill(enemy());
  drops.update(1, p, world);
  const bounced = drops.snapshot()[0];
  assert.ok(bounced.landed && !bounced.grounded);
  assert.ok(bounced.vy < 0);
  assert.notEqual(bounced.rot, 0);
  drops.update(0.5, p, world);
  const rolling = drops.snapshot()[0];
  assert.ok(rolling.grounded);
  assert.ok(rolling.x > bounced.x);
  assert.ok(Math.abs(rolling.vx) < Math.abs(bounced.vx));
  drops.update(2, p, world);
  const stopped = drops.snapshot()[0];
  assert.equal(stopped.vx, 0);
  assert.notEqual(stopped.rot, rolling.rot);
  assert.equal(stopped.y, world.floorY - 12);
});
