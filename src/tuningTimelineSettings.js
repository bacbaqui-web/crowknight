import { timelineDurationFromFrames } from './tuningPlayback.js';
import { stepTimelineDurationValue } from './tuningNumberInputs.js';
import { clamp } from './utils.js';

export function writePoseTimelineSetting(settingsByKey, key, prop, value) {
  writeTimelineSetting(settingsByKey[key], prop, value, (next) => (next === 'once' ? 'once' : 'loop'));
}

export function writeEffectTimelineSetting(settingsByKey, key, prop, value) {
  writeTimelineSetting(settingsByKey[key], prop, value, (next) => (next === 'loop' ? 'loop' : 'once'));
}

export function nextTimelineFrameCount(frameCount, delta, snapToTen, minFrames, maxFrames) {
  return stepTimelineDurationValue(frameCount, delta, snapToTen, minFrames, maxFrames);
}

function writeTimelineSetting(settings, prop, value, normalizePlayback) {
  if (prop === 'duration') settings.duration = timelineDurationFromFrames(value);
  if (prop === 'playback') settings.playback = normalizePlayback(value);
  if (prop === 'playbackRate') settings.playbackRate = clamp(Number(value), 0.1, 4);
}
