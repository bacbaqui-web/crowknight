import { pickDragValues, pickEffectDragValues, pickVisualValues } from './canvasDragState.js';
import { isMasterPart } from './tuningLabels.js';
import { canvasGroupDragItems } from './tuningCanvasEditState.js';

export function createCanvasGroupDrag({ pointerId, point, handle, mode, parts }) {
  return {
    pointerId,
    group: true,
    parts,
    handle,
    startX: point.x,
    startY: point.y,
    startAngle: Math.atan2(point.y - handle.anchor.y, point.x - handle.anchor.x),
    startDistance: Math.max(1, Math.hypot(point.x - handle.anchor.x, point.y - handle.anchor.y)),
    mode,
    context: 'pose',
  };
}

export function createCanvasPartDrag({ pointerId, point, part, context, editState, handle, mode }) {
  return {
    pointerId,
    part,
    target: editState.target,
    base: editState.base,
    handle,
    startX: point.x,
    startY: point.y,
    startValues: pickDragValues(editState),
    startVisual: pickVisualValues(editState),
    startAngle: Math.atan2(point.y - handle.anchor.y, point.x - handle.anchor.x),
    mode,
    context,
  };
}

export function createCanvasEffectDrag({ pointerId, point, target, handle, mode, effectKey }) {
  return {
    pointerId,
    target,
    handle,
    startX: point.x,
    startY: point.y,
    startValues: pickEffectDragValues(target, effectKey),
    startAngle: Math.atan2(point.y - handle.anchor.y, point.x - handle.anchor.x),
    mode,
    context: 'effect',
  };
}

export function createCanvasGroupDragItems(parts, { editStateForPart, editHandles }) {
  return canvasGroupDragItems(parts, { editStateForPart, editHandles });
}

export function createCurrentCanvasGroupDrag({ geometry, parts, mode }) {
  if (!geometry) return { group: true, parts: [], handle: null, mode };
  return {
    group: true,
    parts,
    handle: geometry,
    startX: geometry.anchor.x,
    startY: geometry.anchor.y,
    startAngle: 0,
    startDistance: 100,
    mode,
    context: 'pose',
  };
}

export function canvasHandleHoverMode({ hit, currentContext, editFocusPartKey }) {
  if (
    hit?.mode === 'anchor' &&
    !hit.geometry?.isGroup &&
    !hit.geometry?.isEffect &&
    currentContext !== 'part' &&
    !isMasterPart(editFocusPartKey)
  ) {
    return 'move';
  }

  return hit?.mode || null;
}

export function isTemporaryCanvasGroupAnchorDrag(drag) {
  return Boolean(drag?.group && drag.mode === 'anchor');
}
