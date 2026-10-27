import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import test from 'node:test';
import { resetPlayerActionState } from '../src/actor_state.js';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { resetSpearmanThrow, SPEARMAN_THROW, updateSpearmanThrow } from '../src/spearman_throw_runtime.js';
import {
  activeProjectiles,
  resetProjectileRuntime,
  updateProjectileRuntime,
} from '../src/projectile_runtime_engine.js';
import { groundProjectileRegion, combatTargetRegions } from '../src/quarter_view/spatial.js';

const tuning = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url))).actors.spearman.tuning;
function fixture() {
  const player = new PuppetPlayer(100, 400, { weapon: {} });
  player.applyTuning(tuning);
  const actor = { id: 'spearman', player, tuning, hp: 100, hitStun: 0 };
  const target = { id: 'player', player: { x: 500, y: 400, transform: { scale: 1 } } };
  return { actor, target };
}
function aim(actor, target, world = {}) {
  assert.equal(updateSpearmanThrow(actor, target, SPEARMAN_THROW.survival, world), true);
  assert.equal(actor.spearmanThrow.phase, 'aiming');
}
function release(actor, target, world = {}) {
  updateSpearmanThrow(actor, target, 0.6, world);
  updateSpearmanThrow(actor, target, 0.4, world);
}

test('생존 10초까지 기다리고 일시정지 중에는 타이머가 진행되지 않는다', () => {
  const { actor, target } = fixture();
  updateSpearmanThrow(actor, target, 9.9, {});
  for (let i = 0; i < 20; i++) updateSpearmanThrow(actor, target, 0, {});
  assert.equal(actor.spearmanThrow.phase, 'waiting');
  updateSpearmanThrow(actor, target, 0.11, {});
  assert.equal(actor.spearmanThrow.phase, 'aiming');
});

test('예고 후반 조준을 고정하고 같은 직선으로 발사하며 유도하지 않는다', () => {
  resetProjectileRuntime();
  const { actor, target } = fixture();
  aim(actor, target);
  target.player.y = 320;
  updateSpearmanThrow(actor, target, 0.6, {});
  const locked = { ...actor.spearmanThrow.aim };
  target.player.x = -500;
  target.player.y = 100;
  updateSpearmanThrow(actor, target, 0.4, {});
  updateProjectileRuntime({ actors: [actor], playerActor: target, dt: 0 });
  const spear = activeProjectiles()[0];
  assert.equal(activeProjectiles().length, 1);
  assert.equal(spear.startX, locked.startX);
  assert.equal(spear.targetX, locked.targetX);
  assert.equal(spear.targetY, locked.targetY);
  updateProjectileRuntime({ actors: [actor], playerActor: target, dt: 0.2 });
  const cross =
    (spear.x - spear.startX) * (spear.targetY - spear.startY) -
    (spear.y - spear.startY) * (spear.targetX - spear.startX);
  assert.ok(Math.abs(cross) < 1e-6);
  assert.ok(Math.abs(Math.hypot(spear.x - spear.startX, spear.y - spear.startY) - SPEARMAN_THROW.speed * 0.2) < 1e-6);
});

test('투창 후 창을 유지하고 10초 뒤 다시 원거리 투창한다', () => {
  const { actor, target } = fixture();
  aim(actor, target);
  release(actor, target);
  assert.ok(actor.player.layerOrder.includes('weapon'));
  assert.equal(actor.player.rig.weapon.opacity, 1);
  assert.equal(actor.player.actionSettings.customAction2.ai.enabled, true);
  resetPlayerActionState(actor.player);
  assert.equal(updateSpearmanThrow(actor, target, 9.9, {}), false);
  assert.equal(updateSpearmanThrow(actor, target, 0.11, {}), true);
  release(actor, target);
  assert.ok(actor.spearmanThrow.pending);
  resetSpearmanThrow(actor);
  assert.equal(actor.spearmanThrow, null);
});
test('근접에서는 쿨타임이 지나도 찌르기를 우선한다', () => {
  const { actor, target } = fixture();
  target.player.x = actor.player.x + 100;
  assert.equal(updateSpearmanThrow(actor, target, 30, {}), false);
  target.player.x = actor.player.x + 400;
  assert.equal(updateSpearmanThrow(actor, target, 0, {}), true);
});

test('예고 도중 사망/피격되면 발사를 취소하고 재등장은 새 생존 시간을 쓴다', () => {
  for (const interrupted of ['dead', 'hurtTime']) {
    resetProjectileRuntime();
    const { actor, target } = fixture();
    aim(actor, target);
    actor.player[interrupted] = interrupted === 'dead' ? true : 0.2;
    updateSpearmanThrow(actor, target, 1, {});
    updateProjectileRuntime({ actors: [actor], playerActor: target });
    assert.equal(activeProjectiles().length, 0);
    assert.equal(actor.spearmanThrow.aim, null);
    resetSpearmanThrow(actor);
    actor.player.dead = false;
    actor.player.hurtTime = 0;
    updateSpearmanThrow(actor, target, 0.1, {});
    assert.equal(actor.spearmanThrow.phase, 'waiting');
  }
});

test('동일 종류의 여러 창잡이는 생존/투창 상태를 공유하지 않는다', () => {
  const a = fixture(),
    b = fixture();
  aim(a.actor, a.target);
  release(a.actor, a.target);
  updateSpearmanThrow(b.actor, b.target, 2, {});
  assert.equal(b.actor.spearmanThrow.thrown, false);
  assert.ok(b.actor.player.layerOrder.includes('weapon'));
});

test('쿼터뷰의 깊이 방향 투창 판정과 높이 회피를 유지한다', () => {
  resetProjectileRuntime();
  const { actor, target } = fixture();
  actor.quarterDepth = 0;
  target.quarterDepth = 300;
  target.player.x = 116;
  aim(actor, target, { quarterView: {} });
  release(actor, target, { quarterView: {} });
  updateProjectileRuntime({ actors: [actor], playerActor: target, dt: 0 });
  const spear = activeProjectiles()[0];
  const region = groundProjectileRegion(spear, { x: spear.x, y: spear.y, w: 145, h: 11 });
  assert.ok(region.h > region.w * 5);
  target.quarterDepth = spear.quarterDepth;
  const hit = combatTargetRegions(actor, target, [{ x: spear.x, y: spear.y - 10, w: 20, h: 30 }], region);
  const jump = combatTargetRegions(actor, target, [{ x: spear.x, y: spear.y - 100, w: 20, h: 30 }], region);
  assert.equal(hit.length, 1);
  assert.equal(jump.length, 0);
});
