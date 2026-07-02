export const MODIFIER_DEFS = Object.freeze([
  {
    type: 'move',
    label: '이동',
    settings: [
      { prop: 'x', label: 'X 이동량', min: -2000, max: 2000, step: 1 },
      { prop: 'y', label: 'Y 이동량', min: -2000, max: 2000, step: 1 },
    ],
  },
  {
    type: 'accelerate',
    label: '가속',
    settings: [{ prop: 'strength', label: '강도', min: 0, max: 5, step: 0.05 }],
  },
  {
    type: 'decelerate',
    label: '감속',
    settings: [{ prop: 'strength', label: '강도', min: 0, max: 5, step: 0.05 }],
  },
]);

export function defaultTimelineModifiers() {
  return {
    pose: {},
    effect: {},
  };
}

export function normalizeTimelineModifiers(value = {}) {
  return {
    pose: normalizeModifierTargets(value.pose),
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
  modifier.enabled = Boolean(enabled);
  return modifier;
}

export function writeTimelineModifierSetting(tuning, scope, key, type, prop, value) {
  const list = ensureTimelineModifierTarget(tuning, scope, key);
  const modifier = ensureModifier(list, type);
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
    settings[item.prop] = normalizeModifierSetting(def.type, item.prop, sourceSettings?.[item.prop]);
  });
  return {
    type: def.type,
    enabled: Boolean(modifier.enabled),
    settings,
  };
}

function ensureModifier(list, type) {
  const def = modifierDef(type);
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
  const number = Number(value ?? defaultModifierSettingValue(prop));
  return Math.max(Number(field.min ?? -Infinity), Math.min(Number(field.max ?? Infinity), number));
}

function defaultModifierSettingValue(prop) {
  if (prop === 'strength') return 1;
  return 0;
}
