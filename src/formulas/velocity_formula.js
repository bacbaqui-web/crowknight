import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaNumberField, renderFormulaSelectField } from './formula_editor_fields.js';

export const velocityFormula = {
  type: 'velocity',
  label: '속도',
  defaultValue: () => ({
    type: 'velocity',
    enabled: false,
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    x: 0,
    y: 0,
    mode: 'set',
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      x: Number(source.x ?? source.settings?.x ?? 0),
      y: Number(source.y ?? source.settings?.y ?? 0),
      mode: source.mode === 'add' || source.settings?.mode === 'add' ? 'add' : 'set',
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaNumberField('X Velocity', formula.x, (value) => context.onChange('x', value), 'px/f'),
      renderFormulaNumberField('Y Velocity', formula.y, (value) => context.onChange('y', value), 'px/f'),
      renderFormulaSelectField(
        'Mode',
        formula.mode,
        [
          { value: 'set', label: 'Set' },
          { value: 'add', label: 'Add' },
        ],
        (value) => context.onChange('mode', value)
      )
    );
  },
  runtime: {
    appliesTo: 'velocity',
  },
};
