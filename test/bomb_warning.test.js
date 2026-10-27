import test from 'node:test';
import assert from 'node:assert/strict';
import { bombWarningAlpha, drawBombFlash } from '../src/bomb_warning_renderer.js';

test('timed bombs accelerate red flashes near detonation; contact mines keep a steady warning', () => {
  const switches = (from, to, fuse) => {
    let previous = 0,
      count = 0;
    for (let t = from; t < to; t += 0.001) {
      const alpha = bombWarningAlpha(t, fuse - t);
      assert.ok(alpha === 0 || alpha === 0.68);
      if (alpha !== previous) count++;
      previous = alpha;
    }
    return count;
  };
  for (const fuse of [1.8, 2.4, 3, 5]) assert.ok(switches(fuse - 0.5, fuse, fuse) > switches(0, 0.5, fuse));
  assert.ok(switches(0, 1, Infinity) >= 3);
  assert.ok(Number.isFinite(bombWarningAlpha(100000, Infinity)));
});

test('transparent red bomb sprite is built once and reused; off phase does no drawing', () => {
  let canvases = 0,
    draws = 0;
  const oldDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      canvases++;
      return { getContext: () => ({ drawImage() {}, fillRect() {} }) };
    },
  };
  try {
    const ctx = {
      globalAlpha: 1,
      save() {},
      restore() {},
      drawImage() {
        draws++;
      },
    };
    const asset = { width: 64, height: 64 };
    drawBombFlash(ctx, asset, 0, 0, 30, 30, 0);
    assert.equal(canvases, 0);
    for (let i = 0; i < 100; i++) drawBombFlash(ctx, asset, 0, 0, 30, 30, 0.68);
    assert.equal(canvases, 1);
    assert.equal(draws, 100);
  } finally {
    globalThis.document = oldDocument;
  }
});
