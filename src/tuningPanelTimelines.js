import { createEffectTimelineController } from './tuningEffectTimelineController.js';
import { createPoseTimelineController } from './tuningPoseTimelineController.js';

export function createTuningPanelTimelines({
  actors,
  effectAssets,
  elements,
  undoState,
  scrubCallbacks,
  selectedPoseParts,
  getSelectedActor,
  getActivePosePartKey,
  setFrameSelectionActive,
  setEditContext,
  resetGroupEditValues,
  renderPosePartFields,
  beginUndoSnapshot,
  commitUndoSnapshot,
  applySelected,
}) {
  const poseTimeline = createPoseTimelineController({
    actors,
    elements,
    undoState,
    selectedPoseParts,
    getSelectedActor,
    getActivePosePartKey,
    setFrameSelectionActive,
    setEditContext,
    resetGroupEditValues,
    renderPosePartFields,
    beginUndoSnapshot,
    commitUndoSnapshot,
    applySelected,
  });

  const effectTimeline = createEffectTimelineController({
    actors,
    effectAssets,
    elements,
    undoState,
    scrubCallbacks,
    getSelectedActor,
    setEditContext,
    beginUndoSnapshot,
    commitUndoSnapshot,
    applySelected,
  });

  return { poseTimeline, effectTimeline };
}
