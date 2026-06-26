import {
  createEffectEditHandleGeometry,
  createGroupEditHandleGeometry,
  createPartEditHandleGeometry,
  findEditHandleAt,
} from './editHandleGeometry.js';
import { MASTER_PART_KEY } from './gameConfig.js';

export function tuningEditHandleGeometry({
  isPanelOpen,
  openEditContext,
  effectEditHandle,
  editFocusPartKey,
  selectedActor,
  poseFrameSelectionActive,
  editFocusContext,
  selectedPosePartKeys,
  groupEditValues,
}) {
  if (!isPanelOpen) return null;

  const effectGeometry = tuningEffectEditHandleGeometry({ openEditContext, effectEditHandle });
  if (effectGeometry) return effectGeometry;

  const focusPartKey = editFocusPartKey || (openEditContext === 'pose' ? MASTER_PART_KEY : null);
  if (!focusPartKey) return null;

  const groupGeometry = tuningGroupEditHandleGeometry({
    editFocusContext,
    selectedPosePartKeys,
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

export function tuningEffectEditHandleGeometry({ openEditContext, effectEditHandle }) {
  if (openEditContext !== 'effect' || !effectEditHandle) return null;
  return createEffectEditHandleGeometry(effectEditHandle);
}

export function tuningGroupEditHandleGeometry({
  editFocusContext,
  selectedPosePartKeys,
  poseFrameSelectionActive,
  selectedActor,
  groupEditValues,
}) {
  return createGroupEditHandleGeometry({
    editFocusContext,
    selectedPosePartKeys,
    poseFrameSelectionActive,
    editHandles: selectedActor.player.editHandles,
    hitRegions: selectedActor.player.hitRegions,
    groupEditValues,
  });
}

export function findTuningEditHandleAt(point, geometry) {
  return findEditHandleAt(point, geometry);
}
