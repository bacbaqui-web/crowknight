import { createControllerTimelineRenderer } from './timelineControllerView.js';
import { createTimelinePlaybackControls } from './tuningTimelinePlaybackControls.js';
import { createTimelineAccessors } from './tuningTimelineAccessors.js';
import { hasTimelineSelection } from './timelineState.js';

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
  updateSetting,
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
  const hasFrameSelection = ({ includeSelectedSlot = true, requireOpenSection = false } = {}) =>
    (!requireOpenSection || section?.classList.contains('is-open')) &&
    hasTimelineSelection(selection, { includeSelectedSlot });

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
    currentFrameValue,
    hasFrameSelection,
    keyframes: keyframesForTimeline,
    playbackControls,
    renderTimeline,
    writeFrameValue,
  };
}

export function createTimelineControllerCommonMethods({
  playbackControls,
  addKeyframe,
  copyFrame,
  currentFrameValue,
  deleteKeyframe,
  hasFrameSelection,
  pasteFrame,
  resetAnimation,
  resetSelectionState,
  stopPreview,
  syncPreview,
  updateSetting,
  writeFrameValue,
}) {
  return {
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
  };
}
