import { createPoseTimelineAdapter } from './poseTimelineAdapter.js';
import { poseFrameValueFromInput, readPoseFrameDisplayValue } from './tuningFieldValues.js';
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
  updateTimelineSettingAction,
} from './timelineControllerActions.js';
import { createTimelineSelectionState } from './timelineState.js';
import { startTimelinePreview, stopTimelinePreview, syncPoseTimelinePreview } from './tuningTimelinePreview.js';
import { renderPoseTimelineSettingsView, syncPoseTimelineToolbarView } from './tuningPoseTimelinePanelView.js';
import { MASTER_PART_KEY } from './gameConfig.js';
import { defineTimelineController } from './timelineControllerContract.js';
import { createTimelineControllerCommonMethods, createTimelineControllerCore } from './timelineControllerCore.js';

export function createPoseTimelineController({
  actors,
  elements,
  undoState,
  selectedPosePartKeys,
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
  let posePreviewPlaying = false;
  let posePreviewTimer = null;
  let copiedPoseFrame = null;
  const poseTimeline = createPoseTimelineAdapter({ getActor: actor, poseSelect });

  const {
    activeT: timelineActiveT,
    currentFrameValue: timelineCurrentFrameValue,
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
    renderTimeline,
    selectKeyframe: selectTimelineKeyframe,
    selectKeyframeForDrag: selectTimelineKeyframeForDrag,
    selectSlot: selectTimelineSlot,
    writeFrameValue: timelineWriteFrameValue,
  } = createTimelineControllerCore({
    timeline: poseTimeline,
    selection: poseSelection,
    section: poseSection,
    durationInput: poseDuration,
    track: poseTimelineTrack,
    addButton: poseAddKeyframe,
    deleteButton: poseDeleteKeyframe,
    beginUndo: beginUndoSnapshot,
    commitUndo: commitUndoSnapshot,
    updateSetting,
    isPlaying: () => posePreviewPlaying,
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

  function renderSettings() {
    poseTimeline.ensureSettings();
    const settings = poseTimeline.settings();
    setFrameSelectionActive(
      renderPoseTimelineSettingsView(elements, {
        settings,
        frameCount: getFrameCount(),
        playing: posePreviewPlaying,
        hasSelection: hasFrameSelection(),
        hasCopiedFrame: Boolean(copiedPoseFrame),
        undoCount: undoState.undoCount,
      })
    );
  }

  function syncToolbarButtons() {
    setFrameSelectionActive(
      syncPoseTimelineToolbarView(elements, {
        hasSelection: hasFrameSelection(),
        hasCopiedFrame: Boolean(copiedPoseFrame),
        undoCount: undoState.undoCount,
        frameCount: getFrameCount(),
      })
    );
  }

  const hasFrameSelection = () => hasTimelineFrameSelection({ includeSelectedSlot: false });

  function frameLabel() {
    if (poseSelection.fixedFrame === 'start') return '첫프레임';
    if (poseSelection.fixedFrame === 'end') return '끝프레임';
    if (poseSelection.activeKeyframeId) return '키프레임';
    return '기본';
  }

  function updateSetting(prop, value) {
    updateTimelineSettingAction({
      prop,
      value,
      beginUndo: beginUndoSnapshot,
      ensureSettings: poseTimeline.ensureSettings,
      writeSetting: poseTimeline.writeSetting,
      applySelected,
      syncPreview,
    });
  }

  function readDisplayValue(partKey, offset, prop) {
    return readPoseFrameDisplayValue(partKey, offset, prop, poseTimeline.source(partKey));
  }

  function updateOffset(prop, value) {
    beginUndoSnapshot();
    stopPreview();
    const partKey = getActivePosePartKey() || MASTER_PART_KEY;
    const offset = currentFrameValue(partKey);
    const writeValue = poseFrameValueFromInput(partKey, prop, value, poseTimeline.source(partKey));
    writeFrameValue(partKey, prop, writeValue);
    syncPreview();
    applySelected();
    return readDisplayValue(partKey, offset, prop);
  }

  function currentFrameValue(part) {
    return timelineCurrentFrameValue({ part });
  }

  function writeFrameValue(part, prop, value) {
    timelineWriteFrameValue({
      part,
      prop,
      value,
    });
  }

  function playPreview() {
    startTimelinePreview({
      timer: posePreviewTimer,
      setTimer: (timer) => {
        posePreviewTimer = timer;
      },
      setPlaying: (playing) => {
        posePreviewPlaying = playing;
      },
      ensureSettings: poseTimeline.ensureSettings,
      resetSelection: resetSelectionState,
      beforeSync: poseTimeline.resetPreviewClock,
      syncPreview,
      settings: poseTimeline.settings,
      shouldAutoStop: (settings) => settings.playback === 'once',
    });
  }

  function stopPreview() {
    stopTimelinePreview({
      timer: posePreviewTimer,
      setTimer: (timer) => {
        posePreviewTimer = timer;
      },
      setPlaying: (playing) => {
        posePreviewPlaying = playing;
      },
    });
  }

  function addKeyframe() {
    addTimelineKeyframeAction({
      selection: poseSelection,
      keyframes: keyframesForTimeline(),
      lastSlot: getLastSlot(),
      toSlot,
      slotToValue,
      addKeyframe: poseTimeline.addKeyframe,
      beginUndo: beginUndoSnapshot,
      stopPreview,
      finish: () => finishTimelineMutation({ resetGroup: true }),
    });
  }

  function deleteKeyframe() {
    deleteTimelineKeyframeAction({
      selection: poseSelection,
      deleteKeyframe: poseTimeline.deleteKeyframe,
      beginUndo: beginUndoSnapshot,
      resetSelection: resetSelectionState,
      stopPreview,
      finish: () => finishTimelineMutation({ resetGroup: true }),
    });
  }

  function resetAnimation() {
    resetTimelineAnimationAction({
      beginUndo: beginUndoSnapshot,
      resetAnimation: poseTimeline.resetAnimation,
      resetSelection: resetSelectionState,
      clearCopiedFrame,
      stopPreview,
      finish: () => finishTimelineMutation({ syncToolbar: true }),
    });
  }

  function copyFrame() {
    copyTimelineFrameAction({
      copyFrame: () =>
        poseTimeline.copyFrame({
          isOpen: isSectionOpen(),
          selection: poseSelection,
          selectedPosePartKeys,
          activePosePartKey: getActivePosePartKey(),
        }),
      setCopiedFrame: (copy) => {
        copiedPoseFrame = copy;
      },
      afterCopy: syncToolbarButtons,
    });
  }

  function pasteFrame() {
    pasteTimelineFrameAction({
      copiedFrame: copiedPoseFrame,
      isOpen: isSectionOpen(),
      beginUndo: beginUndoSnapshot,
      commitUndo: commitUndoSnapshot,
      pasteTargetFrameId: () =>
        poseTimeline.pasteTargetFrameId({
          selection: poseSelection,
          slotToValue,
        }),
      pasteFrameCopy: (id) =>
        poseTimeline.pasteFrameCopy({
          copiedFrame: copiedPoseFrame,
          id,
          selectedPosePartKeys,
          activePosePartKey: getActivePosePartKey(),
        }),
      finish: () => finishTimelineMutation({ resetGroup: true, syncToolbar: true }),
    });
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

  function selectKeyframe(id) {
    selectTimelineKeyframe({
      id,
      setContext: () => setEditContext('pose'),
      applySelection: (nextSelection) =>
        applyTimelineSelection(nextSelection, { resetGroup: nextSelection.kind === 'fixed' }),
    });
  }

  function selectSlot(slot) {
    selectTimelineSlot({
      slot,
      setContext: () => setEditContext('pose'),
      applySelection: (nextSelection) =>
        applyTimelineSelection(nextSelection, {
          resetGroup: nextSelection.kind === 'empty' || nextSelection.kind === 'fixed',
        }),
    });
  }

  function resetSelectionState() {
    resetTimelineSelectionAction(poseSelection);
  }

  function clearCopiedFrame() {
    copiedPoseFrame = null;
  }

  function applyTimelineSelection(nextSelection, { resetGroup = false } = {}) {
    applyTimelineSelectionAction({
      targetSelection: poseSelection,
      nextSelection,
      beforeRefresh: ({ kind }) => {
        if (resetGroup || kind === 'fixed') resetGroupEditValues();
      },
      refresh: refreshFrameSelection,
    });
  }

  function refreshFrameSelection() {
    refreshTimelineFrameSelectionAction({
      stopPreview,
      renderFields: renderPosePartFields,
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
      track: poseTimelineTrack,
      frameCount: getFrameCount,
      lastSlot: getLastSlot,
      afterFinish: () => {
        if (getActivePosePartKey()) renderPosePartFields();
      },
    });
  }

  function moveKeyframe(id, t) {
    moveTimelineKeyframeWithPreviewAction({
      id,
      t,
      keyframes: keyframesForTimeline(),
      toSlot,
      slotToValue,
      moveKeyframe: (nextT) => poseTimeline.moveKeyframe(id, nextT),
      applySelected,
      setDragPreview: poseTimeline.setDragPreview,
      track: poseTimelineTrack,
      slotToLeft,
    });
  }

  function selectKeyframeForDrag(id) {
    selectTimelineKeyframeForDrag({
      id,
      stopPreview,
      getActiveT,
      setDragPreview: poseTimeline.setDragPreview,
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
      playing: posePreviewPlaying,
      activeKeyframeId: selectionState.activeKeyframeId,
      fixedFrame: selectionState.fixedFrame,
      selectedSlot: selectionState.selectedSlot,
      settings: poseTimeline.settings() || {},
      createPreview: poseTimeline.createPreview,
      getActiveT,
    });
  }

  return defineTimelineController(
    'pose',
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
      currentFrameValue,
      frameLabel,
      readDisplayValue,
      renderSettings,
      renderTimeline,
      syncToolbarButtons,
      updateOffset,
      writeFrameValue,
      clearCopiedFrame,
    }
  );
}
