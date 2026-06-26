import { ensurePoseOffset, ensurePoseSettings, poseKeyframesFor } from './tuningNormalize.js';
import { poseFrameValueFromInput, readPoseFrameDisplayValue } from './tuningFieldValues.js';
import { partPositionSources } from './tuningParts.js';
import { markActiveKeyframeButton, moveKeyframeButtons } from './timelineDragControls.js';
import { bindControllerKeyframeDrag, createControllerTimelineRenderer } from './timelineControllerView.js';
import { currentPoseTimelineFrame } from './timelineFrameRead.js';
import {
  addPoseTimelineKeyframe,
  deletePoseTimelineKeyframe,
  ensurePoseTimelineKeyframe,
  movePoseTimelineKeyframe,
  resetPoseTimelineAnimation,
  writePoseTimelineFrameValue,
} from './timelineKeyframeMutations.js';
import {
  copyActivePoseTimelineFrame,
  pastePoseTimelineFrameCopy,
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
  hasTimelineSelection,
} from './timelineState.js';
import { writePoseTimelineSetting } from './tuningTimelineSettings.js';
import { createTimelineAccessors } from './tuningTimelineAccessors.js';
import {
  clearTimelinePreviewTimer,
  resetActorPosePreviewClock,
  restartTimelinePreviewTimer,
  setPoseTimelineDragPreview,
  syncPoseTimelinePreview,
} from './tuningTimelinePreview.js';
import { isMasterPart } from './tuningLabels.js';
import { renderPoseTimelineSettingsView, syncPoseTimelineToolbarView } from './tuningPoseTimelinePanelView.js';
import { createTimelinePlaybackControls } from './tuningTimelinePlaybackControls.js';
import { MASTER_PART_KEY, POSE_PART_KEYS } from './gameConfig.js';
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

  const {
    frameCount: getFrameCount,
    lastSlot: getLastSlot,
    toSlot,
    slotToValue,
    slotToLeft,
  } = createTimelineAccessors({
    ensureSettings: () => ensurePoseSettings(actor().tuning),
    settingsByKey: () => actor().tuning.poseSettings,
    key: () => poseSelect.value,
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
    settings: () => actor().tuning.poseSettings[poseSelect.value],
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
    ensurePoseSettings(actor().tuning);
    const settings = actor().tuning.poseSettings[poseSelect.value];
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
    ensurePoseSettings(actor().tuning);
    writePoseTimelineSetting(actor().tuning.poseSettings, poseSelect.value, prop, value);
    applySelected();
    syncPreview();
  }

  function readDisplayValue(partKey, offset, prop) {
    return readPoseFrameDisplayValue(partKey, offset, prop, partPositionSources(actor().tuning.rig)[partKey] || {});
  }

  function updateOffset(prop, value) {
    beginUndoSnapshot();
    stopPreview();
    const partKey = getActivePosePartKey() || MASTER_PART_KEY;
    const offset = currentFrameValue(partKey);
    const writeValue = poseFrameValueFromInput(
      partKey,
      prop,
      value,
      partPositionSources(actor().tuning.rig)[partKey] || {}
    );
    writeFrameValue(partKey, prop, writeValue);
    syncPreview();
    applySelected();
    return readDisplayValue(partKey, offset, prop);
  }

  function currentFrameValue(part) {
    return currentPoseTimelineFrame({
      tuning: actor().tuning,
      poseKey: poseSelect.value,
      part,
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
      isMasterPart: isMasterPart(part),
      ensureKeyframe: ensureKeyframeForPart,
    });
  }

  function writeFrameValue(part, prop, value) {
    const frames = actor().tuning.poseOffsets[poseSelect.value][part];
    writePoseTimelineFrameValue({
      frames,
      prop,
      value,
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
      allowRootAnchorWrite: isMasterPart(part),
      ensureKeyframe: ensureKeyframeForPart,
    });
  }

  function playPreview() {
    ensurePoseSettings(actor().tuning);
    posePreviewPlaying = true;
    resetSelectionState();
    resetActorPosePreviewClock(actor());
    syncPreview();

    const settings = actor().tuning.poseSettings[poseSelect.value];
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
      addKeyframe: (t) => addPoseTimelineKeyframe(actor().tuning, poseSelect.value, t),
      beginUndo: beginUndoSnapshot,
      stopPreview,
      finish: () => finishTimelineMutation({ resetGroup: true }),
    });
  }

  function deleteKeyframe() {
    deleteTimelineKeyframeAction({
      selection: poseSelection,
      deleteKeyframe: (id) => deletePoseTimelineKeyframe(actor().tuning, poseSelect.value, id),
      beginUndo: beginUndoSnapshot,
      resetSelection: resetSelectionState,
      stopPreview,
      finish: () => finishTimelineMutation({ resetGroup: true }),
    });
  }

  function resetAnimation() {
    beginUndoSnapshot();
    resetPoseTimelineAnimation(actor().tuning, poseSelect.value);
    resetSelectionState();
    copiedPoseFrame = null;
    stopPreview();
    finishTimelineMutation({ syncToolbar: true });
  }

  function copyFrame() {
    const copy = copyActivePoseTimelineFrame({
      isOpen: poseSection.classList.contains('is-open'),
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
      keyframes: keyframesForTimeline(),
      tuning: actor().tuning,
      poseKey: poseSelect.value,
      selectedPosePartKeys,
      activePosePartKey: getActivePosePartKey(),
    });
    if (!copy) return;
    copiedPoseFrame = copy;
    syncToolbarButtons();
  }

  function pasteFrame() {
    if (!copiedPoseFrame || !poseSection.classList.contains('is-open')) return;
    beginUndoSnapshot();
    const id = pasteTargetFrameId();
    if (!id) {
      commitUndoSnapshot();
      return;
    }

    pastePoseTimelineFrameCopy({
      copiedPoseFrame,
      id,
      tuning: actor().tuning,
      poseKey: poseSelect.value,
      selectedPosePartKeys,
      activePosePartKey: getActivePosePartKey(),
      ensureKeyframe: ensureKeyframeForPart,
    });

    finishTimelineMutation({ resetGroup: true, syncToolbar: true });
  }

  function pasteTargetFrameId() {
    return timelinePasteTargetFrameId({
      selection: poseSelection,
      keyframes: keyframesForTimeline(),
      slotToValue,
      addKeyframe: (t) => addPoseTimelineKeyframe(actor().tuning, poseSelect.value, t),
    });
  }

  function finishTimelineMutation({ resetGroup = false, syncToolbar = false } = {}) {
    if (resetGroup) resetGroupEditValues();
    renderPosePartFields();
    syncPreview();
    applySelected();
    commitUndoSnapshot();
    if (syncToolbar) syncToolbarButtons();
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
    assignTimelineSelection(poseSelection, clearedTimelineSelection());
  }

  function applyTimelineSelection({ selection, kind }, { resetGroup = false } = {}) {
    assignTimelineSelection(poseSelection, selection);
    if (resetGroup || kind === 'fixed') resetGroupEditValues();
    refreshFrameSelection();
  }

  function refreshFrameSelection() {
    stopPreview();
    renderPosePartFields();
    syncPreview();
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
      moveKeyframe: (nextT) => movePoseTimelineKeyframe(actor().tuning, poseSelect.value, id, nextT),
      afterMove: (next) => {
        applySelected();
        setPoseTimelineDragPreview(actor(), poseSelect.value, next.t);
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
      setDragPreview: (t) => setPoseTimelineDragPreview(actor(), poseSelect.value, t),
      setDeleteDisabled: (disabled) => {
        poseDeleteKeyframe.disabled = disabled;
      },
      markActive: (keyframeId) => markActiveKeyframeButton(poseTimelineTrack, keyframeId),
    });
  }

  function getActiveT() {
    const activePosePartKey = getActivePosePartKey();
    const frames = poseSelection.activeKeyframeId
      ? actor().tuning.poseOffsets[poseSelect.value]?.[activePosePartKey || POSE_PART_KEYS[0]]
      : null;
    return activeTimelineT({
      activeKeyframeId: poseSelection.activeKeyframeId,
      selectedSlot: poseSelection.selectedSlot,
      fixedFrame: poseSelection.fixedFrame,
      keyframes: keyframesForTimeline(),
      selectedKeyframe: frames?.keyframes?.find((frame) => frame.id === poseSelection.activeKeyframeId),
      frameCount: getFrameCount(),
    });
  }

  function ensureKeyframeForPart(frames, id) {
    return ensurePoseTimelineKeyframe(frames, id, keyframesForTimeline());
  }

  function keyframesForTimeline() {
    ensurePoseOffset(actor().tuning, poseSelect.value, POSE_PART_KEYS[0]);
    const frames = actor().tuning.poseOffsets[poseSelect.value][POSE_PART_KEYS[0]];
    return poseKeyframesFor(frames);
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
      poseKey: poseSelect.value,
      settings: actor().tuning.poseSettings[poseSelect.value] || {},
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
