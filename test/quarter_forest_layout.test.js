import test from 'node:test';
import assert from 'node:assert/strict';
import { FOREST_PERIOD, forestGround } from '../src/quarter_view/forest_layout.js';
import { createEnvironment } from '../src/quarter_view/environment.js';

test('winding roads connect to clearings and remain seamless across repeat boundaries', () => {
  const k = (Math.PI * 2) / FOREST_PERIOD;
  for (let x = -6400; x < 6400; x += 30) {
    const z = 150 * Math.sin((x - 480) * k) + 65 * Math.sin((x - 480) * k * 2);
    assert.ok(forestGround(x, z).edge < 0);
  }
  for (let z = -6400; z < 6400; z += 30) assert.ok(forestGround(480 + 180 * Math.sin(z * k), z).edge < 0);
  for (const [x, z] of [
    [480, 0],
    [-123, 456],
    [2300, -800],
  ]) {
    const a = forestGround(x, z),
      b = forestGround(x + FOREST_PERIOD, z - FOREST_PERIOD);
    assert.ok(Math.abs(a.edge - b.edge) < 1e-8);
  }
});
test('procedural forest clusters leave road and clearing margins open', () => {
  const env = createEnvironment();
  let count = 0;
  for (const o of env.nearby(3000, 3000, 2500, 2500)) {
    if (o.id.startsWith('start')) continue;
    assert.ok(forestGround(o.x, o.z).edge >= 130, o.id);
    count++;
  }
  assert.ok(count > 30);
  assert.ok(env.cacheSize <= 100);
});
