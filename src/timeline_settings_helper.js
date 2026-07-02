import { clampTimelinePlaybackRate, timelineDurationFromFrames } from './timeline_playback_helper.js';
import { stepTimelineDurationValue } from './number_input_helper.js';
import { timelineSlotToT, timelineTToSlot } from './timeline_dom_helper.js';

export function writePoseTimelineSetting(settingsByKey, key, prop, value) {
  writeTimelineSetting(settingsByKey[key], prop, value, (next) => (next === 'once' ? 'once' : 'loop'));
}

export function writeEffectTimelineSetting(settingsByKey, key, prop, value) {
  writeTimelineSetting(settingsByKey[key], prop, value, (next) => (next === 'loop' ? 'loop' : 'once'));
}

export function nextTimelineFrameCount(frameCount, delta, snapToTen, minFrames, maxFrames) {
  return stepTimelineDurationValue(frameCount, delta, snapToTen, minFrames, maxFrames);
}

export function minTimelineFrameCountForKeyframes(keyframes, frameCount, fallbackMinFrames) {
  const lastSlot = Math.max(1, frameCount - 1);
  const lastMiddleSlot = keyframes.reduce((maxSlot, frame) => {
    if (!isMiddleTimelineKeyframe(frame)) return maxSlot;
    return Math.max(maxSlot, timelineTToSlot(frame.t, lastSlot));
  }, 0);
  return Math.max(fallbackMinFrames, lastMiddleSlot + 2);
}

export function preserveTimelineKeyframeSlots(keyframes, oldFrameCount, nextFrameCount) {
  const oldLastSlot = Math.max(1, oldFrameCount - 1);
  const nextLastSlot = Math.max(1, nextFrameCount - 1);
  keyframes.forEach((frame) => {
    if (frame?.id === 'start') {
      frame.t = 0;
      return;
    }
    if (frame?.id === 'end') {
      frame.t = 1;
      return;
    }
    if (!isMiddleTimelineKeyframe(frame)) return;
    frame.t = timelineSlotToT(timelineTToSlot(frame.t, oldLastSlot), nextLastSlot);
  });
}

function writeTimelineSetting(settings, prop, value, normalizePlayback) {
  if (prop === 'duration') settings.duration = timelineDurationFromFrames(value);
  if (prop === 'playback') settings.playback = normalizePlayback(value);
  if (prop === 'playbackRate') settings.playbackRate = clampTimelinePlaybackRate(value);
}

function isMiddleTimelineKeyframe(frame) {
  return Boolean(frame && frame.id !== 'start' && frame.id !== 'end');
}
