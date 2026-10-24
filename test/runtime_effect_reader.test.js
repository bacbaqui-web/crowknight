import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { createRuntimeEffectReader } from '../src/runtime_effect_reader.js';
import { effectFrameAt } from '../src/project_effect_normalizer_helper.js';

test('runtime effect compilation preserves every published effect sample without rewriting authored data', () => {
  const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
  const read = createRuntimeEffectReader();
  let checked = 0;
  for (const actor of Object.values(saved.actors)) {
    const tuning = actor.tuning,
      original = JSON.stringify(tuning),
      legacy = globalThis.structuredClone(tuning);
    for (const key of Object.keys(tuning.effectOffsets))
      for (const t of [0, 0.07, 0.25, 0.5, 0.73, 0.99, 1]) {
        assert.deepEqual(read(tuning, key, t), effectFrameAt(legacy, key, t), `${key}@${t}`);
        checked++;
      }
    assert.equal(JSON.stringify(tuning), original);
  }
  assert.ok(checked > 100);
});
test('static effect frame fields are normalized once and replacements or a new run invalidate them', () => {
  let reads = 0;
  const source = {
      image: 'none',
      start: {
        get x() {
          reads++;
          return 10;
        },
      },
      end: { x: 30 },
    },
    tuning = { effectOffsets: { slash: source } };
  const read = createRuntimeEffectReader();
  read(tuning, 'slash', 0);
  const initial = reads;
  assert.equal(read(tuning, 'slash', 0.5).x, 20);
  assert.equal(reads, initial);
  source.keyframes = [{ id: 'mid', t: 0.5, x: 50 }];
  assert.equal(read(tuning, 'slash', 0.5).x, 50);
  assert.ok(reads > initial);
  source.end.x = 80;
  read.reset();
  assert.equal(read(tuning, 'slash', 1).x, 80);
});
