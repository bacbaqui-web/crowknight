import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunUpgradeState } from '../src/run_upgrade_state.js';
import { UPGRADE_CARDS, upgradeEffectLabel } from '../src/upgrade_card_data.js';

test('선택한 카드는 플레이어, 선택하지 않은 카드는 적에게 같은 종류로 누적한다', () => {
  const state = createRunUpgradeState();
  const pair = ['sharp-blade', 'crow-footsteps'];
  state.choose(pair, pair[0]);
  state.choose(pair, pair[1]);
  state.choose(pair, pair[0]);
  assert.deepEqual(state.getSnapshot(), {
    player: { 'sharp-blade': 2, 'crow-footsteps': 1 },
    enemy: { 'crow-footsteps': 2, 'sharp-blade': 1 },
  });
});
test('중복 카드, 없는 카드와 선택지 밖의 선택은 누적 상태를 변경하지 않는다', () => {
  const state = createRunUpgradeState();
  for (const [pair, selected] of [
    [['sharp-blade', 'sharp-blade'], 'sharp-blade'],
    [['sharp-blade', 'missing'], 'sharp-blade'],
    [['sharp-blade', 'crow-footsteps'], 'steel-feathers'],
  ])
    assert.equal(state.choose(pair, selected), false);
  assert.deepEqual(state.getSnapshot(), { player: {}, enemy: {} });
});
test('새 판 초기화와 snapshot 수정은 다른 판이나 내부 횟수에 영향을 주지 않는다', () => {
  const state = createRunUpgradeState();
  state.choose(['sharp-blade', 'crow-footsteps'], 'sharp-blade');
  const snapshot = state.getSnapshot();
  snapshot.player['sharp-blade'] = 999;
  assert.equal(state.getSnapshot().player['sharp-blade'], 1);
  state.reset();
  assert.deepEqual(state.getSnapshot(), { player: {}, enemy: {} });
});
test('누적 표시의 정수와 기본값 기준 퍼센트를 유지한다', () => {
  const byId = (id) => UPGRADE_CARDS.find((card) => card.id === id);
  assert.equal(upgradeEffectLabel(byId('sharp-blade'), 3), '공격 피해 +3');
  assert.equal(upgradeEffectLabel(byId('steel-feathers'), 2), '최대 체력 +2칸');
  assert.equal(upgradeEffectLabel(byId('crow-footsteps'), 3), '이동 속도 +30%');
  assert.equal(upgradeEffectLabel(byId('seamless-finish'), 2), '공격 후딜레이 -20%');
});
