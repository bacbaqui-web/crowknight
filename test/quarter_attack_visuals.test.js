import test from 'node:test';
import assert from 'node:assert/strict';
import { groundPoint, normalizeDirection } from '../src/quarter_view/camera.js';
import {
  attackPoint,
  captureAttackRegions,
  currentAttackRegions,
  screenPoint,
  targetLaneRadius,
  ATTACK_HALF_WIDTH,
} from '../src/quarter_view/attack_geometry.js';
import { attackEffectMatrix, effectAnchor } from '../src/quarter_view/attack_effects.js';
import { createHitboxView } from '../src/quarter_view/hitbox_view.js';
import { cloneInteractionRegionSnapshot, sweptInteractionRegion } from '../src/interaction_swept_region_helper.js';

const world = { floorY: 430 };
const view = { width: 1280, height: 720, x: 500, depth: 0, zoom: 1.5 };
function actor(aim = { x: 0, z: 1 }, facing = 1) {
  const region = { key: 'blade', x: 480 + facing * 60 - 20, y: 350, w: 40, h: 30, reaction: { hitMode: 'box' } };
  return {
    quarterAim: aim,
    quarterDepth: 60,
    player: {
      x: 480,
      y: 430,
      facing,
      animTime: 0,
      attackSerial: 1,
      actionKey: 'slash',
      transform: { scale: 0.5 },
      attackInteractionRegions: [region],
    },
  };
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} vs ${expected}`);
}
function apply(m, p) {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

test('all eight attack directions align the effect anchor with the actual ground hitbox without modifying the character', () => {
  for (const facing of [-1, 1])
    for (const [x, z] of [
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ]) {
      const a = actor(normalizeDirection(x, z), facing),
        before = JSON.stringify(a);
      const m = attackEffectMatrix(a, world, view),
        anchor = effectAnchor(a);
      const actual = apply(m, anchor),
        expected = screenPoint(attackPoint(a, anchor), world, view);
      close(actual.x, expected.x);
      close(actual.y, expected.y);
      const step = apply(m, { x: anchor.x + facing, y: anchor.y });
      const forward = screenPoint(attackPoint(a, { x: anchor.x + facing, y: anchor.y }), world, view);
      close(step.x, forward.x);
      close(step.y, forward.y);
      assert.ok(Math.abs(m.a * m.d - m.b * m.c) > 0.05, 'effect must retain visible area for vertical attacks');
      assert.equal(JSON.stringify(a), before);
    }
});
test('ground display keeps the original combined attack and target lane width', () => {
  for (const scale of [0.1, 0.5, 1, 2, 3]) {
    const target = { player: { transform: { scale } } };
    assert.equal(ATTACK_HALF_WIDTH + targetLaneRadius(target), Math.max(32, Math.min(70, scale * 42)));
  }
});
test('trace overlay captures the same sweep before combat overwrites previous regions and clears on inactive frames', () => {
  const a = actor(),
    current = a.player.attackInteractionRegions[0];
  current.reaction.hitMode = 'trace';
  const previous = { ...current, x: current.x - 100 };
  a.previousAttackRegions = [cloneInteractionRegionSnapshot(previous, 'slash')];
  const expected = sweptInteractionRegion(previous, current);
  captureAttackRegions(a, [current]);
  a.previousAttackRegions = [cloneInteractionRegionSnapshot(current, 'slash')];
  assert.deepEqual(currentAttackRegions(a), [expected]);
  captureAttackRegions(a, []);
  assert.deepEqual(currentAttackRegions(a), []);
  a.player.dead = true;
  assert.deepEqual(currentAttackRegions(a), []);
});
test('projection keeps altitude distinct from ground depth', () => {
  const p = screenPoint({ x: 480, depth: 100, y: 350 }, world, view),
    ground = groundPoint(480, 100, view);
  close(p.y, ground.y - 80 * ground.scale);
});
test('toggle, short dashed history and restart reset never change combat data', () => {
  let click;
  const attributes = {};
  const button = {
    addEventListener: (_event, handler) => {
      click = handler;
    },
    setAttribute: (key, value) => {
      attributes[key] = value;
    },
  };
  const legend = { hidden: true, textContent: '' },
    dashes = [];
  const ctx = {
    arc() {},
    fillText() {},
    save() {},
    restore() {},
    setLineDash(value) {
      dashes.push(value);
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
  };
  const overlay = createHitboxView({ ctx, world, button, legend }),
    a = actor(),
    before = JSON.stringify(a);
  overlay.draw([a], a, view);
  assert.equal(dashes.length, 0);
  click();
  assert.equal(attributes['aria-pressed'], 'true');
  assert.equal(legend.hidden, false);
  overlay.draw([a], a, view);
  assert.match(legend.textContent, /현재 공격 1개/);
  assert.equal(JSON.stringify(a), before);
  a.player.attackInteractionRegions = [];
  a.player.animTime = 0.1;
  dashes.length = 0;
  overlay.draw([a], a, view);
  assert.ok(dashes.some((d) => d.length === 2));
  assert.match(legend.textContent, /현재 공격 0개/);
  overlay.reset();
  dashes.length = 0;
  overlay.draw([a], a, view);
  assert.equal(dashes.length, 0);
  click();
  assert.equal(attributes['aria-pressed'], 'false');
  assert.equal(legend.hidden, true);
});
