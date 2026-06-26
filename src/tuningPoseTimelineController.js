import { createPoseTimelineAdapter } from './poseTimelineAdapter.js';
import { poseFrameValueFromInput, readPoseFrameDisplayValue } from './tuningFieldValues.js';
import { markActiveKeyframeButton, moveKeyframeButtons } from './timelineDragControls.js';
import { bindControllerKeyframeDrag, createControllerTimelineRenderer } from './timelineControllerView.js';
import { currentPoseTimelineFrame } from './timelineFrameRead.js';
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
} from './timelineControllerActions.js';
import { createTimelineSelectionState, hasTimelineSelection } from './timelineState.js';
import { createTimelineAccessors } from './tuningTimelineAccessors.js';
import {
  clearTimelinePreviewTimer,
  restartTimelinePreviewTimer,
  syncPoseTimelinePreview,
} from './tuningTimelinePreview.js';
import { isMasterPart } from './tuningLabels.js';
import { renderPoseTimelineSettingsView, syncPoseTimelineToolbarView } from './tuningPoseTimelinePanelView.js';
import { createTimelinePlaybackControls } from './tuningTimelinePlaybackControls.js';
import { MASTER_PART_KEY } from './gameConfig.js';
import { defineTimelineController } from './timelineControllerContract.js';

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
    frameCount: getFrameCount,
    lastSlot: getLastSlot,
    toSlot,
    slotToValue,
    slotToLeft,
  } = createTimelineAccessors({
    ensureSettings: poseTimeline.ensureSettings,
    settingsByKey: poseTimeline.settingsByKey,
    key: poseTimeline.key,
  });
  const playbackControls = createTimelinePlaybackControls({
    getFrameCount,
    durationInput: poseDuration,
    beginUndo: beginUndoSnapshot,
    commitUndo: commitUndoSnapshot,
    updateSetting,
    isPlaying: () => posePreviewPlaying,
    stopPreview,
    syncPreview,
    playPreview,
    settings: poseTimeline.settings,
  });
  const renderTimeline = createControllerTimelineRenderer({
    renderSettings,
    track: poseTimelineTrack,
    frameCount: getFrameCount,
    keyframes: keyframesForTimeline,
    selection: poseSelection,
    lastSlot: getLastSlot,
    toSlot,
    slotToLeft,
    selectSlot,
    bindDrag: bindKeyframeDragHandler,
    addButton: poseAddKeyframe,
    deleteButton: poseDeleteKeyframe,
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

  const hasFrameSelection = () => hasTimelineSelection(poseSelection, { includeSelectedSlot: false });

  function frameLabel() {
    if (poseSelection.fixedFrame === 'start') return '첫프레임';
    if (poseSelection.fixedFrame === 'end') return '끝프레임';
    if (poseSelection.activeKeyframeId) return '키프레임';
    return '기본';
  }

  function updateSetting(prop, value) {
    beginUndoSnapshot();
    poseTimeline.ensureSettings();
    poseTimeline.writeSetting(prop, value);
    applySelected();
    syncPreview();
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
    return currentPoseTimelineFrame({
      tuning: poseTimeline.tuning(),
      poseKey: poseTimeline.key(),
      part,
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
      isMasterPart: isMasterPart(part),
      ensureKeyframe: poseTimeline.ensureKeyframe,
    });
  }

  function writeFrameValue(part, prop, value) {
    poseTimeline.writeFrameValue({
      part,
      prop,
      value,
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
    });
  }

  function playPreview() {
    poseTimeline.ensureSettings();
    posePreviewPlaying = true;
    resetSelectionState();
    poseTimeline.resetPreviewClock();
    syncPreview();

    const settings = poseTimeline.settings();
    posePreviewTimer = restartTimelinePreviewTimer({
      timer: posePreviewTimer,
      settings,
      shouldAutoStop: settings.playback === 'once',
      onStop: () => {
        posePreviewPlaying = false;
        posePreviewTimer = null;
        syncPreview();
      },
    });
  }

  function stopPreview() {
    posePreviewTimer = clearTimelinePreviewTimer(posePreviewTimer);
    posePreviewPlaying = false;
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
      clearCopiedFrame: () => {
        copiedPoseFrame = null;
      },
      stopPreview,
      finish: () => finishTimelineMutation({ syncToolbar: true }),
    });
  }

  function copyFrame() {
    copyTimelineFrameAction({
      copyFrame: () =>
        poseTimeline.copyFrame({
          isOpen: poseSection.classList.contains('is-open'),
          activeKeyframeId: poseSelection.activeKeyframeId,
          fixedFrame: poseSelection.fixedFrame,
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
      isOpen: poseSection.classList.contains('is-open'),
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
    selectTimelineKeyframeAction({
      id,
      selection: poseSelection,
      keyframes: keyframesForTimeline(),
      toSlot,
      lastSlot: getLastSlot(),
      setContext: () => setEditContext('pose'),
      applySelection: (nextSelection) =>
        applyTimelineSelection(nextSelection, { resetGroup: nextSelection.kind === 'fixed' }),
    });
  }

  function selectSlot(slot) {
    selectTimelineSlotAction({
      slot,
      selection: poseSelection,
      keyframes: keyframesForTimeline(),
      toSlot,
      lastSlot: getLastSlot(),
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
    moveTimelineKeyframeAction({
      id,
      t,
      keyframes: keyframesForTimeline(),
      toSlot,
      slotToValue,
      moveKeyframe: (nextT) => poseTimeline.moveKeyframe(id, nextT),
      afterMove: (next) => {
        applySelected();
        poseTimeline.setDragPreview(next.t);
        moveKeyframeButtons(poseTimelineTrack, id, next.slot, slotToLeft(next.slot));
      },
    });
  }

  function selectKeyframeForDrag(id) {
    selectTimelineKeyframeForDragAction({
      selection: poseSelection,
      id,
      keyframes: keyframesForTimeline(),
      toSlot,
      stopPreview,
      getActiveT,
      setDragPreview: poseTimeline.setDragPreview,
      setDeleteDisabled: (disabled) => {
        poseDeleteKeyframe.disabled = disabled;
      },
      markActive: (keyframeId) => markActiveKeyframeButton(poseTimelineTrack, keyframeId),
    });
  }

  function getActiveT() {
    return poseTimeline.activeT({
      selection: poseSelection,
      frameCount: getFrameCount(),
      activePosePartKey: getActivePosePartKey(),
    });
  }

  function keyframesForTimeline() {
    return poseTimeline.keyframes();
  }

  function syncPreview() {
    syncPoseTimelinePreview({
      actors,
      actor: actor(),
      section: poseSection,
      playbackButton: posePlayback,
      renderTimeline,
      playing: posePreviewPlaying,
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
      selectedSlot: poseSelection.selectedSlot,
      settings: poseTimeline.settings() || {},
      createPreview: poseTimeline.createPreview,
      getActiveT,
    });
  }

  return defineTimelineController(
    'pose',
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
      frameLabel,
      readDisplayValue,
      renderSettings,
      renderTimeline,
      syncToolbarButtons,
      updateOffset,
    }
  );
}
