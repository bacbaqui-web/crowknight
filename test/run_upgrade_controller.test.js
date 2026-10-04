import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunUpgradeController, randomUpgradePair } from '../src/run_upgrade_controller.js';
import {
  applyRunUpgradeEffects,
  clearRunUpgradeEffects,
  scaleUpgradeAttackRegions,
  upgradeEffects,
  upgradeVelocity,
} from '../src/run_upgrade_effect_helper.js';
import { attackWindow, upgradeActionDelta } from '../src/run_upgrade_timing_helper.js';
import { syncActorHealthCapacity } from '../src/actor_tuning_helper.js';
import { applyInteractionDamage, applyKnockback } from '../src/combat_reaction_helper.js';
import { upgradeEffectLabel, UPGRADE_CARDS } from '../src/upgrade_card_data.js';

function actor() {
  return { id: 'test', tuning: { maxHpPips: 5 }, hpPips: 3, player: { x: 0, y: 0, facing: 1, dead: false } };
}
function setup() {
  const player = actor(),
    enemy = actor();
  enemy.id = 'enemy';
  const shows = [],
    renders = [];
  let clears = 0;
  const controller = createRunUpgradeController({
    getActors: () => [player, enemy],
    getPlayer: () => player,
    clearInput: () => {
      clears += 1;
    },
    random: () => 0,
    hud: { render: (snapshot) => renders.push(snapshot), setVisible() {} },
    createChoiceView: () => ({ show: (pair) => shows.push(pair), hide() {} }),
  });
  controller.reset();
  return { controller, player, enemy, shows, renders, getClears: () => clears };
}

