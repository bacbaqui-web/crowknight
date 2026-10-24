import test from 'node:test';
import assert from 'node:assert/strict';
import { withRuntimeReadCache, runtimeRead } from '../src/runtime_read_cache.js';
import { evaluateActionOffset } from '../src/action_offset_evaluator.js';
import { actionFormula } from '../src/formula_runtime_engine.js';

test('frame reads share pure work only in the same synchronous scope', () => {
  const owner = {};
  let calls = 0;
  const read = () => runtimeRead(owner, 'value', () => ++calls);
  assert.equal(read(), 1);
  assert.equal(read(), 2);
  withRuntimeReadCache(() => {
    assert.equal(read(), 3);
    assert.equal(read(), 3);
    withRuntimeReadCache(() => assert.equal(read(), 4));
    assert.equal(read(), 3);
  });
  assert.equal(read(), 5);
  assert.throws(
    () =>
      withRuntimeReadCache(() => {
        read();
        throw new Error('draw failed');
      }),
    /draw failed/
  );
  assert.equal(read(), 7);
});
test('cached offsets keep progression and mirroring distinct and return independent results', () => {
  const source = { start: { x: 0, y: 0 }, end: { x: 100, y: 40 } };
  withRuntimeReadCache(() => {
    const first = evaluateActionOffset(source, 0.5);
    first.x = 999;
    assert.equal(evaluateActionOffset(source, 0.5).x, 50);
    assert.equal(evaluateActionOffset(source, 0.75).x, 75);
    assert.equal(evaluateActionOffset(source, 0.5, { mirror: false }, -1).x, -50);
    assert.equal(evaluateActionOffset(source, 0.5, { mirror: true }, -1).x, 50);
  });
  source.end.x = 200;
  assert.equal(withRuntimeReadCache(() => evaluateActionOffset(source, 0.5)).x, 100);
});
test('formula normalization is shared within the frame and editor changes are visible in the next frame', () => {
  let reads = 0;
  const formulas = [{ type: 'velocity', enabled: true, x: 10, y: 0 }];
  const settings = {
    get formulas() {
      reads++;
      return formulas;
    },
  };
  withRuntimeReadCache(() => {
    assert.equal(actionFormula(settings, 'velocity').x, 10);
    assert.equal(actionFormula(settings, 'cancel'), null);
  });
  assert.equal(reads, 1);
  formulas[0].x = 20;
  assert.equal(withRuntimeReadCache(() => actionFormula(settings, 'velocity')).x, 20);
  assert.equal(reads, 2);
});
