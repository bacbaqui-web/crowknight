import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { prepareSkillActions } from '../src/skill_runtime_helper.js';
import { createRuntimeEffectReader } from '../src/runtime_effect_reader.js';
import { alignEffectRegions, effectImageBounds } from '../src/quarter_view/effect_geometry.js';
import { applyQuarterKnockback } from '../src/quarter_view/knockback.js';
import { EFFECT_DIRECTIONS, effectDirection } from '../src/quarter_view/effect_directions.js';
import { drawQuarterAttackEffect } from '../src/quarter_view/attack_effects.js';
import { groundAttackRegions, attackRegionPoint, screenPoint } from '../src/quarter_view/attack_geometry.js';
import {
  identityMatrix,
  multiplyMatrix,
  translationMatrix,
  scaleMatrix,
  rotationMatrix,
  transformMatrixPoint,
} from '../src/puppet_player_geometry_helper.js';

const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
const assets = Object.fromEntries(
  Object.keys(saved.effectAssets)
    .filter((key) => key !== '__snapshot')
    .map((key) => [key, { key, width: 64, height: 64 }])
);
const world = { floorY: 430 },
  view = { width: 1280, height: 720, x: 480, depth: 0, zoom: 1.4 };
function fixture(id) {
  const def = saved.characters.find((a) => a.id === id),
    tuning = mergeTuning(defaultTuningFor(def), saved.actors[id].tuning);
  if (id === 'player_01') prepareSkillActions(tuning);
  const player = new PuppetPlayer(480, 430, {});
  player.applyTuning(tuning);
  return { ...def, tuning, player, quarterDepth: 60, quarterFloorY: 430 };
}
function recordingContext() {
  let matrix = identityMatrix();
  const stack = [],
    images = [];
  return {
    images,
    ctx: {
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
      rotate(a) {
        matrix = multiplyMatrix(matrix, rotationMatrix(a));
      },
      transform(a, b, c, d, e, f) {
        matrix = multiplyMatrix(matrix, { a, b, c, d, e, f });
      },
      drawImage(image, x, y, w, h) {
        images.push({
          image,
          points: [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
          ].map(([x, y]) => transformMatrixPoint(matrix, x, y)),
        });
      },
    },
  };
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
for (const id of ['player_01', 'enemy_01', 'swordman'])
  test(`${id}: original effect image corners match actual hitbox in eight directions at every active pose`, () => {
    const actor = fixture(id),
      player = actor.player,
      read = createRuntimeEffectReader();
    let checked = 0;
    for (const action of player.customActions.filter((a) => player.actionSettings[a.key]?.group === 'attack'))
      for (let frame = 0; frame <= 100; frame++) {
        player.actionPreview = { action: action.key, t: frame / 100 };
        player.y = 430 - (frame % 3) * 45;
        if (!player.attackInteractionRegions.length) continue;
        for (const facing of [-1, 1]) {
          player.facing = facing;
          const native = JSON.stringify(player.weaponAnchorTransform());
          for (const direction of EFFECT_DIRECTIONS) {
            actor.quarterAim = direction;
            const raw = alignEffectRegions(actor, player.attackInteractionRegions, read, assets);
            assert.ok(raw.length);
            const flat = groundAttackRegions(actor, raw)[0],
              { ctx, images } = recordingContext();
            drawQuarterAttackEffect(ctx, actor, assets, world, view, read);
            assert.equal(images.length, 1);
            for (let i = 0; i < 4; i++) {
              const expected = screenPoint(attackRegionPoint(actor, flat.points[i], flat, world.floorY), world, view);
              close(images[0].points[i].x, expected.x);
              close(images[0].points[i].y, expected.y);
            }
            assert.equal(JSON.stringify(player.weaponAnchorTransform()), native);
            checked++;
          }
        }
      }
    assert.ok(checked > 100);
  });
test('eight cases have distinct positions and arbitrary enemy aim snaps to one of those cases', () => {
  const actor = fixture('player_01'),
    player = actor.player,
    read = createRuntimeEffectReader();
  const action = player.customActions.find((a) => player.actionSettings[a.key]?.group === 'attack');
  let raw;
  for (let i = 0; i <= 100; i++) {
    player.actionPreview = { action: action.key, t: i / 100 };
    if (player.attackInteractionRegions.length) {
      raw = player.attackInteractionRegions;
      break;
    }
  }
  const positions = [];
  for (const direction of EFFECT_DIRECTIONS) {
    actor.quarterAim = direction;
    const r = groundAttackRegions(actor, alignEffectRegions(actor, raw, read, assets))[0];
    positions.push(`${(r.x + r.w / 2).toFixed(4)}:${(r.y + r.h / 2).toFixed(4)}`);
  }
  assert.equal(new Set(positions).size, 8);
  actor.quarterAim = { x: 0.97, z: 0.03 };
  assert.equal(effectDirection(actor).key, 'right');
});
test('transparent margins are trimmed and decoded-image pixels are only read once', () => {
  const previous = globalThis.document;
  let reads = 0;
  const data = new Uint8ClampedArray(4 * 4 * 4);
  for (let y = 1; y < 3; y++) for (let x = 1; x < 3; x++) data[(y * 4 + x) * 4 + 3] = 255;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        drawImage() {},
        getImageData() {
          reads++;
          return { data };
        },
      }),
    }),
  };
  try {
    const asset = { width: 4, height: 4 };
    assert.deepEqual(effectImageBounds(asset), { left: 0.25, top: 0.25, right: 0.75, bottom: 0.75 });
    effectImageBounds(asset);
    assert.equal(reads, 1);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

test('image-based aerial hitboxes preserve vertical knockback and ground aiming', () => {
  const actor = fixture('player_01'),
    target = fixture('swordman');
  actor.quarterAim = { x: 0, z: -1 };
  target.player.vx = 0;
  target.player.vy = 0;
  applyQuarterKnockback(
    actor,
    target,
    {
      quarterPlane: 'effect-height',
      quarterOrigin: { aim: actor.quarterAim },
      reaction: { knockback: 0, knockbackMode: 'set', knockbackExtraVx: 60, knockbackExtraVy: -80 },
    },
    world
  );
  assert.equal(target.player.vy, -80);
  assert.equal(target.quarterImpulse.x, 0);
  assert.equal(Math.abs(target.quarterImpulse.z), 1);
});

test('each of the eight effect placements is independent of the unchanged sprite facing', () => {
  const actor = fixture('player_01'),
    player = actor.player,
    read = createRuntimeEffectReader();
  const action = player.customActions.find((a) => player.actionSettings[a.key]?.group === 'attack');
  for (let i = 0; i <= 100; i++) {
    player.actionPreview = { action: action.key, t: i / 100 };
    if (player.attackInteractionRegions.length) break;
  }
  for (const aim of EFFECT_DIRECTIONS) {
    actor.quarterAim = aim;
    const positions = [];
    for (const facing of [-1, 1]) {
      player.facing = facing;
      positions.push(
        groundAttackRegions(actor, alignEffectRegions(actor, player.attackInteractionRegions, read, assets))[0].points
      );
    }
    positions[0].forEach((point, i) => {
      close(point.x, positions[1][i].x);
      close(point.y, positions[1][i].y);
    });
  }
});

test('manual per-direction position and size changes move the rendered image and actual hitbox together on ground and in air', () => {
  const actor = fixture('player_01'),
    player = actor.player,
    read = createRuntimeEffectReader();
  const action = player.customActions.find((a) => player.actionSettings[a.key]?.group === 'attack');
  for (let i = 0; i <= 100; i++) {
    player.actionPreview = { action: action.key, t: i / 100 };
    if (player.attackInteractionRegions.length) break;
  }
  actor.quarterEffectLayouts = {
    [action.key]: {
      directions: Object.fromEntries(
        EFFECT_DIRECTIONS.map((direction, index) => [
          direction.key,
          { distance: 20 + index * 5, side: -15 + index * 4, width: 1.6, height: 0.7 },
        ])
      ),
    },
  };
  for (const plane of ['ground', 'height'])
    for (const direction of EFFECT_DIRECTIONS) {
      actor.quarterAttackPlanes = { [action.key]: plane };
      actor.quarterAim = direction;
      const native = JSON.stringify(player.weaponAnchorTransform());
      const flat = groundAttackRegions(
        actor,
        alignEffectRegions(actor, player.attackInteractionRegions, read, assets)
      )[0];
      const { ctx, images } = recordingContext();
      drawQuarterAttackEffect(ctx, actor, assets, world, view, read);
      assert.equal(images.length, 1);
      flat.points.forEach((point, index) => {
        const expected = screenPoint(attackRegionPoint(actor, point, flat, world.floorY), world, view);
        close(images[0].points[index].x, expected.x);
        close(images[0].points[index].y, expected.y);
      });
      assert.equal(JSON.stringify(player.weaponAnchorTransform()), native);
    }
});
