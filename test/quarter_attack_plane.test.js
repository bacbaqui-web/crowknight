import test from 'node:test';
import assert from 'node:assert/strict';
import { attackPlane, normalizeAttackPlane } from '../src/attack_plane_helper.js';
import { groundAttackRegions, attackPoint } from '../src/quarter_view/attack_geometry.js';
import { combatTargetRegions, groundProjectileRegion } from '../src/quarter_view/spatial.js';
import { overlappingAttackRegion } from '../src/interaction_overlap_helper.js';
import { cloneInteractionRegionSnapshot } from '../src/interaction_swept_region_helper.js';
import { normalizeActionSettings } from '../src/project_action_normalizer_helper.js';
import { writeActionTimelineSetting } from '../src/timeline_settings_helper.js';
import { readAttackPlaneOverrides } from '../src/quarter_view/attack_settings_view.js';
import { applyQuarterKnockback } from '../src/quarter_view/knockback.js';

function actor() {
  return {
    quarterDepth: 0,
    quarterFloorY: 430,
    quarterAim: { x: 0, z: 1 },
    player: {
      x: 480,
      y: 230,
      facing: 1,
      vx: 0,
      vy: 0,
      actionKey: 'jumpAttack',
      actionSettings: { jumpAttack: {} },
      customActions: [],
    },
  };
}
const region = {
  key: 'blade',
  x: 530,
  y: 170,
  w: 40,
  h: 40,
  reaction: { hitMode: 'box', knockback: 0, knockbackExtraVy: -80 },
};
const hurt = { key: 'body', x: 460, y: 160, w: 40, h: 60, reaction: { hurtByAttack: true } };
test('automatic plane distinguishes regular strikes, jump/dive attacks and projectiles, with explicit overrides', () => {
  const a = actor();
  assert.equal(attackPlane(a), 'height');
  a.player.actionKey = 'slash';
  assert.equal(attackPlane(a), 'ground');
  a.player.customActions = [{ key: 'slash', name: '낙하공격' }];
  assert.equal(attackPlane(a), 'height');
  a.player.actionSettings.slash = { quarterAttackPlane: 'ground' };
  assert.equal(attackPlane(a), 'ground');
  a.quarterAttackPlanes = { slash: 'height' };
  assert.equal(attackPlane(a), 'height');
  a.quarterAttackPlanes.slash = 'auto';
  a.player.customActions = [];
  assert.equal(attackPlane(a), 'ground');
  assert.equal(attackPlane(a, 'slash', true), 'height');
  assert.equal(normalizeAttackPlane('wrong'), 'auto');
});
test('height attack preserves native altitude and uses depth aim plus a separate ground lane', () => {
  const a = actor(),
    target = actor();
  target.quarterDepth = 70;
  const attack = groundAttackRegions(a, [region]);
  assert.equal(attack[0].y, 170);
  assert.equal(attackPoint(a, { x: 550, y: 170 }).y, 170);
  assert.ok(overlappingAttackRegion(a, attack, combatTargetRegions(a, target, [hurt], attack[0])));
  assert.equal(
    overlappingAttackRegion(a, attack, combatTargetRegions(a, target, [{ ...hurt, y: 360 }], attack[0])),
    undefined
  );
  target.player.x += 200;
  assert.deepEqual(combatTargetRegions(a, target, [hurt], attack[0]), []);
});
test('trace snapshots from a different attack plane cannot create cross-plane false hits', () => {
  const a = actor();
  const attack = groundAttackRegions(a, [{ ...region, reaction: { hitMode: 'trace' } }])[0];
  a.previousAttackRegions = [
    cloneInteractionRegionSnapshot({ ...attack, quarterPlane: 'ground', x: 0, y: 0, w: 10, h: 10 }, 'jumpAttack'),
  ];
  assert.equal(overlappingAttackRegion(a, [attack], [{ ...hurt, x: 200, y: 100 }]), undefined);
  assert.equal(cloneInteractionRegionSnapshot(attack, 'jumpAttack').quarterPlane, 'height');
});
test('projectile height uses its own launch direction and plane even after owner changes actions', () => {
  const owner = actor(),
    target = actor();
  target.quarterDepth = 80;
  owner.player.actionKey = 'slash';
  const p = { x: 480, quarterDepth: 80, quarterPlane: 'height', quarterAim: { x: 0, z: 1 } };
  const attack = groundProjectileRegion(p, { ...region, x: 460, y: 170 });
  assert.ok(overlappingAttackRegion(owner, [attack], combatTargetRegions(owner, target, [hurt], attack)));
  assert.equal(
    overlappingAttackRegion(owner, [attack], combatTargetRegions(owner, target, [{ ...hurt, y: 360 }], attack)),
    undefined
  );
  assert.equal(groundProjectileRegion({ ...p, quarterPlane: 'ground' }, region).y, 64);
});
test('height attacks keep vertical knockback and ground attacks keep it on the ground', () => {
  const a = actor(),
    target = actor();
  applyQuarterKnockback(a, target, { ...region, quarterPlane: 'height' }, {});
  assert.equal(target.player.vy, -80);
  target.player.vy = 0;
  applyQuarterKnockback(a, target, { ...region, quarterPlane: 'ground' }, {});
  assert.equal(target.player.vy, 0);
});
test('authored action plane survives normalization and old settings keep their previous shape', () => {
  const settings = { jumpAttack: {} };
  writeActionTimelineSetting(settings, 'jumpAttack', 'quarterAttackPlane', 'height');
  assert.equal(normalizeActionSettings(settings).jumpAttack.quarterAttackPlane, 'height');
  assert.equal(Object.hasOwn(normalizeActionSettings({}).jumpAttack, 'quarterAttackPlane'), false);
});
test('trial overrides survive storage reads and invalid storage safely falls back', () => {
  assert.deepEqual(readAttackPlaneOverrides({ getItem: () => '{"hero":{"slash":"ground","jumpAttack":"height"}}' }), {
    hero: { slash: 'ground', jumpAttack: 'height' },
  });
  assert.deepEqual(readAttackPlaneOverrides({ getItem: () => '{broken' }), {});
  assert.deepEqual(readAttackPlaneOverrides({ getItem: () => '[]' }), {});
});
