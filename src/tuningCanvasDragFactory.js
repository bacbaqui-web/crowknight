import { pickDragValues, pickVisualValues } from './canvasDragState.js';
import { canvasGroupDragItems } from './tuningCanvasEditState.js';

export function createCanvasGroupDrag({ pointerId, point, handle, mode, parts, writePoseFrameValue }) {
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
    writePoseFrameValue,
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
  writePoseFrameValue,
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
    writePoseFrameValue,
    writeValue,
  };
}

export function createCanvasGroupDragItems(parts, { editStateForPart, editHandles }) {
  return canvasGroupDragItems(parts, { editStateForPart, editHandles });
}

export function createCurrentCanvasGroupDrag({ geometry, parts, mode, writePoseFrameValue }) {
  if (!geometry) return { group: true, parts: [], handle: null, mode, writePoseFrameValue };
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
    writePoseFrameValue,
  };
}

export function canvasHandleHoverMode({ hit }) {
  return hit?.mode || null;
}

export function isTemporaryCanvasGroupAnchorDrag(drag) {
  return Boolean(drag?.group && drag.mode === 'anchor');
}
