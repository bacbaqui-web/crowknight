import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { prepareSkillActions } from '../src/skill_runtime_helper.js';
import { requestRuntimeAction } from '../src/action_trigger_engine.js';
import { resolveGroundCollision } from '../src/quarter_view/spatial.js';
import { prepareQuarterFacing } from '../src/quarter_view/facing.js';
import { attackPoint } from '../src/quarter_view/attack_geometry.js';
import { applyGroundKnockback } from '../src/quarter_view/knockback.js';
import { preparePlaneMotion, finishPlaneMotion, movementInput } from '../src/quarter_view/motion.js';

const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
const world = { floorY: 430, minX: -100000, maxX: 100000, worldPhysics: { gravity: 1, inertia: 30 } };
function fixture(physics = world.worldPhysics) {
  const stage = { ...world, worldPhysics: physics };
  const def = saved.characters.find((a) => a.id === 'player_01');
  const tuning = mergeTuning(defaultTuningFor(def), saved.actors.player_01.tuning);
  prepareSkillActions(tuning);
  const player = new PuppetPlayer(480, 430, {});
  player.applyTuning(tuning);
  const actor = { player, tuning, quarterDepth: 0, quarterAim: { x: 1, z: 0 } };
  let previous = new Set();
  return {
    actor,
    step(codes = [], count = 1) {
      let delta;
      for (let i = 0; i < count; i++) {
        const keys = new Set(codes),
          pressed = new Set(codes.filter((key) => !previous.has(key)));
        previous = keys;
        const x = player.x,
          z = actor.quarterDepth;
        const input = preparePlaneMotion(actor, movementInput(keys), keys, pressed);
        player.update(1 / 60, input.keys, input.pressed, stage);
        finishPlaneMotion(actor);
        delta = { x: player.x - x, z: actor.quarterDepth - z };
      }
      return delta;
    },
  };
}

test('a recovered walk releases the old knockback axis, preserving its first hit displacement', () => {
  for (const code of ['ArrowLeft', 'ArrowRight', 'QuarterUp', 'QuarterDown']) {
    const { actor, step } = fixture();
    step(['ArrowRight'], 30);
    requestRuntimeAction(actor.player, 'hurt', -1);
    const serial = actor.player.attackSerial;
    applyGroundKnockback({ player: { x: actor.player.x + 100, facing: -1 }, quarterAim: { x: 0, z: 1 } }, actor, {
      reaction: { knockback: 50, knockbackMode: 'set' },
    });
    const impulse = actor.quarterImpulse;
    const hit = step([], 1);
    assert.ok(hit.x * impulse.x + hit.z * impulse.z > 0);
    step([code], 360);
    actor.quarterDepth = 0;
    const delta = step([code], 3);
    assert.ok(actor.player.attackSerial > serial, 'returns to an input action');
    assert.equal(actor.quarterImpulse, null);
    const direction = movementInput(new Set([code]));
    assert.ok(delta.x * direction.x + delta.z * direction.z > 0, code);
    assert.ok(Math.abs(delta.x * direction.z - delta.z * direction.x) < 1e-6, code);
  }
});

test('simultaneous movement and action edges start the action instead of losing it to walk matching', () => {
  for (const [code, expected] of [
    ['KeyQ', 'customAction4'],
    ['KeyW', 'customAction8'],
    ['Space', 'customAction3'],
  ]) {
    const { actor, step } = fixture();
    step(['ArrowRight', code]);
    assert.equal(actor.player.customActionKey, expected);
    assert.equal(
      actor.quarterPendingInputs.size,
      0,
      JSON.stringify({ code, codes: actor.player.customActionPressCodes })
    );
  }
});

test('an input just before an attack link opens is consumed once and only fresh edges enter sequence history', () => {
  const { actor, step } = fixture();
  step(['KeyQ']);
  step([], 14);
  step(['KeyQ']);
  assert.equal(actor.player.customActionKey, 'customAction4', 'early press is initially blocked');
  assert.equal(actor.quarterPendingInputs.size, 1);
  step([], 10);
  assert.equal(actor.player.customActionKey, 'customAction4_2');
  assert.equal(actor.quarterPendingInputs.size, 0);
  assert.equal(actor.player.actionTriggerRuntime.history.filter((entry) => entry.key === 'Q').length, 2);
});

test('an expired blocked input never fires after recovery', () => {
  const { actor, step } = fixture();
  requestRuntimeAction(actor.player, 'hurt', 1);
  step(['KeyW']);
  step([], 360);
  assert.equal(actor.quarterPendingInputs.size, 0);
  assert.notEqual(actor.player.customActionKey, 'customAction8');
  assert.equal(actor.player.attackSerial, 1);
});

test('attack-to-roll and roll-to-walk transitions adopt the current depth direction', () => {
  const { actor, step } = fixture();
  step(['KeyQ']);
  step([], 15);
  step(['QuarterDown', 'KeyW']);
  step(['QuarterDown'], 8);
  assert.equal(actor.player.customActionKey, 'customAction8');
  assert.deepEqual(actor.quarterAim, { x: 0, z: 1 });
  step(['QuarterUp'], 240);
  actor.quarterDepth = 0;
  const delta = step(['QuarterUp'], 3);
  assert.ok(delta.z < 0);
  assert.ok(Math.abs(delta.x) < 1e-6);
});

