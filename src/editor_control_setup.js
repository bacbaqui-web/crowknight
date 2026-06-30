import { enhanceNumberInputs } from './number_input_helper.js';
import {
  bindCanvasDragControls,
  bindEffectTimelineControls,
  bindLayerOrderControls,
  bindPanelKeyboardShortcuts,
  bindPanelShellControls,
  bindPoseTimelineControls,
  bindSectionToggle,
  bindSelectionControls,
} from './editor_panel_bindings.js';
import { bindPartPickerButtons, populatePartPickerButtons, populateTuningPanelSelects } from './editor_panel_dom.js';
import { displayTuningControlValue, storedTuningControlValue } from './control_value_transform_helper.js';
import {
  bindNumericInputUx,
  formatNumericInputValue,
  isNumericInputInProgress,
  isNumericInputLocked,
  isNumericValueInRange,
  normalizeNumericInputValue,
  parseNumericInputValue,
  readNumericInputLimits,
} from './property_numeric_input_helper.js';
import { getPath, setPath } from './utils.js';

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
    layerOrder,
  } = elements;

  populateTuningPanelSelects({ actorSelect, partSelect, poseSelect, posePartSelect, effectSelect }, actors, rig);
  populatePartPickerButtons(partPicker);
  populatePartPickerButtons(posePartPicker);

  fields.forEach(([id, path]) =>
    bindTuningNumericControl({
      id,
      path,
      bindNumberDrag,
      beginUndoSnapshot: callbacks.beginUndoSnapshot,
      commitUndoSnapshot: callbacks.commitUndoSnapshot,
      getTuning: callbacks.getTuning,
      applySelected: callbacks.applySelected,
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
  bindSectionToggle(elements.collisionSection, callbacks.openPartSection, callbacks.closePartSection);
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

  bindLayerOrderControls(layerOrder, callbacks.reorderSelectedLayer);
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

  const limits = readNumericInputLimits(number);
  bindNumericInputUx({ number, range });

  range.addEventListener('input', () => {
    if (isNumericInputLocked(number)) return;
    applyDisplayValue(range.value, { peer: number, source: range, clampValue: false });
  });
  number.addEventListener('input', () => {
    if (isNumericInputInProgress(number.value)) return;
    const parsed = parseNumericInputValue(number.value);
    if (parsed === null || !isNumericValueInRange(parsed, limits)) return;
    applyDisplayValue(number.value, { peer: range });
  });
  bindNumberDrag(number, range, (value, peer) =>
    applyDisplayValue(value, { peer, source: number, clampValue: false, formatInputs: true })
  );
  range.addEventListener('change', () => {
    if (isNumericInputLocked(number)) return;
    applyDisplayValue(range.value, { peer: number, source: range, clampValue: true, formatInputs: true });
    commitUndoSnapshot();
  });
  number.addEventListener('change', commitNumberInput);
  number.addEventListener('blur', commitNumberInput);
  number.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    commitNumberInput();
    number.blur();
  });

  function applyDisplayValue(value, { peer = null, source = null, clampValue = false, formatInputs = false } = {}) {
    const displayInputValue = clampValue
      ? normalizeNumericInputValue(value, limits, currentDisplayValue())
      : Number(value);
    if (!Number.isFinite(displayInputValue)) return;
    const storedValue = storedTuningControlValue(id, displayInputValue);
    const nextDisplayValue = displayTuningControlValue(id, storedValue);
    const inputValue = formatInputs ? formatNumericInputValue(nextDisplayValue, limits.step) : nextDisplayValue;
    beginUndoSnapshot();
    setPath(getTuning(), path, storedValue);
    if (peer) peer.value = inputValue;
    if (source) source.value = inputValue;
    afterUpdate?.(id, storedValue);
    applySelected();
  }

  function commitNumberInput() {
    const normalizedValue = normalizeNumericInputValue(number.value, limits, currentDisplayValue());
    applyDisplayValue(normalizedValue, { peer: range, source: number, clampValue: true, formatInputs: true });
    commitUndoSnapshot();
  }

  function currentDisplayValue() {
    return displayTuningControlValue(id, getPath(getTuning(), path));
  }
}
