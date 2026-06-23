import { EFFECT_IMAGE_OPTIONS } from './gameConfig.js';
import { clamp, lerp } from './utils.js';

export function interpolateEffectFrameValues(keyframes = [], t = 0, key = 'attack1') {
  const empty = effectFrameValue({}, key);
  const frames = keyframes
    .map((frame) => ({ ...effectFrameValue(frame, key), id: frame.id, t: clamp(Number(frame.t), 0, 1) }))
    .sort((a, b) => a.t - b.t);
  if (!frames.length) return empty;
  if (t <= frames[0].t) return effectFrameValue(frames[0], key);
  if (t >= frames.at(-1).t) return effectFrameValue(frames.at(-1), key);

  for (let index = 0; index < frames.length - 1; index += 1) {
    const a = frames[index];
    const b = frames[index + 1];
    if (t < a.t || t > b.t) continue;
    const localT = (t - a.t) / Math.max(0.0001, b.t - a.t);
    return {
      x: lerp(a.x || 0, b.x || 0, localT),
      y: lerp(a.y || 0, b.y || 0, localT),
      w: lerp(a.w || 0, b.w || 0, localT),
      h: lerp(a.h || 0, b.h || 0, localT),
      rot: lerp(a.rot || 0, b.rot || 0, localT),
      opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, localT),
      anchorX: lerp(a.anchorX || 0, b.anchorX || 0, localT),
      anchorY: lerp(a.anchorY || 0, b.anchorY || 0, localT),
    };
  }

  return empty;
}

export function effectFrameValue(value = {}, key = 'attack1') {
  const size = defaultEffectSize(key);
  const scale = Number(value?.scale ?? 1);
  const w = value?.w !== undefined ? Number(value.w) : size.w * scale;
  const h = value?.h !== undefined ? Number(value.h) : size.h * scale;
  return {
    x: Number(value?.x || 0),
    y: Number(value?.y || 0),
    w: Number.isFinite(w) ? w : size.w,
    h: Number.isFinite(h) ? h : size.h,
    rot: Number(value?.rot || 0),
    opacity: Number(value?.opacity ?? 1),
    anchorX: Number(value?.anchorX || 0),
    anchorY: Number(value?.anchorY || 0),
  };
}

export function defaultEffectSize(key = 'attack1') {
  if (key === 'attack3') return { w: 176, h: 112 };
  if (key === 'jumpAttack') return { w: 154, h: 96 };
  return { w: 144, h: 84 };
}

export function defaultEffectImageKey(key = '') {
  if (key === 'attack1') return 'slash1';
  if (key === 'attack2' || key === 'jumpAttack') return 'slash2';
  if (key === 'attack3') return 'slash3';
  return 'none';
}

export function validEffectImageKey(key) {
  return EFFECT_IMAGE_OPTIONS.some((option) => option.key === key);
}

export function poseAnchorValue(value = {}, fallback = frameValue()) {
  let source = fallback;
  if (value?.anchorX !== undefined || value?.anchorY !== undefined) {
    source = value;
  } else if (value?.start?.anchorX !== undefined || value?.start?.anchorY !== undefined) {
    source = value.start;
  } else if (Array.isArray(value?.keyframes)) {
    source = value.keyframes.find((frame) => frame?.anchorX !== undefined || frame?.anchorY !== undefined) || fallback;
  }

  return {
    anchorX: Number(source?.anchorX || 0),
    anchorY: Number(source?.anchorY || 0),
  };
}

export function syncFrameAliases(frames) {
  const start = frames.keyframes?.find((frame) => frame.id === 'start');
  const end = frames.keyframes?.find((frame) => frame.id === 'end');
  if (start) {
    start.t = 0;
    frames.start = frameValue(start);
  }
  if (end) {
    end.t = 1;
    frames.end = frameValue(end);
  }
}

export function interpolateFrameValues(keyframes = [], t = 0) {
  const empty = frameValue();
  const frames = keyframes.map((frame) => ({ ...frame, t: clamp(Number(frame.t), 0, 1) })).sort((a, b) => a.t - b.t);
  if (!frames.length) return empty;
  if (t <= frames[0].t) return frameValue(frames[0]);
  if (t >= frames.at(-1).t) return frameValue(frames.at(-1));

  for (let index = 0; index < frames.length - 1; index += 1) {
    const a = frames[index];
    const b = frames[index + 1];
    if (t < a.t || t > b.t) continue;
    const localT = (t - a.t) / Math.max(0.0001, b.t - a.t);
    return {
      x: lerp(a.x || 0, b.x || 0, localT),
      y: lerp(a.y || 0, b.y || 0, localT),
      w: lerp(a.w || 0, b.w || 0, localT),
      h: lerp(a.h || 0, b.h || 0, localT),
      rot: lerp(a.rot || 0, b.rot || 0, localT),
      opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, localT),
      anchorX: lerp(a.anchorX || 0, b.anchorX || 0, localT),
      anchorY: lerp(a.anchorY || 0, b.anchorY || 0, localT),
    };
  }

  return empty;
}

export function frameValue(value = {}) {
  return {
    x: Number(value?.x || 0),
    y: Number(value?.y || 0),
    w: Number(value?.w || 0),
    h: Number(value?.h || 0),
    rot: Number(value?.rot || 0),
    opacity: Number(value?.opacity ?? 1),
    anchorX: Number(value?.anchorX || 0),
    anchorY: Number(value?.anchorY || 0),
  };
}
