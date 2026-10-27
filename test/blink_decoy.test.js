import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlinkDecoy,updateBlinkDecoy,enemyTarget} from '../src/blink_decoy.js';
import {resetMovementSkills} from '../src/movement_skill_helper.js';
import {updateBattleActorMotion} from '../src/enemy_runtime_engine.js';
test('blink leaves a stationary lure, replaces it, expires and clears on reset/death',()=>{
 const actor={id:'player',quarterDepth:80,player:{x:20,y:430,floorY:430,runSkills:{blink:1}}};
 const decoy=createBlinkDecoy(actor);actor.player.x=200;actor.quarterDepth=180;
 assert.equal(enemyTarget(actor),decoy);assert.equal(decoy.player.x,20);assert.equal(decoy.quarterDepth,80);
 updateBlinkDecoy(actor,1.9);assert.equal(enemyTarget(actor),decoy);
 updateBlinkDecoy(actor,.11);assert.equal(enemyTarget(actor),actor);
 actor.player.runSkills.blink=3;assert.equal(createBlinkDecoy(actor).time,3);
 const replacement=createBlinkDecoy(actor);assert.equal(enemyTarget(actor),replacement);
 resetMovementSkills(actor.player);assert.equal(enemyTarget(actor),actor);
 createBlinkDecoy(actor);actor.player.dead=true;updateBlinkDecoy(actor,0);assert.equal(actor.player.runDecoy,null);
});
test('enemy motion and quarter-view targeting both use the lure, then return to player',()=>{
 const hero={id:'hero',group:'players',player:{x:20,y:430,runSkills:{blink:1},update(){}}};
 const decoy=createBlinkDecoy(hero);hero.player.x=300;
 let npcTarget,planeTarget;
 const enemy={id:'enemy',group:'mobs',player:{x:100,y:430,actions:[],updateNpc(dt,target){npcTarget=target;}}};
 const world={quarterView:{beforePlayer(){},afterMotion(){},distance(){return 80;},beforeEnemy(a,target){planeTarget=target;}}};
 updateBattleActorMotion({actors:[hero,enemy],playerActor:hero,keys:new Set(),pressed:new Set(),world,dt:.1});
 assert.equal(npcTarget,decoy.player);assert.equal(planeTarget,decoy);assert.equal(enemy.player.facing,-1);
 updateBattleActorMotion({actors:[hero,enemy],playerActor:hero,keys:new Set(),pressed:new Set(),world,dt:2});
 assert.equal(npcTarget,hero.player);assert.equal(planeTarget,hero);assert.equal(enemy.player.facing,1);
});
