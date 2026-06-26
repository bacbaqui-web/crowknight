import { bindKeyframeDrag, timelinePointerValue } from './timelineDragControls.js';
import { renderSelectedKeyframeTimeline } from './timelineRenderer.js';

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

export function bindControllerKeyframeDrag(button, id, options) {
  bindKeyframeDrag(button, id, {
    selectKeyframe: options.selectKeyframe,
    selectForDrag: options.selectForDrag,
    beginUndo: options.beginUndo,
    moveKeyframe: options.moveKeyframe,
    pointerT: (event) => timelinePointerValue(event, options.track, options.frameCount(), options.lastSlot()),
    finishUndo: options.finishUndo,
    afterFinish: options.afterFinish,
  });
}
