import { createEffectTimelineAdapter } from './effectTimelineAdapter.js';
import { effectPropertyGroups } from './tuningFieldGroups.js';
import { renderEffectImagePreview } from './tuningPanelDom.js';
import { isEmptyEditableSlot } from './tuningTimelineDom.js';
import { markActiveKeyframeButton, moveKeyframeButtons } from './timelineDragControls.js';
import { bindControllerKeyframeDrag, createControllerTimelineRenderer } from './timelineControllerView.js';
import { currentEffectTimelineFrame } from './timelineFrameRead.js';
import {
  addEffectTimelineKeyframe,
  deleteEffectTimelineKeyframe,
  ensureEffectTimelineKeyframe,
  moveEffectTimelineKeyframe,
  resetEffectTimelineAnimation,
  writeEffectTimelineFrameValue,
} from './timelineKeyframeMutations.js';
import {
  copyActiveEffectTimelineFrame,
  pasteEffectTimelineFrameCopy,
  timelinePasteTargetFrameId,
} from './timelineFrameClipboard.js';
import {
  addTimelineKeyframeAction,
  deleteTimelineKeyframeAction,
  moveTimelineKeyframeAction,
  selectTimelineKeyframeAction,
  selectTimelineKeyframeForDragAction,
  selectTimelineSlotAction,
} from './timelineControllerActions.js';
import {
  activeTimelineT,
  assignTimelineSelection,
  clearedTimelineSelection,
  createTimelineSelectionState,
  fixedTimelineFrameSelection,
  hasTimelineSelection,
} from './timelineState.js';
import { clearActorEffectPreviews } from './previewState.js';
import { effectFrameValueFromInput, readEffectFrameDisplayValue } from './effectVisualValues.js';
import { renderScrubGroups } from './tuningScrubControls.js';
import { writeEffectTimelineSetting } from './tuningTimelineSettings.js';
import { createTimelineAccessors } from './tuningTimelineAccessors.js';
import {
  clearTimelinePreviewTimer,
  restartTimelinePreviewTimer,
  setEffectTimelineDragPreview,
  syncEffectTimelinePreview,
} from './tuningTimelinePreview.js';
import { renderEffectTimelineSettingsView } from './tuningEffectTimelinePanelView.js';
import { createTimelinePlaybackControls } from './tuningTimelinePlaybackControls.js';
import { defineTimelineController } from './timelineControllerContract.js';

