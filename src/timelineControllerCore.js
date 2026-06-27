import { markActiveKeyframeButton } from './timelineDragControls.js';
import { createControllerTimelineRenderer } from './timelineControllerView.js';
import { createTimelinePlaybackControls } from './tuningTimelinePlaybackControls.js';
import { createTimelineAccessors } from './tuningTimelineAccessors.js';
import { hasTimelineSelection } from './timelineState.js';
import {
  addTimelineKeyframeAction,
  applyTimelineSelectionAction,
  deleteTimelineKeyframeAction,
  refreshTimelineFrameSelectionAction,
  resetTimelineAnimationAction,
  resetTimelineSelectionAction,
  selectTimelineKeyframeAction,
  selectTimelineKeyframeForDragAction,
  selectTimelineSlotAction,
  updateTimelineSettingAction,
} from './timelineControllerActions.js';

export function createTimelineControllerCore({
  timeline,
  selection,
  section = null,
  durationInput,
  track,
  addButton,
  deleteButton,
  beginUndo,
  commitUndo,
  applySelected,
  isPlaying,
  stopPreview,
  syncPreview,
  playPreview,
  renderSettings,
  selectSlot,
  bindDrag,
}) {
  const accessors = createTimelineAccessors({
    ensureSettings: timeline.ensureSettings,
    settingsByKey: timeline.settingsByKey,
    key: timeline.key,
  });
  const keyframesForTimeline = () => timeline.keyframes();
  const isSectionOpen = () => Boolean(section?.classList.contains('is-open'));
  const activeT = (options = {}) =>
    timeline.activeT({
      selection,
      frameCount: accessors.frameCount(),
      ...options,
    });
  const currentFrameValue = (options = {}) => timeline.currentFrameValue({ selection, ...options });
  const writeFrameValue = (options = {}) => timeline.writeFrameValue({ selection, ...options });
  const updateSetting = (prop, value) =>
    updateTimelineSettingAction({
      prop,
      value,
      beginUndo,
      ensureSettings: timeline.ensureSettings,
      writeSetting: timeline.writeSetting,
      applySelected,
      syncPreview,
    });
  const addKeyframe = ({ stopPreview, finish }) =>
    addTimelineKeyframeAction({
      selection,
      keyframes: keyframesForTimeline(),
      lastSlot: accessors.lastSlot(),
      toSlot: accessors.toSlot,
      slotToValue: accessors.slotToValue,
      addKeyframe: timeline.addKeyframe,
      beginUndo,
      stopPreview,
      finish,
    });
  const deleteKeyframe = ({ resetSelection, stopPreview, finish }) =>
    deleteTimelineKeyframeAction({
      selection,
      deleteKeyframe: timeline.deleteKeyframe,
      beginUndo,
      resetSelection,
      stopPreview,
      finish,
    });
  const resetAnimation = ({ resetSelection, clearCopiedFrame, stopPreview, finish }) =>
    resetTimelineAnimationAction({
      beginUndo,
      resetAnimation: timeline.resetAnimation,
      resetSelection,
      clearCopiedFrame,
      stopPreview,
      finish,
    });
  const resetSelectionState = () => resetTimelineSelectionAction(selection);
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
      keyframes: keyframesForTimeline(),
      toSlot: accessors.toSlot,
      lastSlot: accessors.lastSlot(),
      setContext,
      applySelection,
    });
  const selectSlotAction = ({ slot, setContext, applySelection }) =>
    selectTimelineSlotAction({
      slot,
      selection,
      keyframes: keyframesForTimeline(),
      toSlot: accessors.toSlot,
      lastSlot: accessors.lastSlot(),
      setContext,
      applySelection,
    });
  const selectKeyframeForDrag = ({ id, stopPreview, getActiveT, setDragPreview }) =>
    selectTimelineKeyframeForDragAction({
      selection,
      id,
      keyframes: keyframesForTimeline(),
      toSlot: accessors.toSlot,
      stopPreview,
      getActiveT,
      setDragPreview,
      setDeleteDisabled: (disabled) => {
        deleteButton.disabled = disabled;
      },
      markActive: (keyframeId) => markActiveKeyframeButton(track, keyframeId),
    });

  const playbackControls = createTimelinePlaybackControls({
    getFrameCount: accessors.frameCount,
    durationInput,
    beginUndo,
    commitUndo,
    updateSetting,
    isPlaying,
    stopPreview,
    syncPreview,
    playPreview,
    settings: timeline.settings,
  });

  const renderTimeline = createControllerTimelineRenderer({
    renderSettings,
    track,
    frameCount: accessors.frameCount,
    keyframes: keyframesForTimeline,
    selection,
    lastSlot: accessors.lastSlot,
    toSlot: accessors.toSlot,
    slotToLeft: accessors.slotToLeft,
    selectSlot,
    bindDrag,
    addButton,
    deleteButton,
  });

  return {
    ...accessors,
    activeT,
    addKeyframe,
    applySelection,
    currentFrameValue,
    deleteKeyframe,
    frameSelectionState,
    frameLabel,
    hasFrameSelection,
    isSectionOpen,
    keyframes: keyframesForTimeline,
    playbackControls,
    renderTimeline,
    resetAnimation,
    resetSelectionState,
    selectKeyframe,
    selectKeyframeForDrag,
    selectSlot: selectSlotAction,
    updateSetting,
    writeFrameValue,
  };
}

export function createTimelineControllerCommonMethods({
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
}) {
  return {
    addKeyframe,
    copyFrame,
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
  };
}
