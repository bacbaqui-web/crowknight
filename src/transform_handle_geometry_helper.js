import {
  createActionPivotEditHandleGeometry,
  createGroupEditHandleGeometry,
  createPartEditHandleGeometry,
  findEditHandleAt,
} from './edit_handle_geometry_helper.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import { normalizeActionEditPivot } from './action_timeline_edit_helper.js';

export function tuningEditHandleGeometry({
  isPanelOpen,
  openEditContext,
  selectedActor,
  actionFrameSelectionActive,
  editFocusContext,
  groupEditValues,
  actionSettings,
  editTarget,
}) {
  if (!isPanelOpen) return null;

  if (editTarget?.isActionPivot) {
    return createActionPivotEditHandleGeometry({
      anchor: actionPivotCanvasAnchor(selectedActor, actionSettings),
      pivot: normalizeActionEditPivot(actionSettings?.editPivot),
    });
  }
  if (editTarget?.isFrameGroup) {
    return createPartEditHandleGeometry({
      editFocusPartKey: MASTER_PART_KEY,
      editHandleInfo: selectedActor.player.editHandles?.[MASTER_PART_KEY],
      actionFrameSelectionActive,
    });
  }

  const groupGeometry = tuningGroupEditHandleGeometry({
    editFocusContext,
    actionFrameSelectionActive,
    selectedActor,
    groupEditValues,
    editTarget,
  });
  if (groupGeometry) return groupGeometry;

  const focusPartKey =
    (openEditContext === 'action' ? editTarget?.targetKey || MASTER_PART_KEY : editTarget?.targetKey) || null;
  if (!focusPartKey) return null;

  return createPartEditHandleGeometry({
    editFocusPartKey: focusPartKey,
    editHandleInfo: selectedActor.player.editHandles?.[focusPartKey],
    actionFrameSelectionActive,
  });
}

export function tuningGroupEditHandleGeometry({
  editFocusContext,
  actionFrameSelectionActive,
  selectedActor,
  groupEditValues,
  editTarget,
}) {
  if (!editTarget?.isGroup) return null;

  return createGroupEditHandleGeometry({
    editFocusContext,
    actionFrameSelectionActive,
    editHandles: selectedActor.player.editHandles,
    hitRegions: selectedActor.player.hitRegions,
    groupEditValues,
    partsOverride: editTarget.targetKeys,
  });
}

function actionPivotCanvasAnchor(selectedActor, actionSettings) {
  const pivot = normalizeActionEditPivot(actionSettings?.editPivot);
  const baseAnchor =
    selectedActor.player.editHandles?.[MASTER_PART_KEY]?.anchor || actionGroupDefaultAnchor(selectedActor);
  return {
    x: baseAnchor.x + pivot.x,
    y: baseAnchor.y + pivot.y,
  };
}

function actionGroupDefaultAnchor(selectedActor) {
  const handles = Object.values(selectedActor.player.editHandles || {})
    .map((handle) => handle?.anchor)
    .filter(Boolean);
  if (!handles.length) return { x: 0, y: 0 };
  return {
    x: handles.reduce((sum, anchor) => sum + anchor.x, 0) / handles.length,
    y: handles.reduce((sum, anchor) => sum + anchor.y, 0) / handles.length,
  };
}

export function findTuningEditHandleAt(point, geometry) {
  return findEditHandleAt(point, geometry);
}
