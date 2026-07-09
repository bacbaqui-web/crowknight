import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaColorField, renderFormulaRangeField } from './formula_editor_fields.js';

const DEFAULT_COLOR = '#8edab8';

export const colorChangeFormula = {
  type: 'colorChange',
  label: '색변화',
  defaultValue: () => ({
    type: 'colorChange',
    enabled: false,
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    color: DEFAULT_COLOR,
    opacity: 0.35,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      color: normalizeColor(source.color ?? source.settings?.color),
      opacity: normalizeOpacity(source.opacity ?? source.settings?.opacity),
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaColorField('색선택', formula.color, (value) => context.onChange('color', value)),
      renderFormulaRangeField({
        label: '색의 투명도',
        value: formula.opacity,
        min: 0,
        max: 1,
        step: 0.05,
        onChange: (value) => context.onChange('opacity', value),
        formatValue: (value) => Number(value).toFixed(2),
      })
    );
  },
  runtime: {
    appliesTo: 'colorChange',
  },
};

function normalizeColor(value) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : DEFAULT_COLOR;
}

function normalizeOpacity(value) {
  const number = Number(value ?? 0.35);
  if (!Number.isFinite(number)) return 0.35;
  return Math.min(1, Math.max(0, Math.round(number * 100) / 100));
}
