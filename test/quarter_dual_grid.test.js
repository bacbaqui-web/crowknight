import test from 'node:test';
import assert from 'node:assert/strict';
import { dualMask, dualCoverage, dualCellAt, DUAL_LAYERS, dualWater } from '../src/quarter_view/dual_grid.js';
import { createEnvironment } from '../src/quarter_view/environment.js';
test('all sixteen corner combinations select the corresponding tile and preserve corner membership', () => {
  for (let mask = 0; mask < 16; mask++) {
    const field = (x, z) => (mask & (1 << ((z / 80) * 2 + x / 80)) ? 'earth' : 'grass');
    assert.equal(dualMask(0, 0, ['earth'], field), mask);
    for (let z = 0; z < 2; z++)
      for (let x = 0; x < 2; x++) assert.equal(dualCoverage(mask, x, z), mask & (1 << (z * 2 + x)) ? 1 : 0);
  }
});
test('every compatible edge joins exactly even with different interior variants', () => {
  for (let a = 0; a < 16; a++)
    for (let b = 0; b < 16; b++)
      for (let n = 0; n <= 40; n++) {
        const t = n / 40;
        if (((a >> 1) & 1) === (b & 1) && ((a >> 3) & 1) === ((b >> 2) & 1))
          assert.ok(Math.abs(dualCoverage(a, 1, t, 0) - dualCoverage(b, 0, t, 3.4)) < 1e-10);
        if (((a >> 2) & 3) === (b & 3))
          assert.ok(Math.abs(dualCoverage(a, t, 1, 0) - dualCoverage(b, t, 0, 5.1)) < 1e-10);
      }
});
test('map seam and negative coordinates use identical logical corner tiles', () => {
  for (let z = -3200; z < 3200; z += 71)
    for (let x = -3200; x < 3200; x += 113) {
      assert.deepEqual(dualCellAt(x, z).masks, dualCellAt(x + 3200, z - 3200).masks);
    }
  assert.equal(DUAL_LAYERS.length * 16, 80);
});
test('scenery follows rendered water boundary rather than the old ellipse', () => {
  const objects = createEnvironment().nearby(1210, -470, 1000, 1000, true);
  assert.ok(objects.every((o) => !dualWater(o.x, o.z)));
});
