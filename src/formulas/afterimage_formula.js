import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaColorField, renderFormulaNumberField, renderFormulaRangeField } from './formula_editor_fields.js';

const DEFAULT_AFTERIMAGE_COLOR = '#8edab8';

export const afterimageFormula = {
  type: 'afterimage',
  label: '잔상',
  defaultValue: () => ({
    type: 'afterimage',
    enabled: false,
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    amount: 1,
    opacity: 0.35,
    color: DEFAULT_AFTERIMAGE_COLOR,
    colorOpacity: 0.35,
    fadeFrames: 10,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      amount: normalizeAmount(source.amount ?? source.settings?.amount),
      opacity: normalizeOpacity(source.opacity ?? source.settings?.opacity),
      color: normalizeColor(source.color ?? source.settings?.color),
      colorOpacity: normalizeOpacity(source.colorOpacity ?? source.settings?.colorOpacity),
      fadeFrames: normalizeFadeFrames(source.fadeFrames ?? source.settings?.fadeFrames),
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaNumberField('프레임당 생성 수', formula.amount, (value) => context.onChange('amount', value), '/f'),
      renderFormulaRangeField({
        label: '투명도',
        value: formula.opacity,
        min: 0.05,
        max: 1,
        step: 0.05,
        onChange: (value) => context.onChange('opacity', value),
        formatValue: (value) => Number(value).toFixed(2),
      }),
      renderFormulaColorField('색깔', formula.color, (value) => context.onChange('color', value)),
      renderFormulaRangeField({
        label: '색상 투명도',
        value: formula.colorOpacity,
        min: 0,
        max: 1,
        step: 0.05,
        onChange: (value) => context.onChange('colorOpacity', value),
        formatValue: (value) => Number(value).toFixed(2),
      }),
      renderFormulaNumberField(
        '사라지는 시간',
        formula.fadeFrames,
        (value) => context.onChange('fadeFrames', value),
        'f'
      )
    );
  },
  runtime: {
    appliesTo: 'afterimage',
  },
};

function normalizeAmount(value) {
  const number = Math.round(Number(value ?? 1));
  if (!Number.isFinite(number)) return 1;
  return Math.min(10, Math.max(0, number));
}

function normalizeOpacity(value) {
  const number = Number(value ?? 0.35);
  if (!Number.isFinite(number)) return 0.35;
  return Math.min(1, Math.max(0, Math.round(number * 100) / 100));
}

function normalizeColor(value) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : DEFAULT_AFTERIMAGE_COLOR;
}

function normalizeFadeFrames(value) {
  const number = Math.round(Number(value ?? 10));
  if (!Number.isFinite(number)) return 10;
  return Math.min(60, Math.max(1, number));
}
