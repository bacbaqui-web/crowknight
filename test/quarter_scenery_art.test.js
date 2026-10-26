import test from 'node:test';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import {
  fitSceneryBounds,
  sceneryVariant,
  SCENERY_FRAME,
  SCENERY_VARIANT_COUNTS,
} from '../src/quarter_view/scenery_art.js';

test('wide branches and slender trunks keep their original proportions within sprite bounds', () => {
  for (const bounds of [
    { width: 384, height: 576 },
    { width: 600, height: 400 },
    { width: 1400, height: 440 },
  ]) {
    const result = fitSceneryBounds(bounds, 300, 330);
    assert.ok(Math.abs(result.width / result.height - bounds.width / bounds.height) < 1e-12);
    assert.ok(result.width <= 300 && result.height <= 330);
    assert.ok(result.width / 2 < SCENERY_FRAME.anchorX);
    assert.ok(result.height < SCENERY_FRAME.anchorY);
  }
});
test('each scenery type reaches every distinct image with bounded cache keys', () => {
  for (const type of ['tree', 'rock', 'hut', 'bush']) {
    const count = SCENERY_VARIANT_COUNTS[type];
    const keys = Array.from({ length: 256 }, (_, n) => sceneryVariant(type, n));
    assert.equal(new Set(keys).size, count);
    assert.ok(keys.every((n) => n >= 0 && n < count));
  }
});

test('catalog contains twenty independently named assets across all scenery groups', async () => {
  const { FOREST_ASSET_CATALOG: catalog } = await import('../src/quarter_view/scenery_catalog.js');
  const { existsSync } = await import('node:fs');
  assert.equal(catalog.length, 20);
  assert.equal(new Set(catalog.map((entry) => entry.file)).size, 20);
  for (const entry of catalog)
    assert.ok(existsSync(new URL('../assets/quarter-forest/' + entry.file, import.meta.url)), entry.file);
});
