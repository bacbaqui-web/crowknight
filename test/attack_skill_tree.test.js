import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
import { prepareSkillActions, runSkillDamageMultiplier } from '../src/skill_runtime_helper.js';
import { updateActionTriggerRuntime } from '../src/action_trigger_engine.js';
import { createExperienceController } from '../src/experience_controller.js';

function fixture() {
  const saved = JSON.parse(readFileSync(new URL('../data/beta.json', import.meta.url)));
  const tuning = mergeTuning(DEFAULT_PLAYER_TUNING, saved.actors.player_01.tuning);
  prepareSkillActions(tuning);
  const player = new PuppetPlayer(0, 430, {});
  player.applyTuning(tuning);
  player.runSkillActions = tuning.skillActions;
  return { player, tuning };
}
test('Q 연계는 해금한 4→5→6타 순서로만 진행하고 제작 모션을 보존한다', () => {
  const { player, tuning } = fixture();
  const bindings = tuning.skillActions;
  player.runSkills = { fourthStrike: 1, fifthStrike: 1, sixthStrike: 1 };
  for (const [from, to] of [['fourthStrike', 'fifthStrike'], ['fifthStrike', 'sixthStrike']]) {
    player.customActionKey = bindings[from];
    player.customActionTime = 0.25;
    player.customActionElapsed = 0.5;
    player.customActionDuration = tuning.actionSettings[player.customActionKey].duration;
    updateActionTriggerRuntime(player, 0, new Set(['KeyQ']), new Set(['KeyQ']));
    assert.equal(player.customActionKey, bindings[to]);
  }
  delete player.runSkills.fifthStrike;
  player.customActionKey = bindings.fourthStrike;
  player.customActionTime = 0.25;
    player.customActionElapsed = 0.5;
    player.customActionDuration = tuning.actionSettings[player.customActionKey].duration;
  updateActionTriggerRuntime(player, 0, new Set(['KeyQ']), new Set(['KeyQ']));
  assert.notEqual(player.customActionKey, bindings.fifthStrike);
  tuning.actionOffsets[bindings.fifthStrike].authorMarker = 123;
  prepareSkillActions(tuning);
  assert.equal(tuning.actionOffsets[bindings.fifthStrike].authorMarker, 123);
});
test('5·6타 반복 강화와 연타 피해 효과를 계산한다', () => {
  for (const id of ['fifthStrike', 'sixthStrike']) {
    const player = { runSkills: { [id]: 3, comboForce: 2 }, runSkillActions: { [id]: id }, customActionKey: id };
    assert.ok(Math.abs(runSkillDamageMultiplier(player) - 1.82) < 1e-9);
  }
});
test('현재 기술을 강화해도 다음 갈림길이 유지된다', () => {
  const { player, tuning } = fixture();
  const actor = { player, tuning, hp: 100 };
  let offers;
  const controller = createExperienceController({getPlayer: () => actor, clearInput() {}, view: {
    render() {}, hide() {}, setVisible() {}, show(value) { offers = value; },
  }});
  controller.reset();controller.addExperience(1000);controller.update(0, {});
  controller.choose('attack');
  assert.equal(player.runSkills.fourthStrike, 1);
  controller.choose(offers.find(choice => choice.reinforce).id);
  assert.equal(player.runSkills.fourthStrike, 2);
  assert.deepEqual(controller.snapshot().route, [0]);
  controller.addExperience(800);controller.update(0, {});
  assert.deepEqual(offers.filter(choice => !choice.reinforce).map(choice => choice.effectId), ['fifthStrike', 'chargeAttack']);
});
