import test from 'node:test';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
import { requestRuntimeAction } from '../src/action_trigger_engine.js';
import {
  RAM_TANK,
  prepareTankMotion,
  finishTankMotion,
  tankChargeDistance,
  tankPhase,
} from '../src/ram_tank_runtime.js';
import { resetPlayerActionState } from '../src/actor_state.js';
import { updateBattleActorMotion } from '../src/enemy_runtime_engine.js';
import { preparePlaneMotion, finishPlaneMotion } from '../src/quarter_view/motion.js';
import { resolveCombat } from '../src/combat_engine.js';
import { groundAttackRegions } from '../src/quarter_view/attack_geometry.js';
import { combatTargetRegions } from '../src/quarter_view/spatial.js';

const data = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url)));
const world = { floorY: 500, gravity: 1800, minX: -10000, maxX: 10000 };
function actor(id = 'ram_tank', x = 200) {
  const player = new PuppetPlayer(x, 500, {});
  player.applyTuning(mergeTuning(DEFAULT_PLAYER_TUNING, data.actors[id].tuning));
  return {
    id,
    group: id === 'ram_tank' ? 'bosses' : 'players',
    player,
    tuning: data.actors[id].tuning,
    hp: 480,
    maxHp: 480,
    invulnTime: 0,
    hurtCooldown: 0,
    hitStun: 0,
    lastHitSerials: {},
    hitCancelFlashTime: 0,
  };
}
function start(a, facing = 1) {
  assert.equal(requestRuntimeAction(a.player, 'tankCharge', facing, 'tap'), true);
}
function tick(a, dt, w = world) {
  const before = prepareTankMotion(a);
  a.player.updateNpc(dt, { x: 800, y: 500 }, w);
  finishTankMotion(a, before, dt, w);
}
function advance(a, time, dt = 1 / 60) {
  for (let t = 0; t < time - 1e-9; t += dt) tick(a, Math.min(dt, time - t));
}

