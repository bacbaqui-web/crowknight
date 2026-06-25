import { clampPlaybackRateInput } from './tuningNumberInputs.js';
import { nextTimelineFrameCount } from './tuningTimelineSettings.js';
import { POSE_MAX_FRAMES, POSE_MIN_FRAMES } from './gameConfig.js';

export function createTimelinePlaybackControls({
  getFrameCount,
  durationInput,
  beginUndo,
  commitUndo,
  updateSetting,
  isPlaying,
  stopPreview,
  syncPreview,
  playPreview,
  settings,
}) {
  return {
    updatePlaybackRate: (value, peer) => updateTimelinePlaybackRate(value, peer, updateSetting),
    stepDuration: (delta, snapToTen = false) =>
      stepTimelineDuration(getFrameCount(), delta, snapToTen, durationInput, beginUndo, updateSetting, commitUndo),
    togglePlayback: () => toggleTimelinePlayback(isPlaying, stopPreview, syncPreview, playPreview),
    togglePlaybackMode: () => toggleTimelinePlaybackMode(settings, beginUndo, updateSetting, commitUndo),
  };
}

export function updateTimelinePlaybackRate(value, peer, updateSetting) {
  const next = clampPlaybackRateInput(value, peer);
  if (next === null) return;
  updateSetting('playbackRate', next);
}

export function stepTimelineDuration(
  frameCount,
  delta,
  snapToTen,
  durationInput,
  beginUndo,
  updateSetting,
  commitUndo
) {
  beginUndo();
  const next = nextTimelineFrameCount(frameCount, delta, snapToTen, POSE_MIN_FRAMES, POSE_MAX_FRAMES);
  durationInput.value = next;
  updateSetting('duration', next);
  commitUndo();
}

export function toggleTimelinePlayback(isPlaying, stopPreview, syncPreview, playPreview) {
  if (isPlaying()) {
    stopPreview();
    syncPreview();
    return;
  }
  playPreview();
}

export function toggleTimelinePlaybackMode(settings, beginUndo, updateSetting, commitUndo) {
  beginUndo();
  updateSetting('playback', settings().playback === 'loop' ? 'once' : 'loop');
  commitUndo();
}
