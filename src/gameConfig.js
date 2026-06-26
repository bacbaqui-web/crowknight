export const STORAGE_KEY = 'crowKnight.actorTuning.v1';
export const RANKING_KEY = 'crowKnight.rankings.v1';
export const SURVIVAL_SCORE_PER_SECOND = 10;
export const KILL_SCORE = 1000;
export const SURVIVAL_SCORE_WEIGHT = 0.3;
export const KILL_SCORE_WEIGHT = 0.7;
export const DEATH_RESULT_DELAY = 1.15;
export const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyQ', 'KeyW', 'KeyE']);

export const ACTOR_DEFS = [
  { id: 'player', label: '주인공', name: '주인공', x: 480, folder: 'player', tint: '#7cc3a2' },
  { id: 'enemy1', label: '적1', name: '적1', x: 180, folder: 'enemy1', tint: '#ef767a' },
  { id: 'enemy2', label: '적2', name: '적2', x: 300, folder: 'enemy2', tint: '#f0b35b' },
  { id: 'enemy3', label: '적3', name: '적3', x: 660, folder: 'enemy3', tint: '#9a8df0' },
  { id: 'enemy4', label: '적4', name: '적4', x: 790, folder: 'enemy4', tint: '#69b7e5' },
];

export const POSE_KEYS = [
  'idle',
  'run',
  'jump',
  'fall',
  'glide',
  'roll',
  'guard',
  'guardBreak',
  'hurt',
  'death',
  'jumpAttack',
  'attack1',
  'attack2',
  'attack3',
];

export const MASTER_PART_KEY = 'master';
export const POSE_PART_KEYS = [
  MASTER_PART_KEY,
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
  'neck',
  'shoulderL',
  'shoulderR',
  'hipL',
  'hipR',
];
export const POSE_FRAME_KEYS = ['start', 'end'];
export const POSE_FPS = 10;
export const POSE_MIN_FRAMES = 2;
export const POSE_MAX_FRAMES = 50;
export const EFFECT_KEYS = POSE_KEYS;
export const EFFECT_IMAGE_OPTIONS = [
  { key: 'none', label: '없음', asset: null },
  { key: 'slash1', label: '베기 1', asset: 'slash1' },
  { key: 'slash2', label: '베기 2', asset: 'slash2' },
  { key: 'slash3', label: '베기 3', asset: 'slash3' },
];

const ANIMATION_INTENSITY_FIELDS = POSE_KEYS.map((key) => [
  `${key}AnimationIntensity`,
  ['motion', 'animationIntensity', key],
]);

