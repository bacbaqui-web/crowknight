import { defaultEffectSize } from './animationFrames.js';
import { clamp } from './utils.js';

export function effectSizeBase(effectKey, prop) {
  const base = defaultEffectSize(effectKey);
  return prop === 'w' ? base.w : base.h;
}

export function effectSizePercent(effectKey, frame, prop) {
  const baseValue = effectSizeBase(effectKey, prop);
  return Math.round((Number(frame[prop] || baseValue) / baseValue) * 1000) / 10;
}

export function effectSizeFromPercent(effectKey, prop, percent) {
  return effectSizeBase(effectKey, prop) * (clamp(Number(percent), 5, 300) / 100);
}

export function clampEffectFrameSize(effectKey, prop, value) {
  const baseValue = effectSizeBase(effectKey, prop);
  return clamp(Number(value), baseValue * 0.05, baseValue * 3);
}
