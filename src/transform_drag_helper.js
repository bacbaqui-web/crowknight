import { canvasPointFromEvent } from './canvasDragMath.js';
import {
  createCanvasGroupDrag,
  createCanvasPartDrag,
  isTemporaryCanvasGroupAnchorDrag,
} from './transform_drag_factory.js';

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
    writePoseFrameValue,
    pushUndoSnapshot,
    beginUndoSnapshot,
    resetGroupTransformValues,
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
        resetGroupTransformValues,
        writePoseFrameValue,
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
    if (typeof editState.writeValue === 'function') editState.writeValue('opacity', nextOpacity);
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
      writePoseFrameValue,
      writeValue: editState.writeValue,
      beginUndoSnapshot,
    })
  );
}

export function beginCanvasGroupPointerDrag({
  event,
  canvas,
  point,
  handle,
  mode,
  parts,
  beginUndoSnapshot,
  resetGroupTransformValues,
  writePoseFrameValue,
}) {
  beginUndoSnapshot();
  resetGroupTransformValues();
  canvas.style.cursor = 'grabbing';
  canvas.setPointerCapture(event.pointerId);
  return createCanvasGroupDrag({
    pointerId: event.pointerId,
    point,
    handle,
    mode,
    parts,
    writePoseFrameValue,
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
  writePoseFrameValue,
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
    writePoseFrameValue,
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
  {
    drag,
    clearCanvasDrag,
    clearEditHandleActiveMode,
    resetGroupTransformValues,
    canvasRefresh,
    updateCanvasHandleHover,
    commitUndoSnapshot,
  }
) {
  if (!drag || drag.pointerId !== event.pointerId) return;

  const { wasGroupDrag, wasTemporaryAnchorDrag } = completedCanvasDragState(drag);
  clearCanvasDrag();
  clearEditHandleActiveMode();
  if (wasGroupDrag && !wasTemporaryAnchorDrag) {
    resetGroupTransformValues();
    canvasRefresh.renderGroupPoseFields();
  }
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
