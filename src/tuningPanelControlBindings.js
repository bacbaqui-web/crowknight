import { bindNumberDragInput } from './tuningNumberInputs.js';
import { initializeTuningPanelControls } from './tuningPanelControlSetup.js';
import { TUNING_FIELDS } from './gameConfig.js';

export function bindTuningPanelControls({
  actors,
  canvas,
  elements,
  panel,
  applySelected,
  beginUndoSnapshot,
  commitUndoSnapshot,
  getSelectedActor,
  partController,
  lifecycleController,
  poseTimeline,
  effectTimeline,
  timelineFrameActions,
  canvasController,
  moveSelectedLayer,
  undoTuningChange,
  setEditContext,
  setEditFocusContext,
  setEditFocusPartKey,
}) {
  const bindNumberDrag = (number, peer, updateValue) =>
    bindNumberDragInput(number, peer, updateValue, {
      beginChange: beginUndoSnapshot,
      commitChange: commitUndoSnapshot,
    });

  initializeTuningPanelControls({
    panel,
    canvas,
    actors,
    rig: getSelectedActor().tuning.rig,
    fields: TUNING_FIELDS,
    elements,
    bindNumberDrag,
    callbacks: {
      beginUndoSnapshot,
      getTuning: () => getSelectedActor().tuning,
      applySelected,
      handleActorChange: lifecycleController.handleActorChange,
      handleActorNameInput: lifecycleController.handleActorNameInput,
      handlePartChange: partController.handlePartChange,
      handlePoseChange: partController.handlePoseChange,
      handleEffectChange: lifecycleController.handleEffectChange,
      handlePosePartChange: partController.handlePosePartChange,
      selectPickerPart: partController.selectPickerPart,
      openPartSection: partController.openPartSection,
      closePartSection: () => partController.clearPartSelection('part'),
      openPoseSection: partController.openPoseSection,
      closePoseSection: () => partController.clearPartSelection('pose'),
      openEffectSection: () =>
        openTuningPanelEffectSection({
          partController,
          effectTimeline,
          setEditContext,
          setEditFocusContext,
          setEditFocusPartKey,
        }),
      clearEffectSelection: effectTimeline.clearSelection,
      updatePoseSetting: poseTimeline.updateSetting,
      commitUndoSnapshot,
      updatePosePlaybackRate: poseTimeline.updatePlaybackRate,
      stepPoseDuration: poseTimeline.stepDuration,
      togglePosePlayback: poseTimeline.togglePlayback,
      togglePosePlaybackMode: poseTimeline.togglePlaybackMode,
      copyActivePoseFrame: poseTimeline.copyFrame,
      pasteActivePoseFrame: poseTimeline.pasteFrame,
      undoTuningChange,
      addPoseKeyframe: poseTimeline.addKeyframe,
      deletePoseKeyframe: poseTimeline.deleteKeyframe,
      resetCurrentPoseAnimation: poseTimeline.resetAnimation,
      updateEffectSetting: effectTimeline.updateSetting,
      updateEffectPlaybackRate: effectTimeline.updatePlaybackRate,
      stepEffectDuration: effectTimeline.stepDuration,
      toggleEffectPlayback: effectTimeline.togglePlayback,
      toggleEffectPlaybackMode: effectTimeline.togglePlaybackMode,
      copyActiveEffectFrame: effectTimeline.copyFrame,
      pasteActiveEffectFrame: effectTimeline.pasteFrame,
      addEffectKeyframe: effectTimeline.addKeyframe,
      deleteEffectKeyframe: effectTimeline.deleteKeyframe,
      resetCurrentEffectAnimation: effectTimeline.resetAnimation,
      moveSelectedLayer,
      openPanel: lifecycleController.openPanel,
      closePanel: lifecycleController.closePanel,
      copyCurrentFrame: timelineFrameActions.copyCurrentFrame,
      pasteCurrentFrame: timelineFrameActions.pasteCurrentFrame,
      hasFrameSelection: timelineFrameActions.hasCurrentFrameSelection,
      resetSelectedActorTuning: lifecycleController.resetSelectedActorTuning,
      onCanvasPointerDown: canvasController.onPointerDown,
      onCanvasPointerMove: canvasController.onPointerMove,
      endCanvasDrag: canvasController.endDrag,
    },
  });
}

export function openTuningPanelEffectSection({
  partController,
  effectTimeline,
  setEditContext,
  setEditFocusContext,
  setEditFocusPartKey,
}) {
  partController.closeEditSection('part');
  partController.closeEditSection('pose');
  setEditContext('effect');
  setEditFocusContext(null);
  setEditFocusPartKey(null);
  effectTimeline.ensureActiveFrame();
  effectTimeline.renderFields();
  effectTimeline.syncPreview();
}
