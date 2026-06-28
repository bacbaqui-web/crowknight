import { isMasterPart } from './tuningLabels.js';
import { controlGroupPartKeys, poseFieldLimits } from './tuningParts.js';
import { clamp } from './utils.js';

export const ACTION_BASE_TRANSFORM_DISPLAY = {
  x: 0,
  y: 0,
  ax: 0,
  ay: 0,
  w: 100,
  h: 100,
  rot: 0,
  active: 0,
  stun: 0,
  knockbackX: 0,
  knockbackY: 0,
  deathBurst: 1,
};

export function readActionBaseTransformDisplayValue(partKey, frameValue, prop, basePart) {
  if (prop === 'w' || prop === 'h') return actionPartSizeToPercent(partKey, frameValue, prop, basePart);
  return frameValue?.[prop] ?? ACTION_BASE_TRANSFORM_DISPLAY[prop] ?? 0;
}

export function actionBaseTransformValueFromInput(partKey, prop, value, basePart) {
  const limits = poseFieldLimits(prop, partKey);
  const nextValue = clamp(Number(value), limits.min, limits.max);
  if (prop === 'active') return nextValue >= 0.5 ? 1 : 0;
  if (prop === 'w' || prop === 'h') return actionPartSizeOffsetFromPercent(partKey, prop, nextValue, basePart);
  return nextValue;
}

export function actionPartSizeToPercent(partKey, frameValue, prop, basePart) {
  if (isMasterPart(partKey)) return (1 + Number(frameValue?.[prop] || 0)) * 100;

  const baseSize = Math.max(0.001, Number(basePart?.[prop] ?? 1));
  const currentSize = Math.max(0.001, baseSize + Number(frameValue?.[prop] || 0));
  return (currentSize / baseSize) * 100;
}

export function actionPartSizeOffsetFromPercent(partKey, prop, percent, basePart) {
  if (isMasterPart(partKey)) return Number(percent) / 100 - 1;

  const baseSize = Math.max(0.001, Number(basePart?.[prop] ?? 1));
  return baseSize * (Number(percent) / 100 - 1);
}

export function setupPartSizeToPercent(partKey, part, prop) {
  if (controlGroupPartKeys().includes(partKey)) return Number(part?.[prop] ?? 1) * 100;
  const baseProp = prop === 'w' ? 'baseW' : 'baseH';
  const baseSize = Math.max(1, Number(part?.[baseProp] || part?.[prop] || 1));
  return (Number(part?.[prop] || baseSize) / baseSize) * 100;
}

export function setupPartSizeFromPercent(partKey, part, prop, percent) {
  const ratio = Number(percent) / 100;
  if (controlGroupPartKeys().includes(partKey)) return Math.max(0.05, ratio);
  const baseProp = prop === 'w' ? 'baseW' : 'baseH';
  const baseSize = Math.max(1, Number(part?.[baseProp] || part?.[prop] || 1));
  return Math.max(1, baseSize * ratio);
}
