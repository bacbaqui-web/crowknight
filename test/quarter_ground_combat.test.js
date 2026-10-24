import test from 'node:test';
import assert from 'node:assert/strict';
import { groundAttackRegions, attackPoint } from '../src/quarter_view/attack_geometry.js';
import { combatTargetRegions, groundProjectileRegion } from '../src/quarter_view/spatial.js';
import { applyGroundKnockback } from '../src/quarter_view/knockback.js';
import { groundPoint, normalizeDirection } from '../src/quarter_view/camera.js';
import { visibleGroundTiles } from '../src/quarter_view/ground_renderer.js';
import { interpolateFrameValues } from '../src/puppet_player_geometry_helper.js';

const region = { key: 'blade', x: 530, y: 300, w: 40, h: 70, reaction: { hitMode: 'trace', knockback: 100 } };
function actor() {
  return {
    quarterDepth: 30,
    quarterFloorY: 430,
    quarterAim: { x: 1, z: 0 },
    player: { x: 480, y: 430, facing: 1, vx: 0, vy: -60 },
  };
}
test('all eight ground polygons are invariant to attack altitude and retain the authored lateral swing', () => {
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
    const a = actor();
    a.quarterAim = normalizeDirection(x, z);
    const before = groundAttackRegions(a, [region]);
    a.player.y -= 200;
    const after = groundAttackRegions(a, [{ ...region, y: region.y - 200 }]);
    assert.deepEqual(after, before);
    assert.equal(attackPoint(a, { x: 550, y: 100 }).y, 430);
    assert.equal(before[0].points.length, 4);
  }
});
test('hurt and projectile ground footprints do not depend on height', () => {
  const a = actor(),
    target = actor();
  target.quarterDepth = 80;
  const hurt = { x: 460, y: 200, w: 40, h: 180, reaction: { hurtByAttack: true } };
  assert.deepEqual(
    combatTargetRegions(a, target, [hurt]),
    combatTargetRegions(a, target, [{ ...hurt, y: -500, h: 500 }])
  );
  assert.deepEqual(
    groundProjectileRegion({ quarterDepth: 80 }, region),
    groundProjectileRegion({ quarterDepth: 80 }, { ...region, y: -500, h: 1000 })
  );
});
test('ground knockback follows the swept lateral direction and never adds vertical velocity', () => {
  const a = actor(),
    target = actor();
  target.player.x = 550;
  target.player.facing = -1;
  a.player.actionKey = 'slash';
  a.previousAttackRegions = [{ ...region, actionKey: 'slash', x: 500, y: 0, w: 20, h: 20 }];
  const current = { ...region, x: 500, y: 20, w: 20, h: 20 };
  applyGroundKnockback(a, target, current);
  assert.deepEqual(target.quarterImpulse, { x: 0, z: 1 });
  assert.equal(target.player.vx, -100);
  assert.equal(target.player.vy, -60);
  assert.equal(target.player.velocityControl.y, undefined);
});
test('viewport culling retains every visible original tile across camera positions and zooms', () => {
  for (const zoom of [0.7, 1, 1.8])
    for (const depth of [-168, 0, 168]) {
      const view = { width: 1280, height: 960, x: 713, depth, zoom },
        center = 600;
      const expected = [];
      for (let row = -24; row <= 24; row++)
        for (let col = -22; col <= 22; col++) {
          const x = center + col * 100 + (row % 2) * 50,
            z = row * 80;
          const points = [
            [x - 50, z],
            [x, z - 80],
            [x + 50, z],
            [x, z + 80],
          ].map(([px, pz]) => groundPoint(px, pz, view));
          if (
            Math.max(...points.map((p) => p.x)) < 0 ||
            Math.min(...points.map((p) => p.x)) > view.width ||
            Math.max(...points.map((p) => p.y)) < 0 ||
            Math.min(...points.map((p) => p.y)) > view.height
          )
            continue;
          expected.push({ parity: Boolean((col + row) % 2), points });
        }
      assert.deepEqual(visibleGroundTiles(view, center), expected);
      assert.ok(expected.length < 2205);
    }
});
test('key interpolation preserves defaults, discrete flags, unsorted keys and in-place editor changes', () => {
  const keys = [
    { t: 1, x: 100, active: 0 },
    { t: 0, x: 20, active: 1 },
  ];
  assert.equal(interpolateFrameValues(keys, 0.5).x, 60);
  assert.equal(interpolateFrameValues(keys, 0.5).active, 1);
  assert.equal(interpolateFrameValues(keys, 1).active, 0);
  assert.equal(interpolateFrameValues(keys, 0).opacity, 1);
  keys[1].x = 40;
  assert.equal(interpolateFrameValues(keys, 0.5).x, 70);
  assert.deepEqual(interpolateFrameValues([], 0, { x: 5 }), { x: 5 });
});
