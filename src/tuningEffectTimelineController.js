import { createEffectTimelineAdapter } from './effectTimelineAdapter.js';
import { effectPropertyGroups } from './tuningFieldGroups.js';
import { renderEffectImagePreview } from './tuningPanelDom.js';
import { isEmptyEditableSlot } from './tuningTimelineDom.js';
import { markActiveKeyframeButton, moveKeyframeButtons } from './timelineDragControls.js';
import { bindControllerKeyframeDrag } from './timelineControllerView.js';
import { currentEffectTimelineFrame } from './timelineFrameRead.js';
import {
  addTimelineKeyframeAction,
  applyTimelineSelectionAction,
  copyTimelineFrameAction,
  deleteTimelineKeyframeAction,
  finishTimelineMutationAction,
  moveTimelineKeyframeAction,
  pasteTimelineFrameAction,
  refreshTimelineFrameSelectionAction,
  resetTimelineAnimationAction,
  resetTimelineSelectionAction,
  selectTimelineKeyframeAction,
  selectTimelineKeyframeForDragAction,
  selectTimelineSlotAction,
  setFixedTimelineFrameSelectionAction,
} from './timelineControllerActions.js';
import { createTimelineSelectionState, hasTimelineSelection } from './timelineState.js';
import { clearActorEffectPreviews } from './previewState.js';
import { effectFrameValueFromInput, readEffectFrameDisplayValue } from './effectVisualValues.js';
import { renderScrubGroups } from './tuningScrubControls.js';
import {
  clearTimelinePreviewTimer,
  restartTimelinePreviewTimer,
  syncEffectTimelinePreview,
} from './tuningTimelinePreview.js';
import { renderEffectTimelineSettingsView } from './tuningEffectTimelinePanelView.js';
import { defineTimelineController } from './timelineControllerContract.js';
import { createTimelineControllerCore } from './timelineControllerCore.js';

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
    playbackControls,
    renderTimeline,
  } = createTimelineControllerCore({
    timeline: effectTimeline,
    selection: effectSelection,
    durationInput: effectDuration,
    track: effectTimelineTrack,
    addButton: effectAddKeyframe,
    deleteButton: effectDeleteKeyframe,
    beginUndo: beginUndoSnapshot,
    commitUndo: commitUndoSnapshot,
    updateSetting,
    isPlaying: () => effectPreviewPlaying,
    stopPreview,
    syncPreview,
    playPreview,
    renderSettings,
    keyframes: keyframesForTimeline,
    selectSlot,
    bindDrag: bindKeyframeDragHandler,
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
      ensureKeyframe: effectTimeline.ensureKeyframe,
      setFixedFrame: setFrameSilently,
    });
  }

  function writeFrameValue(prop, value) {
    if (!effectSelection.activeKeyframeId && !effectSelection.fixedFrame && effectSelection.selectedSlot !== null) {
      effectSelection.activeKeyframeId = createKeyframeAtSelectedSlot();
    }
    effectTimeline.writeFrameValue({
      prop,
      value,
      activeKeyframeId: effectSelection.activeKeyframeId,
      fixedFrame: effectSelection.fixedFrame,
    });
  }

  function createKeyframeAtSelectedSlot() {
    const keyframes = keyframesForTimeline();
    const slot = isEmptyEditableSlot(effectSelection.selectedSlot, keyframes, getLastSlot(), toSlot)
      ? effectSelection.selectedSlot
      : null;
    if (slot === null) return null;
    const t = slotToValue(slot);
    const id = effectTimeline.addKeyframe(t);
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
    effectTimeline.writeSetting(prop, value);
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
      addKeyframe: effectTimeline.addKeyframe,
      beginUndo: beginUndoSnapshot,
      stopPreview,
      finish: finishTimelineMutation,
    });
  }

  function deleteKeyframe() {
    deleteTimelineKeyframeAction({
      selection: effectSelection,
      deleteKeyframe: effectTimeline.deleteKeyframe,
      beginUndo: beginUndoSnapshot,
      resetSelection: resetSelectionState,
      stopPreview,
      finish: finishTimelineMutation,
    });
  }

  function resetAnimation() {
    resetTimelineAnimationAction({
      beginUndo: beginUndoSnapshot,
      resetAnimation: effectTimeline.resetAnimation,
      resetSelection: resetSelectionState,
      clearCopiedFrame: () => {
        copiedEffectFrame = null;
      },
      stopPreview,
      finish: finishTimelineMutation,
    });
  }

  function copyFrame() {
    copyTimelineFrameAction({
      copyFrame: () =>
        effectTimeline.copyFrame({
          isOpen: effectSection.classList.contains('is-open'),
          id: effectSelection.activeKeyframeId || effectSelection.fixedFrame,
          fallbackFrame: currentFrameValue(),
        }),
      setCopiedFrame: (copy) => {
        copiedEffectFrame = copy;
      },
      afterCopy: renderSettings,
    });
  }

  function pasteFrame() {
    pasteTimelineFrameAction({
      copiedFrame: copiedEffectFrame,
      isOpen: effectSection.classList.contains('is-open'),
      beginUndo: beginUndoSnapshot,
      commitUndo: commitUndoSnapshot,
      pasteTargetFrameId: () =>
        effectTimeline.pasteTargetFrameId({
          selection: effectSelection,
          slotToValue,
        }),
      pasteFrameCopy: (id) =>
        effectTimeline.pasteFrameCopy({
          copiedFrame: copiedEffectFrame,
          id,
        }),
      finish: finishTimelineMutation,
    });
  }

  function finishTimelineMutation() {
    finishTimelineMutationAction({
      renderFields,
      syncPreview,
      applySelected,
      commitUndo: commitUndoSnapshot,
    });
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
    setFixedTimelineFrameSelectionAction({
      targetSelection: effectSelection,
      frame,
      lastSlot: getLastSlot(),
    });
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
    resetTimelineSelectionAction(effectSelection);
  }

  function clearCopiedFrame() {
    copiedEffectFrame = null;
  }

  function applyTimelineSelection(nextSelection) {
    applyTimelineSelectionAction({
      targetSelection: effectSelection,
      nextSelection,
      refresh: refreshFrameSelection,
    });
  }

  function refreshFrameSelection() {
    refreshTimelineFrameSelectionAction({
      stopPreview,
      renderFields,
      syncPreview,
    });
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
      moveKeyframe: (nextT) => effectTimeline.moveKeyframe(id, nextT),
      afterMove: (next) => {
        applySelected();
        effectTimeline.setDragPreview(next.t);
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
      setDragPreview: effectTimeline.setDragPreview,
      setDeleteDisabled: (disabled) => {
        effectDeleteKeyframe.disabled = disabled;
      },
      markActive: (keyframeId) => markActiveKeyframeButton(effectTimelineTrack, keyframeId),
    });
  }

  function keyframesForTimeline() {
    return effectTimeline.keyframes();
  }

  function getActiveT() {
    return effectTimeline.activeT({
      selection: effectSelection,
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
      createPreview: effectTimeline.createPreview,
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
