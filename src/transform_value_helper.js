import { isMasterPart } from './editor_label_helper.js';
import { interactionObjectParentPart } from './interaction_object_editor.js';
import { isSizeProp, partSizeFromPercent, sizeBaseProp } from './property_value_helper.js';
import { controlGroupPartKeys, imagePartKeys, isParentSizedPart, partFieldLimits } from './part_source_registry.js';
import { clamp } from './utils.js';

export function isGroupScalablePart(part) {
  return imagePartKeys().includes(part) || isControlGroupPart(part) || isParentSizedPart(part) || isMasterPart(part);
}

export function setCanvasVisualValue(drag, prop, value) {
  const nextValue = isSizeProp(prop) ? clampCanvasVisualSize(drag, prop, value) : value;

  if (drag.context === 'pose') {
    writePoseCanvasVisualValue(drag, prop, nextValue);
    return;
  }

  writeDirectCanvasVisualValue(drag, prop, nextValue);
}

function writePoseCanvasVisualValue(drag, prop, value) {
  const baseValue = Number(drag.base?.[prop] || 0);
  const offset = value - baseValue;
  if (typeof drag.writePoseFrameValue === 'function') {
    drag.writePoseFrameValue(drag.part, prop, offset);
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
  if (drag.context === 'pose') {
    return Math.max(0.001, Number(drag.base?.[prop] ?? 1));
  }
  if (isControlGroupPart(drag.part)) return 1;
  return canvasDirectSizeBase(drag, prop);
}

function canvasVisualSizeLimits(drag, prop) {
  if (isParentSizedPart(drag.part)) {
    const limits = partFieldLimits(prop, drag.part);
    return { min: limits.min, max: limits.max };
  }

  const base = canvasSizePercentBase(drag, prop);
  return { min: base * 0.05, max: base * 3 };
}

function canvasDirectSizeBase(drag, prop) {
  const baseProp = sizeBaseProp(prop);
  return Math.max(1, Number(drag.target?.[baseProp] || drag.base?.[baseProp] || drag.target?.[prop] || 1));
}

function usesScaledCanvasSizeDelta(partKey) {
  return isMasterPart(partKey) || isControlGroupPart(partKey);
}

function isControlGroupPart(partKey) {
  return controlGroupPartKeys().includes(partKey);
}

export function setPartAnchorValue(part, prop, value, partKey) {
  const limits = partFieldLimits(prop, partKey);
  const nextValue = clamp(Number(value), limits.min, limits.max);
  const previousValue = Number(part[prop] || 0);
  const delta = nextValue - previousValue;
  const offsetProp = prop === 'ax' ? 'anchorOffsetX' : 'anchorOffsetY';
  const scale = anchorScaleForPart(part, prop, partKey);

  part[prop] = nextValue;
  part[offsetProp] = Number(part[offsetProp] || 0) + delta * (scale - 1);
  return part[prop];
}

export function anchorScaleForPart(part, prop, partKey = '') {
  const sizeProp = prop === 'ax' ? 'w' : 'h';
  if (isControlGroupPart(partKey)) return Math.max(0.001, Number(part[sizeProp] || 1));
  const baseProp = canvasAnchorBaseProp(prop);
  const base = Math.max(1, Number(part[baseProp] || part[sizeProp] || 1));
  return Math.max(0.001, Number(part[sizeProp] || base) / base);
}

function canvasAnchorBaseProp(prop) {
  return prop === 'ax' ? 'baseW' : 'baseH';
}

export function updateRigPartValue(part, partKey, prop, value, tuning = null) {
  const limits = partFieldLimits(prop, partKey);
  const nextValue = clamp(Number(value), limits.min, limits.max);
  if (isParentSizedPart(partKey)) {
    updateParentSizedPartValue(part, partKey, prop, nextValue, tuning);
  } else if (prop === 'ax') {
    setPartAnchorValue(part, 'ax', nextValue, partKey);
  } else if (prop === 'ay') {
    setPartAnchorValue(part, 'ay', nextValue, partKey);
  } else if (isSizeProp(prop)) {
    part[prop] = partSizeFromPercent(partKey, part, prop, nextValue);
  } else {
    part[prop] = nextValue;
  }
}

function updateParentSizedPartValue(part, partKey, prop, value, tuning) {
  if (isSizeProp(prop)) {
    const parentSize = interactionObjectParentSize(tuning, partKey, prop, part[prop]);
    part[prop] = Math.max(1, (parentSize * value) / 100);
    return;
  }
  part[prop] = value;
}

function interactionObjectParentSize(tuning, partKey, prop, fallback) {
  const parent = tuning ? interactionObjectParentPart(tuning, partKey) : null;
  const baseProp = sizeBaseProp(prop);
  return Math.max(1, Number(parent?.[prop] || parent?.[baseProp] || fallback || 1));
}
