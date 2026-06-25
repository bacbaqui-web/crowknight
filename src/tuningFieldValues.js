import { isMasterPart } from './tuningLabels.js';
import { controlGroupPartKeys, poseFieldLimits } from './tuningParts.js';
import { clamp } from './utils.js';

export function readPartFieldDisplayValue(partKey, part, prop) {
  if (prop === 'w' || prop === 'h') return partSizeToPercent(partKey, part, prop);
  return part[prop];
}

export function readPoseFrameDisplayValue(partKey, offset, prop, basePart) {
  if (prop === 'w' || prop === 'h') return poseSizeToPercent(partKey, offset, prop, basePart);
  return offset[prop];
}

export function poseFrameValueFromInput(partKey, prop, value, basePart) {
  const limits = poseFieldLimits(prop, partKey);
  const nextValue = clamp(Number(value), limits.min, limits.max);
  if (prop === 'w' || prop === 'h') return poseSizeOffsetFromPercent(partKey, prop, nextValue, basePart);
  return nextValue;
}

export function partSizeToPercent(partKey, part, prop) {
  if (controlGroupPartKeys().includes(partKey)) return Number(part[prop] ?? 1) * 100;
  const baseProp = prop === 'w' ? 'baseW' : 'baseH';
  const baseSize = Math.max(1, Number(part[baseProp] || part[prop] || 1));
  return (Number(part[prop] || baseSize) / baseSize) * 100;
}

export function partSizeFromPercent(partKey, part, prop, percent) {
  const ratio = Number(percent) / 100;
  if (controlGroupPartKeys().includes(partKey)) return Math.max(0.05, ratio);
  const baseProp = prop === 'w' ? 'baseW' : 'baseH';
  const baseSize = Math.max(1, Number(part[baseProp] || part[prop] || 1));
  return Math.max(1, baseSize * ratio);
}

export function poseSizeToPercent(partKey, offset, prop, basePart) {
  if (isMasterPart(partKey)) return (1 + Number(offset[prop] || 0)) * 100;

  const baseSize = Math.max(0.001, Number(basePart[prop] ?? 1));
  const currentSize = Math.max(0.001, baseSize + Number(offset[prop] || 0));
  return (currentSize / baseSize) * 100;
}

export function poseSizeOffsetFromPercent(partKey, prop, percent, basePart) {
  if (isMasterPart(partKey)) return Number(percent) / 100 - 1;

  const baseSize = Math.max(0.001, Number(basePart[prop] ?? 1));
  return baseSize * (Number(percent) / 100 - 1);
}
