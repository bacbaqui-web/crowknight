import { INTERACTION_OBJECT_PART_KEYS } from './interaction_object_editor_controller.js';

export const STORAGE_KEY = 'crowKnight.actorTuning.v3';
export const OBSOLETE_STORAGE_KEYS = ['crowKnight.actorTuning.v1', 'crowKnight.actorTuning.v2'];
export const OBSOLETE_TUNING_KEYS = [
  'collisionInteractionBox',
  'hurtInteractionBox',
  'attackInteractionBox',
  'guardInteractionBox',
];
export const OBSOLETE_EFFECT_FRAME_KEYS = ['anchorX', 'anchorY'];
export const RANKING_KEY = 'crowKnight.rankings.v1';
export const SURVIVAL_SCORE_PER_SECOND = 10;
export const KILL_SCORE = 1000;
export const SURVIVAL_SCORE_WEIGHT = 0.3;
export const KILL_SCORE_WEIGHT = 0.7;
export const DEATH_RESULT_DELAY = 2;
export const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyQ', 'KeyW', 'KeyE']);

export const ACTOR_DEFS = [
  {
    id: 'player_01',
    type: 'player',
    label: '까마귀',
    name: '까마귀',
    x: 480,
    folder: 'players/player_01',
    storageFolder: 'players/player_01',
    psdFileName: 'player.psd',
    group: 'players',
    tint: '#7cc3a2',
  },
  {
    id: 'enemy_01',
    type: 'enemy',
    label: '에너미',
    name: '에너미',
    x: 260,
    folder: 'mobs/enemy_01',
    storageFolder: 'mobs/enemy_01',
    psdFileName: 'enemy.psd',
    group: 'mobs',
    tint: '#ef767a',
  },
  {
    id: 'boss_01',
    type: 'enemy',
    label: '보스',
    name: '보스',
    x: 760,
    folder: 'bosses/boss_01',
    storageFolder: 'bosses/boss_01',
    psdFileName: 'enemy.psd',
    group: 'bosses',
    tint: '#9a8df0',
  },
];

export const ACTION_KEYS = [
  'idle',
  'run',
  'jump',
  'doubleJump',
  'sprint',
  'fall',
  'glide',
  'roll',
  'evade',
  'guard',
  'parry',
  'guardBreak',
  'hurt',
  'death',
  'jumpAttack',
  'attack1',
  'attack2',
  'attack3',
];

export const MASTER_PART_KEY = 'master';
export const ACTION_PART_KEYS = [
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
  ...INTERACTION_OBJECT_PART_KEYS,
];
export const ACTION_FRAME_KEYS = ['start', 'end'];
export const ACTION_FPS = 10;
export const ACTION_MIN_FRAMES = 2;
export const ACTION_MAX_FRAMES = 50;
export const EFFECT_KEYS = ACTION_KEYS;
export const EFFECT_IMAGE_OPTIONS = [
  { key: 'none', label: '없음', asset: null },
  { key: 'slash1', label: '베기 1', asset: 'slash1' },
  { key: 'slash2', label: '베기 2', asset: 'slash2' },
  { key: 'slash3', label: '베기 3', asset: 'slash3' },
];

export const TUNING_FIELDS = [
  ['maxHpPips', ['maxHpPips']],
  ['actorScale', ['transform', 'scale']],
  ['hudOffsetY', ['hud', 'offsetY']],
  ['anchorX', ['transform', 'anchorX']],
  ['anchorY', ['transform', 'anchorY']],
];
