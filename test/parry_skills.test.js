import test from 'node:test';
import assert from 'node:assert/strict';
import { trySkillParry, parryStats, parryReleaseStats, drawParryStatus } from '../src/parry_skill_helper.js';
import { resolveParryRelease } from '../src/parry_release_controller.js';
import { applyInteractionDamage } from '../src/combat_reaction_helper.js';
import { updateActorCombatTimers } from '../src/combat_engine.js';
import { requestRuntimeAction } from '../src/action_trigger_engine.js';
function actor(group = 'mobs', x = 0) {
  return { group, hp: 200, maxHp: 200, player: { x, y: 0, runSkills: {}, runSkillActions: { guard: 'guard' }, customActionKey: 'idle', actions: [], customActions: [] } };
}
test('타이밍 패링은 한번만 포인트를 주며 최대 5개, 강화로 판정과 스턴 증가', () => {
  const enemy = actor(), hero = actor('players');
  hero.player.runSkills.parry = 3;hero.player.customActionKey = 'guard';
  assert.deepEqual(parryStats(hero.player), {window: 0.21, stun: 1.1});
  for (let i = 0; i < 7; i++) {
    hero.player.runParryTime = 0.1;
    assert.equal(trySkillParry(enemy, hero), true);
    assert.equal(trySkillParry(enemy, hero), false);
  }
  assert.equal(hero.player.runParryPoints, 5);assert.equal(enemy.player.runParryStun, 1.1);
  updateActorCombatTimers([enemy], 0.4);assert.ok(Math.abs(enemy.player.runParryStun - 0.7) < 1e-9);
  enemy.player.actions = [{key: 'attack'}];
  assert.equal(requestRuntimeAction(enemy.player, 'attack'), false);
  updateActorCombatTimers([enemy], 1);assert.equal(enemy.player.runParryStun, 0);
});
test('실제 피해는 포인트를 지우지만 일반 방어와 회피는 보존한다', () => {
  const enemy = actor(), hero = actor('players');
  hero.player.runSkills.parry = 1;hero.player.runParryPoints = 4;
  hero.player.customActionKey = 'guard';
  applyInteractionDamage({attacker: enemy, target: hero, damage: 10});
  assert.equal(hero.player.runParryPoints, 4);
  hero.player.customActionKey = 'idle';hero.player.runEvadeTime = 1;
  applyInteractionDamage({attacker: enemy, target: hero, damage: 10});
  assert.equal(hero.player.runParryPoints, 4);
  hero.player.runEvadeTime = 0;
  applyInteractionDamage({attacker: enemy, target: hero, damage: 10});
  assert.equal(hero.player.runParryPoints, 0);assert.equal(hero.hp, 190);
});
test('회복은 포인트 제곱 비례, 전량 소모, 최대 HP 제한, 만피에서는 보존', () => {
  const hero = actor('players');hero.player.runSkills.parryHeal = 1;
  assert.deepEqual([1,2,3,4,5].map(points => {hero.player.runParryPoints=points;return parryReleaseStats(hero.player).amount;}), [2,8,18,32,50]);
  assert.equal(resolveParryRelease({actors: [hero],playerActor: hero}), false);
  assert.equal(hero.player.runParryPoints, 5);
  hero.hp = 180;
  assert.equal(resolveParryRelease({actors: [hero],playerActor: hero}), true);
  assert.equal(hero.hp, 200);assert.equal(hero.player.runParryPoints, 0);
  assert.equal(resolveParryRelease({actors: [hero],playerActor: hero}), false);
  hero.player.runParryPoints=5;hero.player.runSkills.deepHealing=1;
  assert.equal(parryReleaseStats(hero.player).amount, 75);
});
test('광역은 주변 적만 타격하고 쿼터뷰 깊이와 스턴 확장을 반영한다', () => {
  const hero=actor('players'), near=actor('mobs',100), far=actor('bosses',100), friend=actor('players',50);
  hero.player.runSkills={parryBurst:1,stunningBurst:2};hero.player.runParryPoints=5;
  far.quarterDepth=300;
  resolveParryRelease({actors:[hero,near,far,friend],playerActor:hero,world:{quarterView:{}}});
  assert.equal(near.hp,75);assert.equal(near.player.runParryStun,1);
  assert.equal(far.hp,200);assert.equal(friend.hp,200);assert.equal(hero.player.runParryPoints,0);
  hero.player.runSkills.wideBurst=3;hero.player.runParryPoints=2;
  assert.equal(parryReleaseStats(hero.player).radius,320);assert.equal(parryReleaseStats(hero.player).amount,20);
});
test('체력바 위에 5개의 슬롯과 회복/공격 포인트 색을 그린다', () => {
  const hero=actor('players');hero.player.runSkills={parry:1,parryHeal:1};hero.player.runParryPoints=3;
  const fills=[];let circles=0;
  const ctx={save(){},restore(){},beginPath(){},arc(){circles++},fill(){fills.push(this.fillStyle)},stroke(){},fillText(){}};
  drawParryStatus(ctx,hero,60,100);
  assert.equal(circles,5);assert.equal(fills.filter(color=>color==='#70e69b').length,3);
  hero.player.runSkills={parry:1,parryBurst:1};fills.length=0;drawParryStatus(ctx,hero,60,100);
  assert.equal(fills.filter(color=>color==='#ff716d').length,3);
});
test('광역 처치도 처치 보상과 사망 처리를 한 번만 호출한다', () => {
  const hero=actor('players'), enemy=actor('mobs',100);
  hero.player.runSkills={parryBurst:1};hero.player.runParryPoints=5;
  enemy.hp=20;enemy.player.updateState=()=>{};
  let kills=0,deaths=0;
  const args={actors:[hero,enemy],playerActor:hero,world:{floorY:0},onPlayerKill(){kills++},onEnemyDeath(){deaths++}};
  resolveParryRelease(args);resolveParryRelease(args);
  assert.equal(enemy.hp,0);assert.equal(enemy.player.dead,true);assert.equal(kills,1);assert.equal(deaths,1);
});
