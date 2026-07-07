import { createActionTimelineAdapter } from './timeline_action_adapter.js';
import { actionFrameValueFromInput, readActionFrameDisplayValue } from './property_value_helper.js';
import { finishTimelineMutationAction } from './timeline_action_helper.js';
import { createTimelineFrameCommands } from './timeline_command_helper.js';
import { createTimelineKeyframeDragHandler } from './timeline_drag_helper.js';
import { createTimelineSelectionCommands } from './timeline_selection_helper.js';
import { createTimelineSelectionState } from './timeline_state.js';
import { createTimelineClipboardState } from './timeline_clipboard_helper.js';
import { createTimelinePreviewControls, syncActionTimelinePreview } from './timeline_preview_helper.js';
import { renderActionTimelineSettingsView, syncActionTimelineToolbarView } from './timeline_action_panel_view.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import { createTimelineController, createTimelineControllerCommonApi } from './timeline_controller.js';
import { isMasterPart } from './editor_label_helper.js';
import { isEmptyEditableSlot } from './timeline_dom_helper.js';
import {
  hasActionKeyframeTarget,
  legacySelectionFromActionKeyframeId,
  resolveActionKeyframeTarget,
} from './action_keyframe_target_helper.js';

export function createActionTimelineController({
  actors,
  elements,
  undoState,
  selectedActionParts,
  actionTimelineSelection = createTimelineSelectionState(),
  getSelectedActor,
  getActiveActionPartKey,
  setFrameSelectionActive,
  setEditContext,
  resetGroupEditValues,
  renderActionPartFields,
  beginUndoSnapshot,
  commitUndoSnapshot,
  applySelected,
}) {
  const {
    actionSection,
    actionSelect,
    actionDuration,
    actionPlayback,
    actionTimelineTrack,
    actionAddKeyframe,
    actionDeleteKeyframe,
  } = elements;

  const actionSelection = actionTimelineSelection;
  const clipboardState = createTimelineClipboardState();
  let previewControls = null;
  let timelineKeyframeDragHandler = null;
  const actionTimeline = createActionTimelineAdapter({ getActor: actor, actionSelect });

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
    name: 'action',
    core: {
      timeline: actionTimeline,
      selection: actionSelection,
      section: actionSection,
      durationInput: actionDuration,
      track: actionTimelineTrack,
      addButton: actionAddKeyframe,
      deleteButton: actionDeleteKeyframe,
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
    actionTimeline.ensureSettings();
    const settings = actionTimeline.settings();
    renderActionTimelineSettingsView(elements, {
      settings,
      frameCount: getFrameCount(),
      playing: previewControls.isPlaying(),
      hasSelection: hasFrameSelection(),
      hasCopiedFrame: clipboardState.has(),
      undoCount: undoState.undoCount,
      minFrameCount: minFrameCount(),
    });
    setFrameSelectionActive(hasFrameTarget());
  }

  function syncToolbarButtons() {
    syncActionTimelineToolbarView(elements, {
      hasSelection: hasFrameSelection(),
      hasCopiedFrame: clipboardState.has(),
      undoCount: undoState.undoCount,
      frameCount: getFrameCount(),
      minFrameCount: minFrameCount(),
    });
    setFrameSelectionActive(hasFrameTarget());
  }

  const hasFrameSelection = () => hasTimelineFrameSelection({ includeSelectedSlot: false });

  previewControls = createTimelinePreviewControls({
    ensureSettings: actionTimeline.ensureSettings,
    resetSelection: resetSelectionState,
    beforeSync: actionTimeline.resetPreviewClock,
    syncPreview,
    settings: actionTimeline.settings,
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
      actionTimeline.copyFrame({
        isOpen: isSectionOpen(),
        selection: actionSelection,
        selectedActionParts,
        activeActionPartKey: getActiveActionPartKey(),
      }),
    pasteTargetFrameId: () =>
      actionTimeline.pasteTargetFrameId({
        selection: actionSelection,
        slotToValue,
      }),
    pasteFrameCopy: (id) =>
      actionTimeline.pasteFrameCopy({
        copiedFrame: clipboardState.get(),
        id,
        selectedActionParts,
        activeActionPartKey: getActiveActionPartKey(),
      }),
    afterCopy: syncToolbarButtons,
  });

  const timelineSelectionCommands = createTimelineSelectionCommands({
    selectTimelineKeyframe,
    selectTimelineSlot,
    setContext: () => setEditContext('action'),
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
    track: actionTimelineTrack,
    frameCount: getFrameCount,
    lastSlot: getLastSlot,
    keyframes: keyframesForTimeline,
    toSlot,
    slotToValue,
    moveKeyframe: (dragId, nextT) => actionTimeline.moveKeyframe(dragId, nextT),
    applySelected,
    setDragPreview: actionTimeline.setDragPreview,
    slotToLeft,
    stopPreview,
    getActiveT,
    afterFinish: () => {
      renderActionPartFields();
    },
  });

  function bindKeyframeDragHandler(button, id) {
    timelineKeyframeDragHandler?.(button, id);
  }

  function readDisplayValue(partKey, offset, prop) {
    return readActionFrameDisplayValue(partKey, offset, prop, actionTimeline.source(partKey));
  }

  function updateOffset(prop, value) {
    const partKey = getActiveActionPartKey() || MASTER_PART_KEY;
    return updateOffsetForPart(partKey, prop, value, {
      applyWholeTimelineDelta: !hasFrameTarget() && !isMasterPart(partKey),
    });
  }

  function updateOffsetForPart(partKey, prop, value, { applyWholeTimelineDelta = false } = {}) {
    beginUndoSnapshot();
    stopPreview();
    const writeValue = actionFrameValueFromInput(partKey, prop, value, actionTimeline.source(partKey));
    if (applyWholeTimelineDelta) {
      const currentValue = Number(currentFrameValue(partKey)?.[prop] ?? 0);
      actionTimeline.applyFrameValueDelta(partKey, prop, writeValue - currentValue);
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
    return actionTimeline.source(part);
  }

  function writeFrameValue(part, prop, value) {
    const target = currentActionKeyframeTarget(actionSelection);
    if (!hasActionKeyframeTarget(target) && target.selectedSlot !== null) {
      createKeyframeAtSelectedSlot(target);
    }
    timelineWriteFrameValue({
      part,
      prop,
      value,
    });
  }

  function createKeyframeAtSelectedSlot(target = currentActionKeyframeTarget(actionSelection)) {
    const keyframes = keyframesForTimeline();
    const slot = isEmptyEditableSlot(target.selectedSlot, keyframes, getLastSlot(), toSlot)
      ? target.selectedSlot
      : null;
    if (slot === null) return null;
    const t = slotToValue(slot);
    const id = actionTimeline.addKeyframe(t);
    Object.assign(
      actionSelection,
      legacySelectionFromActionKeyframeId({
        id,
        selectedSlot: slot,
        keyframes: keyframesForTimeline(),
        frameCount: getFrameCount(),
      })
    );
    return id;
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
      renderFields: renderActionPartFields,
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
    const target = currentActionKeyframeTarget(actionSelection);
    return hasActionKeyframeTarget(target) || target.selectedSlot !== null;
  }

  function applyTimelineSelection(nextSelection, { resetGroup = false } = {}) {
    applyTimelineSelectionCore({
      nextSelection,
      beforeRefresh: ({ kind }) => {
        if (resetGroup || kind === 'fixed') resetGroupEditValues();
      },
      renderFields: renderActionPartFields,
    });
  }

  function getActiveT() {
    const target = currentActionKeyframeTarget();
    if (!hasActionKeyframeTarget(target) && target.selectedSlot === null) return 0;
    return timelineActiveT({
      activeActionPartKey: getActiveActionPartKey(),
    });
  }

  function syncPreview() {
    const target = currentActionKeyframeTarget();
    syncActionTimelinePreview({
      actors,
      actor: actor(),
      section: actionSection,
      playbackButton: actionPlayback,
      renderTimeline,
      playing: previewControls.isPlaying(),
      actionKeyframeTarget: target,
      settings: actionTimeline.settings() || {},
      createPreview: actionTimeline.createPreview,
    });
  }

  function currentActionKeyframeTarget(selection = frameSelectionState()) {
    return resolveActionKeyframeTarget({
      selection,
      keyframes: keyframesForTimeline(),
      frameCount: getFrameCount(),
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
      frameCount: getFrameCount,
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
      updateOffsetForPart,
      writeFrameValue,
      clearCopiedFrame,
    },
  });
}