export function createEffectTimelineController({
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
}) {
  const {
    effectSection,
    effectSelect,
    effectImagePreview,
    effectFields,
    effectDuration,
    effectPlayback,
    effectTimelineTrack,
    effectAddKeyframe,
    effectDeleteKeyframe,
  } = elements;

  const effectSelection = createTimelineSelectionState();
  let effectPreviewPlaying = false;
  let effectPreviewTimer = null;
  let copiedEffectFrame = null;
  const effectTimeline = createEffectTimelineAdapter({ getActor: actor, effectSelect });

  const {
    frameCount: getFrameCount,
    lastSlot: getLastSlot,
    toSlot,
    slotToValue,
    slotToLeft,
  } = createTimelineAccessors({
    ensureSettings: effectTimeline.ensureSettings,
    settingsByKey: effectTimeline.settingsByKey,
    key: effectTimeline.key,
  });
  const playbackControls = createTimelinePlaybackControls({
    getFrameCount,
    durationInput: effectDuration,
    beginUndo: beginUndoSnapshot,
    commitUndo: commitUndoSnapshot,
    updateSetting,
    isPlaying: () => effectPreviewPlaying,
    stopPreview,
    syncPreview,
    playPreview,
    settings: effectTimeline.settings,
  });
  const renderTimeline = createControllerTimelineRenderer({
    renderSettings,
    track: effectTimelineTrack,
    frameCount: getFrameCount,
    keyframes: keyframesForTimeline,
    selection: effectSelection,
    lastSlot: getLastSlot,
    toSlot,
    slotToLeft,
    selectSlot,
    bindDrag: bindKeyframeDragHandler,
    addButton: effectAddKeyframe,
    deleteButton: effectDeleteKeyframe,
  });

  function actor() {
    return getSelectedActor();
  }

  function renderFields() {
    ensureActiveFrame();
    renderTimeline();
    effectTimeline.ensureOffset();
    renderEffectImagePreview(effectImagePreview, effectTimeline.key(), effectAssets);
    effectFields.innerHTML = '';
    renderScrubGroups(effectFields, effectPropertyGroups(), readDisplayValue, updateOffset, scrubCallbacks);
  }

  function readDisplayValue(prop) {
    const frame = currentFrameValue();
    return readEffectFrameDisplayValue(effectTimeline.key(), frame, prop);
  }

  function updateOffset(prop, value) {
    beginUndoSnapshot();
    stopPreview();
    effectTimeline.ensureOffset();
    const frame = currentFrameValue();
    if (!frame) return readDisplayValue(prop);

    writeFrameValue(prop, effectFrameValueFromInput(effectTimeline.key(), prop, value));
    syncPreview();
    applySelected();
    return readDisplayValue(prop);
  }

  function currentFrameValue() {
    return currentEffectTimelineFrame({
      tuning: actor().tuning,
      effectKey: effectTimeline.key(),
      activeKeyframeId: effectSelection.activeKeyframeId,
      fixedFrame: effectSelection.fixedFrame,
      selectedSlot: effectSelection.selectedSlot,
      activeT: getActiveT(),
      ensureKeyframe,
      setFixedFrame: setFrameSilently,
    });
  }

  function writeFrameValue(prop, value) {
    const effect = effectTimeline.offset();
    if (!effectSelection.activeKeyframeId && !effectSelection.fixedFrame && effectSelection.selectedSlot !== null) {
      effectSelection.activeKeyframeId = createKeyframeAtSelectedSlot();
    }
    writeEffectTimelineFrameValue({
      effect,
      effectKey: effectTimeline.key(),
      prop,
      value,
      activeKeyframeId: effectSelection.activeKeyframeId,
      fixedFrame: effectSelection.fixedFrame,
      ensureKeyframe,
    });
  }

  function createKeyframeAtSelectedSlot() {
    const keyframes = keyframesForTimeline();
    const slot = isEmptyEditableSlot(effectSelection.selectedSlot, keyframes, getLastSlot(), toSlot)
      ? effectSelection.selectedSlot
      : null;
    if (slot === null) return null;
    const t = slotToValue(slot);
    const id = addEffectTimelineKeyframe(actor().tuning, effectTimeline.key(), t);
    effectSelection.activeKeyframeId = id;
    effectSelection.fixedFrame = null;
    effectSelection.selectedSlot = slot;
    return id;
  }

  function renderSettings() {
    effectTimeline.ensureSettings();
    effectTimeline.ensureOffset();
    const settings = effectTimeline.settings();
    renderEffectTimelineSettingsView(elements, {
      settings,
      frameCount: getFrameCount(),
      playing: effectPreviewPlaying,
      hasSelection: effectSection.classList.contains('is-open'),
      hasCopiedFrame: Boolean(copiedEffectFrame),
      undoCount: undoState.undoCount,
    });
  }

  const hasFrameSelection = () => effectSection.classList.contains('is-open') && hasTimelineSelection(effectSelection);

  function updateSetting(prop, value) {
    beginUndoSnapshot();
    effectTimeline.ensureSettings();
    writeEffectTimelineSetting(effectTimeline.settingsByKey(), effectTimeline.key(), prop, value);
    applySelected();
    syncPreview();
  }

  function playPreview() {
    effectTimeline.ensureSettings();
    effectPreviewPlaying = true;
    resetSelectionState();
    syncPreview();

    const settings = effectTimeline.settings();
    effectPreviewTimer = restartTimelinePreviewTimer({
      timer: effectPreviewTimer,
      settings,
      shouldAutoStop: settings.playback !== 'loop',
      onStop: () => {
        effectPreviewPlaying = false;
        effectPreviewTimer = null;
        syncPreview();
      },
    });
  }

  function stopPreview() {
    effectPreviewTimer = clearTimelinePreviewTimer(effectPreviewTimer);
    effectPreviewPlaying = false;
  }

  function addKeyframe() {
    addTimelineKeyframeAction({
      selection: effectSelection,
      keyframes: keyframesForTimeline(),
      lastSlot: getLastSlot(),
      toSlot,
      slotToValue,
      addKeyframe: (t) => addEffectTimelineKeyframe(actor().tuning, effectTimeline.key(), t),
      beginUndo: beginUndoSnapshot,
      stopPreview,
      finish: finishTimelineMutation,
    });
  }

  function deleteKeyframe() {
    deleteTimelineKeyframeAction({
      selection: effectSelection,
      deleteKeyframe: (id) => deleteEffectTimelineKeyframe(actor().tuning, effectTimeline.key(), id),
      beginUndo: beginUndoSnapshot,
      resetSelection: resetSelectionState,
      stopPreview,
      finish: finishTimelineMutation,
    });
  }

  function resetAnimation() {
    beginUndoSnapshot();
    resetEffectTimelineAnimation(actor().tuning, effectTimeline.key());
    resetSelectionState();
    copiedEffectFrame = null;
    stopPreview();
    finishTimelineMutation();
  }

  function copyFrame() {
    const copy = copyActiveEffectTimelineFrame({
      isOpen: effectSection.classList.contains('is-open'),
      effectKey: effectTimeline.key(),
      id: effectSelection.activeKeyframeId || effectSelection.fixedFrame,
      keyframes: keyframesForTimeline(),
      fallbackFrame: currentFrameValue(),
    });
    if (!copy) return;
    copiedEffectFrame = copy;
    renderSettings();
  }

  function pasteFrame() {
    if (!copiedEffectFrame || !effectSection.classList.contains('is-open')) return;
    beginUndoSnapshot();
    const id = pasteTargetFrameId();
    if (!id) {
      commitUndoSnapshot();
      return;
    }

    pasteEffectTimelineFrameCopy({
      copiedEffectFrame,
      effect: effectTimeline.offset(),
      effectKey: effectTimeline.key(),
      id,
      ensureKeyframe,
    });
    finishTimelineMutation();
  }

  function pasteTargetFrameId() {
    return timelinePasteTargetFrameId({
      selection: effectSelection,
      keyframes: keyframesForTimeline(),
      slotToValue,
      addKeyframe: (t) => addEffectTimelineKeyframe(actor().tuning, effectTimeline.key(), t),
      defaultFrameId: 'start',
    });
  }

  function finishTimelineMutation() {
    renderFields();
    syncPreview();
    applySelected();
    commitUndoSnapshot();
  }

  function selectKeyframe(id) {
    selectTimelineKeyframeAction({
      id,
      selection: effectSelection,
      keyframes: keyframesForTimeline(),
      toSlot,
      lastSlot: getLastSlot(),
      setContext: () => setEditContext('effect'),
      applySelection: applyTimelineSelection,
    });
  }

  function selectSlot(slot) {
    selectTimelineSlotAction({
      slot,
      selection: effectSelection,
      keyframes: keyframesForTimeline(),
      toSlot,
      lastSlot: getLastSlot(),
      setContext: () => setEditContext('effect'),
      applySelection: applyTimelineSelection,
    });
  }

  function setFrameSilently(frame) {
    assignTimelineSelection(effectSelection, fixedTimelineFrameSelection(frame, getLastSlot()));
  }

  function ensureActiveFrame() {
    effectTimeline.ensureOffset();
    if (!hasTimelineSelection(effectSelection)) setFrameSilently('start');
  }

  function clearSelection() {
    stopPreview();
    resetSelectionState();
    clearActorEffectPreviews(actors);
    renderFields();
  }

  function resetSelectionState() {
    assignTimelineSelection(effectSelection, clearedTimelineSelection());
  }

  function clearCopiedFrame() {
    copiedEffectFrame = null;
  }

  function applyTimelineSelection({ selection }) {
    assignTimelineSelection(effectSelection, selection);
    refreshFrameSelection();
  }

  function refreshFrameSelection() {
    stopPreview();
    renderFields();
    syncPreview();
  }

  function bindKeyframeDragHandler(button, id) {
    bindControllerKeyframeDrag(button, id, {
      selectKeyframe,
      selectForDrag: selectKeyframeForDrag,
      beginUndo: beginUndoSnapshot,
      moveKeyframe,
      finishUndo: commitUndoSnapshot,
      track: effectTimelineTrack,
      frameCount: getFrameCount,
      lastSlot: getLastSlot,
      afterFinish: renderFields,
    });
  }

  function moveKeyframe(id, t) {
    moveTimelineKeyframeAction({
      id,
      t,
      keyframes: keyframesForTimeline(),
      toSlot,
      slotToValue,
      moveKeyframe: (nextT) => moveEffectTimelineKeyframe(actor().tuning, effectTimeline.key(), id, nextT),
      afterMove: (next) => {
        applySelected();
        setEffectTimelineDragPreview(actor(), effectTimeline.key(), next.t);
        moveKeyframeButtons(effectTimelineTrack, id, next.slot, slotToLeft(next.slot));
      },
    });
  }

  function selectKeyframeForDrag(id) {
    selectTimelineKeyframeForDragAction({
      selection: effectSelection,
      id,
      keyframes: keyframesForTimeline(),
      toSlot,
      stopPreview,
      getActiveT,
      setDragPreview: (t) => setEffectTimelineDragPreview(actor(), effectTimeline.key(), t),
      setDeleteDisabled: (disabled) => {
        effectDeleteKeyframe.disabled = disabled;
      },
      markActive: (keyframeId) => markActiveKeyframeButton(effectTimelineTrack, keyframeId),
    });
  }

  function ensureKeyframe(effect, id) {
    effectTimeline.ensureOffset();
    return ensureEffectTimelineKeyframe(effect, effectTimeline.key(), id, keyframesForTimeline());
  }

  function keyframesForTimeline() {
    return effectTimeline.keyframes();
  }

  function getActiveT() {
    return activeTimelineT({
      activeKeyframeId: effectSelection.activeKeyframeId,
      selectedSlot: effectSelection.selectedSlot,
      fixedFrame: effectSelection.fixedFrame,
      keyframes: keyframesForTimeline(),
      selectedKeyframe: effectTimeline
        .offset()
        ?.keyframes?.find((frame) => frame.id === effectSelection.activeKeyframeId),
      frameCount: getFrameCount(),
    });
  }

  function syncPreview() {
    syncEffectTimelinePreview({
      actors,
      actor: actor(),
      section: effectSection,
      playbackButton: effectPlayback,
      renderTimeline,
      playing: effectPreviewPlaying,
      activeKeyframeId: effectSelection.activeKeyframeId,
      fixedFrame: effectSelection.fixedFrame,
      selectedSlot: effectSelection.selectedSlot,
      effectKey: effectTimeline.key(),
      getActiveT,
    });
  }

  return defineTimelineController(
    'effect',
    {
      addKeyframe,
      copyFrame,
      currentFrameValue,
      deleteKeyframe,
      hasFrameSelection,
      pasteFrame,
      resetAnimation,
      resetSelectionState,
      stepDuration: playbackControls.stepDuration,
      stopPreview,
      syncPreview,
      togglePlayback: playbackControls.togglePlayback,
      togglePlaybackMode: playbackControls.togglePlaybackMode,
      updatePlaybackRate: playbackControls.updatePlaybackRate,
      updateSetting,
      writeFrameValue,
    },
    {
      clearCopiedFrame,
      clearSelection,
      ensureActiveFrame,
      renderFields,
    }
  );
}
