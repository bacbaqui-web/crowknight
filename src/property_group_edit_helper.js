import { createGroupTransformTarget } from './group_transform_adapter.js';
import { clamp } from './common_helper.js';

export function applyGroupEditPropertyValue({
  prop,
  value,
  groupEditValues,
  applyMove,
  applyRotation,
  applyScale,
  applyOpacity,
}) {
  const target = createGroupTransformTarget(groupEditValues);
  const nextValue = prop === 'scale' ? clamp(Number(value), 10, 400) : Number(value);
  if (!Number.isFinite(nextValue)) {
    return { changed: false, value: groupEditValues[prop] };
  }

  if (prop === 'x' || prop === 'y') {
    const dx = prop === 'x' ? nextValue - target.x : 0;
    const dy = prop === 'y' ? nextValue - target.y : 0;
    applyMove(dx, dy);
    groupEditValues[prop] = nextValue;
  } else if (prop === 'rot') {
    applyRotation(nextValue - target.rot);
    groupEditValues.rot = nextValue;
  } else if (prop === 'scale') {
    const previousScale = Math.max(0.1, target.scale / 100);
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
