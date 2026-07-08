import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaSelectField } from './formula_editor_fields.js';

const CAST_MODES = ['tap', 'press', 'repeat'];
const RELEASE_MODES = ['immediate', 'finish'];

export const castFormula = {
  type: 'cast',
  label: '시전',
  defaultValue: () => ({
    type: 'cast',
    enabled: false,
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    mode: 'tap',
    repeatStartFrame: 1,
    repeatEndFrame: ACTION_MAX_FRAMES,
    releaseMode: 'immediate',
  }),
  normalize(source = {}) {
    const mode = normalizeCastMode(source.mode ?? source.settings?.mode);
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: normalizeFrame(source.startFrame ?? source.settings?.startFrame, 1),
      endFrame: normalizeFrame(source.endFrame ?? source.settings?.endFrame, ACTION_MAX_FRAMES),
      mode,
      repeatStartFrame: normalizeFrame(source.repeatStartFrame ?? source.settings?.repeatStartFrame, 1),
      repeatEndFrame: normalizeFrame(source.repeatEndFrame ?? source.settings?.repeatEndFrame, ACTION_MAX_FRAMES),
      releaseMode: normalizeReleaseMode(source.releaseMode ?? source.settings?.releaseMode),
    };
  },
  showMiniTimeline(formula) {
    return formula.mode === 'repeat';
  },
  timelineRangeProps() {
    return {
      startProp: 'repeatStartFrame',
      endProp: 'repeatEndFrame',
      label: '반복 구간',
    };
  },
  frameFields() {
    return [];
  },
  renderOptions(container, formula, context) {
    container.append(
      renderFormulaSelectField(
        '모드',
        formula.mode,
        [
          { value: 'tap', label: '탭' },
          { value: 'press', label: '프레스' },
          { value: 'repeat', label: '리핏' },
        ],
        (value) => context.onChange('mode', value)
      )
    );
    if (formula.mode === 'tap') return;
    container.append(
      renderFormulaSelectField(
        '떼면',
        formula.releaseMode,
        [
          { value: 'immediate', label: '즉시 종료' },
          { value: 'finish', label: '끝까지 재생' },
        ],
        (value) => context.onChange('releaseMode', value)
      )
    );
  },
  runtime: {
    appliesTo: 'cast',
  },
};

export function normalizeCastMode(value) {
  const mode = String(value || '');
  if (CAST_MODES.includes(mode)) return mode;
  if (mode === 'pressLoop') return 'repeat';
  return 'tap';
}

export function normalizeReleaseMode(value) {
  const mode = String(value || '');
  return RELEASE_MODES.includes(mode) ? mode : 'immediate';
}

function normalizeFrame(value, fallback) {
  const number = Math.round(Number(value ?? fallback));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(ACTION_MAX_FRAMES, Math.max(1, number));
}
