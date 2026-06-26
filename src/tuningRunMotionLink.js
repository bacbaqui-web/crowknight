import { DEFAULT_PLAYER_TUNING } from './playerDefaultTuning.js';
import { setPath } from './utils.js';

const RUN_LINK_FIELDS = ['walkBob'];
const RUN_LINK_POWER = {
  walkBob: 0.5,
};

export function bindRunMotionLinkControl({ panel, beginUndoSnapshot, getTuning, applySelected, commitUndoSnapshot }) {
  let runMotionLinked = false;
  const runMotionLinkToggle = panel.querySelector('[data-action="toggle-run-motion-link"]');

  runMotionLinkToggle?.addEventListener('click', () => {
    runMotionLinked = !runMotionLinked;
    syncRunMotionLinkToggle(runMotionLinkToggle, runMotionLinked);
    if (!runMotionLinked) return;

    beginUndoSnapshot();
    applyRunMotionLink(getTuning(), getTuning().speed);
    applySelected();
    commitUndoSnapshot();
  });
  syncRunMotionLinkToggle(runMotionLinkToggle, runMotionLinked);

  return {
    afterTuningFieldUpdate(fieldId, value) {
      if (!runMotionLinked || fieldId !== 'speed') return;
      applyRunMotionLink(getTuning(), value);
    },
  };
}

function syncRunMotionLinkToggle(button, linked) {
  if (!button) return;
  button.classList.toggle('is-active', linked);
  button.setAttribute('aria-pressed', linked ? 'true' : 'false');
}

function applyRunMotionLink(tuning, speed) {
  const ratio = Math.max(0.1, Number(speed || DEFAULT_PLAYER_TUNING.speed) / DEFAULT_PLAYER_TUNING.speed);

  RUN_LINK_FIELDS.forEach((field) => {
    const baseValue = DEFAULT_PLAYER_TUNING.motion[field];
    const power = RUN_LINK_POWER[field] || 1;
    syncLinkedField(tuning, field, baseValue * Math.pow(ratio, power));
  });
}

function syncLinkedField(tuning, field, rawValue) {
  const group = document.querySelector(`[data-field="${field}"]`);
  const range = group?.querySelector('input[type="range"]');
  const number = group?.querySelector('input[type="number"]');
  const nextValue = normalizeLinkedControlValue(rawValue, range || number);

  setPath(tuning, ['motion', field], nextValue);
  if (range) range.value = nextValue;
  if (number) number.value = nextValue;
}

function normalizeLinkedControlValue(value, input) {
  const min = Number(input?.min);
  const max = Number(input?.max);
  const step = Number(input?.step || 1);
  const clamped = Math.min(
    Number.isFinite(max) ? max : Infinity,
    Math.max(Number.isFinite(min) ? min : -Infinity, value)
  );
  const stepped = Number.isFinite(step) && step > 0 ? Math.round(clamped / step) * step : clamped;
  return Number(stepped.toFixed(step < 1 ? 3 : 0));
}
