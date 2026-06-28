export const COLLISION_INTERACTION_BOX_KEY = 'collisionBox';
export const ATTACK_INTERACTION_BOX_KEY = 'weaponHitbox';
export const HURT_INTERACTION_BOX_KEY = 'hurtHitbox';
export const GUARD_INTERACTION_BOX_KEY = 'shieldHitbox';
export const INTERACTION_BOX_PART_TYPE = 'interactionBox';
export const INTERACTION_BOX_TARGET_TYPE = INTERACTION_BOX_PART_TYPE;
export const LEGACY_INTERACTION_BOX_TARGET_TYPE = 'hitbox';
export const RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY = 'hitbox';
export const RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY = 'shieldHitbox';
export const RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY = 'attackBoxes';
export const PRIMARY_ATTACK_INTERACTION_BOX_MIRROR_KEY = 'attack1';
export const LEGACY_ATTACK_BOX_MIRROR_KEY = 'attackBox';

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
    [COLLISION_INTERACTION_BOX_KEY]: tuning.rig?.collisionBox || tuning.collisionBox,
    [ATTACK_INTERACTION_BOX_KEY]:
      tuning.rig?.[ATTACK_INTERACTION_BOX_KEY] ||
      tuning[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY]?.[PRIMARY_ATTACK_INTERACTION_BOX_MIRROR_KEY],
    [HURT_INTERACTION_BOX_KEY]:
      tuning.rig?.[HURT_INTERACTION_BOX_KEY] || tuning[RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY],
    [GUARD_INTERACTION_BOX_KEY]:
      tuning.rig?.[GUARD_INTERACTION_BOX_KEY] || tuning[RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY],
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

export function syncRuntimeInteractionBoxesFromRig(tuning) {
  const sources = interactionBoxPartSources(tuning);
  tuning.collisionBox = runtimeActorLocalInteractionBox(
    tuning,
    COLLISION_INTERACTION_BOX_KEY,
    sources[COLLISION_INTERACTION_BOX_KEY]
  );
  tuning[RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY] = runtimeActorLocalInteractionBox(
    tuning,
    HURT_INTERACTION_BOX_KEY,
    sources[HURT_INTERACTION_BOX_KEY]
  );
  tuning[RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY] = runtimeActorLocalInteractionBox(
    tuning,
    GUARD_INTERACTION_BOX_KEY,
    sources[GUARD_INTERACTION_BOX_KEY]
  );

  tuning[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY] ||= {};
  tuning[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY][PRIMARY_ATTACK_INTERACTION_BOX_MIRROR_KEY] = {
    ...(tuning[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY][PRIMARY_ATTACK_INTERACTION_BOX_MIRROR_KEY] || {}),
    ...runtimeAttackInteractionBoxMirror(sources[ATTACK_INTERACTION_BOX_KEY]),
  };
}

function runtimeActorLocalInteractionBox(tuning, partKey, source = {}) {
  const parent = interactionBoxParentPart(tuning, partKey);
  return {
    x: Number(parent?.x || 0) + Number(source.x || 0),
    y: Number(parent?.y || 0) + Number(source.y || 0),
    w: Math.max(1, Number(source.w || parent?.w || 1)),
    h: Math.max(1, Number(source.h || parent?.h || 1)),
    rot: Number(parent?.rot || 0) + Number(source.rot || 0),
  };
}

function runtimeAttackInteractionBoxMirror(source = {}) {
  return {
    x: Number(source.x || 0),
    y: Number(source.y || 0),
    w: Math.max(1, Number(source.w || 1)),
    h: Math.max(1, Number(source.h || 1)),
    rot: Number(source.rot || 0),
  };
}
