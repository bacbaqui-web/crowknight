import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperienceController } from '../src/experience_controller.js';
import { canUseRunSkill, startRunSkill, updateRunSkills, prepareSkillActions } from '../src/skill_runtime_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
function setup() {
  const player = { hp: 100, tuning: { skillActions: { doubleJump: 'jump2' } }, player: { x: 0, y: 0 } };
  const offers = [];
  const c = createExperienceController({
    getPlayer: () => player,
    clearInput() {},
    view: { render() {}, show: (offered) => offers.push(offered), hide() {}, setVisible() {} },
  });
  c.reset();
  return { c, player, offers };
}
test('첫 레벨업에서 계열과 시작 기술을 함께 습득한다', () => {
  const { c, offers, player } = setup();
  c.addExperience(400);
  c.update(0, { floorY: 0 });
  assert.deepEqual(offers[0].map(s => s.id), ['attack', 'guard', 'move']);
  assert.equal(c.choose('missing'), false);
  assert.equal(c.choose('attack', offers[0]), true);
  assert.deepEqual(c.snapshot().ranks, { fourthStrike: 1 });
  assert.equal(player.player.runSkillPathColor, '#ff8a78');
  assert.equal(c.choose('attack', offers[0]), false);
  assert.equal(c.isPaused(), false);
  c.stop();
  assert.equal(player.player.runSkillPathColor, undefined);
  c.reset();
  assert.equal(c.snapshot().pathId, null);
  assert.deepEqual(c.snapshot().route, []);
});
test('선택한 가지의 자식 둘만 제시하며 다른 계열은 섞이지 않는다', () => {
  for (const [path, root, left, right] of [
    ['attack', 'fourthStrike', 'fifthStrike', 'chargeAttack'],
    ['guard', 'parry', 'armor', 'vitality'],
    ['move', 'doubleJump', 'backflip', 'swiftness'],
  ]) {
    const { c, offers } = setup();
    c.addExperience(399);c.update(0, { floorY: 0 });
    assert.equal(offers.length, 0);
    c.addExperience(1);c.update(0, { floorY: 0 });c.choose(path);
    assert.equal(c.snapshot().ranks[root], 1);
    for (let step = 0; step < 4; step++) {
      c.addExperience(5000);c.update(0, { floorY: 0 });
      const pair = offers.at(-1).filter(choice => !choice.reinforce);
      if (step === 0) assert.deepEqual(pair.map(s => s.effectId), [left, right]);
      assert.ok(pair.every(s => s.pathId === path));
      const oldToken = pair;
      c.choose(pair.at(-1).id, offers.at(-1));
      assert.equal(c.choose(oldToken[0].id, oldToken), false);
    }
  }
});
test('흰 구슬은 비행/착지 후 가까이 가야 수집되며 원거리 흡수하지 않는다', () => {
  const { c, player } = setup();
  c.recordKill({ group: 'mobs', player: { x: 400, y: 0 } });
  c.update(1.5, { floorY: 0 });
  const orb = c.orbSnapshot()[0];
  assert.ok(orb.landed);
  assert.ok(orb.x > 480);
  assert.equal(c.snapshot().xp, 0);
  player.player.x = orb.x - 100;
  c.update(0, { floorY: 0 });
  assert.equal(c.snapshot().xp, 0);
  player.player.x = orb.x;
  c.update(0, { floorY: 0 });
  assert.equal(c.snapshot().xp, 20);
  player.hp = 0;
  c.recordKill({ group: 'mobs', player: { x: 400, y: 0 } });
  c.update(1.5, { floorY: 0 });
  player.player.x = c.orbSnapshot()[0].x;
  c.update(0, { floorY: 0 });
  assert.equal(c.snapshot().xp, 20);
});
test('기술 잠금과 공중 점프 한 번 제한은 착지 시 초기화된다', () => {
  const p = { runSkills: {}, runSkillActions: { doubleJump: 'jump2', backflip: 'flip' }, onGround: false };
  assert.equal(canUseRunSkill(p, 'jump2'), false);
  p.runSkills.doubleJump = 1;
  assert.equal(canUseRunSkill(p, 'jump2'), true);
  startRunSkill(p, 'jump2');
  assert.equal(canUseRunSkill(p, 'jump2'), false);
  p.onGround = true;
  updateRunSkills(p, 0.1);
  p.onGround = false;
  assert.equal(canUseRunSkill(p, 'jump2'), true);
  p.runSkills.backflip = 2;
  startRunSkill(p, 'flip');
  assert.equal(p.runEvadeTime, 0.3);
  updateRunSkills(p, 1);
  assert.equal(p.runEvadeTime, 0);
});
test('세팅용 기본 기술 액션은 중복 없이 생성된다', () => {
  const tuning = mergeTuning(DEFAULT_PLAYER_TUNING);
  prepareSkillActions(tuning);
  const n = tuning.customActions.length;
  prepareSkillActions(tuning);
  assert.equal(tuning.customActions.length, n);
  for (const id of ['fourthStrike', 'fifthStrike', 'sixthStrike', 'doubleJump', 'backflip', 'guard'])
    assert.ok(tuning.actionOffsets[tuning.skillActions[id]]);
});
test('4타 피해 강화와 패링의 피해 차단/반격 경직을 실제 전투 함수에 적용한다', async () => {
  const { applyInteractionDamage } = await import('../src/combat_reaction_helper.js');
  const attacker = {
    id: 'a',
    hp: 100,
    player: {
      x: 0,
      customActionKey: 'strike4',
      runSkills: { fourthStrike: 2 },
      runSkillActions: { fourthStrike: 'strike4' },
    },
  };
  const target = { id: 'b', hp: 100, player: { x: 20, actions: [], customActions: [] } };
  applyInteractionDamage({ attacker, target, damage: 20, playerActor: attacker, world: {} });
  assert.equal(target.hp, 76);
  target.player.runSkills = { parry: 1 };
  target.player.runSkillActions = { guard: 'guard' };
  target.player.customActionKey = 'guard';
  target.player.runParryTime = 0.15;
  attacker.player.actions = [];
  attacker.player.customActions = [];
  applyInteractionDamage({ attacker, target, damage: 20, playerActor: attacker, world: {} });
  assert.equal(target.hp, 76);
  assert.ok(attacker.player.hurtTime >= 0.5);
  assert.equal(target.player.runParryTime, 0);
});
