import {
  actionBaseTransformValueFromInput,
  actionPartSizeOffsetFromPercent,
  actionPartSizeToPercent,
  readActionBaseTransformDisplayValue,
  setupPartSizeFromPercent,
  setupPartSizeToPercent,
} from './actionBaseTransform.js';
import { defaultEffectSize } from './animationFrames.js';
import { interactionObjectParentPart } from './tuningInteractionObjects.js';
import { effectFieldLimits, isParentSizedPart } from './tuningParts.js';
import { clamp } from './utils.js';

export function readPartFieldDisplayValue(partKey, part, prop, tuning = null) {
  if (isParentSizedPart(partKey)) return readParentSizedPartFieldDisplayValue(partKey, part, prop, tuning);
  if (prop === 'w' || prop === 'h') return partSizeToPercent(partKey, part, prop);
  return part[prop];
}

function readParentSizedPartFieldDisplayValue(partKey, part, prop, tuning) {
  if (prop !== 'w' && prop !== 'h') return part?.[prop] ?? 0;
  const parent = tuning ? interactionObjectParentPart(tuning, partKey) : null;
  const parentSize = Math.max(
    1,
    Number(parent?.[prop] || parent?.[prop === 'w' ? 'baseW' : 'baseH'] || part?.[prop] || 1)
  );
  return (Number(part?.[prop] || parentSize) / parentSize) * 100;
}

export function readPoseFrameDisplayValue(partKey, offset, prop, basePart) {
  return readActionBaseTransformDisplayValue(partKey, offset, prop, basePart);
}

export function poseFrameValueFromInput(partKey, prop, value, basePart) {
  return actionBaseTransformValueFromInput(partKey, prop, value, basePart);
}

export function partSizeToPercent(partKey, part, prop) {
  return setupPartSizeToPercent(partKey, part, prop);
}

export function partSizeFromPercent(partKey, part, prop, percent) {
  return setupPartSizeFromPercent(partKey, part, prop, percent);
}

export function poseSizeToPercent(partKey, offset, prop, basePart) {
  return actionPartSizeToPercent(partKey, offset, prop, basePart);
}

export function poseSizeOffsetFromPercent(partKey, prop, percent, basePart) {
  return actionPartSizeOffsetFromPercent(partKey, prop, percent, basePart);
}

export function readEffectFrameDisplayValue(effectKey, frame, prop) {
  if (prop === 'w' || prop === 'h') return effectSizePercent(effectKey, frame, prop);
  return frame[prop];
}

export function effectFrameValueFromInput(effectKey, prop, value) {
  if (prop === 'w' || prop === 'h') return effectSizeFromPercent(effectKey, prop, value);

  const limits = effectFieldLimits(prop);
  return clamp(Number(value), limits.min, limits.max);
}

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
