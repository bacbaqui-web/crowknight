import { renderFormulaNumberField } from './formula_editor_fields.js';

export const cooldownFormula = {
  type: 'cooldown',
  label: '쿨타임',
  defaultValue: () => ({
    type: 'cooldown',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
    seconds: 0,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      seconds: Math.max(0, Number(source.seconds ?? source.settings?.seconds ?? 0)),
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
      renderFormulaNumberField('시간', formula.seconds, (value) => context.onChange('seconds', value), '초')
    );
  },
  runtime: {
    appliesTo: 'cooldown',
  },
};
