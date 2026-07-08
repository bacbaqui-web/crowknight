import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaInlineStepperFields, renderFormulaRangeField } from './formula_editor_fields.js';

export const targetMoveFormula = {
  type: 'targetMove',
  label: '목표이동',
  defaultValue: () => ({
    type: 'targetMove',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
    triggerFrame: 1,
    x: 0,
    y: 0,
    moveFrames: 1,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: normalizeFrame(source.startFrame ?? source.settings?.startFrame, 1),
      endFrame: normalizeFrame(source.endFrame ?? source.settings?.endFrame, 1),
      triggerFrame: normalizeFrame(source.triggerFrame ?? source.settings?.triggerFrame, 1),
      x: Number(source.x ?? source.settings?.x ?? 0),
      y: Number(source.y ?? source.settings?.y ?? 0),
      moveFrames: normalizeMoveFrames(source.moveFrames ?? source.settings?.moveFrames),
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
          label: 'X',
          value: formula.x,
          step: 1,
          onChange: (value) => context.onChange('x', value),
        },
        {
          label: 'Y',
          value: formula.y,
          step: 1,
          onChange: (value) => context.onChange('y', value),
        },
      ])
    );
    container.append(
      renderFormulaRangeField({
        label: '도달 프레임',
        value: formula.moveFrames,
        min: 0,
        max: 10,
        step: 1,
        onChange: (value) => context.onChange('moveFrames', value),
        formatValue: (value) => (Number(value) <= 0 ? '즉시' : `${value}f`),
      })
    );
  },
  runtime: {
    appliesTo: 'targetMove',
  },
};

function normalizeFrame(value, fallback) {
  const number = Math.round(Number(value ?? fallback));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(ACTION_MAX_FRAMES, Math.max(1, number));
}

function normalizeMoveFrames(value) {
  const number = Math.round(Number(value ?? 1));
  if (!Number.isFinite(number)) return 1;
  return Math.min(10, Math.max(0, number));
}
