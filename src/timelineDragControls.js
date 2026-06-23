import { bindTimelineKeyframeDrag, timelinePointerT } from './tuningTimelineDom.js';

export function bindKeyframeDrag(
  button,
  id,
  { selectKeyframe, selectForDrag, beginUndo, moveKeyframe, pointerT, finishUndo, afterFinish }
) {
  bindTimelineKeyframeDrag(button, id, {
    onSelectFixed: selectKeyframe,
    onStartDrag: (keyframeId) => {
      selectForDrag(keyframeId);
      beginUndo();
    },
    onMoveDrag: (keyframeId, event) => moveKeyframe(keyframeId, pointerT(event)),
    onFinishDrag: () => {
      finishUndo();
      afterFinish?.();
    },
  });
}

export function timelinePointerValue(event, track, frameCount, lastSlot) {
  return timelinePointerT(event, track, frameCount, lastSlot);
}
