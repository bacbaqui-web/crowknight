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

export function markActiveKeyframeButton(track, id) {
  track.querySelectorAll('.pose-keyframe').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.keyframeId === id);
  });
}

export function moveKeyframeButtons(track, id, slot, left) {
  track.querySelectorAll(`[data-keyframe-id="${id}"]`).forEach((button) => {
    button.style.left = `${left}%`;
    button.title = `${slot + 1}칸`;
  });
}
