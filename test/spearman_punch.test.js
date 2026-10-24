import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import test from 'node:test';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { resetPlayerActionState } from '../src/actor_state.js';
import { updateBattleActorMotion } from '../src/enemy_runtime_engine.js';
import { resetSpearmanThrow, SPEARMAN_THROW, updateSpearmanThrow } from '../src/spearman_throw_runtime.js';

const tuning = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url))).actors.spearman.tuning;
function fixture() {
  const player = new PuppetPlayer(100, 400, { weapon: {} });
  player.applyTuning(tuning);
  const actor = { id: 'spearman', group: 'mobs', player, tuning, hp: 100, hitStun: 0 };
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

test('투창 후 근거리에서는 주먹을 선택하고 원거리/재사용 대기 중에는 접근한다', () => {
  const { actor, target } = fixture();
  assert.equal(actor.player.actionSettings.spearmanPunch.ai.enabled, false);
  aim(actor, target);
  release(actor, target);
  target.player.update = () => {};
  const update = (distance) => {
    resetPlayerActionState(actor.player);
    target.player.x = actor.player.x + distance;
    updateBattleActorMotion({
      actors: [target, actor],
      playerActor: target,
      keys: new Set(),
      pressed: new Set(),
      world: { floorY: 400 },
      dt: 0,
    });
    return actor.player.actionKey;
  };
  assert.equal(update(55), 'spearmanPunch');
  assert.notEqual(update(55), 'spearmanPunch');
  actor.aiActionCooldowns = {};
  assert.notEqual(update(200), 'spearmanPunch');
});

test('주먹 판정은 뻗는 구간의 손 근처에만 존재하며 창끝 위치를 사용하지 않는다', () => {
  for (const facing of [1, -1]) {
    const { actor } = fixture();
    actor.player.facing = facing;
    for (const progress of [0, 0.3, 0.5, 0.8, 1]) {
      actor.player.actionPreview = { action: 'spearmanPunch', t: progress };
      const regions = actor.player.attackInteractionRegions;
      if (progress !== 0.5) assert.equal(regions.length, 0);
      else {
        assert.equal(regions.length, 1);
        const region = regions[0];
        const forward = (region.x + region.w / 2 - actor.player.x) * facing;
        assert.ok(forward > 30 && forward < 60);
        assert.ok(region.w < 25 && region.h < 25);
      }
    }
  }
});

test('주먹 AI는 투창 이후에만 켜지고 재등장 시 다시 꺼진다', () => {
  const { actor, target } = fixture();
  assert.equal(actor.player.actionSettings.spearmanPunch.ai.enabled, false);
  aim(actor, target);
  release(actor, target);
  assert.equal(actor.player.actionSettings.spearmanPunch.ai.enabled, true);
  assert.equal(actor.player.rig.weapon.opacity, 0);
  resetSpearmanThrow(actor);
  assert.equal(actor.player.actionSettings.spearmanPunch.ai.enabled, false);
  assert.equal(actor.player.rig.weapon.opacity, 1);
});
