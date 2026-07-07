import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaActionTargetFields } from './formula_editor_fields.js';

export const linkFormula = {
  type: 'link',
  label: '연계',
  defaultValue: () => ({
    type: 'link',
    enabled: false,
    fromActions: [],
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    consumeTrigger: true,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      fromActions: normalizeActionKeys(source.fromActions),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      consumeTrigger: source.consumeTrigger !== false,
    };
  },
  renderOptions(container, formula, context) {
    container.append(renderFormulaActionTargetFields(formula, context));
  },
  runtime: {
    appliesTo: 'link',
  },
};

function normalizeActionKeys(value) {
  return Array.isArray(value) ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))] : [];
}
