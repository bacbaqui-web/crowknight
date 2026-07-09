import { ensureActionOffset } from './project_data_normalizer_helper.js';
import { handleCursor } from './edit_handle_drawing_helper.js';
import { canvasPointFromEvent } from './canvas_drag_math_helper.js';
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
import { MASTER_PART_KEY } from './game_config_data.js';
import { normalizeActionEditPivot, writeActionEditPivot } from './action_timeline_edit_helper.js';
import { EDIT_CONTEXT_ACTION, EDIT_CONTEXT_EFFECT } from './edit_target_helper.js';

export function createTuningPanelCanvasController({
  canvas,
  panel,
  sections,
  getSelectedActor,
  getEditTarget,
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
  actionTimeline,
  effectTimeline,
  getActionKey,
  getEffectKey,
  applySelected,
  saveState,
  renderPartFields,
  renderActionPartFields,
  selectCanvasPart,
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
    renderActionPartFields,
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
      writeActionFrameValue: actionTimeline.writeFrameValue,
      writeActionPivotValue,
      pushUndoSnapshot,
      beginUndoSnapshot,
      setEditContext,
      setEditFocusPartKey,
      selectCanvasPart,
      setEditHandleActiveMode,
      setCanvasDrag: (value) => {
        canvasDrag = value;
      },
    });
  }

  function currentCanvasEditContext() {
    return currentCanvasSettingsEditContext({
      partSection: sections.part,
      actionSection: sections.action,
      effectSection: sections.effect,
      editFocusContext: getEditFocusContext(),
      editContext: getEditContext(),
      activePartKey: getActivePartKey(),
    });
  }

  function currentCanvasActivePart() {
    const context = currentCanvasEditContext();
    const editTarget = getEditTarget?.(context);
    return editTarget?.writeTargetKey || (editTarget?.isActionPivot ? editTarget.targetType : null);
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
    if (context === EDIT_CONTEXT_EFFECT) {
      return effectCanvasEditState();
    }

    if (context === EDIT_CONTEXT_ACTION) {
      ensureActionOffset(actor.tuning, getActionKey(), part);
    }

    return canvasPartEditState({
      part,
      context,
      tuning: actor.tuning,
      actionValue: context === EDIT_CONTEXT_ACTION ? actionTimeline.currentFrameValue(part) : null,
    });
  }

  function effectCanvasEditState() {
    const editTarget = getEditTarget?.('effect');
    effectTimeline.ensureActiveFrame();
    return canvasEffectEditState({
      effectKey: getEffectKey(),
      target: effectTimeline.currentFrameValue(),
      writeValue: (prop, value) => {
        if (editTarget?.writeTargetKey && editTarget.writeTargetKey !== 'effect') return;
        effectTimeline.writeFrameValue(prop, value);
      },
    });
  }

  function createGroupDragItems(parts) {
    return createCanvasGroupDragItems(parts, {
      editStateForPart: (part) => canvasEditState(part, EDIT_CONTEXT_ACTION),
      editHandles: getSelectedActor().player.editHandles,
    });
  }

  function writeActionPivotValue(prop, value) {
    const settings = currentActionSettings();
    writeActionEditPivot(settings, masterActionFrames(), { ...settings.editPivot, [prop]: value });
  }

  function currentActionSettings() {
    const actor = getSelectedActor();
    actor.tuning.actionSettings ||= {};
    actor.tuning.actionSettings[getActionKey()] ||= {};
    actor.tuning.actionSettings[getActionKey()].editPivot = normalizeActionEditPivot(
      actor.tuning.actionSettings[getActionKey()].editPivot
    );
    return actor.tuning.actionSettings[getActionKey()];
  }

  function masterActionFrames() {
    const actor = getSelectedActor();
    ensureActionOffset(actor.tuning, getActionKey(), MASTER_PART_KEY);
    return actor.tuning.actionOffsets?.[getActionKey()]?.[MASTER_PART_KEY];
  }

  function createCurrentGroupDrag(mode) {
    const geometry = currentGroupEditGeometry();
    return createCurrentCanvasGroupDrag({
      geometry,
      parts: geometry ? createGroupDragItems(geometry.parts) : [],
      mode,
      startValues: createGroupTransformTarget(getGroupEditValues(), geometry),
      writeActionFrameValue: actionTimeline.writeFrameValue,
    });
  }

  function currentGroupEditGeometry() {
    const geometry = getGroupEditHandleGeometry();
    if (!geometry) return null;

    const values = getGroupEditValues();
    if (geometry.isFrameGroup) {
      values.anchorX = geometry.anchor.x;
      values.anchorY = geometry.anchor.y;
    } else if (!Number.isFinite(values.anchorX) || !Number.isFinite(values.anchorY)) {
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
    if (isFrameGroupEditTarget()) return;
    applyGroupTransformDrag(createCurrentGroupDrag('move'), dx, dy);
  }

  function applyCurrentGroupRotation(degrees) {
    if (isFrameGroupEditTarget()) return;
    const drag = createCurrentGroupDrag('rotate');
    if (!drag.handle || !drag.parts.length) return;
    applyGroupTransformRotation(drag, degrees);
  }

  function applyCurrentGroupScale(scale) {
    if (isFrameGroupEditTarget()) return;
    const drag = createCurrentGroupDrag('size');
    if (!drag.handle || !drag.parts.length) return;
    applyGroupTransformScale(drag, scale);
  }

  function applyCurrentGroupOpacity(opacity) {
    if (isFrameGroupEditTarget()) return;
    currentGroupEditParts().forEach((part) => {
      ensureActionOffset(getSelectedActor().tuning, getActionKey(), part);
      actionTimeline.writeFrameValue(part, 'opacity', opacity);
    });
  }

  function currentGroupEditParts() {
    const editTarget = getEditTarget?.(EDIT_CONTEXT_ACTION);
    return editTarget?.isGroup ? editTarget.writeTargetKeys : [];
  }

  function refreshCanvasDragTarget() {
    refreshCanvasDragTargets(canvasDrag, {
      editStateForPart: canvasEditState,
      effectEditState: effectCanvasEditState,
    });
  }

  function applyCanvasDrag(drag, dx, dy) {
    applyTuningCanvasDrag(drag, dx, dy, {
      groupEditValues: getGroupEditValues(),
    });
  }

  function isFrameGroupEditTarget() {
    return getEditTarget?.(EDIT_CONTEXT_ACTION)?.isFrameGroup === true;
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
