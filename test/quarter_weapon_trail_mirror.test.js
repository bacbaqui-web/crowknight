import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { createSlashTrails } from '../src/quarter_view/slash_trail.js';
import { alignEnemyWeaponRegions } from '../src/quarter_view/weapon_contact.js';
import { applyGroundKnockback } from '../src/quarter_view/knockback.js';
import { normalizeDirection } from '../src/quarter_view/camera.js';
import { screenPoint, groundAttackRegions, attackPoint } from '../src/quarter_view/attack_geometry.js';

const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
const world = { floorY: 430 },
  view = { width: 1280, height: 720, x: 480, depth: 0, zoom: 1.4 };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);
function playerFor(id) {
  const def = saved.characters.find((a) => a.id === id),
    player = new PuppetPlayer(480, 430, {});
  player.applyTuning(mergeTuning(defaultTuningFor(def), saved.actors[id].tuning));
  return player;
}
for (const id of ['player_01', 'enemy_01', 'swordman'])
  test(`${id}: all active weapon poses produce horizontally mirrored trails and hitboxes without reversing ground depth`, () => {
    const player = playerFor(id),
      trails = createSlashTrails({}, world);
    let checked = 0;
    for (const action of player.customActions.filter((a) => player.actionSettings[a.key]?.group === 'attack')) {
      for (let frame = 0; frame <= 100; frame++) {
        player.actionPreview = { action: action.key, t: frame / 100 };
        player.animTime = frame / 120;
        const results = [];
        for (const facing of [1, -1]) {
          player.facing = facing;
          const actor = { id, player, quarterAim: { x: facing, z: 0 }, quarterDepth: 60, quarterFloorY: 430 };
          const raw = alignEnemyWeaponRegions(actor, player.attackInteractionRegions);
          if (!raw.length) break;
          trails.capture(actor, raw);
          results.push({ sample: trails.samples(actor)[0], flat: groundAttackRegions(actor, raw)[0] });
        }
        if (results.length !== 2) continue;
        for (const key of ['root', 'tip']) {
          const right = results[0].sample[key],
            left = results[1].sample[key];
          close(right.x + left.x, 960);
          close(right.depth, left.depth);
          close(right.y, left.y);
          const a = screenPoint(right, world, view),
            b = screenPoint(left, world, view);
          close(a.x + b.x, 1280);
          close(a.y, b.y);
        }
        for (let i = 0; i < results[0].flat.points.length; i++) {
          close(results[0].flat.points[i].x + results[1].flat.points[i].x, 960);
          close(results[0].flat.points[i].y, results[1].flat.points[i].y);
        }
        checked++;
      }
    }
    assert.ok(checked > 10);
  });

test('hero glow follows the weapon even when the authored damage box has a deliberately displaced offset', () => {
  const player = playerFor('player_01');
  player.actionPreview = { action: 'customAction4', t: 0.05 };
  const actor = { id: 'player_01', player, quarterAim: { x: 1, z: 0 }, quarterDepth: 0, quarterFloorY: 430 };
  const trails = createSlashTrails({}, world),
    raw = player.attackInteractionRegions;
  assert.ok(raw.length);
  trails.capture(actor, raw);
  const before = { ...trails.samples(actor)[0].tip };
  player.animTime += 1 / 60;
  const displaced = raw.map((r) => ({
    ...r,
    x: r.x + 1000,
    points: r.points.map((p) => ({ x: p.x + 1000, y: p.y + 500 })),
  }));
  trails.capture(actor, displaced);
  assert.deepEqual(trails.samples(actor)[1].tip, before);
  player.rig.weapon.rot += 30;
  player.animTime += 1 / 60;
  trails.capture(actor, raw);
  assert.notDeepEqual(trails.samples(actor)[2].tip, before);
});

test('horizontal, diagonal and depth aims mirror the weapon path only along screen x', () => {
  for (const [x, z] of [
    [1, 0],
    [1, 1],
    [1, -1],
    [0, 1],
    [0, -1],
  ]) {
    const points = [];
    for (const facing of [1, -1]) {
      const actor = {
        quarterAim: normalizeDirection(x * facing, z),
        quarterDepth: 10,
        quarterFloorY: 430,
        player: { x: 480, y: 430, facing },
      };
      points.push(attackPoint(actor, { x: 480 + 80 * facing, y: 350 }));
    }
    close(points[0].x + points[1].x, 960);
    close(points[0].depth, points[1].depth);
  }
});

test('ground reaction lateral offsets use the same mirrored weapon basis', () => {
  const results = [];
  for (const facing of [1, -1]) {
    const attacker = { quarterAim: { x: facing, z: 0 }, player: { facing } },
      target = { quarterAim: { x: 1, z: 0 }, player: { facing: 1, vx: 0 } };
    applyGroundKnockback(attacker, target, {
      reaction: { knockbackMode: 'set', knockback: 40, knockbackExtraVx: 3, knockbackExtraVy: -5 },
    });
    results.push({ x: target.quarterImpulse.x * target.player.vx, z: target.quarterImpulse.z * target.player.vx });
  }
  close(results[0].x, -results[1].x);
  close(results[0].z, results[1].z);
});
