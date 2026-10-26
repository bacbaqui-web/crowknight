import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironment } from '../src/quarter_view/environment.js';
import { GROUND_TRANSITIONS, GROUND_PATTERNS } from '../src/quarter_view/ground_patterns.js';

test('forest mixes all tree silhouettes and adds nonblocking verge cover', () => {
  const env = createEnvironment();
  const solid = env.nearby(2500, 2500, 3000, 3000);
  const all = env.nearby(2500, 2500, 3000, 3000, true);
  assert.equal(new Set(solid.filter((o) => o.type === 'tree').map((o) => o.variant % 9)).size, 9);
  assert.ok(all.filter((o) => o.decorative).length > 50);
  assert.ok(solid.every((o) => !o.decorative));
  for (const o of solid.filter((o) => o.type === 'tree' && !o.id.startsWith('start'))) {
    const cell = o.id.split(':').slice(0, 2).join(':');
    const peers = solid.filter((p) => p.type === 'tree' && p.id.startsWith(cell + ':'));
    assert.equal(new Set(peers.map((p) => p.variant)).size, peers.length);
  }
});
test('terrain catalog separates eight materials and sixteen boundary patterns', () => {
  assert.equal(GROUND_PATTERNS.length, 8);
  assert.equal(GROUND_TRANSITIONS.length, 16);
  assert.equal(new Set(GROUND_PATTERNS.map((p) => p.id)).size, 8);
});
