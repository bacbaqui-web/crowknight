import { enhanceNumberInputs } from './number_input_helper.js';
import {
  bindCanvasDragControls,
  bindEffectTimelineControls,
  bindLayerOrderControls,
  bindPanelKeyboardShortcuts,
  bindPanelShellControls,
  bindActionTimelineControls,
  bindSectionToggle,
  bindSelectionControls,
} from './editor_panel_binding_controller.js';
import {
  bindPartPickerButtons,
  populatePartPickerButtons,
  populateTuningPanelSelects,
} from './editor_panel_dom_helper.js';
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
import { getPath, setPath } from './common_helper.js';
import { bindActionAuthoringControls } from './action_authoring_controller.js';

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
    actorGroupSelect,
    actorSelect,
    actorName,
    partSection,
    actionSection,
    effectSection,
    partPicker,
    actionPartPicker,
    partSelect,
    actionSelect,
    actionGroupSelect,
    actionAdd,
    actionDuplicate,
    actionMove,
    actionDelete,
    actionName,
    actionTriggerHint,
    actionTriggerType,
    actionTriggerSingleKey,
    actionTriggerSequenceKeys,
    actionTriggerMaxGapMs,
    actionTriggerHoldKey,
    actionTriggerPressKey,
    actionTriggerRecord,
    actionTriggerRepeat,
    actionTriggerRecordStatus,
    actionTriggerRecordComplete,
    actionTriggerRecordCancel,
    effectGroupSelect,
    effectSelect,
    actionPartSelect,
    actionDuration,
    actionPlaybackRateRange,
    actionPlaybackRate,
    actionFrameUp,
    actionFrameDown,
    actionPlayback,
    actionPlaybackMode,
    actionMirror,
    actionCancel,
    actionBlend,
    actionCondition,
    actionCopyFrame,
    actionPasteFrame,
    actionUndoFrame,
    actionAddKeyframe,
    actionDeleteKeyframe,
    actionResetAnimation,
    effectDuration,
    effectFileName,
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

  populateTuningPanelSelects(
    { actorGroupSelect, actorSelect, partSelect, actionSelect, actionPartSelect, effectGroupSelect, effectSelect },
    actors,
    rig,
    callbacks.getTuning()
  );
  populatePartPickerButtons(partPicker);
  populatePartPickerButtons(actionPartPicker);

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
    { actorGroupSelect, actorSelect, actorName, partSelect, actionSelect, effectSelect, actionPartSelect },
    {
      onActorGroupChange: callbacks.handleActorGroupChange,
      onActorChange: callbacks.handleActorChange,
      onActorNameInput: callbacks.handleActorNameInput,
      onPartChange: callbacks.handlePartChange,
      onActionChange: null,
      onEffectChange: callbacks.handleEffectChange,
      onActionPartChange: callbacks.handleActionPartChange,
    }
  );
  bindActionAuthoringControls(
    {
      actionGroupSelect,
      actionAdd,
      actionDuplicate,
      actionMove,
      actionDelete,
      actionName,
      actionSelect,
      actionTriggerHint,
      actionTriggerType,
      actionTriggerSingleKey,
      actionTriggerSequenceKeys,
      actionTriggerMaxGapMs,
      actionTriggerHoldKey,
      actionTriggerPressKey,
      actionTriggerRecord,
      actionTriggerRepeat,
      actionTriggerRecordStatus,
      actionTriggerRecordComplete,
      actionTriggerRecordCancel,
      effectGroupSelect,
      effectSelect,
    },
    {
      beginUndoSnapshot: callbacks.beginUndoSnapshot,
      commitUndoSnapshot: callbacks.commitUndoSnapshot,
      getTuning: callbacks.getTuning,
      handleActionChange: callbacks.handleActionChange,
      handleEffectChange: callbacks.handleEffectChange,
      applySelected: callbacks.applySelected,
    }
  );

  bindPartPickerButtons(partPicker, (partKey, append) => callbacks.selectPickerPart('part', partKey, append));
  bindPartPickerButtons(actionPartPicker, (partKey, append) => callbacks.selectPickerPart('action', partKey, append));
  bindSectionToggle(elements.collisionSection, callbacks.openPartSection, callbacks.closePartSection);
  bindSectionToggle(partSection, callbacks.openPartSection, callbacks.closePartSection);
  bindSectionToggle(actionSection, callbacks.openActionSection, callbacks.closeActionSection);
  bindSectionToggle(effectSection, callbacks.openEffectSection, callbacks.clearEffectSelection);

  bindActionTimelineControls(
    {
      actionDuration,
      actionPlaybackRateRange,
      actionPlaybackRate,
      actionFrameUp,
      actionFrameDown,
      actionPlayback,
      actionPlaybackMode,
      actionMirror,
      actionCancel,
      actionBlend,
      actionCondition,
      actionCopyFrame,
      actionPasteFrame,
      actionUndoFrame,
      actionAddKeyframe,
      actionDeleteKeyframe,
      actionResetAnimation,
    },
    {
      updateActionSetting: callbacks.updateActionSetting,
      bindNumberDrag,
      commitUndoSnapshot: callbacks.commitUndoSnapshot,
      updateActionPlaybackRate: callbacks.updateActionPlaybackRate,
      stepActionDuration: callbacks.stepActionDuration,
      toggleActionPlayback: callbacks.toggleActionPlayback,
      toggleActionPlaybackMode: callbacks.toggleActionPlaybackMode,
      toggleActionMirror: callbacks.toggleActionMirror,
      toggleActionCancel: callbacks.toggleActionCancel,
      toggleActionBlend: callbacks.toggleActionBlend,
      toggleActionCondition: callbacks.toggleActionCondition,
      copyActiveActionFrame: callbacks.copyActiveActionFrame,
      pasteActiveActionFrame: callbacks.pasteActiveActionFrame,
      undoTuningChange: callbacks.undoTuningChange,
      addActionKeyframe: callbacks.addActionKeyframe,
      deleteActionKeyframe: callbacks.deleteActionKeyframe,
      resetCurrentActionAnimation: callbacks.resetCurrentActionAnimation,
    }
  );

  bindEffectTimelineControls(
    {
      effectDuration,
      effectFileName,
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
  bindControlMoreMenus([
    { menu: elements.actionMenu, toggle: elements.actionMenuToggle },
    { menu: elements.actionTimelineMenu, toggle: elements.actionTimelineMenuToggle },
    { menu: elements.effectAssetMenu, toggle: elements.effectAssetMenuToggle },
    { menu: elements.effectTimelineMenu, toggle: elements.effectTimelineMenuToggle },
  ]);
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

function bindControlMoreMenus(menuPairs) {
  const pairs = menuPairs.filter(({ menu, toggle }) => menu && toggle);
  if (!pairs.length) return;

  const closeAll = () => pairs.forEach((pair) => setControlMenuOpen(pair, false));

  pairs.forEach((pair) => {
    pair.toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const nextOpen = pair.menu.hidden;
      closeAll();
      setControlMenuOpen(pair, nextOpen);
    });
    pair.menu.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target.closest('button')) setControlMenuOpen(pair, false);
    });
  });

  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
}

function setControlMenuOpen({ menu, toggle }, open) {
  menu.hidden = !open;
  toggle.classList.toggle('is-active', open);
  toggle.setAttribute('aria-expanded', String(open));
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
