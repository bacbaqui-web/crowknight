import { moveTimelineKeyframeWithPreviewAction } from './timeline_action_helper.js';
import { bindKeyframeDrag, timelinePointerValue } from './timeline_drag_control_helper.js';

export function bindTimelineKeyframeDragWithPreview(
  button,
  id,
  {
    selectKeyframe,
    selectKeyframeForDrag,
    beginUndo,
    commitUndo,
    track,
    frameCount,
    lastSlot,
    keyframes,
    toSlot,
    slotToValue,
    moveKeyframe,
    applySelected,
    setDragPreview,
    slotToLeft,
    stopPreview,
    getActiveT,
    afterFinish,
  }
) {
  bindKeyframeDrag(button, id, {
    selectKeyframe,
    selectForDrag: (dragId) => {
      selectKeyframeForDrag({
        id: dragId,
        stopPreview,
        getActiveT,
        setDragPreview,
      });
    },
    beginUndo,
    moveKeyframe: (dragId, t) => {
      moveTimelineKeyframeWithPreviewAction({
        id: dragId,
        t,
        keyframes: keyframes(),
        toSlot,
        slotToValue,
        moveKeyframe: (nextT) => moveKeyframe(dragId, nextT),
        applySelected,
        setDragPreview,
        track,
        slotToLeft,
      });
    },
    pointerT: (event) => timelinePointerValue(event, track, frameCount(), lastSlot()),
    finishUndo: commitUndo,
    afterFinish,
  });
}
