import { canvasPointFromEvent } from './canvasDragMath.js';
import {
  createCanvasEffectDrag,
  createCanvasGroupDrag,
  createCanvasPartDrag,
  isTemporaryCanvasGroupAnchorDrag,
} from './tuningCanvasDragFactory.js';
import { isMasterPart } from './tuningLabels.js';

export function toggleCanvasOpacity(value) {
  return (value ?? 1) > 0 ? 0 : 1;
}

export function canvasPartHandleMode({ mode, context, part }) {
  return mode === 'anchor' && context !== 'part' && !isMasterPart(part) ? 'move' : mode;
}

export function handleCanvasPointerDown(
  event,
  {
    isPanelOpen,
    canvas,
    currentCanvasEditContext,
    handleEffectPointerDown,
    activePart,
    getEditHandleAt,
    groupEditValues,
    applyCurrentGroupOpacity,
    applySelected,
    renderPosePartFields,
    renderPartFields,
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
  if (canvasContext === 'effect') {
    handleEffectPointerDown(event);
    return;
  }
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
      applySelected();
      renderPosePartFields();
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
  setEditFocusPartKey(activePart);
  const editState = canvasEditState(activePart, canvasContext);
  const target = editState.target;
  const handleMode = canvasPartHandleMode({
    mode: handleHit.mode,
    context: canvasContext,
    part: activePart,
  });

  if (handleMode === 'opacity') {
    pushUndoSnapshot();
    target.opacity = toggleCanvasOpacity(target.opacity);
    applySelected();
    renderPartFields();
    renderPosePartFields();
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
      beginUndoSnapshot,
    })
  );
}

export function handleEffectCanvasPointerDown(
  event,
  {
    canvas,
    effectKey,
    ensureActiveEffectFrame,
    currentEffectFrameValue,
    getEditHandleAt,
    writeEffectFrameValue,
    applySelected,
    renderEffectFields,
    syncEffectPreview,
    pushUndoSnapshot,
    beginUndoSnapshot,
    setEditContext,
    setEditHandleActiveMode,
    setCanvasDrag,
  }
) {
  ensureActiveEffectFrame();
  const point = canvasPointFromEvent(canvas, event);
  const handleHit = getEditHandleAt(point);
  if (!handleHit?.geometry?.isEffect) return;

  event.preventDefault();
  setEditContext('effect');
  const target = currentEffectFrameValue();

  if (handleHit.mode === 'opacity') {
    pushUndoSnapshot();
    writeEffectFrameValue('opacity', toggleCanvasOpacity(target.opacity));
    applySelected();
    renderEffectFields();
    syncEffectPreview();
    return;
  }

  setEditHandleActiveMode(handleHit.mode);
  setCanvasDrag(
    beginCanvasEffectPointerDrag({
      event,
      canvas,
      point,
      target,
      handle: handleHit.geometry,
      mode: handleHit.mode,
      effectKey,
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
  });
}

export function beginCanvasEffectPointerDrag({
  event,
  canvas,
  point,
  target,
  handle,
  mode,
  effectKey,
  beginUndoSnapshot,
}) {
  beginUndoSnapshot();
  canvas.style.cursor = 'grabbing';
  canvas.setPointerCapture(event.pointerId);
  return createCanvasEffectDrag({
    pointerId: event.pointerId,
    point,
    target,
    handle,
    mode,
    effectKey,
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
  {
    canvas,
    drag,
    updateCanvasHandleHover,
    applyCanvasDrag,
    applySelectedImmediately,
    renderEffectFields,
    syncEffectPreview,
    renderPartFields,
    renderPosePartFields,
    refreshCanvasDragTarget,
  }
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
  if (shouldApplyImmediately) applySelectedImmediately();

  if (drag.context === 'effect') {
    renderEffectFields();
    syncEffectPreview();
  } else if (shouldApplyImmediately) {
    renderPartFields();
    renderPosePartFields();
  }

  refreshCanvasDragTarget();
}

export function finishCanvasPointerDrag(
  event,
  {
    drag,
    clearCanvasDrag,
    clearEditHandleActiveMode,
    resetGroupTransformValues,
    renderPosePartFields,
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
    renderPosePartFields();
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
