import { pickDragValues, pickVisualValues } from './canvas_drag_state.js';
import { canvasGroupDragItems } from './transform_edit_state.js';

export function createCanvasGroupDrag({ pointerId, point, handle, mode, parts, startValues, writeActionFrameValue }) {
  return {
    pointerId,
    group: true,
    parts,
    handle,
    startValues,
    startX: point.x,
    startY: point.y,
    startAngle: Math.atan2(point.y - handle.anchor.y, point.x - handle.anchor.x),
    startDistance: Math.max(1, Math.hypot(point.x - handle.anchor.x, point.y - handle.anchor.y)),
    mode,
    context: 'action',
    writeActionFrameValue,
  };
}

export function createCanvasActionPivotDrag({ pointerId, point, handle, writeActionPivotValue }) {
  return {
    pointerId,
    actionPivot: true,
    handle,
    startX: point.x,
    startY: point.y,
    startValues: {
      x: Number(handle.pivot?.x || 0),
      y: Number(handle.pivot?.y || 0),
    },
    mode: 'anchor',
    context: 'action',
    writeActionPivotValue,
  };
}

export function createCanvasPartDrag({
  pointerId,
  point,
  part,
  context,
  editState,
  handle,
  mode,
  writeActionFrameValue,
  writeValue,
}) {
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
    writeActionFrameValue,
    writeValue,
  };
}

export function createCanvasGroupDragItems(parts, { editStateForPart, editHandles }) {
  return canvasGroupDragItems(parts, { editStateForPart, editHandles });
}

export function createCurrentCanvasGroupDrag({ geometry, parts, mode, startValues, writeActionFrameValue }) {
  if (!geometry) return { group: true, parts: [], handle: null, mode, startValues, writeActionFrameValue };
  return {
    group: true,
    parts,
    handle: geometry,
    startValues,
    startX: geometry.anchor.x,
    startY: geometry.anchor.y,
    startAngle: 0,
    startDistance: 100,
    mode,
    context: 'action',
    writeActionFrameValue,
  };
}

export function canvasHandleHoverMode({ hit }) {
  return hit?.mode || null;
}

export function isTemporaryCanvasGroupAnchorDrag(drag) {
  return Boolean(drag?.group && drag.mode === 'anchor');
}
