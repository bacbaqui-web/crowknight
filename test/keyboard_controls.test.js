import test from 'node:test';
import assert from 'node:assert/strict';
import { bindKeyboardControls } from '../src/input_control_controller.js';

test('held keys release after focus changes, modifiers, blur and visibility changes without stealing form input', (t) => {
  const windowEvents = {},
    documentEvents = {};
  const oldListener = globalThis.addEventListener,
    oldDocument = globalThis.document;
  globalThis.addEventListener = (type, fn) => {
    windowEvents[type] = fn;
  };
  globalThis.document = {
    hidden: false,
    addEventListener(type, fn) {
      documentEvents[type] = fn;
    },
  };
  t.after(() => {
    if (oldListener === undefined) delete globalThis.addEventListener;
    else globalThis.addEventListener = oldListener;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  });
  const keys = new Set(),
    pressed = new Set();
  bindKeyboardControls({
    keys,
    pressed,
    handleShortcut: () => false,
    mapCode: (code) => (code === 'ArrowUp' ? 'QuarterUp' : code),
    gameKeys: new Set(['ArrowLeft', 'ArrowRight', 'QuarterUp', 'ShiftLeft', 'ShiftRight']),
  });
  function event(code, extra = {}) {
    return {
      code,
      target: { tagName: 'CANVAS' },
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {},
      ...extra,
    };
  }
  for (const extra of [
    { target: { tagName: 'SELECT' } },
    { target: { tagName: 'INPUT' } },
    { metaKey: true },
    { ctrlKey: true },
  ]) {
    windowEvents.keydown(event('ArrowRight'));
    assert.ok(keys.has('ArrowRight'));
    const up = event('ArrowRight', extra);
    windowEvents.keyup(up);
    assert.ok(!keys.has('ArrowRight'));
    assert.equal(up.prevented, false);
  }
  windowEvents.keydown(event('ArrowUp'));
  assert.ok(keys.has('QuarterUp'));
  windowEvents.keyup(event('ArrowUp', { target: { tagName: 'SELECT' } }));
  assert.ok(!keys.has('QuarterUp'));
  windowEvents.keydown(event('ArrowLeft'));
  windowEvents.keydown(event('MetaLeft', { metaKey: true }));
  assert.equal(keys.size, 0);
  assert.equal(pressed.size, 0);
  for (const release of [
    () => windowEvents.blur(),
    () => {
      document.hidden = true;
      documentEvents.visibilitychange();
    },
  ]) {
    windowEvents.keydown(event('ShiftRight', { shiftKey: true }));
    assert.ok(keys.has('ShiftLeft'));
    release();
    assert.equal(keys.size, 0);
  }
  const formDown = event('ArrowRight', { target: { tagName: 'SELECT' } });
  windowEvents.keydown(formDown);
  assert.equal(keys.size, 0);
  assert.equal(formDown.prevented, false);
});
