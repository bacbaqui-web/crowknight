import { EFFECT_DIRECTIONS, effectDirection } from './effect_directions.js';

export const EFFECT_LAYOUT_STORAGE = 'crowKnight.quarterEffectLayouts.v1';
export const DEFAULT_EFFECT_LAYOUT = Object.freeze({ distance: 0, side: 0, width: 1, height: 1 });
const fields = { distance: [-250, 400], side: [-250, 250], width: [0.25, 3], height: [0.25, 3] };
export function normalizeEffectLayout(value = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, [min, max]]) => {
      const number = Number(value?.[key]);
      return [key, Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : DEFAULT_EFFECT_LAYOUT[key]];
    })
  );
}
export function createEffectProfile(value = {}) {
  return {
    linked: value?.linked !== false,
    directions: Object.fromEntries(
      EFFECT_DIRECTIONS.map(({ key }) => [key, normalizeEffectLayout(value?.directions?.[key])])
    ),
  };
}
export function updateEffectProfile(profile, direction, patch) {
  const next = normalizeEffectLayout({ ...profile.directions[direction], ...patch });
  for (const { key } of EFFECT_DIRECTIONS)
    if (profile.linked || key === direction) profile.directions[key] = { ...next };
}
export function linkEffectProfile(profile, direction, linked) {
  profile.linked = linked;
  if (linked) updateEffectProfile(profile, direction, profile.directions[direction]);
}
export function effectLayoutFor(actor, direction = effectDirection(actor).key) {
  return actor.quarterEffectLayouts?.[actor.player.actionKey]?.directions?.[direction] || DEFAULT_EFFECT_LAYOUT;
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
