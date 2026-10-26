import test from 'node:test';
import assert from 'node:assert/strict';
import { movementPoseOffset } from '../src/movement_pose_helper.js';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { finishPlaneMotion } from '../src/quarter_view/motion.js';
const fixture = () => ({ actionKey:'move', onGround:true, vx:80, facing:1, actionSettings:{move:{group:'movement'}} });
test('authored posture is preserved at walking speed and lean grows with actual speed, capped at original maximum', () => {
  const p=fixture(), base={x:2,y:3,rot:4,opacity:0.7};
  p.vx=35;assert.equal(movementPoseOffset(p,'body',base),base);
  p.vx=80;assert.equal(movementPoseOffset(p,'body',base).rot,32.25);
  p.vx=120;assert.equal(movementPoseOffset(p,'body',base).rot,60.5);
  p.vx=300;assert.equal(movementPoseOffset(p,'body',base).rot,60.5);
  assert.deepEqual(base,{x:2,y:3,rot:4,opacity:0.7});
  assert.equal(movementPoseOffset(p,'weapon',base),base);
});
test('attack, roll, air, hurt and editor preview keep authored poses', () => {
  const base={rot:5};
  for (const group of ['attack','special']) { const p=fixture();p.actionSettings.move.group=group;assert.equal(movementPoseOffset(p,'body',base),base); }
  for (const overrides of [{onGround:false},{hurtTime:1},{dead:true},{actionPreview:{action:'move'}}]) {
    assert.equal(movementPoseOffset({...fixture(),...overrides},'body',base),base);
  }
});
test('runtime part offsets receive the speed posture without changing stored keyframes', () => {
  const p=new PuppetPlayer(0,430,{});p.customActionKey='move';p.customActionTime=1;p.onGround=true;p.vx=80;
  p.actionSettings={move:{group:'movement',mirror:true}};p.actionOffsets={move:{body:{x:0,y:0,rot:0}}};
  assert.equal(p.getPartOffset('body').rot,28.25);
  p.facing=-1;assert.equal(p.getPartOffset('body').rot,28.25);
  assert.equal(p.actionOffsets.move.body.rot,0);
});
test('quarter-view speed includes depth travel rather than horizontal projection only', () => {
  const p={...fixture(),x:80,animTime:0.1,attackSerial:1};
  const actor={player:p,quarterDepth:0,quarterAim:{x:0,z:1},quarterMotionStart:{x:0,z:0,time:0,facing:1,serial:1,direction:{x:0,z:1}}};
  finishPlaneMotion(actor,{quarterView:{unbounded:true}});
  assert.equal(p.groundPoseSpeed,800);
  assert.equal(movementPoseOffset(p,'body',{rot:0}).rot,28.25);
});
