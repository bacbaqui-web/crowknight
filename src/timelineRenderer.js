import { appendTimelineKeyframes, renderTimelineSlots, syncTimelineToolbar } from './tuningTimelineDom.js';

export function renderKeyframeTimeline({
  track,
  frameCount,
  keyframes,
  selectedSlot,
  activeKeyframeId,
  fixedFrame,
  lastSlot,
  toSlot,
  slotToLeft,
  selectSlot,
  bindDrag,
  addButton,
  deleteButton,
}) {
  renderTimelineSlots(track, frameCount, selectedSlot, selectSlot);
  syncTimelineToolbar({
    addButton,
    deleteButton,
    keyframes,
    selectedSlot,
    activeKeyframeId,
    frameCount,
    lastSlot,
    toSlot,
  });
  appendTimelineKeyframes(track, keyframes, {
    frameCount,
    toSlot,
    slotToLeft,
    isActive: (frame, slot) =>
      activeKeyframeId === frame.id ||
      (!activeKeyframeId && fixedFrame === frame.id) ||
      (!activeKeyframeId && !fixedFrame && selectedSlot === slot),
    bindDrag,
  });
}

export function renderSelectedKeyframeTimeline({
  renderSettings,
  track,
  frameCount,
  keyframes,
  selection,
  lastSlot,
  toSlot,
  slotToLeft,
  selectSlot,
  bindDrag,
  addButton,
  deleteButton,
}) {
  renderSettings();
  renderKeyframeTimeline({
    track,
    frameCount,
    keyframes,
    selectedSlot: selection.selectedSlot,
    activeKeyframeId: selection.activeKeyframeId,
    fixedFrame: selection.fixedFrame,
    lastSlot,
    toSlot,
    slotToLeft,
    selectSlot,
    bindDrag,
    addButton,
    deleteButton,
  });
}
