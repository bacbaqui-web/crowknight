import {
  EFFECT_EDIT_HANDLE_KEY,
  createGroupEditHandleGeometry,
  createPartEditHandleGeometry,
  findEditHandleAt,
} from './edit_handle_geometry_helper.js';
import { MASTER_PART_KEY } from './game_config.js';

export function tuningEditHandleGeometry({
  isPanelOpen,
  openEditContext,
  editFocusPartKey,
  selectedActor,
  poseFrameSelectionActive,
  editFocusContext,
  selectedPoseParts,
  groupEditValues,
}) {
  if (!isPanelOpen) return null;

  const focusPartKey =
    editFocusPartKey ||
    (openEditContext === 'pose' ? MASTER_PART_KEY : null) ||
    (openEditContext === 'effect' ? EFFECT_EDIT_HANDLE_KEY : null);
  if (!focusPartKey) return null;

  const groupGeometry = tuningGroupEditHandleGeometry({
    editFocusContext,
    selectedPoseParts,
    poseFrameSelectionActive,
    selectedActor,
    groupEditValues,
  });
  if (groupGeometry) return groupGeometry;

  return createPartEditHandleGeometry({
    editFocusPartKey: focusPartKey,
    editHandleInfo: selectedActor.player.editHandles?.[focusPartKey],
    poseFrameSelectionActive,
  });
}

export function tuningGroupEditHandleGeometry({
  editFocusContext,
  selectedPoseParts,
  poseFrameSelectionActive,
  selectedActor,
  groupEditValues,
}) {
  return createGroupEditHandleGeometry({
    editFocusContext,
    selectedPoseParts,
    poseFrameSelectionActive,
    editHandles: selectedActor.player.editHandles,
    hitRegions: selectedActor.player.hitRegions,
    groupEditValues,
  });
}

export function findTuningEditHandleAt(point, geometry) {
  return findEditHandleAt(point, geometry);
}
