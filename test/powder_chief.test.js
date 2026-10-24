import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { requestRuntimeAction } from '../src/action_trigger_engine.js';
import {
  activeProjectiles,
  updateProjectileRuntime,
  projectileAttackRegion,
  resetProjectileRuntime,
} from '../src/projectile_runtime_engine.js';
import { POWDER_BOMB, advancePowderBomb } from '../src/powder_bomb_runtime.js';
import { groundProjectileRegion, combatTargetRegions } from '../src/quarter_view/spatial.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
import { resolveProjectileCombat } from '../src/combat_engine.js';

const draft = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url)));
const world = { floorY: 500, minX: 0, maxX: 1800, gravity: 1800 };
function setup() {
  resetProjectileRuntime();
  const player = new PuppetPlayer(300, 500, { weapon: { width: 24, height: 32 } });
  player.applyTuning(mergeTuning(DEFAULT_PLAYER_TUNING, draft.actors.powder_chief.tuning));
  const actor = { id: 'powder_chief', group: 'bosses', player };
  const target = { id: 'player_01', group: 'players', player: { x: 700, y: 500 } };
  return { actor, target };
}
function step(actor, target, dt) {
  actor.player.updateNpc(dt, target.player, world);
  updateProjectileRuntime({ actors: [actor], playerActor: target, world, dt });
}
function release(actor, target) {
  assert.equal(requestRuntimeAction(actor.player, 'powderThrow', 1, 'tap'), true);
  for (let i = 0; i < 90 && !activeProjectiles().length; i++) step(actor, target, 1 / 60);
  assert.equal(activeProjectiles().length, 1);
  return activeProjectiles()[0];
}

test('공병장 부속·편집 타임라인이 정규화 후에도 남고 방패 판정은 없다', () => {
  const { actor } = setup();
  for (const key of ['backpack', 'collar']) {
    assert.ok(actor.player.rig[key]);
    assert.ok(actor.player.layerOrder.includes(key));
  }
  assert.equal(actor.player.guardInteractionRegions.length, 0);
  assert.equal(actor.player.attackInteractionRegions.length, 0);
  assert.ok(actor.player.hurtInteractionRegions.length);
});
test('투척 1회에 폭탄 1개, 조준 위치 고정, 비행/도화선 중 피해 없음', () => {
  const { actor, target } = setup();
  const bomb = release(actor, target);
  target.player.x = 1200;
  for (let i = 0; i < 100; i++) step(actor, target, 1 / 60);
  assert.equal(activeProjectiles().length, 1);
  assert.equal(bomb.targetX, 700);
  assert.equal(bomb.targetY, 500);
  assert.equal(projectileAttackRegion(bomb).active, false);
  assert.equal(bomb.phase, 'fuse');
});
test('착지 후 1.25초 예고를 마쳐야 폭발, 시간이 지나면 제거', () => {
  const { actor, target } = setup();
  const bomb = release(actor, target);
  bomb.elapsedFrames = 0;
  advancePowderBomb(bomb, 1 + POWDER_BOMB.fuse - 0.01);
  assert.equal(projectileAttackRegion(bomb).active, false);
  advancePowderBomb(bomb, 0.02);
  assert.equal(projectileAttackRegion(bomb).active, true);
  assert.equal(projectileAttackRegion(bomb).points.length, 24);
  advancePowderBomb(bomb, 0.4);
  assert.equal(bomb.active, false);
});
test('투척 전 피격/사망은 폭탄을 생성하지 않고 게임 초기화는 남은 폭탄을 제거', () => {
  const { actor, target } = setup();
  requestRuntimeAction(actor.player, 'powderThrow', 1, 'tap');
  step(actor, target, 0.2);
  actor.player.customActionKey = null;
  actor.player.customActionTime = 0;
  for (let i = 0; i < 90; i++) step(actor, target, 1 / 60);
  assert.equal(activeProjectiles().length, 0);
  release(actor, target);
  resetProjectileRuntime();
  assert.equal(activeProjectiles().length, 0);
});
test('쿼터뷰 폭발은 깊이 원형 판정이며 충분히 높은 점프는 피한다', () => {
  const { actor, target } = setup();
  const bomb = release(actor, target);
  bomb.quarterDepth = 100;
  const region = groundProjectileRegion(bomb, projectileAttackRegion(bomb));
  assert.equal(region.y, 15);
  assert.equal(region.h, 170);
  assert.equal(region.points.length, 24);
  actor.quarterDepth = 0;
  target.quarterDepth = 100;
  assert.equal(combatTargetRegions(actor, target, [{ x: 700, y: 200, w: 30, h: 100 }], region).length, 0);
  assert.equal(combatTargetRegions(actor, target, [{ x: 700, y: 420, w: 30, h: 80 }], region).length, 1);
});
test('비행 중 폭탄은 전투 판정을 조회하거나 피해를 주지 않는다', () => {
  const { actor, target } = setup();
  const bomb = release(actor, target);
  Object.defineProperty(target.player, 'hurtInteractionRegions', {
    get() {
      throw new Error('조기 피해 조회');
    },
  });
  assert.doesNotThrow(() =>
    resolveProjectileCombat({ projectiles: [bomb], actors: [target], playerActor: target, world })
  );
});

test('폭발은 범위 안 대상에게 한 번만 피해를 주고 시각 효과는 유지한다', () => {
  const { actor, target } = setup();
  const bomb = release(actor, target);
  const defender = new PuppetPlayer(700, 500, {});
  defender.applyTuning(draft.actors.powder_chief.tuning);
  target.player = defender;
  target.hp = target.maxHp = 100;
  advancePowderBomb(bomb, 2.3);
  const args = {
    projectiles: [bomb],
    actors: [target],
    playerActor: target,
    world,
    particleEffects: { triggerHitImpact() {} },
  };
  resolveProjectileCombat(args);
  assert.equal(target.hp, 80);
  assert.equal(bomb.active, true);
  target.invulnTime = 0;
  resolveProjectileCombat(args);
  assert.equal(target.hp, 80);
});
