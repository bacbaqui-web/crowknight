import {
  actionBaseTransformValueFromInput,
  actionPartSizeOffsetFromPercent,
  actionPartSizeToPercent,
  readActionBaseTransformDisplayValue,
  setupPartSizeFromPercent,
  setupPartSizeToPercent,
} from './actionBaseTransform.js';
import { interactionObjectParentPart, isInteractionObjectPartKey } from './tuningInteractionObjects.js';

export function readPartFieldDisplayValue(partKey, part, prop, tuning = null) {
  if (isInteractionObjectPartKey(partKey)) return readInteractionObjectFieldDisplayValue(partKey, part, prop, tuning);
  if (prop === 'w' || prop === 'h') return partSizeToPercent(partKey, part, prop);
  return part[prop];
}

function readInteractionObjectFieldDisplayValue(partKey, part, prop, tuning) {
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
