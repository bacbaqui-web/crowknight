import { createEffectTimelineAdapter } from './effectTimelineAdapter.js';
import { effectPropertyGroups } from './tuningFieldGroups.js';
import { renderEffectImagePreview } from './tuningPanelDom.js';
import { isEmptyEditableSlot } from './tuningTimelineDom.js';
import { bindControllerKeyframeDrag } from './timelineControllerView.js';
import {
  addTimelineKeyframeAction,
  applyTimelineSelectionAction,
  copyTimelineFrameAction,
  deleteTimelineKeyframeAction,
  finishTimelineMutationAction,
  moveTimelineKeyframeWithPreviewAction,
  pasteTimelineFrameAction,
  refreshTimelineFrameSelectionAction,
  resetTimelineAnimationAction,
  resetTimelineSelectionAction,
  setFixedTimelineFrameSelectionAction,
  updateTimelineSettingAction,
} from './timelineControllerActions.js';
import { createTimelineSelectionState, hasTimelineSelection } from './timelineState.js';
import { clearActorEffectPreviews } from './previewState.js';
import { effectFrameValueFromInput, readEffectFrameDisplayValue } from './effectVisualValues.js';
import { renderScrubGroups } from './tuningScrubControls.js';
import { startTimelinePreview, stopTimelinePreview, syncEffectTimelinePreview } from './tuningTimelinePreview.js';
import { renderEffectTimelineSettingsView } from './tuningEffectTimelinePanelView.js';
import { defineTimelineController } from './timelineControllerContract.js';
import { createTimelineControllerCommonMethods, createTimelineControllerCore } from './timelineControllerCore.js';

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
    activeT: timelineActiveT,
    currentFrameValue: timelineCurrentFrameValue,
    frameCount: getFrameCount,
    hasFrameSelection: hasTimelineFrameSelection,
    keyframes: keyframesForTimeline,
    lastSlot: getLastSlot,
    toSlot,
    slotToValue,
    slotToLeft,
    playbackControls,
    renderTimeline,
    selectKeyframe: selectTimelineKeyframe,
    selectKeyframeForDrag: selectTimelineKeyframeForDrag,
    selectSlot: selectTimelineSlot,
    writeFrameValue: timelineWriteFrameValue,
  } = createTimelineControllerCore({
    timeline: effectTimeline,
    selection: effectSelection,
    section: effectSection,
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
    return timelineCurrentFrameValue({
      activeT: getActiveT(),
      setFixedFrame: setFrameSilently,
    });
  }

  function writeFrameValue(prop, value) {
    if (!effectSelection.activeKeyframeId && !effectSelection.fixedFrame && effectSelection.selectedSlot !== null) {
      effectSelection.activeKeyframeId = createKeyframeAtSelectedSlot();
    }
    timelineWriteFrameValue({
      prop,
      value,
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

  const hasFrameSelection = () => hasTimelineFrameSelection({ requireOpenSection: true });

  function updateSetting(prop, value) {
    updateTimelineSettingAction({
      prop,
      value,
      beginUndo: beginUndoSnapshot,
      ensureSettings: effectTimeline.ensureSettings,
      writeSetting: effectTimeline.writeSetting,
      applySelected,
      syncPreview,
    });
  }

  function playPreview() {
    startTimelinePreview({
      timer: effectPreviewTimer,
      setTimer: (timer) => {
        effectPreviewTimer = timer;
      },
      setPlaying: (playing) => {
        effectPreviewPlaying = playing;
      },
      ensureSettings: effectTimeline.ensureSettings,
      resetSelection: resetSelectionState,
      syncPreview,
      settings: effectTimeline.settings,
      shouldAutoStop: (settings) => settings.playback !== 'loop',
    });
  }

  function stopPreview() {
    stopTimelinePreview({
      timer: effectPreviewTimer,
      setTimer: (timer) => {
        effectPreviewTimer = timer;
      },
      setPlaying: (playing) => {
        effectPreviewPlaying = playing;
      },
    });
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
      clearCopiedFrame,
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
    selectTimelineKeyframe({
      id,
      setContext: () => setEditContext('effect'),
      applySelection: applyTimelineSelection,
    });
  }

  function selectSlot(slot) {
    selectTimelineSlot({
      slot,
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
    moveTimelineKeyframeWithPreviewAction({
      id,
      t,
      keyframes: keyframesForTimeline(),
      toSlot,
      slotToValue,
      moveKeyframe: (nextT) => effectTimeline.moveKeyframe(id, nextT),
      applySelected,
      setDragPreview: effectTimeline.setDragPreview,
      track: effectTimelineTrack,
      slotToLeft,
    });
  }

  function selectKeyframeForDrag(id) {
    selectTimelineKeyframeForDrag({
      id,
      stopPreview,
      getActiveT,
      setDragPreview: effectTimeline.setDragPreview,
    });
  }

  function getActiveT() {
    return timelineActiveT();
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
    createTimelineControllerCommonMethods({
      playbackControls,
      addKeyframe,
      copyFrame,
      deleteKeyframe,
      hasFrameSelection,
      pasteFrame,
      resetAnimation,
      resetSelectionState,
      stopPreview,
      syncPreview,
      updateSetting,
    }),
    {
      clearCopiedFrame,
      clearSelection,
      currentFrameValue,
      ensureActiveFrame,
      renderFields,
      writeFrameValue,
    }
  );
}
