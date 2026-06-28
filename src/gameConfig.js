import { HURT_INTERACTION_BOX_KEY, INTERACTION_BOX_PART_KEYS } from './tuningInteractionBoxes.js';

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
  ...INTERACTION_BOX_PART_KEYS,
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
  ['hudOffsetY', ['hud', 'offsetY']],
  ['anchorX', ['transform', 'anchorX']],
  ['anchorY', ['transform', 'anchorY']],
  ['hurtInteractionBoxX', ['rig', HURT_INTERACTION_BOX_KEY, 'x']],
  ['hurtInteractionBoxY', ['rig', HURT_INTERACTION_BOX_KEY, 'y']],
  ['hurtInteractionBoxW', ['rig', HURT_INTERACTION_BOX_KEY, 'w']],
  ['hurtInteractionBoxH', ['rig', HURT_INTERACTION_BOX_KEY, 'h']],
  ['walkBob', ['motion', 'walkBob']],
  ['rollIntensity', ['motion', 'rollIntensity']],
  ['rollWeapon', ['motion', 'rollWeapon']],
  ['rollGhostCount', ['motion', 'rollGhostCount']],
  ['rollGhostInterval', ['motion', 'rollGhostInterval']],
  ['rollGhostLife', ['motion', 'rollGhostLife']],
  ['rollGhostOpacity', ['motion', 'rollGhostOpacity']],
];
