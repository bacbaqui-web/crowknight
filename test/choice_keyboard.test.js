import test from 'node:test';
import assert from 'node:assert/strict';
import { bindChoiceNumberKeys } from '../src/input_control_controller.js';

function setup() {
  const modal = { hidden: false };
  const selected = [];
  const buttons = Array.from({ length: 4 }, (_, i) => ({ click: () => selected.push(i + 1) }));
  let listener;
  bindChoiceNumberKeys({ modal, cards: { querySelectorAll: () => buttons }, target: {
    addEventListener(type, callback, capture) {
      assert.equal(type, 'keydown');
      assert.equal(capture, true);
      listener = callback;
    },
  } });
  const send = (overrides) => {
    const event = { code: 'Digit1', key: '1', target: { tagName: 'CANVAS' },
      preventDefault() { this.prevented = true; },
      stopImmediatePropagation() { this.stopped = true; }, ...overrides };
    listener(event);
    return event;
  };
  return { modal, selected, send, buttons };
}

test('선택창 밖 포커스에서도 위쪽 숫자/숫자패드의 물리 키로 선택한다', () => {
  const { send, selected } = setup();
  for (const code of ['Digit1', 'Digit2', 'Numpad3', 'Numpad4']) {
    const event = send({ code, key: 'End' });
    assert.equal(event.prevented, true);
    assert.equal(event.stopped, true);
  }
  assert.deepEqual(selected, [1, 2, 3, 4]);
});

test('키 유지 반복/숨긴 창/수정키는 선택하지 않고 없는 카드도 안전하게 처리한다', () => {
  const { send, selected, modal, buttons } = setup();
  send({ repeat: true });
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'isComposing']) send({ [modifier]: true });
  modal.hidden = true;
  assert.equal(send({}).prevented, undefined);
  modal.hidden = false;
  buttons.length = 1;
  send({ code: 'Digit4', key: '4' });
  assert.deepEqual(selected, []);
  send({});
  assert.deepEqual(selected, [1]);
});
