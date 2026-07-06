import { bindNumberDragInput } from './number_input_helper.js';
import { initializeTuningPanelControls } from './editor_control_setup_controller.js';
import { TUNING_FIELDS } from './game_config_data.js';

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
  actionTimeline,
  effectTimeline,
  timelineFrameActions,
  canvasController,
  reorderSelectedLayer,
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
      handleActorGroupChange: lifecycleController.handleActorGroupChange,
      handleActorChange: lifecycleController.handleActorChange,
      handleActorNameInput: lifecycleController.handleActorNameInput,
      handlePartChange: partController.handlePartChange,
      handleActionChange: partController.handleActionChange,
      handleEffectChange: lifecycleController.handleEffectChange,
      handleActionPartChange: partController.handleActionPartChange,
      selectPickerPart: partController.selectPickerPart,
      openPartSection: partController.openPartSection,
      closePartSection: () => partController.clearPartSelection('part'),
      openActionSection: partController.openActionSection,
      closeActionSection: () => partController.clearPartSelection('action'),
      openEffectSection: () =>
        openTuningPanelEffectSection({
          partController,
          effectTimeline,
          setEditContext,
          setEditFocusContext,
          setEditFocusPartKey,
        }),
      clearEffectSelection: effectTimeline.clearSelection,
      updateActionSetting: actionTimeline.updateSetting,
      commitUndoSnapshot,
      updateActionPlaybackRate: actionTimeline.updatePlaybackRate,
      stepActionDuration: actionTimeline.stepDuration,
      toggleActionPlayback: actionTimeline.togglePlayback,
      toggleActionPlaybackMode: actionTimeline.togglePlaybackMode,
      toggleActionMirror: actionTimeline.toggleMirror,
      toggleActionCancel: actionTimeline.toggleInterruptible,
      toggleActionBlend: actionTimeline.toggleBlend,
      toggleActionCondition: actionTimeline.toggleCondition,
      copyActiveActionFrame: actionTimeline.copyFrame,
      pasteActiveActionFrame: actionTimeline.pasteFrame,
      undoTuningChange,
      addActionKeyframe: actionTimeline.addKeyframe,
      deleteActionKeyframe: actionTimeline.deleteKeyframe,
      resetCurrentActionAnimation: actionTimeline.resetAnimation,
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
      reorderSelectedLayer,
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
  partController.closeEditSection('action');
  setEditContext('effect');
  setEditFocusContext(null);
  setEditFocusPartKey(null);
  effectTimeline.ensureActiveFrame();
  effectTimeline.renderFields();
  effectTimeline.syncPreview();
}
