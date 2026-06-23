import { isMasterPart } from './tuningLabels.js';
import { controlGroupPartKeys, imagePartKeys, partFieldLimits } from './tuningParts.js';
import { clamp } from './utils.js';

export function isGroupScalablePart(part) {
  return imagePartKeys().includes(part) || controlGroupPartKeys().includes(part) || isMasterPart(part);
}

export function setCanvasVisualValue(drag, prop, value) {
  if (prop === 'w' || prop === 'h') {
    value = clampCanvasVisualSize(drag, prop, value);
  }

  if (drag.context === 'pose') {
    const baseValue = Number(drag.base?.[prop] || 0);
    const offset = value - baseValue;
    drag.target[prop] = offset;
    return;
  }

  drag.target[prop] = value;
}

export function canvasSizeDelta(drag, prop, delta) {
  const base = canvasSizePercentBase(drag, prop);
  if (isMasterPart(drag.part) || controlGroupPartKeys().includes(drag.part)) return (delta / 80) * base;
  return delta;
}

export function clampCanvasVisualSize(drag, prop, value) {
  const base = canvasSizePercentBase(drag, prop);
  return clamp(Number(value), base * 0.05, base * 3);
}

export function canvasSizePercentBase(drag, prop) {
  if (drag.context === 'pose') {
    return Math.max(0.001, Number(drag.base?.[prop] ?? 1));
  }
  if (controlGroupPartKeys().includes(drag.part)) return 1;
  const baseProp = prop === 'w' ? 'baseW' : 'baseH';
  return Math.max(1, Number(drag.target?.[baseProp] || drag.base?.[baseProp] || drag.target?.[prop] || 1));
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
  if (controlGroupPartKeys().includes(partKey)) return Math.max(0.001, Number(part[sizeProp] || 1));
  const baseProp = prop === 'ax' ? 'baseW' : 'baseH';
  const base = Math.max(1, Number(part[baseProp] || part[sizeProp] || 1));
  return Math.max(0.001, Number(part[sizeProp] || base) / base);
}
