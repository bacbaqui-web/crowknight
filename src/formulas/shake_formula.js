import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaInlineStepperFields } from './formula_editor_fields.js';

export const shakeFormula = {
  type: 'shake',
  label: '흔들림',
  defaultValue: () => ({
    type: 'shake',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
    triggerFrame: 1,
    power: 4,
    frames: 6,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: normalizeFrame(source.startFrame ?? source.settings?.startFrame, 1),
      endFrame: normalizeFrame(source.endFrame ?? source.settings?.endFrame, 1),
      triggerFrame: normalizeFrame(source.triggerFrame ?? source.settings?.triggerFrame, 1),
      power: normalizePower(source.power ?? source.settings?.power),
      frames: normalizeFrames(source.frames ?? source.settings?.frames),
    };
  },
  showMiniTimeline() {
    return false;
  },
  frameFields() {
    return [];
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaInlineStepperFields([
        {
          label: '발동 프레임',
          value: formula.triggerFrame,
          step: 1,
          min: 1,
          max: ACTION_MAX_FRAMES,
          onChange: (value) => context.onChange('triggerFrame', value),
        },
        {
          label: '흔들림 강도',
          value: formula.power,
          step: 1,
          min: 0,
          max: 100,
          onChange: (value) => context.onChange('power', value),
        },
        {
          label: '흔들림 시간',
          value: formula.frames,
          step: 1,
          min: 0,
          max: 120,
          onChange: (value) => context.onChange('frames', value),
        },
      ])
    );
  },
  runtime: {
    appliesTo: 'shake',
  },
};

function normalizeFrame(value, fallback) {
  const number = Math.round(Number(value ?? fallback));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(ACTION_MAX_FRAMES, Math.max(1, number));
}

function normalizePower(value) {
  const number = Math.round(Number(value ?? 4));
  if (!Number.isFinite(number)) return 4;
  return Math.min(100, Math.max(0, number));
}

function normalizeFrames(value) {
  const number = Math.round(Number(value ?? 6));
  if (!Number.isFinite(number)) return 6;
  return Math.min(120, Math.max(0, number));
}
