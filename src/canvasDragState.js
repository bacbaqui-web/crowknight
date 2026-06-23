import { defaultEffectSize } from './animationFrames.js';

export function pickDragValues(editState) {
  const target = editState.target;
  return {
    x: Number(target.x || 0),
    y: Number(target.y || 0),
    ax: Number(target.ax || 0),
    ay: Number(target.ay || 0),
    w: Number(target.w || 0),
    h: Number(target.h || 0),
    rot: Number(target.rot || 0),
    opacity: Number(target.opacity ?? 1),
    anchorX: Number(target.anchorX || 0),
    anchorY: Number(target.anchorY || 0),
  };
}

export function pickEffectDragValues(target, effectKey) {
  return {
    x: Number(target.x || 0),
    y: Number(target.y || 0),
    w: Number(target.w || defaultEffectSize(effectKey).w),
    h: Number(target.h || defaultEffectSize(effectKey).h),
    rot: Number(target.rot || 0),
    opacity: Number(target.opacity ?? 1),
    anchorX: Number(target.anchorX || 0),
    anchorY: Number(target.anchorY || 0),
  };
}

export function pickVisualValues(editState) {
  const base = editState.base || {};
  const target = editState.target || {};
  if (editState.context === 'pose') {
    return {
      x: Number(base.x || 0) + Number(target.x || 0),
      y: Number(base.y || 0) + Number(target.y || 0),
      w: Number(base.w || 0) + Number(target.w || 0),
      h: Number(base.h || 0) + Number(target.h || 0),
      rot: Number(base.rot || 0) + Number(target.rot || 0),
      opacity: Number(target.opacity ?? 1),
    };
  }

  return pickDragValues(editState);
}
