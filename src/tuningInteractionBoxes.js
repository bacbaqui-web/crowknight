export const COLLISION_INTERACTION_BOX_KEY = 'collisionInteractionBox';
export const ATTACK_INTERACTION_BOX_KEY = 'attackInteractionBox';
export const HURT_INTERACTION_BOX_KEY = 'hurtInteractionBox';
export const GUARD_INTERACTION_BOX_KEY = 'guardInteractionBox';
export const INTERACTION_BOX_PART_TYPE = 'interactionBox';
export const INTERACTION_BOX_TARGET_TYPE = INTERACTION_BOX_PART_TYPE;

export const INTERACTION_BOX_ROLES = Object.freeze({
  COLLISION: 'collision',
  HURT: 'hurt',
  ATTACK: 'attack',
  GUARD: 'guard',
});

export const INTERACTION_BOX_PART_KEYS = [
  COLLISION_INTERACTION_BOX_KEY,
  HURT_INTERACTION_BOX_KEY,
  ATTACK_INTERACTION_BOX_KEY,
  GUARD_INTERACTION_BOX_KEY,
];

export const INTERACTION_BOX_DEFS = Object.freeze({
  [COLLISION_INTERACTION_BOX_KEY]: {
    key: COLLISION_INTERACTION_BOX_KEY,
    role: INTERACTION_BOX_ROLES.COLLISION,
    parent: 'body',
  },
  [HURT_INTERACTION_BOX_KEY]: {
    key: HURT_INTERACTION_BOX_KEY,
    role: INTERACTION_BOX_ROLES.HURT,
    parent: 'body',
  },
  [ATTACK_INTERACTION_BOX_KEY]: {
    key: ATTACK_INTERACTION_BOX_KEY,
    role: INTERACTION_BOX_ROLES.ATTACK,
    parent: 'weapon',
  },
  [GUARD_INTERACTION_BOX_KEY]: {
    key: GUARD_INTERACTION_BOX_KEY,
    role: INTERACTION_BOX_ROLES.GUARD,
    parent: 'shield',
  },
});

export function isInteractionBoxPartKey(partKey) {
  return INTERACTION_BOX_PART_KEYS.includes(partKey);
}

export function interactionBoxPartSources(tuning) {
  return {
    [COLLISION_INTERACTION_BOX_KEY]: tuning.rig?.[COLLISION_INTERACTION_BOX_KEY],
    [ATTACK_INTERACTION_BOX_KEY]: tuning.rig?.[ATTACK_INTERACTION_BOX_KEY],
    [HURT_INTERACTION_BOX_KEY]: tuning.rig?.[HURT_INTERACTION_BOX_KEY],
    [GUARD_INTERACTION_BOX_KEY]: tuning.rig?.[GUARD_INTERACTION_BOX_KEY],
  };
}

export function interactionBoxParentPartKey(partKey) {
  return INTERACTION_BOX_DEFS[partKey]?.parent || null;
}

export function interactionBoxPartKeysForParent(parentKey) {
  return INTERACTION_BOX_PART_KEYS.filter((partKey) => interactionBoxParentPartKey(partKey) === parentKey);
}

export function interactionBoxParentPart(tuning, partKey) {
  const parentKey = interactionBoxParentPartKey(partKey);
  return parentKey ? tuning.rig?.[parentKey] : null;
}
