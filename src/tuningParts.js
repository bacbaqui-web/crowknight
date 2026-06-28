import {
  ATTACK_INTERACTION_BOX_KEY,
  COLLISION_INTERACTION_BOX_KEY,
  GUARD_INTERACTION_BOX_KEY,
  HURT_INTERACTION_BOX_KEY,
  isInteractionBoxPartKey,
} from './tuningInteractionBoxes.js';
import { MASTER_PART_KEY } from './gameConfig.js';
import { selectionPaletteKeys } from './tuningSelectionPalette.js';

export function poseMotionGroups(key) {
  if (key === 'idle') return ['idle'];
  if (key === 'run') return ['run'];
  if (key === 'jump') return ['jump'];
  if (key === 'fall') return ['fall'];
  if (key === 'glide') return ['glide'];
  if (key === 'roll') return ['roll'];
  if (key === 'guard') return ['guard'];
  if (key === 'guardBreak') return ['guardBreak'];
  if (key === 'hurt') return ['hurt'];
  if (key === 'death') return ['death'];
  if (key === 'jumpAttack') return ['attack', 'jumpAttack'];
  if (key.startsWith('attack')) return ['attack', key];
  return [];
}

export function partPositionSources(rig) {
  return {
    body: rig.body,
    [COLLISION_INTERACTION_BOX_KEY]: rig[COLLISION_INTERACTION_BOX_KEY],
    [HURT_INTERACTION_BOX_KEY]: rig[HURT_INTERACTION_BOX_KEY],
    head: rig.head,
    cape: rig.cape,
    shield: rig.shield,
    [GUARD_INTERACTION_BOX_KEY]: rig[GUARD_INTERACTION_BOX_KEY],
    upperArmL: rig.upperArmL,
    lowerArmL: rig.lowerArmL,
    upperArmR: rig.upperArmR,
    lowerArmR: rig.lowerArmR,
    upperLegL: rig.upperLegL,
    lowerLegL: rig.lowerLegL,
    upperLegR: rig.upperLegR,
    lowerLegR: rig.lowerLegR,
    weapon: rig.weapon,
    [ATTACK_INTERACTION_BOX_KEY]: rig[ATTACK_INTERACTION_BOX_KEY],
    neck: rig.neck,
    shoulderL: rig.shoulderL,
    shoulderR: rig.shoulderR,
    hipL: rig.hipL,
    hipR: rig.hipR,
  };
}

export function partEditSources(tuning) {
  return {
    [MASTER_PART_KEY]: characterBasisSource(tuning),
    ...partPositionSources(tuning.rig),
  };
}

export function partEditKeys(rig) {
  const sourceKeys = new Set([...Object.keys(partPositionSources(rig))]);
  return [MASTER_PART_KEY, ...selectionPaletteKeys().filter((key) => sourceKeys.has(key))];
}

function characterBasisSource(tuning) {
  const transform = tuning.transform;
  return {
    get anchorX() {
      return Number(transform.anchorX || 0);
    },
    set anchorX(value) {
      transform.anchorX = value;
    },
    get anchorY() {
      return Number(transform.anchorY || 0);
    },
    set anchorY(value) {
      transform.anchorY = value;
    },
  };
}

export function partFieldLimits(prop, partKey = '') {
  if (isInteractionBoxPartKey(partKey)) {
    if (prop === 'w' || prop === 'h') return { min: 1, max: 320 };
    if (prop === 'rot') return { min: -360, max: 360 };
    return { min: -260, max: 260 };
  }
  if (prop === 'opacity') return { min: 0, max: 1, step: 0.01 };
  if (prop === 'w' || prop === 'h') return { min: 5, max: 300 };
  if (prop === 'ax' || prop === 'ay') return { min: -180, max: 180 };
  if (prop === 'rot') return { min: -36000, max: 36000 };
  return { min: -180, max: 180 };
}

export function poseFieldLimits(prop) {
  if (prop === 'active' || prop === 'attack' || prop === 'hurt' || prop === 'collision' || prop === 'guard') {
    return { min: 0, max: 1, step: 1 };
  }
  if (prop === 'stun') return { min: 0, max: 2, step: 0.01 };
  if (prop === 'deathBurst') return { min: 0, max: 4, step: 0.01 };
  if (prop === 'knockbackX' || prop === 'knockbackY') return { min: -1200, max: 1200 };
  if (prop === 'pushPower') return { min: 0, max: 1200 };
  if (prop === 'opacity') return { min: 0, max: 1, step: 0.01 };
  if (prop === 'w' || prop === 'h') return { min: 5, max: 300 };
  if (prop === 'rot') return { min: -36000, max: 36000 };
  return { min: -180, max: 180 };
}

export function effectFieldLimits(prop) {
  if (prop === 'opacity') return { min: 0, max: 1 };
  if (prop === 'w' || prop === 'h') return { min: 5, max: 300 };
  if (prop === 'rot') return { min: -36000, max: 36000 };
  return { min: -260, max: 260 };
}

export function imagePartKeys() {
  return [
    'body',
    'head',
    'cape',
    'shield',
    'upperArmL',
    'lowerArmL',
    'upperArmR',
    'lowerArmR',
    'upperLegL',
    'lowerLegL',
    'upperLegR',
    'lowerLegR',
    'weapon',
  ];
}

export function controlGroupPartKeys() {
  return ['shoulderL', 'shoulderR', 'hipL', 'hipR'];
}
