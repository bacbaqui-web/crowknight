import {
  createEffectEditHandleGeometry,
  createGroupEditHandleGeometry,
  createPartEditHandleGeometry,
  findEditHandleAt,
} from './editHandleGeometry.js';

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

  if (!editFocusPartKey) return null;

  const groupGeometry = tuningGroupEditHandleGeometry({
    editFocusContext,
    selectedPosePartKeys,
    poseFrameSelectionActive,
    selectedActor,
    groupEditValues,
  });
  if (groupGeometry) return groupGeometry;

  return createPartEditHandleGeometry({
    editFocusPartKey,
    editHandleInfo: selectedActor.player.editHandles?.[editFocusPartKey],
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
