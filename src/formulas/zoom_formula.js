import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaRangeField } from './formula_editor_fields.js';

export const zoomFormula = {
  type: 'zoom',
  label: '확대',
  defaultValue: () => ({
    type: 'zoom',
    enabled: false,
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    scale: 2,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      scale: normalizeScale(source.scale ?? source.settings?.scale),
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaRangeField({
        label: '배율',
        value: formula.scale,
        min: 1,
        max: 3,
        step: 0.1,
        onChange: (value) => context.onChange('scale', value),
        formatValue: (value) => `${Number(value).toFixed(1)}x`,
      })
    );
  },
  runtime: {
    appliesTo: 'zoom',
  },
};

function normalizeScale(value) {
  const number = Number(value ?? 2);
  if (!Number.isFinite(number)) return 2;
  return Math.min(3, Math.max(1, Math.round(number * 10) / 10));
}
