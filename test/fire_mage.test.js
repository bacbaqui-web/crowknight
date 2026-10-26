import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
import { MAGE_FIRE, collectMageFire, advanceMageFire, mageFireAttackRegion } from '../src/mage_fire_runtime.js';
import {
  activeProjectiles,
  resetProjectileRuntime,
  updateProjectileRuntime,
} from '../src/projectile_runtime_engine.js';
import { resolveProjectileCombat, updateActorCombatTimers } from '../src/combat_engine.js';
import { groundProjectileRegion, combatTargetRegions } from '../src/quarter_view/spatial.js';
import { resetPlayerActionState } from '../src/actor_state.js';
import { drawFlameSprite } from '../src/flame_effect_renderer.js';

const state = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url)));
const world = { floorY: 500, gravity: 1800 };
function setup() {
  resetProjectileRuntime();
  const player = new PuppetPlayer(200, 500, {});
  player.applyTuning(mergeTuning(DEFAULT_PLAYER_TUNING, state.actors.fire_mage.tuning));
  player.customActionKey = 'mageFire';
  player.customActionDuration = 3;
  player.customActionTime = 3;
  player.customActionElapsed = 0;
  player.attackSerial = 1;
  const actor = {
    id: 'fire_mage',
    group: 'bosses',
    player,
    hp: 300,
    maxHp: 300,
    invulnTime: 0,
    hurtCooldown: 0,
    hitStun: 0,
  };
  const target = {
    id: 'player_01',
    group: 'players',
    player: { x: 650, y: 500 },
    hp: 100,
    maxHp: 100,
    invulnTime: 0,
    hurtCooldown: 0,
    hitStun: 0,
  };
  return { actor, target };
}
function emit(actor, target, time, extraWorld = world) {
  actor.player.customActionElapsed = time;
  return collectMageFire(actor, target, extraWorld);
}

