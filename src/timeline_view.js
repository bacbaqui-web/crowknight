import { renderSelectedKeyframeTimeline } from './timeline_renderer.js';

export function createControllerTimelineRenderer({
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
  return () =>
    renderSelectedKeyframeTimeline({
      renderSettings,
      track,
      frameCount: frameCount(),
      keyframes: keyframes(),
      selection,
      lastSlot: lastSlot(),
      toSlot,
      slotToLeft,
      selectSlot,
      bindDrag,
      addButton,
      deleteButton,
    });
}
