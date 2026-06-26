import { speedValueToLevel } from './tuningControlValueTransforms.js';
import { clamp, lerp } from './utils.js';

const RUN_SPEED_MIN = 1;
const RUN_SPEED_MAX = 10;
const RUN_CYCLE_RADIANS_PER_SPEED = 4;
const RUN_BOB_PHASE_MULTIPLIER = 2;
const RUN_BOB_MIN = 0.7;
const RUN_BOB_MAX = 2.4;
const RUN_SHOULDER_SWING = 4;
const RUN_BOB_PART_KEYS = new Set(['head', 'cape', 'body', 'shoulderL', 'shoulderR']);

const RUN_PART_OFFSETS = {
  head: {
    from: { x: 6.3, y: -0.3, rot: 0 },
    to: { x: 65.3, y: 48.7, rot: 0 },
  },
  cape: {
    from: { x: 1.7, y: -5.2, rot: 0 },
    to: { x: 47.6, y: 14.3, rot: 53.1 },
  },
  body: {
    from: { x: 3.1, y: -5.2, rot: 0 },
    to: { x: 0.3, y: -4, rot: 56.5 },
  },
  shoulderR: {
    from: { x: 1.7, y: -0.6, rot: 0 },
    to: { x: 31.4, y: 33.4, rot: 60 },
  },
};

export function runSpeedLevel(player) {
  return clamp(speedValueToLevel(runSpeedValue(player)), RUN_SPEED_MIN, RUN_SPEED_MAX);
}

export function runSpeedRatio(player) {
  return (runSpeedLevel(player) - RUN_SPEED_MIN) / (RUN_SPEED_MAX - RUN_SPEED_MIN);
}

export function runCyclePhase(player) {
  return runCycleTime(player) * runSpeedLevel(player) * RUN_CYCLE_RADIANS_PER_SPEED;
}

export function runBobAmount(player) {
  return Number(player.motion?.walkBob ?? 0) * lerp(RUN_BOB_MIN, RUN_BOB_MAX, runSpeedRatio(player));
}

export function runPartOffset(player, key) {
  if (player.poseKey !== 'run') return null;
  const config = RUN_PART_OFFSETS[key];
  const baseOffset = config ? interpolateRunOffset(config.from, config.to, runSpeedRatio(player)) : null;
  const cycleOffset = runCyclePartOffset(player, key);
  return mergeRunOffsets(baseOffset, cycleOffset);
}

function runCyclePartOffset(player, key) {
  const phase = Math.sin(runCyclePhase(player));
  const bobY = RUN_BOB_PART_KEYS.has(key)
    ? Math.sin(runCyclePhase(player) * RUN_BOB_PHASE_MULTIPLIER) * runBobAmount(player)
    : 0;

  if (key === 'shoulderL' || key === 'shoulderR') {
    const direction = key === 'shoulderL' ? 1 : -1;
    return { x: 0, y: bobY, rot: direction * RUN_SHOULDER_SWING * phase };
  }

  if (key === 'hipL' || key === 'hipR') {
    const ratio = runSpeedRatio(player);
    const center = lerp(0, 20, ratio);
    const amplitude = lerp(10, 50, ratio);
    const rot = key === 'hipL' ? center + amplitude * phase : center - amplitude * phase;
    return { x: 0, y: 0, rot };
  }

  if (bobY) return { x: 0, y: bobY, rot: 0 };
  return null;
}

function interpolateRunOffset(from, to, t) {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    rot: lerp(from.rot, to.rot, t),
  };
}

function mergeRunOffsets(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    x: Number(a.x || 0) + Number(b.x || 0),
    y: Number(a.y || 0) + Number(b.y || 0),
    rot: Number(a.rot || 0) + Number(b.rot || 0),
  };
}

function runCycleTime(player) {
  const preview = player.posePreview;
  if (preview?.pose === 'run' && preview.playing) {
    return (performance.now() - Number(preview.startedAt || performance.now())) / 1000;
  }
  return player.animTime;
}

function runSpeedValue(player) {
  if (player.posePreview?.pose === 'run') return player.speed;
  return Math.abs(Number(player.vx || 0));
}
