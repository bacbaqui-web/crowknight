import { clamp } from './utils.js';

const IN_PROGRESS_NUMERIC_TEXT = new Set(['', '-', '.', '-.', '+', '+.']);
const NUMERIC_INPUT_LOCK_ATTR = 'numericInputLocked';
const NUMERIC_SLIDER_DRAG_ATTR = 'numericSliderDragging';

export function bindNumericInputUx({ number, range }) {
  if (!number || !range) return null;
  const row = number.closest?.('.setting-row') ?? null;

  const setInputLock = (locked) => {
    setDatasetFlag(number, NUMERIC_INPUT_LOCK_ATTR, locked);
    setDatasetFlag(row, NUMERIC_INPUT_LOCK_ATTR, locked);
  };

  const releaseSliderDrag = () => {
    setDatasetFlag(range, NUMERIC_SLIDER_DRAG_ATTR, false);
  };

  const markSliderDrag = () => {
    setDatasetFlag(range, NUMERIC_SLIDER_DRAG_ATTR, true);
  };

  const focusInput = () => {
    setInputLock(true);
    selectNumericInputValue(number);
  };

  const blurInput = () => {
    setInputLock(false);
    releaseSliderDrag();
  };

  const prepareInputEdit = () => {
    setInputLock(true);
  };

  const startSliderDrag = (event) => {
    if (isNumericInputLocked(number)) {
      event.preventDefault();
      event.stopPropagation();
      releaseSliderDrag();
      return;
    }
    markSliderDrag();
  };

  number.addEventListener('pointerdown', prepareInputEdit, { capture: true });
  number.addEventListener('mousedown', prepareInputEdit, { capture: true });
  number.addEventListener('focus', focusInput);
  number.addEventListener('blur', blurInput);

  range.addEventListener('pointerdown', startSliderDrag, { capture: true });
  range.addEventListener('mousedown', startSliderDrag, { capture: true });
  range.addEventListener('touchstart', startSliderDrag, { capture: true, passive: false });
  range.addEventListener('pointerup', releaseSliderDrag);
  range.addEventListener('pointercancel', releaseSliderDrag);
  range.addEventListener('mouseup', releaseSliderDrag);
  range.addEventListener('blur', releaseSliderDrag);
  document.addEventListener('pointerup', releaseSliderDrag);
  document.addEventListener('mouseup', releaseSliderDrag);
  window.addEventListener('mouseup', releaseSliderDrag);

  return {
    isInputLocked: () => isNumericInputLocked(number),
    releaseSliderDrag,
  };
}

export function isNumericInputLocked(input) {
  return input?.dataset?.[NUMERIC_INPUT_LOCK_ATTR] === 'true';
}

export function isNumericSliderDragging(input) {
  return input?.dataset?.[NUMERIC_SLIDER_DRAG_ATTR] === 'true';
}

export function isNumericInputInProgress(value) {
  const text = String(value ?? '').trim();
  return IN_PROGRESS_NUMERIC_TEXT.has(text) || /^[+-]?\d+\.$/.test(text);
}

export function parseNumericInputValue(value) {
  const text = String(value ?? '').trim();
  if (isNumericInputInProgress(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function readNumericInputLimits(input) {
  return {
    min: finiteOrDefault(input?.min, -Infinity),
    max: finiteOrDefault(input?.max, Infinity),
    step: Math.abs(finiteOrDefault(input?.step, 1)) || 1,
  };
}

export function isNumericValueInRange(value, limits) {
  return Number.isFinite(value) && value >= limits.min && value <= limits.max;
}

export function normalizeNumericInputValue(value, limits, fallback = 0) {
  const parsed = parseNumericCommitValue(value);
  const number = parsed ?? Number(fallback);
  return snapNumericStep(clamp(Number.isFinite(number) ? number : 0, limits.min, limits.max), limits);
}

export function formatNumericInputValue(value, step = 1) {
  const decimals = numericStepDecimals(step);
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  if (decimals <= 0) return String(Math.round(number));
  return trimTrailingZeros(number.toFixed(decimals));
}

function snapNumericStep(value, { min = 0, step = 1 } = {}) {
  if (!Number.isFinite(step) || step <= 0) return value;
  const base = Number.isFinite(min) ? min : 0;
  const snapped = base + Math.round((value - base) / step) * step;
  return Number(trimTrailingZeros(snapped.toFixed(Math.max(numericStepDecimals(step), 0))));
}

function parseNumericCommitValue(value) {
  const text = String(value ?? '').trim();
  if (IN_PROGRESS_NUMERIC_TEXT.has(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function numericStepDecimals(step) {
  const text = String(step);
  if (!text.includes('.')) return 0;
  return text.split('.')[1].replace(/0+$/, '').length;
}

function trimTrailingZeros(value) {
  return String(value)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

function finiteOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function selectNumericInputValue(input) {
  const schedule =
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (callback) => setTimeout(callback, 0);
  schedule(() => {
    if (document.activeElement !== input) return;
    try {
      input.select?.();
    } catch {
      // Some browsers limit text selection APIs on number inputs.
    }
  });
}

function setDatasetFlag(element, key, enabled) {
  if (!element?.dataset) return;
  if (enabled) {
    element.dataset[key] = 'true';
    return;
  }
  delete element.dataset[key];
}
