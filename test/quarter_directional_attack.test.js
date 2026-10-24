import test from 'node:test';
import assert from 'node:assert/strict';
import { directionalAttackRegions } from '../src/quarter_view/directional_attack.js';
import { EFFECT_DIRECTIONS } from '../src/quarter_view/effect_directions.js';
import { ATTACK_INTERACTION_OBJECT_KEY } from '../src/interaction_object_model_data.js';
import { scaleUpgradeAttackRegions } from '../src/run_upgrade_effect_helper.js';
import { interactionRegionsOverlap } from '../src/interaction_overlap_helper.js';
import { combatTargetRegions } from '../src/quarter_view/spatial.js';
import { createNativeWeaponTrail, crescentRibbon } from '../src/quarter_view/native_weapon_trail.js';
const raw = [
  { key: ATTACK_INTERACTION_OBJECT_KEY, x: 30, y: -90, w: 100, h: 30, reaction: { damage: 17, hitMode: 'trace' } },
];
function actor() {
  return {
    quarterDepth: 0,
    quarterFloorY: 0,
    player: {
      x: 0,
      y: 0,
      facing: 1,
      animTime: 0,
      attackSerial: 1,
      actionKey: 'attack',
      actionSettings: { attack: { group: 'attack' } },
      hurtInteractionRegions: [{ x: -20, y: -100, w: 40, h: 60 }],
    },
  };
}
test('eight directional boxes start at torso, hit ahead, reject behind/side and retain damage metadata', () => {
  for (const aim of EFFECT_DIRECTIONS) {
    const a = actor();
    a.quarterAim = aim;
    const box = directionalAttackRegions(a, raw)[0];
    const base = { x: (box.points[0].x + box.points[3].x) / 2, y: (box.points[0].y + box.points[3].y) / 2 };
    assert.ok(Math.hypot(base.x, base.y) < 1e-8);
    assert.equal(box.quarterElevation, -70);
    assert.equal(box.reaction.damage, 17);
    assert.equal(box.reaction.hitMode, 'box');
    const target = (forward, side) => ({
      x: aim.x * forward - aim.z * side - 4,
      y: aim.z * forward + aim.x * side - 4,
      w: 8,
      h: 8,
    });
    assert.ok(interactionRegionsOverlap(box, target(box.quarterBoxLength / 2, 0)));
    assert.equal(interactionRegionsOverlap(box, target(-40, 0)), false);
    assert.equal(interactionRegionsOverlap(box, target(box.quarterBoxLength / 2, 65)), false);
  }
});
test('reach upgrades and skill reach lengthen only the box, input direction overrides retained aim', () => {
  const a = actor();
  a.quarterAim = { x: 1, z: 0 };
  a.quarterInputDirection = { x: 0, z: -1 };
  const initial = directionalAttackRegions(a, raw)[0];
  a.player.runUpgrades = { reach: 1.5 };
  a.player.runSkills = { reach: 2 };
  const boosted = directionalAttackRegions(a, scaleUpgradeAttackRegions(a.player, raw))[0];
  assert.ok(Math.abs(boosted.quarterBoxLength / initial.quarterBoxLength - 1.8) < 1e-8);
  assert.equal(boosted.w, initial.w);
  assert.equal(boosted.quarterBoxAim.z, -1);
  assert.deepEqual(directionalAttackRegions(a, []), []);
});
test('projectiles bypass boxes and airborne melee still filters target height', () => {
  const a = actor();
  a.quarterAim = { x: 1, z: 0 };
  a.quarterAttackPlanes = { attack: 'height' };
  const box = directionalAttackRegions(a, raw)[0];
  const target = { quarterDepth: 0, player: { x: 60, y: 0 } };
  assert.equal(combatTargetRegions(a, target, [{ x: 50, y: -90, w: 20, h: 20 }], box).length, 1);
  assert.equal(combatTargetRegions(a, target, [{ x: 50, y: -300, w: 20, h: 20 }], box).length, 0);
  a.player.actionSettings.attack.formulas = [{ type: 'projectile', enabled: true }];
  assert.equal(directionalAttackRegions(a, raw), raw);
});
test('visual trail follows native weapon coordinates regardless of aim and has a bounded sample count', () => {
  const a = actor();
  a.quarterAim = { x: 0, z: -1 };
  a.quarterDepth = 80;
  a.player.rig = { weapon: { w: 100, h: 10, baseW: 100, baseH: 10, ax: 0, ay: 0 } };
  a.player.getPartOffset = () => ({});
  a.player.weaponAnchorTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 30, f: -70 });
  const trail = createNativeWeaponTrail({}, { floorY: 0 });
  for (let i = 0; i < 40; i++) {
    a.player.animTime = i / 120;
    trail.capture(a, raw);
  }
  const samples = trail.samples(a);
  assert.ok(samples.length <= 48);
  assert.deepEqual(samples.at(-1).points[1], { x: 130, y: -70, depth: 80 });
  a.player.dead = true;
  trail.capture(a, raw);
  assert.equal(trail.samples(a).length, 0);
});

