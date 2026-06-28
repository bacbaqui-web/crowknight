import {
  COLLISION_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  ATTACK_INTERACTION_OBJECT_KEY,
  INTERACTION_OBJECT_TARGET_TYPE,
  isInteractionObjectPartKey,
} from './tuningInteractionObjects.js';

export const SELECTION_PALETTE_TARGETS = Object.freeze([
  { type: INTERACTION_OBJECT_TARGET_TYPE, key: COLLISION_INTERACTION_OBJECT_KEY },
  { type: 'part', key: 'head' },
  { type: INTERACTION_OBJECT_TARGET_TYPE, key: HURT_INTERACTION_OBJECT_KEY },
  { type: 'part', key: 'cape' },
  { type: 'part', key: 'shoulderL' },
  { type: 'part', key: 'shoulderR' },
  { type: 'part', key: 'body' },
  { type: 'part', key: 'upperArmL' },
  { type: 'part', key: 'lowerArmL' },
  { type: 'part', key: 'upperArmR' },
  { type: 'part', key: 'lowerArmR' },
  { type: 'part', key: 'hipL' },
  { type: 'part', key: 'hipR' },
  { type: 'part', key: 'shield' },
  { type: 'part', key: 'weapon' },
  { type: 'part', key: 'upperLegL' },
  { type: 'part', key: 'lowerLegL' },
  { type: 'part', key: 'upperLegR' },
  { type: 'part', key: 'lowerLegR' },
  { type: INTERACTION_OBJECT_TARGET_TYPE, key: ATTACK_INTERACTION_OBJECT_KEY },
  { type: INTERACTION_OBJECT_TARGET_TYPE, key: GUARD_INTERACTION_OBJECT_KEY },
]);

export function selectionPaletteKeys() {
  return SELECTION_PALETTE_TARGETS.map((target) => target.key);
}

export function selectionPaletteTargetFor(key) {
  return (
    SELECTION_PALETTE_TARGETS.find((target) => target.key === key) || {
      type: isInteractionObjectPartKey(key) ? INTERACTION_OBJECT_TARGET_TYPE : 'part',
      key,
    }
  );
}
