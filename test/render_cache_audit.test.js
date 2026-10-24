import test from 'node:test';
import assert from 'node:assert/strict';
import { createHealthTickCache } from '../src/health_meter_path_cache.js';
import {
  recordPuppetImageRegion,
  recordPuppetEditHandle,
  recordPuppetJointRegion,
  recordPuppetRectPart,
} from '../src/puppet_player_edit_region_helper.js';

test('HP tick paths are shared by dimensions, rebuilt on health/width change and bounded', () => {
  let builds = 0;
  const cache = createHealthTickCache(() => {
    builds++;
    return { moveTo() {}, lineTo() {} };
  }, 2);
  const first = cache(100, 120);
  assert.equal(cache(100, 120), first);
  assert.equal(builds, 1);
  cache(200, 120);
  cache(200, 140);
  assert.equal(builds, 3);
  cache(100, 120);
  assert.equal(builds, 4);
});
test('unavailable Path2D keeps the direct-drawing fallback available', () =>
  assert.equal(createHealthTickCache(() => null)(100, 100), null));
test('gameplay skips editor pick geometry without requesting canvas matrix readbacks', () => {
  const player = { captureEditRegions: false, hitRegions: [], editHandles: {} },
    ctx = {
      getTransform() {
        throw new Error('unnecessary matrix read');
      },
    };
  assert.equal(recordPuppetImageRegion(player, ctx, 'weapon', 0, 0, 10, 10), null);
  assert.equal(recordPuppetEditHandle(player, ctx, 'weapon'), null);
  assert.equal(recordPuppetJointRegion(player, ctx, 'hip', 0, 0), null);
  assert.equal(recordPuppetRectPart(player, ctx, 'part', 0, 0, 10, 10), null);
  assert.deepEqual(player.hitRegions, []);
  assert.deepEqual(player.editHandles, {});
});

test('editor picking data still records by default', () => {
  const player = { hitRegions: [], editHandles: {} },
    matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    ctx = { getTransform: () => matrix };
  const region = recordPuppetImageRegion(player, ctx, 'weapon', 10, 20, 30, 40);
  assert.deepEqual(region.bounds, { x: 10, y: 20, w: 30, h: 40 });
  assert.ok(recordPuppetEditHandle(player, ctx, 'weapon'));
  assert.equal(player.hitRegions.length, 1);
  assert.ok(player.editHandles.weapon);
});