test('무작위 2장은 중복이 없고 모든 카드를 첫/둘째 위치에 제시할 수 있다', () => {
  const ids = new Set();
  for (let first = 0; first < 10; first += 1)
    for (let second = 0; second < 9; second += 1) {
      const samples = [(first + 0.5) / 10, (second + 0.5) / 9];
      const pair = randomUpgradePair(() => samples.shift());
      assert.equal(new Set(pair).size, 2);
      pair.forEach((id) => ids.add(id));
    }
  assert.equal(ids.size, 10);
});
test('동시에 보스 두 명 처치하면 한 번씩 순서대로 선택하고 중복 클릭은 적용하지 않는다', () => {
  const { controller, player, enemy, shows } = setup();
  controller.recordBossKill();
  controller.recordBossKill();
  assert.equal(controller.isPaused(), true);
  controller.update();
  assert.equal(shows.length, 1);
  assert.equal(controller.choose('missing'), false);
  assert.equal(controller.choose('sharp-blade'), true);
  assert.equal(shows.length, 2);
  assert.equal(controller.choose('sharp-blade', shows[0]), false);
  controller.choose('sharp-blade');
  assert.equal(controller.isPaused(), false);
  assert.equal(controller.choose('sharp-blade'), false);
  assert.equal(player.player.runUpgrades.damage, 2);
  assert.equal(enemy.player.runUpgrades.health, 2);
  assert.equal(enemy.hpPips, 5);
  assert.equal(enemy.maxHpPips, 7);
  assert.deepEqual(controller.getSnapshot(), { player: { 'sharp-blade': 2 }, enemy: { 'steel-feathers': 2 } });
});
test('사망/중단은 선택 대기와 runtime 효과를 없애고 다음 판 횟수를 초기화한다', () => {
  const { controller, player } = setup();
  controller.recordBossKill();
  controller.update();
  controller.choose('sharp-blade');
  controller.recordBossKill();
  controller.update();
  controller.stop();
  assert.equal(controller.isPaused(), false);
  assert.equal(controller.choose('sharp-blade'), false);
  assert.equal(player.player.runUpgrades, undefined);
  controller.reset();
  assert.deepEqual(controller.getSnapshot(), { player: {}, enemy: {} });
});
test('10개 효과는 기본값 기준 합산이며 감소는 80%에서 멈춘다', () => {
  const counts = Object.fromEntries(UPGRADE_CARDS.map((card) => [card.id, 3]));
  const effects = upgradeEffects(counts);
  assert.deepEqual(effects, {
    damage: 3,
    health: 3,
    speed: 1.3,
    reach: 1.3,
    knockback: 1.6,
    resistance: 0.55,
    stagger: 0.7,
    windup: 0.7,
    recovery: 0.7,
    jump: 1.3,
  });
  assert.equal(upgradeEffects({ 'swift-preparation': 100 }).windup, 0.2);
  assert.equal(
    upgradeEffectLabel(
      UPGRADE_CARDS.find((card) => card.id === 'rooted-stance'),
      100
    ),
    '받는 밀어내기 -80%'
  );
});
test('양쪽 health 강화는 기존 설정을 유지하고 재등장에도 추가 최대 체력을 유지한다', () => {
  const player = actor(),
    enemy = actor();
  const before = JSON.stringify([player.tuning, enemy.tuning]);
  const snapshot = { player: { 'steel-feathers': 2 }, enemy: { 'steel-feathers': 3 } };
  applyRunUpgradeEffects([player, enemy], player, snapshot);
  applyRunUpgradeEffects([player, enemy], player, snapshot);
  assert.equal(player.hpPips, 5);
  syncActorHealthCapacity(enemy, true);
  assert.equal(enemy.hpPips, 8);
  assert.equal(JSON.stringify([player.tuning, enemy.tuning]), before);
  clearRunUpgradeEffects([player, enemy]);
  assert.equal(enemy.maxHpPips, 5);
  player.hpPips = 0;
  syncActorHealthCapacity(player, false);
  assert.equal(player.hpPips, 0);
});
test('이동/점프 배율은 movement에만 적용하고 근접 범위는 원본 판정을 변경하지 않는다', () => {
  const player = actor().player;
  player.runUpgrades = upgradeEffects({ 'crow-footsteps': 2, 'leaping-feather': 3, 'long-shadow': 2 });
  assert.equal(upgradeVelocity(player, { group: 'movement' }, 10, -10).x, 12);
  assert.equal(upgradeVelocity(player, { group: 'movement' }, 10, -10).y, -10 * Math.sqrt(1.3));
  assert.deepEqual(upgradeVelocity(player, { group: 'attack' }, 10, -10), { x: 10, y: -10 });
  const region = {
    x: 10,
    y: 0,
    w: 20,
    h: 10,
    points: [
      { x: 10, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 10 },
      { x: 10, y: 10 },
    ],
  };
  const [expanded] = scaleUpgradeAttackRegions(player, [region]);
  assert.equal(expanded.w, 24);
  assert.equal(expanded.x, 12);
  assert.equal(region.w, 20);
});
test('실제 피해와 밀어내기는 공격자 강화와 대상 저항을 함께 반영한다', () => {
  const attacker = actor(),
    target = actor();
  attacker.player.runUpgrades = upgradeEffects({ 'sharp-blade': 2, 'forceful-strike': 1 });
  target.player.runUpgrades = upgradeEffects({ 'rooted-stance': 2 });
  target.hpPips = 10;
  // Surviving target's absent actions simply decline the hurt-action request.
  target.player.actions = [];
  target.player.customActions = [];
  applyInteractionDamage({
    attacker,
    target,
    damage: 1,
    playerActor: attacker,
    world: {},
    onPlayerDeath() {},
    onPlayerKill() {},
  });
  assert.equal(target.hpPips, 7);
  applyKnockback(attacker, target, { reaction: { knockback: 10 } }, {});
  assert.equal(target.player.vx, 8.4);
});
test('준비/후딜레이만 단축하고 타격 구간을 건너도 구간별 시간 계산을 유지한다', () => {
  const player = {
    customActionKey: 'attack',
    customActionDuration: 1,
    customActionElapsed: 0.1,
    actionSettings: { attack: { group: 'attack' } },
    runUpgradeAttackWindow: { start: 0.2, end: 0.6 },
    runUpgrades: upgradeEffects({ 'swift-preparation': 5, 'seamless-finish': 5 }),
  };
  assert.ok(Math.abs(upgradeActionDelta(player, 0.1) - 0.15) < 1e-9);
  player.customActionElapsed = 0.3;
  assert.ok(Math.abs(upgradeActionDelta(player, 0.1) - 0.1) < 1e-9);
  player.customActionElapsed = 0.7;
  assert.ok(Math.abs(upgradeActionDelta(player, 0.1) - 0.2) < 1e-9);
  player.customActionKey = 'hurt';
  player.runUpgrades.stagger = 0.5;
  assert.equal(upgradeActionDelta(player, 0.1), 0.2);
});

test('반복 공격의 다음 주기에서도 준비와 타격 구간을 구분한다', () => {
  const player = {
    customActionKey: 'attack',
    customActionTriggerMode: 'pressLoop',
    customActionDuration: 1,
    customActionElapsed: 1.1,
    actionSettings: { attack: { group: 'attack' } },
    runUpgradeAttackWindow: { start: 0.2, end: 0.6 },
    runUpgrades: upgradeEffects({ 'swift-preparation': 5, 'seamless-finish': 5 }),
  };
  assert.ok(Math.abs(upgradeActionDelta(player, 0.1) - 0.15) < 1e-9);
  player.customActionElapsed = 0.95;
  assert.ok(Math.abs(upgradeActionDelta(player, 0.1) - 0.2) < 1e-7);
});

test('공격 판정의 실제 활성 프레임에서 준비와 후딜레이 경계를 구한다', () => {
  const player = {
    rig: { attackInteractionObject: {} },
    getActionFrameProgress: () => 0,
    getPartOffset() {
      const t = this.getActionFrameProgress();
      return { active: t >= 0.3 && t < 0.6 ? 1 : 0, attack: 1 };
    },
  };
  assert.deepEqual(attackWindow(player, { duration: 1 }), { start: 0.3, end: 0.6 });
});
