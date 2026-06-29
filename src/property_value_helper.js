import { defaultEffectSize } from './animation_frame_data.js';
import { interactionObjectParentPart } from './interaction_object_editor.js';
import { isMasterPart } from './editor_label_helper.js';
import {
  effectFieldLimits,
  isControlGroupPartKey,
  isParentSizedPart,
  poseFieldLimits,
} from './part_source_registry.js';
import {
  SIZE_PERCENT_MAX,
  SIZE_PERCENT_MIN,
  isInteractionToggleProp,
  isSizeProp,
  sizeBaseProp,
} from './editable_property_helper.js';
import { clamp } from './utils.js';

const ACTION_BASE_TRANSFORM_DISPLAY = {
  x: 0,
  y: 0,
  ax: 0,
  ay: 0,
  w: 100,
  h: 100,
  rot: 0,
  active: 0,
  attack: 0,
  hurt: 0,
  collision: 0,
  guard: 0,
  stun: 0,
  knockbackX: 0,
  knockbackY: 0,
  deathBurst: 1,
  pushPower: 0,
};

export function readPartFieldDisplayValue(partKey, part, prop, tuning = null) {
  if (isParentSizedPart(partKey)) return readParentSizedPartFieldDisplayValue(partKey, part, prop, tuning);
  if (isSizeProp(prop)) return partSizeToPercent(partKey, part, prop);
  return part[prop];
}

function readParentSizedPartFieldDisplayValue(partKey, part, prop, tuning) {
  if (!isSizeProp(prop)) return part?.[prop] ?? 0;
  const parentSize = parentSizedPartSizeBase(tuning, partKey, prop, part?.[prop]);
  return sizeValueToPercent(part?.[prop], parentSize);
}

export function parentSizedPartSizeBase(tuning, partKey, prop, fallback) {
  const parent = tuning ? interactionObjectParentPart(tuning, partKey) : null;
  return Math.max(1, Number(parent?.[prop] || parent?.[sizeBaseProp(prop)] || fallback || 1));
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

export function partSizeBase(part, prop, fallbackPart = null) {
  const baseProp = sizeBaseProp(prop);
  return Math.max(1, Number(part?.[baseProp] || fallbackPart?.[baseProp] || part?.[prop] || 1));
}

export function partSizeScale(part, prop, fallbackPart = null) {
  const base = partSizeBase(part, prop, fallbackPart);
  return Math.max(0.001, Number(part?.[prop] || base) / base);
}

export function posePartSizeBase(basePart, prop) {
  return Math.max(0.001, Number(basePart?.[prop] ?? 1));
}

export function sizeValueToPercent(value, baseValue) {
  return (Number(value || baseValue) / baseValue) * 100;
}

export function sizeValueFromPercent(baseValue, percent, minValue = 1) {
  return Math.max(minValue, baseValue * (Number(percent) / 100));
}

export function sizeOffsetToPercent(offset, baseValue) {
  const currentSize = Math.max(0.001, baseValue + Number(offset || 0));
  return sizeValueToPercent(currentSize, baseValue);
}

export function sizeOffsetFromPercent(baseValue, percent) {
  return baseValue * (Number(percent) / 100 - 1);
}

export function scaleValueToPercent(value) {
  return Number(value ?? 1) * 100;
}

export function positiveScaleValue(value, minScale = 0.001) {
  return Math.max(minScale, Number(value || 1));
}

export function scaleValueFromPercent(percent, minScale = SIZE_PERCENT_MIN / 100) {
  return sizeValueFromPercent(1, percent, minScale);
}

export function scaleOffsetToPercent(offset) {
  return (1 + Number(offset || 0)) * 100;
}

export function scaleOffsetFromPercent(percent) {
  return Number(percent) / 100 - 1;
}

export function poseSizeToPercent(partKey, offset, prop, basePart) {
  return actionPartSizeToPercent(partKey, offset, prop, basePart);
}

export function poseSizeOffsetFromPercent(partKey, prop, percent, basePart) {
  return actionPartSizeOffsetFromPercent(partKey, prop, percent, basePart);
}

export function readEffectFrameDisplayValue(effectKey, frame, prop) {
  if (isSizeProp(prop)) return effectSizePercent(effectKey, frame, prop);
  return frame[prop];
}

export function effectFrameValueFromInput(effectKey, prop, value) {
  if (isSizeProp(prop)) return effectSizeFromPercent(effectKey, prop, value);

  const limits = effectFieldLimits(prop);
  return clamp(Number(value), limits.min, limits.max);
}

export function effectSizeBase(effectKey, prop) {
  const base = defaultEffectSize(effectKey);
  return prop === 'w' ? base.w : base.h;
}

export function effectSizePercent(effectKey, frame, prop) {
  const baseValue = effectSizeBase(effectKey, prop);
  return Math.round(sizeValueToPercent(frame[prop], baseValue) * 10) / 10;
}

export function effectSizeFromPercent(effectKey, prop, percent) {
  return sizeValueFromPercent(
    effectSizeBase(effectKey, prop),
    clamp(Number(percent), SIZE_PERCENT_MIN, SIZE_PERCENT_MAX),
    0
  );
}

function readActionBaseTransformDisplayValue(partKey, frameValue, prop, basePart) {
  if (isSizeProp(prop)) return actionPartSizeToPercent(partKey, frameValue, prop, basePart);
  return frameValue?.[prop] ?? ACTION_BASE_TRANSFORM_DISPLAY[prop] ?? 0;
}

function actionBaseTransformValueFromInput(partKey, prop, value, basePart) {
  const limits = poseFieldLimits(prop, partKey);
  const nextValue = clamp(Number(value), limits.min, limits.max);
  if (isInteractionToggleProp(prop)) return nextValue >= 0.5 ? 1 : 0;
  if (isSizeProp(prop)) return actionPartSizeOffsetFromPercent(partKey, prop, nextValue, basePart);
  return nextValue;
}

function actionPartSizeToPercent(partKey, frameValue, prop, basePart) {
  if (isMasterPart(partKey)) return scaleOffsetToPercent(frameValue?.[prop]);

  const baseSize = posePartSizeBase(basePart, prop);
  return sizeOffsetToPercent(frameValue?.[prop], baseSize);
}

function actionPartSizeOffsetFromPercent(partKey, prop, percent, basePart) {
  if (isMasterPart(partKey)) return scaleOffsetFromPercent(percent);

  const baseSize = posePartSizeBase(basePart, prop);
  return sizeOffsetFromPercent(baseSize, percent);
}

function setupPartSizeToPercent(partKey, part, prop) {
  if (isControlGroupPartKey(partKey)) return scaleValueToPercent(part?.[prop]);
  const baseSize = partSizeBase(part, prop);
  return sizeValueToPercent(part?.[prop], baseSize);
}

function setupPartSizeFromPercent(partKey, part, prop, percent) {
  if (isControlGroupPartKey(partKey)) return scaleValueFromPercent(percent);
  const baseSize = partSizeBase(part, prop);
  return sizeValueFromPercent(baseSize, percent);
}
