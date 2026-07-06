import { isMasterPart } from './editor_label_helper.js';
import {
  SIZE_PERCENT_MAX,
  SIZE_PERCENT_MIN,
  anchorOffsetProp,
  anchorSizeProp,
  isAnchorProp,
  isSizeProp,
} from './editable_property_helper.js';
import {
  parentSizedPartSizeBase,
  partSizeBase,
  partSizeFromPercent,
  partSizeScale,
  actionPartSizeBase,
  positiveScaleValue,
  sizeValueFromPercent,
} from './property_value_helper.js';
import { imagePartKeys, isControlGroupPartKey, isParentSizedPart, partFieldLimits } from './part_source_data.js';
import { clamp } from './common_helper.js';

export function isGroupScalablePart(part) {
  return imagePartKeys().includes(part) || isControlGroupPartKey(part) || isParentSizedPart(part) || isMasterPart(part);
}

export function setCanvasVisualValue(drag, prop, value) {
  const nextValue = isSizeProp(prop) ? clampCanvasVisualSize(drag, prop, value) : value;

  if (drag.context === 'action') {
    writeActionCanvasVisualValue(drag, prop, nextValue);
    return;
  }

  writeDirectCanvasVisualValue(drag, prop, nextValue);
}

function writeActionCanvasVisualValue(drag, prop, value) {
  const baseValue = Number(drag.base?.[prop] || 0);
  const offset = value - baseValue;
  if (typeof drag.writeActionFrameValue === 'function') {
    drag.writeActionFrameValue(drag.part, prop, offset);
    return;
  }
  drag.target[prop] = offset;
}

function writeDirectCanvasVisualValue(drag, prop, value) {
  if (typeof drag.writeValue === 'function') {
    drag.writeValue(prop, value);
    return;
  }

  drag.target[prop] = value;
}

export function canvasSizeDelta(drag, prop, delta) {
  const base = canvasSizePercentBase(drag, prop);
  if (isParentSizedPart(drag.part)) return delta;
  if (usesScaledCanvasSizeDelta(drag.part)) return (delta / 80) * base;
  return delta;
}

export function clampCanvasVisualSize(drag, prop, value) {
  const limits = canvasVisualSizeLimits(drag, prop);
  return clamp(Number(value), limits.min, limits.max);
}

export function canvasSizePercentBase(drag, prop) {
  if (drag.context === 'action') {
    return actionPartSizeBase(drag.base, prop);
  }
  if (isControlGroupPartKey(drag.part)) return 1;
  return canvasDirectSizeBase(drag, prop);
}

function canvasVisualSizeLimits(drag, prop) {
  if (isParentSizedPart(drag.part)) {
    const limits = partFieldLimits(prop, drag.part);
    return { min: limits.min, max: limits.max };
  }

  const base = canvasSizePercentBase(drag, prop);
  return {
    min: sizeValueFromPercent(base, SIZE_PERCENT_MIN, 0),
    max: sizeValueFromPercent(base, SIZE_PERCENT_MAX, 0),
  };
}

function canvasDirectSizeBase(drag, prop) {
  return partSizeBase(drag.target, prop, drag.base);
}

function usesScaledCanvasSizeDelta(partKey) {
  return isMasterPart(partKey) || isControlGroupPartKey(partKey);
}

export function setPartAnchorValue(part, prop, value, partKey) {
  const limits = partFieldLimits(prop, partKey);
  const nextValue = clamp(Number(value), limits.min, limits.max);
  const previousValue = Number(part[prop] || 0);
  const delta = nextValue - previousValue;
  const scale = anchorScaleForPart(part, prop, partKey);
  const offsetProp = anchorOffsetProp(prop);

  part[prop] = nextValue;
  part[offsetProp] = Number(part[offsetProp] || 0) + delta * (scale - 1);
  return part[prop];
}

export function anchorScaleForPart(part, prop, partKey = '') {
  const sizeProp = anchorSizeProp(prop);
  if (isControlGroupPartKey(partKey)) return positiveScaleValue(part[sizeProp]);
  return partSizeScale(part, sizeProp);
}

export function updateRigPartValue(part, partKey, prop, value, tuning = null) {
  const limits = partFieldLimits(prop, partKey);
  const nextValue = clamp(Number(value), limits.min, limits.max);
  if (isParentSizedPart(partKey)) {
    updateParentSizedPartValue(part, partKey, prop, nextValue, tuning);
  } else if (isAnchorProp(prop)) {
    setPartAnchorValue(part, prop, nextValue, partKey);
  } else if (isSizeProp(prop)) {
    part[prop] = partSizeFromPercent(partKey, part, prop, nextValue);
  } else {
    part[prop] = nextValue;
  }
}

function updateParentSizedPartValue(part, partKey, prop, value, tuning) {
  if (isSizeProp(prop)) {
    const parentSize = parentSizedPartSizeBase(tuning, partKey, prop, part[prop]);
    part[prop] = sizeValueFromPercent(parentSize, value);
    return;
  }
  part[prop] = value;
}
