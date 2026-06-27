import { createControllerTimelineRenderer } from './timelineControllerView.js';
import { createTimelinePlaybackControls } from './tuningTimelinePlaybackControls.js';
import { createTimelineAccessors } from './tuningTimelineAccessors.js';
import { createTimelineSelectionControls } from './timelineControllerSelectionControls.js';
import {
  addTimelineKeyframeAction,
  copyTimelineFrameAction,
  deleteTimelineKeyframeAction,
  pasteTimelineFrameAction,
  resetTimelineAnimationAction,
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
  const activeT = (options = {}) =>
    timeline.activeT({
      selection,
      frameCount: accessors.frameCount(),
      ...options,
    });
  const currentFrameValue = (options = {}) => timeline.currentFrameValue({ selection, ...options });
  const writeFrameValue = (options = {}) => timeline.writeFrameValue({ selection, ...options });
  const copyFrame = ({ copyFrame, setCopiedFrame, afterCopy }) =>
    copyTimelineFrameAction({
      copyFrame,
      setCopiedFrame,
      afterCopy,
    });
  const pasteFrame = ({ copiedFrame, pasteTargetFrameId, pasteFrameCopy, finish }) =>
    pasteTimelineFrameAction({
      copiedFrame,
      isOpen: selectionControls.isSectionOpen(),
      beginUndo,
      commitUndo,
      pasteTargetFrameId,
      pasteFrameCopy,
      finish,
    });
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
  const selectionControls = createTimelineSelectionControls({
    selection,
    section,
    accessors,
    keyframes: keyframesForTimeline,
    track,
    deleteButton,
    stopPreview,
    syncPreview,
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
    applySelection: selectionControls.applySelection,
    copyFrame,
    currentFrameValue,
    deleteKeyframe,
    frameSelectionState: selectionControls.frameSelectionState,
    frameLabel: selectionControls.frameLabel,
    hasFrameSelection: selectionControls.hasFrameSelection,
    isSectionOpen: selectionControls.isSectionOpen,
    keyframes: keyframesForTimeline,
    playbackControls,
    pasteFrame,
    renderTimeline,
    resetAnimation,
    resetSelectionState: selectionControls.resetSelectionState,
    selectKeyframe: selectionControls.selectKeyframe,
    selectKeyframeForDrag: selectionControls.selectKeyframeForDrag,
    selectSlot: selectionControls.selectSlot,
    setFixedFrame: selectionControls.setFixedFrame,
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
