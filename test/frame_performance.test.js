import test from 'node:test';
import assert from 'node:assert/strict';
import { createFramePerformance } from '../src/frame_performance_helper.js';
import { createPerformanceView } from '../src/quarter_view/performance_view.js';

for (const fps of [30, 60, 120])
  test(`${fps} FPS uses raw frame intervals rather than clamped simulation dt`, () => {
    const stats = createFramePerformance();
    for (let i = 0; i <= fps; i++) stats.record((i * 1000) / fps, 2, true);
    const result = stats.snapshot();
    assert.ok(Math.abs(result.fps - fps) < 1e-8);
    assert.ok(Math.abs(result.frameMs - 1000 / fps) < 1e-8);
    assert.equal(result.workMs, 2);
  });
test('real stalls lower FPS and stationary pause does not count as scene renders', () => {
  const stats = createFramePerformance();
  stats.record(0, 0, true);
  stats.record(200, 3, true);
  assert.equal(stats.snapshot().fps, 5);
  stats.reset();
  stats.record(0, 0, false);
  for (let i = 1; i <= 60; i++) stats.record((i * 1000) / 60, 0.1, false);
  assert.equal(stats.snapshot().fps, 0);
  assert.equal(stats.snapshot().rendered, 0);
});
test('reset discards inactive gaps and long-running measurement storage is bounded', () => {
  const stats = createFramePerformance();
  for (let i = 0; i < 10000; i++) stats.record(i, 1, true);
  assert.ok(stats.snapshot().samples <= 1024);
  stats.reset();
  assert.equal(stats.snapshot(), null);
  stats.record(99999, 2, true);
  stats.record(100015, 2, true);
  assert.equal(stats.snapshot().fps, 62.5);
});
test('FPS button is idle while off, throttles updates, persists preference and labels pause', () => {
  let click,
    clocks = 0,
    paused = false,
    writes = 0;
  const elements = Object.fromEntries(['value', 'timing', 'cache'].map((k) => [k, { textContent: '' }]));
  const button = {
      addEventListener(_type, fn) {
        click = fn;
      },
      setAttribute() {},
    },
    panel = {
      hidden: true,
      querySelector(selector) {
        return elements[selector.match(/fps-(\w+)/)[1]];
      },
    },
    root = { classList: { toggle() {} } };
  const counters = { groundHits: 0, groundBuilds: 0 };
  let stored = '0';
  const meter = createPerformanceView({
    button,
    panel,
    root,
    getCounters: () => counters,
    isPaused: () => paused,
    clock: () => {
      clocks++;
      return clocks;
    },
    storage: {
      getItem: () => stored,
      setItem(_key, value) {
        stored = value;
        writes++;
      },
    },
  });
  assert.equal(meter.start(), null);
  meter.finish(16, null, true);
  assert.equal(clocks, 0);
  click();
  assert.equal(panel.hidden, false);
  assert.equal(stored, '1');
  for (let i = 0; i < 20; i++) {
    const start = meter.start();
    counters.groundHits++;
    meter.finish((i * 1000) / 60, start, true);
  }
  assert.match(elements.value.textContent, /60\.0 FPS/);
  assert.match(elements.cache.textContent, /재사용/);
  const before = elements.value.textContent;
  meter.finish(320, meter.start(), true);
  assert.equal(elements.value.textContent, before);
  paused = true;
  meter.reset();
  meter.finish(1000, meter.start(), false);
  meter.finish(1016, meter.start(), false);
  assert.equal(elements.value.textContent, '일시정지');
  click();
  assert.equal(panel.hidden, true);
  assert.equal(stored, '0');
  assert.equal(writes, 2);
});
