import { clamp } from './utils.js';

export function formatInputNumber(value, step) {
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return decimals > 0 ? Number(value).toFixed(decimals) : String(Math.round(Number(value)));
}

export function stepNumberByOne(current, direction) {
  if (!Number.isFinite(current)) return direction;
  if (direction > 0) return Number.isInteger(current) ? current + 1 : Math.ceil(current);
  return Number.isInteger(current) ? current - 1 : Math.floor(current);
}

export function stepNumberByTen(current, direction) {
  if (!Number.isFinite(current)) return direction * 10;
  const floorTen = Math.floor(current / 10) * 10;
  const ceilTen = Math.ceil(current / 10) * 10;
  if (direction > 0) return current === ceilTen ? current + 10 : ceilTen;
  return current === floorTen ? current - 10 : floorTen;
}

export function clampPlaybackRateInput(value, peer) {
  const next = clamp(Number(value), 0.1, 4);
  if (!Number.isFinite(next)) return null;
  peer.value = formatInputNumber(next, 0.05);
  return next;
}

export function stepTimelineDurationValue(current, delta, snapToTen, min, max) {
  const direction = Math.sign(delta) || 1;
  const nextValue = snapToTen ? stepNumberByTen(current, direction) : stepNumberByOne(current, direction);
  return clamp(nextValue, min, max);
}

function stepNumberInput(event, input, direction) {
  event.preventDefault();
  event.stopPropagation();
  const current = Number(input.value || 0);
  const min = Number(input.min || -Infinity);
  const max = Number(input.max || Infinity);
  const next = event.shiftKey ? stepNumberByTen(current, direction) : stepNumberByOne(current, direction);
  input.value = formatInputNumber(clamp(next, min, max), 1);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function enhanceNumberInputs(root) {
  root.querySelectorAll('input[type="number"]').forEach((input) => {
    if (input.closest('.pose-frame-input') || input.closest('.number-stepper-control')) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'number-stepper-control';
    const buttons = document.createElement('span');
    buttons.className = 'number-stepper-buttons';
    const up = document.createElement('button');
    const down = document.createElement('button');
    up.type = 'button';
    down.type = 'button';
    up.setAttribute('aria-label', '값 올리기');
    down.setAttribute('aria-label', '값 내리기');
    up.textContent = '▲';
    down.textContent = '▼';
    buttons.append(up, down);
    input.replaceWith(wrapper);
    wrapper.append(input, buttons);
    up.addEventListener('click', (event) => stepNumberInput(event, input, 1));
    down.addEventListener('click', (event) => stepNumberInput(event, input, -1));
  });
}

export function bindNumberDragInput(number, peer, updateValue, hooks = {}) {
  let drag = null;
  const beginDragChange = hooks.beginChange || (() => {});
  const commitDragChange = hooks.commitChange || (() => {});

  number.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startValue: Number(number.value || 0),
      moved: false,
      hasSnapshot: false,
    };
    number.setPointerCapture(event.pointerId);
  });

  number.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = drag.startY - event.clientY;
    if (!drag.moved && Math.abs(distance) < 4) return;
    event.preventDefault();
    if (!drag.hasSnapshot) {
      beginDragChange();
      drag.hasSnapshot = true;
      number.blur();
    }
    drag.moved = true;
    const step = Number(number.step || peer.step || 1) || 1;
    const next = clamp(
      Number(drag.startValue) + distance * step,
      Number(number.min || -Infinity),
      Number(number.max || Infinity)
    );
    const formatted = formatInputNumber(next, step);
    number.value = formatted;
    updateValue(formatted, peer);
  });

  const finish = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldCommit = drag.hasSnapshot;
    drag = null;
    if (shouldCommit) commitDragChange();
  };

  number.addEventListener('pointerup', finish);
  number.addEventListener('pointercancel', finish);
}
