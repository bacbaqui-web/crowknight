import test from 'node:test';
import assert from 'node:assert/strict';
import { fitSceneryBounds, sceneryVariant, SCENERY_FRAME } from '../src/quarter_view/scenery_art.js';

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
test('each scenery type uses a bounded cache key for its actual image variants', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((n) => sceneryVariant('tree', n)),
    [0, 1, 2, 0, 1]
  );
  for (const type of ['rock', 'hut'])
    assert.deepEqual(
      [0, 1, 2, 3].map((n) => sceneryVariant(type, n)),
      [0, 1, 0, 1]
    );
});
