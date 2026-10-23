import test from 'node:test';
import assert from 'node:assert/strict';
import { directionalLayers, facingBasis, facingPartMatrix, facingEffectMatrix } from '../src/quarter_view/facing.js';
import { preparePlaneMotion, movementInput } from '../src/quarter_view/motion.js';
import { combatTargetRegions } from '../src/quarter_view/spatial.js';

const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const rect = { x: 0, y: 0, w: 100, h: 10 };
test('left and right retain the original side-view matrices and layer order', () => {
  const layers = ['head', 'cape', 'body'];
  for (const facing of [-1, 1]) {
    assert.equal(facingPartMatrix(identity, rect, 'weapon', facingBasis({ x: facing, z: 0 }, facing)), identity);
    assert.equal(directionalLayers(layers, { x: facing, z: 0 }), layers);
  }
});
test('up and down keep the body upright while pointing the weapon into opposite depth directions', () => {
  for (const z of [-1, 1]) {
    const basis = facingBasis({ x: 0, z }, 1),
      weapon = facingPartMatrix(identity, rect, 'weapon', basis);
    assert.equal(Math.sign(weapon.b), z);
    assert.ok(Math.abs(weapon.a) < 0.2);
    const body = facingPartMatrix(identity, rect, 'body', basis);
    assert.ok(body.a > 0.75);
    assert.equal(body.d, 1);
  }
});
test('front/back layers preserve the source list and put cape behind or in front of the body', () => {
  const layers = ['body', 'head', 'cape', 'weapon', 'rightArm'];
  const front = directionalLayers(layers, { x: 0, z: 1 }),
    back = directionalLayers(layers, { x: 0, z: -1 });
  assert.ok(front.indexOf('cape') < front.indexOf('body'));
  assert.ok(back.indexOf('cape') > back.indexOf('body'));
  assert.deepEqual(layers, ['body', 'head', 'cape', 'weapon', 'rightArm']);
  assert.deepEqual([...front].sort(), [...layers].sort());
});
test('stopping after vertical movement preserves the visual and combat direction through the attack', () => {
  for (const z of [-1, 1]) {
    const actor = {
      quarterDepth: 0,
      player: { x: 0, facing: 1, isCustomActionActive: false, actionKey: 'idle', actionSettings: {} },
    };
    const keys = new Set([z < 0 ? 'QuarterUp' : 'QuarterDown']);
    preparePlaneMotion(actor, movementInput(keys), keys, new Set());
    preparePlaneMotion(actor, null, new Set(['KeyQ']), new Set(['KeyQ']));
    assert.deepEqual(actor.player.quarterAim, { x: 0, z });
    actor.player.isCustomActionActive = true;
    actor.player.actionKey = 'attack';
    actor.player.actionSettings.attack = { group: 'attack' };
    preparePlaneMotion(actor, { x: 0, z: -z }, new Set(), new Set());
    assert.deepEqual(actor.quarterAim, { x: 0, z });
    const target = { quarterDepth: z * 80, player: { x: 0, transform: { scale: 1 } } };
    const regions = [{ x: -5, y: -30, w: 10, h: 30 }];
    assert.equal(combatTargetRegions(actor, target, regions)[0].x, 75);
  }
});

test('vertical slash effects rotate across the forward lane instead of collapsing to a side-facing line', () => {
  for (const z of [-1, 1])
    for (const facing of [-1, 1]) {
      const matrix = facingEffectMatrix(facingBasis({ x: 0, z }, facing), facing);
      assert.ok(Math.abs(matrix.a) < 1e-8);
      assert.equal(Math.sign(matrix.b), z);
      assert.equal(matrix.d, 0);
      assert.ok(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c) > 0.3);
    }
});
