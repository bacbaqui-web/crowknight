import { enhanceNumberInputs } from './tuningNumberInputs.js';
import {
  bindCanvasDragControls,
  bindEffectTimelineControls,
  bindLayerOrderControls,
  bindPanelKeyboardShortcuts,
  bindPanelShellControls,
  bindPoseTimelineControls,
  bindSectionToggle,
  bindSelectionControls,
} from './tuningPanelBindings.js';
import { bindPartPickerButtons, populatePartPickerButtons, populateTuningPanelSelects } from './tuningPanelDom.js';
import { displayTuningControlValue, storedTuningControlValue } from './tuningControlValueTransforms.js';
import { bindRunMotionLinkControl } from './tuningRunMotionLink.js';
import { setPath } from './utils.js';

export function initializeTuningPanelControls({
  panel,
  canvas,
  actors,
  rig,
  fields,
  elements,
  bindNumberDrag,
  callbacks,
}) {
  const {
    backdrop,
    openButton,
    closeButton,
    resetButton,
    actorSelect,
    actorName,
    partSection,
    poseSection,
    effectSection,
    partPicker,
    posePartPicker,
    partSelect,
    poseSelect,
    effectSelect,
    posePartSelect,
    poseDuration,
    posePlaybackRateRange,
    posePlaybackRate,
    poseFrameUp,
    poseFrameDown,
    posePlayback,
    posePlaybackMode,
    poseCopyFrame,
    posePasteFrame,
    poseUndoFrame,
    poseAddKeyframe,
    poseDeleteKeyframe,
    poseResetAnimation,
    effectDuration,
    effectPlaybackRateRange,
    effectPlaybackRate,
    effectFrameUp,
    effectFrameDown,
    effectPlayback,
    effectPlaybackMode,
    effectCopyFrame,
    effectPasteFrame,
    effectUndoFrame,
    effectAddKeyframe,
    effectDeleteKeyframe,
    effectResetAnimation,
    layerUp,
    layerDown,
  } = elements;

  populateTuningPanelSelects({ actorSelect, partSelect, poseSelect, posePartSelect, effectSelect }, actors, rig);
  populatePartPickerButtons(partPicker);
  populatePartPickerButtons(posePartPicker);

  const runMotionLink = bindRunMotionLinkControl({
    panel,
    beginUndoSnapshot: callbacks.beginUndoSnapshot,
    getTuning: callbacks.getTuning,
    applySelected: callbacks.applySelected,
    commitUndoSnapshot: callbacks.commitUndoSnapshot,
  });

  fields.forEach(([id, path]) =>
    bindTuningNumericControl({
      id,
      path,
      bindNumberDrag,
      beginUndoSnapshot: callbacks.beginUndoSnapshot,
      commitUndoSnapshot: callbacks.commitUndoSnapshot,
      getTuning: callbacks.getTuning,
      applySelected: callbacks.applySelected,
      afterUpdate: runMotionLink.afterTuningFieldUpdate,
    })
  );
  bindSelectionControls(
    { actorSelect, actorName, partSelect, poseSelect, effectSelect, posePartSelect },
    {
      onActorChange: callbacks.handleActorChange,
      onActorNameInput: callbacks.handleActorNameInput,
      onPartChange: callbacks.handlePartChange,
      onPoseChange: callbacks.handlePoseChange,
      onEffectChange: callbacks.handleEffectChange,
      onPosePartChange: callbacks.handlePosePartChange,
    }
  );

  bindPartPickerButtons(partPicker, (partKey, append) => callbacks.selectPickerPart('part', partKey, append));
  bindPartPickerButtons(posePartPicker, (partKey, append) => callbacks.selectPickerPart('pose', partKey, append));
  bindSectionToggle(partSection, callbacks.openPartSection, callbacks.closePartSection);
  bindSectionToggle(poseSection, callbacks.openPoseSection, callbacks.closePoseSection);
  bindSectionToggle(effectSection, callbacks.openEffectSection, callbacks.clearEffectSelection);

  bindPoseTimelineControls(
    {
      poseDuration,
      posePlaybackRateRange,
      posePlaybackRate,
      poseFrameUp,
      poseFrameDown,
      posePlayback,
      posePlaybackMode,
      poseCopyFrame,
      posePasteFrame,
      poseUndoFrame,
      poseAddKeyframe,
      poseDeleteKeyframe,
      poseResetAnimation,
    },
    {
      updatePoseSetting: callbacks.updatePoseSetting,
      bindNumberDrag,
      commitUndoSnapshot: callbacks.commitUndoSnapshot,
      updatePosePlaybackRate: callbacks.updatePosePlaybackRate,
      stepPoseDuration: callbacks.stepPoseDuration,
      togglePosePlayback: callbacks.togglePosePlayback,
      togglePosePlaybackMode: callbacks.togglePosePlaybackMode,
      copyActivePoseFrame: callbacks.copyActivePoseFrame,
      pasteActivePoseFrame: callbacks.pasteActivePoseFrame,
      undoTuningChange: callbacks.undoTuningChange,
      addPoseKeyframe: callbacks.addPoseKeyframe,
      deletePoseKeyframe: callbacks.deletePoseKeyframe,
      resetCurrentPoseAnimation: callbacks.resetCurrentPoseAnimation,
    }
  );

  bindEffectTimelineControls(
    {
      effectDuration,
      effectPlaybackRateRange,
      effectPlaybackRate,
      effectFrameUp,
      effectFrameDown,
      effectPlayback,
      effectPlaybackMode,
      effectCopyFrame,
      effectPasteFrame,
      effectUndoFrame,
      effectAddKeyframe,
      effectDeleteKeyframe,
      effectResetAnimation,
    },
    {
      updateEffectSetting: callbacks.updateEffectSetting,
      bindNumberDrag,
      commitUndoSnapshot: callbacks.commitUndoSnapshot,
      updateEffectPlaybackRate: callbacks.updateEffectPlaybackRate,
      stepEffectDuration: callbacks.stepEffectDuration,
      toggleEffectPlayback: callbacks.toggleEffectPlayback,
      toggleEffectPlaybackMode: callbacks.toggleEffectPlaybackMode,
      copyActiveEffectFrame: callbacks.copyActiveEffectFrame,
      pasteActiveEffectFrame: callbacks.pasteActiveEffectFrame,
      undoTuningChange: callbacks.undoTuningChange,
      addEffectKeyframe: callbacks.addEffectKeyframe,
      deleteEffectKeyframe: callbacks.deleteEffectKeyframe,
      resetCurrentEffectAnimation: callbacks.resetCurrentEffectAnimation,
    }
  );

  bindLayerOrderControls(layerUp, layerDown, callbacks.moveSelectedLayer);
  bindPanelShellControls(
    { panel, openButton, closeButton, backdrop },
    { openPanel: callbacks.openPanel, closePanel: callbacks.closePanel }
  );
  bindPanelKeyboardShortcuts(panel, {
    undoTuningChange: callbacks.undoTuningChange,
    copyCurrentFrame: callbacks.copyCurrentFrame,
    pasteCurrentFrame: callbacks.pasteCurrentFrame,
    hasFrameSelection: callbacks.hasFrameSelection,
  });
  resetButton.addEventListener('click', () => {
    if (!window.confirm('선택 캐릭터 설정을 모두 초기화할까요?')) return;
    callbacks.resetSelectedActorTuning();
  });
  bindCanvasDragControls(canvas, {
    onPointerDown: callbacks.onCanvasPointerDown,
    onPointerMove: callbacks.onCanvasPointerMove,
    onPointerUp: callbacks.endCanvasDrag,
  });
  enhanceNumberInputs(panel);
}

function bindTuningNumericControl({
  id,
  path,
  bindNumberDrag,
  beginUndoSnapshot,
  commitUndoSnapshot,
  getTuning,
  applySelected,
  afterUpdate,
}) {
  const group = document.querySelector(`[data-field="${id}"]`);
  if (!group) return;
  const range = group.querySelector('input[type="range"]');
  const number = group.querySelector('input[type="number"]');

  range.addEventListener('input', () => update(range.value, number, range));
  number.addEventListener('input', () => update(number.value, range, number));
  bindNumberDrag(number, range, update);
  range.addEventListener('change', commitUndoSnapshot);
  number.addEventListener('change', commitUndoSnapshot);
  number.addEventListener('blur', commitUndoSnapshot);

  function update(value, peer, source = null) {
    const storedValue = storedTuningControlValue(id, value);
    const displayValue = displayTuningControlValue(id, storedValue);
    beginUndoSnapshot();
    setPath(getTuning(), path, storedValue);
    peer.value = displayValue;
    if (source) source.value = displayValue;
    afterUpdate?.(id, storedValue);
    applySelected();
  }
}
