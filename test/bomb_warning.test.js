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

import { createProjectileSoundEvents } from '../src/projectile_sound_events.js';
import { bombWarningAlpha as alphaAt } from '../src/bomb_warning_timing.js';
test('beeps follow red pulses only in the final fuse window, speed up, and stop on blast', () => {
  const times = [];
  const p = { active: true, powderBomb: true, bossHazard: 'barrel', fuse: 5, age: 0, phase: 'flight' };
  const events = createProjectileSoundEvents((name) => {
    if (name !== 'bombWarning') return;
    assert.ok(alphaAt(p.age, p.fuse - p.age));
    assert.ok(p.fuse - p.age <= 1.25);
    times.push(p.age);
  });
  for (let i = 0; i < 500; i++) {
    p.age = i / 100;
    events.update([p]);
    events.update([p]);
  }
  assert.ok(times.length >= 6);
  assert.ok(times[1] - times[0] > times.at(-1) - times.at(-2));
  const count = times.length;
  p.phase = 'blast';
  events.update([p]);
  assert.equal(times.length, count);
  p.phase = 'flight';
  p.bossHazard = 'mine';
  p.fuse = Infinity;
  for (let i = 0; i < 100; i++) {
    p.age += 0.01;
    events.update([p]);
  }
  assert.equal(times.length, count);
});

test('ordinary and balloon bombs use frame-based flight clocks for the same warning window', () => {
  const calls = [];
  const p = { active: true, powderBomb: true, phase: 'flight', elapsedFrames: 0, flightFrames: 10, phaseTime: 0 };
  const events = createProjectileSoundEvents((name) => {
    if (name === 'bombWarning') calls.push(p.elapsedFrames);
  });
  for (let frame = 0; frame < 10; frame += 0.1) {
    p.elapsedFrames = frame;
    events.update([p]);
  }
  assert.equal(calls.length, 0);
  p.phase = 'fuse';
  for (let frame = 10; frame < 22.5; frame += 0.1) {
    p.elapsedFrames = frame;
    events.update([p]);
  }
  assert.ok(calls.length >= 6);
});
