import { EFFECT_EDIT_DIRECTIONS, effectDirection, effectLayoutKey } from './effect_directions.js';

export const EFFECT_LAYOUT_STORAGE = 'crowKnight.quarterEffectLayouts.v1';
export const DEFAULT_EFFECT_LAYOUT = Object.freeze({
  distance: 0,
  side: 0,
  width: 1,
  height: 1,
  elevation: 0,
  rotation: 0,
  anchorX: 0,
  anchorY: 0,
});
const fields = {
  distance: [-250, 400],
  side: [-250, 250],
  width: [0.25, 3],
  height: [0.25, 3],
  elevation: [-300, 300],
  rotation: [-180, 180],
  anchorX: [-300, 300],
  anchorY: [-300, 300],
};
export function normalizeEffectLayout(value = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, [min, max]]) => {
      const number = Number(value?.[key]);
      return [key, Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : DEFAULT_EFFECT_LAYOUT[key]];
    })
  );
}
const scaleFields = new Set(['width', 'height']);
const wrapAngle = (angle) => ((((angle + 180) % 360) + 360) % 360) - 180;
function adjustmentFor(base, layout) {
  return Object.fromEntries(
    Object.keys(fields).map((key) => [
      key,
      scaleFields.has(key)
        ? layout[key] / base[key]
        : key === 'rotation'
          ? wrapAngle(layout[key] - base[key])
          : layout[key] - base[key],
    ])
  );
}
function refreshEffectProfile(profile) {
  profile.directions = Object.fromEntries(
    EFFECT_EDIT_DIRECTIONS.map(({ key }) => {
      const adjustment = key === 'right' ? {} : profile.adjustments[key] || {};
      const layout = Object.fromEntries(
        Object.keys(fields).map((field) => {
          const fallback = scaleFields.has(field) ? 1 : 0;
          const offset = Number.isFinite(adjustment[field]) ? adjustment[field] : fallback;
          const value = scaleFields.has(field) ? profile.base[field] * offset : profile.base[field] + offset;
          return [field, field === 'rotation' ? wrapAngle(value) : value];
        })
      );
      return [key, normalizeEffectLayout(layout)];
    })
  );
}
export function createEffectProfile(value = {}) {
  const profile = {
    mode: 'right-base',
    base: normalizeEffectLayout(value?.base || value?.directions?.right),
    adjustments: {},
  };
  for (const { key } of EFFECT_EDIT_DIRECTIONS) {
    if (key === 'right') continue;
    if (value?.mode === 'right-base') {
      if (value?.adjustments?.[key]) profile.adjustments[key] = { ...value.adjustments[key] };
    } else if (value?.directions?.[key])
      profile.adjustments[key] = adjustmentFor(profile.base, normalizeEffectLayout(value.directions[key]));
  }
  refreshEffectProfile(profile);
  return profile;
}
export function updateEffectProfile(profile, direction, patch) {
  const key = effectLayoutKey(direction);
  const next = normalizeEffectLayout({ ...profile.directions[key], ...patch });
  if (key === 'right') profile.base = next;
  else {
    const adjustment = adjustmentFor(profile.base, next);
    profile.adjustments[key] = {
      ...profile.adjustments[key],
      ...Object.fromEntries(
        Object.keys(patch)
          .filter((field) => field in fields)
          .map((field) => [field, adjustment[field]])
      ),
    };
  }
  refreshEffectProfile(profile);
}
export function resetEffectAdjustment(profile, direction) {
  const key = effectLayoutKey(direction);
  if (key === 'right') return;
  delete profile.adjustments[key];
  refreshEffectProfile(profile);
}
export function effectLayoutFor(actor, direction = effectDirection(actor).key) {
  return (
    actor.quarterEffectLayouts?.[actor.player.actionKey]?.directions?.[effectLayoutKey(direction)] ||
    DEFAULT_EFFECT_LAYOUT
  );
}
export function normalizeEffectLayoutState(value) {
  const profiles = Object.create(null);
  for (const [id, actions] of Object.entries(value?.profiles || {})) {
    if (!actions || typeof actions !== 'object' || Array.isArray(actions)) continue;
    profiles[id] = Object.fromEntries(
      Object.entries(actions)
        .filter(([, profile]) => profile && typeof profile === 'object')
        .map(([key, profile]) => [key, createEffectProfile(profile)])
    );
  }
  return { version: 1, guides: value?.guides !== false, profiles };
}
export function readEffectLayoutState(storage) {
  try {
    return normalizeEffectLayoutState(JSON.parse(storage.getItem(EFFECT_LAYOUT_STORAGE) || '{}'));
  } catch {
    return normalizeEffectLayoutState({});
  }
}
export function saveEffectLayoutState(storage, state) {
  try {
    storage.setItem(EFFECT_LAYOUT_STORAGE, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
