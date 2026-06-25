import { ensurePoseOffset, ensurePoseSettings, poseKeyframesFor } from './tuningNormalize.js';
import { poseFrameValueFromInput, readPoseFrameDisplayValue } from './tuningFieldValues.js';
import { partPositionSources } from './tuningParts.js';
import { selectedOrFirstEmptySlot } from './tuningTimelineDom.js';
import {
  bindKeyframeDrag,
  markActiveKeyframeButton,
  moveKeyframeButtons,
  timelinePointerValue,
} from './timelineDragControls.js';
import { renderSelectedKeyframeTimeline } from './timelineRenderer.js';
import { currentPoseTimelineFrame } from './timelineFrameRead.js';
import {
  addPoseTimelineKeyframe,
  deletePoseTimelineKeyframe,
  ensurePoseTimelineKeyframe,
  movePoseTimelineKeyframe,
  resetPoseTimelineAnimation,
  writePoseTimelineFrameValue,
} from './timelineKeyframeMutations.js';
import { copyActivePoseTimelineFrame, pastePoseTimelineFrameCopy } from './timelineFrameClipboard.js';
import {
  activeTimelineT,
  assignTimelineSelection,
  clearedTimelineSelection,
  createTimelineSelectionState,
  hasTimelineSelection,
  isTimelineFrameId,
  movedTimelineKeyframeTarget,
  selectedTimelineFrameSelection,
  selectedTimelineSlotSelection,
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

export function createPoseTimelineController({
  actors,
  elements,
  undoState,
  selectedPosePartKeys,
  getSelectedActor,
  getActivePosePartKey,
  getFrameSelectionActive,
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
        hasSelection: getFrameSelectionActive(),
        hasCopiedFrame: Boolean(copiedPoseFrame),
        undoCount: undoState.undoCount,
      })
    );
  }

  function syncToolbarButtons() {
    setFrameSelectionActive(
      syncPoseTimelineToolbarView(elements, {
        hasSelection: getFrameSelectionActive(),
        hasCopiedFrame: Boolean(copiedPoseFrame),
        undoCount: undoState.undoCount,
        frameCount: getFrameCount(),
      })
    );
  }

  const hasFrameSelection = () => hasTimelineSelection(poseSelection, { includeSelectedSlot: false });

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
    poseSelection.activeKeyframeId = null;
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
    const slot = selectedOrFirstEmptySlot(poseSelection.selectedSlot, keyframesForTimeline(), getLastSlot(), toSlot);
    if (!slot) return;
    beginUndoSnapshot();
    const t = slotToValue(slot);
    const id = addPoseTimelineKeyframe(actor().tuning, poseSelect.value, t);
    poseSelection.activeKeyframeId = id;
    poseSelection.selectedSlot = slot;
    stopPreview();
    finishTimelineMutation({ resetGroup: true });
  }

  function deleteKeyframe() {
    if (!poseSelection.activeKeyframeId) return;
    beginUndoSnapshot();
    deletePoseTimelineKeyframe(actor().tuning, poseSelect.value, poseSelection.activeKeyframeId);
    resetSelectionState();
    stopPreview();
    finishTimelineMutation({ resetGroup: true });
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
    const id = poseSelection.activeKeyframeId || poseSelection.fixedFrame;
    if (!isTimelineFrameId(id, keyframesForTimeline())) return;

    beginUndoSnapshot();
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

  function finishTimelineMutation({ resetGroup = false, syncToolbar = false } = {}) {
    if (resetGroup) resetGroupEditValues();
    renderPosePartFields();
    syncPreview();
    applySelected();
    commitUndoSnapshot();
    if (syncToolbar) syncToolbarButtons();
  }

  function renderTimeline() {
    renderSelectedKeyframeTimeline({
      renderSettings,
      track: poseTimelineTrack,
      frameCount: getFrameCount(),
      keyframes: keyframesForTimeline(),
      selection: poseSelection,
      lastSlot: getLastSlot(),
      toSlot,
      slotToLeft,
      selectSlot,
      bindDrag: bindKeyframeDragHandler,
      addButton: poseAddKeyframe,
      deleteButton: poseDeleteKeyframe,
    });
  }

  function selectKeyframe(id) {
    setEditContext('pose');
    const nextSelection = selectedTimelineFrameSelection({
      id,
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
      keyframes: keyframesForTimeline(),
      toSlot,
      lastSlot: getLastSlot(),
    });
    applyTimelineSelection(nextSelection, { resetGroup: nextSelection.kind === 'fixed' });
  }

  function selectSlot(slot) {
    setEditContext('pose');
    const nextSelection = selectedTimelineSlotSelection({
      slot,
      selectedSlot: poseSelection.selectedSlot,
      activeKeyframeId: poseSelection.activeKeyframeId,
      fixedFrame: poseSelection.fixedFrame,
      keyframes: keyframesForTimeline(),
      toSlot,
      lastSlot: getLastSlot(),
    });
    applyTimelineSelection(nextSelection, {
      resetGroup: nextSelection.kind === 'empty' || nextSelection.kind === 'fixed',
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
    bindKeyframeDrag(button, id, {
      selectKeyframe,
      selectForDrag: selectKeyframeForDrag,
      beginUndo: beginUndoSnapshot,
      moveKeyframe,
      pointerT: timelinePointerT,
      finishUndo: commitUndoSnapshot,
      afterFinish: () => {
        if (getActivePosePartKey()) renderPosePartFields();
      },
    });
  }

  function timelinePointerT(event) {
    return timelinePointerValue(event, poseTimelineTrack, getFrameCount(), getLastSlot());
  }

  function moveKeyframe(id, t) {
    const next = movedTimelineKeyframeTarget({
      id,
      t,
      keyframes: keyframesForTimeline(),
      toSlot,
      slotToValue,
    });
    if (!next) return;
    if (!movePoseTimelineKeyframe(actor().tuning, poseSelect.value, id, next.t)) return;
    applySelected();
    setPoseTimelineDragPreview(actor(), poseSelect.value, next.t);
    moveKeyframeButtons(poseTimelineTrack, id, next.slot, slotToLeft(next.slot));
  }

  function selectKeyframeForDrag(id) {
    poseSelection.activeKeyframeId = id;
    stopPreview();
    const t = getActiveT();
    setPoseTimelineDragPreview(actor(), poseSelect.value, t);
    poseDeleteKeyframe.disabled = false;
    markActiveKeyframeButton(poseTimelineTrack, id);
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

  return {
    addKeyframe,
    copyFrame,
    currentFrameValue,
    deleteKeyframe,
    hasFrameSelection,
    pasteFrame,
    readDisplayValue,
    renderSettings,
    renderTimeline,
    resetAnimation,
    resetSelectionState,
    stepDuration: playbackControls.stepDuration,
    stopPreview,
    syncPreview,
    syncToolbarButtons,
    togglePlayback: playbackControls.togglePlayback,
    togglePlaybackMode: playbackControls.togglePlaybackMode,
    updateOffset,
    updatePlaybackRate: playbackControls.updatePlaybackRate,
    updateSetting,
    writeFrameValue,
  };
}
