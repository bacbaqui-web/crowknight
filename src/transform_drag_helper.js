import { canvasPointFromEvent } from './canvas_drag_math_helper.js';
import {
  createCanvasActionPivotDrag,
  createCanvasGroupDrag,
  createCanvasPartDrag,
  isTemporaryCanvasGroupAnchorDrag,
} from './transform_drag_factory.js';
import { createGroupTransformTarget } from './group_transform_adapter.js';

export function toggleCanvasOpacity(value) {
  return (value ?? 1) > 0 ? 0 : 1;
}

export function handleCanvasPointerDown(
  event,
  {
    isPanelOpen,
    canvas,
    currentCanvasEditContext,
    activePart,
    getEditHandleAt,
    groupEditValues,
    applyCurrentGroupOpacity,
    canvasRefresh,
    createGroupDragItems,
    canvasEditState,
    writeActionFrameValue,
    writeActionPivotValue,
    pushUndoSnapshot,
    beginUndoSnapshot,
    setEditContext,
    setEditFocusPartKey,
    setEditHandleActiveMode,
    setCanvasDrag,
  }
) {
  if (!isPanelOpen()) return;

  const canvasContext = currentCanvasEditContext();
  if (!canvasContext) return;
  if (!activePart) return;

  const point = canvasPointFromEvent(canvas, event);
  const handleHit = getEditHandleAt(point);
  if (!handleHit) return;

  event.preventDefault();
  if (handleHit.geometry.isActionPivot) {
    setEditContext('action');
    setEditHandleActiveMode(handleHit.mode);
    setCanvasDrag(
      beginCanvasActionPivotPointerDrag({
        event,
        canvas,
        point,
        handle: handleHit.geometry,
        writeActionPivotValue,
        beginUndoSnapshot,
      })
    );
    return;
  }

  if (handleHit.geometry.isGroup) {
    if (handleHit.mode === 'opacity') {
      pushUndoSnapshot();
      const nextOpacity = toggleCanvasOpacity(groupEditValues.opacity);
      applyCurrentGroupOpacity(nextOpacity);
      groupEditValues.opacity = nextOpacity;
      canvasRefresh.applyAndRenderGroup();
      return;
    }

    setEditHandleActiveMode(handleHit.mode);
    setCanvasDrag(
      beginCanvasGroupPointerDrag({
        event,
        canvas,
        point,
        handle: handleHit.geometry,
        mode: handleHit.mode,
        parts: createGroupDragItems(handleHit.geometry.parts),
        beginUndoSnapshot,
        groupEditValues,
        writeActionFrameValue,
      })
    );
    return;
  }

  setEditContext(canvasContext);
  if (canvasContext !== 'effect') setEditFocusPartKey(activePart);
  const editState = canvasEditState(activePart, canvasContext);
  const target = editState.target;
  const handleMode = handleHit.mode;

  if (handleMode === 'opacity') {
    pushUndoSnapshot();
    const nextOpacity = toggleCanvasOpacity(target.opacity);
    if (canvasContext === 'action' && typeof writeActionFrameValue === 'function') {
      writeActionFrameValue(activePart, 'opacity', nextOpacity);
    } else if (typeof editState.writeValue === 'function') editState.writeValue('opacity', nextOpacity);
    else target.opacity = nextOpacity;
    canvasRefresh.applyAndRenderContext(canvasContext);
    return;
  }

  setEditHandleActiveMode(handleMode);
  setCanvasDrag(
    beginCanvasPartPointerDrag({
      event,
      canvas,
      point,
      part: activePart,
      context: canvasContext,
      editState,
      handle: handleHit.geometry,
      mode: handleMode,
      writeActionFrameValue,
      writeValue: editState.writeValue,
      beginUndoSnapshot,
    })
  );
}

export function beginCanvasActionPivotPointerDrag({
  event,
  canvas,
  point,
  handle,
  writeActionPivotValue,
  beginUndoSnapshot,
}) {
  beginUndoSnapshot();
  canvas.style.cursor = 'grabbing';
  canvas.setPointerCapture(event.pointerId);
  return createCanvasActionPivotDrag({
    pointerId: event.pointerId,
    point,
    handle,
    writeActionPivotValue,
  });
}

export function beginCanvasGroupPointerDrag({
  event,
  canvas,
  point,
  handle,
  mode,
  parts,
  beginUndoSnapshot,
  groupEditValues,
  writeActionFrameValue,
}) {
  beginUndoSnapshot();
  canvas.style.cursor = 'grabbing';
  canvas.setPointerCapture(event.pointerId);
  return createCanvasGroupDrag({
    pointerId: event.pointerId,
    point,
    handle,
    mode,
    parts,
    startValues: createGroupTransformTarget(groupEditValues, handle),
    writeActionFrameValue,
  });
}

export function beginCanvasPartPointerDrag({
  event,
  canvas,
  point,
  part,
  context,
  editState,
  handle,
  mode,
  writeActionFrameValue,
  writeValue,
  beginUndoSnapshot,
}) {
  beginUndoSnapshot();
  canvas.style.cursor = 'grabbing';
  canvas.setPointerCapture(event.pointerId);
  return createCanvasPartDrag({
    pointerId: event.pointerId,
    point,
    part,
    context,
    editState,
    handle,
    mode,
    writeActionFrameValue,
    writeValue,
  });
}

export function canvasDragDeltaFromEvent(canvas, event, drag) {
  const point = canvasPointFromEvent(canvas, event);
  return {
    dx: point.x - drag.startX,
    dy: point.y - drag.startY,
  };
}

export function handleCanvasPointerMove(
  event,
  { canvas, drag, updateCanvasHandleHover, applyCanvasDrag, canvasRefresh, refreshCanvasDragTarget }
) {
  if (!drag) {
    updateCanvasHandleHover(event);
    return;
  }
  if (drag.pointerId !== event.pointerId) return;

  event.preventDefault();
  const { dx, dy } = canvasDragDeltaFromEvent(canvas, event, drag);
  applyCanvasDrag(drag, dx, dy);
  const shouldApplyImmediately = shouldApplyCanvasDragImmediately(drag);
  if (shouldApplyImmediately) canvasRefresh.applyImmediately();
  canvasRefresh.renderDragMove(drag, shouldApplyImmediately);

  refreshCanvasDragTarget();
}

export function finishCanvasPointerDrag(
  event,
  { drag, clearCanvasDrag, clearEditHandleActiveMode, canvasRefresh, updateCanvasHandleHover, commitUndoSnapshot }
) {
  if (!drag || drag.pointerId !== event.pointerId) return;

  const { wasGroupDrag, wasTemporaryAnchorDrag } = completedCanvasDragState(drag);
  clearCanvasDrag();
  clearEditHandleActiveMode();
  if (wasGroupDrag && !wasTemporaryAnchorDrag) canvasRefresh.renderGroupActionFields();
  updateCanvasHandleHover(event);
  commitUndoSnapshot();
}

export function shouldApplyCanvasDragImmediately(drag) {
  return !isTemporaryCanvasGroupAnchorDrag(drag);
}

export function completedCanvasDragState(drag) {
  return {
    wasGroupDrag: Boolean(drag?.group),
    wasTemporaryAnchorDrag: isTemporaryCanvasGroupAnchorDrag(drag),
  };
}
