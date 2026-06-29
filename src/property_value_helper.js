import { defaultEffectSize } from './animation_frame_data.js';
import { interactionObjectParentPart } from './interaction_object_editor.js';
import { isMasterPart } from './editor_label_helper.js';
import { controlGroupPartKeys, effectFieldLimits, isParentSizedPart, poseFieldLimits } from './part_source_registry.js';
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
  const parent = tuning ? interactionObjectParentPart(tuning, partKey) : null;
  const parentSize = Math.max(1, Number(parent?.[prop] || parent?.[sizeBaseProp(prop)] || part?.[prop] || 1));
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
  return Math.round((Number(frame[prop] || baseValue) / baseValue) * 1000) / 10;
}

export function effectSizeFromPercent(effectKey, prop, percent) {
  return effectSizeBase(effectKey, prop) * (clamp(Number(percent), 5, 300) / 100);
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

export function isInteractionToggleProp(prop) {
  return prop === 'active' || prop === 'attack' || prop === 'hurt' || prop === 'collision' || prop === 'guard';
}

export function isSizeProp(prop) {
  return prop === 'w' || prop === 'h';
}

export function sizeBaseProp(prop) {
  return prop === 'w' ? 'baseW' : 'baseH';
}

function actionPartSizeToPercent(partKey, frameValue, prop, basePart) {
  if (isMasterPart(partKey)) return (1 + Number(frameValue?.[prop] || 0)) * 100;

  const baseSize = Math.max(0.001, Number(basePart?.[prop] ?? 1));
  const currentSize = Math.max(0.001, baseSize + Number(frameValue?.[prop] || 0));
  return (currentSize / baseSize) * 100;
}

function actionPartSizeOffsetFromPercent(partKey, prop, percent, basePart) {
  if (isMasterPart(partKey)) return Number(percent) / 100 - 1;

  const baseSize = Math.max(0.001, Number(basePart?.[prop] ?? 1));
  return baseSize * (Number(percent) / 100 - 1);
}

function setupPartSizeToPercent(partKey, part, prop) {
  if (controlGroupPartKeys().includes(partKey)) return Number(part?.[prop] ?? 1) * 100;
  const baseProp = sizeBaseProp(prop);
  const baseSize = Math.max(1, Number(part?.[baseProp] || part?.[prop] || 1));
  return (Number(part?.[prop] || baseSize) / baseSize) * 100;
}

function setupPartSizeFromPercent(partKey, part, prop, percent) {
  const ratio = Number(percent) / 100;
  if (controlGroupPartKeys().includes(partKey)) return Math.max(0.05, ratio);
  const baseProp = sizeBaseProp(prop);
  const baseSize = Math.max(1, Number(part?.[baseProp] || part?.[prop] || 1));
  return Math.max(1, baseSize * ratio);
}
