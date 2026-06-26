import { createControllerTimelineRenderer } from './timelineControllerView.js';
import { createTimelinePlaybackControls } from './tuningTimelinePlaybackControls.js';
import { createTimelineAccessors } from './tuningTimelineAccessors.js';

export function createTimelineControllerCore({
  timeline,
  selection,
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
  keyframes,
  selectSlot,
  bindDrag,
}) {
  const accessors = createTimelineAccessors({
    ensureSettings: timeline.ensureSettings,
    settingsByKey: timeline.settingsByKey,
    key: timeline.key,
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
    keyframes,
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
    playbackControls,
    renderTimeline,
  };
}
