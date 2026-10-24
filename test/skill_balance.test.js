import test from 'node:test';
import assert from 'node:assert/strict';
import { progressionChoices } from '../src/skill_progression_data.js';
import { createExperienceController } from '../src/experience_controller.js';
import { runSkillDamageMultiplier } from '../src/skill_runtime_helper.js';
import { plungeDamage,rollCapacity } from '../src/movement_skill_helper.js';
import { stunParriedEnemy } from '../src/parry_skill_helper.js';
import { applyInteractionDamage } from '../src/combat_reaction_helper.js';
test('마무리 타격은 25/30/40, 내려찍기는 45/80/100 기본 상한',()=>{
 for(const [id,damage] of [['fourthStrike',25],['fifthStrike',30],['sixthStrike',40]]) {
  assert.equal(runSkillDamageMultiplier({runSkills:{[id]:1},runSkillActions:{[id]:id},customActionKey:id})*20,damage);
 }
 assert.deepEqual([100,200,1000].map(h=>plungeDamage(h,1)),[45,80,100]);
 assert.equal(plungeDamage(1000,3),140);assert.equal(rollCapacity({runSkills:{rollChain:99}}),4);
});
test('일반 적 스턴 1.5초 상한, 보스는 절반 및 최대 0.6초',()=>{
 const mob={group:'mobs',player:{}},boss={group:'bosses',player:{}};
 stunParriedEnemy(mob,9);stunParriedEnemy(boss,.6);
 assert.equal(mob.player.runParryStun,1.5);assert.equal(boss.player.runParryStun,.3);
 stunParriedEnemy(boss,9);assert.equal(boss.player.runParryStun,.6);
});
test('방어 영역에서 막힌 타격도 20% 피해, 타이밍 패링은 0 피해',()=>{
 const attacker={player:{x:0,actions:[]}},hero={hp:100,maxHp:100,player:{x:0,runSkills:{parry:1},runSkillActions:{guard:'guard'},customActionKey:'idle',actions:[]}};
 applyInteractionDamage({attacker,target:hero,damage:20,guarded:true});assert.equal(hero.hp,96);
 hero.player.customActionKey='guard';hero.player.runParryTime=.15;
 applyInteractionDamage({attacker,target:hero,damage:20,guarded:true});assert.equal(hero.hp,96);assert.equal(hero.player.runParryPoints,1);
});
test('3레벨 기술은 제외하되 후속 분기는 남기고 최대 강화 후 포인트를 보관한다',()=>{
 const choices=progressionChoices('attack',[0],{fourthStrike:3});
 assert.deepEqual(choices.map(c=>c.effectId),['fifthStrike','chargeAttack']);
 let offered=null;
 const actor={hp:100,tuning:{skillActions:{}},player:{}};
 const c=createExperienceController({getPlayer:()=>actor,clearInput(){},view:{render(){},show(value){assert.ok(value.length);offered=value;},hide(){offered=null;},setVisible(){}}});
 c.reset();c.addExperience(100000);c.update(0,{});c.choose('attack');
 let selections=0;
 while(offered && selections++<20) c.choose(offered[0].id,offered);
 assert.equal(c.snapshot().ranks.sixthStrike,3);assert.ok(c.snapshot().banked>0);assert.equal(c.isPaused(),false);
 assert.ok(Object.values(c.snapshot().ranks).every(rank=>rank<=3));
 c.reset();assert.equal(c.snapshot().banked,0);
});
