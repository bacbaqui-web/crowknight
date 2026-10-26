import test from 'node:test';
import assert from 'node:assert/strict';
import { directionalAttackRegions } from '../src/quarter_view/directional_attack.js';
import { EFFECT_DIRECTIONS } from '../src/quarter_view/effect_directions.js';
import { ATTACK_INTERACTION_OBJECT_KEY } from '../src/interaction_object_model_data.js';
import { scaleUpgradeAttackRegions } from '../src/run_upgrade_effect_helper.js';
import { interactionRegionsOverlap } from '../src/interaction_overlap_helper.js';
import { combatTargetRegions } from '../src/quarter_view/spatial.js';
import {
  createNativeWeaponTrail,
  crescentRibbon,
  orientCrescentAtHitbox,
} from '../src/quarter_view/native_weapon_trail.js';
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
test('eight directional sectors start at torso, hit ahead, reject behind/side and retain damage metadata', () => {
  for (const aim of EFFECT_DIRECTIONS) {
    const a = actor();
    a.quarterAim = aim;
    const box = directionalAttackRegions(a, raw)[0];
    const base = box.points[0];
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
    assert.equal(interactionRegionsOverlap(box, target(10, 50)), false);
  }
});
test('reach upgrades and skill reach scale the sector radius, arrow aim takes precedence over pending movement input', () => {
  const a = actor();
  a.quarterAim = { x: 1, z: 0 };
  a.quarterInputDirection = { x: 0, z: -1 };
  const initial = directionalAttackRegions(a, raw)[0];
  a.player.runUpgrades = { reach: 1.5 };
  a.player.runSkills = { reach: 2 };
  const boosted = directionalAttackRegions(a, scaleUpgradeAttackRegions(a.player, raw))[0];
  assert.ok(Math.abs(boosted.quarterBoxLength / initial.quarterBoxLength - 1.8) < 1e-8);
  assert.ok(Math.abs(boosted.w / initial.w - 1.8) < 1e-8);
  assert.equal(boosted.quarterBoxAim.x, 1);
  assert.equal(boosted.quarterBoxAim.z, 0);
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
    trail.capture(a, raw, directionalAttackRegions(a, raw));
  }
  const samples = trail.samples(a);
  assert.ok(samples.length <= 48);
  assert.deepEqual(samples.at(-1).points[1], { x: 130, y: -70, depth: 80 });
  a.player.dead = true;
  trail.capture(a, raw, directionalAttackRegions(a, raw));
  assert.equal(trail.samples(a).length, 0);
});

