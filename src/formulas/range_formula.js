import { renderFormulaNumberField } from './formula_editor_fields.js';

export const rangeFormula = {
  type: 'range',
  label: '사정거리',
  defaultValue: () => ({
    type: 'range',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
    minRange: 80,
    maxRange: 160,
  }),
  normalize(source = {}) {
    const minRange = normalizeRange(source.minRange ?? source.settings?.minRange, 80);
    const maxRange = normalizeRange(source.maxRange ?? source.settings?.maxRange, 160);
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      minRange: Math.min(minRange, maxRange),
      maxRange: Math.max(minRange, maxRange),
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
      renderFormulaNumberField('시작 거리', formula.minRange, (value) => context.onChange('minRange', value), 'px'),
      renderFormulaNumberField('끝 거리', formula.maxRange, (value) => context.onChange('maxRange', value), 'px')
    );
  },
  runtime: {
    appliesTo: 'aiRange',
  },
};

function normalizeRange(value, fallback) {
  const number = Math.round(Number(value ?? fallback));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(5000, Math.max(0, number));
}
