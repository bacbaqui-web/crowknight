import { syncTimelinePlaybackControls } from './timeline_dom_helper.js';

export function syncActionTimelinePlaybackSettings(elements, { frameCount, settings, playing }) {
  syncTimelinePlaybackSettings(elements, {
    frameCount,
    settings,
    playing,
    playbackMode: settings.playback,
  });
}

export function syncActionTimelineToolbar(elements, state) {
  syncTimelineFrameToolbarButtons(elements, state);
  return state.hasSelection;
}

export function syncEffectTimelinePlaybackSettings(elements, { frameCount, settings, playing }) {
  syncTimelinePlaybackSettings(elements, {
    frameCount,
    settings,
    playing,
    playbackMode: settings.playback,
  });
}

export function syncEffectTimelineToolbar(elements, state) {
  syncTimelineFrameToolbarButtons(elements, state);
}

export function syncPoseTimelinePlaybackSettings(elements, { frameCount, settings, playing }) {
  syncTimelinePlaybackSettings(elements, {
    frameCount,
    settings,
    playing,
    playbackMode: settings.playback,
  });
}

function syncTimelinePlaybackSettings(elements, state) {
  syncTimelinePlaybackControls(elements, state);
}

function syncTimelineFrameToolbarButtons(elements, state) {
  if ('section' in elements && !elements.section) return;

  const { copyButton, pasteButton, undoButton, frameDownButton, frameUpButton } = elements;
  const { hasSelection, hasCopiedFrame, undoCount, frameCount, minFrames, maxFrames } = state;
  if (copyButton) copyButton.disabled = !hasSelection;
  if (pasteButton) pasteButton.disabled = !hasCopiedFrame;
  if (undoButton) undoButton.disabled = undoCount <= 0;
  frameDownButton.disabled = frameCount <= minFrames;
  frameUpButton.disabled = frameCount >= maxFrames;
}
