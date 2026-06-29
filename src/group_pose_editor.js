import { clamp } from './utils.js';

export function applyGroupPoseEditValue({
  prop,
  value,
  groupEditValues,
  applyMove,
  applyRotation,
  applyScale,
  applyOpacity,
}) {
  const nextValue = prop === 'scale' ? clamp(Number(value), 10, 400) : Number(value);
  if (!Number.isFinite(nextValue)) {
    return { changed: false, value: groupEditValues[prop] };
  }

  if (prop === 'x' || prop === 'y') {
    const dx = prop === 'x' ? nextValue - groupEditValues.x : 0;
    const dy = prop === 'y' ? nextValue - groupEditValues.y : 0;
    applyMove(dx, dy);
    groupEditValues[prop] = nextValue;
  } else if (prop === 'rot') {
    applyRotation(nextValue - groupEditValues.rot);
    groupEditValues.rot = nextValue;
  } else if (prop === 'scale') {
    const previousScale = Math.max(0.1, groupEditValues.scale / 100);
    const nextScale = Math.max(0.1, nextValue / 100);
    applyScale(nextScale / previousScale);
    groupEditValues.scale = nextValue;
  } else if (prop === 'opacity') {
    const nextOpacity = nextValue > 0 ? 1 : 0;
    applyOpacity(nextOpacity);
    groupEditValues.opacity = nextOpacity;
  }

  return { changed: true, value: groupEditValues[prop] };
}
