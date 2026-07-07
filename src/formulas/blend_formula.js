import { normalizeActionBlendFrames } from '../action_blend_helper.js';
import { renderFormulaNumberField } from './formula_editor_fields.js';

export const blendFormula = {
  type: 'blend',
  label: '보간',
  defaultValue: () => ({
    type: 'blend',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
    frames: 0,
  }),
  normalize(source = {}) {
    const frames = normalizeActionBlendFrames(source.frames ?? source.settings?.frames ?? 0);
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled) && frames > 0,
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      frames,
    };
  },
  renderOptions(container, formula, context) {
    container.append(renderFormulaNumberField('Frames', formula.frames, (value) => context.onChange('frames', value)));
  },
  runtime: {
    appliesTo: 'blend',
  },
};
