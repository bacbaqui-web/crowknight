import test from 'node:test';
import assert from 'node:assert/strict';
import { progressionChoices } from '../src/skill_progression_data.js';
import { syncProgressionHealth } from '../src/skill_progression_effects.js';
import { applyInteractionDamage } from '../src/combat_reaction_helper.js';
import { upgradeVelocity } from '../src/run_upgrade_effect_helper.js';

test('연타 가지에서 충전 가지로 돌아가지 않고 선택한 자식만 따라간다', () => {
  assert.deepEqual(progressionChoices('attack', [0]).filter(s => !s.reinforce).map(s => s.effectId), ['fifthStrike', 'chargeAttack']);
  assert.deepEqual(progressionChoices('attack', [0, 0]).filter(s => !s.reinforce).map(s => s.effectId), ['sixthStrike', 'comboForce']);
  assert.deepEqual(progressionChoices('attack', [0, 1]).filter(s => !s.reinforce).map(s => s.effectId), ['reach', 'power']);
});
test('체력 기술과 보스 체력 배율이 공존하고 증가분만 회복한다', () => {
  const actor = { hp: 50, maxHp: 120, tuning: { maxHp: 100 }, player: { runUpgrades: { health: 1.2 }, runSkills: { vitality: 2 } } };
  syncProgressionHealth(actor, true);
  assert.equal(actor.maxHp, 160);assert.equal(actor.hp, 90);
  syncProgressionHealth(actor, true);assert.equal(actor.hp, 90);
  actor.hp = 0;actor.player.runSkills.vitality++;
  syncProgressionHealth(actor, true);assert.equal(actor.hp, 0);
});
test('방어력과 실제 타격 피해 기준 흡혈 및 이동 강화가 적용된다', () => {
  const attacker = { hp: 40, maxHp: 100, player: { runSkills: { lifeSteal: 1, power: 1 }, runSkillActions: {}, customActionKey: 'attack' } };
  const target = { hp: 10, maxHp: 100, player: { runSkills: { armor: 1 }, runSkillActions: { guard: 'guard' }, customActionKey: 'idle', actions: [], customActions: [] } };
  applyInteractionDamage({attacker, target, damage: 5, world: {}});
  assert.ok(Math.abs(target.hp - 4.775) < 1e-8);
  assert.ok(Math.abs(attacker.hp - 40.1045) < 1e-8);
  const velocity = upgradeVelocity({runSkills: {swiftness: 2, leap: 1}}, {group: 'movement'}, 10, -10);
  assert.equal(velocity.x, 12);assert.ok(velocity.y < -10);
});
