import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { alignEnemyWeaponRegions } from '../src/quarter_view/weapon_contact.js';
import {
  attackPoint,
  groundAttackRegions,
  captureAttackRegions,
  screenPoint,
  attackRegionPoint,
} from '../src/quarter_view/attack_geometry.js';
import { groundPoint } from '../src/quarter_view/camera.js';
import { createSlashTrails } from '../src/quarter_view/slash_trail.js';
import { cloneInteractionRegionSnapshot, regionPoints } from '../src/interaction_swept_region_helper.js';
import {
  identityMatrix,
  multiplyMatrix,
  translationMatrix,
  scaleMatrix,
  rotationMatrix,
  transformMatrixPoint,
} from '../src/puppet_player_geometry_helper.js';

const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
const world = { floorY: 430 },
  view = { width: 1280, height: 720, x: 480, depth: 0, zoom: 1.4 };
function fixture(id) {
  const def = saved.characters.find((actor) => actor.id === id);
  const assets = Object.fromEntries(
    [
      'body',
      'head',
      'cape',
      'shield',
      'weapon',
      'upperArmL',
      'lowerArmL',
      'upperArmR',
      'lowerArmR',
      'upperLegL',
      'lowerLegL',
      'upperLegR',
      'lowerLegR',
    ].map((key) => [key, { key, width: 100, height: 100 }])
  );
  const player = new PuppetPlayer(480, 430, assets);
  player.applyTuning(mergeTuning(defaultTuningFor(def), saved.actors[id].tuning));
  player.captureEditRegions = false;
  return { id, player, quarterDepth: 60, quarterFloorY: 430, quarterAim: { x: 1, z: 0 } };
}
function recordingContext() {
  let matrix = identityMatrix();
  const stack = [],
    images = [];
  const ctx = new Proxy(
    {
      globalAlpha: 1,
      save() {
        stack.push({ ...matrix });
      },
      restore() {
        matrix = stack.pop();
      },
      translate(x, y) {
        matrix = multiplyMatrix(matrix, translationMatrix(x, y));
      },
      scale(x, y) {
        matrix = multiplyMatrix(matrix, scaleMatrix(x, y));
      },
      rotate(angle) {
        matrix = multiplyMatrix(matrix, rotationMatrix(angle));
      },
      setTransform(value) {
        matrix = { ...value };
      },
      getTransform() {
        return { ...matrix };
      },
      drawImage(image, x, y, w, h) {
        images.push({ key: image.key, matrix: { ...matrix }, rect: { x, y, w, h } });
      },
    },
    { get: (target, key) => target[key] ?? (() => {}) }
  );
  return { ctx, images };
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} vs ${b}`);
for (const id of ['player_01', 'enemy_01', 'swordman'])
  test(`${id}: native blade rendering stays unchanged while glow and damage share the aimed projection at every active pose`, () => {
    const actor = fixture(id),
      player = actor.player;
    let checked = 0;
    for (const facing of [-1, 1])
      for (const aim of [
        { x: facing, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
      ]) {
        player.facing = facing;
        player.runUpgrades = { reach: facing === 1 ? 1.5 : 1 };
        actor.quarterAim = aim;
        for (const action of player.customActions.filter(
          (action) => player.actionSettings[action.key]?.group === 'attack'
        )) {
          for (let frame = 0; frame <= 100; frame++) {
            player.y = 430 - (frame % 3) * 65;
            actor.quarterDepth = 60 + (frame % 3) * 40;
            player.actionPreview = { action: action.key, t: frame / 100 };
            const raw = alignEnemyWeaponRegions(actor, player.attackInteractionRegions);
            if (!raw.length) continue;
            const { ctx, images } = recordingContext();
            const base = groundPoint(player.x, actor.quarterDepth, view);
            ctx.translate(base.x, base.y);
            ctx.scale(base.scale, base.scale);
            ctx.translate(-player.x, -world.floorY);
            player.draw(ctx);
            for (const region of raw) {
              if (!region.quarterWeaponContact) continue;
              const image = images.find((image) => image.key === region.quarterWeaponPart);
              if (!image) continue;
              const part = player.rig[region.quarterWeaponPart],
                offset = player.getPartOffset(region.quarterWeaponPart);
              const width = part.w + (offset.w || 0),
                height = part.h + (offset.h || 0);
              const ax = (((part.ax ?? part.ox ?? 0) + (offset.ax || 0)) * width) / (part.baseW || part.w);
              const ay = (((part.ay ?? part.oy ?? 0) + (offset.ay || 0)) * height) / (part.baseH || part.h);
              const grip = region.quarterWeaponPart === 'weapon' ? Math.min(width * 0.45, Math.max(0, ax)) : 0;
              const local = [
                [grip - ax, -ay],
                [width - ax, -ay],
                [width - ax, height - ay],
                [grip - ax, height - ay],
              ];
              // Obtain the configured plane through the same authoritative geometry path.
              const flat = groundAttackRegions(actor, [region])[0];
              region.points.forEach((point, index) => {
                const directed = attackPoint(actor, point, 0, flat.quarterPlane);
                close(flat.points[index].x, flat.quarterPlane === 'ground' ? directed.x : point.x);
                close(flat.points[index].y, flat.quarterPlane === 'ground' ? directed.depth : point.y);
              });
              for (let i = 0; i < 4; i++) {
                const drawn = transformMatrixPoint(image.matrix, ...local[i]);
                const expected = screenPoint(
                  { x: region.points[i].x, depth: actor.quarterDepth, y: region.points[i].y },
                  world,
                  view
                );
                close(drawn.x, expected.x);
                close(drawn.y, expected.y);
              }
              const trail = createSlashTrails({}, world);
              captureAttackRegions(actor, raw);
              trail.capture(actor, raw);
              const sample = trail.samples(actor)[0];
              const damage = actor.quarterAttackRegions[0];
              const expected = regionPoints(damage).map((point) =>
                attackRegionPoint(actor, point, damage, world.floorY)
              );
              assert.deepEqual(sample.sweep, expected);
              checked++;
            }
          }
        }
      }
    assert.ok(checked > 30);
  });
test('fast blade movement shares the exact collision sweep with the glow, and inactive intervals clear previous contact', () => {
  const actor = fixture('player_01'),
    player = actor.player;
  const action = player.customActions.find((action) => player.actionSettings[action.key]?.group === 'attack');
  const trail = createSlashTrails({}, world);
  let checked = 0;
  for (let frame = 0; frame <= 100; frame++) {
    player.actionPreview = { action: action.key, t: frame / 100 };
    player.animTime = frame / 60;
    const raw = alignEnemyWeaponRegions(actor, player.attackInteractionRegions),
      flat = groundAttackRegions(actor, raw);
    captureAttackRegions(actor, raw, flat);
    trail.capture(actor, raw);
    if (raw.length) {
      const last = trail.samples(actor).at(-1),
        damage = actor.quarterAttackRegions[0];
      assert.deepEqual(
        last.sweep.map((point) => ({ x: point.x, y: damage.quarterPlane === 'ground' ? point.depth : point.y })),
        damage.points
      );
      checked++;
    }
    actor.previousAttackRegions = flat.map((region) => cloneInteractionRegionSnapshot(region, player.actionKey));
  }
  assert.ok(checked > 1);
});

test('weapon-derived ground geometry rotates through eight aim directions without changing its native pose', () => {
  const actor = fixture('player_01'),
    player = actor.player;
  const action = player.customActions.find((action) => player.actionSettings[action.key]?.group === 'attack');
  let raw;
  for (let i = 0; i <= 100; i++) {
    player.actionPreview = { action: action.key, t: i / 100 };
    raw = alignEnemyWeaponRegions(actor, player.attackInteractionRegions);
    if (raw.length) break;
  }
  assert.ok(raw.length);
  const native = JSON.stringify(player.weaponAnchorTransform());
  const mean = raw[0].points.reduce((s, p) => ({ x: s.x + p.x / 4, y: s.y + p.y / 4 }), { x: 0, y: 0 });
  const forward = (mean.x - player.x) * player.facing;
  for (const [x, z] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const length = Math.hypot(x, z);
    actor.quarterAim = { x: x / length, z: z / length };
    const region = groundAttackRegions(actor, raw)[0];
    const center = region.points.reduce((s, p) => ({ x: s.x + p.x / 4, y: s.y + p.y / 4 }), { x: 0, y: 0 });
    close((center.x - player.x) * actor.quarterAim.x + (center.y - actor.quarterDepth) * actor.quarterAim.z, forward);
    assert.equal(JSON.stringify(player.weaponAnchorTransform()), native);
  }
});
