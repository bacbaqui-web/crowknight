import test from 'node:test';
import assert from 'node:assert/strict';
import { materialSample } from '../src/quarter_view/ground_patterns.js';

test('terrain crops have no mirrored seam or short repeat and wrap at the world period', () => {
  const pixels = new Uint8Array(256 * 256 * 4);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      pixels[i] = x;
      pixels[i + 1] = y;
      pixels[i + 2] = (x + y) % 256;
    }
  const sample = (x, z) => materialSample(pixels, x, z);
  assert.notDeepEqual(sample(390, 71), sample(410, 71));
  assert.notDeepEqual(sample(40, 71), sample(840, 71));
  assert.ok(sample(-40, 71).every((c, i) => Math.abs(c - sample(3160, 71)[i]) < 1e-9));
  const left = sample(200 - 0.00001, 71),
    right = sample(200 + 0.00001, 71);
  assert.ok(left.every((c, i) => Math.abs(c - right[i]) < 1.1));
});
