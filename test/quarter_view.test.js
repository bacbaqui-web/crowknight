import { withRuntimeReadCache } from '../src/runtime_read_cache.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { groundPoint, groundFromScreen } from '../src/quarter_view/camera.js';
import { preparePlaneMotion, finishPlaneMotion, enemyPlaneDirection } from '../src/quarter_view/motion.js';
import { combatTargetRegions } from '../src/quarter_view/spatial.js';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { prepareSkillActions, updateRunSkills } from '../src/skill_runtime_helper.js';
import { requestRuntimeAction } from '../src/action_trigger_engine.js';
import { updateChargeAttack } from '../src/charge_attack_helper.js';
import { timelineFrameCount } from '../src/timeline_playback_helper.js';
import { attractPickup } from '../src/pickup_magnet_helper.js';

const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
const world = { floorY: 430, minX: -100000, maxX: 100000, worldPhysics: { gravity: 1, inertia: 30 } };
function fixture(id = 'player_01') {
  const def = saved.characters.find((actor) => actor.id === id);
  const tuning = mergeTuning(defaultTuningFor(def), saved.actors[id].tuning);
  if (id === 'player_01') prepareSkillActions(tuning);
  const player = new PuppetPlayer(480, world.floorY, {});
  player.applyTuning(tuning);
  if (id === 'player_01') {
    player.runSkills = { chargeAttack: 2, fourthStrike: 1, doubleJump: 1, backflip: 1, parry: 1 };
    player.runSkillActions = tuning.skillActions;
  }
  return { ...def, tuning, player, quarterDepth: 0, quarterAim: { x: 1, z: 0 } };
}
function close(a, b, label) {
  assert.ok(Math.abs(a - b) < 1e-7, `${label}: ${a} != ${b}`);
}

test('low camera angle is preserved with a constant orthographic scale and invertible projection', () => {
  const view = { width: 1280, height: 760, x: 480, depth: 0, zoom: 1 };
  for (const depth of [-480, -100, 0, 150, 480]) {
    const p = groundPoint(830, depth, view),
      back = groundFromScreen(p.x, p.y, view);
    close(back.x, 830, 'x');
    close(back.depth, depth, 'depth');
    assert.equal(p.scale, view.zoom);
  }
  assert.ok(groundPoint(480, 100, view).y - groundPoint(480, 0, view).y < 40);
  for (const zoom of [0.6, 1, 1.4])
    for (const cameraDepth of [-300, 0, 300]) {
      const camera = { ...view, zoom, depth: cameraDepth };
      for (const depth of [-480, 0, 480]) {
        const a = groundPoint(480, depth, camera),
          b = groundPoint(580, depth, camera);
        close(b.x - a.x, 100 * zoom, 'constant apparent width');
        close(a.scale, zoom, 'constant apparent height');
        const recovered = groundFromScreen(b.x, b.y, camera);
        close(recovered.x, 580, 'orthographic inverse x');
        close(recovered.depth, depth, 'orthographic inverse depth');
      }
    }
});

for (const def of saved.characters) {
  test(`${def.id}: every authored action retains timing, pose and motion under a horizontal ground projection`, () => {
    const baseline = fixture(def.id),
      quarter = fixture(def.id);
    for (const action of baseline.player.actions) {
      const a = fixture(def.id),
        b = fixture(def.id);
      for (const actor of [a, b]) {
        const player = actor.player,
          settings = player.actionSettings[action.key] || {};
        const link = settings.formulas?.find((formula) => formula.type === 'link' && formula.enabled);
        const source = link?.fromActions[0];
        if (settings.condition === 'air' || source === 'fall') {
          player.onGround = false;
          player.y -= 50;
          player.fallbackActionKey = 'fall';
        }
        if (source && source !== 'fall') {
          player.customActionKey = source;
          player.customActionDuration = player.getActionDuration(source, 0.6);
          const frames = timelineFrameCount(player.actionSettings[source]);
          player.customActionElapsed = player.customActionDuration * ((link.startFrame - 1) / Math.max(1, frames - 1));
          player.customActionTime = Math.max(0.001, player.customActionDuration - player.customActionElapsed);
        }
      }
      assert.equal(requestRuntimeAction(a.player, action.key, 1, 'tap'), true, action.key);
      assert.equal(requestRuntimeAction(b.player, action.key, 1, 'tap'), true, action.key);
      for (let frame = 0; frame < 90; frame++) {
        a.player.updateNpc(1 / 60, null, world);
        let cachedWeapon;
        withRuntimeReadCache(() => {
          preparePlaneMotion(b, null);
          b.player.updateNpc(1 / 60, null, world);
          finishPlaneMotion(b);
          cachedWeapon = b.player.getPartOffset('weapon');
          assert.deepEqual(b.player.getPartOffset('weapon'), cachedWeapon);
        });
        for (const key of ['x', 'y', 'vx', 'vy', 'customActionElapsed', 'customActionTime'])
          close(a.player[key] || 0, b.player[key] || 0, `${action.key}.${key}@${frame}`);
        assert.equal(a.player.actionKey, b.player.actionKey);
        assert.deepEqual(a.player.getPartOffset('weapon'), cachedWeapon);
      }
    }
    assert.ok(quarter.player.actions.length > 0);
  });
}

