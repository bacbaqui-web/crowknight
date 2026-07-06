import { ACTION_MAX_FRAMES } from './game_config_data.js';

export const MODIFIER_GRAPH_OPTIONS = Object.freeze([
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
]);

export const MODIFIER_DEFS = Object.freeze([
  {
    type: 'move',
    label: '이동',
    settings: [
      { prop: 'x', label: 'X 이동량', min: -2000, max: 2000, step: 1 },
      { prop: 'y', label: 'Y 이동량', min: -2000, max: 2000, step: 1 },
      { prop: 'frames', label: '도달 프레임', min: 1, max: ACTION_MAX_FRAMES, step: 1 },
    ],
  },
  {
    type: 'velocity',
    label: '속도',
    timeline: true,
    settings: [
      { prop: 'x', label: 'X Velocity', min: -2000, max: 2000, step: 1 },
      { prop: 'y', label: 'Y Velocity', min: -2000, max: 2000, step: 1 },
      {
        prop: 'mode',
        label: 'Mode',
        kind: 'select',
        options: [
          { value: 'set', label: 'Set' },
          { value: 'add', label: 'Add' },
        ],
      },
      { prop: 'startFrame', label: 'Start Frame', min: 1, max: ACTION_MAX_FRAMES, step: 1 },
      { prop: 'endFrame', label: 'End Frame', min: 1, max: ACTION_MAX_FRAMES, step: 1 },
    ],
  },
  {
    type: 'accelerate',
    label: '가속',
    timeline: true,
    settings: [
      { prop: 'graph', label: '그래프', kind: 'select', options: MODIFIER_GRAPH_OPTIONS },
      { prop: 'startFrame', label: 'Start Frame', min: 1, max: ACTION_MAX_FRAMES, step: 1 },
      { prop: 'endFrame', label: 'End Frame', min: 1, max: ACTION_MAX_FRAMES, step: 1 },
    ],
  },
  {
    type: 'decelerate',
    label: '감속',
    timeline: true,
    settings: [
      { prop: 'graph', label: '그래프', kind: 'select', options: MODIFIER_GRAPH_OPTIONS },
      { prop: 'startFrame', label: 'Start Frame', min: 1, max: ACTION_MAX_FRAMES, step: 1 },
      { prop: 'endFrame', label: 'End Frame', min: 1, max: ACTION_MAX_FRAMES, step: 1 },
    ],
  },
]);

export function defaultTimelineModifiers() {
  return {
    action: {},
    effect: {},
  };
}

export function normalizeTimelineModifiers(value = {}) {
  return {
    action: normalizeModifierTargets(value.action),
    effect: normalizeModifierTargets(value.effect),
  };
}

export function ensureTimelineModifierTarget(tuning, scope, key) {
  tuning.modifiers = normalizeTimelineModifiers(tuning.modifiers);
  tuning.modifiers[scope] ||= {};
  tuning.modifiers[scope][key] = normalizeModifierList(tuning.modifiers[scope][key]);
  return tuning.modifiers[scope][key];
}

export function writeTimelineModifierEnabled(tuning, scope, key, type, enabled) {
  const list = ensureTimelineModifierTarget(tuning, scope, key);
  const modifier = ensureModifier(list, type);
  if (!modifier) return null;
  modifier.enabled = Boolean(enabled);
  return modifier;
}

export function writeTimelineModifierSetting(tuning, scope, key, type, prop, value) {
  const list = ensureTimelineModifierTarget(tuning, scope, key);
  const modifier = ensureModifier(list, type);
  if (!modifier) return null;
  modifier.settings[prop] = normalizeModifierSetting(type, prop, value);
  return modifier;
}

function normalizeModifierTargets(targets = {}) {
  return Object.fromEntries(
    Object.entries(targets || {}).map(([key, modifiers]) => [key, normalizeModifierList(modifiers)])
  );
}

function normalizeModifierList(modifiers = []) {
  const source = Array.isArray(modifiers) ? modifiers : [];
  return source.map(normalizeModifier).filter(Boolean);
}

function normalizeModifier(modifier) {
  const def = modifierDef(modifier?.type);
  if (!def) return null;
  const settings = {};
  const sourceSettings = modifier?.settings || modifier;
  def.settings.forEach((item) => {
    settings[item.prop] = normalizeModifierSetting(
      def.type,
      item.prop,
      modifierSettingSourceValue(def.type, item.prop, sourceSettings)
    );
  });
  return {
    type: def.type,
    enabled: Boolean(modifier.enabled),
    settings,
  };
}

function ensureModifier(list, type) {
  const def = modifierDef(type);
  if (!def) return null;
  let modifier = list.find((item) => item.type === def.type);
  if (!modifier) {
    modifier = normalizeModifier({ type: def.type, enabled: false, settings: {} });
    list.push(modifier);
  }
  return modifier;
}

function modifierDef(type) {
  return MODIFIER_DEFS.find((item) => item.type === type) || null;
}

function normalizeModifierSetting(type, prop, value) {
  const field = modifierDef(type)?.settings.find((item) => item.prop === prop);
  if (!field) return value;
  if (field.kind === 'color') return typeof value === 'string' && value.trim() ? value : '#ffffff';
  if (field.kind === 'select') return normalizeSelectModifierSetting(field, value);
  const number = Number(value ?? defaultModifierSettingValue(prop, type));
  const clamped = Math.max(Number(field.min ?? -Infinity), Math.min(Number(field.max ?? Infinity), number));
  return prop === 'frames' || prop === 'startFrame' || prop === 'endFrame' ? Math.round(clamped) : clamped;
}

function normalizeSelectModifierSetting(field, value) {
  const options = Array.isArray(field.options) ? field.options : [];
  const next = String(value || '');
  return options.some((option) => option.value === next) ? next : options[0]?.value || '';
}

function modifierSettingSourceValue(type, prop, settings = {}) {
  if ((type === 'accelerate' || type === 'decelerate') && prop === 'startFrame') {
    return settings.startFrame ?? 1;
  }
  if ((type === 'accelerate' || type === 'decelerate') && prop === 'endFrame') {
    return settings.endFrame ?? settings.frames ?? settings.strength;
  }
  return settings?.[prop];
}

function defaultModifierSettingValue(prop, type = '') {
  if (prop === 'frames' && type === 'move') return ACTION_MAX_FRAMES;
  if (prop === 'frames') return 4;
  if (prop === 'startFrame') return 1;
  if (prop === 'endFrame') return type === 'velocity' ? ACTION_MAX_FRAMES : 4;
  if (prop === 'mode') return 'set';
  if (prop === 'graph') return MODIFIER_GRAPH_OPTIONS[0].value;
  return 0;
}
