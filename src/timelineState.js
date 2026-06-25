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

export function createTimelineSelectionState(initialSelection = clearedTimelineSelection()) {
  return assignTimelineSelection({}, initialSelection);
}

export function assignTimelineSelection(target, selection) {
  target.activeKeyframeId = selection.activeKeyframeId;
  target.fixedFrame = selection.fixedFrame;
  target.selectedSlot = selection.selectedSlot;
  return target;
}

export function hasTimelineSelection(selection, { includeSelectedSlot = true } = {}) {
  return Boolean(
    selection.activeKeyframeId || selection.fixedFrame || (includeSelectedSlot && selection.selectedSlot !== null)
  );
}

export function selectedTimelineFrameSelection({ id, activeKeyframeId, fixedFrame, keyframes, toSlot, lastSlot }) {
  if (isTimelineFrameSelectionActive({ activeKeyframeId, fixedFrame, id })) {
    return { kind: 'clear', selection: clearedTimelineSelection() };
  }

  if (id === 'start' || id === 'end') {
    return { kind: 'fixed', selection: fixedTimelineFrameSelection(id, lastSlot) };
  }

  const keyframe = keyframes.find((frame) => frame.id === id);
  return {
    kind: 'keyframe',
    selection: {
      activeKeyframeId: id,
      fixedFrame: null,
      selectedSlot: toSlot(keyframe?.t ?? 0),
    },
  };
}

export function selectedTimelineSlotSelection({
  slot,
  selectedSlot,
  activeKeyframeId,
  fixedFrame,
  keyframes,
  toSlot,
  lastSlot,
}) {
  const frame = keyframes.find((item) => toSlot(item.t) === slot);
  if (frame) {
    return selectedTimelineFrameSelection({
      id: frame.id,
      activeKeyframeId,
      fixedFrame,
      keyframes,
      toSlot,
      lastSlot,
    });
  }

  if (isTimelineSlotSelectionActive({ selectedSlot, activeKeyframeId, fixedFrame, slot })) {
    return { kind: 'clear', selection: clearedTimelineSelection() };
  }

  return { kind: 'empty', selection: emptyTimelineSlotSelection(slot) };
}

export function movedTimelineKeyframeTarget({ id, t, keyframes, toSlot, slotToValue }) {
  const nextSlot = toSlot(t);
  const occupied = keyframes.some((frame) => frame.id !== id && toSlot(frame.t) === nextSlot);
  if (occupied) return null;

  return {
    slot: nextSlot,
    t: slotToValue(nextSlot),
  };
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
