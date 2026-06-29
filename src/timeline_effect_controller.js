import { createEffectTimelineAdapter } from './timeline_effect_adapter.js';
import { effectPropertyGroups } from './property_field_groups.js';
import { renderEffectImagePreview } from './editor_panel_dom.js';
import { isEmptyEditableSlot } from './timeline_dom_helper.js';
import { finishTimelineMutationAction } from './timeline_action_helper.js';
import { createTimelineFrameCommands } from './timeline_command_helper.js';
import { bindTimelineKeyframeDragWithPreview } from './timeline_drag_helper.js';
import { createTimelineSelectionCommands } from './timeline_selection_helper.js';
import { createTimelineSelectionState } from './timeline_state.js';
import { clearActorEffectPreviews } from './preview_state.js';
import {
  effectFrameValueFromInput,
  isInteractionToggleProp,
  readEffectFrameDisplayValue,
} from './property_value_helper.js';
import { renderScrubGroups } from './property_scrub_helper.js';
import { createTimelinePreviewControls, syncEffectTimelinePreview } from './timeline_preview_helper.js';
import { renderEffectTimelineSettingsView } from './timeline_effect_panel_view.js';
import { createTimelineController } from './timeline_controller.js';

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
  let copiedEffectFrame = null;
  let previewControls = null;
  const effectTimeline = createEffectTimelineAdapter({ getActor: actor, effectSelect });

  const {
    activeT: timelineActiveT,
    addKeyframe: addTimelineKeyframe,
    applySelection: applyTimelineSelectionCore,
    copyFrame: copyTimelineFrame,
    currentFrameValue: timelineCurrentFrameValue,
    deleteKeyframe: deleteTimelineKeyframe,
    frameCount: getFrameCount,
    frameSelectionState,
    hasFrameSelection: hasTimelineFrameSelection,
    isSectionOpen,
    keyframes: keyframesForTimeline,
    lastSlot: getLastSlot,
    toSlot,
    slotToValue,
    slotToLeft,
    playbackControls,
    pasteFrame: pasteTimelineFrame,
    renderTimeline,
    resetAnimation: resetTimelineAnimation,
    resetSelectionState,
    selectKeyframe: selectTimelineKeyframe,
    selectKeyframeForDrag: selectTimelineKeyframeForDrag,
    selectSlot: selectTimelineSlot,
    setFixedFrame,
    defineController,
    updateSetting,
    writeFrameValue: timelineWriteFrameValue,
  } = createTimelineController({
    name: 'effect',
    core: {
      timeline: effectTimeline,
      selection: effectSelection,
      section: effectSection,
      durationInput: effectDuration,
      track: effectTimelineTrack,
      addButton: effectAddKeyframe,
      deleteButton: effectDeleteKeyframe,
      beginUndo: beginUndoSnapshot,
      commitUndo: commitUndoSnapshot,
      applySelected,
      isPlaying: () => previewControls?.isPlaying() || false,
      stopPreview,
      syncPreview,
      playPreview,
      renderSettings,
      selectSlot: (slot) => timelineSelectionCommands.selectSlot(slot),
      bindDrag: bindKeyframeDragHandler,
    },
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
    renderScrubGroups(
      effectFields,
      effectPropertyGroups(currentFrameValue()),
      readDisplayValue,
      updateOffset,
      scrubCallbacks
    );
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
    if (isInteractionToggleProp(prop)) renderFields();
    return readDisplayValue(prop);
  }

  function currentFrameValue() {
    return timelineCurrentFrameValue({
      activeT: getActiveT(),
      setFixedFrame,
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
      playing: previewControls.isPlaying(),
      hasSelection: isSectionOpen(),
      hasCopiedFrame: Boolean(copiedEffectFrame),
      undoCount: undoState.undoCount,
    });
  }

  const hasFrameSelection = () => hasTimelineFrameSelection({ requireOpenSection: true });

  previewControls = createTimelinePreviewControls({
    ensureSettings: effectTimeline.ensureSettings,
    resetSelection: resetSelectionState,
    syncPreview,
    settings: effectTimeline.settings,
    shouldAutoStop: (settings) => settings.playback !== 'loop',
  });

  const timelineFrameCommands = createTimelineFrameCommands({
    addTimelineKeyframe,
    deleteTimelineKeyframe,
    resetTimelineAnimation,
    copyTimelineFrame,
    pasteTimelineFrame,
    resetSelectionState,
    clearCopiedFrame,
    stopPreview,
    finishAdd: finishTimelineMutation,
    finishDelete: finishTimelineMutation,
    finishReset: finishTimelineMutation,
    finishPaste: finishTimelineMutation,
    getCopiedFrame: () => copiedEffectFrame,
    setCopiedFrame: (copy) => {
      copiedEffectFrame = copy;
    },
    createFrameCopy: () =>
      effectTimeline.copyFrame({
        isOpen: isSectionOpen(),
        selection: effectSelection,
        fallbackFrame: currentFrameValue(),
      }),
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
    afterCopy: renderSettings,
  });

  const timelineSelectionCommands = createTimelineSelectionCommands({
    selectTimelineKeyframe,
    selectTimelineSlot,
    setContext: () => setEditContext('effect'),
    applySelection: applyTimelineSelection,
  });

  function playPreview() {
    previewControls.playPreview();
  }

  function stopPreview() {
    previewControls.stopPreview();
  }

  function finishTimelineMutation() {
    finishTimelineMutationAction({
      renderFields,
      syncPreview,
      applySelected,
      commitUndo: commitUndoSnapshot,
    });
  }

  function ensureActiveFrame() {
    effectTimeline.ensureOffset();
    if (!hasTimelineFrameSelection()) setFixedFrame('start');
  }

  function clearSelection() {
    stopPreview();
    resetSelectionState();
    clearActorEffectPreviews(actors);
    renderFields();
  }

  function clearCopiedFrame() {
    copiedEffectFrame = null;
  }

  function applyTimelineSelection(nextSelection) {
    applyTimelineSelectionCore({
      nextSelection,
      renderFields,
    });
  }

  function bindKeyframeDragHandler(button, id) {
    bindTimelineKeyframeDragWithPreview(button, id, {
      selectKeyframe: timelineSelectionCommands.selectKeyframe,
      selectKeyframeForDrag: selectTimelineKeyframeForDrag,
      beginUndo: beginUndoSnapshot,
      commitUndo: commitUndoSnapshot,
      track: effectTimelineTrack,
      frameCount: getFrameCount,
      lastSlot: getLastSlot,
      keyframes: keyframesForTimeline,
      toSlot,
      slotToValue,
      moveKeyframe: (dragId, nextT) => effectTimeline.moveKeyframe(dragId, nextT),
      applySelected,
      setDragPreview: effectTimeline.setDragPreview,
      slotToLeft,
      stopPreview,
      getActiveT,
      afterFinish: renderFields,
    });
  }

  function getActiveT() {
    return timelineActiveT();
  }

  function syncPreview() {
    const selectionState = frameSelectionState();
    syncEffectTimelinePreview({
      actors,
      actor: actor(),
      section: effectSection,
      playbackButton: effectPlayback,
      renderTimeline,
      playing: previewControls.isPlaying(),
      activeKeyframeId: selectionState.activeKeyframeId,
      fixedFrame: selectionState.fixedFrame,
      selectedSlot: selectionState.selectedSlot,
      createPreview: effectTimeline.createPreview,
      getActiveT,
    });
  }

  return defineController({
    common: {
      playbackControls,
      addKeyframe: timelineFrameCommands.addKeyframe,
      copyFrame: timelineFrameCommands.copyFrame,
      deleteKeyframe: timelineFrameCommands.deleteKeyframe,
      hasFrameSelection,
      pasteFrame: timelineFrameCommands.pasteFrame,
      resetAnimation: timelineFrameCommands.resetAnimation,
      resetSelectionState,
      stopPreview,
      syncPreview,
      updateSetting,
    },
    extensions: {
      clearCopiedFrame,
      clearSelection,
      currentFrameValue,
      ensureActiveFrame,
      renderFields,
      writeFrameValue,
    },
  });
}
