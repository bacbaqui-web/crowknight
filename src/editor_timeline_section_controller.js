import { createEffectTimelineController } from './timeline_effect_controller.js';
import { createActionTimelineController } from './timeline_action_controller.js';

export function createTuningPanelTimelines({
  actors,
  effectAssets,
  elements,
  undoState,
  scrubCallbacks,
  selectedActionParts,
  actionTimelineSelection,
  getSelectedActor,
  getActiveActionPartKey,
  getEditTarget,
  setFrameSelectionActive,
  setEditContext,
  resetGroupEditValues,
  renderActionPartFields,
  beginUndoSnapshot,
  commitUndoSnapshot,
  applySelected,
}) {
  const actionTimeline = createActionTimelineController({
    actors,
    elements,
    undoState,
    selectedActionParts,
    actionTimelineSelection,
    getSelectedActor,
    getActiveActionPartKey,
    setFrameSelectionActive,
    setEditContext,
    resetGroupEditValues,
    renderActionPartFields,
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
    getEditTarget,
    setEditContext,
    beginUndoSnapshot,
    commitUndoSnapshot,
    applySelected,
  });

  return { actionTimeline, effectTimeline };
}
