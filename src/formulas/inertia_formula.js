import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaNumberField, renderFormulaSelectField } from './formula_editor_fields.js';

const APPLY_TARGETS = ['all', 'ground', 'air'];

export const inertiaFormula = {
  type: 'inertia',
  label: '관성',
  defaultValue: () => ({
    type: 'inertia',
    enabled: false,
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    addInertia: 0,
    applyTarget: 'all',
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      addInertia: Math.max(0, Number(source.addInertia ?? source.settings?.addInertia ?? 0)),
      applyTarget: normalizeApplyTarget(source.applyTarget ?? source.settings?.applyTarget),
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaNumberField(
        '추가 관성',
        formula.addInertia,
        (value) => context.onChange('addInertia', value),
        'frame'
      ),
      renderFormulaSelectField(
        '적용 대상',
        formula.applyTarget,
        [
          { value: 'all', label: '전체' },
          { value: 'ground', label: '지상' },
          { value: 'air', label: '공중' },
        ],
        (value) => context.onChange('applyTarget', value)
      )
    );
  },
  runtime: {
    appliesTo: 'inertia',
  },
};

function normalizeApplyTarget(value) {
  const target = String(value || '');
  return APPLY_TARGETS.includes(target) ? target : 'all';
}
