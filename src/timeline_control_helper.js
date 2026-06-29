import { POSE_MAX_FRAMES, POSE_MIN_FRAMES } from './game_config.js';
import {
  applyTimelineSelectionAction,
  copyTimelineFrameAction,
  pasteTimelineFrameAction,
  refreshTimelineFrameSelectionAction,
  resetTimelineSelectionAction,
  selectTimelineKeyframeAction,
  selectTimelineKeyframeForDragAction,
  selectTimelineSlotAction,
  setFixedTimelineFrameSelectionAction,
} from './timeline_action_helper.js';
import { markActiveKeyframeButton } from './timeline_drag_control_helper.js';
import { hasTimelineSelection } from './timeline_state.js';
import { formatInputNumber } from './number_input_helper.js';
import { clampTimelinePlaybackRate } from './timeline_playback_helper.js';
import { nextTimelineFrameCount } from './timeline_settings_helper.js';

export function createTimelineSelectionControls({
  selection,
  section,
  accessors,
  keyframes,
  track,
  deleteButton,
  stopPreview,
  syncPreview,
}) {
  const isSectionOpen = () => Boolean(section?.classList.contains('is-open'));
  const resetSelectionState = () => resetTimelineSelectionAction(selection);
  const setFixedFrame = (frame) =>
    setFixedTimelineFrameSelectionAction({
      targetSelection: selection,
      frame,
      lastSlot: accessors.lastSlot(),
    });
  const refreshFrameSelection = ({ renderFields }) =>
    refreshTimelineFrameSelectionAction({
      stopPreview,
      renderFields,
      syncPreview,
    });
  const applySelection = ({ nextSelection, beforeRefresh = null, renderFields }) =>
    applyTimelineSelectionAction({
      targetSelection: selection,
      nextSelection,
      beforeRefresh,
      refresh: () => refreshFrameSelection({ renderFields }),
    });
  const hasFrameSelection = ({ includeSelectedSlot = true, requireOpenSection = false } = {}) =>
    (!requireOpenSection || isSectionOpen()) && hasTimelineSelection(selection, { includeSelectedSlot });
  const frameSelectionState = () => ({
    activeKeyframeId: selection.activeKeyframeId,
    fixedFrame: selection.fixedFrame,
    selectedSlot: selection.selectedSlot,
  });
  const frameLabel = () => {
    if (selection.fixedFrame === 'start') return '첫프레임';
    if (selection.fixedFrame === 'end') return '끝프레임';
    if (selection.activeKeyframeId) return '키프레임';
    return '기본';
  };
  const selectKeyframe = ({ id, setContext, applySelection }) =>
    selectTimelineKeyframeAction({
      id,
      selection,
      keyframes: keyframes(),
      toSlot: accessors.toSlot,
      lastSlot: accessors.lastSlot(),
      setContext,
      applySelection,
    });
  const selectSlot = ({ slot, setContext, applySelection }) =>
    selectTimelineSlotAction({
      slot,
      selection,
      keyframes: keyframes(),
      toSlot: accessors.toSlot,
      lastSlot: accessors.lastSlot(),
      setContext,
      applySelection,
    });
  const selectKeyframeForDrag = ({ id, stopPreview, getActiveT, setDragPreview }) =>
    selectTimelineKeyframeForDragAction({
      selection,
      id,
      keyframes: keyframes(),
      toSlot: accessors.toSlot,
      stopPreview,
      getActiveT,
      setDragPreview,
      setDeleteDisabled: (disabled) => {
        deleteButton.disabled = disabled;
      },
      markActive: (keyframeId) => markActiveKeyframeButton(track, keyframeId),
    });

  return {
    applySelection,
    frameLabel,
    frameSelectionState,
    hasFrameSelection,
    isSectionOpen,
    resetSelectionState,
    selectKeyframe,
    selectKeyframeForDrag,
    selectSlot,
    setFixedFrame,
  };
}

export function createTimelineClipboardControls({ isOpen, beginUndo, commitUndo }) {
  const copyFrame = ({ copyFrame, setCopiedFrame, afterCopy }) =>
    copyTimelineFrameAction({
      copyFrame,
      setCopiedFrame,
      afterCopy,
    });

  const pasteFrame = ({ copiedFrame, pasteTargetFrameId, pasteFrameCopy, finish }) =>
    pasteTimelineFrameAction({
      copiedFrame,
      isOpen: isOpen(),
      beginUndo,
      commitUndo,
      pasteTargetFrameId,
      pasteFrameCopy,
      finish,
    });

  return {
    copyFrame,
    pasteFrame,
  };
}

export function createTimelinePlaybackControls({
  getFrameCount,
  durationInput,
  beginUndo,
  commitUndo,
  updateSetting,
  isPlaying,
  stopPreview,
  syncPreview,
  playPreview,
  settings,
}) {
  return {
    updatePlaybackRate: (value, peer) => updateTimelinePlaybackRate(value, peer, updateSetting),
    stepDuration: (delta, snapToTen = false) =>
      stepTimelineDuration(getFrameCount(), delta, snapToTen, durationInput, beginUndo, updateSetting, commitUndo),
    togglePlayback: () => toggleTimelinePlayback(isPlaying, stopPreview, syncPreview, playPreview),
    togglePlaybackMode: () => toggleTimelinePlaybackMode(settings, beginUndo, updateSetting, commitUndo),
  };
}

function updateTimelinePlaybackRate(value, peer, updateSetting) {
  const next = clampTimelinePlaybackRate(value);
  if (!Number.isFinite(next)) return;
  peer.value = formatInputNumber(next, 0.05);
  updateSetting('playbackRate', next);
}

function stepTimelineDuration(frameCount, delta, snapToTen, durationInput, beginUndo, updateSetting, commitUndo) {
  beginUndo();
  const next = nextTimelineFrameCount(frameCount, delta, snapToTen, POSE_MIN_FRAMES, POSE_MAX_FRAMES);
  durationInput.value = next;
  updateSetting('duration', next);
  commitUndo();
}

function toggleTimelinePlayback(isPlaying, stopPreview, syncPreview, playPreview) {
  if (isPlaying()) {
    stopPreview();
    syncPreview();
    return;
  }
  playPreview();
}

function toggleTimelinePlaybackMode(settings, beginUndo, updateSetting, commitUndo) {
  beginUndo();
  updateSetting('playback', settings().playback === 'loop' ? 'once' : 'loop');
  commitUndo();
}
