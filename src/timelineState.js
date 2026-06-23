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

export function fixedTimelineFrameSlot(frame, lastSlot) {
  return frame === 'end' ? lastSlot : 0;
}

export function isTimelineFrameSelectionActive({ activeKeyframeId, fixedFrame, id }) {
  return activeKeyframeId === id || (!activeKeyframeId && fixedFrame === id);
}

export function isTimelineSlotSelectionActive({ selectedSlot, activeKeyframeId, fixedFrame, slot }) {
  return selectedSlot === slot && !activeKeyframeId && !fixedFrame;
}

export function isTimelineFrameId(id, keyframes) {
  return Boolean(id && keyframes.some((frame) => frame.id === id));
}

export function fixedTimelineFrameSelection(frame, lastSlot) {
  return {
    activeKeyframeId: null,
    fixedFrame: frame,
    selectedSlot: fixedTimelineFrameSlot(frame, lastSlot),
  };
}

export function emptyTimelineSlotSelection(slot) {
  return {
    activeKeyframeId: null,
    fixedFrame: null,
    selectedSlot: slot,
  };
}

export function clearedTimelineSelection() {
  return {
    activeKeyframeId: null,
    fixedFrame: null,
    selectedSlot: null,
  };
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