test('600-frame real input sequence preserves charge, movement, jump, roll, guard and combo state', () => {
  const a = fixture(),
    b = fixture();
  const segments = [
    [60, ['ArrowRight']],
    [20, ['Space']],
    [40, ['KeyQ']],
    [20, []],
    [25, ['KeyW']],
    [20, ['KeyE']],
    [80, ['KeyQ']],
    [45, []],
    [40, ['ArrowLeft', 'ShiftLeft']],
    [15, ['ArrowUp', 'KeyW']],
    [235, []],
  ];
  let previous = new Set();
  for (const [frames, codes] of segments)
    for (let frame = 0; frame < frames; frame++) {
      const keys = new Set(codes),
        pressed = new Set(codes.filter((code) => !previous.has(code)));
      previous = keys;
      for (const actor of [a, b]) {
        updateRunSkills(actor.player, 1 / 60);
        const charge = updateChargeAttack(actor.player, 1 / 60, keys, pressed, requestRuntimeAction);
        const input = actor === b ? preparePlaneMotion(actor, null, charge.keys, charge.pressed) : charge;
        actor.player.update(1 / 60, input.keys, input.pressed, world);
        if (actor === b) finishPlaneMotion(actor);
      }
      for (const key of ['x', 'y', 'vx', 'vy', 'customActionTime', 'runChargedPower', 'runEvadeTime', 'runParryTime'])
        close(a.player[key] || 0, b.player[key] || 0, key);
      assert.equal(a.player.actionKey, b.player.actionKey);
    }
});

test('depth movement uses native action displacement without diagonal speed inflation', () => {
  const a = fixture(),
    b = fixture();
  for (let i = 0; i < 60; i++) {
    a.player.update(1 / 60, new Set(['ArrowRight']), new Set(i ? [] : ['ArrowRight']), world);
    const input = preparePlaneMotion(b, { x: 0, z: 1 }, new Set(['QuarterDown']), new Set(i ? [] : ['QuarterDown']));
    b.player.update(1 / 60, input.keys, input.pressed, world);
    finishPlaneMotion(b);
  }
  close(a.player.x - 480, b.quarterDepth, 'native travel');
  close(b.player.x, 480, 'no sideways travel');
});

test('hurt footprints use world ground coordinates and ignore sprite altitude', () => {
  const a = fixture(),
    b = fixture('swordman');
  a.quarterAim = { x: 0, z: 1 };
  b.player.x = a.player.x;
  b.quarterDepth = 80;
  const regions = b.player.hurtInteractionRegions;
  const projected = combatTargetRegions(a, b, regions);
  close(projected[0].x, regions[0].x, 'world x');
  close(projected[0].y + projected[0].h / 2, 80, 'ground depth');
  b.player.y -= 200;
  assert.deepEqual(combatTargetRegions(a, b, b.player.hurtInteractionRegions), projected);
  b.player.x += 200;
  close(combatTargetRegions(a, b, b.player.hurtInteractionRegions)[0].x, projected[0].x + 200, 'world separation');
});

