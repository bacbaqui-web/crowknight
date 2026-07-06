import { createPoseTimelineAdapter } from './timeline_pose_adapter.js';
import { poseFrameValueFromInput, readPoseFrameDisplayValue } from './property_value_helper.js';
import { finishTimelineMutationAction } from './timeline_action_helper.js';
import { createTimelineFrameCommands } from './timeline_command_helper.js';
import { createTimelineKeyframeDragHandler } from './timeline_drag_helper.js';
import { createTimelineSelectionCommands } from './timeline_selection_helper.js';
import { createTimelineSelectionState } from './timeline_state.js';
import { createTimelineClipboardState } from './timeline_clipboard_helper.js';
import { createTimelinePreviewControls, syncPoseTimelinePreview } from './timeline_preview_helper.js';
import { renderPoseTimelineSettingsView, syncPoseTimelineToolbarView } from './timeline_pose_panel_view.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import { createTimelineController, createTimelineControllerCommonApi } from './timeline_controller.js';
import { isMasterPart } from './editor_label_helper.js';

export function createPoseTimelineController({
  actors,
  elements,
  undoState,
  selectedPoseParts,
  getSelectedActor,
  getActivePosePartKey,
  setFrameSelectionActive,
  setEditContext,
  resetGroupEditValues,
  renderPosePartFields,
  beginUndoSnapshot,
  commitUndoSnapshot,
  applySelected,
}) {
  const {
    poseSection,
    poseSelect,
    poseDuration,
    posePlayback,
    poseTimelineTrack,
    poseAddKeyframe,
    poseDeleteKeyframe,
  } = elements;

  const poseSelection = createTimelineSelectionState();
  const clipboardState = createTimelineClipboardState();
  let previewControls = null;
  let timelineKeyframeDragHandler = null;
  const poseTimeline = createPoseTimelineAdapter({ getActor: actor, poseSelect });

  const {
    activeT: timelineActiveT,
    addKeyframe: addTimelineKeyframe,
    applyAllFrameValueDelta: applyTimelineAllFrameValueDelta,
    applyAllFrameValueTransform: applyTimelineAllFrameValueTransform,
    applySelection: applyTimelineSelectionCore,
    copyFrame: copyTimelineFrame,
    currentFrameValue: timelineCurrentFrameValue,
    deleteKeyframe: deleteTimelineKeyframe,
    frameCount: getFrameCount,
    frameLabel,
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
    defineController,
    updateSetting,
    writeFrameValue: timelineWriteFrameValue,
  } = createTimelineController({
    name: 'pose',
    core: {
      timeline: poseTimeline,
      selection: poseSelection,
      section: poseSection,
      durationInput: poseDuration,
      track: poseTimelineTrack,
      addButton: poseAddKeyframe,
      deleteButton: poseDeleteKeyframe,
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

  function renderSettings() {
    poseTimeline.ensureSettings();
    const settings = poseTimeline.settings();
    setFrameSelectionActive(
      renderPoseTimelineSettingsView(elements, {
        settings,
        frameCount: getFrameCount(),
        playing: previewControls.isPlaying(),
        hasSelection: hasFrameSelection(),
        hasCopiedFrame: clipboardState.has(),
        undoCount: undoState.undoCount,
        minFrameCount: minFrameCount(),
      })
    );
  }

  function syncToolbarButtons() {
    setFrameSelectionActive(
      syncPoseTimelineToolbarView(elements, {
        hasSelection: hasFrameSelection(),
        hasCopiedFrame: clipboardState.has(),
        undoCount: undoState.undoCount,
        frameCount: getFrameCount(),
        minFrameCount: minFrameCount(),
      })
    );
  }

  const hasFrameSelection = () => hasTimelineFrameSelection({ includeSelectedSlot: false });

  previewControls = createTimelinePreviewControls({
    ensureSettings: poseTimeline.ensureSettings,
    resetSelection: resetSelectionState,
    beforeSync: poseTimeline.resetPreviewClock,
    syncPreview,
    settings: poseTimeline.settings,
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
    finishAdd: () => finishTimelineMutation({ resetGroup: true }),
    finishDelete: () => finishTimelineMutation({ resetGroup: true }),
    finishReset: () => finishTimelineMutation({ syncToolbar: true }),
    finishPaste: () => finishTimelineMutation({ resetGroup: true, syncToolbar: true }),
    createFrameCopy: () =>
      poseTimeline.copyFrame({
        isOpen: isSectionOpen(),
        selection: poseSelection,
        selectedPoseParts,
        activePosePartKey: getActivePosePartKey(),
      }),
    pasteTargetFrameId: () =>
      poseTimeline.pasteTargetFrameId({
        selection: poseSelection,
        slotToValue,
      }),
    pasteFrameCopy: (id) =>
      poseTimeline.pasteFrameCopy({
        copiedFrame: clipboardState.get(),
        id,
        selectedPoseParts,
        activePosePartKey: getActivePosePartKey(),
      }),
    afterCopy: syncToolbarButtons,
  });

  const timelineSelectionCommands = createTimelineSelectionCommands({
    selectTimelineKeyframe,
    selectTimelineSlot,
    setContext: () => setEditContext('pose'),
    applySelection: applyTimelineSelection,
    keyframeOptions: (nextSelection) => ({ resetGroup: nextSelection.kind === 'fixed' }),
    slotOptions: (nextSelection) => ({
      resetGroup: nextSelection.kind === 'empty' || nextSelection.kind === 'fixed',
    }),
  });

  timelineKeyframeDragHandler = createTimelineKeyframeDragHandler({
    selectionCommands: timelineSelectionCommands,
    selectKeyframeForDrag: selectTimelineKeyframeForDrag,
    beginUndo: beginUndoSnapshot,
    commitUndo: commitUndoSnapshot,
    track: poseTimelineTrack,
    frameCount: getFrameCount,
    lastSlot: getLastSlot,
    keyframes: keyframesForTimeline,
    toSlot,
    slotToValue,
    moveKeyframe: (dragId, nextT) => poseTimeline.moveKeyframe(dragId, nextT),
    applySelected,
    setDragPreview: poseTimeline.setDragPreview,
    slotToLeft,
    stopPreview,
    getActiveT,
    afterFinish: () => {
      renderPosePartFields();
    },
  });

  function bindKeyframeDragHandler(button, id) {
    timelineKeyframeDragHandler?.(button, id);
  }

  function readDisplayValue(partKey, offset, prop) {
    return readPoseFrameDisplayValue(partKey, offset, prop, poseTimeline.source(partKey));
  }

  function updateOffset(prop, value) {
    beginUndoSnapshot();
    stopPreview();
    const partKey = getActivePosePartKey() || MASTER_PART_KEY;
    const writeValue = poseFrameValueFromInput(partKey, prop, value, poseTimeline.source(partKey));
    if (!hasFrameTarget() && !isMasterPart(partKey)) {
      const currentValue = Number(currentFrameValue(partKey)?.[prop] ?? 0);
      poseTimeline.applyFrameValueDelta(partKey, prop, writeValue - currentValue);
    } else {
      writeFrameValue(partKey, prop, writeValue);
    }
    syncPreview();
    applySelected();
    return readDisplayValue(partKey, currentFrameValue(partKey), prop);
  }

  function updateAllOffsets(prop, delta, parts) {
    return applyTimelineAllFrameValueDelta(prop, delta, parts);
  }

  function transformAllOffsets(prop, transformValue, parts) {
    return applyTimelineAllFrameValueTransform(prop, transformValue, parts);
  }

  function currentFrameValue(part) {
    return timelineCurrentFrameValue({ part });
  }

  function source(part) {
    return poseTimeline.source(part);
  }

  function writeFrameValue(part, prop, value) {
    timelineWriteFrameValue({
      part,
      prop,
      value,
    });
  }

  function playPreview() {
    previewControls.playPreview();
  }

  function stopPreview() {
    previewControls.stopPreview();
  }

  function finishTimelineMutation({ resetGroup = false, syncToolbar = false } = {}) {
    finishTimelineMutationAction({
      beforeRender: resetGroup ? resetGroupEditValues : null,
      renderFields: renderPosePartFields,
      syncPreview,
      applySelected,
      commitUndo: commitUndoSnapshot,
      afterCommit: syncToolbar ? syncToolbarButtons : null,
    });
  }

  function clearCopiedFrame() {
    clipboardState.clear();
  }

  function hasFrameTarget() {
    return Boolean(poseSelection.activeKeyframeId || poseSelection.fixedFrame || poseSelection.selectedSlot !== null);
  }

  function applyTimelineSelection(nextSelection, { resetGroup = false } = {}) {
    applyTimelineSelectionCore({
      nextSelection,
      beforeRefresh: ({ kind }) => {
        if (resetGroup || kind === 'fixed') resetGroupEditValues();
      },
      renderFields: renderPosePartFields,
    });
  }

  function getActiveT() {
    return timelineActiveT({
      activePosePartKey: getActivePosePartKey(),
    });
  }

  function syncPreview() {
    const selectionState = frameSelectionState();
    syncPoseTimelinePreview({
      actors,
      actor: actor(),
      section: poseSection,
      playbackButton: posePlayback,
      renderTimeline,
      playing: previewControls.isPlaying(),
      activeKeyframeId: selectionState.activeKeyframeId,
      fixedFrame: selectionState.fixedFrame,
      selectedSlot: selectionState.selectedSlot,
      settings: poseTimeline.settings() || {},
      createPreview: poseTimeline.createPreview,
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
      currentFrameValue,
      frameLabel,
      hasFrameTarget,
      readDisplayValue,
      renderSettings,
      renderTimeline,
      source,
      syncToolbarButtons,
      transformAllOffsets,
      updateOffset,
      updateAllOffsets,
      writeFrameValue,
      clearCopiedFrame,
    },
  });
}
