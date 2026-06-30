export const MODIFIER_DEFS = Object.freeze([
  {
    type: 'invincible',
    label: 'Invincible',
    settings: [
      { prop: 'startFrame', label: 'Start', min: 0, max: 50, step: 1 },
      { prop: 'endFrame', label: 'End', min: 0, max: 50, step: 1 },
    ],
  },
  {
    type: 'tint',
    label: 'Tint',
    settings: [
      { prop: 'color', label: 'Color', kind: 'color' },
      { prop: 'intensity', label: 'Intensity', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    type: 'easeIn',
    label: 'Ease In',
    settings: [{ prop: 'amount', label: 'Amount', min: 0, max: 1, step: 0.05 }],
  },
  {
    type: 'easeOut',
    label: 'Ease Out',
    settings: [{ prop: 'amount', label: 'Amount', min: 0, max: 1, step: 0.05 }],
  },
  {
    type: 'gravity',
    label: 'Gravity',
    settings: [{ prop: 'scale', label: 'Scale', min: 0, max: 3, step: 0.05 }],
  },
  {
    type: 'hitStop',
    label: 'Hit Stop',
    settings: [{ prop: 'duration', label: 'Duration', min: 0, max: 1, step: 0.01 }],
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
  def.settings.forEach((item) => {
    settings[item.prop] = normalizeModifierSetting(def.type, item.prop, modifier?.settings?.[item.prop]);
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
  if (prop === 'endFrame') return 1;
  if (prop === 'intensity' || prop === 'amount' || prop === 'scale') return 1;
  return 0;
}
