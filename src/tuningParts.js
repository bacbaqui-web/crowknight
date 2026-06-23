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
  if (key === 'jumpAttack') return ['attack', 'jumpAttack'];
  if (key.startsWith('attack')) return ['attack', key];
  return [];
}

export function partPositionSources(rig) {
  return {
    body: rig.body,
    head: rig.head,
    cape: rig.cape,
    shield: rig.shield,
    upperArmL: rig.upperArmL,
    lowerArmL: rig.lowerArmL,
    upperArmR: rig.upperArmR,
    lowerArmR: rig.lowerArmR,
    upperLegL: rig.upperLegL,
    lowerLegL: rig.lowerLegL,
    upperLegR: rig.upperLegR,
    lowerLegR: rig.lowerLegR,
    weapon: rig.weapon,
    neck: rig.neck,
    shoulderL: rig.shoulderL,
    shoulderR: rig.shoulderR,
    hipL: rig.hipL,
    hipR: rig.hipR,
  };
}

export function partFieldLimits(prop) {
  if (prop === 'opacity') return { min: 0, max: 1, step: 0.01 };
  if (prop === 'w' || prop === 'h') return { min: 5, max: 300 };
  if (prop === 'ax' || prop === 'ay') return { min: -180, max: 180 };
  if (prop === 'rot') return { min: -180, max: 180 };
  return { min: -180, max: 180 };
}

export function poseFieldLimits(prop) {
  if (prop === 'opacity') return { min: 0, max: 1, step: 0.01 };
  if (prop === 'w' || prop === 'h') return { min: 5, max: 300 };
  if (prop === 'rot') return { min: -180, max: 180 };
  return { min: -180, max: 180 };
}

export function effectFieldLimits(prop) {
  if (prop === 'opacity') return { min: 0, max: 1 };
  if (prop === 'w' || prop === 'h') return { min: 5, max: 300 };
  if (prop === 'rot') return { min: -180, max: 180 };
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