test('sector has a 120 degree opening and all directions have equal reach', () => {
  const a = actor();
  a.quarterAim = { x: 1, z: 0 };
  const right = directionalAttackRegions(a, raw)[0];
  a.quarterAim = { x: 0, z: 1 };
  const down = directionalAttackRegions(a, raw)[0];
  assert.ok(Math.abs(right.h - 2 * right.quarterBoxLength * Math.sin((60 * Math.PI) / 180)) < 1e-8);
  assert.ok(Math.abs(down.quarterBoxLength / right.quarterBoxLength - 1) < 1e-8);
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
    trail.capture(a, raw, directionalAttackRegions(a, raw));
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

test('crescent follows sparse rotation smoothly, tapers at both tips and stays on the weapon tip', () => {
  const samples = [0, Math.PI / 3, (Math.PI * 2) / 3].map((angle) => {
    const tip = { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
    return { anchor: { x: 0, y: 0, depth: 10 }, points: [{}, tip, tip] };
  });
  const ribbon = crescentRibbon(samples);
  assert.ok(ribbon.outer.length > 15);
  for (let i = 0; i < ribbon.outer.length; i++) {
    assert.ok(Math.abs(Math.hypot(ribbon.outer[i].x, ribbon.outer[i].y) - 100) < 1e-8);
    assert.equal(ribbon.outer[i].depth, 10);
  }
  const width = (i) => Math.hypot(ribbon.outer[i].x - ribbon.inner[i].x, ribbon.outer[i].y - ribbon.inner[i].y);
  assert.ok(width(0) < 1e-6);
  assert.ok(width(ribbon.outer.length - 1) < 1e-6);
  assert.ok(width(Math.floor(ribbon.outer.length / 2)) > 40);
});

test('sector rejects bounding-box corners and reaches its curved front', () => {
  const a = actor();
  a.quarterAim = { x: 1, z: 0 };
  const sector = directionalAttackRegions(a, raw)[0];
  const target = (radius, angle) => ({ x: radius * Math.cos(angle) - 1, y: radius * Math.sin(angle) - 1, w: 2, h: 2 });
  assert.ok(interactionRegionsOverlap(sector, target(sector.quarterBoxLength * 0.9, Math.PI / 6)));
  assert.equal(interactionRegionsOverlap(sector, target(sector.quarterBoxLength * 0.6, Math.PI * 0.4)), false);
  assert.equal(interactionRegionsOverlap(sector, target(sector.quarterBoxLength + 4, 0)), false);
});

test('enemy melee stays in the native vertical plane; spear matches the full rendered weapon', async () => {
  const { groundAttackRegions, screenPoint, attackRegionPoint } =
    await import('../src/quarter_view/attack_geometry.js');
  const { weaponContactRegion } = await import('../src/quarter_view/weapon_contact.js');
  const a = actor();
  a.group = 'mobs';
  a.quarterDepth = 70;
  a.quarterAim = { x: 0, z: 1 };
  const view = { x: 0, depth: 0, width: 800, height: 600, zoom: 1.3 };
  const world = { floorY: 0 };
  let region = directionalAttackRegions(a, raw)[0];
  assert.equal(region.quarterPlane, 'effect-height');
  assert.equal(groundAttackRegions(a, [region])[0], region);
  a.id = 'spearman';
  a.player.rig = { weapon: { w: 180, h: 12, ax: 60, ay: 6 } };
  a.player.getPartOffset = () => ({});
  a.player.weaponAnchorTransform = () => ({ a: 0.8, b: 0.6, c: -0.6, d: 0.8, e: 20, f: -60 });
  region = directionalAttackRegions(a, raw)[0];
  const native = weaponContactRegion(a, raw[0], true);
  for (let i = 0; i < 4; i++) {
    const shown = screenPoint({ ...native.points[i], depth: a.quarterDepth }, world, view);
    const hit = screenPoint(attackRegionPoint(a, region.points[i], region, 0), world, view);
    assert.ok(Math.hypot(shown.x - hit.x, shown.y - hit.y) < 1e-8);
  }
});

test('arrow collision and overlay match its rendered rotated rectangle for every aim', async () => {
  const { projectileAttackRegion } = await import('../src/projectile_runtime_engine.js');
  const { groundProjectileRegion } = await import('../src/quarter_view/spatial.js');
  const { screenPoint, attackRegionPoint } = await import('../src/quarter_view/attack_geometry.js');
  const view = { x: 50, depth: -30, width: 800, height: 600, zoom: 1.7 };
  for (const aim of EFFECT_DIRECTIONS) {
    const p = {
      x: 120,
      y: -90,
      quarterDepth: 80,
      quarterAim: aim,
      quarterPlane: 'height',
      angle: 1.2,
      hitboxWidth: 80,
      hitboxHeight: 8,
    };
    const native = projectileAttackRegion(p),
      hit = groundProjectileRegion(p, native);
    for (let i = 0; i < 4; i++) {
      const a = screenPoint({ ...native.points[i], depth: p.quarterDepth }, { floorY: 0 }, view);
      const b = screenPoint(attackRegionPoint(p, hit.points[i], hit, 0), { floorY: 0 }, view);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-8);
    }
  }
});

test('unbounded ground permits all directions and draws tiles far beyond the old depth limits', async () => {
  const { constrainGroundPosition } = await import('../src/quarter_view/bounds.js');
  const { visibleGroundTiles } = await import('../src/quarter_view/ground_renderer.js');
  for (const sign of [-1, 1]) {
    const a = actor();
    a.player.x = sign * 100000;
    a.quarterDepth = sign * 100000;
    constrainGroundPosition(a, { minX: 0, maxX: 100, quarterView: { unbounded: true } });
    assert.equal(a.player.x, sign * 100000);
    assert.equal(a.quarterDepth, sign * 100000);
    const tiles = visibleGroundTiles(
      { x: a.player.x, depth: a.quarterDepth, width: 1280, height: 720, zoom: 1 },
      a.player.x
    );
    assert.ok(tiles.length > 30 && tiles.length < 1000);
  }
});

test('all eight arrow directions center the 120 degree fan and use 100 percent reach', () => {
  const a = actor();
  a.quarterAim = { x: 1, z: 0 };
  const base = directionalAttackRegions(a, raw)[0].quarterBoxLength;
  for (const aim of EFFECT_DIRECTIONS) {
    a.quarterAim = aim;
    const fan = directionalAttackRegions(a, raw)[0];
    const expected = 1;
    assert.ok(Math.abs(fan.quarterBoxLength / base - expected) < 1e-8);
    const origin = fan.points[0];
    for (const [index, degrees] of [
      [1, -60],
      [9, 0],
      [17, 60],
    ]) {
      const p = fan.points[index],
        dx = p.x - origin.x,
        dz = p.y - origin.y;
      const angle = (Math.atan2(-dx * aim.z + dz * aim.x, dx * aim.x + dz * aim.z) * 180) / Math.PI;
      assert.ok(Math.abs(angle - degrees) < 1e-8);
    }
  }
});

test('base reach grows 15 percent and authored combo actions stack once with upgrades', () => {
  const a = actor();
  const original = Math.hypot(130, -20);
  const base = directionalAttackRegions(a, raw)[0].quarterBoxLength;
  assert.ok(Math.abs(base / original - 1.15) < 1e-8);
  a.player.customActions = [1, 2, 3].map((n) => ({ key: `custom${n}`, name: n === 1 ? '공격' : `공격${n}` }));
  for (const aim of EFFECT_DIRECTIONS) {
    a.quarterAim = aim;
    const directionScale = 1;
    for (let n = 1; n <= 3; n++) {
      a.player.actionKey = `custom${n}`;
      a.player.runUpgrades = { reach: 1.5 };
      a.player.runSkills = { reach: 2 };
      const hit = directionalAttackRegions(a, scaleUpgradeAttackRegions(a.player, raw))[0];
      assert.ok(Math.abs(hit.quarterBoxLength / base - directionScale * (1 + (n - 1) * 0.03) * 1.8) < 1e-8);
    }
  }
});

test('ground crescent uses hitbox projection for all aim directions and facings', async () => {
  const {
    QUARTER_PROJECTION: { slope },
  } = await import('../src/quarter_view/camera.js');
  const original = {
    outer: [
      { x: 5, y: -60, depth: 10 },
      { x: 30, y: -30, depth: 20 },
      { x: 10, y: 0, depth: 30 },
    ],
    inner: [
      { x: 5, y: -60, depth: 10 },
      { x: 20, y: -30, depth: 20 },
      { x: 10, y: 0, depth: 30 },
    ],
  };
  const saved = JSON.parse(JSON.stringify(original));
  for (const aim of EFFECT_DIRECTIONS)
    for (const facing of [-1, 1]) {
      const a = actor();
      a.quarterAim = aim;
      a.player.runUpgrades = { reach: 1.5 };
      const region = directionalAttackRegions(a, scaleUpgradeAttackRegions(a.player, raw))[0];
      const placed = orientCrescentAtHitbox(original, region, facing);
      const all = [...placed.outer, ...placed.inner];
      const origin = region.quarterBoxOrigin;
      const projectedLength = Math.hypot(aim.x, aim.z * slope);
      const front = Math.max(
        ...all.map((p) => ((p.x - origin.x) * aim.x + (p.y - origin.y) * aim.z * slope) / projectedLength)
      );
      assert.ok(Math.abs(front - region.quarterBoxLength * projectedLength * 0.85) < 1e-8);
      const normal = { x: placed.outer[1].x - placed.inner[1].x, y: placed.outer[1].y - placed.inner[1].y };
      assert.ok(normal.x * aim.x + normal.y * aim.z * slope > 0);
      assert.ok(Math.abs(normal.x * aim.z * slope - normal.y * aim.x) < 1e-8);
      for (const boundary of ['outer', 'inner'])
        original[boundary].forEach((p, i) => {
          const distance = Math.hypot(
            p.x - original.outer[1].x,
            p.y + p.depth * slope - original.outer[1].y - original.outer[1].depth * slope
          );
          const q = placed[boundary][i];
          assert.ok(Math.abs(Math.hypot(q.x - placed.outer[1].x, (q.y - placed.outer[1].y) / slope) - distance) < 1e-8);
        });
    }
  assert.deepEqual(original, saved);
  assert.equal(orientCrescentAtHitbox(original, {}), original);
});
