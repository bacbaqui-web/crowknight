import {
  timelineFrameCountFor,
  timelineLastSlot,
  timelineSlotLeft,
  timelineSlotToValue,
  timelineValueToSlot,
} from './timelineState.js';

export function createTimelineAccessors({ ensureSettings, settingsByKey, key }) {
  const frameCount = () => {
    ensureSettings();
    return timelineFrameCountFor(settingsByKey(), key());
  };
  const lastSlot = () => timelineLastSlot(frameCount());

  return {
    frameCount,
    lastSlot,
    toSlot: (t) => timelineValueToSlot(t, frameCount()),
    slotToValue: (slot) => timelineSlotToValue(slot, frameCount()),
    slotToLeft: (slot) => timelineSlotLeft(slot, frameCount()),
  };
}
