import { createEffectTimelineController } from './tuningEffectTimelineController.js';
import { assertTimelineControllerContract } from './timelineControllerContract.js';
import { createPoseTimelineController } from './tuningPoseTimelineController.js';

export function createTuningPanelTimelines({
  actors,
  effectAssets,
  elements,
  undoState,
  scrubCallbacks,
  selectedPosePartKeys,
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
  const poseTimeline = assertTimelineControllerContract(
    'pose',
    createPoseTimelineController({
      actors,
      elements,
      undoState,
      selectedPosePartKeys,
      getSelectedActor,
      getActivePosePartKey,
      setFrameSelectionActive,
      setEditContext,
      resetGroupEditValues,
      renderPosePartFields,
      beginUndoSnapshot,
      commitUndoSnapshot,
      applySelected,
    })
  );

  const effectTimeline = assertTimelineControllerContract(
    'effect',
    createEffectTimelineController({
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
    })
  );

  return { poseTimeline, effectTimeline };
}
