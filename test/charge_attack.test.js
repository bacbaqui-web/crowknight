import { URL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { updateChargeAttack } from '../src/charge_attack_helper.js';
function player() {
  return {
    runSkills: { chargeAttack: 1 },
    runSkillActions: { chargePose: 'charge', chargeAttack: 'heavy' },
    onGround: true,
    hurtTime: 0,
  };
}
test('짧은 Q는 해제 시 기본 공격, 0.35초 유지하면 충전 후 강공격', () => {
  const p = player(),
    calls = [];
  const request = (_, key) => {
    calls.push(key);
    return true;
  };
  updateChargeAttack(p, 0.1, new Set(['KeyQ']), new Set(['KeyQ']), request);
  const tap = updateChargeAttack(p, 0, new Set(), new Set(), request);
  assert.equal(tap.pressed.has('KeyQ'), true);
  assert.deepEqual(calls, []);
  calls.length = 0;
  updateChargeAttack(p, 1.2, new Set(['KeyQ']), new Set(['KeyQ']), request);
  const release = updateChargeAttack(p, 0, new Set(), new Set(), request);
  assert.equal(release.pressed.has('KeyQ'), false);
  assert.deepEqual(calls, ['charge', 'heavy']);
  assert.equal(p.runChargedPower, 3);
});
test('미습득은 기존 입력 그대로, 피격은 충전을 취소한다', () => {
  const p = player();
  p.runSkills = {};
  const keys = new Set(['KeyQ']),
    pressed = new Set(['KeyQ']);
  assert.equal(updateChargeAttack(p, 1, keys, pressed, () => true).keys, keys);
  p.runSkills.chargeAttack = 1;
  updateChargeAttack(p, 0.5, keys, pressed, () => true);
  p.hurtTime = 1;
  updateChargeAttack(p, 0.1, keys, new Set(), () => true);
  assert.equal(p.runCharge, null);
});
test('강화는 피해가 아니라 히트박스와 효과 공통 배율을 키운다', async () => {
  const { chargeAttackScale } = await import('../src/charge_attack_helper.js');
  const { scaleUpgradeAttackRegions } = await import('../src/run_upgrade_effect_helper.js');
  const p = player();
  p.runSkills.chargeAttack = 3;
  updateChargeAttack(p, 1.2, new Set(['KeyQ']), new Set(['KeyQ']), () => true);
  updateChargeAttack(p, 0, new Set(), new Set(), () => true);
  assert.equal(p.runChargedPower, 3);
  p.customActionKey = 'heavy';
  p.x = p.y = 0;
  assert.equal(chargeAttackScale(p), 1.4);
  const region = { x: 10, y: 0, w: 100, h: 50 };
  const [scaled] = scaleUpgradeAttackRegions(p, [region]);
  assert.equal(scaled.w, 140);
  assert.equal(scaled.h, 70);
  assert.equal(region.w, 100);
  p.runChargedAttack = false;
  assert.equal(chargeAttackScale(p), 1);
});
test('응격 - 기모으기는 특수 충전, 응축된 일격은 공격 해제 동작으로 연결하며 제작 포즈를 보존한다', async () => {
  const { readFileSync } = await import('node:fs');
  const { prepareSkillActions, canUseRunSkill } = await import('../src/skill_runtime_helper.js');
  const tuning = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url))).actors.player_01.tuning;
  const before = JSON.stringify([tuning.actionOffsets.skill_chargePose, tuning.actionOffsets.skill_chargeAttack]);
  prepareSkillActions(tuning);
  assert.equal(tuning.skillActions.chargePose, 'skill_chargePose');
  assert.equal(tuning.skillActions.chargeAttack, 'skill_chargeAttack');
  assert.equal(tuning.customActions.find((a) => a.key === 'skill_chargePose').name, '응격 - 기모으기');
  assert.equal(tuning.actionSettings.skill_chargePose.group, 'special');
  assert.equal(tuning.actionSettings.skill_chargeAttack.group, 'attack');
  assert.equal(tuning.customActions.find((a) => a.key === 'skill_chargeAttack').name, '응격 - 공격');
  prepareSkillActions(tuning);
  assert.equal(
    JSON.stringify([tuning.actionOffsets.skill_chargePose, tuning.actionOffsets.skill_chargeAttack]),
    before
  );
  assert.equal(
    canUseRunSkill({ runSkills: {}, runSkillActions: tuning.skillActions }, tuning.skillActions.firstStrike),
    true
  );
});
test('Q 누름은 보류하고 충전 중 W는 취소 후 즉시 전달한다', () => {
  const p = player(),
    calls = [];
  const request = (_, key) => {
    calls.push(key);
    p.customActionKey = key;
    return true;
  };
  const keys = new Set(['KeyQ']),
    pressed = new Set(['KeyQ']);
  const first = updateChargeAttack(p, 0.016, keys, pressed, request);
  assert.equal(first.pressed.has('KeyQ'), false);
  assert.equal(first.keys.has('KeyQ'), false);
  assert.equal(p.runCharge.animating, false);
  assert.deepEqual(calls, []);
  updateChargeAttack(p, 0.4, keys, new Set(), request);
  assert.equal(p.runCharge.animating, true);
  const rollKeys = new Set(['KeyQ', 'KeyW']),
    rollPressed = new Set(['KeyW']);
  const roll = updateChargeAttack(p, 0.016, rollKeys, rollPressed, request);
  assert.equal(roll.pressed.has('KeyW'), true);
  assert.equal(p.runCharge, null);
  assert.equal(p.customActionKey, null);
  updateChargeAttack(p, 0.1, keys, new Set(), request);
  assert.equal(p.runCharge, null);
  updateChargeAttack(p, 0.1, new Set(), new Set(), request);
  assert.deepEqual(calls, ['charge']);
});
