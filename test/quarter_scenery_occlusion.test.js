import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneryOpacity } from '../src/quarter_view/scenery_renderer.js';
const rock = { id: 'r', type: 'boulder', x: 0, z: 0, d: 120, variant: 0 };
const hero = (x, z, y = 430) => ({ quarterDepth: z, player: { x, y } });
test('all boulder silhouettes fade behind and restore in front or beside', () => {
  for (let variant = 0; variant < 4; variant++) {
    const o = { ...rock, variant };
    assert.equal(sceneryOpacity(o, hero(0, -100), 430), 0.48);
    assert.equal(sceneryOpacity(o, hero(0, 160), 430), 1);
    assert.equal(sceneryOpacity(o, hero(400, -100), 430), 1);
    assert.equal(sceneryOpacity(o, hero(0, -1000), 430), 1);
  }
});
test('standing on a boulder and jumping clear above its silhouette do not fade it', () => {
  const a = hero(0, 0, 310);
  a.quarterPlatform = rock;
  assert.equal(sceneryOpacity(rock, a, 430), 1);
  assert.equal(sceneryOpacity(rock, hero(0, -100, 100), 430), 1);
});
test('trees share occlusion rules but flat stairs remain opaque', () => {
  assert.equal(sceneryOpacity({ ...rock, type: 'tree' }, hero(0, -300), 430), 0.48);
  assert.equal(sceneryOpacity({ ...rock, type: 'hut', groundDecoration: true }, hero(0, -100), 430), 1);
});