test('pickup magnet respects depth and converges at native collection speed', () => {
  const actor = fixture();
  actor.hp = 100;
  const pickup = { x: 480, y: 415, quarterDepth: 300, landed: true };
  assert.equal(attractPickup(pickup, actor, 1 / 60, 140, 420), false);
  pickup.quarterDepth = 100;
  for (let i = 0; i < 30; i++) attractPickup(pickup, actor, 1 / 60, 140, 420);
  assert.ok(pickup.quarterDepth < 16);
});

test('enemy ground direction preserves native face-away evasion', () => {
  const enemy = fixture('archer'),
    hero = fixture();
  enemy.player.x = 600;
  enemy.player.facing = 1;
  hero.player.x = 480;
  const direction = enemyPlaneDirection(enemy, hero);
  assert.ok(direction.x > 0);
  enemy.player.facing = -1;
  assert.ok(enemyPlaneDirection(enemy, hero).x < 0);
});

test('render offset cache reuses one stable pose and recomputes after the render scope ends', () => {
  const a = fixture(),
    player = a.player;
  const resolve = player.resolveActionOffset;
  let calls = 0;
  player.resolveActionOffset = function (...args) {
    calls++;
    return resolve.apply(this, args);
  };
  const expected = player.getPartOffset('weapon');
  player.renderPartOffsets = new Map();
  const cached = player.getPartOffset('weapon');
  assert.deepEqual(cached, expected);
  assert.equal(player.getPartOffset('weapon'), cached);
  assert.equal(calls, 2);
  player.renderPartOffsets = null;
  player.getPartOffset('weapon');
  assert.equal(calls, 3);
});

test('reversing native walk blends never sends quarter movement opposite the newly pressed direction', () => {
  const actor = fixture();
  let previous = new Set();
  for (const direction of [1, -1, 1, -1, 1]) {
    const code = direction < 0 ? 'ArrowLeft' : 'ArrowRight';
    for (let i = 0; i < 20; i++) {
      const keys = new Set([code]),
        pressed = new Set(previous.has(code) ? [] : [code]);
      const before = actor.player.x;
      const input = preparePlaneMotion(actor, { x: direction, z: 0 }, keys, pressed);
      actor.player.update(1 / 60, input.keys, input.pressed, world);
      finishPlaneMotion(actor);
      assert.ok((actor.player.x - before) * direction >= -1e-7, `reverse ${direction}, frame ${i}`);
      previous = keys;
    }
  }
});

test('opposite horizontal keys cancel before native action matching and permit depth-only movement', () => {
  const actor = fixture();
  const keys = new Set(['ArrowLeft', 'ArrowRight']);
  let input = preparePlaneMotion(actor, null, keys, keys);
  assert.equal(input.keys.size, 0);
  assert.equal(input.pressed.size, 0);
  input = preparePlaneMotion(actor, { x: 0, z: 1 }, new Set([...keys, 'QuarterDown']), keys);
  assert.equal(input.keys.has('ArrowLeft') && input.keys.has('ArrowRight'), false);
  assert.ok(input.keys.has(actor.player.facing < 0 ? 'ArrowLeft' : 'ArrowRight'));
});

test('world x bounds apply after projection so depth movement remains possible against either side wall', () => {
  for (const [x, facing] of [
    [0, -1],
    [1000, 1],
  ]) {
    const actor = fixture();
    actor.player.x = x;
    actor.player.facing = facing;
    const bounded = { ...world, minX: 0, maxX: 1000 };
    const motionWorld = Object.assign(Object.create(bounded), { minX: -Infinity, maxX: Infinity });
    for (let i = 0; i < 30; i++) {
      const input = preparePlaneMotion(
        actor,
        { x: 0, z: 1 },
        new Set(['QuarterDown']),
        new Set(i ? [] : ['QuarterDown'])
      );
      actor.player.update(1 / 60, input.keys, input.pressed, motionWorld);
      finishPlaneMotion(actor, bounded);
    }
    close(actor.player.x, x, 'remain at wall');
    assert.ok(actor.quarterDepth > 20, 'move along wall');
    const input = preparePlaneMotion(actor, { x: facing, z: 0 }, new Set([facing < 0 ? 'ArrowLeft' : 'ArrowRight']));
    actor.player.update(1 / 60, input.keys, input.pressed, motionWorld);
    finishPlaneMotion(actor, bounded);
    close(actor.player.x, x, 'cannot cross wall');
  }
});
