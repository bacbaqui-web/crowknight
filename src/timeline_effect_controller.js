import { createEffectTimelineAdapter } from './timeline_effect_adapter.js';
import { renderEffectImagePreview } from './editor_panel_dom_helper.js';
import { isEmptyEditableSlot } from './timeline_dom_helper.js';
import { finishTimelineMutationAction } from './timeline_action_helper.js';
import { createTimelineFrameCommands } from './timeline_command_helper.js';
import { createTimelineKeyframeDragHandler } from './timeline_drag_helper.js';
import { createTimelineSelectionCommands } from './timeline_selection_helper.js';
import { createTimelineSelectionState } from './timeline_state.js';
import { createTimelineClipboardState } from './timeline_clipboard_helper.js';
import { clearActorEffectPreviews } from './preview_state.js';
import { createTimelinePreviewControls, syncEffectTimelinePreview } from './timeline_preview_helper.js';
import { renderEffectTimelineSettingsView } from './timeline_effect_panel_view.js';
import { createTimelineController, createTimelineControllerCommonApi } from './timeline_controller.js';
import { EDIT_CONTEXT_EFFECT } from './edit_target_helper.js';
import { createEffectPropertyController } from './effect_property_controller.js';

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
  const clipboardState = createTimelineClipboardState();
  let previewControls = null;
  let timelineKeyframeDragHandler = null;
  const effectTimeline = createEffectTimelineAdapter({ getActor: actor, effectSelect });
  const effectPropertyController = createEffectPropertyController({
    container: effectFields,
    effectKey: effectTimeline.key,
    currentFrameValue,
    writeFrameValue,
    ensureOffset: effectTimeline.ensureOffset,
    beginUndoSnapshot,
    stopPreview,
    syncPreview,
    applySelected,
    scrubCallbacks,
  });

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
    minFrameCount,
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
    renderEffectImagePreview(effectImagePreview, effectTimeline.key(), effectAssets, effectTimeline.offset()?.image);
    effectPropertyController.render();
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
      effectKey: effectTimeline.key(),
      frameCount: getFrameCount(),
      playing: previewControls.isPlaying(),
      hasSelection: isSectionOpen(),
      hasCopiedFrame: clipboardState.has(),
      undoCount: undoState.undoCount,
      minFrameCount: minFrameCount(),
    });
  }

  const hasFrameSelection = () => hasTimelineFrameSelection({ requireOpenSection: true });

  previewControls = createTimelinePreviewControls({
    ensureSettings: effectTimeline.ensureSettings,
    resetSelection: resetSelectionState,
    syncPreview,
    settings: effectTimeline.settings,
    shouldAutoStop: (settings) => settings.playback === 'once',
  });

  const timelineFrameCommands = createTimelineFrameCommands({
    addTimelineKeyframe,
    deleteTimelineKeyframe,
    resetTimelineAnimation,
    copyTimelineFrame,
    pasteTimelineFrame,
    resetSelectionState,
    clipboardState,
    stopPreview,
    finishAdd: finishTimelineMutation,
    finishDelete: finishTimelineMutation,
    finishReset: finishTimelineMutation,
    finishPaste: finishTimelineMutation,
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
        copiedFrame: clipboardState.get(),
        id,
      }),
    afterCopy: renderSettings,
  });

  const timelineSelectionCommands = createTimelineSelectionCommands({
    selectTimelineKeyframe,
    selectTimelineSlot,
    setContext: () => setEditContext(EDIT_CONTEXT_EFFECT),
    applySelection: applyTimelineSelection,
  });

  timelineKeyframeDragHandler = createTimelineKeyframeDragHandler({
    selectionCommands: timelineSelectionCommands,
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
    clipboardState.clear();
  }

  function applyTimelineSelection(nextSelection) {
    applyTimelineSelectionCore({
      nextSelection,
      renderFields,
    });
  }

  function bindKeyframeDragHandler(button, id) {
    timelineKeyframeDragHandler?.(button, id);
  }

  function getActiveT() {
    return timelineActiveT();
  }

  function syncPreview() {
    const selectionState = frameSelectionState();
    const timelineKeyframeTarget = effectTimeline.timelineKeyframeTarget(selectionState, getFrameCount());
    syncEffectTimelinePreview({
      actors,
      actor: actor(),
      section: effectSection,
      playbackButton: effectPlayback,
      renderTimeline,
      playing: previewControls.isPlaying(),
      timelineKeyframeTarget,
      createPreview: effectTimeline.createPreview,
      getActiveT,
    });
  }

  return defineController({
    common: createTimelineControllerCommonApi({
      playbackControls,
      timelineFrameCommands,
      hasFrameSelection,
      resetSelectionState,
      stopPreview,
      syncPreview,
      updateSetting,
    }),
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
