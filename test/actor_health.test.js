import test from 'node:test';
import assert from 'node:assert/strict';
import { baseHealth, recordHealthDamage, updateHealthTrail, drawHealthMeter } from '../src/actor_health_helper.js';
import { syncActorHealthCapacity } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';

test('기존 저장 체력은 20배로 읽고 새 HP는 다시 변환하지 않는다', () => {
  assert.equal(baseHealth(), 100);
  const legacy = { maxHpPips: 5 };
  const migrated = mergeTuning(DEFAULT_PLAYER_TUNING, legacy);
  assert.equal(migrated.maxHp, 100);
  assert.equal(migrated.maxHpPips, undefined);
  assert.equal(mergeTuning(DEFAULT_PLAYER_TUNING, migrated).maxHp, 100);
  assert.deepEqual(legacy, { maxHpPips: 5 });
});
test('피해 표시는 지연 후 감소하고 연속 피격은 남은 표시를 유지한다', () => {
  const actor = { hp: 100, maxHp: 100 };
  recordHealthDamage(actor);
  actor.hp = 80;
  updateHealthTrail(actor, 0.3);
  assert.equal(actor.healthTrail.hp, 100);
  recordHealthDamage(actor);
  actor.hp = 59.5;
  updateHealthTrail(actor, 0.45);
  assert.equal(actor.healthTrail.hp, 100);
  updateHealthTrail(actor, 0.1);
  assert.ok(actor.healthTrail.hp < 100 && actor.healthTrail.hp > actor.hp);
  updateHealthTrail(actor, 1);
  assert.equal(actor.healthTrail, null);
});
test('회복 및 재등장은 피해 흔적을 지우고 소수 HP와 0 HP를 보존한다', () => {
  const actor = { tuning: { maxHp: 100 }, hp: 59.5, player: {} };
  syncActorHealthCapacity(actor);
  assert.equal(actor.hp, 59.5);
  recordHealthDamage(actor);
  actor.hp = 80;
  updateHealthTrail(actor, 0.1);
  assert.equal(actor.healthTrail, null);
  actor.hp = 0;
  syncActorHealthCapacity(actor);
  assert.equal(actor.hp, 0);
  syncActorHealthCapacity(actor, true);
  assert.equal(actor.hp, 100);
  assert.equal(actor.healthTrail, null);
});
test('100 HP 바는 10마다 9개 눈금을 그리며 빨간 부분은 실제 HP보다 길다', () => {
  const fills = [],
    ticks = [];
  const ctx = {
    fillRect: (...args) => fills.push(args),
    moveTo: (...args) => ticks.push(args),
    lineTo() {},
    beginPath() {},
    stroke() {},
    strokeRect() {},
  };
  drawHealthMeter(ctx, { hp: 80, maxHp: 100, healthTrail: { hp: 100 }, tint: '#fff' }, 60, 0, 120);
  assert.equal(ticks.length, 9);
  assert.equal(fills[1][2], 120);
  assert.equal(fills[2][2], 96);
});
