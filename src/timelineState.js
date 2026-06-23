import { timelineFrameCount } from './tuningPlayback.js';
import { timelineSlotToLeft, timelineSlotToT, timelineTToSlot } from './tuningTimelineDom.js';

export function timelineFrameCountFor(settingsByKey, key) {
  return timelineFrameCount(settingsByKey[key] || {});
}

export function timelineLastSlot(frameCount) {
  return frameCount - 1;
}

export function timelineValueToSlot(t, frameCount) {
  return timelineTToSlot(t, timelineLastSlot(frameCount));
}

export function timelineSlotToValue(slot, frameCount) {
  return timelineSlotToT(slot, timelineLastSlot(frameCount));
}

export function timelineSlotLeft(slot, frameCount) {
  return timelineSlotToLeft(slot, frameCount, timelineLastSlot(frameCount));
}

export function activeTimelineT({
  activeKeyframeId,
  selectedSlot,
  fixedFrame,
  keyframes,
  selectedKeyframe,
  frameCount,
}) {
  if (activeKeyframeId) {
    const keyframe = selectedKeyframe || keyframes.find((frame) => frame.id === activeKeyframeId);
    return Number.isFinite(keyframe?.t) ? keyframe.t : 0;
  }

  if (selectedSlot !== null) return timelineSlotToValue(selectedSlot, frameCount);
  if (!fixedFrame) return 0;
  return fixedFrame === 'end' ? 1 : 0;
}
