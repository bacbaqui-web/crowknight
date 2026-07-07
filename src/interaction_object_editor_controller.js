export const COLLISION_INTERACTION_OBJECT_KEY = 'collisionInteractionObject';
export const ATTACK_INTERACTION_OBJECT_KEY = 'attackInteractionObject';
export const HURT_INTERACTION_OBJECT_KEY = 'hurtInteractionObject';
export const GUARD_INTERACTION_OBJECT_KEY = 'guardInteractionObject';
export const INTERACTION_OBJECT_PART_TYPE = 'interactionObject';
export const INTERACTION_OBJECT_TARGET_TYPE = INTERACTION_OBJECT_PART_TYPE;

export const INTERACTION_OBJECT_ROLES = Object.freeze({
  COLLISION: 'collision',
  HURT: 'hurt',
  ATTACK: 'attack',
  GUARD: 'guard',
});

export const INTERACTION_OBJECT_PART_KEYS = [
  COLLISION_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  ATTACK_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
];

export const INTERACTION_OBJECT_DEFS = Object.freeze({
  [COLLISION_INTERACTION_OBJECT_KEY]: {
    key: COLLISION_INTERACTION_OBJECT_KEY,
    role: INTERACTION_OBJECT_ROLES.COLLISION,
    parent: 'body',
  },
  [HURT_INTERACTION_OBJECT_KEY]: {
    key: HURT_INTERACTION_OBJECT_KEY,
    role: INTERACTION_OBJECT_ROLES.HURT,
    parent: 'body',
  },
  [ATTACK_INTERACTION_OBJECT_KEY]: {
    key: ATTACK_INTERACTION_OBJECT_KEY,
    role: INTERACTION_OBJECT_ROLES.ATTACK,
    parent: 'weapon',
  },
  [GUARD_INTERACTION_OBJECT_KEY]: {
    key: GUARD_INTERACTION_OBJECT_KEY,
    role: INTERACTION_OBJECT_ROLES.GUARD,
    parent: 'shield',
  },
});

export function isInteractionObjectPartKey(partKey) {
  return INTERACTION_OBJECT_PART_KEYS.includes(partKey);
}

export function interactionObjectParentPartKey(partKey) {
  return INTERACTION_OBJECT_DEFS[partKey]?.parent || null;
}

export function interactionObjectRole(partKey) {
  return INTERACTION_OBJECT_DEFS[partKey]?.role || null;
}

export function interactionObjectPartKeyForRole(role) {
  return INTERACTION_OBJECT_PART_KEYS.find((partKey) => interactionObjectRole(partKey) === role) || null;
}

export function interactionObjectPartKeysForParent(parentKey) {
  return INTERACTION_OBJECT_PART_KEYS.filter((partKey) => interactionObjectParentPartKey(partKey) === parentKey);
}

export function interactionObjectPartKeysForEditFocus(partKey) {
  if (isInteractionObjectPartKey(partKey)) return [partKey];
  return interactionObjectPartKeysForParent(partKey);
}

export function primaryInteractionObjectPartKeyForEditFocus(partKey) {
  const keys = interactionObjectPartKeysForEditFocus(partKey);
  return keys.length === 1 ? keys[0] : partKey;
}

export function interactionObjectParentPart(tuning, partKey) {
  const parentKey = interactionObjectParentPartKey(partKey);
  return parentKey ? tuning.rig?.[parentKey] : null;
}
