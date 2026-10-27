import test from 'node:test';
import assert from 'node:assert/strict';
import { forestTerrain, forestWater, FOREST_PERIOD } from '../src/quarter_view/forest_layout.js';
import { dualWater } from '../src/quarter_view/dual_grid.js';
import { materialColor } from '../src/quarter_view/ground_patterns.js';
import { createEnvironment } from '../src/quarter_view/environment.js';
test('plaza, road, bare earth, meadow and pond are distinct continuous regions', () => {
  for (const [x, z, id] of [
    [220, 240, 'tile'],
    [660, 800, 'road'],
    [2350, 1750, 'earth'],
    [2000, 900, 'grass'],
    [1210, -470, 'water'],
  ]) {
    const t = forestTerrain(x, z);
    assert.equal(t.mix === 1 ? t.b : t.a, id, `${x},${z}`);
    assert.deepEqual(t, forestTerrain(x + FOREST_PERIOD, z - FOREST_PERIOD));
  }
  assert.ok(forestWater(1210, -470));
  assert.ok(!forestWater(480, 0));
});
test('pond has water, mud, sand and grass banks and no scenery inside', () => {
  const kinds = new Set();
  for (let x = 1210; x < 1900; x += 5) {
    const t = forestTerrain(x, -470);
    kinds.add(t.a);
    kinds.add(t.b);
  }
  for (const type of ['water', 'mud', 'sand', 'grass']) assert.ok(kinds.has(type));
  const env = createEnvironment();
  assert.ok(env.nearby(1210, -470, 1000, 1000, true).every((o) => !dualWater(o.x, o.z)));
});
test('fallback palette preserves readable green grass, brown earth and blue water', () => {
  const grass = materialColor('grass', 0, 0),
    earth = materialColor('earth', 0, 0),
    water = materialColor('water', 0, 0);
  assert.ok(grass[1] > grass[0] + 25);
  assert.ok(earth[0] > earth[1] + 30);
  assert.ok(water[2] > water[0] + 70);
});