test('tank parts survive normalization and charge has no projectile or guard', () => {
  const a = actor();
  assert.equal(data.actors.ram_tank.assets.__parts.length, 14);
  assert.equal(a.player.actionSettings.tankCharge.duration, 3.4);
  assert.equal(
    a.player.actionSettings.tankCharge.formulas.some((f) => f.type === 'projectile'),
    false
  );
  start(a);
  assert.equal(a.player.guardInteractionRegions.length, 0);
});
test('one second warning and recovery do not move or damage; charge includes hull', () => {
  const a = actor();
  start(a);
  advance(a, 0.9);
  assert.equal(a.player.x, 200);
  assert.equal(a.player.attackInteractionRegions.length, 0);
  advance(a, 0.4);
  const hit = a.player.attackInteractionRegions[0];
  assert.ok(hit);
  assert.ok(hit.x < a.player.x - 90);
  assert.ok(hit.x + hit.w > a.player.x + 170);
  advance(a, 1);
  const x = a.player.x;
  assert.equal(a.player.attackInteractionRegions.length, 0);
  advance(a, 0.8);
  assert.equal(a.player.x, x);
});
test('integrated travel and braking are frame-rate independent and mirrored', () => {
  for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.1])
    for (const facing of [-1, 1]) {
      const a = actor();
      start(a, facing);
      advance(a, 3.5, dt);
      assert.ok(Math.abs(a.player.x - 200 - facing * 682.5) < 0.00001);
      assert.equal(a.player.actionKey, 'idle');
      assert.equal(a.player.vx, 0);
    }
  assert.ok(tankChargeDistance(2.1) - tankChargeDistance(2) < tankChargeDistance(1.8) - tankChargeDistance(1.7));
});
test('pause leaves position, aim, wheel angle and action time unchanged', () => {
  const a = actor();
  start(a);
  advance(a, 1.4);
  const before = [a.player.x, a.player.tankWheelAngle, a.player.customActionElapsed];
  tick(a, 0);
  assert.deepEqual([a.player.x, a.player.tankWheelAngle, a.player.customActionElapsed], before);
});
test('cancel, death and reset clear charge instead of continuing displacement', () => {
  for (const reason of ['cancel', 'dead', 'reset']) {
    const a = actor();
    start(a);
    advance(a, 1.3);
    const x = a.player.x;
    if (reason === 'cancel') {
      a.player.customActionKey = null;
      a.player.customActionTime = 0;
    }
    if (reason === 'dead') a.player.dead = true;
    if (reason === 'reset') resetPlayerActionState(a.player);
    tick(a, 0.05);
    assert.equal(a.player.x, x);
    assert.equal(a.player.tankCharge, null);
  }
});
test('quarter-view diagonal charge keeps its initial aim when target moves', () => {
  const a = actor();
  a.quarterDepth = 0;
  a.quarterAim = { x: 0.6, z: 0.8 };
  start(a);
  const w = { ...world, quarterView: { unbounded: true } };
  for (let i = 0; i < 210; i++) {
    preparePlaneMotion(a, { x: -1, z: 0 });
    tick(a, 1 / 60, w);
    finishPlaneMotion(a, w);
  }
  assert.ok(Math.abs(a.player.x - (200 + 682.5 * 0.6)) < 0.001);
  assert.ok(Math.abs(a.quarterDepth - 682.5 * 0.8) < 0.001);
});
test('full range AI starts charge, locks side facing, and waits for cooldown before repeat', () => {
  const a = actor();
  const target = actor('powder_chief', 550);
  target.group = 'players';
  let serial = 0,
    starts = [];
  for (let i = 0; i < 720; i++) {
    updateBattleActorMotion({
      actors: [target, a],
      playerActor: target,
      keys: new Set(),
      pressed: new Set(),
      world,
      dt: 1 / 60,
    });
    if (a.player.actionKey === 'tankCharge' && a.player.attackSerial !== serial) {
      serial = a.player.attackSerial;
      starts.push(i / 60);
    }
  }
  assert.ok(starts.length >= 2);
  assert.ok(starts[1] - starts[0] >= 5.9);
});
test('collision deals one hit per charge and recovery is harmless', () => {
  const a = actor();
  const target = actor('powder_chief', 500);
  target.hp = 200;
  target.maxHp = 200;
  start(a);
  advance(a, 1.3);
  const args = { actors: [target, a], playerActor: target, world, particleEffects: { triggerHitImpact() {} } };
  resolveCombat(args);
  assert.equal(target.hp, 180);
  target.invulnTime = 0;
  target.hurtCooldown = 0;
  target.player.x = 500;
  resolveCombat(args);
  assert.equal(target.hp, 180);
  advance(a, 1.2);
  target.player.x = a.player.x + 70;
  target.invulnTime = 0;
  resolveCombat(args);
  assert.equal(target.hp, 180);
});
test('quarter collision respects lateral avoidance and keeps height for jumping', () => {
  const a = actor();
  a.quarterDepth = 0;
  a.quarterAim = { x: 1, z: 0 };
  start(a);
  advance(a, 1.3);
  const r = groundAttackRegions(a, a.player.attackInteractionRegions)[0];
  assert.equal(r.quarterPlane, 'height');
  const target = actor('powder_chief', a.player.x + 80);
  target.quarterDepth = 200;
  assert.equal(combatTargetRegions(a, target, target.player.hurtInteractionRegions, r).length, 0);
  target.quarterDepth = 0;
  assert.ok(combatTargetRegions(a, target, target.player.hurtInteractionRegions, r).length);
});
test('travel is bounded and wheel rotation tracks actual distance', () => {
  const a = actor();
  start(a);
  tick(a, 2.5, { ...world, maxX: 450 });
  assert.equal(a.player.x, 450);
  assert.ok(Math.abs(a.player.tankWheelAngle - 250 / 28) < 0.001);
  assert.equal(tankPhase(RAM_TANK.warning), 'charge');
  assert.equal(tankPhase(2.21), 'recovery');
});