test('부속과 부유 타임라인이 정규화 후에도 유지되고 방패/접촉 공격은 없다', () => {
  const { actor } = setup();
  assert.ok(actor.player.rig.flame);
  assert.ok(actor.player.layerOrder.includes('flame'));
  assert.ok(actor.player.getPartOffset('master').y < -15);
  assert.equal(actor.player.attackInteractionRegions.length, 0);
  assert.equal(actor.player.guardInteractionRegions.length, 0);
});
test('준비 후 0.16초 간격으로 정확히 8개 발사하며 일시정지는 중복 발사하지 않는다', () => {
  const { actor, target } = setup();
  assert.equal(emit(actor, target, 0).length, 0);
  assert.equal(emit(actor, target, MAGE_FIRE.windup - 0.01).length, 0);
  const shots = [];
  for (let i = 0; i < 8; i++) {
    const now = MAGE_FIRE.windup + i * MAGE_FIRE.interval + 1e-5;
    const batch = emit(actor, target, now);
    assert.equal(batch.length, 1);
    shots.push(...batch);
    assert.equal(emit(actor, target, now).length, 0);
  }
  assert.equal(emit(actor, target, 2.9).length, 0);
  assert.deepEqual(
    shots.map((s) => s.targetX),
    [280, 340, 400, 460, 520, 580, 640, 700]
  );
});
test('방향은 준비 시작 시 고정되며 대상이 뒤로 이동해도 바뀌지 않는다', () => {
  const { actor, target } = setup();
  emit(actor, target, 0);
  target.player.x = -300;
  const shots = emit(actor, target, 2);
  assert.equal(shots.length, 8);
  assert.equal(shots[7].targetX, 700);
});
test('왼쪽과 깊이 방향에도 같은 간격으로 불을 깔고 목표 바닥 높이를 사용한다', () => {
  for (const [x, z] of [
    [-600, 0],
    [200, 600],
    [700, -400],
  ]) {
    const { actor, target } = setup();
    actor.quarterDepth = 100;
    target.quarterDepth = z;
    target.player.x = x;
    target.player.y = 300;
    const shots = emit(actor, target, 2, { ...world, quarterView: {} });
    for (let i = 0; i < 8; i++)
      assert.ok(Math.abs(Math.hypot(shots[i].targetX - 200, shots[i].targetDepth - 100) - (80 + i * 60)) < 1e-6);
    assert.equal(shots[0].targetY, 500);
  }
});
test('피격·사망·동작 취소는 이후 발사를 중단하고 재시전은 새 8개를 허용한다', () => {
  for (const reason of ['hurt', 'dead', 'cancel']) {
    const { actor, target } = setup();
    assert.equal(emit(actor, target, 0.76).length, 1);
    if (reason === 'hurt') actor.player.hurtTime = 0.2;
    if (reason === 'dead') actor.player.dead = true;
    if (reason === 'cancel') actor.player.customActionKey = null;
    assert.equal(emit(actor, target, 2).length, 0);
    actor.player.hurtTime = 0;
    actor.player.dead = false;
    actor.player.customActionKey = 'mageFire';
    actor.player.attackSerial++;
    assert.equal(emit(actor, target, 2).length, 8);
  }
});
test('비행 중 무해하며 각 불은 착지 후 3초 유지되고 먼저 깔린 불부터 사라진다', () => {
  const { actor, target } = setup();
  const first = emit(actor, target, 0.76)[0];
  const second = emit(actor, target, 0.92)[0];
  advanceMageFire(first, 0.2);
  assert.equal(mageFireAttackRegion(first).active, false);
  advanceMageFire(first, 0.2);
  assert.equal(first.phase, 'burn');
  assert.equal(mageFireAttackRegion(first).active, true);
  advanceMageFire(first, 2.7);
  assert.equal(mageFireAttackRegion(first).active, false);
  advanceMageFire(first, 0.3);
  assert.equal(first.active, false);
  advanceMageFire(second, 3.1);
  assert.equal(second.active, true);
});
test('중첩 불길은 합산 폭딜 없이 0.65초 간격 10 피해, 불길 시각은 유지된다', () => {
  const { actor, target } = setup();
  const fires = emit(actor, target, 2);
  fires.forEach((f, i) => {
    advanceMageFire(f, 0.6);
    f.key = 'fire' + i;
    f.targetX = f.x = 280;
  });
  const defender = new PuppetPlayer(280, 500, {});
  defender.applyTuning(state.actors.powder_chief.tuning);
  target.player = defender;
  const args = {
    projectiles: fires,
    actors: [target],
    playerActor: target,
    world,
    particleEffects: { triggerHitImpact() {} },
  };
  resolveProjectileCombat(args);
  assert.equal(target.hp, 90);
  assert.ok(fires.every((f) => f.active));
  target.invulnTime = 0;
  resolveProjectileCombat(args);
  assert.equal(target.hp, 90);
  updateActorCombatTimers([target], 0.66);
  target.invulnTime = 0;
  target.hurtCooldown = 0;
  target.player.x = 280;
  resolveProjectileCombat(args);
  assert.equal(target.hp, 80);
  resetPlayerActionState(target.player);
  assert.equal(target.player.groundFireHurtTime, 0);
});
test('쿼터뷰 불길은 깊이 범위와 낮은 화염 높이만 판정한다', () => {
  const { actor, target } = setup();
  actor.quarterDepth = 0;
  target.quarterDepth = 150;
  const fire = emit(actor, target, 0.76, { ...world, quarterView: {} })[0];
  advanceMageFire(fire, 0.5);
  const r = groundProjectileRegion(fire, mageFireAttackRegion(fire));
  assert.equal(r.h, 56);
  assert.deepEqual(r.quarterHeightRange, [446, 500]);
  assert.equal(combatTargetRegions(actor, target, [{ x: fire.x, y: 300, w: 30, h: 100 }], r).length, 0);
  assert.equal(combatTargetRegions(actor, target, [{ x: fire.x, y: 450, w: 30, h: 50 }], r).length, 1);
});
test('게임 초기화는 불길을 모두 제거하며 소멸 후 풀에서 제거된다', () => {
  const { actor, target } = setup();
  actor.player.customActionElapsed = 2;
  updateProjectileRuntime({ actors: [actor], playerActor: target, world, dt: 0.01 });
  assert.equal(activeProjectiles().length, 8);
  actor.player.customActionKey = null;
  updateProjectileRuntime({ actors: [actor], playerActor: target, world, dt: 4 });
  assert.equal(activeProjectiles().length, 0);
  actor.player.customActionKey = 'mageFire';
  actor.player.attackSerial++;
  updateProjectileRuntime({ actors: [actor], playerActor: target, world, dt: 0 });
  assert.equal(activeProjectiles().length, 8);
  resetProjectileRuntime();
  assert.equal(activeProjectiles().length, 0);
});
test('불꽃은 시간에 따라 형태가 바뀌고 같은 시각의 렌더는 결정적이다', () => {
  const draws = (time) => {
    const calls = [];
    const ctx = {
      globalAlpha: 1,
      drawImage(...args) {
        calls.push(args.slice(1));
      },
      save() {},
      restore() {},
      beginPath() {},
      ellipse() {},
      fill() {},
    };
    drawFlameSprite(ctx, { width: 100, height: 100 }, 0, 0, 50, 60, time);
    return calls;
  };
  assert.deepEqual(draws(0), draws(0));
  assert.notDeepEqual(draws(0), draws(0.2));
  assert.equal(draws(0).length, 14);
});
