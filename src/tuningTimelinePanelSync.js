import { syncTimelinePlaybackControls } from './tuningTimelineDom.js';

export function syncPoseTimelinePlaybackSettings(elements, { frameCount, settings, playing }) {
  syncTimelinePlaybackSettings(elements, {
    frameCount,
    settings,
    playing,
    isLoop: settings.playback !== 'once',
    playbackTitle: settings.playback === 'loop' ? '반복 재생' : '한 번 재생',
  });
}

export function syncPoseTimelineToolbar(elements, state) {
  syncTimelineFrameToolbarButtons(elements, state);
  return state.hasSelection;
}

export function syncEffectTimelinePlaybackSettings(elements, { frameCount, settings, playing }) {
  syncTimelinePlaybackSettings(elements, {
    frameCount,
    settings,
    playing,
    isLoop: settings.playback === 'loop',
  });
}

export function syncEffectTimelineToolbar(elements, state) {
  syncTimelineFrameToolbarButtons(elements, state);
}

function syncTimelinePlaybackSettings(elements, state) {
  syncTimelinePlaybackControls(elements, state);
  if (state.playbackTitle) {
    elements.playback.title = state.playbackTitle;
  }
}

function syncTimelineFrameToolbarButtons(elements, state) {
  if ('section' in elements && !elements.section) return;

  const { copyButton, pasteButton, undoButton, frameDownButton, frameUpButton } = elements;
  const { hasSelection, hasCopiedFrame, undoCount, frameCount, minFrames, maxFrames } = state;
  copyButton.disabled = !hasSelection;
  pasteButton.disabled = !hasCopiedFrame;
  undoButton.disabled = undoCount <= 0;
  frameDownButton.disabled = frameCount <= minFrames;
  frameUpButton.disabled = frameCount >= maxFrames;
}
