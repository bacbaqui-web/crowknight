import { renderFormulaNumberField } from './formula_editor_fields.js';

export const cancelFormula = {
  type: 'cancel',
  label: '캔슬',
  defaultValue: () => ({
    type: 'cancel',
    enabled: true,
    startFrame: 1,
    endFrame: 30,
    priority: 0,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: source.enabled !== false,
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      priority: Number(source.priority ?? source.settings?.priority ?? 0),
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaNumberField('우선순위', formula.priority, (value) => context.onChange('priority', value))
    );
  },
  runtime: {
    appliesTo: 'cancel',
  },
};
