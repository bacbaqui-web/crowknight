import { renderFormulaButtonGroup } from './formula_editor_fields.js';

export const lockFormula = {
  type: 'lock',
  label: '고정',
  defaultValue: () => ({
    type: 'lock',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
    direction: 'right',
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      direction: normalizeLockDirection(source.direction ?? source.settings?.direction),
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaButtonGroup(
        '방향',
        formula.direction,
        [
          { value: 'left', label: '← 왼쪽' },
          { value: 'right', label: '→ 오른쪽' },
        ],
        (value) => context.onChange('direction', value)
      )
    );
  },
  runtime: {
    appliesTo: 'viewLock',
  },
};

function normalizeLockDirection(value) {
  return value === 'left' ? 'left' : 'right';
}
