import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PuppetPlayer} from '../src/actor_runtime_engine.js';
import {mergeTuning} from '../src/project_data_normalizer_helper.js';
import {DEFAULT_PLAYER_TUNING} from '../src/player_default_tuning_data.js';
import {prepareSkillActions,canUseRunSkill,startRunSkill,updateRunSkills} from '../src/skill_runtime_helper.js';
import {updateActionTriggerRuntime} from '../src/action_trigger_engine.js';
import {rollRemaining,plungeDamage,applyMovementSkillPhysics,resetMovementSkills} from '../src/movement_skill_helper.js';
import {resolveMovementSkills} from '../src/movement_skill_combat.js';
import {upgradeVelocity} from '../src/run_upgrade_effect_helper.js';
function fixture(){
 const saved=JSON.parse(readFileSync(new URL('../data/beta.json',import.meta.url)));
 const tuning=mergeTuning(DEFAULT_PLAYER_TUNING,saved.actors.player_01.tuning);prepareSkillActions(tuning);
 const player=new PuppetPlayer(100,430,{});player.applyTuning(tuning);player.runSkillActions=tuning.skillActions;player.runSkills={};
 return {player,tuning,hp:100,maxHp:100};
}
test('Shift 달리기는 습득 전 잠기며 습득 후 실제 입력으로 발동한다',()=>{
 const a=fixture(),p=a.player;
 updateActionTriggerRuntime(p,0,new Set(['ShiftLeft']),new Set(['ShiftLeft']));assert.notEqual(p.customActionKey,p.runSkillActions.sprint);
 p.runSkills.sprint=2;updateActionTriggerRuntime(p,0,new Set(['ShiftLeft']),new Set(['ShiftLeft']));assert.equal(p.customActionKey,p.runSkillActions.sprint);
 assert.equal(upgradeVelocity(p,{group:'movement'},10,0).x,11);
});
test('기본 구르기 1회와 강화당 추가 횟수, 마지막 동작 후 쿨타임 회복',()=>{
 const a=fixture(),p=a.player,key=p.runSkillActions.roll;
 assert.equal(canUseRunSkill(p,key),true);startRunSkill(p,key);assert.equal(canUseRunSkill(p,key),false);
 p.customActionKey=key;p.customActionTime=1;updateRunSkills(p,2);assert.equal(rollRemaining(p),0);
 p.customActionTime=0;updateRunSkills(p,1);assert.equal(rollRemaining(p),0);updateRunSkills(p,.21);assert.equal(rollRemaining(p),1);
 p.runSkills.rollChain=2;resetMovementSkills(p);
 for(let i=0;i<3;i++){assert.equal(canUseRunSkill(p,key),true);startRunSkill(p,key);}assert.equal(canUseRunSkill(p,key),false);
 resetMovementSkills(p);assert.equal(rollRemaining(p),3);
});
test('공중 F로 급강하하고 착지 피해는 높이 제곱 배율이며 한 번만 적용된다',()=>{
 const a=fixture(),p=a.player;p.runSkills={sprint:1,doubleJump:1,plunge:1};p.y=230;p.floorY=430;p.onGround=false;
 updateActionTriggerRuntime(p,0,new Set(['KeyF']),new Set(['KeyF']));assert.equal(p.customActionKey,p.runSkillActions.plunge);
 applyMovementSkillPhysics(p,new Set());assert.equal(p.vy,85);assert.equal(plungeDamage(200,1),180);
 const enemy={group:'mobs',hp:500,maxHp:500,player:{x:100,y:430,customActionKey:'idle',actions:[]}};
 p.y=430;p.onGround=true;
 const args={actors:[a,enemy],playerActor:a,world:{}};
 resolveMovementSkills(args);assert.equal(enemy.hp,320);resolveMovementSkills(args);assert.equal(enemy.hp,320);
});
test('활강은 하강 중 Space를 유지할 때만 낙하 속도를 제한한다',()=>{
 const p={runSkills:{glide:1},onGround:false,vy:40};
 applyMovementSkillPhysics(p,new Set());assert.equal(p.vy,40);applyMovementSkillPhysics(p,new Set(['Space']));assert.equal(p.vy,9);
 p.vy=-20;applyMovementSkillPhysics(p,new Set(['Space']));assert.equal(p.vy,-20);
 p.runSkills.glide=3;p.vy=40;applyMovementSkillPhysics(p,new Set(['Space']));assert.ok(p.vy<9);
});
test('공격 구르기는 지나간 적마다 동작당 한 번만 피해를 준다',()=>{
 const a=fixture(),p=a.player;p.runSkills={rollChain:1,rollStrike:2};startRunSkill(p,p.runSkillActions.roll);
 p.customActionKey=p.runSkillActions.roll;p.customActionTime=1;
 const enemy={group:'mobs',hp:100,maxHp:100,player:{x:170,y:430,customActionKey:'idle',actions:[]}};
 const args={actors:[a,enemy],playerActor:a,world:{}};resolveMovementSkills(args);assert.equal(enemy.hp,100);
 p.x=240;resolveMovementSkills(args);assert.equal(enemy.hp,76);resolveMovementSkills(args);assert.equal(enemy.hp,76);
});
test('순보는 W를 대체하고 횟수를 공유하며 쿼터뷰 방향과 경계를 따른다',()=>{
 const a=fixture(),p=a.player;p.runSkills={rollChain:1,blink:1};a.quarterAim={x:0,z:1};a.quarterDepth=400;
 assert.equal(canUseRunSkill(p,p.runSkillActions.roll),false);
 updateActionTriggerRuntime(p,0,new Set(['KeyW']),new Set(['KeyW']));assert.equal(p.customActionKey,p.runSkillActions.blink);
 resolveMovementSkills({actors:[a],playerActor:a,world:{quarterView:{},minX:0,maxX:200}});
 assert.equal(p.x,100);assert.equal(a.quarterDepth,480);assert.equal(rollRemaining(p),1);
});
test('이동 모션 초기화는 사용자가 수정한 모션과 기존 공격을 덮어쓰지 않는다',()=>{
 const a=fixture(),key=a.tuning.skillActions.plunge;a.tuning.actionOffsets[key].marker='authored';
 const before=JSON.stringify(a.tuning.actionOffsets[a.tuning.skillActions.fourthStrike]);prepareSkillActions(a.tuning);
 assert.equal(a.tuning.actionOffsets[key].marker,'authored');assert.equal(JSON.stringify(a.tuning.actionOffsets[a.tuning.skillActions.fourthStrike]),before);
});
