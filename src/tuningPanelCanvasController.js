import { ensurePoseOffset } from './tuningNormalize.js';
import { handleCursor } from './editHandleDrawing.js';
import { canvasPointFromEvent } from './canvasDragMath.js';
import { canvasPartEditState, refreshCanvasDragTargets } from './tuningCanvasEditState.js';
import {
  canvasHandleHoverMode,
  createCanvasGroupDragItems,
  createCurrentCanvasGroupDrag,
} from './tuningCanvasDragFactory.js';
import {
  finishCanvasPointerDrag,
  handleCanvasPointerDown,
  handleEffectCanvasPointerDown,
  handleCanvasPointerMove,
} from './tuningCanvasPointerDrag.js';
import {
  applyCanvasGroupDrag,
  applyCanvasGroupRotation,
  applyCanvasGroupScale,
  applyTuningCanvasDrag,
} from './canvasDragApply.js';
import { currentCanvasSettingsEditContext } from './settingsPanelState.js';
import { MASTER_PART_KEY } from './gameConfig.js';

export function createTuningPanelCanvasController({
  canvas,
  panel,
  sections,
  selectedPoseParts,
  getSelectedActor,
  getEditFocusPartKey,
  setEditFocusPartKey,
  getEditFocusContext,
  getEditContext,
  setEditContext,
  getActivePartKey,
  getGroupEditValues,
  getEditHandleAt,
  getGroupEditHandleGeometry,
  setEditHandleHover,
  setEditHandleActiveMode,
  resetGroupTransformValues,
  poseTimeline,
  effectTimeline,
  getPoseKey,
  getEffectKey,
  applySelected,
  saveState,
  renderPartFields,
  renderPosePartFields,
  pushUndoSnapshot,
  beginUndoSnapshot,
  commitUndoSnapshot,
}) {
  let canvasDrag = null;

  function onPointerDown(event) {
    handleCanvasPointerDown(event, {
      isPanelOpen: () => panel.classList.contains('is-open'),
      canvas,
      currentCanvasEditContext,
      handleEffectPointerDown: onEffectPointerDown,
      activePart: currentCanvasActivePart(),
      getEditHandleAt,
      groupEditValues: getGroupEditValues(),
      applyCurrentGroupOpacity,
      applySelected,
      renderPosePartFields,
      renderPartFields,
      createGroupDragItems,
      canvasEditState,
      writePoseFrameValue: poseTimeline.writeFrameValue,
      pushUndoSnapshot,
      beginUndoSnapshot,
      resetGroupTransformValues,
      setEditContext,
      setEditFocusPartKey,
      setEditHandleActiveMode,
      setCanvasDrag: (value) => {
        canvasDrag = value;
      },
    });
  }

  function currentCanvasEditContext() {
    return currentCanvasSettingsEditContext({
      partSection: sections.part,
      poseSection: sections.pose,
      effectSection: sections.effect,
      editFocusContext: getEditFocusContext(),
      editContext: getEditContext(),
      activePartKey: getActivePartKey(),
    });
  }

  function currentCanvasActivePart() {
    const context = currentCanvasEditContext();
    if (context === 'pose') return getEditFocusPartKey() || MASTER_PART_KEY;
    return getEditFocusPartKey();
  }

  function onEffectPointerDown(event) {
    handleEffectCanvasPointerDown(event, {
      canvas,
      effectKey: getEffectKey(),
      ensureActiveEffectFrame: effectTimeline.ensureActiveFrame,
      currentEffectFrameValue: effectTimeline.currentFrameValue,
      getEditHandleAt,
      writeEffectFrameValue: effectTimeline.writeFrameValue,
      applySelected,
      renderEffectFields: effectTimeline.renderFields,
      syncEffectPreview: effectTimeline.syncPreview,
      pushUndoSnapshot,
      beginUndoSnapshot,
      setEditContext,
      setEditHandleActiveMode,
      setCanvasDrag: (value) => {
        canvasDrag = value;
      },
    });
  }

  function onPointerMove(event) {
    handleCanvasPointerMove(event, {
      canvas,
      drag: canvasDrag,
      updateCanvasHandleHover,
      applyCanvasDrag,
      applySelectedImmediately: () => {
        const actor = getSelectedActor();
        actor.player.applyTuning(actor.tuning);
        saveState();
      },
      renderEffectFields: effectTimeline.renderFields,
      syncEffectPreview: effectTimeline.syncPreview,
      renderPartFields,
      renderPosePartFields,
      refreshCanvasDragTarget,
    });
  }

  function endDrag(event) {
    finishCanvasPointerDrag(event, {
      drag: canvasDrag,
      clearCanvasDrag: () => {
        canvasDrag = null;
      },
      clearEditHandleActiveMode: () => {
        setEditHandleActiveMode(null);
      },
      resetGroupTransformValues,
      renderPosePartFields,
      updateCanvasHandleHover,
      commitUndoSnapshot,
    });
  }

  function updateCanvasHandleHover(event) {
    const hit = getEditHandleAt(canvasPointFromEvent(canvas, event));
    const hover = canvasHandleHoverMode({
      hit,
      currentContext: currentCanvasEditContext(),
      editFocusPartKey: currentCanvasActivePart(),
    });
    setEditHandleHover(hover);
    canvas.style.cursor = handleCursor(hover);
  }

  function canvasEditState(part, context) {
    const actor = getSelectedActor();
    if (context === 'pose') {
      ensurePoseOffset(actor.tuning, getPoseKey(), part);
    }

    return canvasPartEditState({
      part,
      context,
      tuning: actor.tuning,
      poseValue: context === 'pose' ? poseTimeline.currentFrameValue(part) : null,
    });
  }

  function createGroupDragItems(parts) {
    return createCanvasGroupDragItems(parts, {
      editStateForPart: (part) => canvasEditState(part, 'pose'),
      editHandles: getSelectedActor().player.editHandles,
    });
  }

  function createCurrentGroupDrag(mode) {
    const geometry = currentGroupEditGeometry();
    return createCurrentCanvasGroupDrag({
      geometry,
      parts: geometry ? createGroupDragItems(geometry.parts) : [],
      mode,
      writePoseFrameValue: poseTimeline.writeFrameValue,
    });
  }

  function currentGroupEditGeometry() {
    const geometry = getGroupEditHandleGeometry();
    if (!geometry) return null;

    const values = getGroupEditValues();
    if (!Number.isFinite(values.anchorX) || !Number.isFinite(values.anchorY)) {
      values.anchorX = geometry.anchor.x;
      values.anchorY = geometry.anchor.y;
    }

    return {
      ...geometry,
      anchor: {
        x: values.anchorX,
        y: values.anchorY,
      },
    };
  }

  function applyCurrentGroupMove(dx, dy) {
    applyCanvasGroupDrag(createCurrentGroupDrag('move'), dx, dy);
  }

  function applyCurrentGroupRotation(degrees) {
    const drag = createCurrentGroupDrag('rotate');
    if (!drag.handle || !drag.parts.length) return;
    applyCanvasGroupRotation(drag, degrees);
  }

  function applyCurrentGroupScale(scale) {
    const drag = createCurrentGroupDrag('size');
    if (!drag.handle || !drag.parts.length) return;
    applyCanvasGroupScale(drag, scale);
  }

  function applyCurrentGroupOpacity(opacity) {
    selectedPoseParts.forEach((part) => {
      ensurePoseOffset(getSelectedActor().tuning, getPoseKey(), part);
      poseTimeline.writeFrameValue(part, 'opacity', opacity);
    });
  }

  function refreshCanvasDragTarget() {
    refreshCanvasDragTargets(canvasDrag, {
      editStateForPart: canvasEditState,
      effectFrameValue: effectTimeline.currentFrameValue,
    });
  }

  function applyCanvasDrag(drag, dx, dy) {
    applyTuningCanvasDrag(drag, dx, dy, {
      effectKey: getEffectKey(),
      groupEditValues: getGroupEditValues(),
      writeEffectFrameValue: effectTimeline.writeFrameValue,
    });
  }

  return {
    applyCurrentGroupMove,
    applyCurrentGroupOpacity,
    applyCurrentGroupRotation,
    applyCurrentGroupScale,
    endDrag,
    onPointerDown,
    onPointerMove,
  };
}