test('box is thicker and depth directions have extra reach', () => {
  const a = actor();
  a.quarterAim = { x: 1, z: 0 };
  const right = directionalAttackRegions(a, raw)[0];
  a.quarterAim = { x: 0, z: 1 };
  const down = directionalAttackRegions(a, raw)[0];
  assert.equal(right.h, 50);
  assert.ok(Math.abs(down.quarterBoxLength / right.quarterBoxLength - 1.35) < 1e-8);
});

test('live box follows attack displacement after capture without moving its old snapshot', async () => {
  const { captureAttackRegions, currentAttackRegions } = await import('../src/quarter_view/attack_geometry.js');
  const a = actor();
  const box = directionalAttackRegions(a, raw)[0];
  captureAttackRegions(a, [box]);
  a.player.x += 12;
  a.player.y -= 3;
  a.quarterDepth += 25;
  const moved = currentAttackRegions(a)[0];
  assert.equal(moved.x, box.x + 12);
  assert.equal(moved.y, box.y + 25);
  assert.equal(moved.quarterElevation, box.quarterElevation - 3);
  assert.equal(a.quarterAttackRegions[0], box);
});

test('whole swing stays visible together and fades together after attack stops', () => {
  const a = actor();
  a.player.rig = { weapon: { w: 100, h: 10, ax: 0, ay: 0 } };
  a.player.getPartOffset = () => ({});
  a.player.weaponAnchorTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 30, f: -70 });
  let fills = 0;
  const ctx = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    closePath() {},
    fill() {
      fills++;
    },
  };
  const trail = createNativeWeaponTrail(ctx, { floorY: 0 });
  for (let i = 0; i < 60; i++) {
    a.player.animTime = i / 120;
    trail.capture(a, raw);
  }
  assert.equal(trail.samples(a)[0].time, 0);
  assert.ok(trail.samples(a).length <= 48);
  a.player.animTime += 0.12;
  trail.capture(a, []);
  trail.draw(a, { x: 0, depth: 0, width: 800, height: 600, zoom: 1 });
  assert.equal(fills, 1);
  assert.ok(ctx.globalAlpha > 0 && ctx.globalAlpha < 0.36);
  a.player.animTime += 0.2;
  trail.draw(a, {});
  assert.equal(fills, 1);
});

test('crescent follows sparse rotation smoothly, tapers at both tips and leads the weapon', () => {
  const samples = [0, Math.PI / 3, (Math.PI * 2) / 3].map((angle) => {
    const tip = { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
    return { anchor: { x: 0, y: 0, depth: 10 }, points: [{}, tip, tip] };
  });
  const ribbon = crescentRibbon(samples);
  assert.ok(ribbon.outer.length > 15);
  for (let i = 0; i < ribbon.outer.length; i++) {
    assert.ok(Math.hypot(ribbon.inner[i].x, ribbon.inner[i].y) > 110);
    assert.equal(ribbon.outer[i].depth, 10);
  }
  const width = (i) => Math.hypot(ribbon.outer[i].x - ribbon.inner[i].x, ribbon.outer[i].y - ribbon.inner[i].y);
  assert.ok(width(0) < 1e-6);
  assert.ok(width(ribbon.outer.length - 1) < 1e-6);
  assert.ok(width(Math.floor(ribbon.outer.length / 2)) > 20);
});
