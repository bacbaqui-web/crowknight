import { previewTimeoutMs } from './tuningPlayback.js';

export function schedulePreviewStop(settings, onStop) {
  return setTimeout(onStop, previewTimeoutMs(settings));
}

export function stopPreviewTimer(timer) {
  clearTimeout(timer);
  return null;
}