export const TUNING_FIELDS = [
  ['maxHpPips', ['maxHpPips']],
  ['speed', ['speed']],
  ['runAcceleration', ['runAcceleration']],
  ['jumpPower', ['jumpPower']],
  ['airFlapPower', ['airFlapPower']],
  ['airFlapCooldown', ['airFlapCooldown']],
  ['glideTimeMax', ['glideTimeMax']],
  ['glideFallSpeed', ['glideFallSpeed']],
  ['dashCooldownMax', ['dashCooldownMax']],
  ['hurtInvuln', ['invulnerability', 'hurt']],
  ['rollEndInvuln', ['invulnerability', 'rollEnd']],
  ['attackCooldownMax', ['attackCooldownMax']],
  ['comboResetTime', ['comboResetTime']],
  ['actorScale', ['transform', 'scale']],
  ['anchorX', ['transform', 'anchorX']],
  ['anchorY', ['transform', 'anchorY']],
  ['hitboxX', ['hitbox', 'x']],
  ['hitboxY', ['hitbox', 'y']],
  ['hitboxW', ['hitbox', 'w']],
  ['hitboxH', ['hitbox', 'h']],
  ['attack1HitboxX', ['attackBoxes', 'attack1', 'x']],
  ['attack1HitboxY', ['attackBoxes', 'attack1', 'y']],
  ['attack1HitboxW', ['attackBoxes', 'attack1', 'w']],
  ['attack1HitboxH', ['attackBoxes', 'attack1', 'h']],
  ['attack1HitboxRot', ['attackBoxes', 'attack1', 'rot']],
  ['attack1Stun', ['attackBoxes', 'attack1', 'stun']],
  ['attack1KnockbackX', ['attackBoxes', 'attack1', 'knockbackX']],
  ['attack1KnockbackY', ['attackBoxes', 'attack1', 'knockbackY']],
  ['attack1DeathBurst', ['attackBoxes', 'attack1', 'deathBurst']],
  ['attack2HitboxX', ['attackBoxes', 'attack2', 'x']],
  ['attack2HitboxY', ['attackBoxes', 'attack2', 'y']],
  ['attack2HitboxW', ['attackBoxes', 'attack2', 'w']],
  ['attack2HitboxH', ['attackBoxes', 'attack2', 'h']],
  ['attack2HitboxRot', ['attackBoxes', 'attack2', 'rot']],
  ['attack2Stun', ['attackBoxes', 'attack2', 'stun']],
  ['attack2KnockbackX', ['attackBoxes', 'attack2', 'knockbackX']],
  ['attack2KnockbackY', ['attackBoxes', 'attack2', 'knockbackY']],
  ['attack2DeathBurst', ['attackBoxes', 'attack2', 'deathBurst']],
  ['attack3HitboxX', ['attackBoxes', 'attack3', 'x']],
  ['attack3HitboxY', ['attackBoxes', 'attack3', 'y']],
  ['attack3HitboxW', ['attackBoxes', 'attack3', 'w']],
  ['attack3HitboxH', ['attackBoxes', 'attack3', 'h']],
  ['attack3HitboxRot', ['attackBoxes', 'attack3', 'rot']],
  ['attack3Stun', ['attackBoxes', 'attack3', 'stun']],
  ['attack3KnockbackX', ['attackBoxes', 'attack3', 'knockbackX']],
  ['attack3KnockbackY', ['attackBoxes', 'attack3', 'knockbackY']],
  ['attack3DeathBurst', ['attackBoxes', 'attack3', 'deathBurst']],
  ['jumpAttackHitboxX', ['attackBoxes', 'jumpAttack', 'x']],
  ['jumpAttackHitboxY', ['attackBoxes', 'jumpAttack', 'y']],
  ['jumpAttackHitboxW', ['attackBoxes', 'jumpAttack', 'w']],
  ['jumpAttackHitboxH', ['attackBoxes', 'jumpAttack', 'h']],
  ['jumpAttackHitboxRot', ['attackBoxes', 'jumpAttack', 'rot']],
  ['jumpAttackStun', ['attackBoxes', 'jumpAttack', 'stun']],
  ['jumpAttackKnockbackX', ['attackBoxes', 'jumpAttack', 'knockbackX']],
  ['jumpAttackKnockbackY', ['attackBoxes', 'jumpAttack', 'knockbackY']],
  ['jumpAttackDeathBurst', ['attackBoxes', 'jumpAttack', 'deathBurst']],
  ['rollHitboxX', ['attackBoxes', 'roll', 'x']],
  ['rollHitboxY', ['attackBoxes', 'roll', 'y']],
  ['rollHitboxW', ['attackBoxes', 'roll', 'w']],
  ['rollHitboxH', ['attackBoxes', 'roll', 'h']],
  ['rollHitboxRot', ['attackBoxes', 'roll', 'rot']],
  ['rollStun', ['attackBoxes', 'roll', 'stun']],
  ['rollKnockbackX', ['attackBoxes', 'roll', 'knockbackX']],
  ['rollKnockbackY', ['attackBoxes', 'roll', 'knockbackY']],
  ['rollDeathBurst', ['attackBoxes', 'roll', 'deathBurst']],
  ...ANIMATION_INTENSITY_FIELDS,
  ['walkBob', ['motion', 'walkBob']],
  ['rollIntensity', ['motion', 'rollIntensity']],
  ['rollWeapon', ['motion', 'rollWeapon']],
  ['rollGhostCount', ['motion', 'rollGhostCount']],
  ['rollGhostInterval', ['motion', 'rollGhostInterval']],
  ['rollGhostLife', ['motion', 'rollGhostLife']],
  ['rollGhostOpacity', ['motion', 'rollGhostOpacity']],
];
