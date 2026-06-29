import { ensurePoseOffset } from './project_data_normalizer.js';
import { handleCursor } from './edit_handle_drawing_helper.js';
import { canvasPointFromEvent } from './canvasDragMath.js';
import { canvasEffectEditState, canvasPartEditState, refreshCanvasDragTargets } from './transform_edit_state.js';
import {
  canvasHandleHoverMode,
  createCanvasGroupDragItems,
  createCurrentCanvasGroupDrag,
} from './transform_drag_factory.js';
import { finishCanvasPointerDrag, handleCanvasPointerDown, handleCanvasPointerMove } from './transform_drag_helper.js';
import { applyTuningCanvasDrag } from './transform_drag_apply_helper.js';
import {
  applyGroupTransformDrag,
  applyGroupTransformRotation,
  applyGroupTransformScale,
  createGroupTransformTarget,
} from './group_transform_adapter.js';
import { createCanvasEditRefresh } from './transform_refresh_helper.js';
import { currentCanvasSettingsEditContext } from './settings_panel_state.js';
import { MASTER_PART_KEY } from './game_config.js';

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
  const canvasRefresh = createCanvasEditRefresh({
    getSelectedActor,
    applySelected,
    saveState,
    renderEffectFields: effectTimeline.renderFields,
    syncEffectPreview: effectTimeline.syncPreview,
    renderPartFields,
    renderPosePartFields,
  });

  function onPointerDown(event) {
    handleCanvasPointerDown(event, {
      isPanelOpen: () => panel.classList.contains('is-open'),
      canvas,
      currentCanvasEditContext,
      activePart: currentCanvasActivePart(),
      getEditHandleAt,
      groupEditValues: getGroupEditValues(),
      applyCurrentGroupOpacity,
      canvasRefresh,
      createGroupDragItems,
      canvasEditState,
      writePoseFrameValue: poseTimeline.writeFrameValue,
      pushUndoSnapshot,
      beginUndoSnapshot,
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
    if (context === 'effect') return 'effect';
    if (context === 'pose') return getEditFocusPartKey() || MASTER_PART_KEY;
    return getEditFocusPartKey();
  }

  function onPointerMove(event) {
    handleCanvasPointerMove(event, {
      canvas,
      drag: canvasDrag,
      updateCanvasHandleHover,
      applyCanvasDrag,
      canvasRefresh,
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
      canvasRefresh,
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
    if (context === 'effect') {
      effectTimeline.ensureActiveFrame();
      return canvasEffectEditState({
        effectKey: getEffectKey(),
        target: effectTimeline.currentFrameValue(),
        writeValue: effectTimeline.writeFrameValue,
      });
    }

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
      startValues: createGroupTransformTarget(getGroupEditValues(), geometry),
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
    applyGroupTransformDrag(createCurrentGroupDrag('move'), dx, dy);
  }

  function applyCurrentGroupRotation(degrees) {
    const drag = createCurrentGroupDrag('rotate');
    if (!drag.handle || !drag.parts.length) return;
    applyGroupTransformRotation(drag, degrees);
  }

  function applyCurrentGroupScale(scale) {
    const drag = createCurrentGroupDrag('size');
    if (!drag.handle || !drag.parts.length) return;
    applyGroupTransformScale(drag, scale);
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
      groupEditValues: getGroupEditValues(),
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