test('hurt-facing changes do not reverse the pre-hit velocity used when accumulating knockback', () => {
  const { actor, step } = fixture();
  step(['ArrowRight'], 30);
  const speed = actor.player.vx;
  requestRuntimeAction(actor.player, 'hurt', -1);
  applyGroundKnockback({ player: { x: actor.player.x + 100, facing: -1 }, quarterAim: { x: 0, z: 1 } }, actor, {
    reaction: { knockback: 50, knockbackMode: 'set' },
  });
  const resultingSpeed = Math.abs(actor.player.vx);
  assert.ok(Math.abs(actor.quarterImpulse.x * resultingSpeed - speed) < 1e-6);
  assert.ok(Math.abs(actor.quarterImpulse.z * resultingSpeed - 50) < 1e-6);
});

test('buffer retries cannot invent a four-press guard sequence', () => {
  const { actor, step } = fixture();
  requestRuntimeAction(actor.player, 'hurt', 1);
  step(['KeyE']);
  step([], 6);
  assert.equal(actor.player.actionTriggerRuntime.history.filter((entry) => entry.key === 'E').length, 1);
  assert.notEqual(actor.player.customActionKey, 'skill_chargePose');
});

test('public gravity, inertia and air control never reverse recovered movement across hit and facing phases', () => {
  const physics = { gravity: 25, inertia: 3, airControl: 10 };
  for (const facing of [-1, 1])
    for (const warmup of [0, 12, 20]) {
      for (const code of ['ArrowLeft', 'ArrowRight', 'QuarterUp', 'QuarterDown']) {
        const { actor, step } = fixture(physics);
        actor.player.facing = facing;
        step([facing < 0 ? 'ArrowLeft' : 'ArrowRight'], warmup);
        requestRuntimeAction(actor.player, 'hurt', -facing);
        applyGroundKnockback({ player: { x: actor.player.x + 100, facing: -1 }, quarterAim: { x: 0, z: 1 } }, actor, {
          reaction: { knockback: 50, knockbackMode: 'set' },
        });
        let recovered = 0;
        for (let frame = 0; frame < 180; frame++) {
          const delta = step([code]);
          if (actor.player.customActionKey !== 'customAction1' || actor.quarterImpulse) continue;
          recovered++;
          const direction = movementInput(new Set([code]));
          assert.ok(
            delta.x * direction.x + delta.z * direction.z >= -1e-6,
            JSON.stringify({ facing, warmup, code, frame, delta, vx: actor.player.vx })
          );
        }
        assert.ok(recovered > 60);
      }
    }
});

test('collision pushes at either depth wall cannot create an outward position and an opposite-input correction next frame', () => {
  for (const edge of [-480, 480]) {
    const { actor, step } = fixture({ gravity: 25, inertia: 3, airControl: 10 });
    actor.quarterDepth = edge;
    const code = edge < 0 ? 'QuarterUp' : 'QuarterDown';
    const region = { x: 0, y: 350, w: 60, h: 80, reaction: { noOverlap: true, pushPower: 1, resistance: 1 } };
    Object.defineProperty(actor.player, 'collisionInteractionRegions', { value: [region] });
    const other = {
      quarterDepth: edge - Math.sign(edge) * 20,
      player: { x: actor.player.x, y: 430, collisionInteractionRegions: [region] },
    };
    for (let frame = 0; frame < 60; frame++) {
      resolveGroundCollision(actor, other, null, world);
      assert.equal(actor.quarterDepth, edge);
      assert.equal(actor.player.quarterDepth, edge);
      const delta = step([code]);
      assert.equal(delta.z, 0);
    }
  }
});

test('a buffered reverse attack aligns visual facing, blend and hitbox aim at the same action start', () => {
  for (const direction of [-1, 1])
    for (const releaseDirection of [false, true]) {
      const { actor, step } = fixture();
      const player = actor.player;
      player.facing = -direction;
      actor.quarterAim = { x: -direction, z: 0 };
      step(['KeyQ']);
      step([], 14);
      const previousSerial = player.attackSerial;
      const code = direction < 0 ? 'ArrowLeft' : 'ArrowRight';
      step([code, 'KeyQ']);
      assert.equal(player.facing, -direction, 'blocked input must not turn the active attack');
      for (let i = 0; i < 10 && player.attackSerial === previousSerial; i++) step(releaseDirection ? [] : [code]);
      assert.ok(player.attackSerial > previousSerial);
      assert.equal(player.customActionKey, 'customAction4_2');
      assert.equal(player.facing, direction);
      assert.equal(player.customActionFacing, direction);
      assert.equal(player.customActionViewFacing, direction);
      assert.deepEqual(actor.quarterAim, { x: direction, z: 0 });
    }
});

test('depth-only follow-up attacks preserve the side-facing sprite while aiming along depth', () => {
  for (const facing of [-1, 1]) {
    const { actor, step } = fixture();
    actor.player.facing = facing;
    actor.quarterAim = { x: facing, z: 0 };
    step(['KeyQ']);
    step([], 14);
    step(['QuarterDown', 'KeyQ']);
    step(['QuarterDown'], 10);
    assert.equal(actor.player.customActionKey, 'customAction4_2');
    assert.equal(actor.player.facing, facing);
    assert.deepEqual(actor.quarterAim, { x: 0, z: 1 });
  }
});

test('charged attacks requested before the motion update use the latest horizontal input facing', () => {
  for (const direction of [-1, 1]) {
    const { actor } = fixture();
    const player = actor.player;
    player.facing = -direction;
    actor.quarterAim = { x: -direction, z: 0 };
    player.runSkills = { chargeAttack: 1 };
    player.runSkillActions = actor.tuning.skillActions;
    prepareQuarterFacing(actor, { x: direction, z: 0 });
    assert.ok(requestRuntimeAction(player, player.runSkillActions.chargeAttack, player.facing));
    assert.equal(player.facing, direction);
    assert.equal(player.customActionViewFacing, direction);
    assert.deepEqual(actor.quarterAim, { x: direction, z: 0 });
  }
});
